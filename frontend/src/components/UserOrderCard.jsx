import axios from 'axios'
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { serverUrl } from '../App'
import { addToCart, removeMyOrder } from '../redux/userSlice'
import { useToast } from '../context/ToastContext'
import { FaRedo, FaTrash, FaRegClock, FaShieldAlt, FaReceipt, FaStore, FaStar } from 'react-icons/fa'

const FALLBACK_FOOD_IMAGE = "https://images.pexels.com/photos/70497/pexels-photo-70497.jpeg?auto=compress&cs=tinysrgb&w=900"

const getStatusTone = (status = '') => {
    const normalized = String(status || '').toLowerCase()
    if (normalized === 'cancelled') return 'bg-red-50 text-red-600 border-red-100'
    if (normalized === 'delivered') return 'bg-emerald-50 text-emerald-700 border-emerald-100'
    if (normalized === 'preparing') return 'bg-amber-50 text-amber-700 border-amber-100'
    if (normalized === 'out of delivery') return 'bg-sky-50 text-sky-700 border-sky-100'
    return 'bg-orange-50 text-[#ff4d2d] border-orange-100'
}

function UserOrderCard({ data }) {
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const toast = useToast()
    const [selectedRating, setSelectedRating] = useState({})
    const [reviewDrafts, setReviewDrafts] = useState({})
    const [reviewSubmittingByOrder, setReviewSubmittingByOrder] = useState({})
    const [reviewStateByOrder, setReviewStateByOrder] = useState({})
    const [reordering, setReordering] = useState(false)
    const [deletingHistory, setDeletingHistory] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)

    const shopOrders = Array.isArray(data?.shopOrders) ? data.shopOrders : []
    const canDeleteHistory = Boolean(data?._id)
    const orderStatus = String(data?.status || shopOrders?.[0]?.status || "pending").toLowerCase()

    const getFoodStory = (itemName = '', itemDoc = {}, shopName = '') => {
        const normalizedName = String(itemName || itemDoc?.name || '').toLowerCase()
        const shopLabel = shopName || "this restaurant"

        if (normalizedName.includes('pizza')) {
            return {
                eyebrow: "Chef's note",
                title: "Oven-fresh comfort",
                description: `A warm, shareable favorite from ${shopLabel}, built for that perfect cheesy bite and crisp crust finish.`
            }
        }
        if (normalizedName.includes('burger') || normalizedName.includes('roll') || normalizedName.includes('sandwich')) {
            return {
                eyebrow: "Why it hits",
                title: "Built for big cravings",
                description: `Layered textures, bold fillings, and a satisfying finish make this a standout pick from ${shopLabel}.`
            }
        }
        if (normalizedName.includes('biryani') || normalizedName.includes('rice') || normalizedName.includes('momos')) {
            return {
                eyebrow: "Flavor profile",
                title: "Comfort in every bite",
                description: `A hearty choice from ${shopLabel} with rich flavor, filling portions, and that familiar comfort-food appeal.`
            }
        }
        if (normalizedName.includes('coffee') || normalizedName.includes('tea') || normalizedName.includes('shake')) {
            return {
                eyebrow: "Sip spotlight",
                title: "Smooth and satisfying",
                description: `A signature sip from ${shopLabel} that adds a mellow, indulgent note to the order experience.`
            }
        }

        return {
            eyebrow: "Food highlight",
            title: "A crowd-pleasing pick",
            description: `One of the standout picks from ${shopLabel}, chosen for its balanced flavor and easy-to-love comfort appeal.`
        }
    }

    const formatDate = (dateString) => {
        if (!dateString) return "-"
        const date = new Date(dateString)
        if (Number.isNaN(date.getTime())) return "-"
        return date.toLocaleString('en-GB', {
            day: "2-digit",
            month: "short",
            year: "numeric"
        })
    }

    const handleRating = async (itemId, rating) => {
        if (!itemId) return
        try {
            await axios.post(`${serverUrl}/api/item/rating`, { itemId, rating }, { withCredentials: true })
            setSelectedRating(prev => ({
                ...prev,
                [itemId]: rating
            }))
            toast.success("Thanks for rating!")
        } catch (error) {
            toast.error("Failed to submit rating")
            console.log(error)
        }
    }

    const updateReviewDraft = (shopOrderId, updates) => {
        setReviewDrafts(prev => ({
            ...prev,
            [shopOrderId]: {
                rating: prev?.[shopOrderId]?.rating || 0,
                comment: prev?.[shopOrderId]?.comment || "",
                ...updates
            }
        }))
    }

    const handleSubmitRestaurantReview = async (shopOrder) => {
        const orderId = data?._id
        const shopOrderId = shopOrder?._id
        const restaurantId = shopOrder?.shop?._id || shopOrder?.shop

        if (!orderId || !shopOrderId || !restaurantId) {
            toast.error("Invalid order details for review")
            return
        }

        const draft = reviewDrafts?.[shopOrderId] || {}
        const rating = Number(draft.rating || 0)
        const comment = String(draft.comment || "").trim()

        if (rating < 1 || rating > 5) {
            toast.warning("Please select a rating between 1 and 5")
            return
        }
        if (!comment) {
            toast.warning("Please add a short comment")
            return
        }

        setReviewSubmittingByOrder(prev => ({ ...prev, [orderId]: true }))
        try {
            await axios.post(
                `${serverUrl}/api/reviews`,
                { orderId, restaurantId, rating, comment },
                { withCredentials: true }
            )

            setReviewStateByOrder(prev => ({
                ...prev,
                [orderId]: { status: "submitted", message: "Thanks for your review." }
            }))
            setReviewDrafts(prev => ({
                ...prev,
                [shopOrderId]: { rating: 0, comment: "" }
            }))
            toast.success("Review submitted successfully")
        } catch (error) {
            const statusCode = Number(error?.response?.status)
            const apiMessage = error?.response?.data?.message

            if (statusCode === 409) {
                setReviewStateByOrder(prev => ({
                    ...prev,
                    [orderId]: { status: "exists", message: "Review already submitted for this order." }
                }))
                toast.info("You already reviewed this order")
                return
            }

            toast.error(apiMessage || "Failed to submit review")
            console.log(error)
        } finally {
            setReviewSubmittingByOrder(prev => ({ ...prev, [orderId]: false }))
        }
    }

    const handleQuickReorder = () => {
        setReordering(true)
        try {
            let itemsAdded = 0
            let skippedItems = 0

            shopOrders.forEach((shopOrder) => {
                const orderItems = Array.isArray(shopOrder?.shopOrderItems) ? shopOrder.shopOrderItems : []
                orderItems.forEach((orderItem) => {
                    const itemDoc = orderItem?.item
                    const itemId = itemDoc?._id
                    if (!itemId) {
                        skippedItems += 1
                        return
                    }

                    dispatch(addToCart({
                        id: itemId,
                        name: orderItem?.name || itemDoc?.name || "Food Item",
                        price: orderItem?.price || 0,
                        image: itemDoc?.image || FALLBACK_FOOD_IMAGE,
                        shop: shopOrder?.shop?._id,
                        quantity: orderItem?.quantity || 1,
                        foodType: itemDoc?.foodType || 'veg'
                    }))
                    itemsAdded += 1
                })
            })

            if (itemsAdded > 0) {
                toast.success(`${itemsAdded} item${itemsAdded > 1 ? 's' : ''} added to cart!`)
            }
            if (skippedItems > 0) {
                toast.warning(`${skippedItems} unavailable item${skippedItems > 1 ? 's were' : ' was'} skipped`)
            }
            if (itemsAdded === 0 && skippedItems === 0) {
                toast.warning("No items found to reorder")
            }
        } catch (error) {
            toast.error("Failed to reorder")
            console.log(error)
        } finally {
            setReordering(false)
        }
    }

    const handleDeleteHistory = async () => {
        setDeletingHistory(true)
        try {
            await axios.post(`${serverUrl}/api/order/${data?._id}/delete-history`, {}, { withCredentials: true })
            dispatch(removeMyOrder(data?._id))
            setShowDeleteModal(false)
            toast.success("Order removed from history")
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to remove order history")
            console.log(error)
        } finally {
            setDeletingHistory(false)
        }
    }

    return (
        <div className='overflow-hidden rounded-[24px] border border-orange-100 bg-white shadow-[0_16px_50px_rgba(15,23,42,0.07)]'>
            <div className='bg-[radial-gradient(circle_at_top_left,_rgba(255,120,82,0.16),_transparent_44%),linear-gradient(135deg,_#fff7f1,_#ffffff_62%)] p-4 sm:p-5'>
                {reviewStateByOrder?.[data?._id]?.message && (
                    <div
                        className={`mb-4 rounded-2xl px-4 py-3 text-sm font-medium ${
                            reviewStateByOrder?.[data?._id]?.status === "submitted"
                                ? "border border-green-200 bg-green-50 text-green-700"
                                : "border border-amber-200 bg-amber-50 text-amber-700"
                        }`}
                    >
                        {reviewStateByOrder?.[data?._id]?.message}
                    </div>
                )}

                <div className='flex flex-col gap-3 border-b border-orange-100 pb-4 sm:flex-row sm:items-start sm:justify-between'>
                    <div>
                        <p className='text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ff6b43]'>Order Summary</p>
                        <h3 className='mt-1 text-xl font-bold text-slate-900'>Order #{String(data?._id || "").slice(-6)}</h3>
                        <div className='mt-2.5 flex flex-wrap items-center gap-3 text-sm text-slate-500'>
                            <span className='inline-flex items-center gap-2'>
                                <FaRegClock className='text-[#ff4d2d]' />
                                {formatDate(data?.createdAt)}
                            </span>
                            <span className='inline-flex items-center gap-2'>
                                <FaShieldAlt className='text-[#ff4d2d]' />
                                {data?.paymentMethod === "cod" ? "COD" : `Payment ${data?.payment ? "Confirmed" : "Pending"}`}
                            </span>
                        </div>
                    </div>

                    <div className='flex flex-col items-start gap-3 sm:items-end'>
                        <span className={`inline-flex rounded-full border px-3.5 py-1.5 text-sm font-semibold capitalize ${getStatusTone(orderStatus)}`}>
                            {orderStatus}
                        </span>
                        <div className='rounded-[18px] border border-orange-100 bg-white/90 px-3.5 py-2.5 text-left shadow-sm sm:text-right'>
                            <p className='text-[11px] font-semibold uppercase tracking-wide text-slate-400'>Total Amount</p>
                            <p className='mt-1 text-lg font-bold text-slate-900'>Rs {data?.totalAmount || 0}</p>
                        </div>
                    </div>
                </div>

                <div className='mt-4 space-y-3.5'>
                    {shopOrders.map((shopOrder, index) => (
                        <div key={shopOrder?._id || index} className='rounded-[22px] border border-orange-100 bg-white p-3.5 shadow-sm'>
                            <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                                <div className='min-w-0'>
                                    <div className='flex items-center gap-3'>
                                        <div className='flex h-10 w-10 items-center justify-center rounded-[18px] bg-[#fff1ea] text-[#ff4d2d]'>
                                            <FaStore size={16} />
                                        </div>
                                        <div>
                                            <p className='text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400'>Restaurant</p>
                                            <h4 className='text-lg font-bold text-slate-900'>{shopOrder?.shop?.name || "Restaurant unavailable"}</h4>
                                        </div>
                                    </div>
                                </div>
                                <span className={`inline-flex self-start rounded-full border px-3.5 py-1.5 text-sm font-semibold capitalize ${getStatusTone(shopOrder?.status || orderStatus)}`}>
                                    {shopOrder?.status || "pending"}
                                </span>
                            </div>

                            <div className='mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(300px,340px)_minmax(0,1.35fr)]'>
                                <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1'>
                                    {(Array.isArray(shopOrder?.shopOrderItems) ? shopOrder.shopOrderItems : []).map((item, idx) => {
                                    const itemDoc = item?.item
                                    const itemId = itemDoc?._id
                                    return (
                                        <div key={item?._id || idx} className='overflow-hidden rounded-[18px] border border-slate-200 bg-[linear-gradient(135deg,#fffdfb,#ffffff)] shadow-sm'>
                                            <img src={itemDoc?.image || FALLBACK_FOOD_IMAGE} alt={item?.name || "Food item"} className='h-40 w-full object-cover' />
                                            <div className='p-3.5'>
                                                <p className='line-clamp-2 text-lg font-semibold text-slate-900'>{item?.name || itemDoc?.name || "Item unavailable"}</p>
                                                <p className='mt-1.5 text-sm text-slate-500'>Qty: {item?.quantity || 0} x Rs {item?.price || 0}</p>

                                                {shopOrder?.status === "delivered" && itemId && (
                                                    <div className='mt-3 flex gap-1'>
                                                        {[1, 2, 3, 4, 5].map((star) => (
                                                            <button
                                                                key={star}
                                                                className={`text-lg ${selectedRating[itemId] >= star ? 'text-yellow-400' : 'text-slate-300'} transition hover:text-yellow-400`}
                                                                onClick={() => handleRating(itemId, star)}
                                                            >
                                                                <FaStar />
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                                </div>

                                {(() => {
                                    const firstItem = Array.isArray(shopOrder?.shopOrderItems) ? shopOrder.shopOrderItems[0] : null
                                    const story = getFoodStory(firstItem?.name, firstItem?.item, shopOrder?.shop?.name)
                                    return (
                                        <div className='rounded-[18px] border border-orange-100 bg-[linear-gradient(180deg,#fff7f1,#ffffff)] p-3.5 shadow-sm'>
                                            <div className='flex h-full flex-col gap-3 md:flex-row md:items-start md:justify-between'>
                                                <div className='min-w-0 md:max-w-[60%]'>
                                                    <p className='text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ff6b43]'>{story.eyebrow}</p>
                                                    <h5 className='mt-2 text-lg font-bold text-slate-900'>{story.title}</h5>
                                                    <p className='mt-2 text-sm leading-6 text-slate-500'>{story.description}</p>
                                                </div>

                                                {firstItem && (
                                                    <div className='md:min-w-[180px] rounded-[16px] border border-white/80 bg-white/90 px-3 py-3 shadow-sm'>
                                                        <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400'>Featured dish</p>
                                                        <p className='mt-2 text-sm font-semibold text-slate-900'>{firstItem?.name || firstItem?.item?.name || "Selected item"}</p>
                                                        <p className='mt-1 text-sm text-slate-500'>Qty {firstItem?.quantity || 0} • Rs {firstItem?.price || 0}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })()}
                            </div>

                            {shopOrder?.status === "delivered" && !reviewStateByOrder?.[data?._id] && (
                                <div className='mt-3 rounded-[20px] border border-orange-200 bg-[linear-gradient(135deg,#fff6ef,#fffdfb)] p-3.5 shadow-sm'>
                                    <p className='text-sm font-semibold text-slate-800'>Rate your restaurant experience</p>
                                    <div className='mt-3 flex items-center gap-1'>
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                type='button'
                                                className={`text-2xl ${Number(reviewDrafts?.[shopOrder?._id]?.rating || 0) >= star ? 'text-yellow-400' : 'text-slate-300'} transition hover:text-yellow-400`}
                                                onClick={() => updateReviewDraft(shopOrder?._id, { rating: star })}
                                            >
                                                <FaStar />
                                            </button>
                                        ))}
                                    </div>
                                    <textarea
                                        className='mt-3 w-full rounded-[18px] border border-orange-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#ff4d2d]'
                                        rows={3}
                                        placeholder='Share your feedback about food quality, delivery, and service'
                                        value={reviewDrafts?.[shopOrder?._id]?.comment || ""}
                                        onChange={(event) => updateReviewDraft(shopOrder?._id, { comment: event.target.value })}
                                        maxLength={1000}
                                    />
                                    <div className='mt-3 flex justify-end'>
                                        <button
                                            type='button'
                                            className='rounded-[18px] bg-gradient-to-r from-[#ff6b43] to-[#ff4d2d] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition hover:brightness-105 disabled:opacity-60'
                                            disabled={Boolean(reviewSubmittingByOrder?.[data?._id])}
                                            onClick={() => handleSubmitRestaurantReview(shopOrder)}
                                        >
                                            {reviewSubmittingByOrder?.[data?._id] ? "Submitting..." : "Submit Review"}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className='mt-3 flex items-center justify-between rounded-[18px] border border-slate-200 bg-slate-50/70 px-3.5 py-2.5'>
                                <p className='text-sm font-semibold text-slate-900'>Subtotal: Rs {shopOrder?.subtotal || 0}</p>
                                <span className='text-sm font-semibold capitalize text-slate-500'>{shopOrder?.status || "pending"}</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className='mt-4 flex flex-col gap-3 border-t border-orange-100 pt-4 sm:flex-row sm:items-center sm:justify-between'>
                    <div className='rounded-[18px] border border-orange-100 bg-white/90 px-3.5 py-2.5 shadow-sm'>
                        <p className='text-[11px] font-semibold uppercase tracking-wide text-slate-400'>Grand Total</p>
                        <p className='mt-1 text-xl font-bold text-slate-900'>Rs {data?.totalAmount || 0}</p>
                    </div>

                    <div className='flex flex-col gap-2 sm:flex-row'>
                        {canDeleteHistory && (
                            <button
                                className='inline-flex items-center justify-center gap-2 rounded-[18px] bg-gradient-to-r from-red-500 to-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-200 transition hover:brightness-105 disabled:opacity-50'
                                onClick={() => setShowDeleteModal(true)}
                                disabled={deletingHistory}
                            >
                                <FaTrash size={12} />
                                <span>{deletingHistory ? 'Removing...' : 'Delete History'}</span>
                            </button>
                        )}
                        <button
                            className='inline-flex items-center justify-center gap-2 rounded-[18px] bg-gradient-to-r from-emerald-500 to-green-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition hover:brightness-105 disabled:opacity-50'
                            onClick={handleQuickReorder}
                            disabled={reordering}
                        >
                            <FaRedo size={12} />
                            <span>{reordering ? 'Adding...' : 'Reorder'}</span>
                        </button>
                        <button
                            className='inline-flex items-center justify-center gap-2 rounded-[18px] bg-gradient-to-r from-[#ff6b43] to-[#ff4d2d] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition hover:brightness-105'
                            onClick={() => navigate(`/track-order/${data?._id}`)}
                        >
                            <FaReceipt size={12} />
                            <span>Track Order</span>
                        </button>
                    </div>
                </div>
            </div>

            {showDeleteModal && (
                <div className='fixed inset-0 z-[10000] bg-slate-950/55 backdrop-blur-[3px] flex items-center justify-center px-4'>
                    <div className='w-full max-w-md overflow-hidden rounded-[28px] border border-orange-100 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.24)]'>
                        <div className='bg-[radial-gradient(circle_at_top_left,_rgba(255,120,82,0.18),_transparent_52%),linear-gradient(135deg,_#fff7f2,_#ffffff)] px-6 pt-6 pb-5 border-b border-orange-100'>
                            <div className='flex items-start gap-4'>
                                <div className='flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 text-white shadow-lg shadow-red-200'>
                                    <FaTrash size={20} />
                                </div>
                                <div className='min-w-0'>
                                    <p className='text-[11px] font-semibold uppercase tracking-[0.24em] text-red-500'>Delete History</p>
                                    <h3 className='mt-1 text-2xl font-bold text-slate-900'>Remove this order?</h3>
                                    <p className='mt-2 text-sm leading-6 text-slate-600'>
                                        This will hide the order from your order history screen, but it will not cancel the order or affect refunds.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className='px-6 py-5 space-y-4'>
                            <div className='rounded-2xl border border-slate-200 bg-slate-50/80 p-4'>
                                <div className='flex items-center justify-between gap-3'>
                                    <div>
                                        <p className='text-sm font-semibold text-slate-900'>Order #{String(data?._id || "").slice(-6)}</p>
                                        <p className='mt-1 text-xs text-slate-500'>{shopOrders.length} restaurant section{shopOrders.length > 1 ? 's' : ''}</p>
                                    </div>
                                    <div className='rounded-full bg-white px-3 py-1 text-xs font-semibold capitalize text-[#ff4d2d] shadow-sm'>
                                        {data?.status || "pending"}
                                    </div>
                                </div>
                                <div className='mt-4 grid grid-cols-2 gap-3'>
                                    <div className='rounded-xl bg-white px-3 py-3 shadow-sm'>
                                        <div className='flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400'>
                                            <FaRegClock className='text-[#ff4d2d]' />
                                            Date
                                        </div>
                                        <p className='mt-2 text-sm font-semibold text-slate-800'>{formatDate(data?.createdAt)}</p>
                                    </div>
                                    <div className='rounded-xl bg-white px-3 py-3 shadow-sm'>
                                        <div className='flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400'>
                                            <FaShieldAlt className='text-[#ff4d2d]' />
                                            Total
                                        </div>
                                        <p className='mt-2 text-sm font-semibold text-slate-800'>Rs {data?.totalAmount || 0}</p>
                                    </div>
                                </div>
                            </div>

                            <div className='flex flex-col-reverse sm:flex-row sm:justify-end gap-3'>
                                <button
                                    type='button'
                                    className='w-full sm:w-auto rounded-2xl border border-slate-200 bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200'
                                    onClick={() => setShowDeleteModal(false)}
                                    disabled={deletingHistory}
                                >
                                    Keep Order
                                </button>
                                <button
                                    type='button'
                                    className='w-full sm:w-auto rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-red-200 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70'
                                    onClick={handleDeleteHistory}
                                    disabled={deletingHistory}
                                >
                                    {deletingHistory ? 'Removing...' : 'Delete From History'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default UserOrderCard
