import React, { useEffect, useMemo, useRef, useState } from 'react'
import Nav from './Nav'
import { categories } from '../category'
import CategoryCard from './CategoryCard'
import { FaCircleChevronLeft } from "react-icons/fa6";
import { FaCircleChevronRight } from "react-icons/fa6";
import { useDispatch, useSelector } from 'react-redux';
import FoodCard from './FoodCard';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { serverUrl } from '../App';
import FilterBar from './FilterBar';
import MealTimeSection from './MealTimeSection';
import WelcomeCelebration from './WelcomeCelebration';
import { useTheme } from '../context/ThemeContext';
import { setRecommendedItems, setWalletBalance, setWalletTransactions } from '../redux/userSlice';
import { useToast } from '../context/ToastContext';
import { ClipLoader } from 'react-spinners';
import { loadRazorpaySdk } from '../utils/razorpay';

const TEA_BREAK_CATEGORIES = ['Snacks', 'Fast Food', 'Desserts', 'Sandwiches', 'Others']
const TEA_BREAK_KEYWORDS = ['tea', 'chai', 'coffee', 'cappuccino', 'espresso', 'latte', 'mocha', 'cold brew', 'samosa', 'toast', 'biscuit', 'sandwich']
const TEA_BREAK_SHOP_KEYWORDS = ['tea', 'chai', 'coffee', 'cafe', 'brew']

function UserDashboard() {
  const { userData, currentCity, shopInMyCity, itemsInMyCity, searchItems, recommendedItems, walletBalance, walletTransactions } = useSelector(state => state.user)
  const cateScrollRef = useRef()
  const shopScrollRef = useRef()
  const navigate = useNavigate()
  const dispatch = useDispatch()
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
  const [walletTopupAmount, setWalletTopupAmount] = useState('')
  const [walletTopupLoading, setWalletTopupLoading] = useState(false)
  const isLatestItemsView = filters.sortBy === 'latest'
  const { isDark } = useTheme()
  const toast = useToast()

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

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!userData?._id || !currentCity || (recommendedItems || []).length > 0) {
        return
      }

      try {
        const result = await axios.get(`${serverUrl}/api/user/recommendations`, {
          params: { city: currentCity },
          withCredentials: true
        })
        dispatch(setRecommendedItems(result.data))
      } catch (error) {
        console.log(error)
      }
    }

    fetchRecommendations()
  }, [userData?._id, currentCity, recommendedItems, dispatch])

  const fetchWallet = async () => {
    if (!userData?._id) {
      return
    }

    try {
      const result = await axios.get(`${serverUrl}/api/wallet/transactions`, { withCredentials: true })
      dispatch(setWalletBalance(result.data?.walletBalance || 0))
      dispatch(setWalletTransactions(result.data?.transactions || []))
    } catch (error) {
      console.log(error)
    }
  }

  useEffect(() => {
    if (walletTransactions.length > 0) {
      return
    }

    fetchWallet()
  }, [userData?._id, walletTransactions.length, dispatch])

  const handleWalletTopup = async () => {
    const amount = Number(walletTopupAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.warning('Enter a valid amount to add')
      return
    }

    setWalletTopupLoading(true)
    try {
      const { data } = await axios.post(`${serverUrl}/api/wallet/topup-order`, {
        amount
      }, { withCredentials: true })

      await loadRazorpaySdk()

      const options = {
        key: data.razorpayKeyId,
        amount: data.razorOrder.amount,
        currency: 'INR',
        name: 'Foodooza Wallet',
        description: 'Add balance to wallet',
        order_id: data.razorOrder.id,
        prefill: {
          name: data.customer?.name || userData?.fullName || '',
          email: data.customer?.email || userData?.email || '',
          contact: data.customer?.contact || userData?.mobile || ''
        },
        handler: async function (response) {
          try {
            const verifyResult = await axios.post(`${serverUrl}/api/wallet/verify-topup`, {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id
            }, { withCredentials: true })

            dispatch(setWalletBalance(verifyResult.data?.walletBalance || 0))
            dispatch(setWalletTransactions(verifyResult.data?.transactions || []))
            setWalletTopupAmount('')
            toast.success(verifyResult.data?.message || 'Wallet balance added successfully')
          } catch (error) {
            toast.error(error?.response?.data?.message || 'Wallet top-up verification failed')
          } finally {
            setWalletTopupLoading(false)
          }
        },
        modal: {
          ondismiss: function () {
            toast.info('Wallet top-up cancelled')
            setWalletTopupLoading(false)
          }
        },
        theme: {
          color: '#ff4d2d'
        }
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', function (response) {
        toast.error(`Payment failed: ${response?.error?.description || 'Unable to add balance'}`)
        setWalletTopupLoading(false)
      })
      rzp.open()
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to start wallet top-up')
      setWalletTopupLoading(false)
    }
  }


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

      {Array.isArray(searchItems) && searchItems.length > 0 && (
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

      {Array.isArray(searchItems) && searchItems.length === 0 && (
        <div className={`w-full max-w-6xl p-5 sm:p-6 shadow-md rounded-2xl mt-4 transition-colors ${isDark ? 'bg-[#16213e] text-white' : 'bg-white text-gray-800'}`}>
          <h1 className='text-2xl sm:text-3xl font-semibold'>Search Results</h1>
          <p className={`mt-3 text-sm sm:text-base ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
            No matching dishes or restaurants were found in your delivery area.
          </p>
        </div>
      )}

      {/* Meal Time Section - Breakfast/Lunch/Tea Break/Evening/Snacks based on time */}
      {itemsInMyCity && itemsInMyCity.length > 0 && (
        <MealTimeSection items={itemsInMyCity} />
      )}

      {recommendedItems?.length > 0 && (
        <div className="w-full max-w-6xl flex flex-col gap-4 items-start px-1 sm:px-[10px]">
          <div>
            <h1 className={`text-2xl sm:text-3xl font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>Recommended for you</h1>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-500'} text-sm mt-1`}>AI-picked dishes based on your recent orders and nearby menu options.</p>
          </div>
          <div className="w-full flex gap-4 overflow-x-auto pb-2">
            {recommendedItems.map((item) => (
              <div key={item._id} className="shrink-0">
                <FoodCard data={item} />
                {item.recommendationReason && (
                  <p className={`mt-2 max-w-[250px] text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    {item.recommendationReason}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="w-full max-w-6xl flex flex-col gap-4 items-start px-1 sm:px-[10px]">
        <div className={`w-full overflow-hidden rounded-[24px] border ${isDark ? 'border-[#374151] bg-[#16213e] text-white shadow-[0_16px_45px_rgba(2,6,23,0.22)]' : 'border-orange-100 bg-white shadow-[0_16px_45px_rgba(15,23,42,0.07)]'}`}>
          <div className={`${isDark ? 'bg-[radial-gradient(circle_at_top_left,_rgba(255,120,82,0.16),_transparent_40%),linear-gradient(135deg,#16213e,#101827_70%)]' : 'bg-[radial-gradient(circle_at_top_left,_rgba(255,120,82,0.20),_transparent_42%),linear-gradient(135deg,#fff6f0,#ffffff_68%)]'} p-4 sm:p-5`}>
            <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
              <div className='max-w-2xl'>
                <p className='text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ff6b43]'>Wallet Center</p>
                <h2 className={`mt-1 text-xl sm:text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Wallet</h2>
                <p className={`mt-2 text-sm leading-6 ${isDark ? 'text-gray-300' : 'text-slate-500'}`}>Add balance instantly, pay faster at checkout, and keep track of refunds and wallet activity in one polished place.</p>
              </div>

              <div className={`w-full rounded-[20px] border px-4 py-3 lg:w-auto lg:min-w-[200px] ${isDark ? 'border-white/10 bg-white/5' : 'border-orange-100 bg-white/90'} shadow-sm`}>
                <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${isDark ? 'text-gray-300' : 'text-slate-400'}`}>Current Balance</p>
                <p className='mt-1.5 text-3xl font-bold text-[#ff4d2d]'>Rs {Number(walletBalance || 0).toFixed(2)}</p>
                <p className={`mt-1.5 text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Ready for checkout, refunds, and quick re-use.</p>
              </div>
            </div>

            <div className='mt-4 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.15fr)_300px]'>
              <div className={`rounded-[20px] border p-4 ${isDark ? 'border-white/10 bg-white/5' : 'border-orange-100 bg-white/80'} backdrop-blur`}>
                <div className='flex flex-col gap-3'>
                  <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                    <div>
                      <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${isDark ? 'text-gray-300' : 'text-slate-400'}`}>Top Up Wallet</p>
                      <h3 className={`mt-1 text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Add balance in seconds</h3>
                    </div>
                    <div className={`rounded-full px-3 py-1 text-xs font-semibold ${isDark ? 'bg-white/10 text-gray-200' : 'bg-orange-50 text-[#ff4d2d]'}`}>
                      Instant credit after payment
                    </div>
                  </div>

                  <div className='flex flex-col gap-3'>
                    <input
                      type='number'
                      min='1'
                      step='1'
                      value={walletTopupAmount}
                      onChange={(e) => setWalletTopupAmount(e.target.value)}
                      placeholder='Enter amount'
                      className={`w-full rounded-[16px] border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff4d2d] ${isDark ? 'bg-[#0f3460] border-[#374151] text-white' : 'bg-white border-orange-200 text-gray-900'}`}
                    />

                    <div className='flex flex-wrap gap-2'>
                      {[100, 250, 500].map((amount) => (
                        <button
                          key={amount}
                          className={`rounded-full px-3.5 py-1.5 text-sm font-semibold border transition ${String(walletTopupAmount) === String(amount)
                            ? 'border-[#ff4d2d] bg-[#ff4d2d] text-white'
                            : isDark
                              ? 'border-[#374151] bg-[#16213e] text-white hover:border-[#ff6b43]'
                              : 'border-orange-200 bg-white text-[#ff4d2d] hover:border-[#ff4d2d]/40'
                            }`}
                          onClick={() => setWalletTopupAmount(String(amount))}
                        >
                          Rs {amount}
                        </button>
                      ))}
                    </div>

                    <div className='flex flex-col sm:flex-row sm:items-center gap-3'>
                      <button
                        className='inline-flex items-center justify-center rounded-[16px] bg-gradient-to-r from-[#ff6b43] to-[#ff4d2d] px-5 py-2.5 text-white font-semibold disabled:opacity-70 min-w-[150px] shadow-lg shadow-orange-200 transition hover:brightness-105'
                        onClick={handleWalletTopup}
                        disabled={walletTopupLoading}
                      >
                        {walletTopupLoading ? <ClipLoader size={18} color='white' /> : 'Add Balance'}
                      </button>
                      <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-slate-500'}`}>Use preset amounts for faster checkout balance top-up.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`rounded-[20px] border p-4 ${isDark ? 'border-white/10 bg-[#0f3460]/70' : 'border-orange-100 bg-orange-50/70'}`}>
                <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${isDark ? 'text-gray-300' : 'text-slate-400'}`}>Quick Overview</p>
                <div className='mt-3 grid grid-cols-1 gap-3'>
                  <div className={`rounded-[16px] px-4 py-3.5 ${isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-orange-100'} shadow-sm`}>
                    <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${isDark ? 'text-gray-400' : 'text-slate-400'}`}>Wallet Power</p>
                    <p className={`mt-2 text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Fast checkout support</p>
                    <p className={`mt-1 text-sm ${isDark ? 'text-gray-300' : 'text-slate-500'}`}>Use your balance directly during checkout without re-entering payment details.</p>
                  </div>
                  <div className={`rounded-[16px] px-4 py-3.5 ${isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-orange-100'} shadow-sm`}>
                    <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${isDark ? 'text-gray-400' : 'text-slate-400'}`}>Refund Ready</p>
                    <p className={`mt-2 text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Instant wallet returns</p>
                    <p className={`mt-1 text-sm ${isDark ? 'text-gray-300' : 'text-slate-500'}`}>Eligible cancellations can return value here so you can reuse it quickly on the next order.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className='p-4 sm:p-5'>
            <div className='flex items-center justify-between gap-3'>
              <div>
                <p className='text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ff6b43]'>Recent Activity</p>
                <h3 className={`mt-1 text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Latest wallet transactions</h3>
              </div>
              <div className={`rounded-full px-3 py-1 text-xs font-semibold ${isDark ? 'bg-white/5 text-gray-300' : 'bg-orange-50 text-slate-500'}`}>
                Showing last 3 entries
              </div>
            </div>

            <div className='mt-3 grid grid-cols-1 md:grid-cols-3 gap-3'>
              {(walletTransactions || []).slice(0, 3).map((transaction) => {
                const type = String(transaction.type || '').toLowerCase()
                const tone = type === 'refund'
                  ? isDark ? 'border-emerald-500/20 bg-emerald-500/10' : 'border-emerald-100 bg-emerald-50/70'
                  : type === 'payment'
                    ? isDark ? 'border-sky-500/20 bg-sky-500/10' : 'border-sky-100 bg-sky-50/70'
                    : isDark ? 'border-orange-500/20 bg-orange-500/10' : 'border-orange-100 bg-orange-50/70'

                return (
                  <div key={transaction._id} className={`rounded-[18px] border p-3.5 shadow-sm ${tone}`}>
                    <div className='flex items-start justify-between gap-3'>
                      <div>
                        <p className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${isDark ? 'text-gray-300' : 'text-slate-400'}`}>{transaction.type || 'Activity'}</p>
                        <p className={`mt-1.5 text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Rs {transaction.amount}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${isDark ? 'bg-white/10 text-white' : 'bg-white text-slate-600 shadow-sm'}`}>
                        {type || 'wallet'}
                      </span>
                    </div>
                    <p className={`mt-3 text-sm leading-6 ${isDark ? 'text-gray-300' : 'text-slate-500'}`}>{transaction.description || 'Wallet activity'}</p>
                  </div>
                )
              })}

              {walletTransactions.length === 0 && (
                <div className={`md:col-span-3 rounded-[22px] border p-5 text-sm ${isDark ? 'border-[#374151] bg-[#0f3460] text-gray-300' : 'border-orange-100 bg-orange-50/70 text-gray-600'}`}>
                  No wallet transactions yet. Once you add balance, pay through wallet, or receive refunds, your recent activity will appear here.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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
              <CategoryCard
                name={shop.name}
                image={shop.image}
                key={index}
                onClick={() => navigate(`/shop/${shop._id}`)}
                badgeLabel={shop?.availability?.isAvailable ? "" : shop?.availability?.label}
                subtitle={shop.city}
                disabled={!shop?.availability?.isAvailable}
              />
            ))}
          </div>
          {showRightShopButton && <button className='hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 bg-[#ff4d2d] text-white p-2 rounded-full shadow-lg hover:bg-[#e64528] z-10' onClick={() => scrollHandler(shopScrollRef, "right")}>
            <FaCircleChevronRight />
          </button>}

        </div>
      </div>

      <div className='w-full max-w-6xl flex flex-col gap-5 items-start px-1 sm:px-[10px]'>
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-3'>
          <h1 className={`text-2xl sm:text-3xl ${isDark ? 'text-white' : 'text-gray-800'}`}>
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
