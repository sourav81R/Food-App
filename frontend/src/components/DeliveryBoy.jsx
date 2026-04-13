import React, { useEffect, useRef, useState } from 'react'
import Nav from './Nav'
import { useSelector } from 'react-redux'
import axios from 'axios'
import { serverUrl } from '../App'
import DeliveryBoyTracking from './DeliveryBoyTracking'
import { ClipLoader } from 'react-spinners'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useSocket } from '../context/SocketContext'
import { isDeliveryRole } from '../utils/roles'
import { useTheme } from '../context/ThemeContext'
import { FaChartLine, FaClock, FaLocationArrow, FaMapMarkerAlt, FaMoneyBillWave, FaMotorcycle, FaRoute } from "react-icons/fa";

function DeliveryBoy() {
  const { userData } = useSelector(state => state.user)
  const { isDark } = useTheme()
  const socket = useSocket()
  const lastSocketEmitRef = useRef(0)
  const [currentOrder, setCurrentOrder] = useState()
  const [showOtpBox, setShowOtpBox] = useState(false)
  const [availableAssignments, setAvailableAssignments] = useState(null)
  const [otp, setOtp] = useState("")
  const [earningsRange, setEarningsRange] = useState("today")
  const [earningsChart, setEarningsChart] = useState([])
  const [earningSummary, setEarningSummary] = useState({
    totalDeliveries: 0,
    totalEarnings: 0,
    averagePerDelivery: 0
  })
  const [deliveryBoyLocation, setDeliveryBoyLocation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  const latitudeLabel = Number.isFinite(Number(deliveryBoyLocation?.lat))
    ? Number(deliveryBoyLocation.lat).toFixed(5)
    : "Locating..."
  const longitudeLabel = Number.isFinite(Number(deliveryBoyLocation?.lon))
    ? Number(deliveryBoyLocation.lon).toFixed(5)
    : "Locating..."

  useEffect(() => {
    if (!socket || !userData || !isDeliveryRole(userData.role)) return
    let watchId
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition((position) => {
        const latitude = position.coords.latitude
        const longitude = position.coords.longitude
        setDeliveryBoyLocation({ lat: latitude, lon: longitude })
        const now = Date.now()
        if (now - lastSocketEmitRef.current < 5000) return
        lastSocketEmitRef.current = now
        socket.emit('updateLocation', {
          latitude,
          longitude,
          userId: userData._id
        })
      },
      (error) => {
        console.log(error)
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 8000
      })
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId)
    }
  }, [socket, userData?._id, userData?.role])

  const getAssignments = async () => {
    try {
      const result = await axios.get(`${serverUrl}/api/order/get-assignments`, { withCredentials: true })
      setAvailableAssignments(result.data)
    } catch (error) {
      console.log(error)
    }
  }

  const getCurrentOrder = async () => {
    try {
      const result = await axios.get(`${serverUrl}/api/order/get-current-order`, { withCredentials: true })
      setCurrentOrder(result.data)
    } catch (error) {
      console.log(error)
    }
  }

  const acceptOrder = async (assignmentId) => {
    try {
      const result = await axios.get(`${serverUrl}/api/order/accept-order/${assignmentId}`, { withCredentials: true })
      console.log(result.data)
      await getCurrentOrder()
    } catch (error) {
      console.log(error)
    }
  }

  useEffect(() => {
    if (!socket) return
    const handleNewAssignment = (data) => {
      setAvailableAssignments(prev => ([...(prev || []), data]))
    }
    socket.on('newAssignment', handleNewAssignment)
    return () => {
      socket.off('newAssignment', handleNewAssignment)
    }
  }, [socket])

  const sendOtp = async () => {
    setLoading(true)
    try {
      const result = await axios.post(`${serverUrl}/api/order/send-delivery-otp`, {
        orderId: currentOrder._id, shopOrderId: currentOrder.shopOrder._id
      }, { withCredentials: true })
      setLoading(false)
      setShowOtpBox(true)
      console.log(result.data)
    } catch (error) {
      console.log(error)
      setLoading(false)
    }
  }

  const verifyOtp = async () => {
    setMessage("")
    try {
      const result = await axios.post(`${serverUrl}/api/order/verify-delivery-otp`, {
        orderId: currentOrder._id, shopOrderId: currentOrder.shopOrder._id, otp
      }, { withCredentials: true })
      console.log(result.data)
      setMessage(result.data.message)
      location.reload()
    } catch (error) {
      console.log(error)
    }
  }

  const handleDeliveryEarnings = async (range = earningsRange) => {
    try {
      const result = await axios.get(`${serverUrl}/api/delivery/earnings`, {
        params: { range },
        withCredentials: true
      })
      const payload = result.data
      const dailyEarnings = Array.isArray(payload?.dailyEarnings) ? payload.dailyEarnings : []
      setEarningsChart(dailyEarnings)
      setEarningSummary({
        totalDeliveries: Number(payload?.totalDeliveries || 0),
        totalEarnings: Number(payload?.totalEarnings || 0),
        averagePerDelivery: Number(payload?.averagePerDelivery || 0)
      })
    } catch (error) {
      console.log(error)
    }
  }

  useEffect(() => {
    getAssignments()
    getCurrentOrder()
    handleDeliveryEarnings(earningsRange)
  }, [userData])

  useEffect(() => {
    if (userData?._id) {
      handleDeliveryEarnings(earningsRange)
    }
  }, [earningsRange, userData?._id])

  return (
    <div className={`w-full min-h-screen flex flex-col gap-5 items-center overflow-y-auto pt-[90px] px-3 sm:px-4 ${isDark ? 'bg-[linear-gradient(180deg,#091120_0%,#10192d_48%,#0b1425_100%)]' : 'bg-[linear-gradient(180deg,#fff7f2_0%,#fffaf7_38%,#ffffff_100%)]'}`}>
      <Nav />
      <div className='w-full max-w-6xl flex flex-col gap-5 items-center'>
        <div className={`w-full overflow-hidden rounded-[32px] border ${isDark ? 'border-white/10 bg-[linear-gradient(180deg,rgba(18,28,46,0.98),rgba(12,20,34,0.98))] shadow-[0_30px_90px_rgba(2,6,23,0.42)]' : 'border-orange-100 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]'}`}>
          <div className={`${isDark ? 'bg-[radial-gradient(circle_at_top_left,_rgba(255,120,82,0.16),_transparent_44%),linear-gradient(135deg,rgba(255,255,255,0.02),rgba(255,255,255,0))]' : 'bg-[radial-gradient(circle_at_top_left,_rgba(255,120,82,0.22),_transparent_44%),linear-gradient(135deg,_#fff5ef,_#ffffff_62%)]'} px-5 py-5 sm:px-7 sm:py-7`}>
            <div className='flex flex-col gap-6 xl:flex-row xl:items-stretch'>
              <div className='flex-1'>
                <div className='inline-flex items-center gap-2 rounded-full bg-[#ff4d2d]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ff6b43]'>
                  <FaMotorcycle />
                  Delivery Command
                </div>
                <h1 className={`mt-4 text-3xl font-bold sm:text-4xl ${isDark ? 'text-white' : 'text-slate-900'}`}>Welcome, {userData.fullName}</h1>
                <p className={`mt-3 max-w-2xl text-sm leading-7 sm:text-base ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
                  Stay on top of routes, track your live position, and monitor how your completed deliveries are turning into earnings.
                </p>

                <div className='mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3'>
                  <div className={`rounded-[24px] border p-4 ${isDark ? 'border-white/10 bg-white/5' : 'border-orange-100 bg-white/85'}`}>
                    <p className='text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ff6b43]'>Latitude</p>
                    <p className={`mt-3 flex items-center gap-2 text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}><FaLocationArrow className='text-[#ff6b43]' />{latitudeLabel}</p>
                    <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Live device position</p>
                  </div>
                  <div className={`rounded-[24px] border p-4 ${isDark ? 'border-white/10 bg-white/5' : 'border-orange-100 bg-white/85'}`}>
                    <p className='text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ff6b43]'>Longitude</p>
                    <p className={`mt-3 flex items-center gap-2 text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}><FaMapMarkerAlt className='text-[#ff6b43]' />{longitudeLabel}</p>
                    <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Updated from GPS</p>
                  </div>
                  <div className={`rounded-[24px] border p-4 ${isDark ? 'border-white/10 bg-white/5' : 'border-orange-100 bg-white/85'}`}>
                    <p className='text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ff6b43]'>Trip Mode</p>
                    <p className={`mt-3 flex items-center gap-2 text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}><FaRoute className='text-emerald-500' />On delivery watch</p>
                    <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Ready for the next assignment</p>
                  </div>
                </div>
              </div>

              <div className={`w-full xl:w-[320px] rounded-[28px] border p-5 ${isDark ? 'border-white/10 bg-white/5' : 'border-orange-100 bg-white/90'} shadow-sm`}>
                <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>Earning Snapshot</p>
                <div className='mt-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ff4d2d]/10 text-[#ff4d2d]'>
                  <FaMoneyBillWave size={22} />
                </div>
                <p className={`mt-4 text-sm ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>Current selected range</p>
                <p className={`mt-1 text-4xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Rs {earningSummary.totalEarnings}</p>
                <div className='mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2'>
                  <div className={`rounded-2xl px-3 py-3 ${isDark ? 'bg-white/5' : 'bg-orange-50'}`}>
                    <p className='text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ff6b43]'>Deliveries</p>
                    <p className={`mt-2 text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{earningSummary.totalDeliveries}</p>
                  </div>
                  <div className={`rounded-2xl px-3 py-3 ${isDark ? 'bg-white/5' : 'bg-orange-50'}`}>
                    <p className='text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ff6b43]'>Average</p>
                    <p className={`mt-2 text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Rs {earningSummary.averagePerDelivery}</p>
                  </div>
                </div>
                <p className={`mt-4 text-sm leading-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>A polished summary of what your trips are earning over the selected time range.</p>
              </div>
            </div>
          </div>
        </div>

        <div className={`w-full overflow-hidden rounded-[32px] border ${isDark ? 'border-white/10 bg-[linear-gradient(180deg,rgba(18,28,46,0.98),rgba(12,20,34,0.98))] shadow-[0_30px_90px_rgba(2,6,23,0.42)]' : 'border-orange-100 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]'}`}>
          <div className={`${isDark ? 'bg-[radial-gradient(circle_at_top_left,_rgba(255,120,82,0.14),_transparent_48%),linear-gradient(135deg,rgba(255,255,255,0.02),rgba(255,255,255,0))]' : 'bg-[radial-gradient(circle_at_top_left,_rgba(255,120,82,0.16),_transparent_48%),linear-gradient(135deg,_#fff7f2,_#ffffff_65%)]'} px-5 py-5 sm:px-7 sm:py-6 border-b ${isDark ? 'border-white/10' : 'border-orange-100'}`}>
            <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
              <div>
                <div className='inline-flex items-center gap-2 rounded-full bg-[#ff4d2d]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ff6b43]'>
                  <FaChartLine />
                  Earnings Overview
                </div>
                <h1 className={`mt-3 text-2xl font-bold sm:text-3xl ${isDark ? 'text-white' : 'text-slate-900'}`}>Delivery performance</h1>
                <p className={`mt-2 text-sm leading-7 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>Visualize how your recent trips are turning into earnings and delivery activity.</p>
              </div>
              <div className='flex flex-wrap gap-2'>
                {["today", "week", "month"].map((range) => (
                  <button
                    key={range}
                    className={`rounded-2xl px-4 py-2.5 text-sm font-semibold capitalize transition ${earningsRange === range ? 'bg-gradient-to-r from-[#ff6b43] to-[#ff4d2d] text-white shadow-lg shadow-orange-200' : isDark ? 'bg-white/5 text-slate-200 hover:bg-white/10' : 'bg-orange-50 text-[#ff4d2d] hover:bg-orange-100'}`}
                    onClick={() => setEarningsRange(range)}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className='p-5 sm:p-7'>
            <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
              <div className={`rounded-[24px] border p-4 ${isDark ? 'border-white/10 bg-white/5' : 'border-orange-100 bg-[linear-gradient(180deg,#fff8f3,#ffffff)]'}`}>
                <p className='text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ff6b43]'>Trips</p>
                <p className={`mt-3 text-3xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{earningSummary.totalDeliveries}</p>
                <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Completed deliveries</p>
              </div>
              <div className={`rounded-[24px] border p-4 ${isDark ? 'border-white/10 bg-white/5' : 'border-orange-100 bg-[linear-gradient(180deg,#fff8f3,#ffffff)]'}`}>
                <p className='text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ff6b43]'>Average</p>
                <p className={`mt-3 text-3xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Rs {earningSummary.averagePerDelivery}</p>
                <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Per successful trip</p>
              </div>
              <div className={`rounded-[24px] border p-4 ${isDark ? 'border-white/10 bg-white/5' : 'border-orange-100 bg-[linear-gradient(180deg,#fff8f3,#ffffff)]'}`}>
                <p className='text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ff6b43]'>Payout</p>
                <p className='mt-3 text-3xl font-bold text-emerald-500'>Rs {earningSummary.totalEarnings}</p>
                <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total across the selected range</p>
              </div>
            </div>

            <div className='mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[1.65fr_0.95fr]'>
              <div className={`rounded-[28px] border p-4 sm:p-5 ${isDark ? 'border-white/10 bg-white/5' : 'border-orange-100 bg-white'} shadow-sm`}>
                <div className='mb-4 flex items-center justify-between gap-3'>
                  <div>
                    <p className='text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ff6b43]'>Trend Graph</p>
                    <h2 className={`mt-2 text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Earnings curve</h2>
                  </div>
                  <div className={`rounded-full px-3 py-1 text-xs font-semibold ${isDark ? 'bg-white/5 text-slate-300' : 'bg-orange-50 text-[#ff6b43]'}`}>
                    <FaClock className='inline mr-1' />
                    {earningsRange}
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={earningsChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.12)" : "#f2d6cb"} />
                    <XAxis dataKey="label" stroke={isDark ? "#cbd5e1" : "#6b7280"} />
                    <YAxis allowDecimals={false} stroke={isDark ? "#cbd5e1" : "#6b7280"} />
                    <Tooltip formatter={(value, name) => [value, name === 'earnings' ? 'earnings' : 'deliveries']} />
                    <Bar dataKey="earnings" fill='#ff4d2d' radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className={`rounded-[28px] border p-5 sm:p-6 ${isDark ? 'border-white/10 bg-white/5' : 'border-orange-100 bg-[linear-gradient(180deg,#fff8f3,#ffffff)]'} shadow-sm`}>
                <p className='text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ff6b43]'>Delivery Earnings</p>
                <h2 className={`mt-3 text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Rs {earningSummary.totalEarnings}</h2>
                <p className={`mt-2 text-sm leading-6 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
                  {earningSummary.totalDeliveries} deliveries completed with an average of Rs {earningSummary.averagePerDelivery} per trip.
                </p>
                <div className='mt-6 space-y-3'>
                  <div className={`rounded-2xl px-4 py-3 ${isDark ? 'bg-white/5' : 'bg-white'} shadow-sm`}>
                    <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ff6b43]'>Trip output</p>
                    <p className={`mt-2 text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{earningSummary.totalDeliveries} active completions</p>
                  </div>
                  <div className={`rounded-2xl px-4 py-3 ${isDark ? 'bg-white/5' : 'bg-white'} shadow-sm`}>
                    <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ff6b43]'>Average ticket</p>
                    <p className={`mt-2 text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Rs {earningSummary.averagePerDelivery}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {!currentOrder && <div className={`w-full rounded-2xl p-4 sm:p-5 shadow-md border ${isDark ? 'bg-[#10182b] border-white/10 text-white' : 'bg-white border-orange-100'}`}>
          <h1 className='text-lg font-bold mb-4 flex items-center gap-2'>Available Orders</h1>

          <div className='space-y-4'>
            {availableAssignments?.length > 0
              ? (
                availableAssignments.map((a, index) => (
                  <div className={`border rounded-lg p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 ${isDark ? 'border-white/10 bg-white/5' : 'border-orange-100'}`} key={index}>
                    <div className='min-w-0'>
                      <p className='text-sm font-semibold'>{a?.shopName}</p>
                      <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-500'}`}><span className='font-semibold'>Delivery Address:</span> {a?.deliveryAddress.text}</p>
                      <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>{a.items.length} items | {a.subtotal}</p>
                    </div>
                    <button className='bg-orange-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-600 w-full sm:w-auto' onClick={() => acceptOrder(a.assignmentId)}>Accept</button>
                  </div>
                ))
              ) : <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>No Available Orders</p>}
          </div>
        </div>}

        {currentOrder && <div className={`w-full rounded-2xl p-4 sm:p-5 shadow-md border ${isDark ? 'bg-[#10182b] border-white/10 text-white' : 'bg-white border-orange-100'}`}>
          <h2 className='text-lg font-bold mb-3'>Current Order</h2>
          <div className={`border rounded-lg p-4 mb-3 ${isDark ? 'border-white/10 bg-white/5' : 'border-orange-100'}`}>
            <p className='font-semibold text-sm'>{currentOrder?.shopOrder.shop.name}</p>
            <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-500'}`}>{currentOrder.deliveryAddress.text}</p>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>{currentOrder.shopOrder.shopOrderItems.length} items | {currentOrder.shopOrder.subtotal}</p>
          </div>

          <DeliveryBoyTracking data={{
            deliveryBoyLocation: deliveryBoyLocation || {
              lat: userData.location.coordinates[1],
              lon: userData.location.coordinates[0]
            },
            customerLocation: {
              lat: currentOrder.deliveryAddress.latitude,
              lon: currentOrder.deliveryAddress.longitude
            }
          }} />
          {!showOtpBox ? <button className='mt-4 w-full bg-green-500 text-white font-semibold py-2 px-4 rounded-xl shadow-md hover:bg-green-600 active:scale-95 transition-all duration-200' onClick={sendOtp} disabled={loading}>
            {loading ? <ClipLoader size={20} color='white' /> : "Mark As Delivered"}
          </button> : <div className={`mt-4 p-4 border rounded-xl ${isDark ? 'border-white/10 bg-white/5' : 'bg-gray-50'}`}>
            <p className='text-sm font-semibold mb-2'>Enter Otp send to <span className='text-orange-500'>{currentOrder.user.fullName}</span></p>
            <label htmlFor="delivery-otp-input" className='sr-only'>Delivery OTP</label>
            <input id="delivery-otp-input" name="deliveryOtp" type="text" className={`w-full border px-3 py-2 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-orange-400 ${isDark ? 'border-white/10 bg-[#16213e] text-white' : ''}`} placeholder='Enter OTP' onChange={(e) => setOtp(e.target.value)} value={otp} />
            {message && <p className='text-center text-green-400 text-2xl mb-4'>{message}</p>}

            <button className="w-full bg-orange-500 text-white py-2 rounded-lg font-semibold hover:bg-orange-600 transition-all" onClick={verifyOtp}>Submit OTP</button>
          </div>}

        </div>}
      </div>
    </div>
  )
}

export default DeliveryBoy
