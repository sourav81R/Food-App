// 🔥 Load environment variables FIRST
import dotenv from "dotenv";
dotenv.config();

// ❗ Validate required env variables early
if (!process.env.MONGODB_URL) {
  console.error("❌ MONGODB_URL is missing in .env file");
  process.exit(1);
}

import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import cookieParser from "cookie-parser";

import connectDb from "./config/db.js";
import authRouter from "./routes/auth.routes.js";
import userRouter from "./routes/user.routes.js";
import shopRouter from "./routes/shop.routes.js";
import itemRouter from "./routes/item.routes.js";
import orderRouter from "./routes/order.routes.js";
import favoriteRouter from "./routes/favorite.routes.js";
import couponRouter from "./routes/coupon.routes.js";
import { socketHandler } from "./socket.js";

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// ✅ Socket.io configuration
const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST"],
  },
});

// ✅ Make io accessible inside routes/controllers
app.set("io", io);

// ✅ Middleware
app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// ✅ Routes
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/shop", shopRouter);
app.use("/api/item", itemRouter);
app.use("/api/order", orderRouter);
app.use("/api/favorite", favoriteRouter);
app.use("/api/coupon", couponRouter);

// ✅ Socket handler
socketHandler(io);

// ✅ Start server AFTER DB connection
const startServer = async () => {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await connectDb();

    server.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server");
    console.error(error.message);
    process.exit(1);
  }
};

startServer();

// ✅ Graceful shutdown
process.on("SIGINT", () => {
  console.log("🛑 Server shutting down...");
  server.close(() => {
    process.exit(0);
  });
});
