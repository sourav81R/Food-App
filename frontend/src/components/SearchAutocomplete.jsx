import React from "react";

function SearchAutocomplete({
  isDark,
  loading,
  query,
  suggestions,
  recentSearches,
  onSelectRecent,
  onSelectItem,
  onSelectShop,
  onClearRecent
}) {
  const hasQuery = Boolean(query.trim());
  const items = suggestions?.items || [];
  const shops = suggestions?.shops || [];

  return (
    <div className={`absolute top-full z-[10001] mt-2 w-full max-w-full overflow-hidden rounded-2xl border shadow-2xl ${isDark ? "bg-[#16213e] border-[#374151]" : "bg-white border-gray-200"}`}>
      {!hasQuery && recentSearches.length > 0 && (
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <p className={`text-xs uppercase tracking-wide font-semibold ${isDark ? "text-gray-400" : "text-gray-500"}`}>Recent searches</p>
            <button className="text-xs text-[#ff4d2d] font-medium" onClick={onClearRecent}>Clear</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((search) => (
              <button
                key={search}
                className={`px-3 py-1.5 rounded-full text-sm border ${isDark ? "border-[#374151] text-gray-200 hover:bg-[#0f3460]" : "border-gray-200 text-gray-700 hover:bg-orange-50"}`}
                onClick={() => onSelectRecent(search)}
              >
                {search}
              </button>
            ))}
          </div>
        </div>
      )}

      {hasQuery && (
        <div className="max-h-[360px] overflow-y-auto">
          {loading && (
            <div className={`px-4 py-3 text-sm ${isDark ? "text-gray-300" : "text-gray-500"}`}>
              Searching...
            </div>
          )}

          {!loading && shops.length === 0 && items.length === 0 && (
            <div className={`px-4 py-3 text-sm ${isDark ? "text-gray-300" : "text-gray-500"}`}>
              No matching dishes or restaurants found.
            </div>
          )}

          {!loading && shops.length > 0 && (
            <div className="p-2">
              <p className={`px-2 py-1 text-xs uppercase tracking-wide font-semibold ${isDark ? "text-gray-400" : "text-gray-500"}`}>Restaurants</p>
              {shops.map((shop) => (
                <button
                  key={shop._id}
                  className={`break-anywhere w-full text-left rounded-xl px-3 py-2 transition ${isDark ? "hover:bg-[#0f3460] text-white" : "hover:bg-orange-50 text-gray-800"}`}
                  onClick={() => onSelectShop(shop)}
                >
                  <p className="break-words font-semibold">{shop.name}</p>
                  <p className={`text-xs ${isDark ? "text-gray-300" : "text-gray-500"}`}>{shop.city} • {shop.address}</p>
                </button>
              ))}
            </div>
          )}

          {!loading && items.length > 0 && (
            <div className="p-2 border-t border-black/5">
              <p className={`px-2 py-1 text-xs uppercase tracking-wide font-semibold ${isDark ? "text-gray-400" : "text-gray-500"}`}>Dishes</p>
              {items.map((item) => (
                <button
                  key={item._id}
                  className={`break-anywhere w-full text-left rounded-xl px-3 py-2 transition ${isDark ? "hover:bg-[#0f3460] text-white" : "hover:bg-orange-50 text-gray-800"}`}
                  onClick={() => onSelectItem(item)}
                >
                  <p className="break-words font-semibold">{item.name}</p>
                  <p className={`text-xs ${isDark ? "text-gray-300" : "text-gray-500"}`}>
                    {item.shop?.name || "Restaurant"} • Rs {item.price}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SearchAutocomplete;
