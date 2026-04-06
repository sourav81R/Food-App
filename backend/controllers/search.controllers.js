import Item from "../models/item.model.js"
import Shop from "../models/shop.model.js"

const escapeRegExp = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

const buildFuzzyRegex = (value = "") => {
    const safe = escapeRegExp(String(value || "").trim())
    if (!safe) return null
    return new RegExp(safe.split("").join(".*"), "i")
}

export const smartSearch = async (req, res) => {
    try {
        const query = String(req.query.q || "").trim()
        const city = String(req.query.city || "").trim()

        if (!query) {
            return res.status(200).json({
                items: [],
                shops: []
            })
        }

        const exactRegex = new RegExp(escapeRegExp(query), "i")
        const fuzzyRegex = buildFuzzyRegex(query)
        const cityRegex = city ? new RegExp(`^${escapeRegExp(city)}$`, "i") : null

        const shopFilter = cityRegex ? { city: cityRegex } : {}
        const shops = await Shop.find({
            ...shopFilter,
            $or: [
                { name: exactRegex },
                { name: fuzzyRegex },
                { address: exactRegex }
            ]
        })
            .select("name image city address isBusy isOpen openingTime closingTime")
            .limit(5)

        const itemFilter = {
            $or: [
                { name: exactRegex },
                { name: fuzzyRegex },
                { description: exactRegex },
                { category: exactRegex }
            ]
        }
        if (cityRegex) {
            itemFilter.city = cityRegex
        }

        const items = await Item.find(itemFilter)
            .select("name image price category city shop")
            .populate("shop", "name city")
            .limit(8)

        return res.status(200).json({
            items,
            shops
        })
    } catch (error) {
        return res.status(500).json({ message: `search error ${error.message}` })
    }
}
