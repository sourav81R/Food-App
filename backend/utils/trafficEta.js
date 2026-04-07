const ETA_CACHE = new Map()
const CACHE_TTL_MS = Number(process.env.TRAFFIC_CACHE_TTL_MS || 15000)
const REQUEST_TIMEOUT_MS = Number(process.env.TRAFFIC_REQUEST_TIMEOUT_MS || 5000)

const toNumber = (value) => {
    const num = Number(value)
    return Number.isFinite(num) ? num : null
}

const parseCoords = (lat, lon) => {
    const safeLat = toNumber(lat)
    const safeLon = toNumber(lon)
    if (safeLat == null || safeLon == null) return null
    if (safeLat < -90 || safeLat > 90 || safeLon < -180 || safeLon > 180) return null
    if (Math.abs(safeLat) < 0.000001 && Math.abs(safeLon) < 0.000001) return null
    return { lat: safeLat, lon: safeLon }
}

const estimateEtaSecondsFromDistance = (distanceKm) => {
    const safeDistanceKm = Math.max(0, Number(distanceKm) || 0)
    return Math.max(60, Math.round(safeDistanceKm * 90))
}

const haversineDistanceKm = (from, to) => {
    const toRad = (value) => (value * Math.PI) / 180
    const earthRadius = 6371
    const dLat = toRad(to.lat - from.lat)
    const dLon = toRad(to.lon - from.lon)
    const lat1 = toRad(from.lat)
    const lat2 = toRad(to.lat)

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2)

    return earthRadius * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

const classifyTraffic = (durationSeconds, distanceKm) => {
    if (!Number.isFinite(durationSeconds) || !Number.isFinite(distanceKm) || durationSeconds <= 0 || distanceKm <= 0) {
        return "medium"
    }

    const speedKmph = distanceKm / (durationSeconds / 3600)
    if (speedKmph < 18) return "high"
    if (speedKmph < 30) return "medium"
    return "low"
}

const getHeuristicTrafficProfile = (date = new Date()) => {
    const hour = date.getHours()
    if ((hour >= 8 && hour < 11) || (hour >= 18 && hour < 22)) {
        return { level: "high", speedKmph: 16, totalMinutes: 55 }
    }
    if ((hour >= 7 && hour < 8) || (hour >= 11 && hour < 13) || (hour >= 17 && hour < 18) || (hour >= 22 && hour < 23)) {
        return { level: "medium", speedKmph: 24, totalMinutes: 45 }
    }
    return { level: "low", speedKmph: 34, totalMinutes: 35 }
}

const fetchWithTimeout = async (url) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    try {
        const response = await fetch(url, { signal: controller.signal })
        return response
    } finally {
        clearTimeout(timer)
    }
}

/**
 * Prevents active orders from surfacing a premature 0-second ETA.
 *
 * @param {number} seconds
 * @param {{ allowZero?: boolean }} [options]
 * @returns {number}
 */
const normalizeActiveEtaSeconds = (seconds, options = {}) => {
    const safeSeconds = Math.max(0, Math.round(Number(seconds) || 0))
    if (options.allowZero || safeSeconds === 0) return safeSeconds
    return Math.max(60, safeSeconds)
}

/**
 * Fetches a live ETA from the public OSRM routing API for a driver/customer pair.
 *
 * @param {{ from: { lat: number, lon: number }, to: { lat: number, lon: number } }} params
 * @returns {Promise<{provider: string, source: string, remainingSeconds: number, trafficLevel: string, distanceKm: number, fetchedAt: string}>}
 */
const fetchOsrmEta = async ({ from, to }) => {
    const coordinates = `${from.lon},${from.lat};${to.lon},${to.lat}`
    const url = new URL(`https://router.project-osrm.org/route/v1/driving/${coordinates}`)
    url.searchParams.set("overview", "false")

    const response = await fetchWithTimeout(url.toString())
    if (!response.ok) {
        throw new Error(`OSRM route API failed with status ${response.status}`)
    }

    const payload = await response.json()
    const route = payload?.routes?.[0]
    if (!route) {
        throw new Error("OSRM route API returned no route")
    }

    const durationSeconds = Number(route.duration || 0)
    const distanceKm = Number(route.distance || 0) / 1000

    return {
        provider: "osrm",
        source: "live",
        remainingSeconds: normalizeActiveEtaSeconds(estimateEtaSecondsFromDistance(distanceKm)),
        trafficLevel: classifyTraffic(durationSeconds, distanceKm),
        distanceKm,
        fetchedAt: new Date().toISOString()
    }
}

const fetchGoogleTrafficEta = async ({ from, to, apiKey }) => {
    const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json")
    url.searchParams.set("origins", `${from.lat},${from.lon}`)
    url.searchParams.set("destinations", `${to.lat},${to.lon}`)
    url.searchParams.set("departure_time", "now")
    url.searchParams.set("traffic_model", "best_guess")
    url.searchParams.set("key", apiKey)

    const response = await fetchWithTimeout(url.toString())
    if (!response.ok) {
        throw new Error(`Google traffic API failed with status ${response.status}`)
    }

    const payload = await response.json()
    const element = payload?.rows?.[0]?.elements?.[0]
    if (!element || element.status !== "OK") {
        throw new Error("Google traffic API returned no route")
    }

    const durationSeconds = Number(element?.duration_in_traffic?.value || element?.duration?.value || 0)
    const distanceKm = Number(element?.distance?.value || 0) / 1000

    return {
        provider: "google",
        source: "live",
        remainingSeconds: normalizeActiveEtaSeconds(estimateEtaSecondsFromDistance(distanceKm)),
        trafficLevel: classifyTraffic(durationSeconds, distanceKm),
        distanceKm,
        fetchedAt: new Date().toISOString()
    }
}

const fetchMapboxTrafficEta = async ({ from, to, token }) => {
    const coordinates = `${from.lon},${from.lat};${to.lon},${to.lat}`
    const url = new URL(`https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coordinates}`)
    url.searchParams.set("alternatives", "false")
    url.searchParams.set("overview", "false")
    url.searchParams.set("steps", "false")
    url.searchParams.set("access_token", token)

    const response = await fetchWithTimeout(url.toString())
    if (!response.ok) {
        throw new Error(`Mapbox traffic API failed with status ${response.status}`)
    }

    const payload = await response.json()
    const route = payload?.routes?.[0]
    if (!route) {
        throw new Error("Mapbox traffic API returned no route")
    }

    const durationSeconds = Number(route.duration || 0)
    const distanceKm = Number(route.distance || 0) / 1000

    return {
        provider: "mapbox",
        source: "live",
        remainingSeconds: normalizeActiveEtaSeconds(estimateEtaSecondsFromDistance(distanceKm)),
        trafficLevel: classifyTraffic(durationSeconds, distanceKm),
        distanceKm,
        fetchedAt: new Date().toISOString()
    }
}

const getCacheKey = (provider, from, to) => {
    const fLat = from.lat.toFixed(5)
    const fLon = from.lon.toFixed(5)
    const tLat = to.lat.toFixed(5)
    const tLon = to.lon.toFixed(5)
    return `${provider}:${fLat},${fLon}:${tLat},${tLon}`
}

const readCache = (key) => {
    const item = ETA_CACHE.get(key)
    if (!item) return null
    if ((Date.now() - item.timestamp) > CACHE_TTL_MS) {
        ETA_CACHE.delete(key)
        return null
    }
    if (!item.value || !Number.isFinite(Number(item.value?.remainingSeconds))) {
        return item.value
    }

    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - item.timestamp) / 1000))
    const adjustedRemainingSeconds = Math.max(0, Number(item.value.remainingSeconds) - elapsedSeconds)

    return {
        ...item.value,
        remainingSeconds: adjustedRemainingSeconds,
        fetchedAt: new Date().toISOString()
    }
}

const writeCache = (key, value) => {
    ETA_CACHE.set(key, { value, timestamp: Date.now() })
}

const getConfiguredProvider = () => {
    const configured = String(process.env.TRAFFIC_PROVIDER || "").trim().toLowerCase()
    if (configured === "osrm") return configured
    if (configured === "google" || configured === "mapbox") return configured
    if (process.env.GOOGLE_MAPS_API_KEY) return "google"
    if (process.env.MAPBOX_ACCESS_TOKEN) return "mapbox"
    return "osrm"
}

const fallbackEtaFromCreatedAt = ({ createdAt, statusIndex, now = new Date() }) => {
    const traffic = getHeuristicTrafficProfile(now)
    if (statusIndex >= 3) {
        return {
            provider: "heuristic",
            source: "heuristic",
            remainingSeconds: normalizeActiveEtaSeconds(0, { allowZero: true }),
            trafficLevel: traffic.level,
            fetchedAt: new Date().toISOString()
        }
    }

    const createdMs = new Date(createdAt).getTime()
    if (!Number.isFinite(createdMs)) {
        return {
            provider: "heuristic",
            source: "heuristic",
            remainingSeconds: normalizeActiveEtaSeconds(traffic.totalMinutes * 60),
            trafficLevel: traffic.level,
            fetchedAt: new Date().toISOString()
        }
    }

    const baseByStatusMinutes = {
        0: traffic.totalMinutes,
        1: Math.max(traffic.totalMinutes - 10, 10),
        2: Math.max(traffic.totalMinutes - 20, 8)
    }
    const targetSeconds = (baseByStatusMinutes[statusIndex] || traffic.totalMinutes) * 60
    const elapsedSeconds = Math.max(0, Math.floor((now.getTime() - createdMs) / 1000))

    return {
        provider: "heuristic",
        source: "heuristic",
        remainingSeconds: normalizeActiveEtaSeconds(targetSeconds - elapsedSeconds),
        trafficLevel: traffic.level,
        fetchedAt: new Date().toISOString()
    }
}

const fallbackEtaFromDistance = ({ from, to, now = new Date() }) => {
    const traffic = getHeuristicTrafficProfile(now)
    const distanceKm = haversineDistanceKm(from, to)
    const durationSeconds = estimateEtaSecondsFromDistance(distanceKm)

    return {
        provider: "heuristic",
        source: "heuristic",
        remainingSeconds: normalizeActiveEtaSeconds(durationSeconds),
        trafficLevel: traffic.level,
        distanceKm,
        fetchedAt: new Date().toISOString()
    }
}

export const resolveOrderEta = async ({
    order,
    statusIndex,
    now = new Date(),
    fromCoords,
    destinationCoords,
    providerOverride
}) => {
    if (statusIndex >= 3) {
        return {
            provider: "system",
            source: "delivered",
            remainingSeconds: normalizeActiveEtaSeconds(0, { allowZero: true }),
            trafficLevel: "low",
            fetchedAt: new Date().toISOString()
        }
    }

    const destination = typeof destinationCoords === "function" ? destinationCoords(order) : destinationCoords
    const source = typeof fromCoords === "function" ? fromCoords(order) : fromCoords

    const safeFrom = source ? parseCoords(source.lat, source.lon) : null
    const safeTo = destination ? parseCoords(destination.lat, destination.lon) : null

    if (!safeFrom || !safeTo) {
        return fallbackEtaFromCreatedAt({ createdAt: order?.createdAt, statusIndex, now })
    }

    const provider = String(providerOverride || getConfiguredProvider()).trim().toLowerCase()
    if (provider === "heuristic") {
        return fallbackEtaFromDistance({ from: safeFrom, to: safeTo, now })
    }

    const key = getCacheKey(provider, safeFrom, safeTo)
    const cached = readCache(key)
    if (cached) return cached

    if (provider === "osrm") {
        try {
            const value = await fetchOsrmEta({ from: safeFrom, to: safeTo })
            writeCache(key, value)
            return value
        } catch (error) {
            const fallback = fallbackEtaFromDistance({ from: safeFrom, to: safeTo, now })
            writeCache(key, fallback)
            return fallback
        }
    }

    const googleKey = process.env.GOOGLE_MAPS_API_KEY
    const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN

    const liveFetchers = provider === "google"
        ? [
            () => fetchGoogleTrafficEta({ from: safeFrom, to: safeTo, apiKey: googleKey }),
            () => fetchMapboxTrafficEta({ from: safeFrom, to: safeTo, token: mapboxToken })
        ]
        : [
            () => fetchMapboxTrafficEta({ from: safeFrom, to: safeTo, token: mapboxToken }),
            () => fetchGoogleTrafficEta({ from: safeFrom, to: safeTo, apiKey: googleKey })
        ]

    for (const fetcher of liveFetchers) {
        try {
            const value = await fetcher()
            writeCache(key, value)
            return value
        } catch (error) {
            // try next provider
        }
    }

    const fallback = fallbackEtaFromDistance({ from: safeFrom, to: safeTo, now })
    writeCache(key, fallback)
    return fallback
}
