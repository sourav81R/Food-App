import express from "express";
import isAuth from "../middlewares/isAuth.js";
import { createReview, deleteReview, getRestaurantReviews, updateReview } from "../controllers/review.controllers.js";
import {
    validateCreateReviewPayload,
    validateRestaurantIdParam,
    validateReviewIdParam,
    validateUpdateReviewPayload
} from "../middlewares/review.middleware.js";

const reviewRouter = express.Router();

reviewRouter.post("/", isAuth, validateCreateReviewPayload, createReview);
reviewRouter.get("/restaurant/:restaurantId", validateRestaurantIdParam, getRestaurantReviews);
reviewRouter.patch("/:reviewId", isAuth, validateReviewIdParam, validateUpdateReviewPayload, updateReview);
reviewRouter.delete("/:reviewId", isAuth, validateReviewIdParam, deleteReview);

export default reviewRouter;
