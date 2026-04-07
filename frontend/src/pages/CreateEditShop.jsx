import React, { useEffect, useMemo, useState } from 'react'
import { IoIosArrowRoundBack } from "react-icons/io";
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FaCamera, FaMapMarkerAlt, FaPlus, FaRegClock, FaStore, FaUtensils } from "react-icons/fa";
import axios from 'axios';
import { serverUrl } from '../App';
import { setMyShopData } from '../redux/ownerSlice';
import { ClipLoader } from 'react-spinners';
import { useTheme } from '../context/ThemeContext';

function CreateEditShop() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const { myShopData, myShops } = useSelector(state => state.owner)
    const { currentCity,currentState,currentAddress } = useSelector(state => state.user)
    const { location } = useSelector(state => state.map)
    const requestedShopId = searchParams.get("shopId")
    const isCreateMode = searchParams.get("mode") === "create"
    const shopToEdit = useMemo(() => {
        if (requestedShopId) {
            return myShops.find((shop) => String(shop?._id) === String(requestedShopId)) || null
        }

        return isCreateMode ? null : myShopData
    }, [requestedShopId, isCreateMode, myShops, myShopData])
    const isEditing = Boolean(shopToEdit?._id)

    const [name,setName]=useState("")
    const [address,setAddress]=useState("")
    const [city,setCity]=useState("")
    const [state,setState]=useState("")
    const [openingTime,setOpeningTime]=useState("08:00")
    const [closingTime,setClosingTime]=useState("00:45")
    const [isOpen,setIsOpen]=useState(true)
    const [frontendImage,setFrontendImage]=useState(null)
    const [backendImage,setBackendImage]=useState(null)
    const [loading,setLoading]=useState(false)
    const dispatch=useDispatch()
    const { isDark } = useTheme()

    useEffect(() => {
        setName(shopToEdit?.name || "")
        setAddress(shopToEdit?.address || currentAddress || "")
        setCity(shopToEdit?.city || currentCity || "")
        setState(shopToEdit?.state || currentState || "")
        setOpeningTime(shopToEdit?.openingTime || "08:00")
        setClosingTime(shopToEdit?.closingTime || "00:45")
        setIsOpen(shopToEdit?.isOpen ?? true)
        setFrontendImage(shopToEdit?.image || null)
        setBackendImage(null)
    }, [shopToEdit, currentAddress, currentCity, currentState])

    const handleImage=(e)=>{
        const file=e.target.files[0]
        if(!file){
            return
        }
        setBackendImage(file)
        setFrontendImage(URL.createObjectURL(file))
    }

    const handleSubmit=async (e)=>{
        e.preventDefault()
        setLoading(true)
        try {
           const formData=new FormData()
           if(isEditing){
            formData.append("shopId", shopToEdit._id)
           }
           formData.append("name",name) 
           formData.append("city",city) 
           formData.append("state",state) 
           formData.append("address",address) 
           formData.append("openingTime",openingTime)
           formData.append("closingTime",closingTime)
           formData.append("isOpen",String(isOpen))
           if(Number.isFinite(Number(location?.lat)) && Number.isFinite(Number(location?.lon))){
            formData.append("latitude", String(location.lat))
            formData.append("longitude", String(location.lon))
           }
           if(backendImage){
            formData.append("image",backendImage)
           }
           const result=await axios.post(`${serverUrl}/api/shop/create-edit`,formData,{withCredentials:true})
           dispatch(setMyShopData(result.data))
          setLoading(false)
          navigate("/")
        } catch (error) {
            console.log(error)
            setLoading(false)
        }
    }

    const activeShopId = String(shopToEdit?._id || myShopData?._id || "")
    const locationReady = Number.isFinite(Number(location?.lat)) && Number.isFinite(Number(location?.lon))
    const inputClass = `w-full rounded-2xl border px-4 py-3.5 text-sm outline-none transition focus:ring-2 focus:ring-[#ff6b43] ${isDark ? 'border-white/10 bg-white/5 text-white placeholder:text-slate-400' : 'border-orange-100 bg-white/80 text-slate-900 placeholder:text-slate-400'}`
    const sectionCardClass = `rounded-[30px] border backdrop-blur-xl ${isDark ? 'border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(15,23,42,0.78))] text-white shadow-[0_30px_90px_rgba(2,6,23,0.45)]' : 'border-white/70 bg-[rgba(255,255,255,0.82)] text-slate-900 shadow-[0_30px_90px_rgba(15,23,42,0.12)]'}`

    return (
        <div className={`relative min-h-screen overflow-hidden px-3 pb-10 pt-4 sm:px-6 sm:pt-6 ${isDark ? 'bg-[linear-gradient(180deg,#07111f_0%,#0b1629_48%,#08111d_100%)]' : 'bg-[radial-gradient(circle_at_top_left,_rgba(255,133,92,0.16),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(255,186,150,0.18),_transparent_28%),linear-gradient(180deg,#fff8f3_0%,#fffdfb_44%,#fff7ef_100%)]'}`}>
            <div className='pointer-events-none absolute inset-0 overflow-hidden'>
                <div className={`absolute -left-16 top-12 h-56 w-56 rounded-full blur-3xl ${isDark ? 'bg-[#ff6b43]/14' : 'bg-[#ff8f6b]/22'}`} />
                <div className={`absolute -right-12 bottom-12 h-64 w-64 rounded-full blur-3xl ${isDark ? 'bg-[#f59e0b]/10' : 'bg-[#ffd3a5]/28'}`} />
            </div>

            <button
                className={`relative z-10 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${isDark ? 'border-white/10 bg-white/5 text-white hover:bg-white/10' : 'border-orange-200 bg-white/85 text-[#ff4d2d] hover:bg-orange-50'}`}
                onClick={() => navigate("/")}
            >
                <IoIosArrowRoundBack size={24} />
                Back to Dashboard
            </button>

            <div className='relative z-10 mx-auto mt-5 grid max-w-7xl gap-6 xl:grid-cols-[1.05fr_0.95fr]'>
                <section className={`${sectionCardClass} overflow-hidden p-6 sm:p-8`}>
                    <div className={`absolute inset-x-0 top-0 h-40 ${isDark ? 'bg-[radial-gradient(circle_at_top_left,_rgba(255,120,82,0.18),_transparent_55%)]' : 'bg-[radial-gradient(circle_at_top_left,_rgba(255,120,82,0.24),_transparent_55%)]'}`} />
                    <div className='relative'>
                        <div className='inline-flex items-center gap-2 rounded-full bg-[#ff6b43]/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ff6b43]'>
                            <FaStore />
                            Storefront Studio
                        </div>

                        <div className='mt-6 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between'>
                            <div className='max-w-2xl'>
                                <h1 className={`text-4xl font-black leading-tight sm:text-5xl ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                    {isEditing ? `Refresh ${shopToEdit?.name || 'your shop'}` : 'Launch a fresh storefront'}
                                </h1>
                                <p className={`mt-4 max-w-xl text-base leading-7 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
                                    Shape a storefront that looks polished from the first click. Add the essentials, set service hours, and keep each branch under one clean owner workspace.
                                </p>

                                <div className='mt-6 flex flex-wrap gap-3'>
                                    <div className={`rounded-2xl border px-4 py-3 ${isDark ? 'border-white/10 bg-white/5' : 'border-orange-100 bg-white/80'}`}>
                                        <p className='text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ff6b43]'>Portfolio Size</p>
                                        <p className={`mt-2 text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{myShops.length || 1}</p>
                                        <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Active owner storefronts</p>
                                    </div>
                                    <div className={`rounded-2xl border px-4 py-3 ${isDark ? 'border-white/10 bg-white/5' : 'border-orange-100 bg-white/80'}`}>
                                        <p className='text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ff6b43]'>Detected Location</p>
                                        <p className={`mt-2 text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{city || currentCity || 'Add city'}</p>
                                        <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{locationReady ? 'Coordinates ready to save' : 'Location sync pending'}</p>
                                    </div>
                                    <div className={`rounded-2xl border px-4 py-3 ${isDark ? 'border-white/10 bg-white/5' : 'border-orange-100 bg-white/80'}`}>
                                        <p className='text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ff6b43]'>Service Status</p>
                                        <p className={`mt-2 text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{isOpen ? 'Ready for orders' : 'Temporarily paused'}</p>
                                        <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{openingTime} to {closingTime}</p>
                                    </div>
                                </div>
                            </div>

                            <div className={`w-full max-w-sm rounded-[28px] border p-4 ${isDark ? 'border-white/10 bg-white/5' : 'border-orange-100 bg-white/75'} shadow-[0_20px_60px_rgba(15,23,42,0.08)]`}>
                                <div className='relative overflow-hidden rounded-[24px]'>
                                    {frontendImage ? (
                                        <>
                                            <img src={frontendImage} alt={name || 'Shop preview'} className='h-72 w-full object-cover' />
                                            <div className='absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent' />
                                            <div className='absolute bottom-0 left-0 right-0 p-5 text-white'>
                                                <p className='text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-200'>Preview Card</p>
                                                <h2 className='mt-2 text-2xl font-bold'>{name || 'Your next storefront'}</h2>
                                                <div className='mt-3 flex items-start gap-2 text-sm text-white/85'>
                                                    <FaMapMarkerAlt className='mt-0.5 text-orange-300' />
                                                    <span>{address || currentAddress || 'Your shop address will appear here'}</span>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className={`flex h-72 flex-col justify-between p-5 ${isDark ? 'bg-[linear-gradient(135deg,#1b2942,#0f172a)] text-white' : 'bg-[linear-gradient(135deg,#ffecd9,#fff7f1)] text-slate-900'}`}>
                                            <div className='flex items-center justify-between'>
                                                <div className='rounded-full bg-[#ff6b43]/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ff6b43]'>
                                                    Cover Preview
                                                </div>
                                                <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ff6b43] text-white shadow-lg shadow-orange-300'>
                                                    <FaUtensils size={18} />
                                                </div>
                                            </div>
                                            <div>
                                                <h2 className='text-3xl font-black'>{name || 'Add your hero image'}</h2>
                                                <p className={`mt-3 text-sm leading-6 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                                    Upload a strong cover photo so your storefront feels memorable before customers even open the menu.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {myShops.length > 0 && (
                            <div className='mt-8'>
                                <p className='text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ff6b43]'>Switch Shops</p>
                                <div className='mt-3 flex flex-wrap gap-3'>
                                    {myShops.map((shop) => {
                                        const isActive = String(shop?._id) === activeShopId

                                        return (
                                            <button
                                                key={shop._id}
                                                type="button"
                                                className={`rounded-2xl border px-4 py-3 text-left transition ${isActive ? 'border-[#ff6b43] bg-[#ff4d2d] text-white shadow-lg shadow-orange-300/30' : isDark ? 'border-white/10 bg-white/5 text-slate-100 hover:bg-white/10' : 'border-orange-100 bg-white/75 text-slate-700 hover:border-orange-200 hover:bg-orange-50'}`}
                                                onClick={() => navigate(`/create-edit-shop?shopId=${shop._id}`)}
                                            >
                                                <p className='text-sm font-semibold'>{shop.name}</p>
                                                <p className={`mt-1 text-xs ${isActive ? 'text-white/80' : isDark ? 'text-slate-400' : 'text-slate-500'}`}>{shop.city}, {shop.state}</p>
                                            </button>
                                        )
                                    })}
                                    <button
                                        type="button"
                                        className={`inline-flex items-center gap-2 rounded-2xl border border-dashed px-4 py-3 text-sm font-semibold transition ${isDark ? 'border-[#ff6b43]/60 bg-[#ff6b43]/10 text-orange-200 hover:bg-[#ff6b43]/15' : 'border-orange-300 bg-white/80 text-[#ff4d2d] hover:bg-orange-50'}`}
                                        onClick={() => navigate("/create-edit-shop?mode=create")}
                                    >
                                        <FaPlus size={12} />
                                        Add New Shop
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                <section className={`${sectionCardClass} p-6 sm:p-8`}>
                    <div className='flex items-start justify-between gap-4'>
                        <div>
                            <p className='text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ff6b43]'>Store Details</p>
                            <h2 className={`mt-2 text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{isEditing ? 'Update the branch' : 'Create your new branch'}</h2>
                            <p className={`mt-2 text-sm leading-6 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
                                Give customers a sharp first impression with a strong name, image, location, and service window.
                            </p>
                        </div>
                        <div className={`hidden rounded-2xl px-4 py-3 sm:block ${isDark ? 'bg-white/5 text-slate-200' : 'bg-orange-50 text-slate-700'}`}>
                            <p className='text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ff6b43]'>Mode</p>
                            <p className='mt-2 text-sm font-semibold'>{isEditing ? 'Editing existing shop' : 'Creating new shop'}</p>
                        </div>
                    </div>

                    <form className='mt-8 space-y-6' onSubmit={handleSubmit}>
                        <div className='space-y-3'>
                            <label htmlFor="shop-name" className={`block text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Shop Name</label>
                            <input
                                id="shop-name"
                                name="name"
                                type="text"
                                placeholder='Enter shop name'
                                className={inputClass}
                                onChange={(e)=>setName(e.target.value)}
                                value={name}
                            />
                        </div>

                        <div className='space-y-3'>
                            <div className='flex items-center justify-between gap-3'>
                                <label htmlFor="shop-image" className={`block text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Shop Cover</label>
                                <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Best with a bright storefront or food counter photo</span>
                            </div>
                            <label htmlFor="shop-image" className={`flex cursor-pointer items-center justify-between gap-4 rounded-[24px] border border-dashed px-5 py-4 transition ${isDark ? 'border-white/15 bg-white/5 hover:bg-white/10' : 'border-orange-200 bg-orange-50/70 hover:bg-orange-50'}`}>
                                <div className='flex items-center gap-4'>
                                    <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ff6b43] text-white shadow-lg shadow-orange-300/30'>
                                        <FaCamera size={18} />
                                    </div>
                                    <div>
                                        <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{backendImage?.name || 'Choose a shop image'}</p>
                                        <p className={`mt-1 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>PNG, JPG or WEBP recommended</p>
                                    </div>
                                </div>
                                <span className='rounded-full bg-[#ff6b43]/10 px-3 py-1 text-xs font-semibold text-[#ff6b43]'>Upload</span>
                            </label>
                            <input id="shop-image" name="image" type="file" accept='image/*' className='hidden' onChange={handleImage} />
                        </div>

                        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                            <div className='space-y-3'>
                                <label htmlFor="shop-city" className={`block text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>City</label>
                                <input id="shop-city" name="city" type="text" placeholder='City' className={inputClass} onChange={(e)=>setCity(e.target.value)} value={city}/>
                            </div>
                            <div className='space-y-3'>
                                <label htmlFor="shop-state" className={`block text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>State</label>
                                <input id="shop-state" name="state" type="text" placeholder='State' className={inputClass} onChange={(e)=>setState(e.target.value)} value={state}/>
                            </div>
                        </div>

                        <div className='space-y-3'>
                            <label htmlFor="shop-address" className={`block text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Address</label>
                            <div className='relative'>
                                <FaMapMarkerAlt className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-400' : 'text-slate-400'}`} />
                                <input
                                    id="shop-address"
                                    name="address"
                                    type="text"
                                    placeholder='Enter full shop address'
                                    className={`${inputClass} pl-11`}
                                    onChange={(e)=>setAddress(e.target.value)}
                                    value={address}
                                />
                            </div>
                            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                {locationReady ? 'Your current map coordinates will be saved with this storefront.' : 'Enable location for more accurate delivery coverage placement.'}
                            </p>
                        </div>

                        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                            <div className={`rounded-[24px] border p-4 ${isDark ? 'border-white/10 bg-white/5' : 'border-orange-100 bg-orange-50/60'}`}>
                                <div className='flex items-center gap-2 text-[#ff6b43]'>
                                    <FaRegClock />
                                    <p className='text-[11px] font-semibold uppercase tracking-[0.2em]'>Opening Time</p>
                                </div>
                                <input type="time" className={`${inputClass} mt-3`} value={openingTime} onChange={(e)=>setOpeningTime(e.target.value)} />
                            </div>
                            <div className={`rounded-[24px] border p-4 ${isDark ? 'border-white/10 bg-white/5' : 'border-orange-100 bg-orange-50/60'}`}>
                                <div className='flex items-center gap-2 text-[#ff6b43]'>
                                    <FaRegClock />
                                    <p className='text-[11px] font-semibold uppercase tracking-[0.2em]'>Closing Time</p>
                                </div>
                                <input type="time" className={`${inputClass} mt-3`} value={closingTime} onChange={(e)=>setClosingTime(e.target.value)} />
                            </div>
                        </div>

                        <div className={`flex items-center justify-between gap-4 rounded-[24px] border px-5 py-4 ${isDark ? 'border-white/10 bg-white/5' : 'border-orange-100 bg-white/75'}`}>
                            <div>
                                <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Accept orders right away</p>
                                <p className={`mt-1 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Turn this off if you want to finish setup before going live.</p>
                            </div>
                            <label className='relative inline-flex cursor-pointer items-center'>
                                <input type="checkbox" checked={isOpen} onChange={(e)=>setIsOpen(e.target.checked)} className='peer sr-only' />
                                <div className={`h-8 w-14 rounded-full transition ${isOpen ? 'bg-[#ff6b43]' : isDark ? 'bg-white/10' : 'bg-slate-200'} after:absolute after:left-1 after:top-1 after:h-6 after:w-6 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-6`} />
                            </label>
                        </div>

                        <button className='flex w-full items-center justify-center gap-3 rounded-[22px] bg-gradient-to-r from-[#ff6b43] to-[#ff4d2d] px-6 py-4 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(255,107,67,0.35)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-75' disabled={loading}>
                            {loading ? <ClipLoader size={18} color='white'/> : <FaStore size={15} />}
                            {loading ? 'Saving storefront...' : isEditing ? "Save Shop Changes" : "Create New Shop"}
                        </button>
                    </form>
                </section>
            </div>
        </div>
    )
}

export default CreateEditShop

