import axios from 'axios'
import { useEffect, useRef } from 'react'
import { serverUrl } from '../App'
import { useSelector } from 'react-redux'

function useUpdateLocation() {
    const { userData } = useSelector(state => state.user)
    const hasLoggedNetworkErrorRef = useRef(false)
    const lastSentAtRef = useRef(0)
    const lastSentLocationRef = useRef(null)

    useEffect(() => {
        if (!userData?._id || !navigator.geolocation) return

        const getDistanceInMeters = (from, to) => {
            const toRad = (value) => (value * Math.PI) / 180
            const earthRadius = 6371000
            const dLat = toRad(to.lat - from.lat)
            const dLon = toRad(to.lon - from.lon)
            const lat1 = toRad(from.lat)
            const lat2 = toRad(to.lat)

            const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
            return earthRadius * c
        }

        const updateLocation = async (lat, lon) => {
            const now = Date.now()
            if (now - lastSentAtRef.current < 15000) return

            if (lastSentLocationRef.current) {
                const movedMeters = getDistanceInMeters(lastSentLocationRef.current, { lat, lon })
                if (movedMeters < 20) return
            }

            try {
                await axios.post(
                    `${serverUrl}/api/user/update-location`,
                    { lat, lon },
                    { withCredentials: true }
                )
                lastSentAtRef.current = now
                lastSentLocationRef.current = { lat, lon }
                hasLoggedNetworkErrorRef.current = false
            } catch (error) {
                if (!hasLoggedNetworkErrorRef.current) {
                    console.warn('Location update failed. Backend may be unavailable.')
                    hasLoggedNetworkErrorRef.current = true
                }
            }
        }

        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                void updateLocation(position.coords.latitude, position.coords.longitude)
            },
            (error) => {
                console.warn('Geolocation watch failed:', error.message)
            },
            {
                enableHighAccuracy: true,
                maximumAge: 15000,
                timeout: 10000
            }
        )

        return () => {
            navigator.geolocation.clearWatch(watchId)
        }
    }, [userData?._id])
}

export default useUpdateLocation
