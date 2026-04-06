import Item from "../models/item.model.js"
import Shop from "../models/shop.model.js"

const escapeRegExp = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
const normalizeCity = (value = "") => value.toLowerCase().replace(/[,\-]+/g, " ").replace(/\s+/g, " ").trim()

const CITY_ALIASES = {
    "baruipur": ["Baruipur"],
    "kolkata": ["Kolkata", "Calcutta"],
    "bidhan nagar": ["Bidhan Nagar", "Bidhannagar", "Salt Lake", "Salt Lake City"],
    "salt lake sector v": ["Salt Lake Sector-V", "Salt Lake Sector V", "Sector V", "Sector-V", "Salt Lake"],
    "medinipur": ["Medinipur", "Midnapore", "Paschim Medinipur"]
}

const buildFuzzyRegex = (value = "") => {
    const safe = escapeRegExp(String(value || "").trim())
    if (!safe) return null
    return new RegExp(safe.split("").join(".*"), "i")
}

const resolveCityVariants = (city = "") => {
    const variants = new Set()
    const raw = String(city || "").trim()
    if (!raw) return []

    variants.add(raw)
    const firstPart = raw.split(",")[0]?.trim()
    if (firstPart) variants.add(firstPart)

    const normalized = normalizeCity(raw)
    const aliasList = CITY_ALIASES[normalized] || []
    aliasList.forEach((alias) => variants.add(alias))

    return [...variants]
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
        const cityVariants = resolveCityVariants(city)
        const cityRegexes = cityVariants.map((variant) => new RegExp(`^${escapeRegExp(variant)}$`, "i"))

        const shopFilter = cityRegexes.length > 0 ? { city: { $in: cityRegexes } } : {}
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

        const shopIdsInCity = cityRegexes.length > 0
            ? await Shop.find({ city: { $in: cityRegexes } }).distinct("_id")
            : []

        const matchedShopIds = await Shop.find({
            ...shopFilter,
            $or: [
                { name: exactRegex },
                { name: fuzzyRegex },
                { address: exactRegex }
            ]
        }).distinct("_id")

        const itemFilter = {
            $or: [
                { name: exactRegex },
                { name: fuzzyRegex },
                { description: exactRegex },
                { description: fuzzyRegex },
                { category: exactRegex }
            ]
        }
        if (matchedShopIds.length > 0) {
            itemFilter.$or.push({ shop: { $in: matchedShopIds } })
        }
        if (shopIdsInCity.length > 0) {
            itemFilter.shop = { $in: shopIdsInCity }
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
