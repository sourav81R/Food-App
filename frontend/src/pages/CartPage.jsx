import React from 'react'
import { IoIosArrowRoundBack } from "react-icons/io";
import { FaShoppingBag, FaReceipt, FaArrowRight } from "react-icons/fa";
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import CartItemCard from '../components/CartItemCard';

function CartPage() {
    const navigate = useNavigate()
    const { cartItems, totalAmount } = useSelector(state => state.user)
    const totalItems = cartItems.reduce((sum, item) => sum + Number(item?.quantity || 0), 0)

    return (
        <div className='min-h-screen bg-[linear-gradient(180deg,#fff7f2_0%,#fffaf7_38%,#ffffff_100%)] px-3 py-4 sm:px-4 sm:py-6'>
            <div className='mx-auto flex w-full max-w-6xl flex-col gap-6'>
                <div className='overflow-hidden rounded-[32px] border border-orange-100 bg-white shadow-[0_20px_70px_rgba(15,23,42,0.08)]'>
                    <div className='bg-[radial-gradient(circle_at_top_left,_rgba(255,120,82,0.22),_transparent_46%),linear-gradient(135deg,_#fff5ef,_#ffffff_62%)] px-5 py-5 sm:px-7 sm:py-6'>
                        <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
                            <div className='flex items-start gap-3 sm:gap-4'>
                                <button
                                    type='button'
                                    className='flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#ff4d2d] shadow-sm ring-1 ring-orange-100 transition hover:bg-orange-50'
                                    onClick={() => navigate("/")}
                                >
                                    <IoIosArrowRoundBack size={30} />
                                </button>
                                <div>
                                    <p className='text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ff6b43]'>Checkout Prep</p>
                                    <h1 className='mt-1 text-2xl font-bold text-slate-900 sm:text-3xl'>Your Cart</h1>
                                    <p className='mt-1 text-sm text-slate-500'>Review your favorites, adjust quantities, and head to checkout with confidence.</p>
                                </div>
                            </div>

                            <div className='inline-flex items-center gap-3 self-start rounded-2xl border border-orange-100 bg-white/90 px-4 py-3 shadow-sm backdrop-blur sm:self-auto'>
                                <div className='flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff1ea] text-[#ff4d2d]'>
                                    <FaShoppingBag size={18} />
                                </div>
                                <div>
                                    <p className='text-[11px] font-semibold uppercase tracking-wide text-slate-400'>Cart Items</p>
                                    <p className='text-xl font-bold text-slate-900'>{totalItems}</p>
                                </div>
                            </div>
                        </div>

                        <div className='mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2'>
                            <div className='rounded-2xl border border-orange-100 bg-white/85 px-4 py-4 shadow-sm backdrop-blur'>
                                <div className='flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400'>
                                    <FaReceipt className='text-[#ff4d2d]' />
                                    Items Total
                                </div>
                                <p className='mt-2 text-3xl font-bold text-slate-900'>Rs {totalAmount}</p>
                                <p className='mt-1 text-sm text-slate-500'>Current payable amount before checkout</p>
                            </div>
                            <div className='rounded-2xl border border-orange-100 bg-white/85 px-4 py-4 shadow-sm backdrop-blur'>
                                <p className='text-[11px] font-semibold uppercase tracking-wide text-slate-400'>Checkout Ready</p>
                                <p className='mt-2 text-2xl font-bold text-slate-900'>{cartItems?.length > 0 ? 'Yes' : 'No'}</p>
                                <p className='mt-1 text-sm text-slate-500'>
                                    {cartItems?.length > 0 ? 'You can continue to address and payment.' : 'Add some dishes to continue.'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {cartItems?.length === 0 ? (
                    <div className='flex flex-col items-center justify-center rounded-[28px] border border-orange-100 bg-white px-6 py-20 text-center shadow-[0_18px_60px_rgba(15,23,42,0.06)]'>
                        <div className='flex h-20 w-20 items-center justify-center rounded-[28px] bg-[linear-gradient(135deg,#fff0e8,#ffffff)] text-[#ff4d2d] shadow-sm'>
                            <FaShoppingBag size={30} />
                        </div>
                        <h2 className='mt-6 text-2xl font-bold text-slate-900'>Your cart is empty</h2>
                        <p className='mt-2 max-w-md text-sm leading-6 text-slate-500'>Browse the menu, add a few dishes, and they’ll appear here with a cleaner checkout summary.</p>
                        <button
                            className='mt-6 rounded-2xl bg-gradient-to-r from-[#ff6b43] to-[#ff4d2d] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition hover:brightness-105'
                            onClick={() => navigate("/")}
                        >
                            Explore Food
                        </button>
                    </div>
                ) : (
                    <div className='grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]'>
                        <div className='overflow-hidden rounded-[28px] border border-orange-100 bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)]'>
                            <div className='mb-4 flex items-center justify-between gap-3'>
                                <div>
                                    <p className='text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ff6b43]'>Cart Items</p>
                                    <h2 className='mt-1 text-xl font-bold text-slate-900'>Swipe through your selections</h2>
                                </div>
                                <span className='rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-[#ff4d2d]'>
                                    {cartItems.length} item{cartItems.length > 1 ? 's' : ''}
                                </span>
                            </div>

                            <div className='flex gap-4 overflow-x-auto pb-2'>
                                {cartItems?.map((item, index) => (
                                    <CartItemCard data={item} key={index} />
                                ))}
                            </div>
                        </div>

                        <div className='lg:sticky lg:top-6 h-fit'>
                            <div className='overflow-hidden rounded-[28px] border border-orange-100 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)]'>
                                <div className='bg-[radial-gradient(circle_at_top_left,_rgba(255,120,82,0.16),_transparent_48%),linear-gradient(135deg,_#fff7f1,_#ffffff_62%)] p-5'>
                                    <p className='text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ff6b43]'>Order Summary</p>
                                    <h2 className='mt-1 text-2xl font-bold text-slate-900'>Ready for checkout</h2>
                                    <p className='mt-1 text-sm text-slate-500'>A quick snapshot before you confirm delivery details.</p>
                                </div>

                                <div className='p-5 space-y-4'>
                                    <div className='rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4'>
                                        <div className='flex items-center justify-between'>
                                            <span className='text-sm text-slate-500'>Items</span>
                                            <span className='text-sm font-semibold text-slate-900'>{totalItems}</span>
                                        </div>
                                        <div className='mt-3 flex items-center justify-between'>
                                            <span className='text-sm text-slate-500'>Subtotal</span>
                                            <span className='text-sm font-semibold text-slate-900'>Rs {totalAmount}</span>
                                        </div>
                                    </div>

                                    <div className='rounded-2xl border border-orange-100 bg-orange-50 px-4 py-4'>
                                        <div className='flex items-center justify-between'>
                                            <span className='text-sm font-medium text-slate-600'>Total Amount</span>
                                            <span className='text-3xl font-bold text-[#ff4d2d]'>Rs {totalAmount}</span>
                                        </div>
                                    </div>

                                    <button
                                        className='inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#ff6b43] to-[#ff4d2d] px-6 py-4 text-base font-semibold text-white shadow-lg shadow-orange-200 transition hover:brightness-105'
                                        onClick={() => navigate("/checkout")}
                                    >
                                        <span>Proceed to Checkout</span>
                                        <FaArrowRight size={14} />
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

export default CartPage
