import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { IoIosArrowRoundBack } from "react-icons/io";
import { useNavigate } from 'react-router-dom';
import UserOrderCard from '../components/UserOrderCard';
import OwnerOrderCard from '../components/OwnerOrderCard';
import { addMyOrder, clearMyOrders, setMyOrders, updateRealtimeOrderStatus } from '../redux/userSlice';
import axios from 'axios';
import { serverUrl } from '../App';
import { useSocket } from '../context/SocketContext';
import { isOwnerRole, isUserRole, normalizeClientRole } from '../utils/roles';
import { FaTrash } from 'react-icons/fa';
import { useToast } from '../context/ToastContext';

function MyOrders() {
  const { userData, myOrders } = useSelector(state => state.user)
  const socket = useSocket()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [clearingHistory, setClearingHistory] = useState(false)
  const [showClearModal, setShowClearModal] = useState(false)
  const normalizedRole = normalizeClientRole(userData?.role)

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

    if (userData?._id) {
      void fetchOrders()
    }
  }, [userData?._id, dispatch])

  useEffect(() => {
    if (!socket || !userData?._id) return

    const handleNewOrder = (data) => {
      const hasOwnerMatch = Array.isArray(data?.shopOrders)
        ? data.shopOrders.some((shopOrder) => String(shopOrder?.owner?._id) === String(userData?._id))
        : String(data?.shopOrders?.owner?._id) === String(userData?._id)

      if (hasOwnerMatch) {
        dispatch(addMyOrder(data))
      }
    }

    const handleUpdateStatus = ({ orderId, shopId, status, userId }) => {
      if (String(userId) === String(userData?._id)) {
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

  const handleClearAllHistory = async () => {
    try {
      setClearingHistory(true)
      const result = await axios.post(`${serverUrl}/api/order/clear-history`, {}, { withCredentials: true })
      dispatch(clearMyOrders())
      setShowClearModal(false)
      toast.success(result?.data?.message || "All order history cleared")
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to clear order history")
      console.log(error)
    } finally {
      setClearingHistory(false)
    }
  }

  return (
    <div className='w-full min-h-screen bg-[#fff9f6] flex justify-center px-3 sm:px-4 py-3 sm:py-4'>
      <div className='w-full max-w-[800px] p-2 sm:p-4'>
        <div className='flex items-center justify-between gap-3 sm:gap-5 mb-5 sm:mb-6'>
          <div className='flex items-center gap-3 sm:gap-5'>
            <div className='z-[10] cursor-pointer' onClick={() => navigate("/")}>
              <IoIosArrowRoundBack size={35} className='text-[#ff4d2d]' />
            </div>
            <h1 className='text-2xl font-bold text-start'>My Orders</h1>
          </div>

          {isUserRole(normalizedRole) && myOrders?.length > 0 && (
            <button
              type='button'
              className='flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-red-500 shadow-sm ring-1 ring-red-100 transition hover:bg-red-50'
              onClick={() => setShowClearModal(true)}
            >
              <FaTrash size={12} />
              <span className='hidden sm:inline'>Clear All History</span>
              <span className='sm:hidden'>Clear All</span>
            </button>
          )}
        </div>

        {loading ? (
          <div className='flex justify-center items-center py-20'>
            <div className='w-10 h-10 border-4 border-[#ff4d2d] border-t-transparent rounded-full animate-spin'></div>
          </div>
        ) : myOrders && myOrders.length > 0 ? (
          <div className='space-y-6'>
            {myOrders.map((order, index) => (
              isUserRole(normalizedRole) ? (
                <UserOrderCard data={order} key={index} />
              ) : isOwnerRole(normalizedRole) ? (
                <OwnerOrderCard data={order} key={index} />
              ) : null
            ))}
          </div>
        ) : (
          <div className='flex flex-col items-center justify-center py-20 text-center'>
            <div className='text-6xl mb-4'>[ ]</div>
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

        {showClearModal && (
          <div className='fixed inset-0 z-[10000] bg-slate-950/55 backdrop-blur-[3px] flex items-center justify-center px-4'>
            <div className='w-full max-w-md overflow-hidden rounded-[28px] border border-orange-100 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.24)]'>
              <div className='bg-[radial-gradient(circle_at_top_left,_rgba(255,120,82,0.18),_transparent_52%),linear-gradient(135deg,_#fff7f2,_#ffffff)] px-6 pt-6 pb-5 border-b border-orange-100'>
                <div className='flex items-start gap-4'>
                  <div className='flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 text-white shadow-lg shadow-red-200'>
                    <FaTrash size={20} />
                  </div>
                  <div className='min-w-0'>
                    <p className='text-[11px] font-semibold uppercase tracking-[0.24em] text-red-500'>Clear History</p>
                    <h3 className='mt-1 text-2xl font-bold text-slate-900'>Remove all orders?</h3>
                    <p className='mt-2 text-sm leading-6 text-slate-600'>
                      This will hide every order from your history screen at once. It will not cancel orders or change refunds.
                    </p>
                  </div>
                </div>
              </div>

              <div className='px-6 py-5 space-y-4'>
                <div className='rounded-2xl border border-slate-200 bg-slate-50/80 p-4'>
                  <p className='text-sm font-semibold text-slate-900'>Orders to hide: {myOrders?.length || 0}</p>
                  <p className='mt-2 text-sm text-slate-600'>
                    New orders will still appear normally after this.
                  </p>
                </div>

                <div className='flex flex-col-reverse sm:flex-row sm:justify-end gap-3'>
                  <button
                    type='button'
                    className='w-full sm:w-auto rounded-2xl border border-slate-200 bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200'
                    onClick={() => setShowClearModal(false)}
                    disabled={clearingHistory}
                  >
                    Keep History
                  </button>
                  <button
                    type='button'
                    className='w-full sm:w-auto rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-red-200 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70'
                    onClick={handleClearAllHistory}
                    disabled={clearingHistory}
                  >
                    {clearingHistory ? "Clearing..." : "Clear All History"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default MyOrders
