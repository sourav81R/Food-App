import Shop from "../models/shop.model.js";
import Order from "../models/order.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import getShopAvailability from "../utils/shopAvailability.js";

const FALLBACK_CITIES = ["Baruipur", "Kolkata", "Bidhan Nagar", "Salt Lake Sector-V", "Medinipur"];
const CITY_ALIASES = {
    "baruipur": ["Baruipur"],
    "kolkata": ["Kolkata", "Calcutta"],
    "bidhan nagar": ["Bidhan Nagar", "Bidhannagar", "Salt Lake", "Salt Lake City"],
    "salt lake sector-v": ["Salt Lake Sector-V", "Salt Lake Sector V", "Sector V", "Sector-V", "Salt Lake"],
    "medinipur": ["Medinipur", "Midnapore", "Paschim Medinipur"]
};

const normalizeCity = (value = "") => value.toLowerCase().replace(/[,\-]+/g, " ").replace(/\s+/g, " ").trim();
const escapeRegExp = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const resolveCityVariants = (city = "") => {
    const variants = new Set();
    const raw = city.trim();
    if (!raw) return [];

    variants.add(raw);
    const firstPart = raw.split(",")[0]?.trim();
    if (firstPart) variants.add(firstPart);

    const normalized = normalizeCity(raw);
    const aliasList = CITY_ALIASES[normalized] || [];
    aliasList.forEach((alias) => variants.add(alias));

    return [...variants];
};

const pickFallbackCity = async (requestedCity = "") => {
    const normalizedRequested = normalizeCity(requestedCity);
    const preferredAvailable = await Shop.distinct("city", { city: { $in: FALLBACK_CITIES } });
    const pool = preferredAvailable.length > 0 ? preferredAvailable : await Shop.distinct("city");
    if (pool.length === 0) return null;

    const filteredPool = pool.filter((city) => normalizeCity(city) !== normalizedRequested);
    const source = (filteredPool.length > 0 ? filteredPool : pool).sort((a, b) => a.localeCompare(b));
    const hashBase = normalizedRequested || "fallback-city";
    const hash = [...hashBase].reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return source[hash % source.length];
};

export const createEditShop=async (req,res) => {
    try {
       const {name,city,state,address,openingTime,closingTime,isOpen,latitude,longitude}=req.body
       let image;
       if(req.file){
        image=await uploadOnCloudinary(req.file.path)
       } 
       let shop=await Shop.findOne({owner:req.userId})
       const location = Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude))
        ? {
            type: "Point",
            coordinates: [Number(longitude), Number(latitude)]
        }
        : undefined
       if(!shop){
        shop=await Shop.create({
        name,city,state,address,image,owner:req.userId,openingTime,closingTime,
        isOpen:isOpen !== undefined ? String(isOpen) === "true" || isOpen === true : true,
        ...(location ? { location } : {})
       })
       }else{
        const updatePayload={
        name,city,state,address,owner:req.userId,
        openingTime: openingTime || shop.openingTime,
        closingTime: closingTime || shop.closingTime,
        isOpen:isOpen !== undefined ? String(isOpen) === "true" || isOpen === true : shop.isOpen
       }
       if(image){
        updatePayload.image=image
       }
       if(location){
        updatePayload.location=location
       }
         shop=await Shop.findByIdAndUpdate(shop._id, updatePayload, {new:true})
       }
      
       await shop.populate("owner items")
       return res.status(201).json(shop)
    } catch (error) {
        return res.status(500).json({message:`create shop error ${error}`})
    }
}

export const getMyShop=async (req,res) => {
    try {
        const shop=await Shop.findOne({owner:req.userId}).populate("owner").populate({
            path:"items",
            options:{sort:{updatedAt:-1}}
        })
        if(!shop){
            return res.status(200).json(null)
        }
        return res.status(200).json(shop)
    } catch (error) {
        return res.status(500).json({message:`get my shop error ${error}`})
    }
}

export const getShopByCity=async (req,res) => {
    try {
        const {city}=req.params
        if (!city) {
            return res.status(400).json({ message: "city is required" })
        }

        const cityVariants = resolveCityVariants(city);
        const cityRegexes = cityVariants.map((variant) => new RegExp(`^${escapeRegExp(variant)}$`, "i"));

        let shops = await Shop.find({
            city: { $in: cityRegexes }
        }).populate('items');

        if (shops.length === 0) {
            const fallbackCity = await pickFallbackCity(city);
            if (fallbackCity) {
                shops = await Shop.find({ city: fallbackCity }).populate('items');
            }
        }

        const enrichedShops = shops.map((shop) => ({
            ...shop.toObject(),
            availability: getShopAvailability(shop)
        }))

        return res.status(200).json(enrichedShops)
    } catch (error) {
        return res.status(500).json({message:`get shop by city error ${error}`})
    }
}

export const toggleBusyMode = async (req, res) => {
    try {
        const shop = await Shop.findOne({ owner: req.userId })
        if (!shop) {
            return res.status(404).json({ message: "shop not found" })
        }

        const nextBusyState = typeof req.body?.isBusy === "boolean"
            ? req.body.isBusy
            : !shop.isBusy

        shop.isBusy = nextBusyState
        await shop.save()

        return res.status(200).json({
            message: `Busy mode ${shop.isBusy ? "enabled" : "disabled"}`,
            shop
        })
    } catch (error) {
        return res.status(500).json({ message: `toggle busy mode error ${error.message}` })
    }
}

export const getShopAnalytics = async (req, res) => {
    try {
        const range = String(req.query.range || "week").trim().toLowerCase()
        if (!["week", "month"].includes(range)) {
            return res.status(400).json({ message: "range must be week or month" })
        }

        const shop = await Shop.findOne({ owner: req.userId }).select("_id name items")
        if (!shop) {
            return res.status(404).json({ message: "shop not found" })
        }

        const start = new Date()
        start.setHours(0, 0, 0, 0)
        start.setDate(start.getDate() - (range === "month" ? 29 : 6))
        const end = new Date()
        end.setHours(23, 59, 59, 999)

        const orders = await Order.find({
            createdAt: { $gte: start, $lte: end },
            status: { $nin: ["cancelled", "scheduled"] },
            shopOrders: {
                $elemMatch: {
                    shop: shop._id
                }
            }
        }).populate("shopOrders.shopOrderItems.item", "name").lean()

        let totalOrders = 0
        let totalRevenue = 0
        const topItemsMap = new Map()
        const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }))
        const revenueMap = new Map()

        orders.forEach((order) => {
            const createdDate = new Date(order.createdAt)
            const label = createdDate.toLocaleDateString("en-IN", {
                month: "short",
                day: "numeric"
            })
            const revenueBucket = revenueMap.get(label) || { label, revenue: 0, orders: 0 }

            order.shopOrders.forEach((shopOrder) => {
                if (String(shopOrder.shop) !== String(shop._id)) {
                    return
                }
                totalOrders += 1
                totalRevenue += Number(shopOrder.subtotal || 0)
                revenueBucket.revenue += Number(shopOrder.subtotal || 0)
                revenueBucket.orders += 1
                hourlyDistribution[createdDate.getHours()].count += 1

                ;(shopOrder.shopOrderItems || []).forEach((entry) => {
                    const itemName = entry?.name || entry?.item?.name || "Item"
                    const current = topItemsMap.get(itemName) || { name: itemName, count: 0 }
                    current.count += Number(entry.quantity || 0)
                    topItemsMap.set(itemName, current)
                })
            })

            revenueMap.set(label, revenueBucket)
        })

        const topItems = [...topItemsMap.values()]
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)

        return res.status(200).json({
            range,
            totalOrders,
            totalRevenue: Number(totalRevenue.toFixed(2)),
            topItems,
            hourlyDistribution,
            revenueSeries: [...revenueMap.values()]
        })
    } catch (error) {
        return res.status(500).json({ message: `shop analytics error ${error.message}` })
    }
}
