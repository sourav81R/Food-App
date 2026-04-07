import bcrypt from "bcryptjs"
import Order from "../models/order.model.js"
import User from "../models/user.model.js"
import genToken from "../utils/token.js"
import { emitOrderStatusUpdated, setDeliveryPartnerAvailabilityIfIdle, syncOrderLifecycleStatus } from "../utils/orderRealtime.js"
import { sendPushToUser } from "../utils/pushNotifications.js"
import { ROLE, normalizeRole } from "../utils/roles.js"

const DELIVERY_ALLOWED_STATUS = new Set(["picked_up", "on_the_way", "delivered"])
const ACTIVE_DELIVERY_STATUSES = ["assigned", "picked_up", "on_the_way"]
const STATUS_TRANSITIONS = {
    assigned: new Set(["picked_up"]),
    picked_up: new Set(["on_the_way"]),
    on_the_way: new Set(["delivered"]),
    delivered: new Set()
}

const getCookieOptions = () => {
    const isProduction = process.env.NODE_ENV === "production"
    return {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000
    }
}

const sanitizeUser = (user) => ({
    _id: user._id,
    fullName: user.fullName,
    email: user.email,
    mobile: user.mobile,
    role: user.role,
    vehicleNumber: user.vehicleNumber,
    isAvailable: user.isAvailable
})

export const registerDeliveryPartner = async (req, res) => {
    try {
        const { name, email, password, phone, vehicleNumber } = req.body

        if (!name || !email || !password || !phone || !vehicleNumber) {
            return res.status(400).json({
                message: "name, email, password, phone and vehicleNumber are required"
            })
        }
        if (String(password).length < 6) {
            return res.status(400).json({ message: "password must be at least 6 characters" })
        }

        const normalizedEmail = String(email).trim().toLowerCase()
        const normalizedPhone = String(phone).replace(/\D/g, "")
        if (normalizedPhone.length < 10) {
            return res.status(400).json({ message: "phone must be at least 10 digits" })
        }

        const existingUser = await User.findOne({ email: normalizedEmail })
        if (existingUser) {
            return res.status(400).json({ message: "User already exists with this email" })
        }

        const hashedPassword = await bcrypt.hash(password, 10)
        const user = await User.create({
            fullName: String(name).trim(),
            email: normalizedEmail,
            password: hashedPassword,
            mobile: normalizedPhone,
            role: ROLE.DELIVERY,
            vehicleNumber: String(vehicleNumber).trim(),
            isAvailable: true
        })

        const token = await genToken(user._id)
        res.cookie("token", token, getCookieOptions())

        return res.status(201).json(sanitizeUser(user))
    } catch (error) {
        return res.status(500).json({ message: `delivery registration error ${error}` })
    }
}

export const loginDeliveryPartner = async (req, res) => {
    try {
        const { email, password } = req.body
        if (!email || !password) {
            return res.status(400).json({ message: "email and password are required" })
        }

        const user = await User.findOne({ email: String(email).trim().toLowerCase() })
        if (!user) {
            return res.status(400).json({ message: "User does not exist" })
        }
        if (normalizeRole(user.role) !== ROLE.DELIVERY) {
            return res.status(403).json({ message: "Account is not registered as delivery partner" })
        }
        if (user.isSuspended) {
            res.clearCookie("token", getCookieOptions())
            return res.status(403).json({ message: "Your account is suspended. Contact admin." })
        }
        if (!user.password) {
            return res.status(400).json({ message: "Please use your existing login method for this account" })
        }

        const isPasswordMatched = await bcrypt.compare(password, user.password)
        if (!isPasswordMatched) {
            return res.status(400).json({ message: "Incorrect password" })
        }

        const token = await genToken(user._id)
        res.cookie("token", token, getCookieOptions())

        return res.status(200).json(sanitizeUser(user))
    } catch (error) {
        return res.status(500).json({ message: `delivery login error ${error}` })
    }
}

export const toggleDeliveryAvailability = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select("role isAvailable")
        if (!user) {
            return res.status(404).json({ message: "Delivery partner not found" })
        }
        if (normalizeRole(user.role) !== ROLE.DELIVERY) {
            return res.status(403).json({ message: "Forbidden: delivery partner access required" })
        }

        const nextAvailability = typeof req.body?.isAvailable === "boolean"
            ? req.body.isAvailable
            : !user.isAvailable

        if (nextAvailability) {
            const activeOrderCount = await Order.countDocuments({
                deliveryPartner: req.userId,
                deliveryStatus: { $in: ACTIVE_DELIVERY_STATUSES },
                status: { $nin: ["cancelled", "delivered"] },
                hiddenFromUser: { $ne: true }
            })
            if (activeOrderCount > 0) {
                return res.status(400).json({
                    message: "You cannot mark yourself available while active deliveries are in progress"
                })
            }
        }

        user.isAvailable = nextAvailability
        await user.save()

        return res.status(200).json({
            message: `Availability updated to ${user.isAvailable ? "Available" : "Busy"}`,
            isAvailable: user.isAvailable
        })
    } catch (error) {
        return res.status(500).json({ message: `toggle availability error ${error}` })
    }
}

export const getAssignedDeliveryOrders = async (req, res) => {
    try {
        const orders = await Order.find({
            deliveryPartner: req.userId,
            deliveryStatus: { $in: ACTIVE_DELIVERY_STATUSES },
            status: { $nin: ["cancelled", "delivered"] },
            hiddenFromUser: { $ne: true }
        })
            .sort({ createdAt: -1 })
            .populate("user", "fullName email mobile socketId")
            .populate("deliveryPartner", "fullName mobile vehicleNumber isAvailable")
            .populate("shopOrders.shop", "name")
            .populate("shopOrders.owner", "fullName email mobile socketId")
            .populate("shopOrders.shopOrderItems.item", "name image price")

        return res.status(200).json(orders)
    } catch (error) {
        return res.status(500).json({ message: `get delivery orders error ${error}` })
    }
}

export const updateAssignedOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params
        const { status } = req.body

        if (!DELIVERY_ALLOWED_STATUS.has(status)) {
            return res.status(400).json({ message: "status must be picked_up, on_the_way or delivered" })
        }

        const order = await Order.findOne({ _id: orderId, deliveryPartner: req.userId })
            .populate("user", "fullName email mobile socketId")
            .populate("deliveryPartner", "fullName mobile vehicleNumber")
            .populate("shopOrders.owner", "fullName email mobile socketId")
            .populate("shopOrders.shop", "name")

        if (!order) {
            return res.status(404).json({ message: "Assigned order not found" })
        }

        const currentStatus = order.deliveryStatus || "assigned"
        if (status !== currentStatus && !STATUS_TRANSITIONS[currentStatus]?.has(status)) {
            return res.status(400).json({
                message: `Invalid status transition from ${currentStatus} to ${status}`
            })
        }

        order.deliveryStatus = status

        if (status === "delivered") {
            order.shopOrders.forEach((shopOrder) => {
                shopOrder.status = "delivered"
                shopOrder.deliveredAt = new Date()
            })
        } else {
            order.shopOrders.forEach((shopOrder) => {
                if (shopOrder.status !== "delivered") {
                    shopOrder.status = "out of delivery"
                }
            })
        }

        syncOrderLifecycleStatus(order)
        await order.save()

        if (status === "delivered") {
            await setDeliveryPartnerAvailabilityIfIdle(req.userId)
        }

        const io = req.app.get("io")
        emitOrderStatusUpdated(io, order)

        if (status === "on_the_way") {
            await sendPushToUser({
                userId: order.user?._id || order.user,
                title: "Out for delivery",
                body: "Your delivery partner is on the way.",
                data: {
                    orderId: String(order._id),
                    status: "on_the_way"
                }
            })
        }

        if (status === "delivered") {
            await sendPushToUser({
                userId: order.user?._id || order.user,
                title: "Order delivered",
                body: "Your order has been delivered successfully.",
                data: {
                    orderId: String(order._id),
                    status: "delivered"
                }
            })
        }

        return res.status(200).json({
            message: "Delivery status updated successfully",
            order
        })
    } catch (error) {
        return res.status(500).json({ message: `update delivery status error ${error}` })
    }
}

const getRangeConfig = (range = "today") => {
    const now = new Date()
    const start = new Date(now)
    const end = new Date(now)

    if (range === "month") {
        start.setDate(now.getDate() - 29)
        start.setHours(0, 0, 0, 0)
        end.setHours(23, 59, 59, 999)
        return { start, end, labelFormat: { month: "short", day: "numeric" } }
    }

    if (range === "week") {
        start.setDate(now.getDate() - 6)
        start.setHours(0, 0, 0, 0)
        end.setHours(23, 59, 59, 999)
        return { start, end, labelFormat: { weekday: "short" } }
    }

    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)
    return { start, end, labelFormat: { hour: "2-digit" } }
}

const formatRangeLabel = (date, range, labelFormat) => {
    if (range === "today") {
        return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    }
    return date.toLocaleDateString("en-IN", labelFormat)
}

export const getDeliveryEarnings = async (req, res) => {
    try {
        const range = String(req.query.range || "today").trim().toLowerCase()
        if (!["today", "week", "month"].includes(range)) {
            return res.status(400).json({ message: "range must be today, week or month" })
        }

        const { start, end, labelFormat } = getRangeConfig(range)
        const orders = await Order.find({
            shopOrders: {
                $elemMatch: {
                    assignedDeliveryBoy: req.userId,
                    status: "delivered",
                    deliveredAt: { $gte: start, $lte: end }
                }
            }
        }).select("shopOrders").lean()

        const deliveries = []
        orders.forEach((order) => {
            order.shopOrders.forEach((shopOrder) => {
                if (
                    String(shopOrder.assignedDeliveryBoy) === String(req.userId) &&
                    shopOrder.status === "delivered" &&
                    shopOrder.deliveredAt &&
                    new Date(shopOrder.deliveredAt) >= start &&
                    new Date(shopOrder.deliveredAt) <= end
                ) {
                    deliveries.push(shopOrder)
                }
            })
        })

        const chartMap = new Map()
        deliveries.forEach((delivery) => {
            const date = new Date(delivery.deliveredAt)
            const label = formatRangeLabel(date, range, labelFormat)
            const current = chartMap.get(label) || { label, earnings: 0, deliveries: 0 }
            current.earnings += 15
            current.deliveries += 1
            chartMap.set(label, current)
        })

        const totalDeliveries = deliveries.length
        const totalEarnings = totalDeliveries * 15
        const averagePerDelivery = totalDeliveries > 0 ? Number((totalEarnings / totalDeliveries).toFixed(2)) : 0

        return res.status(200).json({
            range,
            totalDeliveries,
            totalEarnings,
            averagePerDelivery,
            dailyEarnings: [...chartMap.values()]
        })
    } catch (error) {
        return res.status(500).json({ message: `delivery earnings error ${error.message}` })
    }
}
