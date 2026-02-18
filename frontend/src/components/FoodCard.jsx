import React, { useState } from 'react'
import { FaLeaf } from "react-icons/fa";
import { FaDrumstickBite } from "react-icons/fa";
import { FaStar } from "react-icons/fa";
import { FaRegStar } from "react-icons/fa6";
import { FaMinus } from "react-icons/fa";
import { FaPlus } from "react-icons/fa";
import { FaShoppingCart } from "react-icons/fa";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import { useDispatch, useSelector } from 'react-redux';
import { addToCart, toggleFavoriteItem } from '../redux/userSlice';
import { useToast } from '../context/ToastContext';
import axios from 'axios';
import { serverUrl } from '../App';

const fallbackFoodImages = [
    "https://images.pexels.com/photos/70497/pexels-photo-70497.jpeg?auto=compress&cs=tinysrgb&w=900",
    "https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg?auto=compress&cs=tinysrgb&w=900",
    "https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=900",
    "https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=900",
    "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=900",
    "https://images.pexels.com/photos/1639562/pexels-photo-1639562.jpeg?auto=compress&cs=tinysrgb&w=900"
]

const isNonFoodImageUrl = (url = "") =>
    /cat|dog|kitten|puppy|animal|pet|loremflickr|placekitten|placebear/i.test(url);

function FoodCard({ data }) {
    const [quantity, setQuantity] = useState(0)
    const [favoriteLoading, setFavoriteLoading] = useState(false)
    const dispatch = useDispatch()
    const { cartItems, favorites, userData } = useSelector(state => state.user)
    const toast = useToast()
    const isInCart = cartItems.some(i => i.id == data._id)
    const isFavorite = favorites.includes(data._id)
    const fallbackItemImage = fallbackFoodImages[
        ([...(data?.name || "food")].reduce((acc, char) => acc + char.charCodeAt(0), 0) % fallbackFoodImages.length)
    ]
    const resolvedItemImage = !data?.image || isNonFoodImageUrl(data.image) ? fallbackItemImage : data.image

    const renderStars = (rating) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            stars.push(
                (i <= rating) ? (
                    <FaStar key={i} className='text-yellow-500 text-sm sm:text-lg' />
                ) : (
                    <FaRegStar key={i} className='text-yellow-500 text-sm sm:text-lg' />
                )
            )
        }
        return stars
    }

    const handleIncrease = () => {
        const newQty = quantity + 1
        setQuantity(newQty)
    }

    const handleDecrease = () => {
        if (quantity > 0) {
            const newQty = quantity - 1
            setQuantity(newQty)
        }
    }

    const handleAddToCart = () => {
        if (quantity === 0) {
            toast.warning("Please select quantity first")
            return
        }

        dispatch(addToCart({
            id: data._id,
            name: data.name,
            price: data.price,
            image: data.image,
            shop: data.shop,
            quantity,
            foodType: data.foodType
        }))

        toast.success(`${data.name} added to cart!`)
        setQuantity(0)
    }

    const handleToggleFavorite = async () => {
        if (!userData) {
            toast.warning("Please sign in to add favorites")
            return
        }

        setFavoriteLoading(true)
        try {
            await axios.post(`${serverUrl}/api/favorite/toggle/${data._id}`, {}, { withCredentials: true })
            dispatch(toggleFavoriteItem(data._id))
            toast.success(isFavorite ? "Removed from favorites" : "Added to favorites ❤️")
        } catch (error) {
            toast.error("Failed to update favorites")
            console.log(error)
        } finally {
            setFavoriteLoading(false)
        }
    }

    return (
        <div className='group w-full sm:w-[250px] rounded-2xl border-2 border-[#ff4d2d] bg-white shadow-md overflow-hidden hover:shadow-2xl hover:-translate-y-1 hover:border-[#ff6b50] transition-all duration-300 flex flex-col'>
            <div className='relative w-full h-[150px] sm:h-[170px] flex justify-center items-center bg-white overflow-hidden'>
                {/* Image - behind buttons */}
                <img
                    src={resolvedItemImage}
                    alt={data.name}
                    loading='lazy'
                    className='w-full h-full object-cover transition-transform duration-500 group-hover:scale-110'
                    onError={(event) => {
                        if (event.currentTarget.src === fallbackItemImage) {
                            return
                        }
                        event.currentTarget.src = fallbackItemImage
                    }}
                />

                {/* Food type indicator - on top */}
                <div className='absolute top-3 right-3 bg-white rounded-full p-1.5 shadow-md z-10'>
                    {data.foodType == "veg" ?
                        <FaLeaf className='text-green-600 text-base sm:text-lg' /> :
                        <FaDrumstickBite className='text-red-600 text-base sm:text-lg' />
                    }
                </div>

                {/* Favorite heart button - on top with pointer events */}
                <button
                    className='absolute top-3 left-3 bg-white rounded-full p-2 shadow-md z-10 hover:scale-110 hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer'
                    onClick={(e) => {
                        e.stopPropagation()
                        handleToggleFavorite()
                    }}
                    disabled={favoriteLoading}
                >
                    {isFavorite ? (
                        <FaHeart className='text-red-500 text-base sm:text-lg' />
                    ) : (
                        <FaRegHeart className='text-gray-400 hover:text-red-400 text-base sm:text-lg transition-colors' />
                    )}
                </button>
            </div>

            <div className="flex-1 flex flex-col p-3 sm:p-4 transition-colors duration-300 group-hover:bg-orange-50/40">
                <h1 className='font-semibold text-gray-900 text-sm sm:text-base truncate transition-colors duration-300 group-hover:text-[#ff4d2d]'>{data.name}</h1>
                <div className='flex items-center gap-1 mt-1'>
                    {renderStars(data.rating?.average || 0)}
                    <span className='text-xs text-gray-500'>
                        ({data.rating?.count || 0})
                    </span>
                </div>
            </div>

            <div className='flex items-center justify-between mt-auto p-3'>
                <span className='font-bold text-gray-900 text-base sm:text-lg'>
                    Rs {data.price}
                </span>

                <div className='flex items-center border rounded-full overflow-hidden shadow-sm'>
                    <button className='px-2 py-1 hover:bg-gray-100 transition active:bg-gray-200' onClick={handleDecrease}>
                        <FaMinus size={12} />
                    </button>
                    <span className='px-1 min-w-[20px] text-center text-sm'>{quantity}</span>
                    <button className='px-2 py-1 hover:bg-gray-100 transition active:bg-gray-200' onClick={handleIncrease}>
                        <FaPlus size={12} />
                    </button>
                    <button
                        className={`${isInCart ? "bg-gray-800" : "bg-[#ff4d2d]"} text-white px-3 py-2 transition-colors active:opacity-80`}
                        onClick={handleAddToCart}
                    >
                        <FaShoppingCart size={16} />
                    </button>
                </div>
            </div>
        </div>
    )
}

export default FoodCard


