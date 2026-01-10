import express from "express";
import isAuth from "../middlewares/isAuth.js";
import { validateCoupon, getActiveCoupons, createCoupon } from "../controllers/coupon.controllers.js";

const couponRouter = express.Router();

couponRouter.post("/validate", isAuth, validateCoupon);
couponRouter.get("/active", isAuth, getActiveCoupons);
couponRouter.post("/create", isAuth, createCoupon); // Should add admin check

export default couponRouter;
