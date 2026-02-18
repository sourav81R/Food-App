import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

import Shop from "./models/shop.model.js";
import Item from "./models/item.model.js";
import User from "./models/user.model.js";

dotenv.config();

const MONGODB_URL = process.env.MONGODB_URL;

const TARGET_CITIES = [
  "Baruipur",
  "Kolkata",
  "Bidhan Nagar",
  "Salt Lake Sector-V",
  "Medinipur",
];

const RESTAURANTS_BY_CITY = {
  "Baruipur": [
    { name: "Baruipur Biryani House", address: "Rail Gate Road, Baruipur" },
    { name: "Sonar Tori Cafe", address: "Kulpi Road, Baruipur" },
    { name: "Dakshin Flavours", address: "Subhashgram Crossing, Baruipur" },
    { name: "Royal Spice Baruipur", address: "Station More, Baruipur" },
    { name: "Green Leaf Diner", address: "Khasmallick, Baruipur" },
  ],
  "Kolkata": [
    { name: "Park Street Fusion Hub", address: "Park Street, Kolkata" },
    { name: "Howrah Spice Route", address: "Howrah Maidan, Kolkata" },
    { name: "Ballygunge Taste Lab", address: "Ballygunge, Kolkata" },
    { name: "Esplanade Food Studio", address: "Esplanade, Kolkata" },
    { name: "North Kolkata Kitchen", address: "Shyambazar, Kolkata" },
  ],
  "Bidhan Nagar": [
    { name: "Bidhannagar Tiffin Corner", address: "CA Block, Bidhan Nagar" },
    { name: "Lakeview Bengal Kitchen", address: "Karunamoyee, Bidhan Nagar" },
    { name: "City Center Bites", address: "City Centre, Bidhan Nagar" },
    { name: "Nabanna Nook", address: "Sector 1, Bidhan Nagar" },
    { name: "Eco Park Feast", address: "Eco Park Gate 2, Bidhan Nagar" },
  ],
  "Salt Lake Sector-V": [
    { name: "Sector V Tech Eats", address: "DN Block, Sector-V" },
    { name: "Night Owl Kitchen S5", address: "College More, Sector-V" },
    { name: "Byte & Bite Hub", address: "Webel More, Sector-V" },
    { name: "Silicon Spice Deck", address: "Godrej Waterside, Sector-V" },
    { name: "Code & Curry Canteen", address: "Infinity Bench, Sector-V" },
  ],
  "Medinipur": [
    { name: "Midnapore Matir Henshel", address: "Keranitola, Medinipur" },
    { name: "Medinipur Food Junction", address: "Station Road, Medinipur" },
    { name: "Rupnarayan Rasoi", address: "Colonelgola, Medinipur" },
    { name: "Sajha Spice Point", address: "Vidyasagar Road, Medinipur" },
    { name: "Mahalaya Meals", address: "Old Bus Stand, Medinipur" },
  ],
};

const ITEM_TEMPLATES = [
  { name: "Chicken Biryani", category: "Main Course", foodType: "non veg", basePrice: 220 },
  { name: "Mutton Kosha", category: "Main Course", foodType: "non veg", basePrice: 280 },
  { name: "Paneer Butter Masala", category: "Main Course", foodType: "veg", basePrice: 210 },
  { name: "Veg Fried Rice", category: "Chinese", foodType: "veg", basePrice: 170 },
  { name: "Chilli Chicken", category: "Chinese", foodType: "non veg", basePrice: 230 },
  { name: "Chicken Roll", category: "Fast Food", foodType: "non veg", basePrice: 140 },
  { name: "Paneer Roll", category: "Fast Food", foodType: "veg", basePrice: 130 },
  { name: "Veg Burger", category: "Burgers", foodType: "veg", basePrice: 150 },
  { name: "Chicken Burger", category: "Burgers", foodType: "non veg", basePrice: 180 },
  { name: "Cheese Pizza", category: "Pizza", foodType: "veg", basePrice: 240 },
  { name: "Farmhouse Pizza", category: "Pizza", foodType: "veg", basePrice: 260 },
  { name: "Momos Platter", category: "Snacks", foodType: "non veg", basePrice: 160 },
  { name: "Samosa Chaat", category: "Snacks", foodType: "veg", basePrice: 90 },
  { name: "Masala Dosa", category: "South Indian", foodType: "veg", basePrice: 120 },
  { name: "Idli Sambar", category: "South Indian", foodType: "veg", basePrice: 95 },
  { name: "Butter Naan Combo", category: "North Indian", foodType: "veg", basePrice: 190 },
  { name: "Kadai Chicken", category: "North Indian", foodType: "non veg", basePrice: 250 },
  { name: "Chocolate Brownie", category: "Desserts", foodType: "veg", basePrice: 130 },
  { name: "Misti Doi", category: "Desserts", foodType: "veg", basePrice: 85 },
  { name: "Cold Coffee", category: "Others", foodType: "veg", basePrice: 110 },
  { name: "Mango Lassi", category: "Others", foodType: "veg", basePrice: 95 },
  { name: "Club Sandwich", category: "Sandwiches", foodType: "non veg", basePrice: 170 },
  { name: "Veg Sandwich", category: "Sandwiches", foodType: "veg", basePrice: 130 },
];

const ITEMS_PER_SHOP = 10;
const TEA_COFFEE_SHOP_CITIES = [
  "Baruipur",
  "Kolkata",
  "Bidhan Nagar",
  "Salt Lake Sector-V",
  "Medinipur",
];
const TEA_BREAK_SHOP_SUFFIX = "Tea Break Hub";
const COFFEE_SHOP_SUFFIX = "Coffee Corner";
const TEA_VARIETY_TEMPLATES = [
  { name: "Masala Chai", category: "Others", foodType: "veg", basePrice: 45 },
  { name: "Adrak Chai", category: "Others", foodType: "veg", basePrice: 50 },
  { name: "Elaichi Chai", category: "Others", foodType: "veg", basePrice: 55 },
  { name: "Lemon Tea", category: "Others", foodType: "veg", basePrice: 48 },
  { name: "Kulhad Chai", category: "Others", foodType: "veg", basePrice: 60 },
  { name: "Tea & Samosa Combo", category: "Snacks", foodType: "veg", basePrice: 89 },
  { name: "Tea & Veg Sandwich", category: "Sandwiches", foodType: "veg", basePrice: 99 },
  { name: "Tea Biscuit Platter", category: "Snacks", foodType: "veg", basePrice: 70 },
];
const COFFEE_VARIETY_TEMPLATES = [
  { name: "Espresso Coffee", category: "Others", foodType: "veg", basePrice: 75 },
  { name: "Americano Coffee", category: "Others", foodType: "veg", basePrice: 90 },
  { name: "Cappuccino Coffee", category: "Others", foodType: "veg", basePrice: 120 },
  { name: "Cafe Latte Coffee", category: "Others", foodType: "veg", basePrice: 130 },
  { name: "Mocha Coffee", category: "Others", foodType: "veg", basePrice: 140 },
  { name: "Cold Brew Coffee", category: "Others", foodType: "veg", basePrice: 150 },
  { name: "Iced Coffee", category: "Others", foodType: "veg", basePrice: 125 },
  { name: "Affogato Coffee", category: "Desserts", foodType: "veg", basePrice: 160 },
];
const LEGACY_SEEDED_SHOP_NAMES = [
  "Spice Garden",
  "Tandoori Nights",
  "Dragon Wok",
  "Pizza Paradise",
  "Biryani House",
  "Baruipur Kitchen",
  "Royal Dhaba",
  "Mama's Kitchen",
  "Garia Riverside Cafe",
];

const toSlug = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const SHOP_IMAGE_POOL = [
  "https://images.pexels.com/photos/67468/pexels-photo-67468.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/941861/pexels-photo-941861.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/260922/pexels-photo-260922.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/696218/pexels-photo-696218.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/262047/pexels-photo-262047.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/239975/pexels-photo-239975.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/6267/menu-restaurant-vintage-table.jpg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/1639562/pexels-photo-1639562.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg?auto=compress&cs=tinysrgb&w=1200",
];

const ITEM_IMAGE_POOL = [
  "https://images.pexels.com/photos/70497/pexels-photo-70497.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/1639562/pexels-photo-1639562.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/4553111/pexels-photo-4553111.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/2232/vegetables-italian-pizza-restaurant.jpg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/699953/pexels-photo-699953.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/769289/pexels-photo-769289.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=1200",
];

const TEA_IMAGE_POOL = [
  "https://images.pexels.com/photos/5946965/pexels-photo-5946965.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/1493080/pexels-photo-1493080.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/230477/pexels-photo-230477.jpeg?auto=compress&cs=tinysrgb&w=1200",
];

const COFFEE_IMAGE_POOL = [
  "https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/374885/pexels-photo-374885.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg?auto=compress&cs=tinysrgb&w=1200",
];

const CATEGORY_ITEM_IMAGE_POOLS = {
  "Main Course": [
    "https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1633578/pexels-photo-1633578.jpeg?auto=compress&cs=tinysrgb&w=1200",
  ],
  "Chinese": [
    "https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/315755/pexels-photo-315755.jpeg?auto=compress&cs=tinysrgb&w=1200",
  ],
  "Fast Food": [
    "https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2983101/pexels-photo-2983101.jpeg?auto=compress&cs=tinysrgb&w=1200",
  ],
  "Burgers": [
    "https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/2983101/pexels-photo-2983101.jpeg?auto=compress&cs=tinysrgb&w=1200",
  ],
  "Pizza": [
    "https://images.pexels.com/photos/2232/vegetables-italian-pizza-restaurant.jpg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/315755/pexels-photo-315755.jpeg?auto=compress&cs=tinysrgb&w=1200",
  ],
  "Snacks": [
    "https://images.pexels.com/photos/4553111/pexels-photo-4553111.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/5638732/pexels-photo-5638732.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1383776/pexels-photo-1383776.jpeg?auto=compress&cs=tinysrgb&w=1200",
  ],
  "South Indian": [
    "https://images.pexels.com/photos/5560763/pexels-photo-5560763.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/884600/pexels-photo-884600.jpeg?auto=compress&cs=tinysrgb&w=1200",
  ],
  "North Indian": [
    "https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1633578/pexels-photo-1633578.jpeg?auto=compress&cs=tinysrgb&w=1200",
  ],
  "Desserts": [
    "https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/3026808/pexels-photo-3026808.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1126359/pexels-photo-1126359.jpeg?auto=compress&cs=tinysrgb&w=1200",
  ],
  "Sandwiches": [
    "https://images.pexels.com/photos/1600711/pexels-photo-1600711.jpeg?auto=compress&cs=tinysrgb&w=1200",
    "https://images.pexels.com/photos/1647163/pexels-photo-1647163.jpeg?auto=compress&cs=tinysrgb&w=1200",
  ],
  "Others": [
    ...TEA_IMAGE_POOL,
    ...COFFEE_IMAGE_POOL,
  ],
};

function seededNumber(seedText, min, max) {
  const hash = [...seedText].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const range = max - min + 1;
  return min + (hash % range);
}

function pickFromPool(pool, seedText) {
  const index = seededNumber(seedText, 0, pool.length - 1);
  return pool[index];
}

function seededShopImage(seedText) {
  return pickFromPool(SHOP_IMAGE_POOL, `shop-${seedText}`);
}

function resolveItemImagePool(itemName = "", category = "") {
  const normalizedName = itemName.toLowerCase();

  const isTeaItem =
    normalizedName.includes("tea") ||
    normalizedName.includes("chai") ||
    normalizedName.includes("kulhad");
  if (isTeaItem) {
    return TEA_IMAGE_POOL;
  }

  const isCoffeeItem =
    normalizedName.includes("coffee") ||
    normalizedName.includes("espresso") ||
    normalizedName.includes("latte") ||
    normalizedName.includes("mocha") ||
    normalizedName.includes("americano") ||
    normalizedName.includes("cappuccino") ||
    normalizedName.includes("affogato") ||
    normalizedName.includes("brew");
  if (isCoffeeItem) {
    return COFFEE_IMAGE_POOL;
  }

  return CATEGORY_ITEM_IMAGE_POOLS[category] || ITEM_IMAGE_POOL;
}

function seededItemImage(seedText, itemName, category) {
  const pool = resolveItemImagePool(itemName, category);
  return pickFromPool(pool, `item-${seedText}-${itemName}-${category}`);
}

function buildSeedShops() {
  const all = [];
  for (const city of TARGET_CITIES) {
    const entries = RESTAURANTS_BY_CITY[city] || [];
    for (const entry of entries) {
      all.push({
        name: entry.name,
        city,
        state: "West Bengal",
        address: entry.address,
        image: seededShopImage(`shop-${toSlug(entry.name)}`),
      });
    }

    if (TEA_COFFEE_SHOP_CITIES.includes(city)) {
      const teaShopName = `${city} ${TEA_BREAK_SHOP_SUFFIX}`;
      const coffeeShopName = `${city} ${COFFEE_SHOP_SUFFIX}`;
      all.push({
        name: teaShopName,
        city,
        state: "West Bengal",
        address: `Tea Square, ${city}`,
        image: seededShopImage(`shop-${toSlug(teaShopName)}`),
      });
      all.push({
        name: coffeeShopName,
        city,
        state: "West Bengal",
        address: `Coffee Street, ${city}`,
        image: seededShopImage(`shop-${toSlug(coffeeShopName)}`),
      });
    }
  }

  return all;
}

function buildSeedItems(seedShops) {
  const items = [];

  for (let shopIndex = 0; shopIndex < seedShops.length; shopIndex += 1) {
    const shop = seedShops[shopIndex];
    const isTeaShop = shop.name.includes(TEA_BREAK_SHOP_SUFFIX);
    const isCoffeeShop = shop.name.includes(COFFEE_SHOP_SUFFIX);

    if (isTeaShop || isCoffeeShop) {
      const specialTemplates = isTeaShop ? TEA_VARIETY_TEMPLATES : COFFEE_VARIETY_TEMPLATES;
      for (let itemIndex = 0; itemIndex < specialTemplates.length; itemIndex += 1) {
        const template = specialTemplates[itemIndex];
        const priceOffset = seededNumber(`${shop.name}-${template.name}-price`, 0, 18);
        const ratingAverageRaw = seededNumber(`${shop.name}-${template.name}-rating`, 42, 50) / 10;
        const ratingCount = seededNumber(`${shop.name}-${template.name}-count`, 40, 260);

        items.push({
          name: `${template.name} - ${shop.city}`,
          price: template.basePrice + priceOffset,
          category: template.category,
          foodType: template.foodType,
          image: seededItemImage(
            `item-${toSlug(shop.name)}-${toSlug(template.name)}-${itemIndex + 1}`,
            template.name,
            template.category
          ),
          rating: {
            average: Number(ratingAverageRaw.toFixed(1)),
            count: ratingCount,
          },
          shopName: shop.name,
        });
      }
      continue;
    }

    for (let itemIndex = 0; itemIndex < ITEMS_PER_SHOP; itemIndex += 1) {
      const template = ITEM_TEMPLATES[(shopIndex * 3 + itemIndex) % ITEM_TEMPLATES.length];
      const priceOffset = seededNumber(`${shop.name}-${template.name}-price`, 5, 45);
      const ratingAverageRaw = seededNumber(`${shop.name}-${template.name}-rating`, 38, 48) / 10;
      const ratingCount = seededNumber(`${shop.name}-${template.name}-count`, 25, 220);
      const shortShopName = shop.name.split(" ").slice(0, 2).join(" ");

      items.push({
        name: `${template.name} - ${shortShopName}`,
        price: template.basePrice + priceOffset,
        category: template.category,
        foodType: template.foodType,
        image: seededItemImage(
          `item-${toSlug(shop.name)}-${toSlug(template.name)}-${itemIndex + 1}`,
          template.name,
          template.category
        ),
        rating: {
          average: Number(ratingAverageRaw.toFixed(1)),
          count: ratingCount,
        },
        shopName: shop.name,
      });
    }
  }

  return items;
}

async function seedDatabase() {
  try {
    if (!MONGODB_URL) {
      throw new Error("MONGODB_URL is missing in backend/.env");
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URL);
    console.log("Connected to MongoDB");

    let owner = await User.findOne({ email: "owner@demo.com" });
    if (!owner) {
      const hashedPassword = await bcrypt.hash("demo123", 10);
      owner = await User.create({
        fullName: "Demo Restaurant Owner",
        email: "owner@demo.com",
        mobile: "9999999999",
        password: hashedPassword,
        role: "owner",
      });
      console.log("Created demo owner: owner@demo.com / demo123");
    }

    const seedShops = buildSeedShops();
    const seedItems = buildSeedItems(seedShops);
    const seededShopNames = seedShops.map((shop) => shop.name);
    const namesToCleanup = [...new Set([...seededShopNames, ...LEGACY_SEEDED_SHOP_NAMES])];

    const existingSeedShops = await Shop.find({ name: { $in: namesToCleanup } }).select("_id");
    const existingShopIds = existingSeedShops.map((shop) => shop._id);
    if (existingShopIds.length > 0) {
      await Item.deleteMany({ shop: { $in: existingShopIds } });
      await Shop.deleteMany({ _id: { $in: existingShopIds } });
    }

    const createdShops = await Shop.insertMany(
      seedShops.map((shop) => ({
        ...shop,
        owner: owner._id,
        items: [],
      }))
    );

    const shopByName = new Map(createdShops.map((shop) => [shop.name, shop]));
    let createdItemsCount = 0;

    for (const item of seedItems) {
      const shop = shopByName.get(item.shopName);
      if (!shop) {
        console.warn(`Skipped item "${item.name}" because shop "${item.shopName}" was not found.`);
        continue;
      }

      const createdItem = await Item.create({
        name: item.name,
        image: item.image,
        shop: shop._id,
        category: item.category,
        price: item.price,
        foodType: item.foodType,
        rating: item.rating,
      });

      shop.items.push(createdItem._id);
      createdItemsCount += 1;
    }

    await Promise.all(createdShops.map((shop) => shop.save()));

    console.log("Seed complete");
    console.log(`Restaurants created: ${createdShops.length}`);
    console.log(`Food items created: ${createdItemsCount}`);
    console.log(`Standard items per restaurant: ${ITEMS_PER_SHOP}`);
    console.log("Tea/Coffee shops include dedicated tea and coffee varieties.");
    console.log(`Tea/Coffee shop cities: ${TEA_COFFEE_SHOP_CITIES.join(", ")}`);
    console.log("Locations covered: Baruipur, Kolkata, Bidhan Nagar, Salt Lake Sector-V, Medinipur");
  } catch (error) {
    console.error("Seed error:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seedDatabase();
