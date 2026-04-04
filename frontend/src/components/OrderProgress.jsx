import React, { useEffect, useRef, useState } from 'react'
import { FaCheckCircle, FaUtensils, FaMotorcycle, FaHome, FaSpinner } from 'react-icons/fa'

const orderStatuses = [
    { key: 'placed', label: 'Order Placed', icon: FaCheckCircle },
    { key: 'preparing', label: 'Preparing', icon: FaUtensils },
    { key: 'out-for-delivery', label: 'Out for Delivery', icon: FaMotorcycle },
    { key: 'delivered', label: 'Delivered', icon: FaHome }
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
    const normalizeDisplayEta = (seconds) => {
        const safeEta = Math.max(0, Math.floor(Number(seconds) || 0))
        if (currentStatus === 'delivered' || safeEta === 0) return safeEta
        return Math.max(60, safeEta)
    }
    const normalizedIncomingEta = hasEta ? normalizeDisplayEta(etaSecondsRemaining) : 0
    const initialEta = normalizedIncomingEta
    const [displayEtaSeconds, setDisplayEtaSeconds] = useState(initialEta)
    const completionTriggeredRef = useRef(false)
    const currentIndex = getStatusIndex(currentStatus)

    useEffect(() => {
        if (!Number.isFinite(Number(etaSecondsRemaining))) return
        setDisplayEtaSeconds(normalizeDisplayEta(etaSecondsRemaining))
    }, [etaSecondsRemaining, currentIndex])

    useEffect(() => {
        if (currentIndex >= 3 || !hasEta) return
        const timer = setInterval(() => {
            setDisplayEtaSeconds((prev) => Math.max(0, prev - 1))
        }, 1000)
        return () => clearInterval(timer)
    }, [currentIndex, hasEta])

    useEffect(() => {
        completionTriggeredRef.current = false
    }, [currentStatus, etaSecondsRemaining])

    useEffect(() => {
        if (!hasEta || !canAutoComplete || currentIndex >= 3 || displayEtaSeconds > 0 || completionTriggeredRef.current) return
        if (typeof onEtaComplete !== 'function') return

        completionTriggeredRef.current = true
        onEtaComplete()
    }, [canAutoComplete, currentIndex, displayEtaSeconds, hasEta, onEtaComplete])

    return (
        <div className='w-full bg-white rounded-xl shadow-lg p-4 sm:p-6'>
            {currentIndex < 3 && (
                <div className='text-center mb-6'>
                    <p className='text-gray-500 text-sm'>Estimated Delivery Time</p>
                    <p className='text-3xl font-bold text-[#ff4d2d]'>
                        {hasEta ? formatAsMinuteSecond(displayEtaSeconds) : 'Calculating...'}
                    </p>
                </div>
            )}

            <div className='relative'>
                <div className='absolute top-6 left-0 right-0 h-1 bg-gray-200 mx-8 sm:mx-12'>
                    <div
                        className='h-full bg-[#ff4d2d] transition-all duration-500 ease-out'
                        style={{ width: `${(currentIndex / 3) * 100}%` }}
                    />
                </div>

                <div className='flex justify-between relative z-10'>
                    {orderStatuses.map((status, index) => {
                        const Icon = status.icon
                        const isCompleted = index <= currentIndex
                        const isActive = index === currentIndex

                        return (
                            <div key={status.key} className='flex flex-col items-center'>
                                <div
                                    className={`
                                        w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300
                                        ${isCompleted ? 'bg-[#ff4d2d] text-white shadow-lg' : 'bg-gray-200 text-gray-400'}
                                        ${isActive ? 'ring-4 ring-[#ff4d2d]/30 animate-pulse' : ''}
                                    `}
                                >
                                    {isActive && index < 3 ? (
                                        <FaSpinner className='animate-spin' size={20} />
                                    ) : (
                                        <Icon size={20} />
                                    )}
                                </div>
                                <p className={`
                                    mt-2 text-xs sm:text-sm font-medium text-center max-w-[60px] sm:max-w-[80px]
                                    ${isCompleted ? 'text-[#ff4d2d]' : 'text-gray-400'}
                                `}>
                                    {status.label}
                                </p>
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className='text-center mt-6'>
                {currentIndex === 0 && <p className='text-gray-600'>Your order is being processed...</p>}
                {currentIndex === 1 && <p className='text-gray-600'>The restaurant is preparing your food</p>}
                {currentIndex === 2 && <p className='text-gray-600'>Your order is on its way!</p>}
                {currentIndex === 3 && <p className='text-green-600 font-semibold'>Order delivered. Enjoy your meal!</p>}
            </div>
        </div>
    )
}

export default OrderProgress
