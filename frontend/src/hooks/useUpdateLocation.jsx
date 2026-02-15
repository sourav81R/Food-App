import axios from 'axios'
import { useEffect, useRef } from 'react'
import { serverUrl } from '../App'
import { useSelector } from 'react-redux'

function useUpdateLocation() {
    const { userData } = useSelector(state => state.user)
    const hasLoggedNetworkErrorRef = useRef(false)

    useEffect(() => {
        if (!userData?._id || !navigator.geolocation) return

        const updateLocation = async (lat, lon) => {
            try {
                await axios.post(
                    `${serverUrl}/api/user/update-location`,
                    { lat, lon },
                    { withCredentials: true }
                )
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
