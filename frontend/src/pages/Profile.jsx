import React from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Nav from "../components/Nav";
import { useTheme } from "../context/ThemeContext";

const getRoleLabel = (role) => {
  if (role === "deliveryBoy") return "Delivery Partner";
  if (!role) return "N/A";
  return role.charAt(0).toUpperCase() + role.slice(1);
};

function Profile() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { userData, currentCity, currentState, currentAddress } = useSelector((state) => state.user);
  const { myShopData } = useSelector((state) => state.owner);

  if (!userData) return null;

  const joinedDate = userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString() : "N/A";
  const deliveryLat = userData?.location?.coordinates?.[1];
  const deliveryLon = userData?.location?.coordinates?.[0];

  return (
    <div className={`w-full min-h-screen pt-[95px] px-4 pb-10 ${isDark ? "bg-[#1a1a2e]" : "bg-[#fff9f6]"}`}>
      <Nav />

      <div className="w-full max-w-4xl mx-auto">
        <div className={`rounded-2xl border p-6 shadow-sm ${isDark ? "bg-[#16213e] border-[#374151] text-white" : "bg-white border-gray-100 text-gray-900"}`}>
          <h1 className="text-2xl font-bold">My Profile</h1>
          <p className={`text-sm mt-1 ${isDark ? "text-gray-300" : "text-gray-500"}`}>Account details and quick actions</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            <div>
              <p className={`text-xs uppercase tracking-wide ${isDark ? "text-gray-400" : "text-gray-500"}`}>Full Name</p>
              <p className="font-semibold">{userData.fullName || "N/A"}</p>
            </div>
            <div>
              <p className={`text-xs uppercase tracking-wide ${isDark ? "text-gray-400" : "text-gray-500"}`}>Role</p>
              <p className="font-semibold">{getRoleLabel(userData.role)}</p>
            </div>
            <div>
              <p className={`text-xs uppercase tracking-wide ${isDark ? "text-gray-400" : "text-gray-500"}`}>Email</p>
              <p className="font-semibold break-all">{userData.email || "N/A"}</p>
            </div>
            <div>
              <p className={`text-xs uppercase tracking-wide ${isDark ? "text-gray-400" : "text-gray-500"}`}>Mobile</p>
              <p className="font-semibold">{userData.mobile || "N/A"}</p>
            </div>
            <div>
              <p className={`text-xs uppercase tracking-wide ${isDark ? "text-gray-400" : "text-gray-500"}`}>Joined</p>
              <p className="font-semibold">{joinedDate}</p>
            </div>
            <div>
              <p className={`text-xs uppercase tracking-wide ${isDark ? "text-gray-400" : "text-gray-500"}`}>City / State</p>
              <p className="font-semibold">{currentCity || "N/A"}{currentState ? `, ${currentState}` : ""}</p>
            </div>
          </div>

          <div className="mt-5">
            <p className={`text-xs uppercase tracking-wide ${isDark ? "text-gray-400" : "text-gray-500"}`}>Current Address</p>
            <p className="font-semibold">{currentAddress || "Not set"}</p>
          </div>
        </div>

        {userData.role === "user" && (
          <div className={`rounded-2xl border p-6 mt-5 ${isDark ? "bg-[#16213e] border-[#374151] text-white" : "bg-white border-gray-100 text-gray-900"}`}>
            <h2 className="text-xl font-bold">User Actions</h2>
            <div className="flex flex-wrap gap-3 mt-4">
              <button className="px-4 py-2 rounded-lg bg-[#ff4d2d] text-white font-medium" onClick={() => navigate("/my-orders")}>My Orders</button>
              <button className="px-4 py-2 rounded-lg bg-[#ff4d2d]/10 text-[#ff4d2d] font-medium" onClick={() => navigate("/favorites")}>Favorites</button>
              <button className="px-4 py-2 rounded-lg bg-[#ff4d2d]/10 text-[#ff4d2d] font-medium" onClick={() => navigate("/cart")}>Cart</button>
            </div>
          </div>
        )}

        {userData.role === "owner" && (
          <div className={`rounded-2xl border p-6 mt-5 ${isDark ? "bg-[#16213e] border-[#374151] text-white" : "bg-white border-gray-100 text-gray-900"}`}>
            <h2 className="text-xl font-bold">Owner Panel</h2>
            <p className={`mt-2 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
              {myShopData ? `Shop: ${myShopData.name}` : "No shop created yet"}
            </p>
            <div className="flex flex-wrap gap-3 mt-4">
              <button className="px-4 py-2 rounded-lg bg-[#ff4d2d] text-white font-medium" onClick={() => navigate("/create-edit-shop")}>
                {myShopData ? "Manage Shop" : "Create Shop"}
              </button>
              {myShopData && <button className="px-4 py-2 rounded-lg bg-[#ff4d2d]/10 text-[#ff4d2d] font-medium" onClick={() => navigate("/add-item")}>Add Item</button>}
              <button className="px-4 py-2 rounded-lg bg-[#ff4d2d]/10 text-[#ff4d2d] font-medium" onClick={() => navigate("/my-orders")}>Shop Orders</button>
            </div>
          </div>
        )}

        {userData.role === "deliveryBoy" && (
          <div className={`rounded-2xl border p-6 mt-5 ${isDark ? "bg-[#16213e] border-[#374151] text-white" : "bg-white border-gray-100 text-gray-900"}`}>
            <h2 className="text-xl font-bold">Delivery Panel</h2>
            <p className={`mt-2 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
              Live location: {Number.isFinite(deliveryLat) && Number.isFinite(deliveryLon) ? `${deliveryLat}, ${deliveryLon}` : "Not available"}
            </p>
            <div className="flex flex-wrap gap-3 mt-4">
              <button className="px-4 py-2 rounded-lg bg-[#ff4d2d] text-white font-medium" onClick={() => navigate("/")}>Delivery Dashboard</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Profile;
