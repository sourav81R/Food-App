import DeliveryAssignment from "../models/deliveryAssignment.model.js"
import Favorite from "../models/favorite.model.js"
import Item from "../models/item.model.js"
import Order from "../models/order.model.js"
import Shop from "../models/shop.model.js"
import User from "../models/user.model.js"

const SAFE_USER_SELECT = "-password -resetOtp -otpExpires -__v"
const MANAGEABLE_ROLES = new Set(["user", "owner", "deliveryBoy", "admin"])

const formatRoleCounts = (rows = []) => {
    const base = { user: 0, owner: 0, deliveryBoy: 0, admin: 0 }
    rows.forEach((row) => {
        if (row?._id && Object.prototype.hasOwnProperty.call(base, row._id)) {
            base[row._id] = row.count
        }
    })
    return base
}

export const getAdminOverview = async (req, res) => {
    try {
        const [
            totalUsers,
            totalShops,
            totalItems,
            totalOrders,
            activeOrders,
            deliveredOrders,
            paidOrders,
            revenueRows,
            roleRows,
            latestOrders
        ] = await Promise.all([
            User.countDocuments(),
            Shop.countDocuments(),
            Item.countDocuments(),
            Order.countDocuments(),
            Order.countDocuments({ "shopOrders.status": { $in: ["pending", "preparing", "out of delivery"] } }),
            Order.countDocuments({ "shopOrders.status": "delivered" }),
            Order.countDocuments({ payment: true }),
            Order.aggregate([
                { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" } } }
            ]),
            User.aggregate([
                { $group: { _id: "$role", count: { $sum: 1 } } }
            ]),
            Order.find()
                .sort({ createdAt: -1 })
                .limit(8)
                .select("_id totalAmount payment paymentMethod createdAt user shopOrders")
                .populate("user", "fullName email role")
                .populate("shopOrders.shop", "name city")
                .lean()
        ])

        return res.status(200).json({
            cards: {
                totalUsers,
                totalShops,
                totalItems,
                totalOrders,
                activeOrders,
                deliveredOrders,
                paidOrders,
                totalRevenue: revenueRows?.[0]?.totalRevenue || 0
            },
            roleCounts: formatRoleCounts(roleRows),
            latestOrders
        })
    } catch (error) {
        return res.status(500).json({ message: `admin overview error ${error}` })
    }
}

export const getAllUsersForAdmin = async (req, res) => {
    try {
        const users = await User.find()
            .select(SAFE_USER_SELECT)
            .sort({ createdAt: -1 })
            .lean()

        return res.status(200).json(users)
    } catch (error) {
        return res.status(500).json({ message: `get all users error ${error}` })
    }
}

export const updateUserRoleByAdmin = async (req, res) => {
    try {
        const { userId } = req.params
        const { role } = req.body

        if (!MANAGEABLE_ROLES.has(role)) {
            return res.status(400).json({ message: "Invalid role" })
        }
        if (String(req.userId) === String(userId) && role !== "admin") {
            return res.status(400).json({ message: "Admin cannot remove own admin access" })
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { role },
            { new: true }
        ).select(SAFE_USER_SELECT)

        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }

        return res.status(200).json({ message: "User role updated", user })
    } catch (error) {
        return res.status(500).json({ message: `update user role error ${error}` })
    }
}

export const deleteUserByAdmin = async (req, res) => {
    try {
        const { userId } = req.params
        if (String(req.userId) === String(userId)) {
            return res.status(400).json({ message: "Admin cannot delete own account" })
        }

        const user = await User.findById(userId).select("role")
        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }

        if (user.role === "owner") {
            const shops = await Shop.find({ owner: userId }).select("_id")
            const shopIds = shops.map((shop) => shop._id)
            const items = await Item.find({ shop: { $in: shopIds } }).select("_id")
            const itemIds = items.map((item) => item._id)

            if (itemIds.length > 0) {
                await Favorite.deleteMany({ item: { $in: itemIds } })
                await Item.deleteMany({ _id: { $in: itemIds } })
            }
            if (shopIds.length > 0) {
                await Shop.deleteMany({ _id: { $in: shopIds } })
            }
        }

        if (user.role === "deliveryBoy") {
            await DeliveryAssignment.deleteMany({
                $or: [{ assignedTo: userId }, { brodcastedTo: userId }]
            })
        }

        await User.findByIdAndDelete(userId)
        return res.status(200).json({ message: "User deleted successfully" })
    } catch (error) {
        return res.status(500).json({ message: `delete user error ${error}` })
    }
}

export const getAllShopsForAdmin = async (req, res) => {
    try {
        const shops = await Shop.find()
            .sort({ createdAt: -1 })
            .populate("owner", "fullName email role mobile")
            .lean()

        const formatted = shops.map((shop) => ({
            ...shop,
            itemCount: Array.isArray(shop.items) ? shop.items.length : 0
        }))

        return res.status(200).json(formatted)
    } catch (error) {
        return res.status(500).json({ message: `get all shops error ${error}` })
    }
}

export const deleteShopByAdmin = async (req, res) => {
    try {
        const { shopId } = req.params
        const shop = await Shop.findById(shopId)
        if (!shop) {
            return res.status(404).json({ message: "Shop not found" })
        }

        const items = await Item.find({ shop: shopId }).select("_id")
        const itemIds = items.map((item) => item._id)
        if (itemIds.length > 0) {
            await Favorite.deleteMany({ item: { $in: itemIds } })
            await Item.deleteMany({ _id: { $in: itemIds } })
        }

        await Shop.findByIdAndDelete(shopId)
        return res.status(200).json({ message: "Shop deleted successfully" })
    } catch (error) {
        return res.status(500).json({ message: `delete shop error ${error}` })
    }
}

export const getAllItemsForAdmin = async (req, res) => {
    try {
        const items = await Item.find()
            .sort({ createdAt: -1 })
            .populate({
                path: "shop",
                select: "name city state owner",
                populate: {
                    path: "owner",
                    select: "fullName email"
                }
            })
            .lean()

        return res.status(200).json(items)
    } catch (error) {
        return res.status(500).json({ message: `get all items error ${error}` })
    }
}

export const deleteItemByAdmin = async (req, res) => {
    try {
        const { itemId } = req.params
        const item = await Item.findByIdAndDelete(itemId)
        if (!item) {
            return res.status(404).json({ message: "Item not found" })
        }

        await Favorite.deleteMany({ item: itemId })
        await Shop.updateOne({ _id: item.shop }, { $pull: { items: item._id } })
        return res.status(200).json({ message: "Item deleted successfully" })
    } catch (error) {
        return res.status(500).json({ message: `delete item error ${error}` })
    }
}

export const getAllOrdersForAdmin = async (req, res) => {
    try {
        const orders = await Order.find()
            .sort({ createdAt: -1 })
            .limit(200)
            .populate("user", "fullName email mobile role")
            .populate("shopOrders.shop", "name city")
            .populate("shopOrders.owner", "fullName email")
            .populate("shopOrders.assignedDeliveryBoy", "fullName mobile")
            .lean()

        return res.status(200).json(orders)
    } catch (error) {
        return res.status(500).json({ message: `get all orders error ${error}` })
    }
}

export const deleteOrderByAdmin = async (req, res) => {
    try {
        const { orderId } = req.params
        const deleted = await Order.findByIdAndDelete(orderId)
        if (!deleted) {
            return res.status(404).json({ message: "Order not found" })
        }

        await DeliveryAssignment.deleteMany({ order: orderId })
        return res.status(200).json({ message: "Order deleted successfully" })
    } catch (error) {
        return res.status(500).json({ message: `delete order error ${error}` })
    }
}
