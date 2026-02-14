import mongoose from "mongoose";

const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    discountType: {
        type: String,
        enum: ['percentage', 'fixed'],
        required: true
    },
    discountValue: {
        type: Number,
        required: true,
        min: 0
    },
    minOrderAmount: {
        type: Number,
        default: 0
    },
    maxDiscount: {
        type: Number,
        default: null // For percentage discounts, cap the max discount
    },
    expiresAt: {
        type: Date,
        required: true
    },
    usageLimit: {
        type: Number,
        default: null // null means unlimited
    },
    usedCount: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    description: {
        type: String,
        default: ''
    }
}, { timestamps: true });

// Method to check if coupon is valid
couponSchema.methods.isValid = function (orderAmount) {
    const now = new Date();

    if (!this.isActive) return { valid: false, message: 'Coupon is not active' };
    if (this.expiresAt < now) return { valid: false, message: 'Coupon has expired' };
    if (this.usageLimit && this.usedCount >= this.usageLimit) return { valid: false, message: 'Coupon usage limit reached' };
    if (orderAmount < this.minOrderAmount) return { valid: false, message: `Minimum order amount is ₹${this.minOrderAmount}` };

    return { valid: true };
};

// Method to calculate discount
couponSchema.methods.calculateDiscount = function (orderAmount) {
    let discount = 0;

    if (this.discountType === 'percentage') {
        discount = (orderAmount * this.discountValue) / 100;
        if (this.maxDiscount) {
            discount = Math.min(discount, this.maxDiscount);
        }
    } else {
        discount = this.discountValue;
    }

    return Math.round(discount);
};

const Coupon = mongoose.model("Coupon", couponSchema);
export default Coupon;
