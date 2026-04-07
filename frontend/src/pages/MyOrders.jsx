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
import { FaBoxOpen, FaTrash, FaReceipt, FaClock } from 'react-icons/fa';
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
    <div className='min-h-screen bg-[linear-gradient(180deg,#fff7f2_0%,#fffaf7_38%,#ffffff_100%)] px-3 py-3 sm:px-4 sm:py-5'>
      <div className='mx-auto flex w-full max-w-5xl flex-col gap-4'>
        <div className='overflow-hidden rounded-[26px] border border-orange-100 bg-white shadow-[0_16px_50px_rgba(15,23,42,0.07)]'>
          <div className='bg-[radial-gradient(circle_at_top_left,_rgba(255,120,82,0.22),_transparent_46%),linear-gradient(135deg,_#fff5ef,_#ffffff_62%)] px-4 py-4 sm:px-5 sm:py-5'>
            <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
              <div className='flex items-start gap-3 sm:gap-4'>
                <button
                  type='button'
                  className='flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px] bg-white text-[#ff4d2d] shadow-sm ring-1 ring-orange-100 transition hover:bg-orange-50'
                  onClick={() => navigate("/")}
                >
                  <IoIosArrowRoundBack size={26} />
                </button>
                <div>
                  <p className='text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ff6b43]'>Order Center</p>
                  <h1 className='mt-1 text-xl font-bold text-slate-900 sm:text-2xl'>My Orders</h1>
                  <p className='mt-1 text-sm text-slate-500'>Track previous purchases, reorder favorites, manage reviews, and tidy your order history.</p>
                </div>
              </div>

              {isUserRole(normalizedRole) && myOrders?.length > 0 && (
                <button
                  type='button'
                  className='inline-flex items-center gap-2 self-start rounded-[18px] bg-white px-3.5 py-2.5 text-sm font-semibold text-red-500 shadow-sm ring-1 ring-red-100 transition hover:bg-red-50 sm:self-auto'
                  onClick={() => setShowClearModal(true)}
                >
                  <FaTrash size={12} />
                  <span className='hidden sm:inline'>Clear All History</span>
                  <span className='sm:hidden'>Clear All</span>
                </button>
              )}
            </div>

            <div className='mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3'>
              <div className='rounded-[20px] border border-orange-100 bg-white/85 px-3.5 py-3 shadow-sm backdrop-blur'>
                <div className='flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400'>
                  <FaBoxOpen className='text-[#ff4d2d]' />
                  Orders
                </div>
                <p className='mt-1.5 text-2xl font-bold text-slate-900'>{myOrders?.length || 0}</p>
                <p className='mt-1 text-sm text-slate-500'>Visible in your history</p>
              </div>
              <div className='rounded-[20px] border border-orange-100 bg-white/85 px-3.5 py-3 shadow-sm backdrop-blur'>
                <div className='flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400'>
                  <FaReceipt className='text-[#ff4d2d]' />
                  Role
                </div>
                <p className='mt-1.5 text-xl font-bold capitalize text-slate-900'>{normalizedRole || 'user'}</p>
                <p className='mt-1 text-sm text-slate-500'>Current dashboard mode</p>
              </div>
              <div className='rounded-[20px] border border-orange-100 bg-white/85 px-3.5 py-3 shadow-sm backdrop-blur'>
                <div className='flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400'>
                  <FaClock className='text-[#ff4d2d]' />
                  History
                </div>
                <p className='mt-1.5 text-xl font-bold text-slate-900'>{loading ? '--' : 'Ready'}</p>
                <p className='mt-1 text-sm text-slate-500'>Realtime sync enabled</p>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className='flex min-h-[220px] items-center justify-center rounded-[24px] border border-orange-100 bg-white shadow-[0_16px_50px_rgba(15,23,42,0.06)]'>
            <div className='flex flex-col items-center gap-4'>
              <div className='h-12 w-12 rounded-full border-4 border-[#ff4d2d] border-t-transparent animate-spin'></div>
              <p className='text-sm font-medium text-slate-500'>Loading your order history...</p>
            </div>
          </div>
        ) : myOrders && myOrders.length > 0 ? (
          <div className='grid grid-cols-1 gap-4'>
            {myOrders.map((order, index) => (
              isUserRole(normalizedRole) ? (
                <UserOrderCard data={order} key={index} />
              ) : isOwnerRole(normalizedRole) ? (
                <OwnerOrderCard data={order} key={index} />
              ) : null
            ))}
          </div>
        ) : (
          <div className='flex flex-col items-center justify-center rounded-[24px] border border-orange-100 bg-white px-5 py-16 text-center shadow-[0_16px_50px_rgba(15,23,42,0.06)]'>
            <div className='flex h-16 w-16 items-center justify-center rounded-[22px] bg-[linear-gradient(135deg,#fff0e8,#ffffff)] text-[#ff4d2d] shadow-sm'>
              <FaBoxOpen size={32} />
            </div>
            <h2 className='mt-5 text-xl font-bold text-slate-900'>No orders yet</h2>
            <p className='mt-2 max-w-md text-sm leading-6 text-slate-500'>When you place your first order, it will appear here with tracking, reorder actions, and restaurant review options.</p>
            <button
              className='mt-5 rounded-[18px] bg-gradient-to-r from-[#ff6b43] to-[#ff4d2d] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition hover:brightness-105'
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
