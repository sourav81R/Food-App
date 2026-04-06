import Item from "../models/item.model.js"
import Order from "../models/order.model.js"
import User from "../models/user.model.js"
import { getGeminiRecommendations } from "../utils/geminiRecommendations.js"

const sanitizeUserProjection = "-password -resetOtp -otpExpires"

export const getCurrentUser = async (req, res) => {
    try {
        const userId = req.userId
        if (!userId) {
            return res.status(400).json({ message: "userId is not found" })
        }
        const user = await User.findById(userId).select(sanitizeUserProjection)
        if (!user) {
            return res.status(400).json({ message: "user is not found" })
        }
        return res.status(200).json(user)
    } catch (error) {
        return res.status(500).json({ message: `get current user error ${error.message}` })
    }
}

export const updateUserLocation = async (req, res) => {
    try {
        const { lat, lon } = req.body
        if (lat === undefined || lon === undefined) {
            return res.status(400).json({ message: "lat and lon are required" })
        }
        const user = await User.findByIdAndUpdate(req.userId, {
            location: {
                type: "Point",
                coordinates: [lon, lat]
            }
        }, { new: true }).select(sanitizeUserProjection)
        if (!user) {
            return res.status(400).json({ message: "user is not found" })
        }

        const io = req.app.get("io")
        if (io) {
            io.emit("updateDeliveryLocation", {
                deliveryBoyId: req.userId,
                latitude: lat,
                longitude: lon
            })
        }

        return res.status(200).json({ message: "location updated" })
    } catch (error) {
        return res.status(500).json({ message: `update location user error ${error.message}` })
    }
}

export const getAddresses = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select("addresses")
        if (!user) {
            return res.status(404).json({ message: "user not found" })
        }

        const addresses = [...(user.addresses || [])].sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
        return res.status(200).json(addresses)
    } catch (error) {
        return res.status(500).json({ message: `get addresses error ${error.message}` })
    }
}

export const addAddress = async (req, res) => {
    try {
        const { label, fullAddress, lat, lng, isDefault } = req.body
        if (!label || !fullAddress || lat == null || lng == null) {
            return res.status(400).json({ message: "label, fullAddress, lat and lng are required" })
        }

        const user = await User.findById(req.userId)
        if (!user) {
            return res.status(404).json({ message: "user not found" })
        }

        const shouldBeDefault = Boolean(isDefault) || user.addresses.length === 0
        if (shouldBeDefault) {
            user.addresses.forEach((address) => {
                address.isDefault = false
            })
        }

        user.addresses.push({
            label,
            fullAddress,
            lat: Number(lat),
            lng: Number(lng),
            isDefault: shouldBeDefault
        })
        await user.save()

        return res.status(201).json(user.addresses)
    } catch (error) {
        return res.status(500).json({ message: `add address error ${error.message}` })
    }
}

export const updateAddress = async (req, res) => {
    try {
        const { addressId } = req.params
        const { label, fullAddress, lat, lng, isDefault } = req.body
        const user = await User.findById(req.userId)
        if (!user) {
            return res.status(404).json({ message: "user not found" })
        }

        const address = user.addresses.id(addressId)
        if (!address) {
            return res.status(404).json({ message: "address not found" })
        }

        if (label !== undefined) address.label = label
        if (fullAddress !== undefined) address.fullAddress = fullAddress
        if (lat !== undefined) address.lat = Number(lat)
        if (lng !== undefined) address.lng = Number(lng)

        if (isDefault === true) {
            user.addresses.forEach((entry) => {
                entry.isDefault = false
            })
            address.isDefault = true
        }

        await user.save()
        return res.status(200).json(user.addresses)
    } catch (error) {
        return res.status(500).json({ message: `update address error ${error.message}` })
    }
}

export const deleteAddress = async (req, res) => {
    try {
        const { addressId } = req.params
        const user = await User.findById(req.userId)
        if (!user) {
            return res.status(404).json({ message: "user not found" })
        }

        const address = user.addresses.id(addressId)
        if (!address) {
            return res.status(404).json({ message: "address not found" })
        }

        const wasDefault = Boolean(address.isDefault)
        address.deleteOne()

        if (wasDefault && user.addresses.length > 0) {
            user.addresses[0].isDefault = true
        }

        await user.save()
        return res.status(200).json(user.addresses)
    } catch (error) {
        return res.status(500).json({ message: `delete address error ${error.message}` })
    }
}

export const getRecommendedItems = async (req, res) => {
    try {
        const city = String(req.query.city || "").trim()
        const recentOrders = await Order.find({ user: req.userId, status: { $ne: "cancelled" } })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate("shopOrders.shop", "name city")
            .populate("shopOrders.shopOrderItems.item", "name category price")
            .lean()

        const itemFilter = city ? { city: new RegExp(`^${city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } : {}
        const availableItems = await Item.find(itemFilter)
            .sort({ "rating.average": -1, createdAt: -1 })
            .limit(40)
            .populate("shop", "name city")
            .lean()

        const recentOrderSummary = recentOrders.map((order) => ({
            createdAt: order.createdAt,
            items: (order.shopOrders || []).flatMap((shopOrder) =>
                (shopOrder.shopOrderItems || []).map((entry) => ({
                    name: entry?.name || entry?.item?.name,
                    category: entry?.item?.category,
                    price: entry?.price,
                    shopName: shopOrder?.shop?.name
                }))
            )
        }))

        const availableItemSummary = availableItems.map((item) => ({
            _id: item._id,
            name: item.name,
            category: item.category,
            price: item.price,
            shopName: item?.shop?.name,
            city: item.city
        }))

        let recommendations = []
        try {
            recommendations = await getGeminiRecommendations({
                recentOrders: recentOrderSummary,
                availableItems: availableItemSummary,
                city
            })
        } catch (error) {
            recommendations = []
        }

        const matchedItems = []
        recommendations.forEach((recommendation) => {
            const match = availableItems.find((item) =>
                String(item.name || "").toLowerCase() === String(recommendation?.name || "").toLowerCase()
            )
            if (match && !matchedItems.some((entry) => String(entry._id) === String(match._id))) {
                matchedItems.push({
                    ...match,
                    recommendationReason: recommendation?.reason || ""
                })
            }
        })

        const fallbackItems = availableItems
            .filter((item) => !matchedItems.some((entry) => String(entry._id) === String(item._id)))
            .slice(0, Math.max(0, 5 - matchedItems.length))
            .map((item) => ({
                ...item,
                recommendationReason: "Popular in your delivery area"
            }))

        return res.status(200).json([...matchedItems, ...fallbackItems].slice(0, 5))
    } catch (error) {
        return res.status(500).json({ message: `recommendation error ${error.message}` })
    }
}
