import React, { useCallback, useEffect, useRef, useState } from 'react'
import { FaCheckCircle, FaUtensils, FaMotorcycle, FaHome, FaSpinner, FaClock } from 'react-icons/fa'

const orderStatuses = [
    { key: 'placed', label: 'Order Placed', icon: FaCheckCircle, hint: 'Confirmed' },
    { key: 'preparing', label: 'Preparing', icon: FaUtensils, hint: 'In kitchen' },
    { key: 'out-for-delivery', label: 'Out for Delivery', icon: FaMotorcycle, hint: 'Rider assigned' },
    { key: 'delivered', label: 'Delivered', icon: FaHome, hint: 'Reached you' }
]

const getStatusIndex = (status) => {
    const statusMap = {
        'placed': 0,
        'pending': 0,
        'confirmed': 0,
        'assigned': 0,
        'preparing': 1,
        'ready': 1,
        'out-for-delivery': 2,
        'out of delivery': 2,
        'on-the-way': 2,
        'on_the_way': 2,
        'picked_up': 2,
        'picked-up': 2,
        'delivered': 3
    }
    return statusMap[String(status || '').toLowerCase()] ?? 0
}

const formatAsMinuteSecond = (seconds = 0) => {
    const safeSeconds = Math.max(0, Math.floor(seconds))
    const minutes = Math.floor(safeSeconds / 60)
    const remSeconds = safeSeconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(remSeconds).padStart(2, '0')}`
}

function OrderProgress({
    currentStatus,
    etaSecondsRemaining,
    onEtaComplete,
    canAutoComplete = true
}) {
    const hasEta = Number.isFinite(Number(etaSecondsRemaining))
    const normalizeDisplayEta = useCallback((seconds) => {
        const safeEta = Math.max(0, Math.floor(Number(seconds) || 0))
        if (currentStatus === 'delivered' || safeEta === 0) return safeEta
        return Math.max(60, safeEta)
    }, [currentStatus])
    const normalizedIncomingEta = hasEta ? normalizeDisplayEta(etaSecondsRemaining) : 0
    const [displayEtaSeconds, setDisplayEtaSeconds] = useState(normalizedIncomingEta)
    const completionTriggeredRef = useRef(false)
    const previousStatusRef = useRef(currentStatus)
    const currentIndex = getStatusIndex(currentStatus)
    const progressPercent = `${(currentIndex / (orderStatuses.length - 1)) * 100}%`

    useEffect(() => {
        if (!Number.isFinite(Number(etaSecondsRemaining))) return
        const nextEta = normalizeDisplayEta(etaSecondsRemaining)
        const statusChanged = previousStatusRef.current !== currentStatus

        setDisplayEtaSeconds((prev) => {
            if (!Number.isFinite(Number(prev)) || statusChanged) {
                return nextEta
            }

            if (currentStatus === 'delivered' || nextEta === 0) {
                return nextEta
            }

            if (prev <= 0) {
                return 0
            }

            return Math.min(prev, nextEta)
        })
        previousStatusRef.current = currentStatus
    }, [currentStatus, etaSecondsRemaining, normalizeDisplayEta])

    useEffect(() => {
        if (currentIndex >= 3 || !hasEta) return
        const timer = setInterval(() => {
            setDisplayEtaSeconds((prev) => Math.max(0, prev - 1))
        }, 1000)
        return () => clearInterval(timer)
    }, [currentIndex, hasEta])

    useEffect(() => {
        completionTriggeredRef.current = false
    }, [currentStatus])

    useEffect(() => {
        if (!hasEta || !canAutoComplete || currentIndex >= 3 || displayEtaSeconds > 0 || completionTriggeredRef.current) return
        if (typeof onEtaComplete !== 'function') return

        completionTriggeredRef.current = true
        onEtaComplete()
    }, [canAutoComplete, currentIndex, displayEtaSeconds, hasEta, onEtaComplete])

    return (
        <div className='relative overflow-hidden rounded-[28px] border border-orange-100 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)]'>
            <div className='absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top_left,_rgba(255,111,71,0.18),_transparent_52%),linear-gradient(135deg,_#fff7f2,_#ffffff)]' />

            <div className='relative p-5 sm:p-6'>
                <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
                    <div>
                        <p className='text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ff6b43]'>Live Progress</p>
                        <h3 className='mt-1 text-xl font-bold text-slate-900'>Your delivery timeline</h3>
                        <p className='mt-1 text-sm text-slate-500'>
                            {currentIndex === 0 && 'The restaurant has received your order.'}
                            {currentIndex === 1 && 'Your food is being freshly prepared.'}
                            {currentIndex === 2 && 'Your order is travelling to your address.'}
                            {currentIndex === 3 && 'Delivered successfully. Enjoy your meal.'}
                        </p>
                    </div>

                    <div className='inline-flex items-center gap-3 self-start rounded-2xl border border-orange-100 bg-white/90 px-4 py-3 shadow-sm backdrop-blur sm:self-auto'>
                        <div className='flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff1ea] text-[#ff4d2d]'>
                            <FaClock size={18} />
                        </div>
                        <div>
                            <p className='text-[11px] font-semibold uppercase tracking-wide text-slate-400'>Estimated Time</p>
                            <p className='text-xl font-bold text-slate-900'>
                                {currentIndex < 3 ? (hasEta ? formatAsMinuteSecond(displayEtaSeconds) : 'Calculating...') : 'Completed'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className='mt-8'>
                    <div className='relative h-2 rounded-full bg-slate-100'>
                        <div
                            className='absolute left-0 top-0 h-2 rounded-full bg-gradient-to-r from-[#ff6b43] via-[#ff4d2d] to-[#ff8457] transition-all duration-500 ease-out'
                            style={{ width: progressPercent }}
                        />
                    </div>

                    <div className='mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4'>
                        {orderStatuses.map((status, index) => {
                            const Icon = status.icon
                            const isCompleted = index <= currentIndex
                            const isActive = index === currentIndex

                            return (
                                <div
                                    key={status.key}
                                    className={`rounded-2xl border px-3 py-4 text-center transition-all duration-300 ${
                                        isCompleted
                                            ? 'border-orange-200 bg-gradient-to-br from-[#fff4ef] to-white shadow-sm'
                                            : 'border-slate-200 bg-slate-50/80'
                                    } ${isActive ? 'ring-2 ring-[#ff4d2d]/20' : ''}`}
                                >
                                    <div
                                        className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl ${
                                            isCompleted ? 'bg-[#ff4d2d] text-white shadow-lg shadow-orange-200' : 'bg-white text-slate-300'
                                        }`}
                                    >
                                        {isActive && index < 3 ? (
                                            <FaSpinner className='animate-spin' size={18} />
                                        ) : (
                                            <Icon size={18} />
                                        )}
                                    </div>

                                    <p className={`mt-3 text-sm font-semibold ${isCompleted ? 'text-[#ff4d2d]' : 'text-slate-500'}`}>
                                        {status.label}
                                    </p>
                                    <p className='mt-1 text-xs text-slate-400'>{status.hint}</p>
                                </div>
                            )
                        })}
                    </div>
                </div>

                <div className='mt-6 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-center'>
                    {currentIndex === 0 && <p className='text-sm font-medium text-slate-600'>Your order is being processed and queued for the kitchen.</p>}
                    {currentIndex === 1 && <p className='text-sm font-medium text-slate-600'>The restaurant is preparing your food right now.</p>}
                    {currentIndex === 2 && <p className='text-sm font-medium text-slate-600'>Your rider is on the way to your location.</p>}
                    {currentIndex === 3 && <p className='text-sm font-semibold text-emerald-700'>Order delivered. Enjoy your meal!</p>}
                </div>
            </div>
        </div>
    )
}

export default OrderProgress
