import express from "express"
import {
    getAssignedDeliveryOrders,
    loginDeliveryPartner,
    registerDeliveryPartner,
    toggleDeliveryAvailability,
    updateAssignedOrderStatus
} from "../controllers/delivery.controllers.js"
import { authorizeRoles, protectRoute } from "../middlewares/auth.middleware.js"

const deliveryRouter = express.Router()

deliveryRouter.post("/register", registerDeliveryPartner)
deliveryRouter.post("/login", loginDeliveryPartner)
deliveryRouter.post("/signup", registerDeliveryPartner)
deliveryRouter.post("/signin", loginDeliveryPartner)

deliveryRouter.patch(
    "/toggle-availability",
    protectRoute,
    authorizeRoles("delivery"),
    toggleDeliveryAvailability
)
deliveryRouter.get(
    "/orders",
    protectRoute,
    authorizeRoles("delivery"),
    getAssignedDeliveryOrders
)
deliveryRouter.patch(
    "/update-status/:orderId",
    protectRoute,
    authorizeRoles("delivery"),
    updateAssignedOrderStatus
)

export default deliveryRouter
