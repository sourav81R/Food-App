import axios from 'axios'
import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setCurrentAddress, setCurrentCity, setCurrentState } from '../redux/userSlice'
import { setAddress, setLocation } from '../redux/mapSlice'

const LOCATION_CACHE_KEY = 'petpooja:lastReverseGeo'
const CACHE_TTL_MS = 10 * 60 * 1000

function useGetCity() {
    const dispatch = useDispatch()
    const { userData, currentCity } = useSelector(state => state.user)
    const apiKey = import.meta.env.VITE_GEOAPIKEY
    const savedLon = userData?.location?.coordinates?.[0]
    const savedLat = userData?.location?.coordinates?.[1]

    useEffect(() => {
        if (!userData?._id || !navigator.geolocation || !apiKey) return

        let isActive = true

        const readCache = () => {
            try {
                const raw = localStorage.getItem(LOCATION_CACHE_KEY)
                if (!raw) return null
                const parsed = JSON.parse(raw)
                if (!parsed?.timestamp || !Number.isFinite(parsed?.lat) || !Number.isFinite(parsed?.lon)) return null
                if (Date.now() - parsed.timestamp > CACHE_TTL_MS) return null
                return parsed
            } catch {
                return null
            }
        }

        const writeCache = (payload) => {
            try {
                localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify({
                    ...payload,
                    timestamp: Date.now()
                }))
            } catch {
                // ignore storage errors
            }
        }

        const applyAddressPayload = (payload) => {
            const city = payload.city || payload.county || null
            const state = payload.state || null
            const addressLine = payload.address_line2 || payload.address_line1 || null

            dispatch(setCurrentCity(city))
            dispatch(setCurrentState(state))
            dispatch(setCurrentAddress(addressLine))
            dispatch(setAddress(addressLine))
        }

        const reverseGeocode = async (latitude, longitude) => {
            try {
                const result = await axios.get(
                    `https://api.geoapify.com/v1/geocode/reverse?lat=${latitude}&lon=${longitude}&format=json&apiKey=${apiKey}`
                )
                if (!isActive) return
                const firstResult = result?.data?.results?.[0]
                if (!firstResult) return
                applyAddressPayload(firstResult)
                writeCache({
                    lat: latitude,
                    lon: longitude,
                    city: firstResult.city || firstResult.county || null,
                    county: firstResult.county || null,
                    state: firstResult.state || null,
                    address_line1: firstResult.address_line1 || null,
                    address_line2: firstResult.address_line2 || null
                })
            } catch (error) {
                console.log(error)
            }
        }

        const cached = readCache()
        if (cached) {
            dispatch(setLocation({ lat: cached.lat, lon: cached.lon }))
            if (!currentCity) {
                applyAddressPayload(cached)
            }
        }

        if (Number.isFinite(savedLon) && Number.isFinite(savedLat)) {
            dispatch(setLocation({ lat: savedLat, lon: savedLon }))
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                if (!isActive) return
                const latitude = position.coords.latitude
                const longitude = position.coords.longitude
                dispatch(setLocation({ lat: latitude, lon: longitude }))

                const isSameAsCache =
                    cached &&
                    Math.abs(cached.lat - latitude) < 0.0005 &&
                    Math.abs(cached.lon - longitude) < 0.0005

                if (!isSameAsCache || !cached?.city) {
                    void reverseGeocode(latitude, longitude)
                }
            },
            (error) => {
                console.log('Location permission/lookup failed:', error.message)
                if (cached && !currentCity) {
                    applyAddressPayload(cached)
                }
            },
            {
                enableHighAccuracy: false,
                timeout: 7000,
                maximumAge: 5 * 60 * 1000
            }
        )

        return () => {
            isActive = false
        }
    }, [dispatch, userData?._id, apiKey, currentCity, savedLon, savedLat])
}

export default useGetCity
