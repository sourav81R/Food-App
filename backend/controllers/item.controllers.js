import Item from "../models/item.model.js";
import Shop from "../models/shop.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";

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

export const addItem = async (req, res) => {
    try {
        const { name, category, foodType, price } = req.body
        let image;
        if (req.file) {
            image = await uploadOnCloudinary(req.file.path)
        }
        const shop = await Shop.findOne({ owner: req.userId })
        if (!shop) {
            return res.status(400).json({ message: "shop not found" })
        }
        const item = await Item.create({
            name, category, foodType, price, image, shop: shop._id
        })

        shop.items.push(item._id)
        await shop.save()
        await shop.populate("owner")
        await shop.populate({
            path: "items",
            options: { sort: { updatedAt: -1 } }
        })
        return res.status(201).json(shop)

    } catch (error) {
        return res.status(500).json({ message: `add item error ${error}` })
    }
}

export const editItem = async (req, res) => {
    try {
        const itemId = req.params.itemId
        const { name, category, foodType, price } = req.body
        let image;
        if (req.file) {
            image = await uploadOnCloudinary(req.file.path)
        }
        const item = await Item.findByIdAndUpdate(itemId, {
            name, category, foodType, price, image
        }, { new: true })
        if (!item) {
            return res.status(400).json({ message: "item not found" })
        }
        const shop = await Shop.findOne({ owner: req.userId }).populate({
            path: "items",
            options: { sort: { updatedAt: -1 } }
        })
        return res.status(200).json(shop)

    } catch (error) {
        return res.status(500).json({ message: `edit item error ${error}` })
    }
}

export const getItemById = async (req, res) => {
    try {
        const itemId = req.params.itemId
        const item = await Item.findById(itemId)
        if (!item) {
            return res.status(400).json({ message: "item not found" })
        }
        return res.status(200).json(item)
    } catch (error) {
        return res.status(500).json({ message: `get item error ${error}` })
    }
}

export const deleteItem = async (req, res) => {
    try {
        const itemId = req.params.itemId
        const item = await Item.findByIdAndDelete(itemId)
        if (!item) {
            return res.status(400).json({ message: "item not found" })
        }
        const shop = await Shop.findOne({ owner: req.userId })
        shop.items = shop.items.filter(i => i !== item._id)
        await shop.save()
        await shop.populate({
            path: "items",
            options: { sort: { updatedAt: -1 } }
        })
        return res.status(200).json(shop)

    } catch (error) {
        return res.status(500).json({ message: `delete item error ${error}` })
    }
}

export const getItemByCity = async (req, res) => {
    try {
        const { city } = req.params
        if (!city) {
            return res.status(400).json({ message: "city is required" })
        }

        const cityVariants = resolveCityVariants(city);
        const cityRegexes = cityVariants.map((variant) => new RegExp(`^${escapeRegExp(variant)}$`, "i"));

        let shops = await Shop.find({
            city: { $in: cityRegexes }
        }).select("_id city");

        if (shops.length === 0) {
            const fallbackCity = await pickFallbackCity(city);
            if (fallbackCity) {
                shops = await Shop.find({ city: fallbackCity }).select("_id city");
            }
        }

        if (shops.length === 0) {
            return res.status(200).json([]);
        }

        const shopIds = shops.map((shop) => shop._id);
        const items = await Item.find({ shop: { $in: shopIds } });
        return res.status(200).json(items)

    } catch (error) {
 return res.status(500).json({ message: `get item by city error ${error}` })
    }
}

export const getItemsByShop=async (req,res) => {
    try {
        const {shopId}=req.params
        const shop=await Shop.findById(shopId).populate("items")
        if(!shop){
            return res.status(400).json("shop not found")
        }
        return res.status(200).json({
            shop,items:shop.items
        })
    } catch (error) {
         return res.status(500).json({ message: `get item by shop error ${error}` })
    }
}

export const searchItems=async (req,res) => {
    try {
        const {query,city}=req.query
        if(!query || !city){
            return null
        }
        const shops=await Shop.find({
            city:{$regex:new RegExp(`^${city}$`, "i")}
        }).populate('items')
        if(!shops){
            return res.status(400).json({message:"shops not found"})
        }
        const shopIds=shops.map(s=>s._id)
        const items=await Item.find({
            shop:{$in:shopIds},
            $or:[
              {name:{$regex:query,$options:"i"}},
              {category:{$regex:query,$options:"i"}}  
            ]

        }).populate("shop","name image")

        return res.status(200).json(items)

    } catch (error) {
         return res.status(500).json({ message: `search item  error ${error}` })
    }
}


export const rating=async (req,res) => {
    try {
        const {itemId,rating}=req.body

        if(!itemId || !rating){
            return res.status(400).json({message:"itemId and rating is required"})
        }

        if(rating<1 || rating>5){
             return res.status(400).json({message:"rating must be between 1 to 5"})
        }

        const item=await Item.findById(itemId)
        if(!item){
              return res.status(400).json({message:"item not found"})
        }

        const newCount=item.rating.count + 1
        const newAverage=(item.rating.average*item.rating.count + rating)/newCount

        item.rating.count=newCount
        item.rating.average=newAverage
        await item.save()
return res.status(200).json({rating:item.rating})

    } catch (error) {
         return res.status(500).json({ message: `rating error ${error}` })
    }
}
