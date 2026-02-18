import React, { useEffect, useMemo, useState } from 'react'
import { FaSun, FaCloudSun, FaMoon, FaClock, FaUtensils, FaMugHot } from 'react-icons/fa'
import { useTheme } from '../context/ThemeContext'
import FoodCard from './FoodCard'

const mealConfig = {
    breakfast: {
        name: 'Breakfast',
        icon: FaSun,
        greeting: 'Good Morning!',
        description: 'Start your day with these delicious breakfast options',
        color: 'from-orange-400 to-yellow-300',
        categories: ['South Indian', 'Snacks'],
        keywords: ['dosa', 'idli', 'poha', 'paratha', 'upma', 'samosa', 'chai', 'lassi']
    },
    lunch: {
        name: 'Lunch',
        icon: FaCloudSun,
        greeting: 'Good Afternoon!',
        description: 'Satisfy your hunger with hearty lunch meals',
        color: 'from-amber-500 to-orange-400',
        categories: ['Main Course', 'Chinese', 'Pizza'],
        keywords: ['biryani', 'curry', 'rice', 'paneer', 'chicken', 'thali', 'roti', 'naan']
    },
    teaBreak: {
        name: 'Tea Break',
        icon: FaMugHot,
        greeting: 'Tea Break Time!',
        description: 'Take a break with tea-time snacks',
        color: 'from-orange-500 to-amber-400',
        categories: ['Snacks', 'Fast Food', 'Desserts'],
        keywords: ['tea', 'chai', 'coffee', 'pakora', 'samosa', 'sandwich', 'biscuit', 'toast']
    },
    dinner: {
        name: 'Evening',
        icon: FaMoon,
        greeting: 'Good Evening!',
        description: 'Enjoy comforting evening dishes',
        color: 'from-purple-500 to-indigo-500',
        categories: ['Main Course', 'Chinese'],
        keywords: ['biryani', 'butter chicken', 'paneer', 'dal', 'naan', 'rogan josh', 'manchurian']
    },
    snacks: {
        name: 'Snacks',
        icon: FaUtensils,
        greeting: 'Snack Time!',
        description: 'Quick bites for your cravings',
        color: 'from-rose-500 to-orange-500',
        categories: ['Snacks', 'Fast Food', 'Desserts'],
        keywords: ['pizza', 'noodles', 'fried rice', 'ice cream', 'samosa', 'burger', 'sandwich', 'fries']
    }
}

const mealOptions = ['breakfast', 'lunch', 'teaBreak', 'dinner', 'snacks']

const getMealKeyByHour = (hour) => {
    if (hour >= 6 && hour < 12) return 'breakfast'
    if (hour >= 12 && hour < 15) return 'lunch'
    if (hour >= 15 && hour < 18) return 'teaBreak'
    if (hour >= 18 && hour < 24) return 'dinner'
    return 'snacks' // 12:00 AM to 5:59 AM
}

function MealTimeSection({ items }) {
    const [now, setNow] = useState(new Date())
    const [selectedMeal, setSelectedMeal] = useState('auto')
    const [filteredItems, setFilteredItems] = useState([])
    const { isDark } = useTheme()

    const autoMealKey = useMemo(() => getMealKeyByHour(now.getHours()), [now])
    const currentMealKey = selectedMeal === 'auto' ? autoMealKey : selectedMeal
    const currentMeal = mealConfig[currentMealKey]

    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 60000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        if (!currentMeal || !items || items.length === 0) {
            setFilteredItems([])
            return
        }

        const filtered = items.filter((item) => {
            const categoryMatch = currentMeal.categories.some(
                (cat) => item.category?.toLowerCase() === cat.toLowerCase()
            )

            const keywordMatch = currentMeal.keywords.some(
                (keyword) => item.name?.toLowerCase().includes(keyword.toLowerCase())
            )

            return categoryMatch || keywordMatch
        })

        const shuffled = [...filtered].sort(() => 0.5 - Math.random())
        setFilteredItems(shuffled.slice(0, 8))
    }, [currentMeal, items])

    if (!currentMeal || !items || items.length === 0) return null

    const MealIcon = currentMeal.icon

    return (
        <div className={`w-full max-w-6xl mx-auto p-4 sm:p-5 rounded-3xl shadow-xl mb-2 transition-colors ${isDark ? 'bg-[#16213e]' : 'bg-white'}`}>
            <div className={`bg-gradient-to-r ${currentMeal.color} rounded-2xl p-4 sm:p-6 mb-6 text-white`}>
                <div className='flex items-center gap-3 mb-2'>
                    <div className='p-3 bg-white/20 rounded-full backdrop-blur-sm'>
                        <MealIcon size={24} />
                    </div>
                    <div>
                        <h2 className='text-2xl sm:text-3xl font-bold'>{currentMeal.greeting}</h2>
                        <p className='text-sm sm:text-base opacity-90'>{currentMeal.description}</p>
                    </div>
                </div>

                <div className='flex items-center gap-2 mt-4 text-sm opacity-80'>
                    <FaClock size={14} />
                    <span>{now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                    <span className='mx-2'>|</span>
                    <span className='bg-white/20 px-3 py-1 rounded-full text-xs font-medium'>
                        {currentMeal.name}
                    </span>
                </div>

                <div className='mt-4 flex flex-wrap gap-2'>
                    <button
                        className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition ${selectedMeal === 'auto' ? 'bg-white text-gray-900' : 'bg-white/20 text-white hover:bg-white/30'}`}
                        onClick={() => setSelectedMeal('auto')}
                    >
                        Auto
                    </button>
                    {mealOptions.map((mealKey) => (
                        <button
                            key={mealKey}
                            className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition ${selectedMeal === mealKey ? 'bg-white text-gray-900' : 'bg-white/20 text-white hover:bg-white/30'}`}
                            onClick={() => setSelectedMeal(mealKey)}
                        >
                            {mealConfig[mealKey].name}
                        </button>
                    ))}
                </div>
            </div>

            {filteredItems.length === 0 ? (
                <p className={`text-center py-8 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    No items available for {currentMeal.name.toLowerCase()} right now.
                </p>
            ) : (
                <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
                    {filteredItems.map((item) => (
                        <FoodCard key={item._id} data={item} />
                    ))}
                </div>
            )}
        </div>
    )
}

export default MealTimeSection
