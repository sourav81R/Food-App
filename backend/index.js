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
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import connectDb from "./config/db.js";
import authRouter from "./routes/auth.routes.js";
import userRouter from "./routes/user.routes.js";
import shopRouter from "./routes/shop.routes.js";
import itemRouter from "./routes/item.routes.js";
import orderRouter from "./routes/order.routes.js";
import favoriteRouter from "./routes/favorite.routes.js";
import couponRouter from "./routes/coupon.routes.js";
import adminRouter from "./routes/admin.routes.js";
import deliveryRouter from "./routes/delivery.routes.js";
import reviewRouter from "./routes/review.routes.js";
import searchRouter from "./routes/search.routes.js";
import walletRouter from "./routes/wallet.routes.js";
import notificationRouter from "./routes/notification.routes.js";
import { socketHandler } from "./socket.js";
import { bootstrapAdminFromEnv } from "./utils/bootstrapAdmin.js";
import { startScheduledOrdersJob } from "./utils/scheduledOrders.js";
import mongoSanitizeMiddleware from "./middlewares/mongoSanitize.js";

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const CLIENT_URLS = String(process.env.CLIENT_URLS || CLIENT_URL)
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean);
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many auth requests. Please try again later." }
});

const isTransientMongoError = (error) => {
  const text = String(error?.message || error || "").toLowerCase();
  return (
    text.includes("mongoserverselectionerror") ||
    text.includes("mongonetworktimeouterror") ||
    text.includes("server selection timed out") ||
    text.includes("replicasetnoprimary") ||
    text.includes("connection <monitor>")
  );
};

// ✅ Socket.io configuration
const io = new Server(server, {
  cors: {
    origin: CLIENT_URLS,
    credentials: true,
    methods: ["GET", "POST"],
  },
});

// ✅ Make io accessible inside routes/controllers
app.set("io", io);

// ✅ Middleware
app.use(
  cors({
    origin: CLIENT_URLS,
    credentials: true,
  })
);
app.use(helmet());
app.use(express.json());
app.use(mongoSanitizeMiddleware);
app.use(cookieParser());

// ✅ Routes
app.use("/api/auth", authRateLimiter, authRouter);
app.use("/api/user", userRouter);
app.use("/api/shop", shopRouter);
app.use("/api/item", itemRouter);
app.use("/api/order", orderRouter);
app.use("/api/favorite", favoriteRouter);
app.use("/api/coupon", couponRouter);
app.use("/api/admin", adminRouter);
app.use("/api/delivery", deliveryRouter);
app.use("/api/reviews", reviewRouter);
app.use("/api/search", searchRouter);
app.use("/api/wallet", walletRouter);
app.use("/api/notifications", notificationRouter);

// ✅ Socket handler
socketHandler(io);

const listenOnPort = (port) =>
  new Promise((resolve, reject) => {
    const handleError = (error) => {
      server.off("listening", handleListening);
      reject(error);
    };

    const handleListening = () => {
      server.off("error", handleError);
      resolve();
    };

    server.once("error", handleError);
    server.once("listening", handleListening);
    server.listen(port);
  });

// ✅ Start server AFTER DB connection
const startServer = async () => {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await connectDb();
    await bootstrapAdminFromEnv();
    startScheduledOrdersJob(app);

    await listenOnPort(PORT);
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  } catch (error) {
    if (error?.code === "EADDRINUSE") {
      console.error(`❌ Port ${PORT} is already in use. Stop the existing process or change PORT in backend/.env.`);
    } else {
      console.error("❌ Failed to start server");
      console.error(error.message);
    }
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

process.on("unhandledRejection", (reason) => {
  if (isTransientMongoError(reason)) {
    console.error("⚠️ Unhandled MongoDB rejection caught:", reason?.message || reason);
    return;
  }

  console.error("❌ Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (error) => {
  if (isTransientMongoError(error)) {
    console.error("⚠️ Uncaught MongoDB exception caught:", error?.message || error);
    return;
  }

  console.error("❌ Uncaught exception:", error);
  process.exit(1);
});
