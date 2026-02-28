import mongoose from "mongoose";
import Review from "../models/review.model.js";
import Shop from "../models/shop.model.js";

const toObjectId = (id) => new mongoose.Types.ObjectId(id);

export const getRestaurantReviewStats = async (restaurantId, session = null) => {
    const pipeline = Review.aggregate([
        {
            $match: {
                restaurant: toObjectId(restaurantId)
            }
        },
        {
            $group: {
                _id: "$restaurant",
                averageRating: { $avg: "$rating" },
                totalReviews: { $sum: 1 }
            }
        }
    ]);

    if (session) {
        pipeline.session(session);
    }

    const [stats] = await pipeline;
    return {
        averageRating: Number(Number(stats?.averageRating || 0).toFixed(2)),
        totalReviews: Number(stats?.totalReviews || 0)
    };
};

export const recalculateAndUpdateRestaurantRating = async (restaurantId, session = null) => {
    const { averageRating, totalReviews } = await getRestaurantReviewStats(restaurantId, session);

    const query = Shop.findByIdAndUpdate(
        restaurantId,
        { averageRating, totalReviews },
        { new: true }
    ).select("_id name averageRating totalReviews");

    if (session) {
        query.session(session);
    }

    const restaurant = await query;
    return restaurant;
};
