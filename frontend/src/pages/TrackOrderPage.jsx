import axios from 'axios'
import React, { useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { serverUrl } from '../App'
import { useEffect } from 'react'
import { useState } from 'react'
import { IoIosArrowRoundBack } from "react-icons/io";
import DeliveryBoyTracking from '../components/DeliveryBoyTracking'
import OrderProgress from '../components/OrderProgress'
import { useSocket } from '../context/SocketContext'
function TrackOrderPage() {
  const { orderId } = useParams()
  const [currentOrder, setCurrentOrder] = useState()
  const [lastUpdated, setLastUpdated] = useState(null)
  const [fetchError, setFetchError] = useState("")
  const navigate = useNavigate()
  const socket = useSocket()
  const [liveLocations, setLiveLocations] = useState({})
  const handleGetOrder = useCallback(async () => {
    try {
      const result = await axios.get(`${serverUrl}/api/order/get-order-by-id/${orderId}`, { withCredentials: true })
      setCurrentOrder(result.data)
      setLastUpdated(new Date())
      setFetchError("")
    } catch (error) {
      console.log(error)
      setFetchError("Unable to refresh live order details. Retrying...")
    }
  }, [orderId])

  useEffect(() => {
    if (!socket) return

    const handleUpdateDeliveryLocation = ({ deliveryBoyId, latitude, longitude }) => {
      setLiveLocations(prev => ({
        ...prev,
        [deliveryBoyId]: { lat: latitude, lon: longitude }
      }))
    }

    socket.on('updateDeliveryLocation', handleUpdateDeliveryLocation)

    return () => {
      socket.off('updateDeliveryLocation', handleUpdateDeliveryLocation)
    }
  }, [socket])

  useEffect(() => {
    void handleGetOrder()
    const intervalId = setInterval(() => {
      void handleGetOrder()
    }, 30000)
    return () => clearInterval(intervalId)
  }, [handleGetOrder])

  const activeShopOrdersCount = useMemo(() => {
    return currentOrder?.shopOrders?.filter(order => order.status !== "delivered")?.length || 0
  }, [currentOrder?.shopOrders])

  return (
    <div className='max-w-4xl mx-auto p-4 flex flex-col gap-6'>
      <div className='relative flex items-center gap-4 top-[20px] left-[20px] z-[10] mb-[10px]' onClick={() => navigate("/")}>
        <IoIosArrowRoundBack size={35} className='text-[#ff4d2d]' />
        <h1 className='text-2xl font-bold md:text-center'>Track Order</h1>
      </div>
      <div className='flex flex-wrap items-center justify-between gap-2 bg-orange-50 border border-orange-100 rounded-xl px-3 py-2 text-sm text-gray-700'>
        <span>Active deliveries: <span className='font-semibold text-[#ff4d2d]'>{activeShopOrdersCount}</span></span>
        <span>{lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : "Waiting for first update..."}</span>
      </div>
      {fetchError && <p className='text-sm text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg'>{fetchError}</p>}
      {currentOrder?.shopOrders?.map((shopOrder, index) => (
        <div className='bg-white p-4 rounded-2xl shadow-md border border-orange-100 space-y-4' key={index}>
          <div>
            <p className='text-lg font-bold mb-2 text-[#ff4d2d]'>{shopOrder.shop.name}</p>
            <p className='font-semibold'><span>Items:</span> {shopOrder.shopOrderItems?.map(i => i.name).join(",")}</p>
            <p><span className='font-semibold'>Subtotal:</span> {shopOrder.subtotal}</p>
            <p className='mt-6'><span className='font-semibold'>Delivery address:</span> {currentOrder.deliveryAddress?.text}</p>
          </div>

          {/* Order Progress Animation */}
          <OrderProgress currentStatus={shopOrder.status} createdAt={currentOrder.createdAt} />

          {shopOrder.status != "delivered" ? <>
            {shopOrder.assignedDeliveryBoy ?
              <div className='text-sm text-gray-700'>
                <p className='font-semibold'><span>Delivery Boy Name:</span> {shopOrder.assignedDeliveryBoy.fullName}</p>
                <p className='font-semibold'><span>Delivery Boy contact No.:</span> {shopOrder.assignedDeliveryBoy.mobile}</p>
              </div> : <p className='font-semibold'>Delivery Boy is not assigned yet.</p>}
          </> : <p className='text-green-600 font-semibold text-lg'>Delivered</p>}

          {(shopOrder.assignedDeliveryBoy && shopOrder.status !== "delivered") && (
            <div className="h-[400px] w-full rounded-2xl overflow-hidden shadow-md">
              <DeliveryBoyTracking data={{
                deliveryBoyLocation: liveLocations[shopOrder.assignedDeliveryBoy._id] || {
                  lat: shopOrder.assignedDeliveryBoy.location.coordinates[1],
                  lon: shopOrder.assignedDeliveryBoy.location.coordinates[0]
                },
                customerLocation: {
                  lat: currentOrder.deliveryAddress.latitude,
                  lon: currentOrder.deliveryAddress.longitude
                }
              }} />
            </div>
          )}



        </div>
      ))}



    </div>
  )
}

export default TrackOrderPage
