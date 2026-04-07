import resolveOperatingHours from "./shopHours.js";

export const isWithinOperatingHours = () => true

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
