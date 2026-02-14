import axios from 'axios'
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { serverUrl } from '../App'
import { addToCart } from '../redux/userSlice'
import { useToast } from '../context/ToastContext'
import { FaRedo } from 'react-icons/fa'

function UserOrderCard({ data }) {
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const toast = useToast()
    const [selectedRating, setSelectedRating] = useState({})//itemId:rating
    const [reordering, setReordering] = useState(false)

    const formatDate = (dateString) => {
        const date = new Date(dateString)
        return date.toLocaleString('en-GB', {
            day: "2-digit",
            month: "short",
            year: "numeric"
        })

    }

    const handleRating = async (itemId, rating) => {
        try {
            const result = await axios.post(`${serverUrl}/api/item/rating`, { itemId, rating }, { withCredentials: true })
            setSelectedRating(prev => ({
                ...prev, [itemId]: rating
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
            data.shopOrders.forEach((shopOrder) => {
                shopOrder.shopOrderItems.forEach((orderItem) => {
                    dispatch(addToCart({
                        id: orderItem.item._id,
                        name: orderItem.name,
                        price: orderItem.price,
                        image: orderItem.item.image,
                        shop: shopOrder.shop._id,
                        quantity: orderItem.quantity,
                        foodType: orderItem.item.foodType || 'veg'
                    }))
                    itemsAdded++
                })
            })
            toast.success(`${itemsAdded} item${itemsAdded > 1 ? 's' : ''} added to cart! 🛒`)
        } catch (error) {
            toast.error("Failed to reorder")
            console.log(error)
        } finally {
            setReordering(false)
        }
    }


    return (
        <div className='bg-white rounded-lg shadow p-4 space-y-4'>
            <div className='flex justify-between border-b pb-2'>
                <div>
                    <p className='font-semibold'>
                        order #{data._id.slice(-6)}
                    </p>
                    <p className='text-sm text-gray-500'>
                        Date: {formatDate(data.createdAt)}
                    </p>
                </div>
                <div className='text-right'>
                    {data.paymentMethod == "cod" ? <p className='text-sm text-gray-500'>{data.paymentMethod?.toUpperCase()}</p> : <p className='text-sm text-gray-500 font-semibold'>Payment: {data.payment ? "true" : "false"}</p>}

                    <p className='font-medium text-blue-600'>{data.shopOrders?.[0].status}</p>
                </div>
            </div>

            {data.shopOrders.map((shopOrder, index) => (
                <div className='"border rounded-lg p-3 bg-[#fffaf7] space-y-3' key={index}>
                    <p>{shopOrder.shop.name}</p>

                    <div className='flex space-x-4 overflow-x-auto pb-2'>
                        {shopOrder.shopOrderItems.map((item, idx) => (
                            <div key={idx} className='flex-shrink-0 w-40 border rounded-lg p-2 bg-white"'>
                                <img src={item.item.image} alt="" className='w-full h-24 object-cover rounded' />
                                <p className='text-sm font-semibold mt-1'>{item.name}</p>
                                <p className='text-xs text-gray-500'>Qty: {item.quantity} x ₹{item.price}</p>

                                {shopOrder.status == "delivered" && <div className='flex space-x-1 mt-2'>
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button key={star} className={`text-lg ${selectedRating[item.item._id] >= star ? 'text-yellow-400' : 'text-gray-400'}`} onClick={() => handleRating(item.item._id, star)}>★</button>
                                    ))}
                                </div>}



                            </div>
                        ))}
                    </div>
                    <div className='flex justify-between items-center border-t pt-2'>
                        <p className='font-semibold'>Subtotal: {shopOrder.subtotal}</p>
                        <span className='text-sm font-medium text-blue-600'>{shopOrder.status}</span>
                    </div>
                </div>
            ))}

            <div className='flex justify-between items-center border-t pt-2 gap-2'>
                <p className='font-semibold'>Total: ₹{data.totalAmount}</p>
                <div className='flex gap-2'>
                    {/* Quick Reorder Button */}
                    <button
                        className='flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-sm transition disabled:opacity-50'
                        onClick={handleQuickReorder}
                        disabled={reordering}
                    >
                        <FaRedo size={12} />
                        <span className='hidden sm:inline'>Reorder</span>
                    </button>
                    <button className='bg-[#ff4d2d] hover:bg-[#e64526] text-white px-4 py-2 rounded-lg text-sm' onClick={() => navigate(`/track-order/${data._id}`)}>Track Order</button>
                </div>
            </div>



        </div>
    )
}

export default UserOrderCard

