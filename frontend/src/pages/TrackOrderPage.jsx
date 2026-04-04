import axios from 'axios'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import { IoIosArrowRoundBack } from "react-icons/io";
import { serverUrl } from '../App'
import DeliveryBoyTracking from '../components/DeliveryBoyTracking'
import OrderProgress from '../components/OrderProgress'
import { useSocket } from '../context/SocketContext'
import { clearOrderEta, setOrderEta } from '../redux/userSlice'

const ETA_UPDATE_EVENT = "eta_update"
const UPDATE_DELIVERY_LOCATION_EVENT = "updateDeliveryLocation"
const ORDER_STATUS_UPDATED_EVENT = "orderStatusUpdated"
const UPDATE_STATUS_EVENT = "update-status"

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

const getFallbackEtaSeconds = (from, to) => {
  if (!from || !to) return null
  const distanceKm = haversineDistanceKm(from, to)
  const averageDeliverySpeedKmph = 25
  return Math.max(60, Math.round((distanceKm / averageDeliverySpeedKmph) * 3600))
}

const formatOrderDateTime = (value) => {
  if (!value) return 'Not available'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not available'

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function TrackOrderPage() {
  const { orderId } = useParams()
  const [currentOrder, setCurrentOrder] = useState()
  const [lastUpdated, setLastUpdated] = useState(null)
  const [fetchError, setFetchError] = useState("")
  const [liveLocations, setLiveLocations] = useState({})
  const autoCompletionInFlightRef = useRef(false)
  const navigate = useNavigate()
  const socket = useSocket()
  const dispatch = useDispatch()
  const liveEtaSeconds = useSelector((state) => state.user.liveEtaByOrderId?.[orderId])

  const handleGetOrder = useCallback(async () => {
    try {
      const result = await axios.get(`${serverUrl}/api/order/get-order-by-id/${orderId}`, { withCredentials: true })
      setCurrentOrder(result.data)
      dispatch(setOrderEta({
        orderId,
        etaSeconds: result?.data?.liveEta?.remainingSeconds
      }))
      setLastUpdated(new Date())
      setFetchError("")
    } catch (error) {
      console.log(error)
      setFetchError("Unable to refresh live order details. Retrying...")
    }
  }, [dispatch, orderId])

  useEffect(() => {
    if (!socket) return

    const handleUpdateDeliveryLocation = ({ deliveryBoyId, latitude, longitude }) => {
      setLiveLocations(prev => ({
        ...prev,
        [deliveryBoyId]: { lat: latitude, lon: longitude }
      }))
    }

    socket.on(UPDATE_DELIVERY_LOCATION_EVENT, handleUpdateDeliveryLocation)

    return () => {
      socket.off(UPDATE_DELIVERY_LOCATION_EVENT, handleUpdateDeliveryLocation)
    }
  }, [socket])

  useEffect(() => {
    if (!socket) return

    const refreshWhenCurrentOrderChanges = (payload) => {
      if (!payload?.orderId) return
      if (String(payload.orderId) !== String(orderId)) return
      void handleGetOrder()
    }

    const refreshWhenShopOrderChanges = (payload) => {
      if (!payload?.orderId) return
      if (String(payload.orderId) !== String(orderId)) return
      void handleGetOrder()
    }

    const handleEtaUpdate = (payload) => {
      if (String(payload?.orderId) !== String(orderId)) return
      dispatch(setOrderEta({
        orderId: payload.orderId,
        etaSeconds: payload.etaSeconds
      }))
      setLastUpdated(new Date())
    }

    socket.on(ORDER_STATUS_UPDATED_EVENT, refreshWhenCurrentOrderChanges)
    socket.on(UPDATE_STATUS_EVENT, refreshWhenShopOrderChanges)
    socket.on(ETA_UPDATE_EVENT, handleEtaUpdate)

    return () => {
      socket.off(ORDER_STATUS_UPDATED_EVENT, refreshWhenCurrentOrderChanges)
      socket.off(UPDATE_STATUS_EVENT, refreshWhenShopOrderChanges)
      socket.off(ETA_UPDATE_EVENT, handleEtaUpdate)
    }
  }, [socket, orderId, handleGetOrder, dispatch])

  useEffect(() => {
    void handleGetOrder()
    const intervalId = setInterval(() => {
      void handleGetOrder()
    }, 30000)

    return () => {
      clearInterval(intervalId)
      dispatch(clearOrderEta(orderId))
    }
  }, [dispatch, handleGetOrder, orderId])

  const handleAutoCompleteByEta = useCallback(async () => {
    if (!currentOrder?._id || autoCompletionInFlightRef.current) return

    autoCompletionInFlightRef.current = true
    try {
      await axios.patch(`${serverUrl}/api/order/auto-complete-by-eta/${currentOrder._id}`, {}, { withCredentials: true })
      await handleGetOrder()
    } catch (error) {
      const remainingSeconds = Number(error?.response?.data?.remainingEtaSeconds)
      if (Number.isFinite(remainingSeconds) && remainingSeconds > 0) {
        dispatch(setOrderEta({
          orderId: currentOrder._id,
          etaSeconds: remainingSeconds
        }))
        await handleGetOrder()
      } else {
        console.log(error)
      }
    } finally {
      autoCompletionInFlightRef.current = false
    }
  }, [currentOrder?._id, dispatch, handleGetOrder])

  const activeShopOrdersCount = useMemo(() => {
    return currentOrder?.shopOrders?.filter(order => order.status !== "delivered")?.length || 0
  }, [currentOrder?.shopOrders])

  return (
    <div className='min-h-screen bg-[#fff9f6] px-3 sm:px-4 py-4 sm:py-6'>
      <div className='max-w-4xl mx-auto flex flex-col gap-6'>
        <div className='flex items-center gap-3 sm:gap-4 cursor-pointer' onClick={() => navigate("/")}>
          <IoIosArrowRoundBack size={35} className='text-[#ff4d2d]' />
          <h1 className='text-xl sm:text-2xl font-bold md:text-center'>Track Order</h1>
        </div>
        <div className='flex flex-wrap items-center justify-between gap-2 bg-orange-50 border border-orange-100 rounded-xl px-3 py-2 text-sm text-gray-700'>
          <span>Active deliveries: <span className='font-semibold text-[#ff4d2d]'>{activeShopOrdersCount}</span></span>
          <span>{lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : "Waiting for first update..."}</span>
        </div>
        {fetchError && <p className='text-sm text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg'>{fetchError}</p>}
        {currentOrder?.shopOrders?.map((shopOrder, index) => (
          <div className='bg-white p-4 rounded-2xl shadow-md border border-orange-100 space-y-4' key={index}>
            {(() => {
              const assignedPartner = shopOrder?.assignedDeliveryBoy || currentOrder?.deliveryPartner || null
              const defaultPartnerLocation =
                Array.isArray(assignedPartner?.location?.coordinates) && assignedPartner.location.coordinates.length === 2
                  ? {
                    lat: assignedPartner.location.coordinates[1],
                    lon: assignedPartner.location.coordinates[0]
                  }
                  : null
              const livePartnerLocation = assignedPartner?._id ? liveLocations[assignedPartner._id] : null
              const partnerLocation = livePartnerLocation || defaultPartnerLocation
              const hasCustomerLocation = Number.isFinite(Number(currentOrder?.deliveryAddress?.latitude)) &&
                Number.isFinite(Number(currentOrder?.deliveryAddress?.longitude))
              const progressStatus = shopOrder?.status === "delivered"
                ? "delivered"
                : (assignedPartner ? "out of delivery" : (currentOrder?.deliveryStatus || shopOrder?.status))
              const canAutoComplete = progressStatus !== "delivered"
              const serverEtaSeconds = Number.isFinite(Number(liveEtaSeconds))
                ? Number(liveEtaSeconds)
                : Number(currentOrder?.liveEta?.remainingSeconds)
              const fallbackEtaSeconds = (partnerLocation && hasCustomerLocation)
                ? getFallbackEtaSeconds(
                  partnerLocation,
                  {
                    lat: Number(currentOrder.deliveryAddress.latitude),
                    lon: Number(currentOrder.deliveryAddress.longitude)
                  }
                )
                : null
              const resolvedEtaSeconds = Number.isFinite(serverEtaSeconds) && serverEtaSeconds > 0
                ? serverEtaSeconds
                : fallbackEtaSeconds
              const orderedAtLabel = formatOrderDateTime(currentOrder?.createdAt)
              const deliveredAtLabel = shopOrder?.status === "delivered"
                ? formatOrderDateTime(shopOrder?.deliveredAt || currentOrder?.updatedAt)
                : null

              return (
                <>
                  <div>
                    <p className='text-lg font-bold mb-2 text-[#ff4d2d]'>{shopOrder.shop.name}</p>
                    <p className='font-semibold break-words'><span>Items:</span> {shopOrder.shopOrderItems?.map(i => i.name).join(",")}</p>
                    <p><span className='font-semibold'>Subtotal:</span> Rs {shopOrder.subtotal}</p>
                    <p className='mt-6 break-words'><span className='font-semibold'>Delivery address:</span> {currentOrder.deliveryAddress?.text}</p>
                    <div className='mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3'>
                      <div className='rounded-xl border border-orange-100 bg-orange-50 px-4 py-3'>
                        <p className='text-xs font-semibold uppercase tracking-wide text-gray-500'>Ordered On</p>
                        <p className='mt-1 text-sm font-semibold text-gray-800'>{orderedAtLabel}</p>
                      </div>
                      <div className='rounded-xl border border-green-100 bg-green-50 px-4 py-3'>
                        <p className='text-xs font-semibold uppercase tracking-wide text-gray-500'>Delivered On</p>
                        <p className='mt-1 text-sm font-semibold text-gray-800'>
                          {deliveredAtLabel || 'Not delivered yet'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <OrderProgress
                    currentStatus={progressStatus}
                    etaSecondsRemaining={resolvedEtaSeconds}
                    canAutoComplete={canAutoComplete}
                    onEtaComplete={handleAutoCompleteByEta}
                  />

                  {shopOrder.status != "delivered" ? <>
                    {assignedPartner ?
                      <div className='text-sm text-gray-700 bg-orange-50 border border-orange-100 rounded-xl p-3'>
                        <p className='font-semibold'><span>Delivery Partner:</span> {assignedPartner.fullName || "Not available"}</p>
                        <p className='font-semibold'><span>Contact:</span> {assignedPartner.mobile || "Not available"}</p>
                        {assignedPartner?.vehicleNumber && <p className='font-semibold'><span>Vehicle:</span> {assignedPartner.vehicleNumber}</p>}
                        {assignedPartner?.mobile && (
                          <a
                            href={`tel:${assignedPartner.mobile}`}
                            className='inline-block mt-2 text-white bg-[#ff4d2d] px-3 py-1 rounded-lg font-medium hover:bg-[#e64526] transition'
                          >
                            Call Delivery Partner
                          </a>
                        )}
                      </div> : <p className='font-semibold'>Delivery Partner is not assigned yet.</p>}
                  </> : <p className='text-green-600 font-semibold text-lg'>Delivered</p>}

                  {(assignedPartner && partnerLocation && hasCustomerLocation && shopOrder.status !== "delivered") && (
                    <div className="h-[280px] sm:h-[360px] w-full rounded-2xl overflow-hidden shadow-md">
                      <DeliveryBoyTracking data={{
                        deliveryBoyLocation: partnerLocation,
                        customerLocation: {
                          lat: currentOrder.deliveryAddress.latitude,
                          lon: currentOrder.deliveryAddress.longitude
                        }
                      }} />
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        ))}
      </div>
    </div>
  )
}

export default TrackOrderPage
