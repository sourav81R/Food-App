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

export const createEditShop=async (req,res) => {
    try {
       const {name,city,state,address}=req.body
       let image;
       if(req.file){
        console.log(req.file)
        image=await uploadOnCloudinary(req.file.path)
       } 
       let shop=await Shop.findOne({owner:req.userId})
       if(!shop){
        shop=await Shop.create({
        name,city,state,address,image,owner:req.userId
       })
       }else{
         shop=await Shop.findByIdAndUpdate(shop._id,{
        name,city,state,address,image,owner:req.userId
       },{new:true})
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

        return res.status(200).json(shops)
    } catch (error) {
        return res.status(500).json({message:`get shop by city error ${error}`})
    }
}
