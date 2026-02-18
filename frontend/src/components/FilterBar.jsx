import React, { useEffect, useState } from 'react'
import { FaFilter, FaLeaf, FaDrumstickBite, FaStar, FaClock } from 'react-icons/fa'

function FilterBar({ onFilterChange, currentFilters }) {
    const [showFilters, setShowFilters] = useState(false)
    const [filters, setFilters] = useState({
        foodType: currentFilters?.foodType || 'all',
        minPrice: currentFilters?.minPrice || 0,
        maxPrice: currentFilters?.maxPrice || 1000,
        minRating: currentFilters?.minRating || 0,
        sortBy: currentFilters?.sortBy || 'default'
    })

    useEffect(() => {
        setFilters({
            foodType: currentFilters?.foodType || 'all',
            minPrice: currentFilters?.minPrice || 0,
            maxPrice: currentFilters?.maxPrice || 1000,
            minRating: currentFilters?.minRating || 0,
            sortBy: currentFilters?.sortBy || 'default'
        })
    }, [currentFilters])

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
            minRating: 0,
            sortBy: 'default'
        }
        setFilters(defaultFilters)
        onFilterChange(defaultFilters)
    }

    const activeFilterCount = [
        filters.foodType !== 'all',
        filters.minPrice > 0,
        filters.maxPrice < 1000,
        filters.minRating > 0,
        filters.sortBy !== 'default'
    ].filter(Boolean).length

    return (
        <div className='w-full mb-4'>
            <div className='flex items-center gap-2 flex-wrap'>
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

                <button
                    className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 font-medium transition-all ${filters.sortBy === 'latest'
                        ? 'bg-[#ff4d2d] border-[#ff4d2d] text-white'
                        : 'bg-white border-[#ff4d2d] text-[#ff4d2d] hover:bg-[#ff4d2d] hover:text-white'
                        }`}
                    onClick={() => handleFilterChange('sortBy', filters.sortBy === 'latest' ? 'default' : 'latest')}
                >
                    <FaClock size={14} />
                    <span>Latest Update</span>
                </button>
            </div>

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

                    <div className='mb-4'>
                        <p className='block text-sm font-medium text-gray-700 mb-2'>Food Type</p>
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

                    <div className='mb-4'>
                        <p className='block text-sm font-medium text-gray-700 mb-2'>
                            Price Range: Rs {filters.minPrice} - Rs {filters.maxPrice}
                        </p>
                        <div className='flex gap-3 items-center'>
                            <label htmlFor='min-price-filter' className='sr-only'>Minimum price</label>
                            <input
                                id='min-price-filter'
                                name='minPrice'
                                type='range'
                                min='0'
                                max='500'
                                value={filters.minPrice}
                                onChange={(e) => handleFilterChange('minPrice', parseInt(e.target.value))}
                                className='flex-1 accent-[#ff4d2d]'
                            />
                            <span className='text-sm text-gray-500'>to</span>
                            <label htmlFor='max-price-filter' className='sr-only'>Maximum price</label>
                            <input
                                id='max-price-filter'
                                name='maxPrice'
                                type='range'
                                min='100'
                                max='1000'
                                value={filters.maxPrice}
                                onChange={(e) => handleFilterChange('maxPrice', parseInt(e.target.value))}
                                className='flex-1 accent-[#ff4d2d]'
                            />
                        </div>
                    </div>

                    <div className='mb-2'>
                        <p className='block text-sm font-medium text-gray-700 mb-2'>Minimum Rating</p>
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

                    <div className='mt-4'>
                        <p className='block text-sm font-medium text-gray-700 mb-2'>Latest Item</p>
                        <div className='flex gap-2 flex-wrap'>
                            <button
                                className={`px-3 py-1.5 rounded-full text-sm transition ${filters.sortBy === 'default'
                                    ? 'bg-[#ff4d2d] text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                onClick={() => handleFilterChange('sortBy', 'default')}
                            >
                                Default
                            </button>
                            <button
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition ${filters.sortBy === 'latest'
                                    ? 'bg-[#ff4d2d] text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                onClick={() => handleFilterChange('sortBy', 'latest')}
                            >
                                <FaClock size={12} />
                                Latest Item
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default FilterBar
