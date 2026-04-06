import express from "express"
import isAuth from "../middlewares/isAuth.js"
import { registerNotificationToken } from "../controllers/notifications.controllers.js"

const notificationRouter = express.Router()

notificationRouter.post("/token", isAuth, registerNotificationToken)

export default notificationRouter
