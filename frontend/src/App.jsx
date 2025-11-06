import React, { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { io } from "socket.io-client";
import { setSocket } from "./redux/userSlice";

// 🧩 Pages
import SignUp from "./pages/SignUp";
import SignIn from "./pages/SignIn";
import ForgotPassword from "./pages/ForgotPassword";
import Home from "./pages/Home";
import CreateEditShop from "./pages/CreateEditShop";
import AddItem from "./pages/AddItem";
import EditItem from "./pages/EditItem";
import CartPage from "./pages/CartPage";
import CheckOut from "./pages/CheckOut";
import OrderPlaced from "./pages/OrderPlaced";
import MyOrders from "./pages/MyOrders";
import TrackOrderPage from "./pages/TrackOrderPage";
import Shop from "./pages/Shop";

// 🧠 Custom Hooks
import useGetCurrentUser from "./hooks/useGetCurrentUser";
import useGetCity from "./hooks/useGetCity";
import useGetMyshop from "./hooks/useGetMyShop";
import useGetShopByCity from "./hooks/useGetShopByCity";
import useGetItemsByCity from "./hooks/useGetItemsByCity";
import useGetMyOrders from "./hooks/useGetMyOrders";
import useUpdateLocation from "./hooks/useUpdateLocation";

// 🌍 Backend server URL (NO trailing slash ❌)
export const serverUrl = "https://petpooja-two.vercel.app";

function App() {
  const { userData } = useSelector((state) => state.user);
  const dispatch = useDispatch();

  // 🧠 Load user + data hooks
  useGetCurrentUser();
  useUpdateLocation();
  useGetCity();
  useGetMyshop();
  useGetShopByCity();
  useGetItemsByCity();
  useGetMyOrders();

  // ⚡ Setup Socket.io connection
  useEffect(() => {
    // Initialize socket connection with full CORS compatibility
    const socketInstance = io(serverUrl, {
      withCredentials: true,
      transports: ["websocket", "polling"], // ✅ fixes CORS/polling errors
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    // Save socket instance globally
    dispatch(setSocket(socketInstance));

    // When connected, identify user
    socketInstance.on("connect", () => {
      console.log("✅ Socket connected:", socketInstance.id);
      if (userData?._id) {
        socketInstance.emit("identity", { userId: userData._id });
      }
    });

    // Handle connection errors gracefully
    socketInstance.on("connect_error", (err) => {
      console.error("⚠️ Socket connection error:", err.message);
    });

    // Cleanup on component unmount
    return () => {
      socketInstance.disconnect();
      console.log("🔌 Socket disconnected");
    };
  }, [userData?._id, dispatch]);

  // 🧭 Route Protection
  return (
    <Routes>
      <Route
        path="/signup"
        element={!userData ? <SignUp /> : <Navigate to="/" />}
      />
      <Route
        path="/signin"
        element={!userData ? <SignIn /> : <Navigate to="/" />}
      />
      <Route
        path="/forgot-password"
        element={!userData ? <ForgotPassword /> : <Navigate to="/" />}
      />

      {/* ✅ Protected Routes */}
      <Route
        path="/"
        element={userData ? <Home /> : <Navigate to="/signin" />}
      />
      <Route
        path="/create-edit-shop"
        element={userData ? <CreateEditShop /> : <Navigate to="/signin" />}
      />
      <Route
        path="/add-item"
        element={userData ? <AddItem /> : <Navigate to="/signin" />}
      />
      <Route
        path="/edit-item/:itemId"
        element={userData ? <EditItem /> : <Navigate to="/signin" />}
      />
      <Route
        path="/cart"
        element={userData ? <CartPage /> : <Navigate to="/signin" />}
      />
      <Route
        path="/checkout"
        element={userData ? <CheckOut /> : <Navigate to="/signin" />}
      />
      <Route
        path="/order-placed"
        element={userData ? <OrderPlaced /> : <Navigate to="/signin" />}
      />
      <Route
        path="/my-orders"
        element={userData ? <MyOrders /> : <Navigate to="/signin" />}
      />
      <Route
        path="/track-order/:orderId"
        element={userData ? <TrackOrderPage /> : <Navigate to="/signin" />}
      />
      <Route
        path="/shop/:shopId"
        element={userData ? <Shop /> : <Navigate to="/signin" />}
      />
    </Routes>
  );
}

export default App;
