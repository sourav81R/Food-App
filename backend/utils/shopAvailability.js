import resolveOperatingHours from "./shopHours.js";

const parseTimeToMinutes = (value = "") => {
    const [hour, minute] = String(value || "").split(":").map(Number)
    if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
    return (hour * 60) + minute
}

const getNowMinutes = (date = new Date()) => (date.getHours() * 60) + date.getMinutes()

export const isWithinOperatingHours = (openingTime, closingTime, date = new Date()) => {
    const openMinutes = parseTimeToMinutes(openingTime)
    const closeMinutes = parseTimeToMinutes(closingTime)

    if (openMinutes == null || closeMinutes == null) {
        return true
    }

    const nowMinutes = getNowMinutes(date)
    if (openMinutes === closeMinutes) {
        return true
    }

    if (openMinutes < closeMinutes) {
        return nowMinutes >= openMinutes && nowMinutes < closeMinutes
    }

    return nowMinutes >= openMinutes || nowMinutes < closeMinutes
}

export const getShopAvailability = (shop, date = new Date()) => {
    const { openingTime, closingTime } = resolveOperatingHours(shop)
    const isManuallyOpen = shop?.isOpen !== false
    const isWithinHours = isWithinOperatingHours(openingTime, closingTime, date)
    const isBusy = Boolean(shop?.isBusy)

    if (!isManuallyOpen) {
        return {
            isAvailable: false,
            label: "Closed",
            reason: "Restaurant is currently closed by the owner",
            isWithinHours,
            isBusy
        }
    }

    if (!isWithinHours) {
        return {
            isAvailable: false,
            label: "Closed",
            reason: "Restaurant is outside opening hours",
            isWithinHours,
            isBusy,
            openingTime,
            closingTime
        }
    }

    if (isBusy) {
        return {
            isAvailable: false,
            label: "Busy",
            reason: "Restaurant is currently busy and not accepting new orders",
            isWithinHours,
            isBusy,
            openingTime,
            closingTime
        }
    }

    return {
        isAvailable: true,
        label: "Open",
        reason: "",
        isWithinHours,
        isBusy,
        openingTime,
        closingTime
    }
}

export default getShopAvailability
