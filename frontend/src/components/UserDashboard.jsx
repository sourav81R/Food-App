import React, { useEffect, useMemo, useRef, useState } from 'react'
import Nav from './Nav'
import { categories } from '../category'
import CategoryCard from './CategoryCard'
import { FaCircleChevronLeft } from "react-icons/fa6";
import { FaCircleChevronRight } from "react-icons/fa6";
import { useSelector } from 'react-redux';
import FoodCard from './FoodCard';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { serverUrl } from '../App';
import FilterBar from './FilterBar';
import MealTimeSection from './MealTimeSection';
import WelcomeCelebration from './WelcomeCelebration';
import { useTheme } from '../context/ThemeContext';

const TEA_BREAK_CATEGORIES = ['Snacks', 'Fast Food', 'Desserts', 'Sandwiches', 'Others']
const TEA_BREAK_KEYWORDS = ['tea', 'chai', 'coffee', 'cappuccino', 'espresso', 'latte', 'mocha', 'cold brew', 'samosa', 'toast', 'biscuit', 'sandwich']
const TEA_BREAK_SHOP_KEYWORDS = ['tea', 'chai', 'coffee', 'cafe', 'brew']

function UserDashboard() {
  const { userData, currentCity, shopInMyCity, itemsInMyCity, searchItems } = useSelector(state => state.user)
  const cateScrollRef = useRef()
  const shopScrollRef = useRef()
  const navigate = useNavigate()
  const [showLeftCateButton, setShowLeftCateButton] = useState(false)
  const [showRightCateButton, setShowRightCateButton] = useState(false)
  const [showLeftShopButton, setShowLeftShopButton] = useState(false)
  const [showRightShopButton, setShowRightShopButton] = useState(false)
  const [updatedItemsList, setUpdatedItemsList] = useState([])
  const [activeCategory, setActiveCategory] = useState('All')
  const [filters, setFilters] = useState({
    foodType: 'all',
    minPrice: 0,
    maxPrice: 1000,
    minRating: 0,
    sortBy: 'default'
  })
  const isLatestItemsView = filters.sortBy === 'latest'
  const { isDark } = useTheme()

  // Auto-slide state
  const [isCatePaused, setIsCatePaused] = useState(false)
  const [isShopPaused, setIsShopPaused] = useState(false)

  // Welcome celebration state
  const [showCelebration, setShowCelebration] = useState(false)

  // Trigger welcome celebration
  useEffect(() => {
    // Check if we've already shown the celebration in this session
    const hasSeenCelebration = sessionStorage.getItem('hasSeenWelcomeCelebration')

    if (!hasSeenCelebration && userData) {
      const timer = setTimeout(() => {
        setShowCelebration(true)
        sessionStorage.setItem('hasSeenWelcomeCelebration', 'true')
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [userData])

  const handleFilterByCategory = (category) => {
    setActiveCategory(category)
    applyFilters(itemsInMyCity, category, filters)
  }

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters)
    applyFilters(itemsInMyCity, activeCategory, newFilters)
  }

  const applyFilters = (items, category, filterOptions) => {
    if (!items) return

    let filtered = [...items]

    // Category filter
    if (category === 'Tea Break') {
      filtered = filtered.filter((item) => {
        const categoryMatch = TEA_BREAK_CATEGORIES.includes(item.category)
        const name = item?.name?.toLowerCase() || ''
        const keywordMatch = TEA_BREAK_KEYWORDS.some((keyword) => name.includes(keyword))
        return categoryMatch || keywordMatch
      })
    } else if (category !== 'All') {
      filtered = filtered.filter(item => item.category === category)
    }

    // Food type filter (veg/non-veg)
    if (filterOptions.foodType !== 'all') {
      filtered = filtered.filter(item =>
        filterOptions.foodType === 'veg' ? item.foodType === 'veg' : item.foodType !== 'veg'
      )
    }

    // Price filter
    filtered = filtered.filter(item =>
      item.price >= filterOptions.minPrice && item.price <= filterOptions.maxPrice
    )

    // Rating filter
    if (filterOptions.minRating > 0) {
      filtered = filtered.filter(item =>
        (item.rating?.average || 0) >= filterOptions.minRating
      )
    }

    // Sort filter
    if (filterOptions.sortBy === 'latest') {
      filtered.sort((a, b) => {
        const first = a?.createdAt ? new Date(a.createdAt).getTime() : 0
        const second = b?.createdAt ? new Date(b.createdAt).getTime() : 0
        return second - first
      })
    }

    setUpdatedItemsList(filtered)
  }

  const displayedShops = useMemo(() => {
    const sourceShops = Array.isArray(shopInMyCity) ? shopInMyCity : []
    if (activeCategory !== 'Tea Break') {
      return sourceShops
    }

    return sourceShops.filter((shop) => {
      const shopName = (shop?.name || '').toLowerCase()
      const shopNameMatch = TEA_BREAK_SHOP_KEYWORDS.some((keyword) => shopName.includes(keyword))
      const itemMatch = Array.isArray(shop?.items) && shop.items.some((item) => {
        const categoryMatch = TEA_BREAK_CATEGORIES.includes(item?.category)
        const itemName = (item?.name || '').toLowerCase()
        const keywordMatch = TEA_BREAK_KEYWORDS.some((keyword) => itemName.includes(keyword))
        return categoryMatch || keywordMatch
      })

      return shopNameMatch || itemMatch
    })
  }, [activeCategory, shopInMyCity])

  useEffect(() => {
    applyFilters(itemsInMyCity || [], activeCategory, filters)
  }, [itemsInMyCity, activeCategory, filters])


  const updateButton = (ref, setLeftButton, setRightButton) => {
    const element = ref.current
    if (element) {
      setLeftButton(element.scrollLeft > 0)
      setRightButton(element.scrollLeft + element.clientWidth < element.scrollWidth)

    }
  }
  const scrollHandler = (ref, direction) => {
    if (ref.current) {
      ref.current.scrollBy({
        left: direction == "left" ? -200 : 200,
        behavior: "smooth"
      })
    }
  }




  useEffect(() => {
    if (cateScrollRef.current) {
      updateButton(cateScrollRef, setShowLeftCateButton, setShowRightCateButton)
      updateButton(shopScrollRef, setShowLeftShopButton, setShowRightShopButton)
      cateScrollRef.current.addEventListener('scroll', () => {
        updateButton(cateScrollRef, setShowLeftCateButton, setShowRightCateButton)
      })
      shopScrollRef.current.addEventListener('scroll', () => {
        updateButton(shopScrollRef, setShowLeftShopButton, setShowRightShopButton)
      })

    }

    return () => {
      cateScrollRef?.current?.removeEventListener("scroll", () => {
        updateButton(cateScrollRef, setShowLeftCateButton, setShowRightCateButton)
      })
      shopScrollRef?.current?.removeEventListener("scroll", () => {
        updateButton(shopScrollRef, setShowLeftShopButton, setShowRightShopButton)
      })
    }

  }, [categories])

  // Auto-slide for categories
  useEffect(() => {
    if (isCatePaused || !cateScrollRef.current) return

    const interval = setInterval(() => {
      const element = cateScrollRef.current
      if (!element) return

      const isAtEnd = element.scrollLeft + element.clientWidth >= element.scrollWidth - 10

      if (isAtEnd) {
        // Reset to beginning
        element.scrollTo({ left: 0, behavior: 'smooth' })
      } else {
        // Scroll right
        element.scrollBy({ left: 200, behavior: 'smooth' })
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [isCatePaused])

  // Auto-slide for shops
  useEffect(() => {
    if (isShopPaused || !shopScrollRef.current) return

    const interval = setInterval(() => {
      const element = shopScrollRef.current
      if (!element) return

      const isAtEnd = element.scrollLeft + element.clientWidth >= element.scrollWidth - 10

      if (isAtEnd) {
        // Reset to beginning
        element.scrollTo({ left: 0, behavior: 'smooth' })
      } else {
        // Scroll right
        element.scrollBy({ left: 200, behavior: 'smooth' })
      }
    }, 4000)

    return () => clearInterval(interval)
  }, [isShopPaused])


  return (
    <div className={`w-full min-h-screen flex flex-col gap-0 items-center overflow-y-auto pt-[75px] px-3 sm:px-4 transition-colors duration-300 ${isDark ? 'bg-[#1a1a2e]' : 'bg-[#fff9f6]'}`}>
      <Nav />

      {/* Welcome Celebration Animation */}
      {showCelebration && <WelcomeCelebration onClose={() => setShowCelebration(false)} />}

      {searchItems && searchItems.length > 0 && (
        <div className={`w-full max-w-6xl flex flex-col gap-5 items-start p-4 sm:p-5 shadow-md rounded-2xl mt-4 transition-colors ${isDark ? 'bg-[#16213e]' : 'bg-white'}`}>
          <h1 className={`text-2xl sm:text-3xl font-semibold border-b pb-2 ${isDark ? 'text-white border-gray-700' : 'text-gray-900 border-gray-200'}`}>
            Search Results
          </h1>
          <div className='w-full h-auto flex flex-wrap gap-6 justify-center'>
            {searchItems.map((item) => (
              <FoodCard data={item} key={item._id} />
            ))}
          </div>
        </div>
      )}

      {/* Meal Time Section - Breakfast/Lunch/Tea Break/Evening/Snacks based on time */}
      {itemsInMyCity && itemsInMyCity.length > 0 && (
        <MealTimeSection items={itemsInMyCity} />
      )}

      <div className="w-full max-w-6xl flex flex-col gap-5 items-start px-1 sm:px-[10px]">

        <h1 className={`text-2xl sm:text-3xl font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>Inspiration for your first order</h1>
        <div className='w-full relative'>
          {showLeftCateButton && <button className='hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 bg-[#ff4d2d] text-white p-2 rounded-full shadow-lg hover:bg-[#e64528] z-10' onClick={() => scrollHandler(cateScrollRef, "left")}><FaCircleChevronLeft />
          </button>}


          <div
            className='w-full flex overflow-x-auto gap-4 pb-2'
            ref={cateScrollRef}
            onMouseEnter={() => setIsCatePaused(true)}
            onMouseLeave={() => setIsCatePaused(false)}
          >
            {categories.map((cate, index) => (
              <CategoryCard name={cate.category} image={cate.image} key={index} onClick={() => handleFilterByCategory(cate.category)} />
            ))}
          </div>
          {showRightCateButton && <button className='hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 bg-[#ff4d2d] text-white p-2 rounded-full shadow-lg hover:bg-[#e64528] z-10' onClick={() => scrollHandler(cateScrollRef, "right")}>
            <FaCircleChevronRight />
          </button>}

        </div>
      </div>

      <div className='w-full max-w-6xl flex flex-col gap-5 items-start px-1 sm:px-[10px]'>
        <h1 className={`text-2xl sm:text-3xl font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>Best Shop in {currentCity}</h1>
        <div className='w-full relative'>
          {showLeftShopButton && <button className='hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 bg-[#ff4d2d] text-white p-2 rounded-full shadow-lg hover:bg-[#e64528] z-10' onClick={() => scrollHandler(shopScrollRef, "left")}><FaCircleChevronLeft />
          </button>}


          <div
            className='w-full flex overflow-x-auto gap-4 pb-2'
            ref={shopScrollRef}
            onMouseEnter={() => setIsShopPaused(true)}
            onMouseLeave={() => setIsShopPaused(false)}
          >
            {displayedShops?.map((shop, index) => (
              <CategoryCard name={shop.name} image={shop.image} key={index} onClick={() => navigate(`/shop/${shop._id}`)} />
            ))}
          </div>
          {showRightShopButton && <button className='hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 bg-[#ff4d2d] text-white p-2 rounded-full shadow-lg hover:bg-[#e64528] z-10' onClick={() => scrollHandler(shopScrollRef, "right")}>
            <FaCircleChevronRight />
          </button>}

        </div>
      </div>

      <div className='w-full max-w-6xl flex flex-col gap-5 items-start px-1 sm:px-[10px]'>
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-3'>
          <h1 className='text-gray-800 text-2xl sm:text-3xl'>
            Suggested Food Items
          </h1>
          <FilterBar onFilterChange={handleFilterChange} currentFilters={filters} />
        </div>

        {isLatestItemsView && (
          <div className='w-full'>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${isDark ? 'bg-[#16213e] text-orange-200 border-orange-300/30' : 'bg-orange-50 text-[#ff4d2d] border-orange-200'}`}>
              Showing: Latest Items
            </span>
          </div>
        )}

        {updatedItemsList?.length === 0 ? (
          <div className='w-full py-10 text-center'>
            <p className='text-gray-500 text-lg'>No items match your filters</p>
            <button
              className='mt-2 text-[#ff4d2d] hover:underline'
              onClick={() => handleFilterChange({ foodType: 'all', minPrice: 0, maxPrice: 1000, minRating: 0, sortBy: 'default' })}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className='w-full h-auto flex flex-wrap gap-[20px] justify-center'>
            {updatedItemsList?.map((item, index) => (
              <FoodCard key={index} data={item} />
            ))}
          </div>
        )}

      </div>


    </div>
  )
}

export default UserDashboard
