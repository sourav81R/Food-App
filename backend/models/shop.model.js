import mongoose from "mongoose";

const shopSchema=new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    image:{
        type:String,
        required:true
    },
    owner:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    city:{
         type:String,
        required:true
    },
    state:{
         type:String,
        required:true
    },
    address:{
        type:String,
        required:true
    },
    items:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Item"
    }],
    averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    totalReviews: {
        type: Number,
        default: 0,
        min: 0
    },
    openingTime: {
        type: String,
        default: "09:00"
    },
    closingTime: {
        type: String,
        default: "23:00"
    },
    isOpen: {
        type: Boolean,
        default: true
    },
    isBusy: {
        type: Boolean,
        default: false
    },
    location: {
        type: {
            type: String,
            enum: ["Point"],
            default: "Point"
        },
        coordinates: {
            type: [Number],
            default: [0, 0]
        }
    }

},{timestamps:true})

shopSchema.index({ location: "2dsphere" })

const Shop=mongoose.model("Shop",shopSchema)
export default Shop
