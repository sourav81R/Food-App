import axios from "axios";
import React, { useEffect, useState } from "react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { serverUrl } from "../App";
import { useTheme } from "../context/ThemeContext";

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
    <div className={`w-full rounded-2xl border p-5 ${isDark ? "bg-[#16213e] border-[#374151] text-white" : "bg-white border-orange-100"}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h2 className="text-2xl font-bold">Analytics</h2>
          <p className={`text-sm mt-1 ${isDark ? "text-gray-300" : "text-gray-600"}`}>Revenue, best-selling items, and peak order hours.</p>
        </div>
        <div className="flex gap-2">
          {["week", "month"].map((entry) => (
            <button
              key={entry}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${range === entry ? "bg-[#ff4d2d] text-white" : isDark ? "bg-[#0f3460]" : "bg-orange-50 text-[#ff4d2d]"}`}
              onClick={() => setRange(entry)}
            >
              {entry}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className={isDark ? "text-gray-300" : "text-gray-600"}>Loading analytics...</p>}

      {!loading && analytics && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className={`rounded-xl border p-4 ${isDark ? "border-[#374151] bg-[#0f3460]" : "border-gray-100 bg-orange-50"}`}>
              <p className="text-sm">Total Orders</p>
              <p className="text-2xl font-bold mt-2">{analytics.totalOrders}</p>
            </div>
            <div className={`rounded-xl border p-4 ${isDark ? "border-[#374151] bg-[#0f3460]" : "border-gray-100 bg-orange-50"}`}>
              <p className="text-sm">Revenue</p>
              <p className="text-2xl font-bold mt-2">Rs {analytics.totalRevenue}</p>
            </div>
            <div className={`rounded-xl border p-4 ${isDark ? "border-[#374151] bg-[#0f3460]" : "border-gray-100 bg-orange-50"}`}>
              <p className="text-sm">Top Items</p>
              <p className="text-2xl font-bold mt-2">{analytics.topItems?.length || 0}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <div className={`rounded-xl border p-4 ${isDark ? "border-[#374151] bg-[#0f3460]" : "border-gray-100 bg-white"}`}>
              <h3 className="font-semibold mb-3">Revenue Trend</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={analytics.revenueSeries || []}>
                  <XAxis dataKey="label" stroke={isDark ? "#cbd5e1" : "#6b7280"} />
                  <YAxis stroke={isDark ? "#cbd5e1" : "#6b7280"} />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="#ff4d2d" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className={`rounded-xl border p-4 ${isDark ? "border-[#374151] bg-[#0f3460]" : "border-gray-100 bg-white"}`}>
              <h3 className="font-semibold mb-3">Top 5 Items</h3>
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

          <div className={`rounded-xl border p-4 mt-5 ${isDark ? "border-[#374151] bg-[#0f3460]" : "border-gray-100 bg-white"}`}>
            <h3 className="font-semibold mb-3">Peak Hours Heatmap</h3>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
              {(analytics.hourlyDistribution || []).map((entry) => (
                <div
                  key={entry.hour}
                  className="rounded-lg p-3 text-center"
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
  );
}

export default OwnerAnalyticsPanel;
