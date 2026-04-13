import axios from 'axios';
import React, { useState } from 'react'
import { MdPhone } from "react-icons/md";
import { serverUrl } from '../App';
import { useDispatch } from 'react-redux';
import { updateOrderStatus } from '../redux/userSlice';

function OwnerOrderCard({ data }) {
    const [availableBoys, setAvailableBoys] = useState([])
    const dispatch = useDispatch()

    const handleUpdateStatus = async (orderId, shopId, status) => {
        try {
            const result = await axios.post(`${serverUrl}/api/order/update-status/${orderId}/${shopId}`, { status }, { withCredentials: true })
            dispatch(updateOrderStatus({ orderId, shopId, status }))
            setAvailableBoys(result.data.availableBoys)
            console.log(result.data)
        } catch (error) {
            console.log(error)
        }
    }

    return (
        <div className='overflow-hidden rounded-[24px] border border-orange-100 bg-white p-4 shadow-[0_16px_50px_rgba(15,23,42,0.07)] sm:p-5'>
            <div className='flex flex-col gap-4 border-b border-orange-100 pb-4 lg:flex-row lg:items-start lg:justify-between'>
                <div className='min-w-0 space-y-2'>
                    <div>
                        <h2 className='break-words text-lg font-semibold text-gray-800 sm:text-xl'>{data?.user?.fullName || "Customer"}</h2>
                        <p className='break-all text-sm text-gray-500'>{data?.user?.email || "Email unavailable"}</p>
                    </div>
                    <p className='flex flex-wrap items-center gap-2 text-sm text-gray-600'>
                        <MdPhone className='shrink-0' />
                        <span className='break-all'>{data?.user?.mobile || "Mobile unavailable"}</span>
                    </p>
                    {data.paymentMethod == "online" ? (
                        <p className='text-sm text-gray-600'>Payment: {data.payment ? "true" : "false"}</p>
                    ) : (
                        <p className='text-sm text-gray-600'>Payment Method: {data?.paymentMethod || "N/A"}</p>
                    )}
                </div>

                <div className='flex w-full flex-col gap-3 lg:w-auto lg:min-w-[220px]'>
                    <div className='rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3'>
                        <p className='text-[11px] font-semibold uppercase tracking-wide text-slate-400'>Status</p>
                        <p className='mt-1 text-base font-semibold capitalize text-[#ff4d2d]'>{data?.shopOrders?.status || "pending"}</p>
                    </div>

                    <label htmlFor={`order-status-${data._id}`} className='sr-only'>Change order status</label>
                    <select
                        id={`order-status-${data._id}`}
                        name="orderStatus"
                        className='w-full rounded-xl border border-[#ff4d2d] px-3 py-3 text-sm text-[#ff4d2d] focus:outline-none focus:ring-2 focus:ring-[#ff4d2d]/20'
                        onChange={(e) => handleUpdateStatus(data._id, data.shopOrders.shop._id, e.target.value)}
                    >
                        <option value="">Change status</option>
                        <option value="pending">Pending</option>
                        <option value="preparing">Preparing</option>
                        <option value="out of delivery">Out Of Delivery</option>
                    </select>
                </div>
            </div>

            <div className='mt-4 rounded-[20px] border border-slate-200 bg-slate-50/80 p-4 text-sm text-gray-600'>
                <p className='break-words'>{data?.deliveryAddress?.text || "Address unavailable"}</p>
                <p className='mt-2 break-all text-xs text-gray-500'>
                    Lat: {data?.deliveryAddress?.latitude || "-"} | Lon: {data?.deliveryAddress?.longitude || "-"}
                </p>
            </div>

            <div className='mt-4 flex gap-4 overflow-x-auto pb-2'>
                {data.shopOrders.shopOrderItems.map((item, index) => (
                    <div key={index} className='w-[220px] shrink-0 rounded-[18px] border border-orange-100 bg-white p-3 shadow-sm sm:w-44'>
                        <img src={item.item.image} alt="" className='h-24 w-full rounded object-cover' />
                        <p className='mt-2 break-words text-sm font-semibold text-slate-900'>{item.name}</p>
                        <p className='mt-1 text-xs text-gray-500'>Qty: {item.quantity} x Rs {item.price}</p>
                    </div>
                ))}
            </div>

            {data.shopOrders.status == "out of delivery" &&
                <div className="mt-4 rounded-[18px] border border-orange-100 bg-orange-50 p-4 text-sm text-slate-700">
                    {data.shopOrders.assignedDeliveryBoy ? <p>Assigned Delivery Boy:</p> : <p>Available Delivery Boys:</p>}
                    {availableBoys?.length > 0 ? (
                        availableBoys.map((b, index) => (
                            <div key={b._id || `${b.mobile}-${index}`} className='break-all text-gray-800'>{b.fullName} - {b.mobile}</div>
                        ))
                    ) : data.shopOrders.assignedDeliveryBoy ? <div className='break-all'>{data.shopOrders.assignedDeliveryBoy.fullName} - {data.shopOrders.assignedDeliveryBoy.mobile}</div> : <div>Waiting for delivery boy to accept</div>}
                </div>}

            <div className='mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between'>
                <span className='text-sm text-slate-600'>
                    Status: <span className='font-semibold capitalize text-[#ff4d2d]'>{data.shopOrders.status}</span>
                </span>
                <div className='text-left text-sm font-bold text-gray-800 sm:text-right'>
                    Total: Rs {data.shopOrders.subtotal}
                </div>
            </div>
        </div>
    )
}

export default OwnerOrderCard
