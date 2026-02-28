import mongoose from "mongoose";
import { ALL_SUPPORTED_ROLES } from "../utils/roles.js";

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
   }
  
}, { timestamps: true })

userSchema.index({location:'2dsphere'})


const User=mongoose.model("User",userSchema)
export default User
