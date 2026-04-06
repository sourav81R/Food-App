import mongoose from "mongoose";

let mongoListenersAttached = false;

const getSanitizedMongoUri = (uri = "") => {
  try {
    const parsed = new URL(uri);
    if (parsed.username || parsed.password) {
      parsed.username = parsed.username ? "***" : "";
      parsed.password = parsed.password ? "***" : "";
    }
    return parsed.toString();
  } catch {
    return String(uri || "").replace(/\/\/([^:]+):([^@]+)@/, "//***:***@");
  }
};

const attachMongoListeners = () => {
  if (mongoListenersAttached) return;
  mongoListenersAttached = true;

  mongoose.connection.on("connected", () => {
    console.log("✅ MongoDB connected");
  });

  mongoose.connection.on("reconnected", () => {
    console.log("🔁 MongoDB reconnected");
  });

  mongoose.connection.on("disconnected", () => {
    console.error("⚠️ MongoDB disconnected");
  });

  mongoose.connection.on("error", (err) => {
    console.error("❌ MongoDB error:", err.message);
  });
};

const connectDb = async () => {
  try {
    if (!process.env.MONGODB_URL) {
      throw new Error("MONGODB_URL is missing in environment variables");
    }

    attachMongoListeners();

    if (mongoose.connection.readyState === 1) {
      return mongoose.connection;
    }

    console.log("📌 Using URI:", getSanitizedMongoUri(process.env.MONGODB_URL));

    await mongoose.connect(process.env.MONGODB_URL, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      heartbeatFrequencyMS: 10000,
      retryReads: true,
    });
    return mongoose.connection;

  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    throw error;
  }
};

export default connectDb;
