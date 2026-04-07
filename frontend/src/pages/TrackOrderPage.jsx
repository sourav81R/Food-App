import axios from 'axios'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import { IoIosArrowRoundBack } from "react-icons/io";
import { FaClock, FaMapMarkerAlt, FaMotorcycle, FaReceipt, FaStore } from 'react-icons/fa'
import { serverUrl } from '../App'
import DeliveryBoyTracking from '../components/DeliveryBoyTracking'
import OrderProgress from '../components/OrderProgress'
import { useSocket } from '../context/SocketContext'
import { clearOrderEta, setOrderEta, setWalletBalance, setWalletTransactions } from '../redux/userSlice'
import { useToast } from '../context/ToastContext'

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

const getStatusTone = (status = '') => {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'cancelled') return 'bg-red-50 text-red-600 border-red-100'
  if (normalized === 'delivered') return 'bg-emerald-50 text-emerald-700 border-emerald-100'
  if (normalized === 'preparing') return 'bg-amber-50 text-amber-700 border-amber-100'
  if (normalized === 'out of delivery') return 'bg-sky-50 text-sky-700 border-sky-100'
  return 'bg-orange-50 text-[#ff4d2d] border-orange-100'
}

function TrackOrderPage() {
  const { orderId } = useParams()
  const [currentOrder, setCurrentOrder] = useState()
  const [lastUpdated, setLastUpdated] = useState(null)
  const [fetchError, setFetchError] = useState("")
  const [liveLocations, setLiveLocations] = useState({})
  const [cancelLoading, setCancelLoading] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const autoCompletionInFlightRef = useRef(false)
  const navigate = useNavigate()
  const socket = useSocket()
  const dispatch = useDispatch()
  const liveEtaSeconds = useSelector((state) => state.user.liveEtaByOrderId?.[orderId])
  const toast = useToast()

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

  const refreshWalletState = useCallback(async () => {
    try {
      const result = await axios.get(`${serverUrl}/api/wallet/transactions`, { withCredentials: true })
      dispatch(setWalletBalance(result.data?.walletBalance || 0))
      dispatch(setWalletTransactions(result.data?.transactions || []))
    } catch (error) {
      console.log("wallet refresh error", error)
    }
  }, [dispatch])

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
    return currentOrder?.shopOrders?.filter(order => !["delivered", "cancelled"].includes(order.status))?.length || 0
  }, [currentOrder?.shopOrders])

  const canCancelOrder = useMemo(() => {
    const statuses = (currentOrder?.shopOrders || []).map((shopOrder) => shopOrder.status)
    return statuses.length > 0 && statuses.every((status) => ["pending", "preparing"].includes(status))
  }, [currentOrder?.shopOrders])

  const handleCancelOrder = async () => {
    try {
      setCancelLoading(true)
      await axios.post(`${serverUrl}/api/order/${orderId}/cancel`, {
        reason: cancelReason
      }, { withCredentials: true })
      toast.success("Order cancelled successfully")
      setShowCancelModal(false)
      setCancelReason("")
      await Promise.all([handleGetOrder(), refreshWalletState()])
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to cancel order")
    } finally {
      setCancelLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-[linear-gradient(180deg,#fff7f2_0%,#fffaf7_38%,#ffffff_100%)] px-3 sm:px-4 py-4 sm:py-6'>
      <div className='max-w-5xl mx-auto flex flex-col gap-6'>
        <div className='overflow-hidden rounded-[32px] border border-orange-100 bg-white shadow-[0_20px_70px_rgba(15,23,42,0.08)]'>
          <div className='bg-[radial-gradient(circle_at_top_left,_rgba(255,120,82,0.22),_transparent_45%),linear-gradient(135deg,_#fff5ef,_#ffffff_62%)] px-5 py-5 sm:px-7 sm:py-6'>
            <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
              <div className='flex items-start gap-3 sm:gap-4'>
                <button
                  type='button'
                  className='flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#ff4d2d] shadow-sm ring-1 ring-orange-100 transition hover:bg-orange-50'
                  onClick={() => navigate("/my-orders")}
                >
                  <IoIosArrowRoundBack size={30} />
                </button>
                <div>
                  <p className='text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ff6b43]'>Live Tracking</p>
                  <h1 className='mt-1 text-2xl sm:text-3xl font-bold text-slate-900'>Track Order</h1>
                  <p className='mt-1 text-sm text-slate-500'>Follow each restaurant update, delivery stage, and live completion status.</p>
                </div>
              </div>

              {canCancelOrder && (
                <button
                  className='self-start sm:self-auto rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-red-200 transition hover:brightness-105'
                  onClick={() => setShowCancelModal(true)}
                >
                  Cancel Order
                </button>
              )}
            </div>

            <div className='mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2'>
              <div className='rounded-2xl border border-orange-100 bg-white/85 px-4 py-4 shadow-sm backdrop-blur'>
                <p className='text-[11px] font-semibold uppercase tracking-wide text-slate-400'>Active Deliveries</p>
                <p className='mt-2 text-3xl font-bold text-slate-900'>{activeShopOrdersCount}</p>
                <p className='mt-1 text-sm text-slate-500'>Restaurant sections still in progress</p>
              </div>
              <div className='rounded-2xl border border-orange-100 bg-white/85 px-4 py-4 shadow-sm backdrop-blur'>
                <div className='flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400'>
                  <FaClock className='text-[#ff4d2d]' />
                  Last Updated
                </div>
                <p className='mt-2 text-2xl font-bold text-slate-900'>
                  {lastUpdated ? lastUpdated.toLocaleTimeString() : '--:--:--'}
                </p>
                <p className='mt-1 text-sm text-slate-500'>
                  {lastUpdated ? 'Auto-refreshed from live order stream' : 'Waiting for first update...'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {fetchError && <p className='text-sm text-amber-700 bg-amber-50 border border-amber-200 px-4 py-3 rounded-2xl'>{fetchError}</p>}

        {currentOrder?.shopOrders?.map((shopOrder, index) => {
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
          const cancelledAtLabel = shopOrder?.status === "cancelled"
            ? formatOrderDateTime(currentOrder?.cancellation?.cancelledAt || currentOrder?.updatedAt)
            : null
          const refundAmount = Number(currentOrder?.refund?.amount || 0)
          const refundNote = String(currentOrder?.refund?.note || "").trim()
          const cancellationReason = String(currentOrder?.cancellation?.reason || "").trim()
          const isCancelled = shopOrder?.status === "cancelled" || currentOrder?.status === "cancelled"
          const itemNames = shopOrder.shopOrderItems?.map(i => i.name).join(", ")
          const statusLabel = isCancelled ? 'cancelled' : (shopOrder?.status || currentOrder?.status || 'pending')

          return (
            <div className='overflow-hidden rounded-[30px] border border-orange-100 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)]' key={index}>
              <div className='p-5 sm:p-7 space-y-5'>
                <div className='flex flex-col gap-4 border-b border-orange-100 pb-5 sm:flex-row sm:items-start sm:justify-between'>
                  <div className='min-w-0'>
                    <div className='flex items-center gap-3'>
                      <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff1ea] text-[#ff4d2d]'>
                        <FaStore size={18} />
                      </div>
                      <div>
                        <p className='text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400'>Restaurant</p>
                        <h2 className='text-2xl font-bold text-slate-900'>{shopOrder.shop.name}</h2>
                      </div>
                    </div>
                    <p className='mt-4 flex items-start gap-2 text-sm leading-6 text-slate-600'>
                      <FaReceipt className='mt-1 shrink-0 text-[#ff4d2d]' />
                      <span><span className='font-semibold text-slate-800'>Items:</span> {itemNames}</span>
                    </p>
                  </div>

                  <div className='flex flex-wrap items-center gap-3'>
                    <div className='rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-right'>
                      <p className='text-[11px] font-semibold uppercase tracking-wide text-slate-400'>Subtotal</p>
                      <p className='mt-1 text-xl font-bold text-slate-900'>Rs {shopOrder.subtotal}</p>
                    </div>
                    <span className={`inline-flex rounded-full border px-4 py-2 text-sm font-semibold capitalize ${getStatusTone(statusLabel)}`}>
                      {statusLabel}
                    </span>
                  </div>
                </div>

                <div className='rounded-[26px] border border-slate-200 bg-[linear-gradient(135deg,#fffdfa,#ffffff)] p-4 shadow-sm'>
                  <div className='flex items-start gap-3'>
                    <div className='flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#fff1ea] text-[#ff4d2d]'>
                      <FaMapMarkerAlt size={18} />
                    </div>
                    <div>
                      <p className='text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400'>Delivery Address</p>
                      <p className='mt-2 text-base leading-7 text-slate-700'>{currentOrder.deliveryAddress?.text}</p>
                    </div>
                  </div>
                </div>

                {!isCancelled && (
                  <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                    <div className='rounded-[26px] border border-orange-100 bg-[linear-gradient(135deg,#fff7ef,#fffdfb)] px-5 py-4 shadow-sm'>
                      <p className='text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400'>Ordered On</p>
                      <p className='mt-2 text-lg font-bold text-slate-900'>{orderedAtLabel}</p>
                    </div>
                    <div className='rounded-[26px] border border-emerald-100 bg-[linear-gradient(135deg,#effcf5,#f8fffb)] px-5 py-4 shadow-sm'>
                      <p className='text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400'>Delivered On</p>
                      <p className='mt-2 text-lg font-bold text-slate-900'>{deliveredAtLabel || 'Not delivered yet'}</p>
                    </div>
                  </div>
                )}

                {isCancelled ? (
                  <div className='rounded-[28px] border border-red-200 bg-[linear-gradient(135deg,#fff3f3,#fffafb)] px-5 py-6 text-center shadow-sm'>
                    <p className='text-[11px] font-semibold uppercase tracking-[0.22em] text-red-500'>Cancelled Order</p>
                    <p className='mt-2 text-2xl font-bold text-red-600'>Order Cancelled</p>
                    <p className='mt-3 text-sm font-medium text-slate-600'>This order has been cancelled and will not be delivered.</p>
                    <div className='mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3'>
                      {cancelledAtLabel && (
                        <div className='rounded-2xl bg-white/80 px-4 py-3 shadow-sm'>
                          <p className='text-[11px] font-semibold uppercase tracking-wide text-slate-400'>Cancelled On</p>
                          <p className='mt-2 text-sm font-semibold text-slate-800'>{cancelledAtLabel}</p>
                        </div>
                      )}
                      {cancellationReason && (
                        <div className='rounded-2xl bg-white/80 px-4 py-3 shadow-sm'>
                          <p className='text-[11px] font-semibold uppercase tracking-wide text-slate-400'>Reason</p>
                          <p className='mt-2 text-sm font-semibold text-slate-800'>{cancellationReason}</p>
                        </div>
                      )}
                      {currentOrder?.refund?.status === "processed" && (
                        <div className='rounded-2xl bg-white/80 px-4 py-3 shadow-sm'>
                          <p className='text-[11px] font-semibold uppercase tracking-wide text-slate-400'>Refund</p>
                          <p className='mt-2 text-sm font-semibold text-slate-800'>{refundAmount > 0 ? `Rs ${refundAmount}` : 'No refund required'}</p>
                        </div>
                      )}
                    </div>
                    {refundNote && <p className='mt-4 text-sm text-slate-500'>{refundNote}</p>}
                  </div>
                ) : (
                  <OrderProgress
                    currentStatus={progressStatus}
                    etaSecondsRemaining={resolvedEtaSeconds}
                    canAutoComplete={canAutoComplete}
                    onEtaComplete={handleAutoCompleteByEta}
                  />
                )}

                {isCancelled ? (
                  <div className='rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-center text-lg font-semibold text-red-600'>
                    Cancelled
                  </div>
                ) : shopOrder.status !== "delivered" ? (
                  assignedPartner ? (
                    <div className='rounded-[26px] border border-orange-100 bg-[linear-gradient(135deg,#fff8f4,#ffffff)] p-4 shadow-sm'>
                      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                        <div className='flex items-start gap-3'>
                          <div className='flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#fff1ea] text-[#ff4d2d]'>
                            <FaMotorcycle size={18} />
                          </div>
                          <div>
                            <p className='text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400'>Delivery Partner</p>
                            <p className='mt-1 text-lg font-bold text-slate-900'>{assignedPartner.fullName || "Not available"}</p>
                            <p className='mt-1 text-sm text-slate-500'>Contact: {assignedPartner.mobile || "Not available"}</p>
                            {assignedPartner?.vehicleNumber && <p className='text-sm text-slate-500'>Vehicle: {assignedPartner.vehicleNumber}</p>}
                          </div>
                        </div>
                        {assignedPartner?.mobile && (
                          <a
                            href={`tel:${assignedPartner.mobile}`}
                            className='inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-[#ff6b43] to-[#ff4d2d] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition hover:brightness-105'
                          >
                            Call Delivery Partner
                          </a>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-center text-sm font-medium text-slate-600'>
                      Delivery partner is not assigned yet.
                    </div>
                  )
                ) : (
                  <div className='rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-center text-lg font-semibold text-emerald-700'>
                    Delivered
                  </div>
                )}

                {(assignedPartner && partnerLocation && hasCustomerLocation && shopOrder.status !== "delivered" && !isCancelled) && (
                  <div className="overflow-hidden rounded-[28px] border border-orange-100 shadow-md">
                    <div className='bg-[linear-gradient(135deg,#fff7ef,#ffffff)] px-5 py-4 border-b border-orange-100'>
                      <p className='text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400'>Live Map</p>
                      <p className='mt-1 text-lg font-bold text-slate-900'>Delivery route in motion</p>
                    </div>
                    <div className="h-[280px] sm:h-[360px] w-full">
                      <DeliveryBoyTracking data={{
                        deliveryBoyLocation: partnerLocation,
                        customerLocation: {
                          lat: currentOrder.deliveryAddress.latitude,
                          lon: currentOrder.deliveryAddress.longitude
                        }
                      }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {showCancelModal && (
        <div className='fixed inset-0 bg-slate-950/55 backdrop-blur-[3px] flex items-center justify-center px-4 z-[10000]'>
          <div className='w-full max-w-md overflow-hidden rounded-[28px] border border-orange-100 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.24)]'>
            <div className='bg-[radial-gradient(circle_at_top_left,_rgba(255,120,82,0.18),_transparent_52%),linear-gradient(135deg,_#fff7f2,_#ffffff)] px-6 pt-6 pb-5 border-b border-orange-100'>
              <p className='text-[11px] font-semibold uppercase tracking-[0.24em] text-red-500'>Cancel Order</p>
              <h2 className='mt-1 text-2xl font-bold text-slate-900'>Cancel this order?</h2>
              <p className='mt-2 text-sm leading-6 text-slate-600'>You can cancel only while the order is still pending or preparing.</p>
            </div>
            <div className='px-6 py-5 space-y-4'>
              <textarea
                className='w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#ff4d2d]'
                rows={3}
                placeholder='Optional cancellation reason'
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
              />
              <div className='flex flex-col-reverse sm:flex-row sm:justify-end gap-3'>
                <button className='w-full sm:w-auto rounded-2xl border border-slate-200 bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200' onClick={() => setShowCancelModal(false)}>Keep Order</button>
                <button className='w-full sm:w-auto rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-red-200 disabled:opacity-60' onClick={handleCancelOrder} disabled={cancelLoading}>
                  {cancelLoading ? "Cancelling..." : "Confirm Cancel"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TrackOrderPage
