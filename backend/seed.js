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
const TEA_BREAK_DUMMY_SHOP = {
  name: "Tea Break Junction",
  city: "Kolkata",
  state: "West Bengal",
  address: "Camac Street, Kolkata",
};
const TEA_BREAK_DUMMY_ITEM = {
  name: "Adrak Chai & Samosa Combo",
  category: "Snacks",
  foodType: "veg",
  price: 79,
};
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

function seededItemImage(seedText, itemName, category) {
  return pickFromPool(ITEM_IMAGE_POOL, `item-${seedText}-${itemName}-${category}`);
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
  }

  all.push({
    ...TEA_BREAK_DUMMY_SHOP,
    image: seededShopImage(`shop-${toSlug(TEA_BREAK_DUMMY_SHOP.name)}`),
  });

  return all;
}

function buildSeedItems(seedShops) {
  const items = [];

  for (let shopIndex = 0; shopIndex < seedShops.length; shopIndex += 1) {
    const shop = seedShops[shopIndex];

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

  const teaBreakShop = seedShops.find((shop) => shop.name === TEA_BREAK_DUMMY_SHOP.name);
  if (teaBreakShop) {
    items.push({
      name: TEA_BREAK_DUMMY_ITEM.name,
      price: TEA_BREAK_DUMMY_ITEM.price,
      category: TEA_BREAK_DUMMY_ITEM.category,
      foodType: TEA_BREAK_DUMMY_ITEM.foodType,
      image: seededItemImage(
        `item-${toSlug(TEA_BREAK_DUMMY_SHOP.name)}-${toSlug(TEA_BREAK_DUMMY_ITEM.name)}`,
        TEA_BREAK_DUMMY_ITEM.name,
        TEA_BREAK_DUMMY_ITEM.category
      ),
      rating: {
        average: 4.6,
        count: 120,
      },
      shopName: TEA_BREAK_DUMMY_SHOP.name,
    });
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
    console.log(`Items per restaurant: ${ITEMS_PER_SHOP} (+ Tea Break dummy item)`);
    console.log("Locations covered: Baruipur, Kolkata, Bidhan Nagar, Salt Lake Sector-V, Medinipur");
  } catch (error) {
    console.error("Seed error:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seedDatabase();
