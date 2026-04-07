import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import {
  FaEnvelope,
  FaMapMarkerAlt,
  FaMotorcycle,
  FaPhoneAlt,
  FaReceipt,
  FaShieldAlt,
  FaStore,
  FaUserCircle,
  FaWallet
} from "react-icons/fa";
import { FiArrowUpRight } from "react-icons/fi";
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

const getRoleAccent = (normalizedRole) => {
  if (isAdminRole(normalizedRole)) {
    return {
      icon: FaShieldAlt,
      label: "Admin access enabled",
      tone: "from-[#ff7b54] to-[#ff4d2d]"
    };
  }

  if (isOwnerRole(normalizedRole)) {
    return {
      icon: FaStore,
      label: "Storefront control center",
      tone: "from-[#ff8a5b] to-[#ff5a36]"
    };
  }

  if (isDeliveryRole(normalizedRole)) {
    return {
      icon: FaMotorcycle,
      label: "Delivery command",
      tone: "from-[#fb923c] to-[#f97316]"
    };
  }

  return {
    icon: FaUserCircle,
    label: "Customer profile",
    tone: "from-[#ff8a5b] to-[#ff4d2d]"
  };
};

function QuickStat({ icon, label, value, hint, isDark }) {
  return (
    <div className={`rounded-[20px] border p-3.5 ${isDark ? "border-white/10 bg-white/5" : "border-orange-100 bg-white/75"} shadow-sm`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#ff6b43]">{label}</p>
        <div className="flex h-9 w-9 items-center justify-center rounded-[18px] bg-[#ff6b43]/10 text-[#ff6b43]">
          {icon}
        </div>
      </div>
      <p className={`mt-2.5 text-base font-bold break-words ${isDark ? "text-white" : "text-slate-900"}`}>{value}</p>
      <p className={`mt-1 text-[13px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>{hint}</p>
    </div>
  );
}

function SectionCard({ title, subtitle, children, isDark, badge }) {
  return (
    <section className={`rounded-[26px] border p-5 sm:p-6 ${isDark ? "border-white/10 bg-[linear-gradient(180deg,rgba(22,33,62,0.96),rgba(15,23,42,0.94))] text-white shadow-[0_22px_70px_rgba(2,6,23,0.34)]" : "border-white/70 bg-[rgba(255,255,255,0.88)] text-slate-900 shadow-[0_22px_70px_rgba(15,23,42,0.08)]"} backdrop-blur-xl`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#ff6b43]">{title}</p>
          <h2 className={`mt-1.5 text-xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>{subtitle}</h2>
        </div>
        {badge ? (
          <div className={`rounded-full px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] ${isDark ? "bg-white/5 text-slate-300" : "bg-orange-50 text-[#ff6b43]"}`}>
            {badge}
          </div>
        ) : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ActionButton({ label, onClick, variant = "secondary", isDark }) {
  const className = variant === "primary"
    ? "bg-gradient-to-r from-[#ff6b43] to-[#ff4d2d] text-white shadow-[0_18px_40px_rgba(255,107,67,0.32)] hover:brightness-105"
    : isDark
      ? "border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
      : "border-orange-100 bg-orange-50 text-[#ff4d2d] hover:border-orange-200 hover:bg-orange-100/70";

  return (
    <button
      className={`inline-flex items-center gap-2 rounded-[18px] border px-3.5 py-2.5 text-[13px] font-semibold transition ${className}`}
      onClick={onClick}
    >
      <span>{label}</span>
      <FiArrowUpRight size={16} />
    </button>
  );
}

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
  const roleAccent = getRoleAccent(normalizedRole);
  const AccentIcon = roleAccent.icon;

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
    <div className={`relative min-h-screen overflow-hidden px-4 pb-10 pt-[95px] ${isDark ? "bg-[linear-gradient(180deg,#07111f_0%,#0b1629_48%,#08111d_100%)]" : "bg-[radial-gradient(circle_at_top_left,_rgba(255,133,92,0.16),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(255,186,150,0.16),_transparent_24%),linear-gradient(180deg,#fff8f3_0%,#fffdfb_44%,#fff7ef_100%)]"}`}>
      <Nav />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className={`absolute -left-20 top-24 h-64 w-64 rounded-full blur-3xl ${isDark ? "bg-[#ff6b43]/12" : "bg-[#ff8f6b]/18"}`} />
        <div className={`absolute -right-20 bottom-20 h-72 w-72 rounded-full blur-3xl ${isDark ? "bg-[#f59e0b]/10" : "bg-[#ffd3a5]/22"}`} />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-5xl">
        <section className={`overflow-hidden rounded-[28px] border p-5 sm:p-6 ${isDark ? "border-white/10 bg-[linear-gradient(180deg,rgba(18,28,46,0.98),rgba(12,20,34,0.98))] text-white shadow-[0_26px_80px_rgba(2,6,23,0.4)]" : "border-white/70 bg-[rgba(255,255,255,0.88)] text-slate-900 shadow-[0_26px_80px_rgba(15,23,42,0.10)]"} backdrop-blur-xl`}>
          <div className={`absolute inset-x-0 top-0 h-36 ${isDark ? "bg-[radial-gradient(circle_at_top_left,_rgba(255,120,82,0.18),_transparent_55%)]" : "bg-[radial-gradient(circle_at_top_left,_rgba(255,120,82,0.22),_transparent_55%)]"}`} />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#ff6b43]/10 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#ff6b43]">
              <AccentIcon />
              {roleAccent.label}
            </div>

            <div className="mt-5 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="flex flex-1 items-start gap-3.5 sm:gap-4">
                <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] bg-gradient-to-br ${roleAccent.tone} text-2xl font-black text-white shadow-[0_16px_34px_rgba(255,107,67,0.30)]`}>
                  {userData?.fullName?.slice(0, 1)?.toUpperCase() || "U"}
                </div>

                <div className="min-w-0">
                  <h1 className={`text-2xl font-black sm:text-3xl ${isDark ? "text-white" : "text-slate-900"}`}>{userData.fullName || "My Profile"}</h1>
                  <p className={`mt-2 text-[13px] leading-6 sm:text-sm ${isDark ? "text-slate-300" : "text-slate-500"}`}>
                    Account details, role access, saved locations, and high-value shortcuts collected into one sharper profile workspace.
                  </p>

                  <div className="mt-3.5 flex flex-wrap gap-2.5">
                    <div className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold ${isDark ? "bg-white/5 text-slate-200" : "bg-orange-50 text-[#ff4d2d]"}`}>
                      {getRoleLabel(userData.role)}
                    </div>
                    <div className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold ${isDark ? "bg-white/5 text-slate-200" : "bg-orange-50 text-slate-700"}`}>
                      Joined {joinedDate}
                    </div>
                    <div className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold ${isDark ? "bg-white/5 text-slate-200" : "bg-orange-50 text-slate-700"}`}>
                      {currentCity || "City not set"}{currentState ? `, ${currentState}` : ""}
                    </div>
                  </div>
                </div>
              </div>

              <div className={`w-full max-w-[360px] rounded-[24px] border p-4 ${isDark ? "border-white/10 bg-white/5" : "border-orange-100 bg-white/75"} shadow-[0_18px_50px_rgba(15,23,42,0.08)]`}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#ff6b43]">Profile Snapshot</p>
                <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <QuickStat icon={<FaEnvelope size={16} />} label="Email" value={userData.email || "N/A"} hint="Primary login contact" isDark={isDark} />
                  <QuickStat icon={<FaPhoneAlt size={16} />} label="Mobile" value={userData.mobile || "N/A"} hint="Reachable contact number" isDark={isDark} />
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <QuickStat icon={<FaUserCircle size={16} />} label="Role" value={getRoleLabel(userData.role)} hint="Current platform access" isDark={isDark} />
              <QuickStat icon={<FaReceipt size={16} />} label="Joined" value={joinedDate} hint="Account creation date" isDark={isDark} />
              <QuickStat icon={<FaMapMarkerAlt size={16} />} label="City / State" value={`${currentCity || "N/A"}${currentState ? `, ${currentState}` : ""}`} hint="Detected delivery region" isDark={isDark} />
              <QuickStat icon={<FaMapMarkerAlt size={16} />} label="Address" value={currentAddress || "Not set"} hint="Current default location" isDark={isDark} />
            </div>
          </div>
        </section>

        <div className="mt-5 grid grid-cols-1 gap-5">
          {isUserRole(normalizedRole) && (
            <SectionCard title="User Actions" subtitle="Customer shortcuts" badge="fast actions" isDark={isDark}>
              <div className="flex flex-wrap gap-2.5">
                <ActionButton label="My Orders" onClick={() => navigate("/my-orders")} variant="primary" isDark={isDark} />
                <ActionButton label="Favorites" onClick={() => navigate("/favorites")} isDark={isDark} />
                <ActionButton label="Cart" onClick={() => navigate("/cart")} isDark={isDark} />
              </div>
            </SectionCard>
          )}

          {isUserRole(normalizedRole) && (
            <SectionCard title="Wallet Center" subtitle="Balance and recent activity" badge={`Rs ${Number(walletBalance || 0).toFixed(2)}`} isDark={isDark}>
              <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[280px_minmax(0,1fr)]">
                <div className={`rounded-[22px] border p-4 ${isDark ? "border-white/10 bg-white/5" : "border-orange-100 bg-[linear-gradient(180deg,#fff8f3,#ffffff)]"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#ff6b43]">Wallet Balance</p>
                      <p className={`mt-2.5 text-3xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>Rs {Number(walletBalance || 0).toFixed(2)}</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-[18px] bg-[#ff6b43]/10 text-[#ff6b43]">
                      <FaWallet size={18} />
                    </div>
                  </div>
                  <p className={`mt-2.5 text-[13px] leading-6 ${isDark ? "text-slate-300" : "text-slate-500"}`}>
                    Track refunds, credits, and wallet-powered checkout activity from one clean panel.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {walletTransactions.length === 0 && (
                    <div className={`rounded-[20px] border p-4 text-[13px] ${isDark ? "border-white/10 bg-white/5 text-slate-300" : "border-orange-100 bg-orange-50/70 text-slate-600"}`}>
                      No wallet transactions yet.
                    </div>
                  )}
                  {walletTransactions.map((transaction) => (
                    <div key={transaction._id} className={`rounded-[20px] border p-3.5 ${isDark ? "border-white/10 bg-white/5" : "border-orange-100 bg-white/80"} shadow-sm`}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ff6b43]">{transaction.type || "wallet"}</p>
                          <p className={`mt-1.5 text-base font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{transaction.description || "Wallet activity"}</p>
                        </div>
                        <div className={`text-base font-bold ${transaction.direction === "credit" ? "text-emerald-500" : "text-red-500"}`}>
                          {transaction.direction === "credit" ? "+" : "-"} Rs {transaction.amount}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </SectionCard>
          )}

          {isUserRole(normalizedRole) && (
            <SectionCard title="Saved Addresses" subtitle="Delivery locations" badge={`${addresses.length} saved`} isDark={isDark}>
              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                {addresses.length === 0 && (
                  <div className={`rounded-[20px] border p-4 text-[13px] ${isDark ? "border-white/10 bg-white/5 text-slate-300" : "border-orange-100 bg-orange-50/70 text-slate-600"}`}>
                    No saved addresses yet.
                  </div>
                )}
                {addresses.map((savedAddress) => (
                  <div key={savedAddress._id} className={`rounded-[20px] border p-3.5 ${isDark ? "border-white/10 bg-white/5" : "border-orange-100 bg-white/80"} shadow-sm`}>
                    <div className="flex items-center justify-between gap-3">
                      <p className={`text-base font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{savedAddress.label}</p>
                      {savedAddress.isDefault ? (
                        <span className="rounded-full bg-[#ff6b43]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#ff6b43]">Default</span>
                      ) : null}
                    </div>
                    <p className={`mt-2.5 text-[13px] leading-6 ${isDark ? "text-slate-300" : "text-slate-500"}`}>{savedAddress.fullAddress}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {isOwnerRole(normalizedRole) && (
            <SectionCard title="Owner Control" subtitle="Manage your storefronts" badge={`${myShops.length} shops`} isDark={isDark}>
              <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div className={`rounded-[20px] border p-4 ${isDark ? "border-white/10 bg-white/5" : "border-orange-100 bg-white/75"}`}>
                  <p className={`text-base font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                    {myShopData ? `Managing ${myShopData.name} - ${myShops.length} shop${myShops.length === 1 ? "" : "s"} total` : "No shop created yet"}
                  </p>
                  <p className={`mt-2 text-[13px] leading-6 ${isDark ? "text-slate-300" : "text-slate-500"}`}>
                    Jump into shop management, add another storefront, or publish a new menu item without leaving your account hub.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  <ActionButton label={myShopData ? "Manage Shop" : "Create Shop"} onClick={() => navigate(myShopData?._id ? `/create-edit-shop?shopId=${myShopData._id}` : "/create-edit-shop?mode=create")} variant="primary" isDark={isDark} />
                  <ActionButton label="Add Another Shop" onClick={() => navigate("/create-edit-shop?mode=create")} isDark={isDark} />
                  {myShopData ? <ActionButton label="Add Item" onClick={() => navigate(`/add-item?shopId=${myShopData._id}`)} isDark={isDark} /> : null}
                  <ActionButton label="Shop Orders" onClick={() => navigate("/my-orders")} isDark={isDark} />
                </div>
              </div>
            </SectionCard>
          )}

          {isDeliveryRole(normalizedRole) && (
            <SectionCard title="Delivery Panel" subtitle="Live delivery status" badge="active location" isDark={isDark}>
              <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div className={`rounded-[20px] border p-4 ${isDark ? "border-white/10 bg-white/5" : "border-orange-100 bg-white/75"}`}>
                  <p className={`text-base font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                    {Number.isFinite(deliveryLat) && Number.isFinite(deliveryLon) ? `${deliveryLat}, ${deliveryLon}` : "Live location not available"}
                  </p>
                  <p className={`mt-2 text-[13px] leading-6 ${isDark ? "text-slate-300" : "text-slate-500"}`}>
                    Your current location powers live delivery visibility and route coordination.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  <ActionButton label="Delivery Dashboard" onClick={() => navigate("/")} variant="primary" isDark={isDark} />
                </div>
              </div>
            </SectionCard>
          )}

          {isAdminRole(normalizedRole) && (
            <SectionCard title="Admin Command" subtitle="Platform-wide controls" badge="elevated access" isDark={isDark}>
              <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div className={`rounded-[20px] border p-4 ${isDark ? "border-white/10 bg-white/5" : "border-orange-100 bg-white/75"}`}>
                  <p className={`text-base font-bold ${isDark ? "text-white" : "text-slate-900"}`}>Admin panel access is ready</p>
                  <p className={`mt-2 text-[13px] leading-6 ${isDark ? "text-slate-300" : "text-slate-500"}`}>
                    Manage users, shops, items, and orders from one central dashboard built for full platform visibility.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  <ActionButton label="Open Admin Panel" onClick={() => navigate("/admin")} variant="primary" isDark={isDark} />
                </div>
              </div>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
}

export default Profile;
