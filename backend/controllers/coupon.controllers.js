import Coupon from "../models/coupon.model.js";

// Validate a coupon code
export const validateCoupon = async (req, res) => {
    try {
        const { code, orderAmount } = req.body;

        if (!code) {
            return res.status(400).json({ message: "Coupon code is required" });
        }

        const coupon = await Coupon.findOne({ code: code.toUpperCase() });

        if (!coupon) {
            return res.status(404).json({ message: "Invalid coupon code" });
        }

        const validation = coupon.isValid(orderAmount || 0);

        if (!validation.valid) {
            return res.status(400).json({ message: validation.message });
        }

        const discount = coupon.calculateDiscount(orderAmount || 0);

        return res.status(200).json({
            valid: true,
            code: coupon.code,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            discount,
            description: coupon.description,
            message: `Coupon applied! You save ₹${discount}`
        });

    } catch (error) {
        return res.status(500).json({ message: `Validate coupon error: ${error.message}` });
    }
};

// Get active coupons (for displaying to users)
export const getActiveCoupons = async (req, res) => {
    try {
        const now = new Date();
        const coupons = await Coupon.find({
            isActive: true,
            expiresAt: { $gt: now },
            $or: [
                { usageLimit: null },
                { $expr: { $lt: ["$usedCount", "$usageLimit"] } }
            ]
        }).select('code discountType discountValue minOrderAmount description');

        return res.status(200).json(coupons);

    } catch (error) {
        return res.status(500).json({ message: `Get coupons error: ${error.message}` });
    }
};

// Create a new coupon (admin)
export const createCoupon = async (req, res) => {
    try {
        const { code, discountType, discountValue, minOrderAmount, maxDiscount, expiresAt, usageLimit, description } = req.body;

        const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
        if (existingCoupon) {
            return res.status(400).json({ message: "Coupon code already exists" });
        }

        const coupon = await Coupon.create({
            code: code.toUpperCase(),
            discountType,
            discountValue,
            minOrderAmount: minOrderAmount || 0,
            maxDiscount,
            expiresAt,
            usageLimit,
            description
        });

        return res.status(201).json(coupon);

    } catch (error) {
        return res.status(500).json({ message: `Create coupon error: ${error.message}` });
    }
};
