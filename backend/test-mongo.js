import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

console.log("Testing MongoDB connection...");
console.log("Connection String:", process.env.MONGODB_URL);

mongoose.connect(process.env.MONGODB_URL, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    retryWrites: true,
    w: "majority",
    maxPoolSize: 10,
    minPoolSize: 2,
    family: 4,
})
  .then(() => {
    console.log("✅ MongoDB Connected Successfully!");
    process.exit(0);
  })
  .catch(err => {
    console.error("❌ Connection Error:", err.message);
    process.exit(1);
  });
