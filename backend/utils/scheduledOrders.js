import cron from "node-cron"
import Order from "../models/order.model.js"
import { activateOrder } from "./orderActivation.js"

let isProcessingScheduledOrders = false

export const startScheduledOrdersJob = (app) => {
    cron.schedule("* * * * *", async () => {
        if (isProcessingScheduledOrders) return
        isProcessingScheduledOrders = true

        try {
            const now = new Date()
            const io = app.get("io")
            const scheduledOrders = await Order.find({
                status: "scheduled",
                scheduledFor: { $lte: now }
            }).sort({ scheduledFor: 1 })

            for (const order of scheduledOrders) {
                try {
                    await activateOrder({ order, io })
                } catch (error) {
                    console.error(`Scheduled order activation failed for ${order._id}:`, error.message)
                }
            }
        } catch (error) {
            console.error("Scheduled order job error:", error.message)
        } finally {
            isProcessingScheduledOrders = false
        }
    })
}
