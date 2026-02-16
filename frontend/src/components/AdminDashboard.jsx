import axios from "axios";
import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { serverUrl } from "../App";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import Nav from "./Nav";

const roleOptions = ["user", "owner", "deliveryBoy", "admin"];

const getRoleLabel = (role) => {
  if (role === "deliveryBoy") return "Delivery";
  if (!role) return "N/A";
  return role.charAt(0).toUpperCase() + role.slice(1);
};

const formatMoney = (value) => `INR ${Number(value || 0).toLocaleString("en-IN")}`;
const hasRequiredUserData = (user) => {
  if (typeof user?.isDataUpdated === "boolean") return user.isDataUpdated;
  const fullNameOk = typeof user?.fullName === "string" && user.fullName.trim().length > 0;
  const emailOk = typeof user?.email === "string" && user.email.trim().length > 0;
  const mobileDigits = (user?.mobile || "").toString().replace(/\D/g, "");
  const mobileOk = mobileDigits.length >= 10 && !/^0+$/.test(mobileDigits);
  return fullNameOk && emailOk && mobileOk;
};

function AdminDashboard() {
  const { isDark } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();
  const { userData } = useSelector((state) => state.user);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("users");
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [shops, setShops] = useState([]);
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [busyKey, setBusyKey] = useState("");

  const tabs = useMemo(
    () => [
      { id: "users", label: `Users (${users.length})` },
      { id: "shops", label: `Shops (${shops.length})` },
      { id: "items", label: `Items (${items.length})` },
      { id: "orders", label: `Orders (${orders.length})` },
    ],
    [users.length, shops.length, items.length, orders.length]
  );

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [overviewRes, usersRes, shopsRes, itemsRes, ordersRes] = await Promise.all([
        axios.get(`${serverUrl}/api/admin/overview`, { withCredentials: true }),
        axios.get(`${serverUrl}/api/admin/users`, { withCredentials: true }),
        axios.get(`${serverUrl}/api/admin/shops`, { withCredentials: true }),
        axios.get(`${serverUrl}/api/admin/items`, { withCredentials: true }),
        axios.get(`${serverUrl}/api/admin/orders`, { withCredentials: true }),
      ]);
      setOverview(overviewRes.data);
      setUsers(usersRes.data);
      setShops(shopsRes.data);
      setItems(itemsRes.data);
      setOrders(ordersRes.data);
    } catch (error) {
      const message = error?.response?.data?.message || "Unable to load admin dashboard";
      toast.error(message);
      if (error?.response?.status === 403) {
        navigate("/");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userData?.role !== "admin") return;
    fetchAdminData();
  }, [userData?.role]);

  const handleDelete = async (resource, id, label) => {
    const ok = window.confirm(`Delete ${label}? This action cannot be undone.`);
    if (!ok) return;

    const key = `${resource}-${id}`;
    setBusyKey(key);
    try {
      await axios.delete(`${serverUrl}/api/admin/${resource}/${id}`, { withCredentials: true });
      toast.success(`${label} deleted`);
      await fetchAdminData();
    } catch (error) {
      toast.error(error?.response?.data?.message || `Failed to delete ${label}`);
    } finally {
      setBusyKey("");
    }
  };

  const handleSuspend = async (user) => {
    const nextSuspended = !Boolean(user?.isSuspended);
    const actionText = nextSuspended ? "suspend" : "unsuspend";
    const ok = window.confirm(`Do you want to ${actionText} ${user.fullName || user.email}?`);
    if (!ok) return;

    const key = `suspend-${user._id}`;
    setBusyKey(key);
    try {
      const { data } = await axios.patch(
        `${serverUrl}/api/admin/users/${user._id}/suspend`,
        { suspended: nextSuspended },
        { withCredentials: true }
      );
      setUsers((prev) => prev.map((u) => (u._id === user._id ? data.user : u)));
      toast.success(nextSuspended ? "Account suspended" : "Account unsuspended");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update account status");
    } finally {
      setBusyKey("");
    }
  };

  const handleClearAllUsers = async () => {
    const ok = window.confirm("Clear all non-admin users? This action cannot be undone.");
    if (!ok) return;

    setBusyKey("users-clear-all");
    try {
      const { data } = await axios.delete(`${serverUrl}/api/admin/users`, { withCredentials: true });
      toast.success(data?.message || "Users cleared");
      await fetchAdminData();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to clear users");
    } finally {
      setBusyKey("");
    }
  };

  const handleRoleChange = async (userId, role) => {
    const key = `role-${userId}`;
    setBusyKey(key);
    try {
      const { data } = await axios.patch(
        `${serverUrl}/api/admin/users/${userId}/role`,
        { role },
        { withCredentials: true }
      );
      setUsers((prev) => prev.map((user) => (user._id === userId ? data.user : user)));
      toast.success("Role updated");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update role");
    } finally {
      setBusyKey("");
    }
  };

  if (!userData || userData.role !== "admin") return null;

  return (
    <div className={`w-full min-h-screen ${isDark ? "bg-[#1a1a2e]" : "bg-[#fff9f6]"}`}>
      <Nav />
      <div className="max-w-7xl mx-auto px-4 pt-[95px] pb-8">
        <h1 className={`text-2xl sm:text-3xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>Admin Panel</h1>
        <p className={`text-sm mt-1 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
          Manage all users, shops, food items, and orders
        </p>

        {!loading && overview?.cards && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
            <div className={`rounded-xl p-4 border ${isDark ? "bg-[#16213e] border-[#374151] text-white" : "bg-white border-gray-100 text-gray-900"}`}>
              <p className="text-sm opacity-75">Total Users</p>
              <p className="text-2xl font-bold mt-1">{overview.cards.totalUsers}</p>
            </div>
            <div className={`rounded-xl p-4 border ${isDark ? "bg-[#16213e] border-[#374151] text-white" : "bg-white border-gray-100 text-gray-900"}`}>
              <p className="text-sm opacity-75">Total Shops</p>
              <p className="text-2xl font-bold mt-1">{overview.cards.totalShops}</p>
            </div>
            <div className={`rounded-xl p-4 border ${isDark ? "bg-[#16213e] border-[#374151] text-white" : "bg-white border-gray-100 text-gray-900"}`}>
              <p className="text-sm opacity-75">Total Orders</p>
              <p className="text-2xl font-bold mt-1">{overview.cards.totalOrders}</p>
            </div>
            <div className={`rounded-xl p-4 border ${isDark ? "bg-[#16213e] border-[#374151] text-white" : "bg-white border-gray-100 text-gray-900"}`}>
              <p className="text-sm opacity-75">Revenue</p>
              <p className="text-2xl font-bold mt-1">{formatMoney(overview.cards.totalRevenue)}</p>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? "bg-[#ff4d2d] text-white"
                    : isDark
                      ? "bg-[#16213e] border border-[#374151] text-gray-200"
                      : "bg-white border border-gray-200 text-gray-700"
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {activeTab === "users" && (
            <button
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-700 text-white disabled:opacity-60"
              disabled={busyKey === "users-clear-all"}
              onClick={handleClearAllUsers}
            >
              Clear All
            </button>
          )}
        </div>

        <div className={`mt-4 rounded-xl border overflow-hidden ${isDark ? "bg-[#16213e] border-[#374151]" : "bg-white border-gray-100"}`}>
          {loading && (
            <div className="p-6 text-center">
              <div className="w-8 h-8 border-4 border-[#ff4d2d] border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          )}

          {!loading && activeTab === "users" && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px]">
                <thead className={isDark ? "bg-[#0f3460] text-gray-200" : "bg-gray-50 text-gray-700"}>
                  <tr>
                    <th className="text-left px-4 py-3">Name</th>
                    <th className="text-left px-4 py-3">Email</th>
                    <th className="text-left px-4 py-3">Mobile</th>
                    <th className="text-left px-4 py-3">Role</th>
                    <th className="text-left px-4 py-3">Joined</th>
                    <th className="text-center px-4 py-3 w-[180px]">Data Updated</th>
                    <th className="text-center px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id} className={`border-t ${isDark ? "border-[#374151] text-gray-100" : "border-gray-100 text-gray-800"}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span>{user.fullName}</span>
                          {user.isSuspended && (
                            <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-700">Suspended</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">{user.email}</td>
                      <td className="px-4 py-3">{user.mobile}</td>
                      <td className="px-4 py-3">
                        <select
                          className={`px-2 py-1 rounded border text-sm ${isDark ? "bg-[#1a1a2e] border-[#4b5563]" : "bg-white border-gray-200"}`}
                          value={user.role}
                          disabled={busyKey === `role-${user._id}`}
                          onChange={(e) => handleRoleChange(user._id, e.target.value)}
                        >
                          {roleOptions.map((role) => (
                            <option key={role} value={role}>
                              {getRoleLabel(role)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 w-[180px]">
                        <div className="flex justify-center">
                          {hasRequiredUserData(user) ? (
                            <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-700">Updated</span>
                          ) : (
                            <span className="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800">Not Updated</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            className={`px-3 py-1 rounded text-white text-sm ${
                              user.isSuspended ? "bg-slate-600 hover:bg-slate-700" : "bg-amber-500 hover:bg-amber-600"
                            }`}
                            disabled={busyKey === `suspend-${user._id}` || user._id === userData._id}
                            onClick={() => handleSuspend(user)}
                          >
                            {user.isSuspended ? "Unsuspend" : "Suspend"}
                          </button>
                          <button
                            className="px-3 py-1 rounded bg-red-500 text-white text-sm"
                            disabled={busyKey === `users-${user._id}` || user._id === userData._id}
                            onClick={() => handleDelete("users", user._id, user.fullName)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && activeTab === "shops" && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className={isDark ? "bg-[#0f3460] text-gray-200" : "bg-gray-50 text-gray-700"}>
                  <tr>
                    <th className="text-left px-4 py-3">Shop</th>
                    <th className="text-left px-4 py-3">Owner</th>
                    <th className="text-left px-4 py-3">City</th>
                    <th className="text-left px-4 py-3">Items</th>
                    <th className="text-left px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shops.map((shop) => (
                    <tr key={shop._id} className={`border-t ${isDark ? "border-[#374151] text-gray-100" : "border-gray-100 text-gray-800"}`}>
                      <td className="px-4 py-3">{shop.name}</td>
                      <td className="px-4 py-3">{shop?.owner?.fullName || "N/A"}</td>
                      <td className="px-4 py-3">{shop.city}</td>
                      <td className="px-4 py-3">{shop.itemCount}</td>
                      <td className="px-4 py-3">
                        <button
                          className="px-3 py-1 rounded bg-red-500 text-white text-sm"
                          disabled={busyKey === `shops-${shop._id}`}
                          onClick={() => handleDelete("shops", shop._id, shop.name)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && activeTab === "items" && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className={isDark ? "bg-[#0f3460] text-gray-200" : "bg-gray-50 text-gray-700"}>
                  <tr>
                    <th className="text-left px-4 py-3">Item</th>
                    <th className="text-left px-4 py-3">Category</th>
                    <th className="text-left px-4 py-3">Price</th>
                    <th className="text-left px-4 py-3">Shop</th>
                    <th className="text-left px-4 py-3">Owner</th>
                    <th className="text-left px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item._id} className={`border-t ${isDark ? "border-[#374151] text-gray-100" : "border-gray-100 text-gray-800"}`}>
                      <td className="px-4 py-3">{item.name}</td>
                      <td className="px-4 py-3">{item.category}</td>
                      <td className="px-4 py-3">{formatMoney(item.price)}</td>
                      <td className="px-4 py-3">{item?.shop?.name || "N/A"}</td>
                      <td className="px-4 py-3">{item?.shop?.owner?.fullName || "N/A"}</td>
                      <td className="px-4 py-3">
                        <button
                          className="px-3 py-1 rounded bg-red-500 text-white text-sm"
                          disabled={busyKey === `items-${item._id}`}
                          onClick={() => handleDelete("items", item._id, item.name)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && activeTab === "orders" && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px]">
                <thead className={isDark ? "bg-[#0f3460] text-gray-200" : "bg-gray-50 text-gray-700"}>
                  <tr>
                    <th className="text-left px-4 py-3">Order ID</th>
                    <th className="text-left px-4 py-3">Customer</th>
                    <th className="text-left px-4 py-3">Amount</th>
                    <th className="text-left px-4 py-3">Payment</th>
                    <th className="text-left px-4 py-3">Statuses</th>
                    <th className="text-left px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order._id} className={`border-t ${isDark ? "border-[#374151] text-gray-100" : "border-gray-100 text-gray-800"}`}>
                      <td className="px-4 py-3">{order._id.slice(-8)}</td>
                      <td className="px-4 py-3">{order?.user?.fullName || "N/A"}</td>
                      <td className="px-4 py-3">{formatMoney(order.totalAmount)}</td>
                      <td className="px-4 py-3">{order.payment ? "Paid" : "Pending"}</td>
                      <td className="px-4 py-3">
                        {(order.shopOrders || []).map((shopOrder) => shopOrder.status).join(", ")}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          className="px-3 py-1 rounded bg-red-500 text-white text-sm"
                          disabled={busyKey === `orders-${order._id}`}
                          onClick={() => handleDelete("orders", order._id, `order ${order._id.slice(-8)}`)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
