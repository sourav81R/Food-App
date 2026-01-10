import React, { useState, useEffect } from 'react'
import { FaSun, FaCloudSun, FaMoon, FaClock } from 'react-icons/fa'
import { useTheme } from '../context/ThemeContext'
import FoodCard from './FoodCard'

// Meal configurations with time ranges and recommended items
const mealConfig = {
    breakfast: {
        name: 'Breakfast',
        icon: FaSun,
        startHour: 6,
        endHour: 11,
        greeting: 'Good Morning! 🌅',
        description: 'Start your day with these delicious breakfast options',
        color: 'from-orange-400 to-yellow-300',
        categories: ['South Indian', 'Snacks'],
        keywords: ['dosa', 'idli', 'poha', 'paratha', 'upma', 'samosa', 'chai', 'lassi']
    },
    lunch: {
        name: 'Lunch',
        icon: FaCloudSun,
        startHour: 11,
        endHour: 16,
        greeting: 'Good Afternoon! ☀️',
        description: 'Satisfy your hunger with hearty lunch meals',
        color: 'from-amber-500 to-orange-400',
        categories: ['Main Course', 'Chinese', 'Pizza'],
        keywords: ['biryani', 'curry', 'rice', 'paneer', 'chicken', 'thali', 'roti', 'naan']
    },
    dinner: {
        name: 'Dinner',
        icon: FaMoon,
        startHour: 16,
        endHour: 23,
        greeting: 'Good Evening! 🌙',
        description: 'End your day with these comforting dinner dishes',
        color: 'from-purple-500 to-indigo-500',
        categories: ['Main Course', 'Chinese'],
        keywords: ['biryani', 'butter chicken', 'paneer', 'dal', 'naan', 'rogan josh', 'manchurian']
    },
    lateNight: {
        name: 'Late Night Cravings',
        icon: FaMoon,
        startHour: 23,
        endHour: 6,
        greeting: 'Midnight Munchies! 🌃',
        description: 'Quick bites for your late night cravings',
        color: 'from-gray-700 to-gray-900',
        categories: ['Snacks', 'Fast Food', 'Desserts'],
        keywords: ['pizza', 'noodles', 'fried rice', 'ice cream', 'samosa']
    }
}

function MealTimeSection({ items }) {
    const [currentMeal, setCurrentMeal] = useState(null)
    const [filteredItems, setFilteredItems] = useState([])
    const { isDark } = useTheme()

    // Determine current meal based on time
    useEffect(() => {
        const updateMealTime = () => {
            const hour = new Date().getHours()

            let meal = null
            if (hour >= 6 && hour < 11) {
                meal = mealConfig.breakfast
            } else if (hour >= 11 && hour < 16) {
                meal = mealConfig.lunch
            } else if (hour >= 16 && hour < 23) {
                meal = mealConfig.dinner
            } else {
                meal = mealConfig.lateNight
            }

            setCurrentMeal(meal)
        }

        updateMealTime()
        // Update every minute
        const interval = setInterval(updateMealTime, 60000)
        return () => clearInterval(interval)
    }, [])

    // Filter items based on current meal
    useEffect(() => {
        if (!currentMeal || !items || items.length === 0) return

        const filtered = items.filter(item => {
            // Match by category
            const categoryMatch = currentMeal.categories.some(
                cat => item.category?.toLowerCase() === cat.toLowerCase()
            )

            // Match by keywords in name
            const keywordMatch = currentMeal.keywords.some(
                keyword => item.name?.toLowerCase().includes(keyword.toLowerCase())
            )

            return categoryMatch || keywordMatch
        })

        // Shuffle and take up to 8 items
        const shuffled = filtered.sort(() => 0.5 - Math.random())
        setFilteredItems(shuffled.slice(0, 8))
    }, [currentMeal, items])

    if (!currentMeal || filteredItems.length === 0) return null

    const MealIcon = currentMeal.icon

    return (
        <div className={`w-full max-w-6xl mx-auto p-4 sm:p-5 rounded-3xl shadow-xl mb-2 transition-colors ${isDark ? 'bg-[#16213e]' : 'bg-white'}`}>
            {/* Header with gradient */}
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

                {/* Current time indicator */}
                <div className='flex items-center gap-2 mt-4 text-sm opacity-80'>
                    <FaClock size={14} />
                    <span>{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                    <span className='mx-2'>•</span>
                    <span className='bg-white/20 px-3 py-1 rounded-full text-xs font-medium'>
                        {currentMeal.name} Time
                    </span>
                </div>
            </div>

            {/* Food items grid */}
            <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
                {filteredItems.map((item) => (
                    <FoodCard key={item._id} data={item} />
                ))}
            </div>
        </div>
    )
}

export default MealTimeSection
