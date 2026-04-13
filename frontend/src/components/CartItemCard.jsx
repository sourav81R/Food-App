import React from 'react'
import { FaMinus, FaPlus } from "react-icons/fa";
import { CiTrash } from "react-icons/ci";
import { useDispatch } from 'react-redux';
import { removeCartItem, updateQuantity } from '../redux/userSlice';

function CartItemCard({ data }) {
    const dispatch = useDispatch()
    const lineTotal = Number(data?.price || 0) * Number(data?.quantity || 0)

    const handleIncrease = (id, currentQty) => {
        dispatch(updateQuantity({ id, quantity: currentQty + 1 }))
    }

    const handleDecrease = (id, currentQty) => {
        if (currentQty > 1) {
            dispatch(updateQuantity({ id, quantity: currentQty - 1 }))
        }
    }

    return (
        <div className='w-full max-w-full shrink-0 overflow-hidden rounded-[28px] border border-orange-100 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.06)] sm:w-[360px]'>
            <div className='flex flex-col gap-4 bg-[linear-gradient(135deg,#fffaf6,#ffffff)] p-4'>
                <div className='flex min-w-0 items-center gap-3 sm:gap-4'>
                    <div className='overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'>
                        <img src={data.image} alt={data.name} className='h-20 w-20 object-cover sm:h-28 sm:w-28' />
                    </div>
                    <div className='min-w-0'>
                        <h3 className='break-words text-base font-bold text-slate-900 sm:text-xl'>{data.name}</h3>
                        <p className='mt-1 text-sm text-slate-500'>Rs {data.price} x {data.quantity}</p>
                        <p className='mt-3 text-xl font-bold text-slate-900 sm:text-2xl'>Rs {lineTotal}</p>
                    </div>
                </div>

                <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                    <div className='inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 shadow-sm'>
                        <button
                            className='flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm transition hover:bg-slate-100'
                            onClick={() => handleDecrease(data.id, data.quantity)}
                        >
                            <FaMinus size={12} />
                        </button>
                        <span className='min-w-[20px] text-center text-lg font-semibold text-slate-900'>{data.quantity}</span>
                        <button
                            className='flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm transition hover:bg-slate-100'
                            onClick={() => handleIncrease(data.id, data.quantity)}
                        >
                            <FaPlus size={12} />
                        </button>
                    </div>

                    <button
                        className="flex h-12 w-12 items-center justify-center self-end rounded-2xl bg-red-50 text-red-500 shadow-sm transition hover:bg-red-100 sm:self-auto"
                        onClick={() => dispatch(removeCartItem(data.id))}
                    >
                        <CiTrash size={22} />
                    </button>
                </div>
            </div>
        </div>
    )
}

export default CartItemCard
