import DeliveryAssignment from "../models/deliveryAssignment.model.js"
import Order from "../models/order.model.js"
import Shop from "../models/shop.model.js"
import User from "../models/user.model.js"
import { sendDeliveryOtpMail } from "../utils/mail.js"
import RazorPay from "razorpay"
import { ROLE, expandRoleValues, normalizeRole } from "../utils/roles.js"

const ALLOWED_PAYMENT_METHODS = new Set(["cod", "online"])
const SAMPLE_KEY_IDS = new Set([
    "rzp_test_1DP5mmOlF5G5ag",
    "rzp_test_xxxxxxxxxxxxxx"
])
const SAMPLE_SECRETS = new Set([
    "qwertyui",
    "your_razorpay_secret"
])
const ACTIVE_DELIVERY_STATUSES = new Set(["assigned", "picked_up", "on_the_way"])
const FIXED_DELIVERY_DURATION_SECONDS = 30 * 60

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

const assignFirstAvailableDeliveryPartner = async () => {
    const deliveryPartner = await User.findOneAndUpdate(
        {
            role: { $in: expandRoleValues(ROLE.DELIVERY) },
            isAvailable: true,
            isSuspended: false
        },
        { $set: { isAvailable: false } },
        { new: true, sort: { createdAt: 1 } }
    )

    if (!deliveryPartner) {
        return {}
    }

    return {
        deliveryPartner: deliveryPartner._id,
        deliveryStatus: "assigned"
    }
}

const attachDeliveryPartnerToOrder = async (order) => {
    if (!order) return order
    if (order.deliveryPartner) return order

    const deliveryAssignmentData = await assignFirstAvailableDeliveryPartner()
    if (!deliveryAssignmentData.deliveryPartner) {
        return order
    }

    order.deliveryPartner = deliveryAssignmentData.deliveryPartner
    order.deliveryStatus = deliveryAssignmentData.deliveryStatus
    order.shopOrders.forEach((shopOrder) => {
        if (!shopOrder.assignedDeliveryBoy) {
            shopOrder.assignedDeliveryBoy = deliveryAssignmentData.deliveryPartner
        }
    })

    try {
        await order.save()
    } catch (error) {
        await User.findByIdAndUpdate(deliveryAssignmentData.deliveryPartner, { isAvailable: true })
        throw error
    }

    return order
}

const getOrderProgressStatus = (order = {}) => {
    if (order?.deliveryStatus === "delivered") return "delivered"
    if ((order?.shopOrders || []).every((shopOrder) => shopOrder?.status === "delivered")) return "delivered"
    if (order?.deliveryStatus) return order.deliveryStatus
    if ((order?.shopOrders || []).some((shopOrder) => String(shopOrder?.status || "").toLowerCase() === "out of delivery")) return "out of delivery"
    if ((order?.shopOrders || []).some((shopOrder) => String(shopOrder?.status || "").toLowerCase() === "preparing")) return "preparing"
    if (order?.deliveryPartner) return "out of delivery"
    return "placed"
}

const getRemainingEtaSeconds = (order = {}, now = new Date()) => {
    if (getOrderProgressStatus(order) === "delivered") return 0

    const createdAtMs = new Date(order?.createdAt).getTime()
    if (!Number.isFinite(createdAtMs)) return FIXED_DELIVERY_DURATION_SECONDS

    const elapsedSeconds = Math.max(0, Math.floor((now.getTime() - createdAtMs) / 1000))
    return Math.max(0, FIXED_DELIVERY_DURATION_SECONDS - elapsedSeconds)
}

const emitOrderStatusUpdated = (io, order) => {
    if (!io || !order) return

    const payload = {
        orderId: order._id,
        deliveryStatus: order.deliveryStatus,
        updatedAt: new Date().toISOString()
    }

    if (order.user?.socketId) {
        io.to(order.user.socketId).emit("orderStatusUpdated", payload)
    }

    const ownerSocketIds = new Set(
        (order.shopOrders || [])
            .map((shopOrder) => shopOrder?.owner?.socketId)
            .filter(Boolean)
    )

    ownerSocketIds.forEach((socketId) => {
        io.to(socketId).emit("orderStatusUpdated", payload)
    })
}

const setDeliveryPartnerAvailabilityIfIdle = async (deliveryPartnerId) => {
    if (!deliveryPartnerId) return

    const activeOrderCount = await Order.countDocuments({
        deliveryPartner: deliveryPartnerId,
        deliveryStatus: { $in: [...ACTIVE_DELIVERY_STATUSES] }
    })

    if (activeOrderCount === 0) {
        await User.findByIdAndUpdate(deliveryPartnerId, { isAvailable: true })
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
        return res.status(500).json({ message: `payment config error ${error}` })
    }
}

export const placeOrder = async (req, res) => {
    try {
        const { cartItems, paymentMethod, deliveryAddress, totalAmount } = req.body
        if (!Array.isArray(cartItems) || cartItems.length === 0) {
            return res.status(400).json({ message: "cart is empty" })
        }
        if (!ALLOWED_PAYMENT_METHODS.has(paymentMethod)) {
            return res.status(400).json({ message: "invalid payment method" })
        }
        if (!Number.isFinite(Number(totalAmount)) || Number(totalAmount) <= 0) {
            return res.status(400).json({ message: "invalid total amount" })
        }
        if (!deliveryAddress.text || !deliveryAddress.latitude || !deliveryAddress.longitude) {
            return res.status(400).json({ message: "send complete deliveryAddress" })
        }

        const groupItemsByShop = {}

        cartItems.forEach(item => {
            const shopId = item?.shop?._id || item?.shop
            if (!shopId) {
                throw new Error("Invalid cart item: missing shop id")
            }
            if (!groupItemsByShop[shopId]) {
                groupItemsByShop[shopId] = []
            }
            groupItemsByShop[shopId].push(item)
        });

        const shopOrders = await Promise.all(Object.keys(groupItemsByShop).map(async (shopId) => {
            const shop = await Shop.findById(shopId).populate("owner")
            if (!shop) {
                throw new Error(`shop not found: ${shopId}`)
            }
            const items = groupItemsByShop[shopId]
            const subtotal = items.reduce((sum, i) => sum + Number(i.price) * Number(i.quantity), 0)
            return {
                shop: shop._id,
                owner: shop.owner._id,
                subtotal,
                shopOrderItems: items.map((i) => ({
                    item: i.id,
                    price: i.price,
                    quantity: i.quantity,
                    name: i.name
                }))
            }
        }
        ))
        if (paymentMethod == "online") {
            const { client, error, keyId } = getRazorpayClient()
            if (error) {
                return res.status(503).json({ message: error })
            }

            let razorOrder
            try {
                razorOrder = await client.orders.create({
                    amount: Math.round(Number(totalAmount) * 100),
                    currency: 'INR',
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
                user: req.userId,
                paymentMethod,
                deliveryAddress,
                totalAmount,
                shopOrders,
                razorpayOrderId: razorOrder.id,
                payment: false
            })

            return res.status(200).json({
                razorOrder,
                orderId: newOrder._id,
                razorpayKeyId: keyId
            })

        }

        const newOrder = await Order.create({
            user: req.userId,
            paymentMethod,
            deliveryAddress,
            totalAmount,
            shopOrders
        })
        await attachDeliveryPartnerToOrder(newOrder)

        await newOrder.populate("shopOrders.shopOrderItems.item", "name image price")
        await newOrder.populate("shopOrders.shop", "name")
        await newOrder.populate("shopOrders.owner", "name socketId")
        await newOrder.populate("user", "name email mobile")

        const io = req.app.get('io')

        if (io) {
            newOrder.shopOrders.forEach(shopOrder => {
                const ownerSocketId = shopOrder.owner.socketId
                if (ownerSocketId) {
                    io.to(ownerSocketId).emit('newOrder', {
                        _id: newOrder._id,
                        paymentMethod: newOrder.paymentMethod,
                        user: newOrder.user,
                        shopOrders: shopOrder,
                        createdAt: newOrder.createdAt,
                        deliveryAddress: newOrder.deliveryAddress,
                        payment: newOrder.payment
                    })
                }
            });
        }



        return res.status(201).json(newOrder)
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
        if (!payment || payment.status != "captured") {
            return res.status(400).json({ message: "payment not captured" })
        }
        if (order.razorpayOrderId && payment.order_id !== order.razorpayOrderId) {
            return res.status(400).json({ message: "payment does not belong to this order" })
        }

        order.payment = true
        order.razorpayPaymentId = razorpay_payment_id
        await order.save()
        await attachDeliveryPartnerToOrder(order)

        await order.populate("shopOrders.shopOrderItems.item", "name image price")
        await order.populate("shopOrders.shop", "name")
        await order.populate("shopOrders.owner", "name socketId")
        await order.populate("user", "name email mobile")

        const io = req.app.get('io')

        if (io) {
            order.shopOrders.forEach(shopOrder => {
                const ownerSocketId = shopOrder.owner.socketId
                if (ownerSocketId) {
                    io.to(ownerSocketId).emit('newOrder', {
                        _id: order._id,
                        paymentMethod: order.paymentMethod,
                        user: order.user,
                        shopOrders: shopOrder,
                        createdAt: order.createdAt,
                        deliveryAddress: order.deliveryAddress,
                        payment: order.payment
                    })
                }
            });
        }


        return res.status(200).json(order)

    } catch (error) {
        return res.status(500).json({ message: error?.error?.description || error?.message || "verify payment failed" })
    }
}



export const getMyOrders = async (req, res) => {
    try {
        const user = await User.findById(req.userId)
        const normalizedRole = normalizeRole(user?.role)

        if (normalizedRole === ROLE.USER) {
            const orders = await Order.find({ user: req.userId })
                .sort({ createdAt: -1 })
                .populate("shopOrders.shop", "name")
                .populate("shopOrders.owner", "name email mobile")
                .populate("shopOrders.shopOrderItems.item", "name image price")
                .populate("deliveryPartner", "fullName mobile vehicleNumber")

            return res.status(200).json(orders)
        } else if (normalizedRole === ROLE.RESTAURANT) {
            const orders = await Order.find({ "shopOrders.owner": req.userId })
                .sort({ createdAt: -1 })
                .populate("shopOrders.shop", "name")
                .populate("user")
                .populate("shopOrders.shopOrderItems.item", "name image price")
                .populate("shopOrders.assignedDeliveryBoy", "fullName mobile")
                .populate("deliveryPartner", "fullName mobile vehicleNumber")



            const filteredOrders = orders.map((order => ({
                _id: order._id,
                paymentMethod: order.paymentMethod,
                user: order.user,
                shopOrders: order.shopOrders.find(o => o.owner._id == req.userId),
                createdAt: order.createdAt,
                deliveryAddress: order.deliveryAddress,
                payment: order.payment
            })))


            return res.status(200).json(filteredOrders)
        }

        return res.status(403).json({ message: "Forbidden" })

    } catch (error) {
        return res.status(500).json({ message: `get User order error ${error}` })
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

        const shopOrder = order.shopOrders.find(o => o.shop == shopId)
        if (!shopOrder) {
            return res.status(400).json({ message: "shop order not found" })
        }
        shopOrder.status = status
        let deliveryBoysPayload = []
        if (status == "out of delivery" && !shopOrder.assignment) {
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

            const nearByIds = nearByDeliveryBoys.map(b => b._id)
            const busyIds = await DeliveryAssignment.find({
                assignedTo: { $in: nearByIds },
                status: { $nin: ["brodcasted", "completed"] }

            }).distinct("assignedTo")

            const busyIdSet = new Set(busyIds.map(id => String(id)))

            const availableBoys = nearByDeliveryBoys.filter(b => !busyIdSet.has(String(b._id)))
            const candidates = availableBoys.map(b => b._id)

            if (candidates.length == 0) {
                await order.save()
                return res.json({
                    message: "order status updated but there is no available delivery boys"
                })
            }

            const deliveryAssignment = await DeliveryAssignment.create({
                order: order?._id,
                shop: shopOrder.shop,
                shopOrderId: shopOrder?._id,
                brodcastedTo: candidates,
                status: "brodcasted"
            })

            shopOrder.assignedDeliveryBoy = deliveryAssignment.assignedTo
            shopOrder.assignment = deliveryAssignment._id
            deliveryBoysPayload = availableBoys.map(b => ({
                id: b._id,
                fullName: b.fullName,
                longitude: b.location.coordinates?.[0],
                latitude: b.location.coordinates?.[1],
                mobile: b.mobile
            }))

            await deliveryAssignment.populate('order')
            await deliveryAssignment.populate('shop')
            const io = req.app.get('io')
            if (io) {
                availableBoys.forEach(boy => {
                    const boySocketId = boy.socketId
                    if (boySocketId) {
                        io.to(boySocketId).emit('newAssignment', {
                            sentTo:boy._id,
                            assignmentId: deliveryAssignment._id,
                            orderId: deliveryAssignment.order._id,
                            shopName: deliveryAssignment.shop.name,
                            deliveryAddress: deliveryAssignment.order.deliveryAddress,
                            items: deliveryAssignment.order.shopOrders.find(so => so._id.equals(deliveryAssignment.shopOrderId)).shopOrderItems || [],
                            subtotal: deliveryAssignment.order.shopOrders.find(so => so._id.equals(deliveryAssignment.shopOrderId))?.subtotal
                        })
                    }
                });
            }





        }


        await order.save()
        const updatedShopOrder = order.shopOrders.find(o => o.shop == shopId)
        await order.populate("shopOrders.shop", "name")
        await order.populate("shopOrders.assignedDeliveryBoy", "fullName email mobile")
        await order.populate("user", "socketId")

        const io = req.app.get('io')
        if (io) {
            const userSocketId = order.user.socketId
            if (userSocketId) {
                io.to(userSocketId).emit('update-status', {
                    orderId: order._id,
                    shopId: updatedShopOrder.shop._id,
                    status: updatedShopOrder.status,
                    userId: order.user._id
                })
            }
        }



        return res.status(200).json({
            shopOrder: updatedShopOrder,
            assignedDeliveryBoy: updatedShopOrder?.assignedDeliveryBoy,
            availableBoys: deliveryBoysPayload,
            assignment: updatedShopOrder?.assignment?._id

        })



    } catch (error) {
        return res.status(500).json({ message: `order status error ${error}` })
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

        const formated = assignments.map(a => ({
            assignmentId: a._id,
            orderId: a.order._id,
            shopName: a.shop.name,
            deliveryAddress: a.order.deliveryAddress,
            items: a.order.shopOrders.find(so => so._id.equals(a.shopOrderId)).shopOrderItems || [],
            subtotal: a.order.shopOrders.find(so => so._id.equals(a.shopOrderId))?.subtotal
        }))

        return res.status(200).json(formated)
    } catch (error) {
        return res.status(500).json({ message: `get Assignment error ${error}` })
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
        assignment.status = 'assigned'
        assignment.acceptedAt = new Date()
        await assignment.save()

        const order = await Order.findById(assignment.order)
        if (!order) {
            return res.status(400).json({ message: "order not found" })
        }

        let shopOrder = order.shopOrders.id(assignment.shopOrderId)
        shopOrder.assignedDeliveryBoy = req.userId
        await order.save()


        return res.status(200).json({
            message: 'order accepted'
        })
    } catch (error) {
        return res.status(500).json({ message: `accept order error ${error}` })
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
                populate: [{ path: "user", select: "fullName email location mobile" }]

            })

        if (!assignment) {
            return res.status(400).json({ message: "assignment not found" })
        }
        if (!assignment.order) {
            return res.status(400).json({ message: "order not found" })
        }

        const shopOrder = assignment.order.shopOrders.find(so => String(so._id) == String(assignment.shopOrderId))

        if (!shopOrder) {
            return res.status(400).json({ message: "shopOrder not found" })
        }

        let deliveryBoyLocation = { lat: null, lon: null }
        if (assignment.assignedTo.location.coordinates.length == 2) {
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
        return res.status(500).json({ message: `get current order error ${error}` })
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
        order.liveEta = {
            provider: "fixed_30m",
            source: "fixed",
            remainingSeconds: getRemainingEtaSeconds(order),
            trafficLevel: "n/a",
            fetchedAt: new Date().toISOString(),
            progressStatus
        }

        return res.status(200).json(order)
    } catch (error) {
        return res.status(500).json({ message: `get by id order error ${error}` })
    }
}

export const autoCompleteOrderByEta = async (req, res) => {
    try {
        const { orderId } = req.params
        const order = await Order.findById(orderId)
            .populate("user", "socketId")
            .populate("deliveryPartner", "location")
            .populate("shopOrders.owner", "socketId")

        if (!order) {
            return res.status(404).json({ message: "order not found" })
        }
        if (String(order.user?._id || order.user) !== String(req.userId)) {
            return res.status(403).json({ message: "Forbidden: this order does not belong to you" })
        }

        const remainingEtaSeconds = getRemainingEtaSeconds(order)
        if (remainingEtaSeconds > 0) {
            return res.status(400).json({
                message: "ETA has not completed yet",
                remainingEtaSeconds,
                eta: {
                    provider: "fixed_30m",
                    source: "fixed",
                    remainingSeconds: remainingEtaSeconds
                }
            })
        }

        if (order.deliveryStatus === "delivered" && (order.shopOrders || []).every((shopOrder) => shopOrder.status === "delivered")) {
            return res.status(200).json({ message: "Order already delivered", order })
        }

        order.deliveryStatus = "delivered"
        order.shopOrders.forEach((shopOrder) => {
            shopOrder.status = "delivered"
            if (!shopOrder.deliveredAt) {
                shopOrder.deliveredAt = new Date()
            }
        })
        await order.save()
        if (order.deliveryPartner) {
            await setDeliveryPartnerAvailabilityIfIdle(order.deliveryPartner?._id || order.deliveryPartner)
        }

        const io = req.app.get("io")
        emitOrderStatusUpdated(io, order)

        return res.status(200).json({
            message: "Order marked delivered automatically",
            order
        })
    } catch (error) {
        return res.status(500).json({ message: `auto complete order error ${error}` })
    }
}

export const sendDeliveryOtp = async (req, res) => {
    try {
        const { orderId, shopOrderId } = req.body
        const order = await Order.findById(orderId).populate("user")
        const shopOrder = order.shopOrders.id(shopOrderId)
        if (!order || !shopOrder) {
            return res.status(400).json({ message: "enter valid order/shopOrderid" })
        }
        const otp = Math.floor(1000 + Math.random() * 9000).toString()
        shopOrder.deliveryOtp = otp
        shopOrder.otpExpires = Date.now() + 5 * 60 * 1000
        await order.save()
        await sendDeliveryOtpMail(order.user, otp)
        return res.status(200).json({ message: `Otp sent Successfuly to ${order?.user?.fullName}` })
    } catch (error) {
        return res.status(500).json({ message: `delivery otp error ${error}` })
    }
}

export const verifyDeliveryOtp = async (req, res) => {
    try {
        const { orderId, shopOrderId, otp } = req.body
        const order = await Order.findById(orderId).populate("user")
        const shopOrder = order.shopOrders.id(shopOrderId)
        if (!order || !shopOrder) {
            return res.status(400).json({ message: "enter valid order/shopOrderid" })
        }
        if (shopOrder.deliveryOtp !== otp || !shopOrder.otpExpires || shopOrder.otpExpires < Date.now()) {
            return res.status(400).json({ message: "Invalid/Expired Otp" })
        }

        shopOrder.status = "delivered"
        shopOrder.deliveredAt = Date.now()
        await order.save()
        await DeliveryAssignment.deleteOne({
            shopOrderId: shopOrder._id,
            order: order._id,
            assignedTo: shopOrder.assignedDeliveryBoy
        })

        return res.status(200).json({ message: "Order Delivered Successfully!" })

    } catch (error) {
        return res.status(500).json({ message: `verify delivery otp error ${error}` })
    }
}

export const getTodayDeliveries=async (req,res) => {
    try {
        const deliveryBoyId=req.userId
        const startsOfDay=new Date()
        startsOfDay.setHours(0,0,0,0)

        const orders=await Order.find({
           "shopOrders.assignedDeliveryBoy":deliveryBoyId,
           "shopOrders.status":"delivered",
           "shopOrders.deliveredAt":{$gte:startsOfDay}
        }).lean()

     let todaysDeliveries=[] 
     
     orders.forEach(order=>{
        order.shopOrders.forEach(shopOrder=>{
            if(shopOrder.assignedDeliveryBoy==deliveryBoyId &&
                shopOrder.status=="delivered" &&
                shopOrder.deliveredAt &&
                shopOrder.deliveredAt>=startsOfDay
            ){
                todaysDeliveries.push(shopOrder)
            }
        })
     })

let stats={}

todaysDeliveries.forEach(shopOrder=>{
    const hour=new Date(shopOrder.deliveredAt).getHours()
    stats[hour]=(stats[hour] || 0) + 1
})

let formattedStats=Object.keys(stats).map(hour=>({
 hour:parseInt(hour),
 count:stats[hour]   
}))

formattedStats.sort((a,b)=>a.hour-b.hour)

return res.status(200).json(formattedStats)
  

    } catch (error) {
        return res.status(500).json({ message: `today deliveries error ${error}` }) 
    }
}



