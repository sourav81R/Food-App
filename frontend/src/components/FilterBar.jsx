import React, { useState } from 'react'
import { FaFilter, FaLeaf, FaDrumstickBite, FaStar, FaTimes } from 'react-icons/fa'

function FilterBar({ onFilterChange, currentFilters }) {
    const [showFilters, setShowFilters] = useState(false)
    const [filters, setFilters] = useState({
        foodType: currentFilters?.foodType || 'all', // all, veg, nonveg
        minPrice: currentFilters?.minPrice || 0,
        maxPrice: currentFilters?.maxPrice || 1000,
        minRating: currentFilters?.minRating || 0
    })

    const handleFilterChange = (key, value) => {
        const newFilters = { ...filters, [key]: value }
        setFilters(newFilters)
        onFilterChange(newFilters)
    }

    const resetFilters = () => {
        const defaultFilters = {
            foodType: 'all',
            minPrice: 0,
            maxPrice: 1000,
            minRating: 0
        }
        setFilters(defaultFilters)
        onFilterChange(defaultFilters)
    }

    const activeFilterCount = [
        filters.foodType !== 'all',
        filters.minPrice > 0,
        filters.maxPrice < 1000,
        filters.minRating > 0
    ].filter(Boolean).length

    return (
        <div className='w-full mb-4'>
            {/* Filter Toggle Button */}
            <button
                className='flex items-center gap-2 px-4 py-2 bg-white border-2 border-[#ff4d2d] rounded-full text-[#ff4d2d] font-medium hover:bg-[#ff4d2d] hover:text-white transition-all'
                onClick={() => setShowFilters(!showFilters)}
            >
                <FaFilter size={14} />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                    <span className='bg-[#ff4d2d] text-white px-2 py-0.5 rounded-full text-xs'>
                        {activeFilterCount}
                    </span>
                )}
            </button>

            {/* Filter Panel */}
            {showFilters && (
                <div className='mt-3 p-4 bg-white rounded-xl shadow-lg border animate-slide-in'>
                    <div className='flex justify-between items-center mb-4'>
                        <h3 className='font-semibold text-gray-800'>Filters</h3>
                        <button
                            className='text-sm text-[#ff4d2d] hover:underline'
                            onClick={resetFilters}
                        >
                            Reset All
                        </button>
                    </div>

                    {/* Food Type Filter */}
                    <div className='mb-4'>
                        <label className='block text-sm font-medium text-gray-700 mb-2'>Food Type</label>
                        <div className='flex gap-2 flex-wrap'>
                            <button
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition ${filters.foodType === 'all'
                                        ? 'bg-[#ff4d2d] text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                onClick={() => handleFilterChange('foodType', 'all')}
                            >
                                All
                            </button>
                            <button
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition ${filters.foodType === 'veg'
                                        ? 'bg-green-500 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                onClick={() => handleFilterChange('foodType', 'veg')}
                            >
                                <FaLeaf size={12} />
                                Veg
                            </button>
                            <button
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition ${filters.foodType === 'nonveg'
                                        ? 'bg-red-500 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                onClick={() => handleFilterChange('foodType', 'nonveg')}
                            >
                                <FaDrumstickBite size={12} />
                                Non-Veg
                            </button>
                        </div>
                    </div>

                    {/* Price Range Filter */}
                    <div className='mb-4'>
                        <label className='block text-sm font-medium text-gray-700 mb-2'>
                            Price Range: ₹{filters.minPrice} - ₹{filters.maxPrice}
                        </label>
                        <div className='flex gap-3 items-center'>
                            <input
                                type='range'
                                min='0'
                                max='500'
                                value={filters.minPrice}
                                onChange={(e) => handleFilterChange('minPrice', parseInt(e.target.value))}
                                className='flex-1 accent-[#ff4d2d]'
                            />
                            <span className='text-sm text-gray-500'>to</span>
                            <input
                                type='range'
                                min='100'
                                max='1000'
                                value={filters.maxPrice}
                                onChange={(e) => handleFilterChange('maxPrice', parseInt(e.target.value))}
                                className='flex-1 accent-[#ff4d2d]'
                            />
                        </div>
                    </div>

                    {/* Rating Filter */}
                    <div className='mb-2'>
                        <label className='block text-sm font-medium text-gray-700 mb-2'>Minimum Rating</label>
                        <div className='flex gap-1'>
                            {[0, 1, 2, 3, 4, 5].map((rating) => (
                                <button
                                    key={rating}
                                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition ${filters.minRating === rating
                                            ? 'bg-yellow-400 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    onClick={() => handleFilterChange('minRating', rating)}
                                >
                                    {rating === 0 ? 'Any' : (
                                        <>
                                            {rating}
                                            <FaStar size={10} />
                                        </>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default FilterBar
