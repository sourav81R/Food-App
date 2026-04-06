import mongoose from "mongoose";

const shopOrderItemSchema = new mongoose.Schema({
    item:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Item",
        required:true
    },
    name:String,
    price:Number,
    quantity:Number
}, { timestamps: true })

const shopOrderSchema = new mongoose.Schema({
    shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Shop"
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    subtotal: Number,
    shopOrderItems: [shopOrderItemSchema],
    status:{
        type:String,
        enum:["pending","preparing","out of delivery","delivered","cancelled"],
        default:"pending"
    },
  assignment:{
     type: mongoose.Schema.Types.ObjectId,
    ref: "DeliveryAssignment",
    default:null
  },
  assignedDeliveryBoy:{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
deliveryOtp:{
        type:String,
        default:null
    },
otpExpires:{
        type:Date,
        default:null
    },
deliveredAt:{
    type:Date,
    default:null
}

}, { timestamps: true })

const refundSchema = new mongoose.Schema({
    status: {
        type: String,
        enum: ["none", "pending", "processed", "failed"],
        default: "none"
    },
    amount: {
        type: Number,
        default: 0
    },
    method: {
        type: String,
        enum: ["none", "razorpay", "wallet"],
        default: "none"
    },
    reason: {
        type: String,
        default: ""
    },
    razorpayRefundId: {
        type: String,
        default: ""
    },
    processedAt: {
        type: Date,
        default: null
    },
    note: {
        type: String,
        default: ""
    }
}, { _id: false })

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    deliveryPartner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    deliveryStatus: {
        type: String,
        enum: ["assigned", "picked_up", "on_the_way", "delivered"],
        default: null
    },
    paymentMethod: {
        type: String,
        enum: ['cod', "online", "wallet"],
        required: true
    },
    status: {
        type: String,
        enum: ["scheduled", "pending", "preparing", "out of delivery", "delivered", "cancelled"],
        default: "pending"
    },
    deliveryAddress: {
        text: String,
        latitude: Number,
        longitude: Number
    },
    totalAmount: {
        type: Number
    }
    ,
    shopOrders: [shopOrderSchema],
    payment:{
        type:Boolean,
        default:false
    },
    walletAmountUsed: {
        type: Number,
        default: 0
    },
    coupon: {
        code: {
            type: String,
            default: ""
        },
        discount: {
            type: Number,
            default: 0
        },
        discountType: {
            type: String,
            default: ""
        },
        discountValue: {
            type: Number,
            default: 0
        },
        description: {
            type: String,
            default: ""
        }
    },
    scheduledFor: {
        type: Date,
        default: null
    },
    activatedAt: {
        type: Date,
        default: null
    },
    cancellation: {
        cancelledAt: {
            type: Date,
            default: null
        },
        cancelledBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        reason: {
            type: String,
            default: ""
        }
    },
    refund: {
        type: refundSchema,
        default: () => ({})
    },
    razorpayOrderId:{
        type:String,
        default:""
    },
   razorpayPaymentId:{
    type:String,
       default:""
   }
}, { timestamps: true })

orderSchema.index({ deliveryPartner: 1, deliveryStatus: 1 })
orderSchema.index({ user: 1, createdAt: -1 })
orderSchema.index({ status: 1, scheduledFor: 1 })

const Order=mongoose.model("Order",orderSchema)
export default Order
