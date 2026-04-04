import express from "express"
import isAuth from "../middlewares/isAuth.js"
import { authorizeRoles } from "../middlewares/auth.middleware.js"
import { ROLE } from "../utils/roles.js"
import { acceptOrder, autoCompleteOrderByEta, getCurrentOrder, getDeliveryBoyAssignment, getMyOrders, getOrderById, getPaymentConfig, getTodayDeliveries, placeOrder, sendDeliveryOtp, updateOrderStatus, verifyDeliveryOtp, verifyPayment } from "../controllers/order.controllers.js"




const orderRouter=express.Router()

orderRouter.get("/payment-config",isAuth,authorizeRoles(ROLE.USER),getPaymentConfig)
orderRouter.post("/place-order",isAuth,authorizeRoles(ROLE.USER),placeOrder)
orderRouter.post("/verify-payment",isAuth,authorizeRoles(ROLE.USER),verifyPayment)
orderRouter.get("/my-orders",isAuth,getMyOrders)
orderRouter.get("/get-assignments",isAuth,authorizeRoles(ROLE.DELIVERY),getDeliveryBoyAssignment)
orderRouter.get("/get-current-order",isAuth,authorizeRoles(ROLE.DELIVERY),getCurrentOrder)
orderRouter.post("/send-delivery-otp",isAuth,authorizeRoles(ROLE.DELIVERY),sendDeliveryOtp)
orderRouter.post("/verify-delivery-otp",isAuth,authorizeRoles(ROLE.DELIVERY),verifyDeliveryOtp)
orderRouter.post("/update-status/:orderId/:shopId",isAuth,authorizeRoles(ROLE.RESTAURANT),updateOrderStatus)
orderRouter.get('/accept-order/:assignmentId',isAuth,authorizeRoles(ROLE.DELIVERY),acceptOrder)
orderRouter.get('/get-order-by-id/:orderId',isAuth,getOrderById)
orderRouter.patch('/auto-complete-by-eta/:orderId',isAuth,authorizeRoles(ROLE.USER),autoCompleteOrderByEta)
orderRouter.get('/get-today-deliveries',isAuth,authorizeRoles(ROLE.DELIVERY),getTodayDeliveries)

export default orderRouter
