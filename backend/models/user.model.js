import mongoose from "mongoose";
import { ALL_SUPPORTED_ROLES } from "../utils/roles.js";

const addressSchema = new mongoose.Schema({
    label: {
        type: String,
        trim: true,
        required: true
    },
    fullAddress: {
        type: String,
        trim: true,
        required: true
    },
    lat: {
        type: Number,
        required: true
    },
    lng: {
        type: Number,
        required: true
    },
    isDefault: {
        type: Boolean,
        default: false
    }
}, { _id: true, timestamps: true })

const walletTransactionSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ["payment", "refund", "credit", "debit", "adjustment"],
        required: true
    },
    direction: {
        type: String,
        enum: ["credit", "debit"],
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    description: {
        type: String,
        trim: true,
        default: ""
    },
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
        default: null
    },
    balanceAfter: {
        type: Number,
        default: 0
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { _id: true })

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true,
        trim: true,
        alias: "name"
    },
    email: {
        type: String,
        required: true,
        unique:true,
        trim: true,
        lowercase: true
    },
    password:{
        type: String,
    },
    mobile:{
        type: String,
        required: true,
        trim: true,
        alias: "phone"
    },
    role:{
        type:String,
        enum:ALL_SUPPORTED_ROLES,
        required:true,
        default:"user",
        alias: "roles"
    },
    vehicleNumber: {
        type: String,
        trim: true,
        default: ""
    },
    isAvailable: {
        type: Boolean,
        default: true
    },
    resetOtp:{
        type:String
    },
    isOtpVerified:{
        type:Boolean,
        default:false
    },
    otpExpires:{
        type:Date
    },
    socketId:{
     type:String,
     
    },
    isOnline:{
        type:Boolean,
        default:false
    },
    isSuspended: {
        type: Boolean,
        default: false
    },
    suspendedAt: {
        type: Date,
        default: null
    },
   location:{
type:{type:String,enum:['Point'],default:'Point'},
coordinates:{type:[Number],default:[0,0]}
   },
   fcmTokens: {
    type: [String],
    default: []
   },
   walletBalance: {
    type: Number,
    default: 0,
    min: 0
   },
   walletTransactions: {
    type: [walletTransactionSchema],
    default: []
   },
   addresses: {
    type: [addressSchema],
    default: []
   }
  
}, { timestamps: true })

userSchema.index({location:'2dsphere'})


const User=mongoose.model("User",userSchema)
export default User
