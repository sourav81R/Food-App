import React from 'react'
import { FaCircleCheck, FaArrowRight, FaBagShopping, FaClockRotateLeft } from "react-icons/fa6";
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

function OrderPlaced() {
    const navigate = useNavigate()
    const { isDark } = useTheme()

    return (
        <div className={`min-h-screen px-3 py-4 sm:px-4 sm:py-6 ${isDark ? 'bg-[linear-gradient(180deg,#090f1f_0%,#10172a_48%,#0a1020_100%)]' : 'bg-[linear-gradient(180deg,#fff7f2_0%,#fffaf7_42%,#ffffff_100%)]'}`}>
            <div className='mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-6xl items-center justify-center'>
                <div className={`relative w-full overflow-hidden rounded-[32px] border ${isDark ? 'border-white/10 bg-[linear-gradient(180deg,rgba(18,27,48,0.96),rgba(11,18,33,0.98))] text-white shadow-[0_24px_80px_rgba(2,6,23,0.35)]' : 'border-orange-100 bg-white text-slate-900 shadow-[0_24px_80px_rgba(15,23,42,0.08)]'}`}>
                    <div className={`absolute inset-0 ${isDark ? 'bg-[radial-gradient(circle_at_top_left,rgba(255,120,82,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.10),transparent_26%)]' : 'bg-[radial-gradient(circle_at_top_left,rgba(255,120,82,0.20),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.12),transparent_24%)]'}`} />

                    <div className='relative grid grid-cols-1 gap-8 px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center'>
                        <div>
                            <p className='text-[11px] font-semibold uppercase tracking-[0.32em] text-[#ff6b43]'>Order Confirmed</p>
                            <h1 className={`mt-3 text-4xl font-bold leading-tight sm:text-5xl ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                Fresh food is officially on the way.
                            </h1>
                            <p className={`mt-4 max-w-xl text-base leading-8 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
                                Your order has been placed successfully and the restaurant is getting started. You can follow each update from preparation to delivery inside My Orders.
                            </p>

                            <div className='mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3'>
                                <div className={`rounded-[22px] border px-4 py-4 ${isDark ? 'border-white/10 bg-white/5' : 'border-orange-100 bg-white/90'}`}>
                                    <p className='text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400'>Status</p>
                                    <p className={`mt-2 text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Confirmed</p>
                                    <p className={`mt-1 text-sm ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>Order received</p>
                                </div>
                                <div className={`rounded-[22px] border px-4 py-4 ${isDark ? 'border-white/10 bg-white/5' : 'border-orange-100 bg-white/90'}`}>
                                    <p className='text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400'>Next Step</p>
                                    <p className={`mt-2 text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Preparing</p>
                                    <p className={`mt-1 text-sm ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>Kitchen starts soon</p>
                                </div>
                                <div className={`rounded-[22px] border px-4 py-4 ${isDark ? 'border-white/10 bg-white/5' : 'border-orange-100 bg-white/90'}`}>
                                    <p className='text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400'>Tracking</p>
                                    <p className={`mt-2 text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Live</p>
                                    <p className={`mt-1 text-sm ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>Available in My Orders</p>
                                </div>
                            </div>

                            <div className='mt-8 flex flex-col gap-3 sm:flex-row'>
                                <button
                                    className='inline-flex items-center justify-center gap-2 rounded-[22px] bg-gradient-to-r from-[#ff6b43] to-[#ff4d2d] px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition hover:brightness-105'
                                    onClick={() => navigate("/my-orders")}
                                >
                                    <span>Go to My Orders</span>
                                    <FaArrowRight size={13} />
                                </button>
                                <button
                                    className={`inline-flex items-center justify-center gap-2 rounded-[22px] px-6 py-3.5 text-sm font-semibold transition ${isDark ? 'border border-white/10 bg-white/5 text-white hover:bg-white/10' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
                                    onClick={() => navigate("/")}
                                >
                                    <FaBagShopping size={14} />
                                    <span>Continue Browsing</span>
                                </button>
                            </div>
                        </div>

                        <div className='flex justify-center lg:justify-end'>
                            <div className='relative w-full max-w-[380px]'>
                                <div className={`absolute left-1/2 top-10 h-52 w-52 -translate-x-1/2 rounded-full blur-3xl ${isDark ? 'bg-emerald-400/15' : 'bg-emerald-300/35'}`} />

                                <div className={`relative overflow-hidden rounded-[30px] border p-5 ${isDark ? 'border-white/10 bg-white/5' : 'border-orange-100 bg-[linear-gradient(180deg,#fffaf6,#ffffff)]'} shadow-[0_18px_60px_rgba(15,23,42,0.08)]`}>
                                    <div className='flex items-center justify-center'>
                                        <div className='relative'>
                                            <div className='absolute inset-0 scale-[1.35] rounded-full border border-emerald-400/25' />
                                            <div className='absolute inset-0 scale-[1.7] rounded-full border border-emerald-400/15' />
                                            <div className='flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-[0_20px_50px_rgba(16,185,129,0.35)]'>
                                                <FaCircleCheck size={38} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className='mt-8 space-y-3'>
                                        <div className={`rounded-[22px] border px-4 py-4 ${isDark ? 'border-white/10 bg-[#0f172c]/80' : 'border-orange-100 bg-white'}`}>
                                            <div className='flex items-start gap-3'>
                                                <span className='mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#fff1ea] text-[#ff4d2d]'>
                                                    <FaClockRotateLeft size={16} />
                                                </span>
                                                <div>
                                                    <p className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>What happens next?</p>
                                                    <p className={`mt-1 text-sm leading-6 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
                                                        The shop confirms your items, starts preparation, and then your order moves into delivery tracking.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className={`rounded-[22px] border px-4 py-4 ${isDark ? 'border-white/10 bg-[#0f172c]/80' : 'border-orange-100 bg-white'}`}>
                                            <p className='text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ff6b43]'>Quick Tip</p>
                                            <p className={`mt-2 text-sm leading-6 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
                                                Keep notifications enabled so you do not miss preparation and delivery updates.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default OrderPlaced
