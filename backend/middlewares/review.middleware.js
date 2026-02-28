import mongoose from "mongoose";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

export const validateCreateReviewPayload = (req, res, next) => {
    try {
        const { orderId, restaurantId, rating, comment } = req.body;

        if (!orderId || !restaurantId || rating === undefined || rating === null || comment === undefined || comment === null) {
            return res.status(400).json({
                message: "orderId, restaurantId, rating and comment are required"
            });
        }

        if (!isValidObjectId(orderId) || !isValidObjectId(restaurantId)) {
            return res.status(400).json({
                message: "invalid orderId or restaurantId"
            });
        }

        const parsedRating = Number(rating);
        if (!Number.isFinite(parsedRating) || parsedRating < 1 || parsedRating > 5) {
            return res.status(400).json({ message: "rating must be a number between 1 and 5" });
        }

        const trimmedComment = String(comment).trim();
        if (!trimmedComment) {
            return res.status(400).json({ message: "comment is required" });
        }
        if (trimmedComment.length > 1000) {
            return res.status(400).json({ message: "comment must be at most 1000 characters" });
        }

        req.body.rating = parsedRating;
        req.body.comment = trimmedComment;
        next();
    } catch (error) {
        return res.status(500).json({ message: `review payload validation error ${error.message}` });
    }
};

export const validateRestaurantIdParam = (req, res, next) => {
    const { restaurantId } = req.params;

    if (!isValidObjectId(restaurantId)) {
        return res.status(400).json({ message: "invalid restaurantId" });
    }

    next();
};

export const validateReviewIdParam = (req, res, next) => {
    const { reviewId } = req.params;

    if (!isValidObjectId(reviewId)) {
        return res.status(400).json({ message: "invalid reviewId" });
    }

    next();
};

export const validateUpdateReviewPayload = (req, res, next) => {
    try {
        const allowedFields = new Set(["rating", "comment"]);
        const invalidFields = Object.keys(req.body || {}).filter((field) => !allowedFields.has(field));
        if (invalidFields.length > 0) {
            return res.status(400).json({
                message: `invalid fields for update: ${invalidFields.join(", ")}`
            });
        }

        const hasRating = Object.prototype.hasOwnProperty.call(req.body, "rating");
        const hasComment = Object.prototype.hasOwnProperty.call(req.body, "comment");

        if (!hasRating && !hasComment) {
            return res.status(400).json({ message: "at least one field (rating or comment) is required" });
        }

        if (hasRating) {
            const parsedRating = Number(req.body.rating);
            if (!Number.isFinite(parsedRating) || parsedRating < 1 || parsedRating > 5) {
                return res.status(400).json({ message: "rating must be a number between 1 and 5" });
            }
            req.body.rating = parsedRating;
        }

        if (hasComment) {
            const trimmedComment = String(req.body.comment).trim();
            if (!trimmedComment) {
                return res.status(400).json({ message: "comment cannot be empty" });
            }
            if (trimmedComment.length > 1000) {
                return res.status(400).json({ message: "comment must be at most 1000 characters" });
            }
            req.body.comment = trimmedComment;
        }

        next();
    } catch (error) {
        return res.status(500).json({ message: `review update payload validation error ${error.message}` });
    }
};
