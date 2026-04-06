import express from "express"
import { createEditShop, getMyShop, getShopAnalytics, getShopByCity, toggleBusyMode } from "../controllers/shop.controllers.js"
import isAuth from "../middlewares/isAuth.js"
import { authorizeRoles } from "../middlewares/auth.middleware.js"
import { upload } from "../middlewares/multer.js"
import { ROLE } from "../utils/roles.js"



const shopRouter=express.Router()

shopRouter.post("/create-edit",isAuth,upload.single("image"),createEditShop)
shopRouter.get("/get-my",isAuth,getMyShop)
shopRouter.get("/get-by-city/:city",isAuth,getShopByCity)
shopRouter.patch("/busy-mode", isAuth, authorizeRoles(ROLE.RESTAURANT), toggleBusyMode)
shopRouter.get("/analytics", isAuth, authorizeRoles(ROLE.RESTAURANT), getShopAnalytics)

export default shopRouter
