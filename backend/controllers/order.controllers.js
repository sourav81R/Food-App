import RazorPay from "razorpay"
import DeliveryAssignment from "../models/deliveryAssignment.model.js"
import Order from "../models/order.model.js"
import Shop from "../models/shop.model.js"
import User from "../models/user.model.js"
import { sendDeliveryOtpMail } from "../utils/mail.js"
import { activateOrder } from "../utils/orderActivation.js"
import {
    emitEtaForOrder,
    emitOrderStatusUpdated,
    getLiveEtaForOrder,
    getOrderProgressStatus,
    setDeliveryPartnerAvailabilityIfIdle,
    syncOrderLifecycleStatus
} from "../utils/orderRealtime.js"
import { sendPushToUser } from "../utils/pushNotifications.js"
import { getShopAvailability } from "../utils/shopAvailability.js"
import { debitWallet, creditWallet } from "../utils/wallet.js"
import { ROLE, expandRoleValues, normalizeRole } from "../utils/roles.js"
import { SOCKET_EVENTS } from "../utils/socketEvents.js"

const ALLOWED_PAYMENT_METHODS = new Set(["cod", "online", "wallet"])
const SAMPLE_KEY_IDS = new Set([
    "rzp_test_1DP5mmOlF5G5ag",
    "rzp_test_xxxxxxxxxxxxxx"
])
const SAMPLE_SECRETS = new Set([
    "qwertyui",
    "your_razorpay_secret"
])
const DELIVERY_CHARGE_PER_ORDER = 15

const normalizeEnvValue = (value = "") =>
    String(value).trim().replace(/^['"]|['"]$/g, "")

const getRazorpayClient = () => {
    const keyId = normalizeEnvValue(process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_API_KEY || "")
    const keySecret = normalizeEnvValue(process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_API_SECRET || "")

    if (!keyId || !keySecret) {
        return {
            error: "Razorpay is not configured on server. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env"
        }
    }

    if (SAMPLE_KEY_IDS.has(keyId) || SAMPLE_SECRETS.has(keySecret)) {
        return {
            error: "Razorpay is using sample credentials. Replace RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET with real Dashboard API keys."
        }
    }

    return {
        client: new RazorPay({
            key_id: keyId,
            key_secret: keySecret
        }),
        keyId
    }
}

const toSafeDate = (value) => {
    if (!value) return null
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
}

const validateScheduledFor = (value) => {
    if (!value) return null
    const scheduledFor = toSafeDate(value)
    if (!scheduledFor) {
        throw new Error("Invalid scheduled time")
    }

    const now = new Date()
    const maxDate = new Date(now.getTime() + (24 * 60 * 60 * 1000))
    if (scheduledFor <= now) {
        throw new Error("Scheduled time must be in the future")
    }
    if (scheduledFor > maxDate) {
        throw new Error("Scheduled time must be within the next 24 hours")
    }

    return scheduledFor
}

const normalizeCouponPayload = (coupon = {}) => ({
    code: String(coupon?.code || "").trim().toUpperCase(),
    discount: Number(coupon?.discount || 0),
    discountType: String(coupon?.discountType || "").trim(),
    discountValue: Number(coupon?.discountValue || 0),
    description: String(coupon?.description || "").trim()
})

const buildShopOrders = async (cartItems = [], scheduledDate = null) => {
    const grouped = {}

    cartItems.forEach((item) => {
        const shopId = item?.shop?._id || item?.shop
        if (!shopId) {
            throw new Error("Invalid cart item: missing shop id")
        }
        if (!grouped[shopId]) {
            grouped[shopId] = []
        }
        grouped[shopId].push(item)
    })

    return Promise.all(Object.keys(grouped).map(async (shopId) => {
        const shop = await Shop.findById(shopId).populate("owner")
        if (!shop) {
            throw new Error(`shop not found: ${shopId}`)
        }

        const availability = getShopAvailability(shop, scheduledDate || new Date())
        if (!availability.isAvailable) {
            throw new Error(`${shop.name} is ${availability.label.toLowerCase()}. ${availability.reason}`)
        }

        const items = grouped[shopId]
        const subtotal = items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0)

        return {
            shop: shop._id,
            owner: shop.owner._id,
            subtotal,
            shopOrderItems: items.map((item) => ({
                item: item.id || item._id,
                price: item.price,
                quantity: item.quantity,
                name: item.name
            }))
        }
    }))
}

const populateCustomerOrder = async (order) => {
    await order.populate("shopOrders.shop", "name openingTime closingTime isOpen isBusy")
    await order.populate("shopOrders.owner", "name email mobile socketId")
    await order.populate("shopOrders.shopOrderItems.item", "name image price foodType")
    await order.populate("user", "fullName email mobile socketId")
    await order.populate("deliveryPartner", "fullName mobile vehicleNumber location socketId")
    return order
}

const sendStatusPushNotification = async ({ order, title, body, data = {} }) => {
    try {
        await sendPushToUser({
            userId: order?.user?._id || order?.user,
            title,
            body,
            data: {
                orderId: String(order?._id || ""),
                ...Object.fromEntries(Object.entries(data).map(([key, value]) => [key, String(value ?? "")]))
            }
        })
    } catch (error) {
        console.error("Push notification error:", error.message)
    }
}

const canCancelOrder = (order) => {
    const validStatuses = new Set(["pending", "preparing"])
    if (order?.status === "scheduled") return true
    return (order?.shopOrders || []).every((shopOrder) => validStatuses.has(shopOrder.status))
}

const refundOrderIfNeeded = async (order) => {
    if (order?.refund?.status === "processed") {
        return
    }

    const orderUserId = order?.user?._id || order?.user
    const refundAmount = order?.paymentMethod === "wallet"
        ? Number(order?.walletAmountUsed || order?.totalAmount || 0)
        : Number(order?.totalAmount || 0)

    if (refundAmount <= 0) {
        order.refund = {
            status: "processed",
            amount: 0,
            method: "none",
            reason: "Nothing to refund",
            processedAt: new Date()
        }
        return
    }

    if (order.paymentMethod === "wallet" && !order.payment) {
        order.refund = {
            status: "processed",
            amount: 0,
            method: "none",
            reason: "Wallet payment was not completed",
            processedAt: new Date(),
            note: "No refund required because wallet was not charged"
        }
        return
    }

    if (order.paymentMethod === "cod") {
        order.refund = {
            status: "processed",
            amount: 0,
            method: "none",
            reason: "Cash on delivery order cancelled",
            processedAt: new Date(),
            note: "No refund issued because payment was due on delivery"
        }
        return
    }

    if (order.paymentMethod === "online" && order.payment && order.razorpayPaymentId) {
        const { client, error } = getRazorpayClient()
        if (!error) {
            try {
                const refund = await client.payments.refund(order.razorpayPaymentId, {
                    amount: Math.round(refundAmount * 100),
                    notes: {
                        orderId: String(order._id)
                    }
                })

                order.refund = {
                    status: "processed",
                    amount: refundAmount,
                    method: "razorpay",
                    reason: "Order cancelled",
                    razorpayRefundId: refund?.id || "",
                    processedAt: new Date(),
                    note: "Refund initiated through Razorpay"
                }
                return
            } catch (error) {
                console.error("Razorpay refund failed, falling back to wallet:", error.message)
            }
        }
    }

    if (order.paymentMethod === "online" && !order.payment) {
        order.refund = {
            status: "processed",
            amount: 0,
            method: "none",
            reason: "Payment was not captured",
            processedAt: new Date(),
            note: "No refund required for unpaid online order"
        }
        return
    }

    if (order.paymentMethod === "wallet" || order.paymentMethod === "online") {
        await creditWallet({
            userId: orderUserId,
            amount: refundAmount,
            type: "refund",
            description: `Refund for cancelled order #${String(order._id).slice(-6)}`,
            orderId: order._id,
            metadata: {
                paymentMethod: order.paymentMethod
            }
        })

        order.refund = {
            status: "processed",
            amount: refundAmount,
            method: "wallet",
            reason: "Order cancelled",
            processedAt: new Date(),
            note: order.paymentMethod === "online"
                ? "Wallet credited after online refund fallback"
                : "Wallet credited for cancelled wallet order"
        }
        return
    }

    order.refund = {
        status: "failed",
        amount: 0,
        method: "none",
        reason: "Refund method unsupported",
        processedAt: new Date(),
        note: `No refund rule configured for payment method ${order.paymentMethod || "unknown"}`
    }
}

export const getPaymentConfig = async (req, res) => {
    try {
        const { error, keyId } = getRazorpayClient()
        if (error) {
            return res.status(200).json({
                onlinePaymentEnabled: false,
                reason: error
            })
        }

        return res.status(200).json({
            onlinePaymentEnabled: true,
            keyId
        })
    } catch (error) {
        return res.status(500).json({ message: `payment config error ${error.message}` })
    }
}

export const placeOrder = async (req, res) => {
    try {
        const {
            cartItems,
            paymentMethod,
            deliveryAddress,
            totalAmount,
            coupon,
            scheduledFor
        } = req.body

        if (!Array.isArray(cartItems) || cartItems.length === 0) {
            return res.status(400).json({ message: "cart is empty" })
        }
        if (!ALLOWED_PAYMENT_METHODS.has(paymentMethod)) {
            return res.status(400).json({ message: "invalid payment method" })
        }
        if (!Number.isFinite(Number(totalAmount)) || Number(totalAmount) <= 0) {
            return res.status(400).json({ message: "invalid total amount" })
        }
        if (!deliveryAddress?.text || deliveryAddress?.latitude == null || deliveryAddress?.longitude == null) {
            return res.status(400).json({ message: "send complete deliveryAddress" })
        }

        let scheduledDate = null
        try {
            scheduledDate = validateScheduledFor(scheduledFor)
        } catch (error) {
            return res.status(400).json({ message: error.message })
        }

        const shopOrders = await buildShopOrders(cartItems, scheduledDate)
        const normalizedCoupon = normalizeCouponPayload(coupon)

        const orderPayload = {
            user: req.userId,
            paymentMethod,
            deliveryAddress,
            totalAmount: Number(totalAmount),
            shopOrders,
            coupon: normalizedCoupon,
            scheduledFor: scheduledDate,
            status: scheduledDate ? "scheduled" : "pending",
            payment: paymentMethod === "wallet"
        }

        if (paymentMethod === "online") {
            const { client, error, keyId } = getRazorpayClient()
            if (error) {
                return res.status(503).json({ message: error })
            }

            let razorOrder
            try {
                razorOrder = await client.orders.create({
                    amount: Math.round(Number(totalAmount) * 100),
                    currency: "INR",
                    receipt: `receipt_${Date.now()}`
                })
            } catch (razorpayError) {
                const providerStatus = razorpayError?.statusCode
                const statusCode = providerStatus === 401 ? 502 : (providerStatus || 502)
                const description = providerStatus === 401
                    ? "Razorpay authentication failed. Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET."
                    : (razorpayError?.error?.description || razorpayError?.message || "Failed to create Razorpay order")
                return res.status(statusCode).json({ message: description })
            }

            const newOrder = await Order.create({
                ...orderPayload,
                razorpayOrderId: razorOrder.id,
                payment: false
            })

            return res.status(200).json({
                razorOrder,
                orderId: newOrder._id,
                razorpayKeyId: keyId,
                scheduledFor: newOrder.scheduledFor,
                status: newOrder.status
            })
        }

        const newOrder = await Order.create(orderPayload)

        if (paymentMethod === "wallet") {
            try {
                await debitWallet({
                    userId: req.userId,
                    amount: Number(totalAmount),
                    type: "payment",
                    description: `Wallet payment for order #${String(newOrder._id).slice(-6)}`,
                    orderId: newOrder._id
                })
                newOrder.walletAmountUsed = Number(totalAmount)
                newOrder.payment = true
                await newOrder.save()
            } catch (error) {
                await Order.findByIdAndDelete(newOrder._id)
                return res.status(400).json({ message: error.message })
            }
        }

        const io = req.app.get("io")
        const activatedOrder = scheduledDate
            ? await populateCustomerOrder(newOrder)
            : await activateOrder({ order: newOrder, io })

        return res.status(201).json(activatedOrder)
    } catch (error) {
        return res.status(500).json({ message: error?.message || "place order failed" })
    }
}

export const verifyPayment = async (req, res) => {
    try {
        const { razorpay_payment_id, orderId } = req.body
        if (!razorpay_payment_id || !orderId) {
            return res.status(400).json({ message: "razorpay_payment_id and orderId are required" })
        }

        const { client, error } = getRazorpayClient()
        if (error) {
            return res.status(503).json({ message: error })
        }

        const order = await Order.findById(orderId)
        if (!order) {
            return res.status(400).json({ message: "order not found" })
        }
        if (String(order.user) !== String(req.userId)) {
            return res.status(403).json({ message: "unauthorized order access" })
        }

        let payment
        try {
            payment = await client.payments.fetch(razorpay_payment_id)
        } catch (razorpayError) {
            const providerStatus = razorpayError?.statusCode
            const statusCode = providerStatus === 401 ? 502 : (providerStatus || 502)
            const description = providerStatus === 401
                ? "Razorpay authentication failed. Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET."
                : (razorpayError?.error?.description || razorpayError?.message || "Failed to verify payment")
            return res.status(statusCode).json({ message: description })
        }

        if (!payment || payment.status !== "captured") {
            return res.status(400).json({ message: "payment not captured" })
        }
        if (order.razorpayOrderId && payment.order_id !== order.razorpayOrderId) {
            return res.status(400).json({ message: "payment does not belong to this order" })
        }

        order.payment = true
        order.razorpayPaymentId = razorpay_payment_id
        await order.save()

        const io = req.app.get("io")
        const verifiedOrder = order.scheduledFor && !order.activatedAt
            ? await populateCustomerOrder(order)
            : await activateOrder({ order, io })

        return res.status(200).json(verifiedOrder)
    } catch (error) {
        return res.status(500).json({ message: error?.error?.description || error?.message || "verify payment failed" })
    }
}

export const getMyOrders = async (req, res) => {
    try {
        const user = await User.findById(req.userId)
        const normalizedUserRole = normalizeRole(user?.role)

        if (normalizedUserRole === ROLE.USER) {
            const orders = await Order.find({ user: req.userId })
                .sort({ createdAt: -1 })
                .populate("shopOrders.shop", "name openingTime closingTime isOpen isBusy")
                .populate("shopOrders.owner", "name email mobile")
                .populate("shopOrders.shopOrderItems.item", "name image price foodType")
                .populate("deliveryPartner", "fullName mobile vehicleNumber")

            return res.status(200).json(orders)
        }

        if (normalizedUserRole === ROLE.RESTAURANT) {
            const orders = await Order.find({
                "shopOrders.owner": req.userId,
                status: { $ne: "scheduled" }
            })
                .sort({ createdAt: -1 })
                .populate("shopOrders.shop", "name")
                .populate("user")
                .populate("shopOrders.shopOrderItems.item", "name image price foodType")
                .populate("shopOrders.assignedDeliveryBoy", "fullName mobile")
                .populate("deliveryPartner", "fullName mobile vehicleNumber")

            const filteredOrders = orders.map((order) => ({
                _id: order._id,
                paymentMethod: order.paymentMethod,
                user: order.user,
                shopOrders: order.shopOrders.find((shopOrder) => String(shopOrder.owner?._id || shopOrder.owner) === String(req.userId)),
                createdAt: order.createdAt,
                deliveryAddress: order.deliveryAddress,
                payment: order.payment,
                totalAmount: order.totalAmount,
                status: order.status,
                scheduledFor: order.scheduledFor
            }))

            return res.status(200).json(filteredOrders)
        }

        return res.status(403).json({ message: "Forbidden" })
    } catch (error) {
        return res.status(500).json({ message: `get user order error ${error.message}` })
    }
}

export const updateOrderStatus = async (req, res) => {
    try {
        const { orderId, shopId } = req.params
        const { status } = req.body
        const order = await Order.findById(orderId)
        if (!order) {
            return res.status(404).json({ message: "order not found" })
        }
        if (order.status === "cancelled") {
            return res.status(400).json({ message: "cancelled orders cannot be updated" })
        }

        const shopOrder = order.shopOrders.find((entry) => String(entry.shop) === String(shopId))
        if (!shopOrder) {
            return res.status(400).json({ message: "shop order not found" })
        }

        shopOrder.status = status
        let deliveryBoysPayload = []

        if (status === "out of delivery" && !shopOrder.assignment) {
            const { longitude, latitude } = order.deliveryAddress
            const nearByDeliveryBoys = await User.find({
                role: { $in: expandRoleValues(ROLE.DELIVERY) },
                location: {
                    $near: {
                        $geometry: { type: "Point", coordinates: [Number(longitude), Number(latitude)] },
                        $maxDistance: 5000
                    }
                }
            })

            const nearByIds = nearByDeliveryBoys.map((boy) => boy._id)
            const busyIds = await DeliveryAssignment.find({
                assignedTo: { $in: nearByIds },
                status: { $nin: ["brodcasted", "completed"] }
            }).distinct("assignedTo")

            const busyIdSet = new Set(busyIds.map((id) => String(id)))
            const availableBoys = nearByDeliveryBoys.filter((boy) => !busyIdSet.has(String(boy._id)))
            const candidates = availableBoys.map((boy) => boy._id)

            if (candidates.length > 0) {
                const deliveryAssignment = await DeliveryAssignment.create({
                    order: order._id,
                    shop: shopOrder.shop,
                    shopOrderId: shopOrder._id,
                    brodcastedTo: candidates,
                    status: "brodcasted"
                })

                shopOrder.assignment = deliveryAssignment._id
                deliveryBoysPayload = availableBoys.map((boy) => ({
                    _id: boy._id,
                    fullName: boy.fullName,
                    longitude: boy.location.coordinates?.[0],
                    latitude: boy.location.coordinates?.[1],
                    mobile: boy.mobile
                }))

                await deliveryAssignment.populate("order")
                await deliveryAssignment.populate("shop")
                const io = req.app.get("io")
                if (io) {
                    availableBoys.forEach((boy) => {
                        const boySocketId = boy.socketId
                        if (!boySocketId) return

                        io.to(boySocketId).emit(SOCKET_EVENTS.NEW_ASSIGNMENT, {
                            sentTo: boy._id,
                            assignmentId: deliveryAssignment._id,
                            orderId: deliveryAssignment.order._id,
                            shopName: deliveryAssignment.shop.name,
                            deliveryAddress: deliveryAssignment.order.deliveryAddress,
                            items: deliveryAssignment.order.shopOrders.find((entry) => entry._id.equals(deliveryAssignment.shopOrderId))?.shopOrderItems || [],
                            subtotal: deliveryAssignment.order.shopOrders.find((entry) => entry._id.equals(deliveryAssignment.shopOrderId))?.subtotal
                        })
                    })
                }
            }
        }

        syncOrderLifecycleStatus(order)
        await order.save()
        await order.populate("shopOrders.shop", "name")
        await order.populate("shopOrders.assignedDeliveryBoy", "fullName email mobile")
        await order.populate("user", "socketId fullName")
        await order.populate("shopOrders.owner", "socketId")

        const updatedShopOrder = order.shopOrders.find((entry) => String(entry.shop?._id || entry.shop) === String(shopId))
        const io = req.app.get("io")
        if (io && order.user?.socketId) {
            io.to(order.user.socketId).emit(SOCKET_EVENTS.UPDATE_STATUS, {
                orderId: order._id,
                shopId: updatedShopOrder.shop._id,
                status: updatedShopOrder.status,
                userId: order.user._id
            })
            emitOrderStatusUpdated(io, order)
        }

        if (status === "preparing") {
            await sendStatusPushNotification({
                order,
                title: "Order accepted",
                body: `${updatedShopOrder.shop.name} started preparing your order.`,
                data: { status: "preparing" }
            })
        }

        if (status === "out of delivery") {
            await sendStatusPushNotification({
                order,
                title: "Out for delivery",
                body: `${updatedShopOrder.shop.name} marked your order as out for delivery.`,
                data: { status: "out_of_delivery" }
            })
        }

        return res.status(200).json({
            shopOrder: updatedShopOrder,
            assignedDeliveryBoy: updatedShopOrder?.assignedDeliveryBoy,
            availableBoys: deliveryBoysPayload,
            assignment: updatedShopOrder?.assignment?._id || updatedShopOrder?.assignment
        })
    } catch (error) {
        return res.status(500).json({ message: `order status error ${error.message}` })
    }
}

export const getDeliveryBoyAssignment = async (req, res) => {
    try {
        const deliveryBoyId = req.userId
        const assignments = await DeliveryAssignment.find({
            brodcastedTo: deliveryBoyId,
            status: "brodcasted"
        })
            .populate("order")
            .populate("shop")

        const formatted = assignments.map((assignment) => ({
            assignmentId: assignment._id,
            orderId: assignment.order._id,
            shopName: assignment.shop.name,
            deliveryAddress: assignment.order.deliveryAddress,
            items: assignment.order.shopOrders.find((shopOrder) => shopOrder._id.equals(assignment.shopOrderId))?.shopOrderItems || [],
            subtotal: assignment.order.shopOrders.find((shopOrder) => shopOrder._id.equals(assignment.shopOrderId))?.subtotal
        }))

        return res.status(200).json(formatted)
    } catch (error) {
        return res.status(500).json({ message: `get assignment error ${error.message}` })
    }
}

export const acceptOrder = async (req, res) => {
    try {
        const { assignmentId } = req.params
        const assignment = await DeliveryAssignment.findById(assignmentId)
        if (!assignment) {
            return res.status(400).json({ message: "assignment not found" })
        }
        if (assignment.status !== "brodcasted") {
            return res.status(400).json({ message: "assignment is expired" })
        }

        const alreadyAssigned = await DeliveryAssignment.findOne({
            assignedTo: req.userId,
            status: { $nin: ["brodcasted", "completed"] }
        })
        if (alreadyAssigned) {
            return res.status(400).json({ message: "You are already assigned to another order" })
        }

        assignment.assignedTo = req.userId
        assignment.status = "assigned"
        assignment.acceptedAt = new Date()
        await assignment.save()

        const order = await Order.findById(assignment.order)
        if (!order) {
            return res.status(400).json({ message: "order not found" })
        }

        const shopOrder = order.shopOrders.id(assignment.shopOrderId)
        if (!shopOrder) {
            return res.status(400).json({ message: "shop order not found" })
        }

        order.deliveryPartner = req.userId
        order.deliveryStatus = "assigned"
        shopOrder.assignedDeliveryBoy = req.userId
        syncOrderLifecycleStatus(order)
        await order.save()

        const io = req.app.get("io")
        await order.populate("user", "socketId fullName")
        await order.populate("deliveryPartner", "location fullName mobile")
        await order.populate("shopOrders.assignedDeliveryBoy", "location")
        await emitEtaForOrder(io, order)

        return res.status(200).json({
            message: "order accepted"
        })
    } catch (error) {
        return res.status(500).json({ message: `accept order error ${error.message}` })
    }
}

export const getCurrentOrder = async (req, res) => {
    try {
        const assignment = await DeliveryAssignment.findOne({
            assignedTo: req.userId,
            status: "assigned"
        })
            .populate("shop", "name")
            .populate("assignedTo", "fullName email mobile location")
            .populate({
                path: "order",
                populate: [
                    { path: "user", select: "fullName email location mobile" }
                ]
            })

        if (!assignment) {
            return res.status(400).json({ message: "assignment not found" })
        }
        if (!assignment.order) {
            return res.status(400).json({ message: "order not found" })
        }

        const shopOrder = assignment.order.shopOrders.find((entry) => String(entry._id) === String(assignment.shopOrderId))
        if (!shopOrder) {
            return res.status(400).json({ message: "shopOrder not found" })
        }

        let deliveryBoyLocation = { lat: null, lon: null }
        if (assignment.assignedTo.location.coordinates.length === 2) {
            deliveryBoyLocation.lat = assignment.assignedTo.location.coordinates[1]
            deliveryBoyLocation.lon = assignment.assignedTo.location.coordinates[0]
        }

        let customerLocation = { lat: null, lon: null }
        if (assignment.order.deliveryAddress) {
            customerLocation.lat = assignment.order.deliveryAddress.latitude
            customerLocation.lon = assignment.order.deliveryAddress.longitude
        }

        return res.status(200).json({
            _id: assignment.order._id,
            user: assignment.order.user,
            shopOrder,
            deliveryAddress: assignment.order.deliveryAddress,
            deliveryBoyLocation,
            customerLocation
        })
    } catch (error) {
        return res.status(500).json({ message: `get current order error ${error.message}` })
    }
}

export const getOrderById = async (req, res) => {
    try {
        const { orderId } = req.params
        const requester = await User.findById(req.userId).select("role")
        if (!requester) {
            return res.status(401).json({ message: "Unauthorized" })
        }

        const order = await Order.findById(orderId)
            .populate("user", "fullName email mobile")
            .populate("deliveryPartner", "fullName email mobile vehicleNumber location socketId")
            .populate({
                path: "shopOrders.shop",
                model: "Shop"
            })
            .populate({
                path: "shopOrders.owner",
                model: "User",
                select: "fullName email mobile socketId"
            })
            .populate({
                path: "shopOrders.assignedDeliveryBoy",
                model: "User",
                select: "fullName email mobile vehicleNumber location socketId"
            })
            .populate({
                path: "shopOrders.shopOrderItems.item",
                model: "Item"
            })
            .lean()

        if (!order) {
            return res.status(400).json({ message: "order not found" })
        }

        const requesterId = String(req.userId)
        const requesterRole = normalizeRole(requester.role)
        const isAdmin = requesterRole === ROLE.ADMIN
        const isOrderUser = String(order?.user?._id) === requesterId
        const isRestaurantOwner = (order.shopOrders || []).some(
            (shopOrder) => String(shopOrder?.owner?._id) === requesterId
        )
        const isAssignedDelivery = String(order?.deliveryPartner?._id) === requesterId ||
            (order.shopOrders || []).some(
                (shopOrder) => String(shopOrder?.assignedDeliveryBoy?._id) === requesterId
            )

        if (!isAdmin && !isOrderUser && !isRestaurantOwner && !isAssignedDelivery) {
            return res.status(403).json({ message: "Forbidden: you are not allowed to view this order" })
        }

        if (order.deliveryPartner) {
            order.shopOrders = (order.shopOrders || []).map((shopOrder) => ({
                ...shopOrder,
                assignedDeliveryBoy: shopOrder.assignedDeliveryBoy || order.deliveryPartner
            }))
        }

        const progressStatus = getOrderProgressStatus(order)
        const liveEta = await getLiveEtaForOrder(order)
        order.liveEta = {
            ...liveEta,
            progressStatus
        }

        return res.status(200).json(order)
    } catch (error) {
        return res.status(500).json({ message: `get by id order error ${error.message}` })
    }
}

export const autoCompleteOrderByEta = async (req, res) => {
    try {
        const { orderId } = req.params
        const order = await Order.findById(orderId)
            .populate("user", "socketId fullName")
            .populate("deliveryPartner", "location")
            .populate("shopOrders.assignedDeliveryBoy", "location")
            .populate("shopOrders.owner", "socketId")

        if (!order) {
            return res.status(404).json({ message: "order not found" })
        }
        if (String(order.user?._id || order.user) !== String(req.userId)) {
            return res.status(403).json({ message: "Forbidden: this order does not belong to you" })
        }

        const eta = await getLiveEtaForOrder(order)
        const remainingEtaSeconds = Number(eta?.remainingSeconds || 0)
        if (remainingEtaSeconds > 0) {
            return res.status(400).json({
                message: "ETA has not completed yet",
                remainingEtaSeconds,
                eta
            })
        }

        if (order.status === "delivered") {
            return res.status(200).json({ message: "Order already delivered", order })
        }

        order.deliveryStatus = "delivered"
        order.shopOrders.forEach((shopOrder) => {
            shopOrder.status = "delivered"
            if (!shopOrder.deliveredAt) {
                shopOrder.deliveredAt = new Date()
            }
        })
        syncOrderLifecycleStatus(order)
        await order.save()

        if (order.deliveryPartner) {
            await setDeliveryPartnerAvailabilityIfIdle(order.deliveryPartner?._id || order.deliveryPartner)
        }

        const io = req.app.get("io")
        emitOrderStatusUpdated(io, order)
        await sendStatusPushNotification({
            order,
            title: "Order delivered",
            body: "Your order has been delivered successfully.",
            data: { status: "delivered" }
        })

        return res.status(200).json({
            message: "Order marked delivered automatically",
            order
        })
    } catch (error) {
        return res.status(500).json({ message: `auto complete order error ${error.message}` })
    }
}

export const sendDeliveryOtp = async (req, res) => {
    try {
        const { orderId, shopOrderId } = req.body
        const order = await Order.findById(orderId).populate("user")
        if (!order) {
            return res.status(400).json({ message: "order not found" })
        }
        const shopOrder = order.shopOrders.id(shopOrderId)
        if (!shopOrder) {
            return res.status(400).json({ message: "shop order not found" })
        }

        const otp = Math.floor(1000 + Math.random() * 9000).toString()
        shopOrder.deliveryOtp = otp
        shopOrder.otpExpires = Date.now() + (5 * 60 * 1000)
        await order.save()
        await sendDeliveryOtpMail(order.user, otp)

        return res.status(200).json({ message: `Otp sent successfully to ${order?.user?.fullName}` })
    } catch (error) {
        return res.status(500).json({ message: `delivery otp error ${error.message}` })
    }
}

export const verifyDeliveryOtp = async (req, res) => {
    try {
        const { orderId, shopOrderId, otp } = req.body
        const order = await Order.findById(orderId).populate("user", "fullName socketId")
        if (!order) {
            return res.status(400).json({ message: "order not found" })
        }
        const shopOrder = order.shopOrders.id(shopOrderId)
        if (!shopOrder) {
            return res.status(400).json({ message: "shop order not found" })
        }
        if (shopOrder.deliveryOtp !== otp || !shopOrder.otpExpires || shopOrder.otpExpires < Date.now()) {
            return res.status(400).json({ message: "Invalid/Expired Otp" })
        }

        shopOrder.status = "delivered"
        shopOrder.deliveredAt = Date.now()

        if (order.shopOrders.every((entry) => entry.status === "delivered")) {
            order.deliveryStatus = "delivered"
        }

        syncOrderLifecycleStatus(order)
        await order.save()
        await DeliveryAssignment.deleteOne({
            shopOrderId: shopOrder._id,
            order: order._id,
            assignedTo: shopOrder.assignedDeliveryBoy
        })

        if (order.deliveryPartner) {
            await setDeliveryPartnerAvailabilityIfIdle(order.deliveryPartner)
        }

        const io = req.app.get("io")
        emitOrderStatusUpdated(io, order)
        await sendStatusPushNotification({
            order,
            title: "Order delivered",
            body: "Your order has been delivered successfully.",
            data: { status: "delivered" }
        })

        return res.status(200).json({ message: "Order delivered successfully!" })
    } catch (error) {
        return res.status(500).json({ message: `verify delivery otp error ${error.message}` })
    }
}

export const getTodayDeliveries = async (req, res) => {
    try {
        const deliveryBoyId = req.userId
        const startsOfDay = new Date()
        startsOfDay.setHours(0, 0, 0, 0)
        const endsOfDay = new Date(startsOfDay)
        endsOfDay.setDate(endsOfDay.getDate() + 1)

        const orders = await Order.find({
            shopOrders: {
                $elemMatch: {
                    assignedDeliveryBoy: deliveryBoyId,
                    status: "delivered",
                    deliveredAt: { $gte: startsOfDay, $lt: endsOfDay }
                }
            }
        }).select("shopOrders.assignedDeliveryBoy shopOrders.status shopOrders.deliveredAt").lean()

        const todaysDeliveries = []
        orders.forEach((order) => {
            order.shopOrders.forEach((shopOrder) => {
                if (
                    String(shopOrder.assignedDeliveryBoy) === String(deliveryBoyId) &&
                    shopOrder.status === "delivered" &&
                    shopOrder.deliveredAt &&
                    new Date(shopOrder.deliveredAt) >= startsOfDay &&
                    new Date(shopOrder.deliveredAt) < endsOfDay
                ) {
                    todaysDeliveries.push(shopOrder)
                }
            })
        })

        const stats = {}
        todaysDeliveries.forEach((shopOrder) => {
            const hour = new Date(shopOrder.deliveredAt).getHours()
            stats[hour] = (stats[hour] || 0) + 1
        })

        const formattedStats = Object.keys(stats).map((hour) => ({
            hour: parseInt(hour, 10),
            count: stats[hour]
        })).sort((a, b) => a.hour - b.hour)

        const totalDeliveries = todaysDeliveries.length
        const totalEarning = totalDeliveries * DELIVERY_CHARGE_PER_ORDER

        return res.status(200).json({
            hourlyStats: formattedStats,
            totalDeliveries,
            ratePerDelivery: DELIVERY_CHARGE_PER_ORDER,
            totalEarning
        })
    } catch (error) {
        return res.status(500).json({ message: `today deliveries error ${error.message}` })
    }
}

export const cancelOrder = async (req, res) => {
    try {
        const { id } = req.params
        const { reason = "" } = req.body

        const order = await Order.findById(id)
            .populate("user", "fullName socketId")
            .populate("shopOrders.owner", "socketId")

        if (!order) {
            return res.status(404).json({ message: "order not found" })
        }
        if (String(order.user?._id || order.user) !== String(req.userId)) {
            return res.status(403).json({ message: "Forbidden" })
        }
        if (!canCancelOrder(order)) {
            return res.status(400).json({ message: "Only pending or preparing orders can be cancelled" })
        }

        order.status = "cancelled"
        order.deliveryStatus = null
        order.cancellation = {
            cancelledAt: new Date(),
            cancelledBy: req.userId,
            reason: String(reason || "").trim()
        }
        order.shopOrders.forEach((shopOrder) => {
            if (shopOrder.status !== "delivered") {
                shopOrder.status = "cancelled"
            }
        })

        await refundOrderIfNeeded(order)
        await order.save()

        if (order.deliveryPartner) {
            await setDeliveryPartnerAvailabilityIfIdle(order.deliveryPartner)
        }
        await DeliveryAssignment.deleteMany({ order: order._id })

        const io = req.app.get("io")
        emitOrderStatusUpdated(io, order)

        return res.status(200).json({
            message: "Order cancelled successfully",
            refund: order.refund,
            order
        })
    } catch (error) {
        return res.status(500).json({ message: `cancel order error ${error.message}` })
    }
}
