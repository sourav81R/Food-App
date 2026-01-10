import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { IoIosArrowRoundBack } from "react-icons/io"
import { FaHeart } from "react-icons/fa"
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { serverUrl } from '../App'
import FoodCard from '../components/FoodCard'
import { setFavorites } from '../redux/userSlice'
import { ClipLoader } from 'react-spinners'

function Favorites() {
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const { userData, favorites } = useSelector(state => state.user)
    const [favoriteItems, setFavoriteItems] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchFavorites = async () => {
            try {
                const result = await axios.get(`${serverUrl}/api/favorite/my-favorites`, { withCredentials: true })
                setFavoriteItems(result.data)
                // Update favorites IDs in Redux
                const favoriteIds = result.data.map(item => item._id)
                dispatch(setFavorites(favoriteIds))
            } catch (error) {
                console.log(error)
            } finally {
                setLoading(false)
            }
        }

        if (userData) {
            fetchFavorites()
        } else {
            setLoading(false)
        }
    }, [userData])

    return (
        <div className='w-screen min-h-screen bg-[#fff9f6] p-4 sm:p-6'>
            {/* Header */}
            <div className='flex items-center gap-4 mb-6'>
                <button
                    className='p-2 rounded-full hover:bg-gray-100 transition'
                    onClick={() => navigate(-1)}
                >
                    <IoIosArrowRoundBack size={30} className='text-gray-700' />
                </button>
                <div className='flex items-center gap-2'>
                    <FaHeart className='text-red-500 text-xl' />
                    <h1 className='text-xl sm:text-2xl font-bold text-gray-800'>My Favorites</h1>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className='flex justify-center items-center h-[50vh]'>
                    <ClipLoader size={40} color='#ff4d2d' />
                </div>
            ) : !userData ? (
                <div className='flex flex-col items-center justify-center h-[50vh] gap-4'>
                    <p className='text-gray-500 text-lg'>Please sign in to view your favorites</p>
                    <button
                        className='px-6 py-2 bg-[#ff4d2d] text-white rounded-lg hover:bg-[#e64323] transition'
                        onClick={() => navigate('/signin')}
                    >
                        Sign In
                    </button>
                </div>
            ) : favoriteItems.length === 0 ? (
                <div className='flex flex-col items-center justify-center h-[50vh] gap-4'>
                    <FaHeart className='text-gray-300 text-6xl' />
                    <p className='text-gray-500 text-lg'>No favorites yet</p>
                    <p className='text-gray-400 text-sm'>Tap the heart icon on food items to add them here</p>
                    <button
                        className='px-6 py-2 bg-[#ff4d2d] text-white rounded-lg hover:bg-[#e64323] transition'
                        onClick={() => navigate('/')}
                    >
                        Browse Food
                    </button>
                </div>
            ) : (
                <div className='max-w-6xl mx-auto'>
                    <p className='text-gray-600 mb-4'>{favoriteItems.length} favorite{favoriteItems.length > 1 ? 's' : ''}</p>
                    <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
                        {favoriteItems.map((item) => (
                            <FoodCard key={item._id} data={item} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

export default Favorites
