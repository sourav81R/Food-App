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
import { socketHandler } from "./socket.js";

dotenv.config();
const app = express();
const server = http.createServer(app);

const FRONTEND_ORIGIN = "https://petpooja-food-app.vercel.app"; // ✅ no slash!

// ✅ Socket.io CORS fix
const io = new Server(server, {
  cors: {
    origin: FRONTEND_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    transports: ["websocket", "polling"],
  },
  allowEIO3: true, // 👈 ensures compatibility with old socket.io clients
});

app.set("io", io);

// ✅ Express CORS fix
app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/shop", shopRouter);
app.use("/api/item", itemRouter);
app.use("/api/order", orderRouter);

// ✅ Handle socket connections
socketHandler(io);

// ✅ Handle OPTIONS requests explicitly
app.options("*", cors({ origin: FRONTEND_ORIGIN, credentials: true }));

const port = process.env.PORT || 5000;
server.listen(port, async () => {
  await connectDb();
  console.log(`✅ Server running on http://localhost:${port}`);
});
