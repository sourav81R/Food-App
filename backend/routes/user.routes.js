import express from "express"
import {
    addAddress,
    deleteAddress,
    getAddresses,
    getCurrentUser,
    getRecommendedItems,
    updateAddress,
    updateUserLocation
} from "../controllers/user.controllers.js"
import isAuth from "../middlewares/isAuth.js"


const userRouter=express.Router()

userRouter.get("/current",isAuth,getCurrentUser)
userRouter.post('/update-location',isAuth,updateUserLocation)
userRouter.get("/addresses", isAuth, getAddresses)
userRouter.post("/addresses", isAuth, addAddress)
userRouter.put("/addresses/:addressId", isAuth, updateAddress)
userRouter.delete("/addresses/:addressId", isAuth, deleteAddress)
userRouter.get("/recommendations", isAuth, getRecommendedItems)
export default userRouter
