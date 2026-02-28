import mongoose from "mongoose";
import Order from "../models/order.model.js";
import Review from "../models/review.model.js";
import Shop from "../models/shop.model.js";
import { recalculateAndUpdateRestaurantRating } from "../utils/reviewStats.js";

const buildHttpError = (status, message) => {
    const error = new Error(message);
    error.status = status;
    return error;
};

const isDuplicateKeyError = (error) => error?.code === 11000;

const isTransactionNotSupportedError = (error) => {
    const message = String(error?.message || "").toLowerCase();
    return (
        error?.code === 20 ||
        message.includes("transaction numbers are only allowed on a replica set member or mongos") ||
        message.includes("transactions are not supported")
    );
};

const applySession = (query, session) => {
    if (session) {
        query.session(session);
    }
    return query;
};

const assertReviewOwner = (review, userId) => {
    if (String(review.user) !== String(userId)) {
        throw buildHttpError(403, "you can only modify your own review");
    }
};

const runCreateReviewFlow = async ({ userId, orderId, restaurantId, rating, comment }, session = null) => {
    const orderQuery = Order.findById(orderId).select("user deliveryStatus shopOrders.shop shopOrders.status");
    const order = await applySession(orderQuery, session);

    if (!order) {
        throw buildHttpError(404, "order not found");
    }

    if (String(order.user) !== String(userId)) {
        throw buildHttpError(403, "you can only review your own order");
    }

    const relatedShopOrder = (order.shopOrders || []).find(
        (shopOrder) => String(shopOrder.shop) === String(restaurantId)
    );
    if (!relatedShopOrder) {
        throw buildHttpError(400, "restaurant does not belong to this order");
    }

    const isDelivered =
        order.deliveryStatus === "delivered" || relatedShopOrder.status === "delivered";
    if (!isDelivered) {
        throw buildHttpError(400, "review is allowed only after delivered order");
    }

    const existingReviewQuery = Review.findOne({ order: orderId }).select("_id");
    const existingReview = await applySession(existingReviewQuery, session);
    if (existingReview) {
        throw buildHttpError(409, "review already exists for this order");
    }

    const restaurantQuery = Shop.findById(restaurantId).select("_id");
    const restaurant = await applySession(restaurantQuery, session);
    if (!restaurant) {
        throw buildHttpError(404, "restaurant not found");
    }

    const review = new Review({
        user: userId,
        restaurant: restaurantId,
        order: orderId,
        rating,
        comment
    });
    if (session) {
        await review.save({ session });
    } else {
        await review.save();
    }

    const updatedRestaurant = await recalculateAndUpdateRestaurantRating(restaurantId, session);

    if (!updatedRestaurant) {
        throw buildHttpError(404, "restaurant not found");
    }

    const reviewResponseQuery = Review.findById(review._id)
        .populate("user", "fullName")
        .populate("restaurant", "name averageRating totalReviews");
    const createdReview = await applySession(reviewResponseQuery, session);

    return {
        review: createdReview,
        restaurantStats: {
            averageRating: updatedRestaurant.averageRating,
            totalReviews: updatedRestaurant.totalReviews
        }
    };
};

const runEditReviewFlow = async ({ userId, reviewId, rating, comment }, session = null) => {
    const reviewQuery = Review.findById(reviewId).select("user restaurant order rating comment");
    const review = await applySession(reviewQuery, session);
    if (!review) {
        throw buildHttpError(404, "review not found");
    }

    assertReviewOwner(review, userId);

    if (rating !== undefined) {
        review.rating = rating;
    }
    if (comment !== undefined) {
        review.comment = comment;
    }

    if (session) {
        await review.save({ session });
    } else {
        await review.save();
    }

    const updatedRestaurant = await recalculateAndUpdateRestaurantRating(review.restaurant, session);
    if (!updatedRestaurant) {
        throw buildHttpError(404, "restaurant not found");
    }

    const updatedReviewQuery = Review.findById(review._id)
        .populate("user", "fullName")
        .populate("restaurant", "name averageRating totalReviews");
    const updatedReview = await applySession(updatedReviewQuery, session);

    return {
        review: updatedReview,
        restaurantStats: {
            averageRating: updatedRestaurant.averageRating,
            totalReviews: updatedRestaurant.totalReviews
        }
    };
};

const runDeleteReviewFlow = async ({ userId, reviewId }, session = null) => {
    const reviewQuery = Review.findById(reviewId).select("user restaurant");
    const review = await applySession(reviewQuery, session);
    if (!review) {
        throw buildHttpError(404, "review not found");
    }

    assertReviewOwner(review, userId);

    const deleteQuery = Review.deleteOne({ _id: reviewId });
    await applySession(deleteQuery, session);

    const updatedRestaurant = await recalculateAndUpdateRestaurantRating(review.restaurant, session);
    if (!updatedRestaurant) {
        throw buildHttpError(404, "restaurant not found");
    }

    return {
        restaurantStats: {
            averageRating: updatedRestaurant.averageRating,
            totalReviews: updatedRestaurant.totalReviews
        }
    };
};

const runWithBestEffortTransaction = async (operation) => {
    let session = null;

    try {
        session = await mongoose.startSession();
        let result = null;

        await session.withTransaction(async () => {
            result = await operation(session);
        });

        return result;
    } catch (error) {
        if (isTransactionNotSupportedError(error)) {
            return operation(null);
        }
        throw error;
    } finally {
        if (session) {
            await session.endSession();
        }
    }
};

export const createReview = async (req, res) => {
    try {
        const { orderId, restaurantId, rating, comment } = req.body;

        const result = await runWithBestEffortTransaction((session) =>
            runCreateReviewFlow(
                {
                    userId: req.userId,
                    orderId,
                    restaurantId,
                    rating,
                    comment
                },
                session
            )
        );

        return res.status(201).json({
            message: "review created successfully",
            review: result.review,
            restaurant: result.restaurantStats
        });
    } catch (error) {
        if (error?.status) {
            return res.status(error.status).json({ message: error.message });
        }

        if (isDuplicateKeyError(error)) {
            return res.status(409).json({ message: "review already exists for this order" });
        }

        return res.status(500).json({ message: `create review error ${error.message}` });
    }
};

export const updateReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const { rating, comment } = req.body;

        const result = await runWithBestEffortTransaction((session) =>
            runEditReviewFlow(
                {
                    userId: req.userId,
                    reviewId,
                    rating,
                    comment
                },
                session
            )
        );

        return res.status(200).json({
            message: "review updated successfully",
            review: result.review,
            restaurant: result.restaurantStats
        });
    } catch (error) {
        if (error?.status) {
            return res.status(error.status).json({ message: error.message });
        }

        return res.status(500).json({ message: `update review error ${error.message}` });
    }
};

export const deleteReview = async (req, res) => {
    try {
        const { reviewId } = req.params;

        await runWithBestEffortTransaction((session) =>
            runDeleteReviewFlow(
                {
                    userId: req.userId,
                    reviewId
                },
                session
            )
        );

        return res.status(204).send();
    } catch (error) {
        if (error?.status) {
            return res.status(error.status).json({ message: error.message });
        }

        return res.status(500).json({ message: `delete review error ${error.message}` });
    }
};

export const getRestaurantReviews = async (req, res) => {
    try {
        const { restaurantId } = req.params;

        const restaurant = await Shop.findById(restaurantId).select("name averageRating totalReviews");
        if (!restaurant) {
            return res.status(404).json({ message: "restaurant not found" });
        }

        const reviews = await Review.find({ restaurant: restaurantId })
            .sort({ createdAt: -1 })
            .populate("user", "fullName");

        return res.status(200).json({
            restaurant: {
                _id: restaurant._id,
                name: restaurant.name,
                averageRating: restaurant.averageRating,
                totalReviews: restaurant.totalReviews
            },
            reviews
        });
    } catch (error) {
        return res.status(500).json({ message: `get restaurant reviews error ${error.message}` });
    }
};
