const LEGACY_DEFAULT_OPENING_TIME = "09:00";
const LEGACY_DEFAULT_CLOSING_TIME = "23:00";

export const DEFAULT_SHOP_OPENING_TIME = "08:00";
export const DEFAULT_SHOP_CLOSING_TIME = "00:45";

const EARLY_LATE_NIGHT_CLOSE_TIMES = ["00:15", "00:45", "01:15", "01:45"];
const CAFE_LATE_NIGHT_CLOSE_TIMES = ["00:45", "01:15", "01:45", "02:15"];
const NIGHT_OWL_CLOSE_TIME = "03:00";
const MORNING_CAFE_OPENING_TIME = "06:30";

const normalizeTimeValue = (value = "") => {
    const [hour, minute] = String(value || "").split(":").map(Number);
    if (!Number.isInteger(hour) || !Number.isInteger(minute)) return "";
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return "";
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

const seededHash = (seedText = "") =>
    [...String(seedText || "shop-hours")].reduce((acc, char) => acc + char.charCodeAt(0), 0);

const nameContains = (shop = {}, patterns = []) => {
    const haystack = `${shop?.name || ""} ${shop?.address || ""}`.toLowerCase();
    return patterns.some((pattern) => haystack.includes(pattern));
};

const isLegacyDefaultHours = (openingTime = "", closingTime = "") =>
    openingTime === LEGACY_DEFAULT_OPENING_TIME && closingTime === LEGACY_DEFAULT_CLOSING_TIME;

const pickLateNightCloseTime = (shop = {}) => {
    if (nameContains(shop, ["night owl"])) {
        return NIGHT_OWL_CLOSE_TIME;
    }

    const closeTimes = nameContains(shop, ["tea", "chai", "coffee", "cafe", "brew"])
        ? CAFE_LATE_NIGHT_CLOSE_TIMES
        : EARLY_LATE_NIGHT_CLOSE_TIMES;

    return closeTimes[seededHash(shop?._id || shop?.name || shop?.city) % closeTimes.length];
};

const pickOpeningTime = (shop = {}) =>
    nameContains(shop, ["tea", "chai", "coffee", "cafe", "breakfast"])
        ? MORNING_CAFE_OPENING_TIME
        : DEFAULT_SHOP_OPENING_TIME;

export const generateDefaultOperatingHours = (shop = {}) => ({
    openingTime: pickOpeningTime(shop),
    closingTime: pickLateNightCloseTime(shop),
    source: "generated"
});

export const resolveOperatingHours = (shop = {}) => {
    const openingTime = normalizeTimeValue(shop?.openingTime);
    const closingTime = normalizeTimeValue(shop?.closingTime);

    if (openingTime && closingTime && !isLegacyDefaultHours(openingTime, closingTime)) {
        return {
            openingTime,
            closingTime,
            source: "custom"
        };
    }

    return {
        ...generateDefaultOperatingHours(shop),
        source: openingTime || closingTime ? "legacy-default" : "generated"
    };
};

export default resolveOperatingHours;
