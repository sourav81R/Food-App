import express from "express";
import isAuth from "../middlewares/isAuth.js";
import { validateCoupon, getActiveCoupons, createCoupon, getBestCoupon } from "../controllers/coupon.controllers.js";

const couponRouter = express.Router();

couponRouter.post("/validate", isAuth, validateCoupon);
couponRouter.get("/active", isAuth, getActiveCoupons);
couponRouter.get("/best", isAuth, getBestCoupon);
couponRouter.post("/create", isAuth, createCoupon); // Should add admin check

export default couponRouter;
