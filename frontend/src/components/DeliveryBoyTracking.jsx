import React, { useMemo } from 'react'
import scooter from "../assets/scooter.png"
import home from "../assets/home.png"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
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

function DeliveryBoyTracking({ data }) {

    const deliveryBoyLat = Number(data?.deliveryBoyLocation?.lat)
    const deliveryBoylon = Number(data?.deliveryBoyLocation?.lon)
    const customerLat = Number(data?.customerLocation?.lat)
    const customerlon = Number(data?.customerLocation?.lon)

    if (
        !Number.isFinite(deliveryBoyLat) ||
        !Number.isFinite(deliveryBoylon) ||
        !Number.isFinite(customerLat) ||
        !Number.isFinite(customerlon)
    ) {
        return (
            <div className='w-full h-[400px] mt-3 rounded-xl overflow-hidden shadow-md bg-gray-100 flex items-center justify-center text-sm text-gray-600'>
                Live tracking will appear once both locations are available.
            </div>
        )
    }

    const path = [
        [deliveryBoyLat, deliveryBoylon],
        [customerLat, customerlon]
    ]

    const center = [deliveryBoyLat, deliveryBoylon]
    const stats = useMemo(() => {
        const distanceKm = haversineDistanceKm(
            { lat: deliveryBoyLat, lon: deliveryBoylon },
            { lat: customerLat, lon: customerlon }
        )
        const averageDeliverySpeedKmph = 25
        const etaMinutes = Math.max(1, Math.round((distanceKm / averageDeliverySpeedKmph) * 60))
        return {
            distanceKm: distanceKm.toFixed(2),
            etaMinutes
        }
    }, [deliveryBoyLat, deliveryBoylon, customerLat, customerlon])

    return (
        <div className='w-full h-[400px] mt-3 rounded-xl overflow-hidden shadow-md relative'>
            <div className='absolute top-3 left-3 z-[500] bg-white/95 rounded-lg px-3 py-2 shadow text-xs'>
                <p className='font-semibold text-gray-700'>Distance: {stats.distanceKm} km</p>
                <p className='text-gray-600'>ETA: ~{stats.etaMinutes} min</p>
            </div>
            <MapContainer
                className={"w-full h-full"}
                center={center}
                zoom={16}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <FitBounds path={path} />
             <Marker position={[deliveryBoyLat,deliveryBoylon]} icon={deliveryBoyIcon}>
             <Popup>Delivery Boy</Popup>
             </Marker>
              <Marker position={[customerLat,customerlon]} icon={customerIcon}>
             <Popup>Customer</Popup>
             </Marker>


<Polyline positions={path} color='blue' weight={4} dashArray="8 8"/>

            </MapContainer>
        </div>
    )
}

export default DeliveryBoyTracking
