import axios from "axios";
import React, { useEffect, useState } from "react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { serverUrl } from "../App";
import { useTheme } from "../context/ThemeContext";
import { FaBolt, FaChartLine, FaFireAlt, FaMoneyBillWave, FaReceipt } from "react-icons/fa";

const PIE_COLORS = ["#ff4d2d", "#ff9a62", "#ffd166", "#06d6a0", "#118ab2"];

function OwnerAnalyticsPanel() {
  const [range, setRange] = useState("week");
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const { isDark } = useTheme();

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const result = await axios.get(`${serverUrl}/api/shop/analytics`, {
          params: { range },
          withCredentials: true
        });
        setAnalytics(result.data);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [range]);

  return (
    <div className={`w-full max-w-6xl overflow-hidden rounded-[32px] border ${isDark ? "border-white/10 bg-[linear-gradient(180deg,rgba(18,28,46,0.98),rgba(12,20,34,0.98))] text-white shadow-[0_26px_80px_rgba(2,6,23,0.4)]" : "border-orange-100 bg-white text-slate-900 shadow-[0_26px_80px_rgba(15,23,42,0.08)]"}`}>
      <div className={`${isDark ? "bg-[radial-gradient(circle_at_top_left,_rgba(255,120,82,0.16),_transparent_46%),linear-gradient(135deg,rgba(255,255,255,0.02),rgba(255,255,255,0))]" : "bg-[radial-gradient(circle_at_top_left,_rgba(255,120,82,0.2),_transparent_42%),linear-gradient(135deg,_#fff6f0,_#ffffff_60%)]"} border-b ${isDark ? "border-white/10" : "border-orange-100"} px-5 py-5 sm:px-7`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#ff4d2d]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ff6b43]">
              <FaChartLine />
              Restaurant Intelligence
            </div>
            <h2 className="mt-3 text-2xl font-bold sm:text-3xl">Analytics</h2>
            <p className={`mt-2 max-w-2xl text-sm leading-7 ${isDark ? "text-slate-300" : "text-slate-500"}`}>
              Track revenue momentum, standout menu items, and demand spikes with a more visual performance snapshot.
            </p>
          </div>
          <div className={`rounded-[24px] border px-4 py-3 ${isDark ? "border-white/10 bg-white/5" : "border-orange-100 bg-white/90"} shadow-sm`}>
            <p className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${isDark ? "text-slate-400" : "text-slate-400"}`}>Insight Range</p>
            <div className="mt-3 flex gap-2">
              {["week", "month"].map((entry) => (
                <button
                  key={entry}
                  className={`rounded-2xl px-4 py-2.5 text-sm font-semibold capitalize transition ${range === entry ? "bg-gradient-to-r from-[#ff6b43] to-[#ff4d2d] text-white shadow-lg shadow-orange-200" : isDark ? "bg-white/5 text-slate-200 hover:bg-white/10" : "bg-orange-50 text-[#ff4d2d] hover:bg-orange-100"}`}
                  onClick={() => setRange(entry)}
                >
                  {entry}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-7">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <p className={`text-sm mt-1 ${isDark ? "text-gray-300" : "text-gray-600"}`}>Revenue, best-selling items, and peak order hours.</p>
        </div>
        <div className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${isDark ? "bg-white/5 text-slate-300" : "bg-orange-50 text-[#ff6b43]"}`}>Live owner insights</div>
      </div>

      {loading && <p className={isDark ? "text-gray-300" : "text-gray-600"}>Loading analytics...</p>}

      {!loading && analytics && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className={`rounded-[24px] border p-5 ${isDark ? "border-white/10 bg-white/5" : "border-orange-100 bg-[linear-gradient(180deg,#fff8f3,#ffffff)]"} shadow-sm`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${isDark ? "text-slate-400" : "text-slate-400"}`}>Total Orders</p>
                  <p className="text-3xl font-bold mt-3">{analytics.totalOrders}</p>
                  <p className={`mt-2 text-sm ${isDark ? "text-slate-300" : "text-slate-500"}`}>Order flow captured across the selected range.</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ff4d2d]/10 text-[#ff4d2d]">
                  <FaReceipt size={18} />
                </div>
              </div>
            </div>
            <div className={`rounded-[24px] border p-5 ${isDark ? "border-white/10 bg-white/5" : "border-orange-100 bg-[linear-gradient(180deg,#fff8f3,#ffffff)]"} shadow-sm`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${isDark ? "text-slate-400" : "text-slate-400"}`}>Revenue</p>
                  <p className="text-3xl font-bold mt-3">Rs {analytics.totalRevenue}</p>
                  <p className={`mt-2 text-sm ${isDark ? "text-slate-300" : "text-slate-500"}`}>A sharper snapshot of how your menu is monetizing.</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ff4d2d]/10 text-[#ff4d2d]">
                  <FaMoneyBillWave size={18} />
                </div>
              </div>
            </div>
            <div className={`rounded-[24px] border p-5 ${isDark ? "border-white/10 bg-white/5" : "border-orange-100 bg-[linear-gradient(180deg,#fff8f3,#ffffff)]"} shadow-sm`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${isDark ? "text-slate-400" : "text-slate-400"}`}>Top Items</p>
                  <p className="text-3xl font-bold mt-3">{analytics.topItems?.length || 0}</p>
                  <p className={`mt-2 text-sm ${isDark ? "text-slate-300" : "text-slate-500"}`}>The dishes currently carrying the menu spotlight.</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ff4d2d]/10 text-[#ff4d2d]">
                  <FaFireAlt size={18} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <div className={`rounded-[26px] border p-5 ${isDark ? "border-white/10 bg-white/5" : "border-orange-100 bg-white"} shadow-sm`}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ff6b43]">Performance Curve</p>
                  <h3 className="mt-2 text-lg font-bold">Revenue Trend</h3>
                </div>
                <div className={`rounded-2xl px-3 py-2 text-xs font-semibold ${isDark ? "bg-white/5 text-slate-300" : "bg-orange-50 text-[#ff6b43]"}`}>
                  <FaBolt className="inline mr-1" />
                  Cash flow pulse
                </div>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={analytics.revenueSeries || []}>
                  <XAxis dataKey="label" stroke={isDark ? "#cbd5e1" : "#6b7280"} />
                  <YAxis stroke={isDark ? "#cbd5e1" : "#6b7280"} />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="#ff4d2d" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className={`rounded-[26px] border p-5 ${isDark ? "border-white/10 bg-white/5" : "border-orange-100 bg-white"} shadow-sm`}>
              <div className="mb-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ff6b43]">Menu Winners</p>
                <h3 className="mt-2 text-lg font-bold">Top 5 Items</h3>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={analytics.topItems || []} dataKey="count" nameKey="name" outerRadius={90} label>
                    {(analytics.topItems || []).map((entry, index) => (
                      <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={`rounded-[26px] border p-5 mt-5 ${isDark ? "border-white/10 bg-white/5" : "border-orange-100 bg-white"} shadow-sm`}>
            <div className="mb-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ff6b43]">Service Rhythm</p>
              <h3 className="mt-2 text-lg font-bold">Peak Hours Heatmap</h3>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
              {(analytics.hourlyDistribution || []).map((entry) => (
                <div
                  key={entry.hour}
                  className="rounded-2xl p-3 text-center shadow-sm"
                  style={{
                    backgroundColor: `rgba(255, 77, 45, ${Math.min(0.15 + (entry.count * 0.15), 0.95)})`
                  }}
                >
                  <p className="text-xs font-semibold">{entry.hour}:00</p>
                  <p className="text-sm mt-1">{entry.count}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
      </div>
    </div>
  );
}

export default OwnerAnalyticsPanel;
