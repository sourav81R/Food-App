import React, { useMemo } from 'react'
import scooter from "../assets/scooter.png"
import home from "../assets/home.png"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import { MapContainer, Marker, Polyline, Popup, useMap } from 'react-leaflet'
import EnhancedMapLayers from './EnhancedMapLayers'
const deliveryBoyIcon = new L.Icon({
    iconUrl: scooter,
    iconSize: [40, 40],
    iconAnchor: [20, 40]
})
const customerIcon = new L.Icon({
    iconUrl: home,
    iconSize: [40, 40],
    iconAnchor: [20, 40]
})

function FitBounds({ path }) {
    const map = useMap()
    React.useEffect(() => {
        if (!Array.isArray(path) || path.length < 2) return
        const bounds = L.latLngBounds(path)
        if (!bounds.isValid()) return
        map.invalidateSize()
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 })
    }, [map, path])
    return null
}

function haversineDistanceKm(from, to) {
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

function toValidCoordinatePoint(location) {
    const lat = Number(location?.lat)
    const lon = Number(location?.lon)

    const isInRange =
        Number.isFinite(lat) &&
        Number.isFinite(lon) &&
        lat >= -90 &&
        lat <= 90 &&
        lon >= -180 &&
        lon <= 180

    if (!isInRange) return null

    const isZeroDefault = Math.abs(lat) < 0.000001 && Math.abs(lon) < 0.000001
    if (isZeroDefault) return null

    return { lat, lon }
}

function DeliveryBoyTracking({ data }) {
    const deliveryBoyPoint = useMemo(() => toValidCoordinatePoint(data?.deliveryBoyLocation), [data?.deliveryBoyLocation])
    const customerPoint = useMemo(() => toValidCoordinatePoint(data?.customerLocation), [data?.customerLocation])
    const isMapReady = Boolean(deliveryBoyPoint && customerPoint)
    const path = useMemo(() => {
        if (!deliveryBoyPoint || !customerPoint) return []
        return [
            [deliveryBoyPoint.lat, deliveryBoyPoint.lon],
            [customerPoint.lat, customerPoint.lon]
        ]
    }, [deliveryBoyPoint, customerPoint])

    const center = useMemo(() => {
        if (!deliveryBoyPoint) return [22.5726, 88.3639]
        return [deliveryBoyPoint.lat, deliveryBoyPoint.lon]
    }, [deliveryBoyPoint])

    const stats = useMemo(() => {
        if (!deliveryBoyPoint || !customerPoint) {
            return {
                distanceKm: null,
                etaMinutes: null
            }
        }

        const distanceKm = haversineDistanceKm(
            deliveryBoyPoint,
            customerPoint
        )
        const averageDeliverySpeedKmph = 25
        const etaMinutes = Math.max(1, Math.round((distanceKm / averageDeliverySpeedKmph) * 60))
        return {
            distanceKm: distanceKm.toFixed(2),
            etaMinutes
        }
    }, [deliveryBoyPoint, customerPoint])

    if (!isMapReady) {
        return (
            <div className='w-full h-[280px] sm:h-[400px] mt-3 rounded-xl overflow-hidden shadow-md bg-gray-100 flex items-center justify-center px-4 text-center text-sm text-gray-600'>
                Live tracking will appear once valid delivery and customer coordinates are available.
            </div>
        )
    }

    return (
        <div className='w-full h-[280px] sm:h-[400px] mt-3 rounded-xl overflow-hidden shadow-md relative'>
            <div className='absolute top-3 left-3 z-[500] bg-white/95 rounded-lg px-3 py-2 shadow text-xs'>
                <p className='font-semibold text-gray-700'>Distance: {stats.distanceKm || "--"} km</p>
                <p className='text-gray-600'>ETA: ~{stats.etaMinutes || "--"} min</p>
            </div>
            <MapContainer
                className={"w-full h-full"}
                center={center}
                zoom={16}
                maxZoom={20}
                scrollWheelZoom
            >
                <EnhancedMapLayers />
                <FitBounds path={path} />
                <Marker position={[deliveryBoyPoint.lat, deliveryBoyPoint.lon]} icon={deliveryBoyIcon}>
                    <Popup>Delivery Boy</Popup>
                </Marker>
                <Marker position={[customerPoint.lat, customerPoint.lon]} icon={customerIcon}>
                    <Popup>Customer</Popup>
                </Marker>
                <Polyline positions={path} color='blue' weight={4} dashArray="8 8" />

            </MapContainer>
        </div>
    )
}

export default DeliveryBoyTracking
