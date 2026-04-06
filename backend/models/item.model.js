import mongoose from "mongoose";

const itemSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: true
    },
    shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Shop"
    },
    category: {
        type: String,
        enum: ["Snacks",
            "Main Course",
            "Desserts",
            "Pizza",
            "Burgers",
            "Sandwiches",
            "South Indian",
            "North Indian",
            "Chinese",
            "Fast Food",
            "Others"
        ],
        required:true
    },
    description: {
        type: String,
        trim: true,
        default: ""
    },
    city: {
        type: String,
        trim: true,
        default: ""
    },
    price:{
        type:Number,
        min:0,
        required:true
    },
    foodType:{
        type:String,
        enum:["veg","non veg"],
        required:true
    },
   rating:{
    average:{type:Number,default:0},
    count:{type:Number,default:0}
   }
}, { timestamps: true })

itemSchema.index({ city: 1, category: 1, "rating.average": -1 })
itemSchema.index({ name: "text", description: "text" })

const Item=mongoose.model("Item",itemSchema)
export default Item
