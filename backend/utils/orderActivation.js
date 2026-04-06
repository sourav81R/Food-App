import Order from "../models/order.model.js"
import User from "../models/user.model.js"
import { SOCKET_EVENTS } from "./socketEvents.js"
import { ROLE, expandRoleValues } from "./roles.js"
import { syncOrderLifecycleStatus } from "./orderRealtime.js"

const ACTIVE_DELIVERY_STATUSES = new Set(["assigned", "picked_up", "on_the_way"])

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

export const attachDeliveryPartnerToOrder = async (order) => {
    if (!order) return order
    if (order.deliveryPartner) return order
    if (order.status === "cancelled" || order.status === "scheduled") return order

    const deliveryAssignmentData = await assignFirstAvailableDeliveryPartner()
    if (!deliveryAssignmentData.deliveryPartner) {
        return order
    }

    order.deliveryPartner = deliveryAssignmentData.deliveryPartner
    order.deliveryStatus = deliveryAssignmentData.deliveryStatus
    order.shopOrders.forEach((shopOrder) => {
        if (!shopOrder.assignedDeliveryBoy && shopOrder.status !== "cancelled") {
            shopOrder.assignedDeliveryBoy = deliveryAssignmentData.deliveryPartner
        }
    })
    syncOrderLifecycleStatus(order)

    try {
        await order.save()
    } catch (error) {
        await User.findByIdAndUpdate(deliveryAssignmentData.deliveryPartner, { isAvailable: true })
        throw error
    }

    return order
}

const populateOrderForDispatch = async (order) => {
    await order.populate("shopOrders.shopOrderItems.item", "name image price foodType")
    await order.populate("shopOrders.shop", "name")
    await order.populate("shopOrders.owner", "name socketId")
    await order.populate("user", "name email mobile")
    return order
}

export const emitNewOrderToOwners = (io, order) => {
    if (!io || !order) return

    order.shopOrders.forEach((shopOrder) => {
        const ownerSocketId = shopOrder?.owner?.socketId
        if (!ownerSocketId) return

        io.to(ownerSocketId).emit(SOCKET_EVENTS.NEW_ORDER, {
            _id: order._id,
            paymentMethod: order.paymentMethod,
            user: order.user,
            shopOrders: shopOrder,
            createdAt: order.createdAt,
            deliveryAddress: order.deliveryAddress,
            payment: order.payment,
            scheduledFor: order.scheduledFor,
            status: order.status
        })
    })
}

export const activateOrder = async ({ order, io }) => {
    const orderDoc = typeof order === "string" ? await Order.findById(order) : order
    if (!orderDoc) return null
    if (orderDoc.status === "cancelled") return orderDoc

    if (!orderDoc.activatedAt) {
        orderDoc.activatedAt = new Date()
    }

    if (orderDoc.status === "scheduled") {
        orderDoc.shopOrders.forEach((shopOrder) => {
            if (shopOrder.status !== "cancelled") {
                shopOrder.status = "pending"
            }
        })
        orderDoc.deliveryStatus = null
        orderDoc.status = "pending"
        await orderDoc.save()
    } else {
        syncOrderLifecycleStatus(orderDoc)
        await orderDoc.save()
    }

    await attachDeliveryPartnerToOrder(orderDoc)
    await populateOrderForDispatch(orderDoc)
    emitNewOrderToOwners(io, orderDoc)
    return orderDoc
}

export const hasActiveDeliveryForPartner = async (deliveryPartnerId) => {
    return Order.exists({
        deliveryPartner: deliveryPartnerId,
        deliveryStatus: { $in: [...ACTIVE_DELIVERY_STATUSES] },
        status: { $ne: "cancelled" }
    })
}
