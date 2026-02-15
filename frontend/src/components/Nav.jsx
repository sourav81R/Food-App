import React, { useEffect, useRef, useState } from 'react'
import { FaLocationDot } from "react-icons/fa6";
import { IoIosSearch } from "react-icons/io";
import { FiShoppingCart } from "react-icons/fi";
import { useDispatch, useSelector } from 'react-redux';
import { RxCross2 } from "react-icons/rx";
import axios from 'axios';
import { serverUrl } from '../App';
import { setSearchItems, setUserData } from '../redux/userSlice';
import { FaPlus } from "react-icons/fa6";
import { TbReceipt2 } from "react-icons/tb";
import { FaHeart, FaSun, FaMoon } from "react-icons/fa";
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { signOut as firebaseSignOut } from "firebase/auth";
import { auth } from "../config/firebase";

function Nav() {
    const { userData, currentCity, cartItems } = useSelector(state => state.user)
    const { myShopData } = useSelector(state => state.owner)
    const [showInfo, setShowInfo] = useState(false)
    const [showSearch, setShowSearch] = useState(false)
    const [query, setQuery] = useState("")
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const location = useLocation()
    const menuRef = useRef(null)
    const { isDark, toggleTheme } = useTheme()

    if (!userData) return null

    const roleLabel =
        userData.role == "deliveryBoy"
            ? "Delivery Partner"
            : userData.role.charAt(0).toUpperCase() + userData.role.slice(1)

    const handleLogOut = async () => {
        try {
            await Promise.allSettled([
                axios.get(`${serverUrl}/api/auth/signout`, { withCredentials: true }),
                firebaseSignOut(auth)
            ])
            dispatch(setUserData(null))
            sessionStorage.removeItem('hasSeenWelcomeCelebration')
        } catch (error) {
            console.log(error)
        }
    }

    const handleSearchItems = async () => {
        try {
            const result = await axios.get(`${serverUrl}/api/item/search-items?query=${query}&city=${currentCity}`, { withCredentials: true })
            dispatch(setSearchItems(result.data))
        } catch (error) {
            console.log(error)
        }
    }

    useEffect(() => {
        if (query) {
            handleSearchItems()
        } else {
            dispatch(setSearchItems(null))
        }

    }, [query])

    useEffect(() => {
        setShowInfo(false)
    }, [location.pathname])

    useEffect(() => {
        if (!showInfo) return

        const handleOutsideClick = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowInfo(false)
            }
        }

        const handleEsc = (event) => {
            if (event.key === "Escape") {
                setShowInfo(false)
            }
        }

        document.addEventListener("mousedown", handleOutsideClick)
        document.addEventListener("keydown", handleEsc)
        return () => {
            document.removeEventListener("mousedown", handleOutsideClick)
            document.removeEventListener("keydown", handleEsc)
        }
    }, [showInfo])

    return (
        <div className={`w-full h-[80px] flex items-center justify-between md:justify-center gap-[30px] px-[20px] fixed top-0 left-0 z-[9999] border-none outline-none transition-colors duration-300 ${isDark ? 'bg-[#1a1a2e]' : 'bg-[#fff9f6]'} overflow-visible`}>

            {/* Mobile Search Bar */}
            {showSearch && userData.role == "user" && (
                <div className={`w-[90%] h-[70px] rounded-2xl items-center gap-[15px] flex fixed top-[90px] left-[5%] md:hidden transition-all duration-300 ${isDark ? 'bg-[#16213e] border border-[#374151]' : 'bg-white/80 backdrop-blur-lg border border-white/20'} shadow-2xl`}>
                    <div className={`flex items-center w-[35%] overflow-hidden gap-[10px] px-[15px] border-r-2 ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                        <FaLocationDot size={22} className="text-[#ff4d2d] flex-shrink-0" />
                        <div className={`w-[80%] truncate text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{currentCity}</div>
                    </div>
                    <div className='flex-1 flex items-center gap-[10px] pr-[15px]'>
                        <IoIosSearch size={24} className='text-[#ff4d2d] flex-shrink-0' />
                        <input
                            id="mobile-search-input"
                            name="search"
                            type="text"
                            placeholder='Search delicious food...'
                            className={`w-full py-2 text-sm outline-none bg-transparent placeholder:text-gray-400 ${isDark ? 'text-white' : 'text-gray-700'}`}
                            onChange={(e) => setQuery(e.target.value)}
                            value={query}
                            aria-label='Search dishes and restaurants'
                        />
                    </div>
                </div>
            )}

            {/* Logo */}
            <h1 className='text-3xl font-bold mb-2 italic text-[#ff4d2d] drop-shadow-sm'>PetPooja</h1>

            {/* Desktop Search Bar - Enhanced */}
            {userData.role == "user" && (
                <div className={`md:w-[55%] lg:w-[45%] h-[56px] rounded-2xl items-center hidden md:flex transition-all duration-300 overflow-hidden group ${isDark ? 'bg-[#16213e] border border-[#374151] hover:border-[#ff4d2d]/50' : 'bg-white/90 backdrop-blur-lg border border-gray-100 hover:border-[#ff4d2d]/30'} shadow-lg hover:shadow-xl hover:shadow-[#ff4d2d]/10`}>
                    {/* Location Section */}
                    <div className={`flex items-center min-w-[140px] max-w-[200px] gap-[12px] px-[16px] h-full border-r ${isDark ? 'border-gray-600 hover:bg-[#0f3460]' : 'border-gray-200 hover:bg-gray-50'} transition-colors cursor-pointer`}>
                        <div className='w-10 h-10 rounded-full bg-[#ff4d2d]/10 flex items-center justify-center flex-shrink-0'>
                            <FaLocationDot size={18} className="text-[#ff4d2d]" />
                        </div>
                        <div className='flex flex-col overflow-hidden'>
                            <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Deliver to</span>
                            <span className={`text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-gray-800'}`}>{currentCity}</span>
                        </div>
                    </div>

                    {/* Search Section */}
                    <div className='flex-1 flex items-center gap-[12px] px-[16px] h-full'>
                        <IoIosSearch size={22} className='text-[#ff4d2d] flex-shrink-0 group-hover:scale-110 transition-transform' />
                        <input
                            id="desktop-search-input"
                            name="search"
                            type="text"
                            placeholder='Search for dishes, restaurants...'
                            className={`w-full py-2 text-sm outline-none bg-transparent font-medium placeholder:font-normal ${isDark ? 'text-white placeholder:text-gray-500' : 'text-gray-700 placeholder:text-gray-400'}`}
                            onChange={(e) => setQuery(e.target.value)}
                            value={query}
                            aria-label='Search dishes and restaurants'
                        />
                        {query && (
                            <button
                                className={`p-1.5 rounded-full hover:bg-gray-200 transition-colors ${isDark ? 'hover:bg-gray-700' : ''}`}
                                onClick={() => setQuery('')}
                            >
                                <RxCross2 size={16} className={isDark ? 'text-gray-400' : 'text-gray-500'} />
                            </button>
                        )}
                    </div>
                </div>
            )}

            <div className='flex items-center gap-4'>
                {userData.role == "user" && (showSearch ? <RxCross2 size={25} className='text-[#ff4d2d] md:hidden' onClick={() => setShowSearch(false)} /> : <IoIosSearch size={25} className='text-[#ff4d2d] md:hidden' onClick={() => setShowSearch(true)} />)
                }
                {userData.role == "owner" ? <>
                    {myShopData && <> <button className='hidden md:flex items-center gap-1 p-2 cursor-pointer rounded-full bg-[#ff4d2d]/10 text-[#ff4d2d]' onClick={() => navigate("/add-item")}>
                        <FaPlus size={20} />
                        <span>Add Food Item</span>
                    </button>
                        <button className='md:hidden flex items-center  p-2 cursor-pointer rounded-full bg-[#ff4d2d]/10 text-[#ff4d2d]' onClick={() => navigate("/add-item")}>
                            <FaPlus size={20} />
                        </button></>}

                    <div className='hidden md:flex items-center gap-2 cursor-pointer relative px-3 py-1 rounded-lg bg-[#ff4d2d]/10 text-[#ff4d2d] font-medium' onClick={() => navigate("/my-orders")}>
                        <TbReceipt2 size={20} />
                        <span>My Orders</span>

                    </div>
                    <div className='md:hidden flex items-center gap-2 cursor-pointer relative px-3 py-1 rounded-lg bg-[#ff4d2d]/10 text-[#ff4d2d] font-medium' onClick={() => navigate("/my-orders")}>
                        <TbReceipt2 size={20} />

                    </div>
                </> : (
                    <>
                        {userData.role == "user" && <div className='relative cursor-pointer' onClick={() => navigate("/cart")}>
                            <FiShoppingCart size={25} className='text-[#ff4d2d]' />
                            <span className='absolute right-[-9px] top-[-12px] text-[#ff4d2d]'>{cartItems.length}</span>
                        </div>}

                        {/* Favorites Link */}
                        {userData.role == "user" && <div className='cursor-pointer p-2 rounded-full hover:bg-[#ff4d2d]/10 transition' onClick={() => navigate("/favorites")}>
                            <FaHeart size={22} className='text-[#ff4d2d]' />
                        </div>}



                        {userData.role == "user" && (
                            <button className='hidden md:block px-3 py-1 rounded-lg bg-[#ff4d2d]/10 text-[#ff4d2d] text-sm font-medium' onClick={() => navigate("/my-orders")}>
                                My Orders
                            </button>
                        )}

                        {userData.role == "admin" && (
                            <button className='hidden md:block px-3 py-1 rounded-lg bg-[#ff4d2d]/10 text-[#ff4d2d] text-sm font-medium' onClick={() => navigate("/admin")}>
                                Admin Panel
                            </button>
                        )}

                        {/* Theme Toggle */}
                        <button
                            className='p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition'
                            onClick={toggleTheme}
                            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                        >
                            {isDark ? (
                                <FaSun size={20} className='text-yellow-400' />
                            ) : (
                                <FaMoon size={20} className='text-gray-600' />
                            )}
                        </button>
                    </>
                )}
                <div className='relative' ref={menuRef}>
                    <div className='w-[40px] h-[40px] rounded-full flex items-center justify-center bg-[#ff4d2d] text-white text-[18px] shadow-xl font-semibold cursor-pointer select-none' onClick={() => setShowInfo(prev => !prev)}>
                        {userData?.fullName?.slice(0, 1)}
                    </div>
                    {showInfo && (
                        <div className={`absolute top-[52px] right-0 w-[240px] rounded-xl p-[14px] flex flex-col gap-[8px] z-[10000] border ${isDark ? 'bg-[#16213e] border-[#374151] text-white shadow-black/20' : 'bg-white border-gray-100 text-black shadow-2xl'}`}>
                            <div className='text-[16px] font-semibold truncate'>{userData.fullName}</div>
                            <div className={`text-[12px] ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>{roleLabel}</div>

                            <button
                                className={`text-left text-sm font-medium py-1.5 px-2 rounded-md transition ${isDark ? 'hover:bg-[#0f3460]' : 'hover:bg-gray-100'}`}
                                onClick={() => navigate("/profile")}
                            >
                                View Profile
                            </button>

                            {(userData.role == "user" || userData.role == "owner") && (
                                <button
                                    className={`text-left text-sm font-medium py-1.5 px-2 rounded-md transition ${isDark ? 'hover:bg-[#0f3460]' : 'hover:bg-gray-100'}`}
                                    onClick={() => navigate("/my-orders")}
                                >
                                    My Orders
                                </button>
                            )}

                            {userData.role == "admin" && (
                                <button
                                    className={`text-left text-sm font-medium py-1.5 px-2 rounded-md transition ${isDark ? 'hover:bg-[#0f3460]' : 'hover:bg-gray-100'}`}
                                    onClick={() => navigate("/admin")}
                                >
                                    Admin Panel
                                </button>
                            )}

                            {userData.role == "owner" && (
                                <button
                                    className={`text-left text-sm font-medium py-1.5 px-2 rounded-md transition ${isDark ? 'hover:bg-[#0f3460]' : 'hover:bg-gray-100'}`}
                                    onClick={() => navigate("/create-edit-shop")}
                                >
                                    {myShopData ? "Manage Shop" : "Create Shop"}
                                </button>
                            )}

                            <button className='text-left text-sm font-semibold py-1.5 px-2 rounded-md transition text-[#ff4d2d] hover:bg-[#ff4d2d]/10' onClick={handleLogOut}>
                                Log Out
                            </button>
                        </div>
                    )}
                </div>

            </div>
        </div>
    )
}


export default Nav
