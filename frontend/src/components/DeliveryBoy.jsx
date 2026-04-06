import React from 'react'
import Nav from './Nav'
import { useSelector } from 'react-redux'
import axios from 'axios'
import { serverUrl } from '../App'
import { useEffect } from 'react'
import { useRef, useState } from 'react'
import DeliveryBoyTracking from './DeliveryBoyTracking'
import { ClipLoader } from 'react-spinners'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useSocket } from '../context/SocketContext'
import { isDeliveryRole } from '../utils/roles'

function DeliveryBoy() {
  const { userData } = useSelector(state => state.user)
  const socket = useSocket()
  const lastSocketEmitRef = useRef(0)
  const [currentOrder,setCurrentOrder]=useState()
  const [showOtpBox,setShowOtpBox]=useState(false)
  const [availableAssignments,setAvailableAssignments]=useState(null)
  const [otp,setOtp]=useState("")
  const [earningsRange, setEarningsRange] = useState("today")
  const [earningsChart,setEarningsChart]=useState([])
  const [earningSummary, setEarningSummary] = useState({
    totalDeliveries: 0,
    totalEarnings: 0,
    averagePerDelivery: 0
  })
const [deliveryBoyLocation,setDeliveryBoyLocation]=useState(null)
const [loading,setLoading]=useState(false)
const [message,setMessage]=useState("")
  useEffect(()=>{
if(!socket || !userData || !isDeliveryRole(userData.role)) return
let watchId
if(navigator.geolocation){
watchId=navigator.geolocation.watchPosition((position)=>{
    const latitude=position.coords.latitude
    const longitude=position.coords.longitude
    setDeliveryBoyLocation({lat:latitude,lon:longitude})
    const now = Date.now()
    if (now - lastSocketEmitRef.current < 5000) return
    lastSocketEmitRef.current = now
    socket.emit('updateLocation',{
      latitude,
      longitude,
      userId:userData._id
    })
  },
  (error)=>{
    console.log(error)
  },
  {
    enableHighAccuracy:true,
    maximumAge:10000,
    timeout:8000
  })
}

return ()=>{
  if(watchId)navigator.geolocation.clearWatch(watchId)
}

  },[socket,userData?._id,userData?.role])

  const getAssignments=async () => {
    try {
      const result=await axios.get(`${serverUrl}/api/order/get-assignments`,{withCredentials:true})
      
      setAvailableAssignments(result.data)
    } catch (error) {
      console.log(error)
    }
  }

  const getCurrentOrder=async () => {
     try {
      const result=await axios.get(`${serverUrl}/api/order/get-current-order`,{withCredentials:true})
    setCurrentOrder(result.data)
    } catch (error) {
      console.log(error)
    }
  }


  const acceptOrder=async (assignmentId) => {
    try {
      const result=await axios.get(`${serverUrl}/api/order/accept-order/${assignmentId}`,{withCredentials:true})
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
  
  const sendOtp=async () => {
    setLoading(true)
    try {
      const result=await axios.post(`${serverUrl}/api/order/send-delivery-otp`,{
        orderId:currentOrder._id,shopOrderId:currentOrder.shopOrder._id
      },{withCredentials:true})
      setLoading(false)
       setShowOtpBox(true)
    console.log(result.data)
    } catch (error) {
      console.log(error)
      setLoading(false)
    }
  }
   const verifyOtp=async () => {
    setMessage("")
    try {
      const result=await axios.post(`${serverUrl}/api/order/verify-delivery-otp`,{
        orderId:currentOrder._id,shopOrderId:currentOrder.shopOrder._id,otp
      },{withCredentials:true})
    console.log(result.data)
    setMessage(result.data.message)
    location.reload()
    } catch (error) {
      console.log(error)
    }
  }


   const handleDeliveryEarnings=async (range = earningsRange) => {
    
    try {
      const result=await axios.get(`${serverUrl}/api/delivery/earnings`,{
        params:{range},
        withCredentials:true
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
 

useEffect(()=>{
getAssignments()
getCurrentOrder()
handleDeliveryEarnings(earningsRange)
  },[userData])

  useEffect(() => {
    if (userData?._id) {
      handleDeliveryEarnings(earningsRange)
    }
  }, [earningsRange, userData?._id])
  return (
    <div className='w-full min-h-screen flex flex-col gap-5 items-center bg-[#fff9f6] overflow-y-auto pt-[90px] px-3 sm:px-4'>
      <Nav/>
      <div className='w-full max-w-[900px] flex flex-col gap-5 items-center'>
    <div className='bg-white rounded-2xl shadow-md p-4 sm:p-5 flex flex-col justify-start items-center w-full border border-orange-100 text-center gap-2'>
<h1 className='text-xl font-bold text-[#ff4d2d]'>Welcome, {userData.fullName}</h1>
<p className='text-[#ff4d2d] text-sm break-all'><span className='font-semibold'>Latitude:</span> {deliveryBoyLocation?.lat}, <span className='font-semibold'>Longitude:</span> {deliveryBoyLocation?.lon}</p>
    </div>

<div className='bg-white rounded-2xl shadow-md p-4 sm:p-5 w-full mb-6 border border-orange-100'>
  <div className='flex items-center justify-between gap-3 mb-3'>
  <h1 className='text-lg font-bold text-[#ff4d2d] '>Earnings Overview</h1>
  <div className='flex gap-2'>
    {["today","week","month"].map((range)=>(
      <button key={range} className={`px-3 py-1 rounded-lg text-sm ${earningsRange === range ? 'bg-[#ff4d2d] text-white' : 'bg-orange-50 text-[#ff4d2d]'}`} onClick={()=>setEarningsRange(range)}>
        {range}
      </button>
    ))}
  </div>
  </div>

  <ResponsiveContainer width="100%" height={200}>
   <BarChart data={earningsChart}>
  <CartesianGrid strokeDasharray="3 3"/>
  <XAxis dataKey="label"/>
    <YAxis  allowDecimals={false}/>
    <Tooltip formatter={(value, name)=>[value, name === 'earnings' ? 'earnings' : 'deliveries']}/>
      <Bar dataKey="earnings" fill='#ff4d2d'/>
   </BarChart>
  </ResponsiveContainer>

  <div className='w-full max-w-sm mx-auto mt-6 p-5 sm:p-6 bg-white rounded-2xl shadow-lg text-center'>
<h1 className='text-xl font-semibold text-gray-800 mb-2'>Delivery Earnings</h1>
<p className='text-sm text-gray-500 mb-1'>
  {earningSummary.totalDeliveries} deliveries • Avg Rs {earningSummary.averagePerDelivery}
</p>
<span className='text-3xl font-bold text-green-600'>Rs {earningSummary.totalEarnings}</span>
  </div>
</div>


{!currentOrder && <div className='bg-white rounded-2xl p-4 sm:p-5 shadow-md w-full border border-orange-100'>
<h1 className='text-lg font-bold mb-4 flex items-center gap-2'>Available Orders</h1>

<div className='space-y-4'>
{availableAssignments?.length>0
?
(
availableAssignments.map((a,index)=>(
  <div className='border rounded-lg p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3' key={index}>
   <div className='min-w-0'>
    <p className='text-sm font-semibold'>{a?.shopName}</p>
    <p className='text-sm text-gray-500'><span className='font-semibold'>Delivery Address:</span> {a?.deliveryAddress.text}</p>
<p className='text-xs text-gray-400'>{a.items.length} items | {a.subtotal}</p>
   </div>
   <button className='bg-orange-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-600 w-full sm:w-auto' onClick={()=>acceptOrder(a.assignmentId)}>Accept</button>

  </div>
))
):<p className='text-gray-400 text-sm'>No Available Orders</p>}
</div>
</div>}

{currentOrder && <div className='bg-white rounded-2xl p-4 sm:p-5 shadow-md w-full border border-orange-100'>
<h2 className='text-lg font-bold mb-3'>Current Order</h2>
<div className='border rounded-lg p-4 mb-3'>
  <p className='font-semibold text-sm'>{currentOrder?.shopOrder.shop.name}</p>
  <p className='text-sm text-gray-500'>{currentOrder.deliveryAddress.text}</p>
 <p className='text-xs text-gray-400'>{currentOrder.shopOrder.shopOrderItems.length} items | {currentOrder.shopOrder.subtotal}</p>
</div>

 <DeliveryBoyTracking data={{ 
  deliveryBoyLocation:deliveryBoyLocation || {
        lat: userData.location.coordinates[1],
        lon: userData.location.coordinates[0]
      },
      customerLocation: {
        lat: currentOrder.deliveryAddress.latitude,
        lon: currentOrder.deliveryAddress.longitude
      }}} />
{!showOtpBox ? <button className='mt-4 w-full bg-green-500 text-white font-semibold py-2 px-4 rounded-xl shadow-md hover:bg-green-600 active:scale-95 transition-all duration-200' onClick={sendOtp} disabled={loading}>
{loading?<ClipLoader size={20} color='white'/> :"Mark As Delivered"}
 </button>:<div className='mt-4 p-4 border rounded-xl bg-gray-50'>
<p className='text-sm font-semibold mb-2'>Enter Otp send to <span className='text-orange-500'>{currentOrder.user.fullName}</span></p>
<label htmlFor="delivery-otp-input" className='sr-only'>Delivery OTP</label>
<input id="delivery-otp-input" name="deliveryOtp" type="text" className='w-full border px-3 py-2 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-orange-400' placeholder='Enter OTP' onChange={(e)=>setOtp(e.target.value)} value={otp}/>
{message && <p className='text-center text-green-400 text-2xl mb-4'>{message}</p>}

<button className="w-full bg-orange-500 text-white py-2 rounded-lg font-semibold hover:bg-orange-600 transition-all" onClick={verifyOtp}>Submit OTP</button>
  </div>}

  </div>}


      </div>
    </div>
  )
}

export default DeliveryBoy

