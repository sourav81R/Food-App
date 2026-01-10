import express from "express";
import dotenv from "dotenv";
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

dotenv.config();

const app = express();
const server = http.createServer(app);

// ✅ Socket.io Configuration
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174", "https://food-app-frontend-lh2k.onrender.com"],
    credentials: true,
    methods: ["GET", "POST"],
  },
});

// ✅ Make Socket.io accessible in routes
app.set("io", io);

// ✅ Middleware setup
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174", "https://food-app-frontend-lh2k.onrender.com"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// ✅ Route setup
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/shop", shopRouter);
app.use("/api/item", itemRouter);
app.use("/api/order", orderRouter);
app.use("/api/favorite", favoriteRouter);
app.use("/api/coupon", couponRouter);

// ✅ Initialize socket handler
socketHandler(io);

// ✅ Start Server
const port = process.env.PORT || 5000;
server.listen(port, async () => {
  await connectDb();
  console.log(`✅ Server running on http://localhost:${port}`);
});
