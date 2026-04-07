import axios from "axios";
import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { serverUrl } from "../App";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import Nav from "./Nav";
import { FaChartLine, FaMoneyBillWave, FaReceipt, FaStore, FaTrash, FaUserShield, FaUsers } from "react-icons/fa";

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
  const [confirmDialog, setConfirmDialog] = useState(null);

  const tabs = useMemo(
    () => [
      { id: "users", label: `Users (${users.length})`, icon: FaUsers },
      { id: "shops", label: `Shops (${shops.length})`, icon: FaStore },
      { id: "items", label: `Items (${items.length})`, icon: FaReceipt },
      { id: "orders", label: `Orders (${orders.length})`, icon: FaChartLine },
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

  const handleDeleteAction = async (resource, id, label) => {
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

  const handleDelete = (resource, id, label) => {
    setConfirmDialog({
      tone: "danger",
      icon: FaTrash,
      eyebrow: "Delete Record",
      title: `Delete ${label}?`,
      description: "This action cannot be undone. The selected record will be permanently removed from the admin panel.",
      confirmLabel: "Delete Now",
      cancelLabel: "Keep Record",
      targetLabel: label,
      actionLabel: "Requested action",
      summary: "Permanent removal from database",
      onConfirm: () => handleDeleteAction(resource, id, label),
    });
  };

  const handleSuspendAction = async (user) => {
    const nextSuspended = !Boolean(user?.isSuspended);
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

  const handleSuspend = (user) => {
    const nextSuspended = !Boolean(user?.isSuspended);
    const actionText = nextSuspended ? "Suspend user" : "Restore account";
    setConfirmDialog({
      tone: nextSuspended ? "warning" : "info",
      icon: FaUserShield,
      eyebrow: nextSuspended ? "Account Control" : "Account Restore",
      title: `${actionText}?`,
      description: nextSuspended
        ? `${user.fullName || user.email} will lose access until you restore the account.`
        : `${user.fullName || user.email} will regain access to the platform.`,
      confirmLabel: nextSuspended ? "Suspend Account" : "Restore Account",
      cancelLabel: "Cancel",
      targetLabel: user.fullName || user.email,
      actionLabel: "Selected user",
      summary: nextSuspended ? "Access will be blocked" : "Access will be restored",
      onConfirm: () => handleSuspendAction(user),
    });
  };

  const handleClearAllUsersAction = async () => {
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

  const handleClearAllUsers = () => {
    setConfirmDialog({
      tone: "danger",
      icon: FaTrash,
      eyebrow: "Bulk Delete",
      title: "Clear all non-admin users?",
      description: "This removes every non-admin user from the system at once. Admin accounts will remain untouched.",
      confirmLabel: "Clear All Users",
      cancelLabel: "Keep Users",
      targetLabel: `${users.filter((user) => user.role !== "admin").length} user accounts`,
      actionLabel: "Removal scope",
      summary: "Permanent bulk deletion",
      onConfirm: handleClearAllUsersAction,
    });
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
    <div className={`w-full min-h-screen ${isDark ? "bg-[linear-gradient(180deg,#090f1f_0%,#10172a_45%,#0a1020_100%)]" : "bg-[linear-gradient(180deg,#fff7f2_0%,#fffaf7_38%,#ffffff_100%)]"}`}>
      <Nav />
      <div className="max-w-7xl mx-auto px-4 pt-[95px] pb-8 space-y-5">
        <div className={`overflow-hidden rounded-[30px] border ${isDark ? "border-white/10 bg-[linear-gradient(180deg,rgba(18,27,48,0.96),rgba(11,18,33,0.98))] shadow-[0_24px_80px_rgba(2,6,23,0.34)]" : "border-orange-100 bg-white shadow-[0_22px_70px_rgba(15,23,42,0.08)]"}`}>
          <div className={`${isDark ? "bg-[radial-gradient(circle_at_top_left,_rgba(255,120,82,0.18),_transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.02),rgba(255,255,255,0))]" : "bg-[radial-gradient(circle_at_top_left,_rgba(255,120,82,0.22),_transparent_46%),linear-gradient(135deg,_#fff5ef,_#ffffff_62%)]"} px-5 py-5 sm:px-7 sm:py-6`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#ff4d2d]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ff6b43]">
                  <FaUserShield />
                  Control Center
                </div>
                <h1 className={`mt-3 text-3xl sm:text-4xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>Admin Panel</h1>
                <p className={`mt-2 text-sm sm:text-base leading-7 ${isDark ? "text-gray-300" : "text-slate-500"}`}>
                  Manage all users, shops, food items, and orders from a cleaner command dashboard with faster oversight and sharper visual hierarchy.
                </p>
              </div>

              {!loading && overview?.cards && (
                <div className={`rounded-[24px] border px-5 py-4 min-w-[250px] ${isDark ? "border-white/10 bg-white/5" : "border-orange-100 bg-white/90"} shadow-sm`}>
                  <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${isDark ? "text-gray-300" : "text-slate-400"}`}>Live Snapshot</p>
                  <p className={`mt-2 text-lg font-bold ${isDark ? "text-white" : "text-slate-900"}`}>Revenue At A Glance</p>
                  <p className="mt-2 text-3xl font-bold text-[#ff4d2d]">{formatMoney(overview.cards.totalRevenue)}</p>
                  <p className={`mt-2 text-sm ${isDark ? "text-gray-400" : "text-slate-500"}`}>Across {overview.cards.totalOrders} total orders.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {!loading && overview?.cards && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className={`rounded-[24px] border p-5 ${isDark ? "bg-[#16213e] border-[#374151] text-white" : "bg-white border-orange-100 text-slate-900"} shadow-[0_14px_40px_rgba(15,23,42,0.06)]`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-70">Total Users</p>
                  <p className="text-3xl font-bold mt-2">{overview.cards.totalUsers}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ff4d2d]/10 text-[#ff4d2d]">
                  <FaUsers size={18} />
                </div>
              </div>
            </div>
            <div className={`rounded-[24px] border p-5 ${isDark ? "bg-[#16213e] border-[#374151] text-white" : "bg-white border-orange-100 text-slate-900"} shadow-[0_14px_40px_rgba(15,23,42,0.06)]`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-70">Total Shops</p>
                  <p className="text-3xl font-bold mt-2">{overview.cards.totalShops}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ff4d2d]/10 text-[#ff4d2d]">
                  <FaStore size={18} />
                </div>
              </div>
            </div>
            <div className={`rounded-[24px] border p-5 ${isDark ? "bg-[#16213e] border-[#374151] text-white" : "bg-white border-orange-100 text-slate-900"} shadow-[0_14px_40px_rgba(15,23,42,0.06)]`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-70">Total Orders</p>
                  <p className="text-3xl font-bold mt-2">{overview.cards.totalOrders}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ff4d2d]/10 text-[#ff4d2d]">
                  <FaChartLine size={18} />
                </div>
              </div>
            </div>
            <div className={`rounded-[24px] border p-5 ${isDark ? "bg-[#16213e] border-[#374151] text-white" : "bg-white border-orange-100 text-slate-900"} shadow-[0_14px_40px_rgba(15,23,42,0.06)]`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-70">Revenue</p>
                  <p className="text-3xl font-bold mt-2">{formatMoney(overview.cards.totalRevenue)}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ff4d2d]/10 text-[#ff4d2d]">
                  <FaMoneyBillWave size={18} />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-[#ff6b43] to-[#ff4d2d] text-white shadow-lg shadow-orange-200"
                    : isDark
                      ? "bg-[#16213e] border border-[#374151] text-gray-200 hover:border-[#ff6b43]/40"
                      : "bg-white border border-gray-200 text-gray-700 hover:border-[#ff4d2d]/30"
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <tab.icon size={13} />
                {tab.label}
              </button>
            ))}
          </div>
          {activeTab === "users" && (
            <button
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold bg-gradient-to-r from-red-500 to-red-600 hover:brightness-105 text-white disabled:opacity-60 shadow-lg shadow-red-200"
              disabled={busyKey === "users-clear-all"}
              onClick={handleClearAllUsers}
            >
              <FaTrash size={12} />
              Clear All
            </button>
          )}
        </div>

        <div className={`rounded-[28px] border overflow-hidden shadow-[0_18px_60px_rgba(15,23,42,0.06)] ${isDark ? "bg-[#16213e] border-[#374151]" : "bg-white border-orange-100"}`}>
          {loading && (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-[#ff4d2d] border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          )}

          {!loading && activeTab === "users" && (
            <div className="overflow-x-hidden">
              <table className="w-full table-fixed">
                <thead className={isDark ? "bg-[#0f3460] text-gray-200" : "bg-[linear-gradient(180deg,#fff8f4,#ffffff)] text-slate-700"}>
                  <tr>
                    <th className="w-[19%] text-left px-5 py-4 text-sm font-semibold">Name</th>
                    <th className="w-[25%] text-left px-5 py-4 text-sm font-semibold">Email</th>
                    <th className="w-[13%] text-left px-5 py-4 text-sm font-semibold">Mobile</th>
                    <th className="w-[12%] text-left px-5 py-4 text-sm font-semibold">Role</th>
                    <th className="w-[11%] text-left px-5 py-4 text-sm font-semibold">Joined</th>
                    <th className="w-[10%] text-center px-5 py-4 text-sm font-semibold">Data Updated</th>
                    <th className="w-[10%] text-center px-5 py-4 text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id} className={`border-t transition ${isDark ? "border-[#374151] text-gray-100 hover:bg-white/5" : "border-orange-50 text-gray-800 hover:bg-orange-50/40"}`}>
                      <td className="px-5 py-4 align-top">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="break-words">{user.fullName}</span>
                          {user.isSuspended && (
                            <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-700">Suspended</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 break-all align-top">{user.email}</td>
                      <td className="px-5 py-4 break-words align-top">{user.mobile}</td>
                      <td className="px-5 py-4 align-top">
                        <select
                          className={`w-full min-w-0 px-3 py-2 rounded-xl border text-sm ${isDark ? "bg-[#1a1a2e] border-[#4b5563]" : "bg-white border-gray-200 shadow-sm"}`}
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
                      <td className="px-5 py-4 align-top">{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td className="px-5 py-4 align-top">
                        <div className="flex justify-center">
                          {hasRequiredUserData(user) ? (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">Updated</span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">Not Updated</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                          <button
                            className={`px-3.5 py-2 rounded-xl text-white text-sm font-medium ${
                              user.isSuspended ? "bg-slate-600 hover:bg-slate-700" : "bg-amber-500 hover:bg-amber-600"
                            }`}
                            disabled={busyKey === `suspend-${user._id}` || user._id === userData._id}
                            onClick={() => handleSuspend(user)}
                          >
                            {user.isSuspended ? "Unsuspend" : "Suspend"}
                          </button>
                          <button
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-500 text-white text-sm font-medium"
                            disabled={busyKey === `users-${user._id}` || user._id === userData._id}
                            onClick={() => handleDelete("users", user._id, user.fullName)}
                            aria-label={`Delete ${user.fullName}`}
                            title="Delete user"
                          >
                            <FaTrash size={14} />
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
            <div className="overflow-x-hidden">
              <table className="w-full table-fixed">
                <thead className={isDark ? "bg-[#0f3460] text-gray-200" : "bg-[linear-gradient(180deg,#fff8f4,#ffffff)] text-slate-700"}>
                  <tr>
                    <th className="w-[28%] text-left px-5 py-4 text-sm font-semibold">Shop</th>
                    <th className="w-[24%] text-left px-5 py-4 text-sm font-semibold">Owner</th>
                    <th className="w-[18%] text-left px-5 py-4 text-sm font-semibold">City</th>
                    <th className="w-[10%] text-left px-5 py-4 text-sm font-semibold">Items</th>
                    <th className="w-[20%] text-left px-5 py-4 text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shops.map((shop) => (
                    <tr key={shop._id} className={`border-t transition ${isDark ? "border-[#374151] text-gray-100 hover:bg-white/5" : "border-orange-50 text-gray-800 hover:bg-orange-50/40"}`}>
                      <td className="px-5 py-4 break-words">{shop.name}</td>
                      <td className="px-5 py-4 break-words">{shop?.owner?.fullName || "N/A"}</td>
                      <td className="px-5 py-4 break-words">{shop.city}</td>
                      <td className="px-5 py-4">{shop.itemCount}</td>
                      <td className="px-5 py-4">
                        <button
                          className="px-3.5 py-2 rounded-xl bg-red-500 text-white text-sm font-medium"
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
            <div className="overflow-x-hidden">
              <table className="w-full table-fixed">
                <thead className={isDark ? "bg-[#0f3460] text-gray-200" : "bg-[linear-gradient(180deg,#fff8f4,#ffffff)] text-slate-700"}>
                  <tr>
                    <th className="w-[24%] text-left px-5 py-4 text-sm font-semibold">Item</th>
                    <th className="w-[14%] text-left px-5 py-4 text-sm font-semibold">Category</th>
                    <th className="w-[12%] text-left px-5 py-4 text-sm font-semibold">Price</th>
                    <th className="w-[22%] text-left px-5 py-4 text-sm font-semibold">Shop</th>
                    <th className="w-[16%] text-left px-5 py-4 text-sm font-semibold">Owner</th>
                    <th className="w-[12%] text-left px-5 py-4 text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item._id} className={`border-t transition ${isDark ? "border-[#374151] text-gray-100 hover:bg-white/5" : "border-orange-50 text-gray-800 hover:bg-orange-50/40"}`}>
                      <td className="px-5 py-4 break-words">{item.name}</td>
                      <td className="px-5 py-4 break-words">{item.category}</td>
                      <td className="px-5 py-4">{formatMoney(item.price)}</td>
                      <td className="px-5 py-4 break-words">{item?.shop?.name || "N/A"}</td>
                      <td className="px-5 py-4 break-words">{item?.shop?.owner?.fullName || "N/A"}</td>
                      <td className="px-5 py-4">
                        <button
                          className="px-3.5 py-2 rounded-xl bg-red-500 text-white text-sm font-medium"
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
            <div className="overflow-x-hidden">
              <table className="w-full table-fixed">
                <thead className={isDark ? "bg-[#0f3460] text-gray-200" : "bg-[linear-gradient(180deg,#fff8f4,#ffffff)] text-slate-700"}>
                  <tr>
                    <th className="w-[14%] text-left px-5 py-4 text-sm font-semibold">Order ID</th>
                    <th className="w-[20%] text-left px-5 py-4 text-sm font-semibold">Customer</th>
                    <th className="w-[14%] text-left px-5 py-4 text-sm font-semibold">Amount</th>
                    <th className="w-[12%] text-left px-5 py-4 text-sm font-semibold">Payment</th>
                    <th className="w-[26%] text-left px-5 py-4 text-sm font-semibold">Statuses</th>
                    <th className="w-[14%] text-left px-5 py-4 text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order._id} className={`border-t transition ${isDark ? "border-[#374151] text-gray-100 hover:bg-white/5" : "border-orange-50 text-gray-800 hover:bg-orange-50/40"}`}>
                      <td className="px-5 py-4">{order._id.slice(-8)}</td>
                      <td className="px-5 py-4 break-words">{order?.user?.fullName || "N/A"}</td>
                      <td className="px-5 py-4">{formatMoney(order.totalAmount)}</td>
                      <td className="px-5 py-4">{order.payment ? "Paid" : "Pending"}</td>
                      <td className="px-5 py-4 break-words">
                        {(order.shopOrders || []).map((shopOrder) => shopOrder.status).join(", ")}
                      </td>
                      <td className="px-5 py-4">
                        <button
                          className="px-3.5 py-2 rounded-xl bg-red-500 text-white text-sm font-medium"
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

        {confirmDialog && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-[3px]">
            <div className={`w-full max-w-md overflow-hidden rounded-[28px] border shadow-[0_24px_80px_rgba(15,23,42,0.24)] ${isDark ? "border-white/10 bg-[#10182b]" : "border-orange-100 bg-white"}`}>
              <div className={`${isDark ? "bg-[radial-gradient(circle_at_top_left,_rgba(255,120,82,0.16),_transparent_52%),linear-gradient(135deg,_rgba(20,28,46,1),_rgba(16,24,43,1))] border-white/10" : "bg-[radial-gradient(circle_at_top_left,_rgba(255,120,82,0.18),_transparent_52%),linear-gradient(135deg,_#fff7f2,_#ffffff)] border-orange-100"} border-b px-6 pb-5 pt-6`}>
                <div className="flex items-start gap-4">
                  <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg ${confirmDialog.tone === "danger" ? "bg-gradient-to-br from-red-500 to-orange-500 shadow-red-200/70" : confirmDialog.tone === "warning" ? "bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-200/70" : "bg-gradient-to-br from-[#ff6b43] to-[#ff4d2d] shadow-orange-200/70"}`}>
                    <confirmDialog.icon size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${confirmDialog.tone === "danger" ? "text-red-500" : confirmDialog.tone === "warning" ? "text-amber-500" : "text-[#ff6b43]"}`}>
                      {confirmDialog.eyebrow}
                    </p>
                    <h3 className={`mt-1 text-2xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{confirmDialog.title}</h3>
                    <p className={`mt-2 text-sm leading-6 ${isDark ? "text-slate-300" : "text-slate-600"}`}>{confirmDialog.description}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 px-6 py-5">
                <div className={`rounded-2xl border p-4 ${isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50/80"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${isDark ? "text-slate-400" : "text-slate-400"}`}>
                        {confirmDialog.actionLabel}
                      </p>
                      <p className={`mt-2 text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>{confirmDialog.targetLabel}</p>
                    </div>
                    <div className={`rounded-full px-3 py-1 text-xs font-semibold ${confirmDialog.tone === "danger" ? "bg-red-100 text-red-600" : confirmDialog.tone === "warning" ? "bg-amber-100 text-amber-700" : "bg-orange-100 text-[#ff6b43]"}`}>
                      {confirmDialog.summary}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    className={`w-full rounded-2xl border px-5 py-3 text-sm font-semibold transition sm:w-auto ${isDark ? "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10" : "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
                    onClick={() => setConfirmDialog(null)}
                  >
                    {confirmDialog.cancelLabel}
                  </button>
                  <button
                    type="button"
                    className={`w-full rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:brightness-105 sm:w-auto ${confirmDialog.tone === "danger" ? "bg-gradient-to-r from-red-500 to-orange-500 shadow-red-200" : confirmDialog.tone === "warning" ? "bg-gradient-to-r from-amber-500 to-orange-500 shadow-amber-200" : "bg-gradient-to-r from-[#ff6b43] to-[#ff4d2d] shadow-orange-200"}`}
                    onClick={() => {
                      const nextAction = confirmDialog.onConfirm;
                      setConfirmDialog(null);
                      nextAction?.();
                    }}
                  >
                    {confirmDialog.confirmLabel}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;
