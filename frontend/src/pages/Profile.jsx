import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import Nav from "../components/Nav";
import { useTheme } from "../context/ThemeContext";
import { isAdminRole, isDeliveryRole, isOwnerRole, isUserRole, normalizeClientRole } from "../utils/roles";
import { serverUrl } from "../App";
import { setAddresses, setWalletBalance, setWalletTransactions } from "../redux/userSlice";

const getRoleLabel = (role) => {
  const normalizedRole = normalizeClientRole(role);
  if (normalizedRole === "deliveryBoy") return "Delivery Partner";
  if (!normalizedRole) return "N/A";
  return normalizedRole.charAt(0).toUpperCase() + normalizedRole.slice(1);
};

function Profile() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isDark } = useTheme();
  const { userData, currentCity, currentState, currentAddress, addresses, walletBalance, walletTransactions } = useSelector((state) => state.user);
  const { myShopData, myShops } = useSelector((state) => state.owner);
  const normalizedRole = normalizeClientRole(userData?.role);

  const joinedDate = userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString() : "N/A";
  const deliveryLat = userData?.location?.coordinates?.[1];
  const deliveryLon = userData?.location?.coordinates?.[0];

  useEffect(() => {
    const fetchExtras = async () => {
      try {
        const [walletRes, addressRes] = await Promise.all([
          axios.get(`${serverUrl}/api/wallet/transactions`, { withCredentials: true }),
          axios.get(`${serverUrl}/api/user/addresses`, { withCredentials: true })
        ]);
        dispatch(setWalletBalance(walletRes.data?.walletBalance || 0));
        dispatch(setWalletTransactions(walletRes.data?.transactions || []));
        dispatch(setAddresses(addressRes.data || []));
      } catch (error) {
        console.log(error);
      }
    };

    if (userData?._id) {
      fetchExtras();
    }
  }, [userData?._id, dispatch]);

  if (!userData) return null;

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

        {isUserRole(normalizedRole) && (
          <div className={`rounded-2xl border p-6 mt-5 ${isDark ? "bg-[#16213e] border-[#374151] text-white" : "bg-white border-gray-100 text-gray-900"}`}>
            <h2 className="text-xl font-bold">User Actions</h2>
            <div className="flex flex-wrap gap-3 mt-4">
              <button className="px-4 py-2 rounded-lg bg-[#ff4d2d] text-white font-medium" onClick={() => navigate("/my-orders")}>My Orders</button>
              <button className="px-4 py-2 rounded-lg bg-[#ff4d2d]/10 text-[#ff4d2d] font-medium" onClick={() => navigate("/favorites")}>Favorites</button>
              <button className="px-4 py-2 rounded-lg bg-[#ff4d2d]/10 text-[#ff4d2d] font-medium" onClick={() => navigate("/cart")}>Cart</button>
            </div>
          </div>
        )}

        {isUserRole(normalizedRole) && (
          <div className={`rounded-2xl border p-6 mt-5 ${isDark ? "bg-[#16213e] border-[#374151] text-white" : "bg-white border-gray-100 text-gray-900"}`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">Wallet</h2>
                <p className={`mt-2 ${isDark ? "text-gray-300" : "text-gray-600"}`}>Balance and refund history</p>
              </div>
              <p className="text-2xl font-bold text-[#ff4d2d]">Rs {Number(walletBalance || 0).toFixed(2)}</p>
            </div>

            <div className="mt-4 space-y-3">
              {walletTransactions.length === 0 && (
                <p className={isDark ? "text-gray-300" : "text-gray-600"}>No wallet transactions yet.</p>
              )}
              {walletTransactions.map((transaction) => (
                <div key={transaction._id} className={`rounded-xl border p-4 ${isDark ? "border-[#374151] bg-[#0f3460]" : "border-gray-100 bg-orange-50"}`}>
                  <div className="flex justify-between gap-3">
                    <p className="font-semibold capitalize">{transaction.type}</p>
                    <p className={transaction.direction === "credit" ? "text-green-500 font-semibold" : "text-red-500 font-semibold"}>
                      {transaction.direction === "credit" ? "+" : "-"} Rs {transaction.amount}
                    </p>
                  </div>
                  <p className={`text-sm mt-2 ${isDark ? "text-gray-300" : "text-gray-600"}`}>{transaction.description || "Wallet activity"}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {isUserRole(normalizedRole) && (
          <div className={`rounded-2xl border p-6 mt-5 ${isDark ? "bg-[#16213e] border-[#374151] text-white" : "bg-white border-gray-100 text-gray-900"}`}>
            <h2 className="text-xl font-bold">Saved Addresses</h2>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {addresses.length === 0 && (
                <p className={isDark ? "text-gray-300" : "text-gray-600"}>No saved addresses yet.</p>
              )}
              {addresses.map((savedAddress) => (
                <div key={savedAddress._id} className={`rounded-xl border p-4 ${isDark ? "border-[#374151] bg-[#0f3460]" : "border-gray-100 bg-orange-50"}`}>
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{savedAddress.label}</p>
                    {savedAddress.isDefault && <span className="text-xs text-[#ff4d2d] font-semibold">Default</span>}
                  </div>
                  <p className={`text-sm mt-2 ${isDark ? "text-gray-300" : "text-gray-600"}`}>{savedAddress.fullAddress}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {isOwnerRole(normalizedRole) && (
          <div className={`rounded-2xl border p-6 mt-5 ${isDark ? "bg-[#16213e] border-[#374151] text-white" : "bg-white border-gray-100 text-gray-900"}`}>
            <h2 className="text-xl font-bold">Owner Panel</h2>
            <p className={`mt-2 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
              {myShopData ? `Managing ${myShopData.name} • ${myShops.length} shop${myShops.length === 1 ? "" : "s"} total` : "No shop created yet"}
            </p>
            <div className="flex flex-wrap gap-3 mt-4">
              <button className="px-4 py-2 rounded-lg bg-[#ff4d2d] text-white font-medium" onClick={() => navigate(myShopData?._id ? `/create-edit-shop?shopId=${myShopData._id}` : "/create-edit-shop?mode=create")}>
                {myShopData ? "Manage Shop" : "Create Shop"}
              </button>
              <button className="px-4 py-2 rounded-lg bg-[#ff4d2d]/10 text-[#ff4d2d] font-medium" onClick={() => navigate("/create-edit-shop?mode=create")}>
                Add Another Shop
              </button>
              {myShopData && <button className="px-4 py-2 rounded-lg bg-[#ff4d2d]/10 text-[#ff4d2d] font-medium" onClick={() => navigate(`/add-item?shopId=${myShopData._id}`)}>Add Item</button>}
              <button className="px-4 py-2 rounded-lg bg-[#ff4d2d]/10 text-[#ff4d2d] font-medium" onClick={() => navigate("/my-orders")}>Shop Orders</button>
            </div>
          </div>
        )}

        {isDeliveryRole(normalizedRole) && (
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

        {isAdminRole(normalizedRole) && (
          <div className={`rounded-2xl border p-6 mt-5 ${isDark ? "bg-[#16213e] border-[#374151] text-white" : "bg-white border-gray-100 text-gray-900"}`}>
            <h2 className="text-xl font-bold">Admin Panel</h2>
            <p className={`mt-2 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
              Manage users, shops, items, and orders from a single dashboard.
            </p>
            <div className="flex flex-wrap gap-3 mt-4">
              <button className="px-4 py-2 rounded-lg bg-[#ff4d2d] text-white font-medium" onClick={() => navigate("/admin")}>
                Open Admin Panel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Profile;
