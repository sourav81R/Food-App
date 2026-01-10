import React from 'react'
import { FaCheckCircle, FaUtensils, FaMotorcycle, FaHome, FaSpinner } from 'react-icons/fa'

const orderStatuses = [
    { key: 'placed', label: 'Order Placed', icon: FaCheckCircle },
    { key: 'preparing', label: 'Preparing', icon: FaUtensils },
    { key: 'out-for-delivery', label: 'Out for Delivery', icon: FaMotorcycle },
    { key: 'delivered', label: 'Delivered', icon: FaHome }
]

function OrderProgress({ currentStatus, createdAt }) {
    const getStatusIndex = (status) => {
        const statusMap = {
            'placed': 0,
            'pending': 0,
            'confirmed': 0,
            'preparing': 1,
            'ready': 1,
            'out-for-delivery': 2,
            'on-the-way': 2,
            'delivered': 3
        }
        return statusMap[status?.toLowerCase()] ?? 0
    }

    const currentIndex = getStatusIndex(currentStatus)

    // Calculate ETA based on status
    const getETA = () => {
        const orderTime = new Date(createdAt)
        const now = new Date()
        const minutesElapsed = Math.floor((now - orderTime) / 60000)

        const etaByStatus = {
            0: Math.max(30 - minutesElapsed, 5), // Order placed: ~30 min total
            1: Math.max(20 - minutesElapsed, 5), // Preparing: ~20 min left
            2: Math.max(15 - minutesElapsed, 5), // Out for delivery: ~15 min
            3: 0 // Delivered
        }

        return etaByStatus[currentIndex]
    }

    const eta = getETA()

    return (
        <div className='w-full bg-white rounded-xl shadow-lg p-4 sm:p-6'>
            {/* ETA Header */}
            {currentIndex < 3 && (
                <div className='text-center mb-6'>
                    <p className='text-gray-500 text-sm'>Estimated Delivery Time</p>
                    <p className='text-3xl font-bold text-[#ff4d2d]'>
                        {eta} <span className='text-lg'>min</span>
                    </p>
                </div>
            )}

            {/* Progress Steps */}
            <div className='relative'>
                {/* Progress Line */}
                <div className='absolute top-6 left-0 right-0 h-1 bg-gray-200 mx-8 sm:mx-12'>
                    <div
                        className='h-full bg-[#ff4d2d] transition-all duration-500 ease-out'
                        style={{ width: `${(currentIndex / 3) * 100}%` }}
                    />
                </div>

                {/* Status Icons */}
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
                                        ${isCompleted
                                            ? 'bg-[#ff4d2d] text-white shadow-lg'
                                            : 'bg-gray-200 text-gray-400'
                                        }
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

            {/* Status Message */}
            <div className='text-center mt-6'>
                {currentIndex === 0 && (
                    <p className='text-gray-600'>Your order is being processed...</p>
                )}
                {currentIndex === 1 && (
                    <p className='text-gray-600'>🍳 The restaurant is preparing your food</p>
                )}
                {currentIndex === 2 && (
                    <p className='text-gray-600'>🏍️ Your order is on its way!</p>
                )}
                {currentIndex === 3 && (
                    <p className='text-green-600 font-semibold'>✅ Order delivered! Enjoy your meal!</p>
                )}
            </div>
        </div>
    )
}

export default OrderProgress
