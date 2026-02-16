import axios from 'axios'
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { serverUrl } from '../App'
import { addToCart } from '../redux/userSlice'
import { useToast } from '../context/ToastContext'
import { FaRedo } from 'react-icons/fa'

const FALLBACK_FOOD_IMAGE = "https://images.pexels.com/photos/70497/pexels-photo-70497.jpeg?auto=compress&cs=tinysrgb&w=900"

function UserOrderCard({ data }) {
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const toast = useToast()
    const [selectedRating, setSelectedRating] = useState({})
    const [reordering, setReordering] = useState(false)

    const shopOrders = Array.isArray(data?.shopOrders) ? data.shopOrders : []

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

    return (
        <div className='bg-white rounded-lg shadow p-4 space-y-4'>
            <div className='flex flex-col sm:flex-row sm:justify-between border-b pb-2 gap-2'>
                <div>
                    <p className='font-semibold'>
                        Order #{String(data?._id || "").slice(-6)}
                    </p>
                    <p className='text-sm text-gray-500'>
                        Date: {formatDate(data?.createdAt)}
                    </p>
                </div>
                <div className='text-right'>
                    {data?.paymentMethod == "cod"
                        ? <p className='text-sm text-gray-500'>{data?.paymentMethod?.toUpperCase()}</p>
                        : <p className='text-sm text-gray-500 font-semibold'>Payment: {data?.payment ? "true" : "false"}</p>}

                    <p className='font-medium text-blue-600'>{shopOrders?.[0]?.status || "pending"}</p>
                </div>
            </div>

            {shopOrders.map((shopOrder, index) => (
                <div className='border rounded-lg p-3 bg-[#fffaf7] space-y-3' key={shopOrder?._id || index}>
                    <p>{shopOrder?.shop?.name || "Restaurant unavailable"}</p>

                    <div className='flex space-x-4 overflow-x-auto pb-2'>
                        {(Array.isArray(shopOrder?.shopOrderItems) ? shopOrder.shopOrderItems : []).map((item, idx) => {
                            const itemDoc = item?.item
                            const itemId = itemDoc?._id
                            return (
                                <div key={item?._id || idx} className='flex-shrink-0 w-40 border rounded-lg p-2 bg-white'>
                                    <img src={itemDoc?.image || FALLBACK_FOOD_IMAGE} alt={item?.name || "Food item"} className='w-full h-24 object-cover rounded' />
                                    <p className='text-sm font-semibold mt-1'>{item?.name || itemDoc?.name || "Item unavailable"}</p>
                                    <p className='text-xs text-gray-500'>Qty: {item?.quantity || 0} x Rs {item?.price || 0}</p>

                                    {shopOrder?.status == "delivered" && itemId && (
                                        <div className='flex space-x-1 mt-2'>
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                    key={star}
                                                    className={`text-lg ${selectedRating[itemId] >= star ? 'text-yellow-400' : 'text-gray-400'}`}
                                                    onClick={() => handleRating(itemId, star)}
                                                >
                                                    &#9733;
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                    <div className='flex flex-col sm:flex-row sm:justify-between sm:items-center border-t pt-2 gap-2'>
                        <p className='font-semibold'>Subtotal: Rs {shopOrder?.subtotal || 0}</p>
                        <span className='text-sm font-medium text-blue-600'>{shopOrder?.status || "pending"}</span>
                    </div>
                </div>
            ))}

            <div className='flex flex-col sm:flex-row sm:justify-between sm:items-center border-t pt-2 gap-3'>
                <p className='font-semibold'>Total: Rs {data?.totalAmount || 0}</p>
                <div className='flex flex-col sm:flex-row gap-2 w-full sm:w-auto'>
                    <button
                        className='flex items-center justify-center gap-1 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-sm transition disabled:opacity-50 w-full sm:w-auto'
                        onClick={handleQuickReorder}
                        disabled={reordering}
                    >
                        <FaRedo size={12} />
                        <span className='hidden sm:inline'>Reorder</span>
                    </button>
                    <button className='bg-[#ff4d2d] hover:bg-[#e64526] text-white px-4 py-2 rounded-lg text-sm w-full sm:w-auto' onClick={() => navigate(`/track-order/${data?._id}`)}>Track Order</button>
                </div>
            </div>
        </div>
    )
}

export default UserOrderCard
