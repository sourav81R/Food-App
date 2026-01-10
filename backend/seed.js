import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Import models
import Shop from "./models/shop.model.js";
import Item from "./models/item.model.js";
import User from "./models/user.model.js";

const MONGODB_URL = process.env.MONGODB_URL;

// Dummy shop data - Kolkata and Baruipur
const dummyShops = [
    // Kolkata shops
    {
        name: "Spice Garden",
        city: "Kolkata",
        state: "West Bengal",
        address: "Park Street, Kolkata",
        image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400",
        location: { type: "Point", coordinates: [88.3639, 22.5726] }
    },
    {
        name: "Tandoori Nights",
        city: "Kolkata",
        state: "West Bengal",
        address: "Salt Lake, Kolkata",
        image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400",
        location: { type: "Point", coordinates: [88.4100, 22.5800] }
    },
    {
        name: "Dragon Wok",
        city: "Kolkata",
        state: "West Bengal",
        address: "New Market, Kolkata",
        image: "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=400",
        location: { type: "Point", coordinates: [88.3500, 22.5600] }
    },
    {
        name: "Pizza Paradise",
        city: "Kolkata",
        state: "West Bengal",
        address: "Gariahat, Kolkata",
        image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400",
        location: { type: "Point", coordinates: [88.3700, 22.5200] }
    },
    {
        name: "Biryani House",
        city: "Kolkata",
        state: "West Bengal",
        address: "Howrah, Kolkata",
        image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400",
        location: { type: "Point", coordinates: [88.3100, 22.6000] }
    },
    // Baruipur shops
    {
        name: "Baruipur Kitchen",
        city: "Baruipur",
        state: "West Bengal",
        address: "Main Road, Baruipur",
        image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400",
        location: { type: "Point", coordinates: [88.4333, 22.3583] }
    },
    {
        name: "Royal Dhaba",
        city: "Baruipur",
        state: "West Bengal",
        address: "Station Road, Baruipur",
        image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400",
        location: { type: "Point", coordinates: [88.4350, 22.3600] }
    },
    {
        name: "Mama's Kitchen",
        city: "Baruipur",
        state: "West Bengal",
        address: "College Para, Baruipur",
        image: "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=400",
        location: { type: "Point", coordinates: [88.4300, 22.3550] }
    }
];

// Dummy food items - using correct enum values from schema
const dummyItems = [
    // Main Course
    { name: "Butter Chicken", price: 320, category: "Main Course", foodType: "non veg", image: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400", rating: { average: 4.5, count: 120 } },
    { name: "Dal Makhani", price: 180, category: "Main Course", foodType: "veg", image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400", rating: { average: 4.2, count: 95 } },
    { name: "Chicken Biryani", price: 280, category: "Main Course", foodType: "non veg", image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400", rating: { average: 4.7, count: 200 } },
    { name: "Veg Biryani", price: 220, category: "Main Course", foodType: "veg", image: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=400", rating: { average: 4.1, count: 75 } },
    { name: "Mutton Rogan Josh", price: 380, category: "Main Course", foodType: "non veg", image: "https://images.unsplash.com/photo-1545247181-516773cae754?w=400", rating: { average: 4.6, count: 110 } },
    { name: "Palak Paneer", price: 200, category: "Main Course", foodType: "veg", image: "https://images.unsplash.com/photo-1618449840665-9ed506d73a34?w=400", rating: { average: 4.0, count: 60 } },

    // Snacks
    { name: "Paneer Tikka", price: 250, category: "Snacks", foodType: "veg", image: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400", rating: { average: 4.3, count: 85 } },
    { name: "Tandoori Chicken", price: 350, category: "Snacks", foodType: "non veg", image: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400", rating: { average: 4.4, count: 130 } },
    { name: "Samosa", price: 40, category: "Snacks", foodType: "veg", image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400", rating: { average: 4.2, count: 180 } },

    // South Indian (Breakfast favorites)
    { name: "Masala Dosa", price: 120, category: "South Indian", foodType: "veg", image: "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=400", rating: { average: 4.3, count: 90 } },
    { name: "Idli Sambar", price: 80, category: "South Indian", foodType: "veg", image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400", rating: { average: 4.1, count: 70 } },
    { name: "Medu Vada", price: 60, category: "South Indian", foodType: "veg", image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400", rating: { average: 4.2, count: 55 } },
    { name: "Rava Dosa", price: 100, category: "South Indian", foodType: "veg", image: "https://images.unsplash.com/photo-1630383249896-424e482df921?w=400", rating: { average: 4.0, count: 45 } },
    { name: "Uttapam", price: 90, category: "South Indian", foodType: "veg", image: "https://images.unsplash.com/photo-1567337710282-00832b415979?w=400", rating: { average: 4.1, count: 50 } },

    // More Snacks (Breakfast/Evening)
    { name: "Poha", price: 50, category: "Snacks", foodType: "veg", image: "https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?w=400", rating: { average: 4.2, count: 80 } },
    { name: "Aloo Paratha", price: 80, category: "Snacks", foodType: "veg", image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400", rating: { average: 4.4, count: 120 } },
    { name: "Upma", price: 45, category: "Snacks", foodType: "veg", image: "https://images.unsplash.com/photo-1567337710282-00832b415979?w=400", rating: { average: 3.9, count: 40 } },
    { name: "Puri Bhaji", price: 70, category: "Snacks", foodType: "veg", image: "https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400", rating: { average: 4.3, count: 95 } },

    // Chinese
    { name: "Veg Fried Rice", price: 150, category: "Chinese", foodType: "veg", image: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400", rating: { average: 4.0, count: 55 } },
    { name: "Chicken Manchurian", price: 220, category: "Chinese", foodType: "non veg", image: "https://images.unsplash.com/photo-1525755662778-989d0524087e?w=400", rating: { average: 4.2, count: 80 } },
    { name: "Veg Manchurian", price: 180, category: "Chinese", foodType: "veg", image: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400", rating: { average: 4.0, count: 65 } },
    { name: "Chilli Chicken", price: 240, category: "Chinese", foodType: "non veg", image: "https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400", rating: { average: 4.5, count: 150 } },
    { name: "Hakka Noodles", price: 160, category: "Chinese", foodType: "veg", image: "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400", rating: { average: 4.1, count: 70 } },

    // Pizza
    { name: "Margherita Pizza", price: 299, category: "Pizza", foodType: "veg", image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400", rating: { average: 4.3, count: 100 } },
    { name: "Pepperoni Pizza", price: 399, category: "Pizza", foodType: "non veg", image: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400", rating: { average: 4.6, count: 140 } },
    { name: "Farmhouse Pizza", price: 349, category: "Pizza", foodType: "veg", image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400", rating: { average: 4.2, count: 85 } },

    // Desserts
    { name: "Gulab Jamun", price: 80, category: "Desserts", foodType: "veg", image: "https://images.unsplash.com/photo-1666190050431-e9e4e0eb3c6e?w=400", rating: { average: 4.4, count: 95 } },
    { name: "Rasmalai", price: 100, category: "Desserts", foodType: "veg", image: "https://images.unsplash.com/photo-1571115764595-644a1f56a55c?w=400", rating: { average: 4.5, count: 110 } },
    { name: "Ice Cream Sundae", price: 150, category: "Desserts", foodType: "veg", image: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400", rating: { average: 4.3, count: 80 } },

    // Others
    { name: "Mango Lassi", price: 70, category: "Others", foodType: "veg", image: "https://images.unsplash.com/photo-1626201850129-a96cf664e51e?w=400", rating: { average: 4.2, count: 60 } },
    { name: "Masala Chai", price: 30, category: "Others", foodType: "veg", image: "https://images.unsplash.com/photo-1561336313-0bd5e0b27ec8?w=400", rating: { average: 4.0, count: 45 } },
];

async function seedDatabase() {
    try {
        console.log("🔄 Connecting to MongoDB...");
        await mongoose.connect(MONGODB_URL);
        console.log("✅ Connected to MongoDB");

        // Find an owner user or create a dummy owner
        let owner = await User.findOne({ role: "owner" });

        if (!owner) {
            console.log("⚠️ No owner found. Creating dummy owner...");
            owner = await User.create({
                fullName: "Demo Restaurant Owner",
                email: "owner@demo.com",
                mobile: "9999999999",
                password: "demo123",
                role: "owner"
            });
            console.log("✅ Created dummy owner");
        }

        // Clear existing dummy data
        console.log("🗑️ Clearing existing shops and items...");
        await Shop.deleteMany({});
        await Item.deleteMany({});

        // Create shops
        console.log("🏪 Creating shops...");
        const createdShops = [];
        for (const shopData of dummyShops) {
            const shop = await Shop.create({
                ...shopData,
                owner: owner._id
            });
            createdShops.push(shop);
            console.log(`  ✅ Created: ${shop.name}`);
        }

        // Create items and distribute among shops
        console.log("🍔 Creating food items...");
        for (let i = 0; i < dummyItems.length; i++) {
            const itemData = dummyItems[i];
            const shop = createdShops[i % createdShops.length];

            await Item.create({
                ...itemData,
                shop: shop._id
            });
            console.log(`  ✅ Created: ${itemData.name} (${shop.name})`);
        }

        console.log("\n🎉 Database seeded successfully!");
        console.log(`   📊 Created ${createdShops.length} shops`);
        console.log(`   📊 Created ${dummyItems.length} food items`);

        process.exit(0);

    } catch (error) {
        console.error("❌ Seed error:", error);
        process.exit(1);
    }
}

seedDatabase();
