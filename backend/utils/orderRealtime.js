import Order from "../models/order.model.js"
import User from "../models/user.model.js"
import { SOCKET_EVENTS } from "./socketEvents.js"
import { resolveOrderEta } from "./trafficEta.js"

const ACTIVE_DELIVERY_STATUSES = new Set(["assigned", "picked_up", "on_the_way"])

export const getOrderProgressStatus = (order = {}) => {
    if (order?.status === "cancelled") return "cancelled"
    if (order?.deliveryStatus === "delivered") return "delivered"
    if ((order?.shopOrders || []).length > 0 && (order?.shopOrders || []).every((shopOrder) => shopOrder?.status === "delivered")) return "delivered"
    if (order?.deliveryStatus) return order.deliveryStatus
    if ((order?.shopOrders || []).some((shopOrder) => String(shopOrder?.status || "").toLowerCase() === "out of delivery")) return "out of delivery"
    if ((order?.shopOrders || []).some((shopOrder) => String(shopOrder?.status || "").toLowerCase() === "preparing")) return "preparing"
    if ((order?.shopOrders || []).some((shopOrder) => String(shopOrder?.status || "").toLowerCase() === "pending")) return "pending"
    if (order?.status === "scheduled") return "scheduled"
    if (order?.deliveryPartner) return "out of delivery"
    return "placed"
}

export const getProgressStatusIndex = (status = "") => {
    const normalizedStatus = String(status || "").trim().toLowerCase()
    if (normalizedStatus === "delivered") return 3
    if (["out of delivery", "picked_up", "picked-up", "on_the_way", "on-the-way", "assigned"].includes(normalizedStatus)) return 2
    if (normalizedStatus === "preparing") return 1
    return 0
}

export const syncOrderLifecycleStatus = (order) => {
    if (!order) return order

    if (order?.cancellation?.cancelledAt) {
        order.status = "cancelled"
        return order
    }

    if (order?.scheduledFor && !order?.activatedAt && order.status === "scheduled") {
        return order
    }

    if ((order?.shopOrders || []).length > 0 && (order.shopOrders || []).every((shopOrder) => shopOrder?.status === "delivered")) {
        order.status = "delivered"
        return order
    }

    if ((order?.shopOrders || []).some((shopOrder) => shopOrder?.status === "out of delivery")) {
        order.status = "out of delivery"
        return order
    }

    if ((order?.shopOrders || []).some((shopOrder) => shopOrder?.status === "preparing")) {
        order.status = "preparing"
        return order
    }

    order.status = "pending"
    return order
}

export const emitOrderStatusUpdated = (io, order) => {
    if (!io || !order) return

    const payload = {
        orderId: order._id,
        deliveryStatus: order.deliveryStatus,
        status: order.status,
        updatedAt: new Date().toISOString()
    }

    if (order.user?.socketId) {
        io.to(order.user.socketId).emit(SOCKET_EVENTS.ORDER_STATUS_UPDATED, payload)
    }

    const ownerSocketIds = new Set(
        (order.shopOrders || [])
            .map((shopOrder) => shopOrder?.owner?.socketId)
            .filter(Boolean)
    )

    ownerSocketIds.forEach((socketId) => {
        io.to(socketId).emit(SOCKET_EVENTS.ORDER_STATUS_UPDATED, payload)
    })
}

export const setDeliveryPartnerAvailabilityIfIdle = async (deliveryPartnerId) => {
    if (!deliveryPartnerId) return

    const activeOrderCount = await Order.countDocuments({
        deliveryPartner: deliveryPartnerId,
        deliveryStatus: { $in: [...ACTIVE_DELIVERY_STATUSES] },
        status: { $ne: "cancelled" }
    })

    if (activeOrderCount === 0) {
        await User.findByIdAndUpdate(deliveryPartnerId, { isAvailable: true })
    }
}

const getLiveEtaSourceCoords = (order = {}) => {
    const deliveryPartnerCoordinates = order?.deliveryPartner?.location?.coordinates
    if (Array.isArray(deliveryPartnerCoordinates) && deliveryPartnerCoordinates.length === 2) {
        return {
            lat: deliveryPartnerCoordinates[1],
            lon: deliveryPartnerCoordinates[0]
        }
    }

    const assignedShopOrder = (order?.shopOrders || []).find((shopOrder) => {
        const coordinates = shopOrder?.assignedDeliveryBoy?.location?.coordinates
        return Array.isArray(coordinates) && coordinates.length === 2 && shopOrder?.status !== "delivered"
    })

    if (assignedShopOrder?.assignedDeliveryBoy?.location?.coordinates?.length === 2) {
        const coordinates = assignedShopOrder.assignedDeliveryBoy.location.coordinates
        return {
            lat: coordinates[1],
            lon: coordinates[0]
        }
    }

    return null
}

const getOrderDestinationCoords = (order = {}) => {
    const latitude = Number(order?.deliveryAddress?.latitude)
    const longitude = Number(order?.deliveryAddress?.longitude)

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return null
    }

    return {
        lat: latitude,
        lon: longitude
    }
}

export const getLiveEtaForOrder = async (order = {}, now = new Date()) => {
    return resolveOrderEta({
        order,
        statusIndex: getProgressStatusIndex(getOrderProgressStatus(order)),
        now,
        fromCoords: getLiveEtaSourceCoords(order),
        destinationCoords: getOrderDestinationCoords(order),
        providerOverride: "osrm"
    })
}

export const emitEtaForOrder = async (io, order) => {
    if (!io || !order?.user?.socketId) return null

    const eta = await getLiveEtaForOrder(order)
    io.to(order.user.socketId).emit(SOCKET_EVENTS.ETA_UPDATE, {
        orderId: order._id,
        etaSeconds: Number(eta?.remainingSeconds || 0)
    })
    return eta
}

export const broadcastEtaForActiveOrders = async (io) => {
    if (!io) return

    const activeOrders = await Order.find({
        status: { $nin: ["cancelled", "scheduled", "delivered"] },
        $or: [
            {
                deliveryPartner: { $ne: null },
                deliveryStatus: { $in: [...ACTIVE_DELIVERY_STATUSES] }
            },
            {
                "shopOrders.assignedDeliveryBoy": { $ne: null }
            }
        ]
    })
        .select("_id user createdAt deliveryAddress deliveryStatus status shopOrders.status shopOrders.assignedDeliveryBoy")
        .populate("user", "socketId")
        .populate("deliveryPartner", "location")
        .populate("shopOrders.assignedDeliveryBoy", "location")

    for (const order of activeOrders) {
        try {
            await emitEtaForOrder(io, order)
        } catch (error) {
            console.error("ETA broadcast error:", error.message)
        }
    }
}
