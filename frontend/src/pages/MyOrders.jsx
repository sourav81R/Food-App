import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { IoIosArrowRoundBack } from "react-icons/io";
import { useNavigate } from 'react-router-dom';
import UserOrderCard from '../components/UserOrderCard';
import OwnerOrderCard from '../components/OwnerOrderCard';
import { addMyOrder, setMyOrders, updateRealtimeOrderStatus } from '../redux/userSlice';
import axios from 'axios';
import { serverUrl } from '../App';
import { useSocket } from '../context/SocketContext';


function MyOrders() {
  const { userData, myOrders } = useSelector(state => state.user)
  const socket = useSocket()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [loading, setLoading] = useState(true)

  // Fetch orders on component mount
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true)
        const result = await axios.get(`${serverUrl}/api/order/my-orders`, { withCredentials: true })
        dispatch(setMyOrders(result.data))
      } catch (error) {
        console.log("Error fetching orders:", error)
      } finally {
        setLoading(false)
      }
    }

    if (userData) {
      fetchOrders()
    }
  }, [userData, dispatch])

  // Socket listeners for real-time updates
  useEffect(() => {
    if (!socket || !userData?._id) return

    const handleNewOrder = (data) => {
      if (data.shopOrders?.owner?._id == userData._id) {
        dispatch(addMyOrder(data))
      }
    }

    const handleUpdateStatus = ({ orderId, shopId, status, userId }) => {
      if (userId == userData._id) {
        dispatch(updateRealtimeOrderStatus({ orderId, shopId, status }))
      }
    }

    socket.on('newOrder', handleNewOrder)
    socket.on('update-status', handleUpdateStatus)

    return () => {
      socket.off('newOrder', handleNewOrder)
      socket.off('update-status', handleUpdateStatus)
    }
  }, [socket, userData?._id, dispatch])

  return (
    <div className='w-full min-h-screen bg-[#fff9f6] flex justify-center px-4'>
      <div className='w-full max-w-[800px] p-4'>

        <div className='flex items-center gap-[20px] mb-6 '>
          <div className=' z-[10] cursor-pointer' onClick={() => navigate("/")}>
            <IoIosArrowRoundBack size={35} className='text-[#ff4d2d]' />
          </div>
          <h1 className='text-2xl font-bold  text-start'>My Orders</h1>
        </div>

        {loading ? (
          <div className='flex justify-center items-center py-20'>
            <div className='w-10 h-10 border-4 border-[#ff4d2d] border-t-transparent rounded-full animate-spin'></div>
          </div>
        ) : myOrders && myOrders.length > 0 ? (
          <div className='space-y-6'>
            {myOrders.map((order, index) => (
              userData.role == "user" ?
                (
                  <UserOrderCard data={order} key={index} />
                )
                :
                userData.role == "owner" ? (
                  <OwnerOrderCard data={order} key={index} />
                )
                  :
                  null
            ))}
          </div>
        ) : (
          <div className='flex flex-col items-center justify-center py-20 text-center'>
            <div className='text-6xl mb-4'>📦</div>
            <h2 className='text-xl font-semibold text-gray-700 mb-2'>No orders yet</h2>
            <p className='text-gray-500 mb-6'>Looks like you haven't placed any orders yet.</p>
            <button
              className='bg-[#ff4d2d] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#e64526] transition'
              onClick={() => navigate("/")}
            >
              Start Ordering
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default MyOrders

