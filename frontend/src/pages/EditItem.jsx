import React, { useEffect, useMemo, useState } from 'react'
import { IoIosArrowRoundBack } from "react-icons/io";
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { FaCamera, FaLeaf, FaPlus, FaRupeeSign, FaStore, FaUtensils } from "react-icons/fa";
import axios from 'axios';
import { serverUrl } from '../App';
import { setMyShopData, setSelectedShopId } from '../redux/ownerSlice';
import { ClipLoader } from 'react-spinners';
import { useTheme } from '../context/ThemeContext';

function EditItem() {
    const navigate = useNavigate()
    const { myShops } = useSelector(state => state.owner)
    const {itemId}=useParams()
    const [currentItem,setCurrentItem]=useState(null)
    const [name, setName] = useState("")
    const [price, setPrice] = useState(0)
    const [frontendImage, setFrontendImage] = useState("")
    const [backendImage, setBackendImage] = useState(null)
    const [category, setCategory] = useState("")
    const [foodType, setFoodType] = useState("")
    const [description, setDescription] = useState("")
   const [loading,setLoading]=useState(false)
    const categories = ["Snacks",
        "Main Course",
        "Desserts",
        "Pizza",
        "Burgers",
        "Sandwiches",
        "South Indian",
        "North Indian",
        "Chinese",
        "Fast Food",
        "Others"]
    const dispatch = useDispatch()
    const { isDark } = useTheme()
    const handleImage = (e) => {
        const file = e.target.files[0]
        if (!file) {
            return
        }
        setBackendImage(file)
        setFrontendImage(URL.createObjectURL(file))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            const formData = new FormData()
            formData.append("name",name)
            formData.append("category",category)
            formData.append("foodType", foodType)
            formData.append("price", price)
            formData.append("description", description)
            if (backendImage) {
                formData.append("image", backendImage)
            }
            const result = await axios.post(`${serverUrl}/api/item/edit-item/${itemId}`, formData, { withCredentials: true })
            dispatch(setMyShopData(result.data))
            setLoading(false)
            navigate("/")
        } catch (error) {
            console.log(error)
            setLoading(false)
        }
    }

    useEffect(()=>{
        const handleGetItemById=async () => {
            try {
                const result=await axios.get(`${serverUrl}/api/item/get-by-id/${itemId}`,{withCredentials:true}) 
                setCurrentItem(result.data)
                if(result.data?.shop){
                    dispatch(setSelectedShopId(result.data.shop))
                }

            } catch (error) {
                console.log(error)
            }
        }
        handleGetItemById()
    },[itemId, dispatch])

    useEffect(()=>{
        setName(currentItem?.name || "")
        setPrice(currentItem?.price || 0)
        setCategory(currentItem?.category || "")
        setFoodType(currentItem?.foodType || "")
        setFrontendImage(currentItem?.image || "")
        setDescription(currentItem?.description || "")
    },[currentItem])

    const activeShop = useMemo(
        () => myShops.find((shop) => String(shop?._id) === String(currentItem?.shop)) || null,
        [myShops, currentItem?.shop]
    )
    const previewTone = String(foodType || '').toLowerCase() === 'veg'
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

            <div className='relative z-10 mx-auto mt-5 grid max-w-7xl gap-6 xl:grid-cols-[1.02fr_0.98fr]'>
                <section className={`${sectionCardClass} overflow-hidden p-6 sm:p-8`}>
                    <div className={`absolute inset-x-0 top-0 h-40 ${isDark ? 'bg-[radial-gradient(circle_at_top_left,_rgba(255,120,82,0.18),_transparent_55%)]' : 'bg-[radial-gradient(circle_at_top_left,_rgba(255,120,82,0.24),_transparent_55%)]'}`} />
                    <div className='relative'>
                        <div className='inline-flex items-center gap-2 rounded-full bg-[#ff6b43]/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ff6b43]'>
                            <FaUtensils />
                            Menu Refinery
                        </div>

                        <div className='mt-6 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between'>
                            <div className='max-w-2xl'>
                                <h1 className={`text-4xl font-black leading-tight sm:text-5xl ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                    Refine this dish for more clicks
                                </h1>
                                <p className={`mt-4 max-w-xl text-base leading-7 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
                                    Refresh the visual, sharpen the description, and tune the pricing so this menu item feels stronger and more discoverable across your storefront.
                                </p>

                                <div className='mt-6 flex flex-wrap gap-3'>
                                    <div className={`rounded-2xl border px-4 py-3 ${isDark ? 'border-white/10 bg-white/5' : 'border-orange-100 bg-white/80'}`}>
                                        <p className='text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ff6b43]'>Selected Shop</p>
                                        <p className={`mt-2 text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{activeShop?.name || 'Loading shop...'}</p>
                                        <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Item changes stay within this branch</p>
                                    </div>
                                    <div className={`rounded-2xl border px-4 py-3 ${isDark ? 'border-white/10 bg-white/5' : 'border-orange-100 bg-white/80'}`}>
                                        <p className='text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ff6b43]'>Food Style</p>
                                        <p className={`mt-2 text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{foodType === 'non veg' ? 'Non Veg' : 'Veg'}</p>
                                        <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{category || 'Choose a category'}</p>
                                    </div>
                                    <div className={`rounded-2xl border px-4 py-3 ${isDark ? 'border-white/10 bg-white/5' : 'border-orange-100 bg-white/80'}`}>
                                        <p className='text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ff6b43]'>Price Point</p>
                                        <p className={`mt-2 text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Rs {price || 0}</p>
                                        <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Adjust for stronger value perception</p>
                                    </div>
                                </div>
                            </div>

                            <div className={`w-full max-w-sm rounded-[28px] border p-4 ${isDark ? 'border-white/10 bg-white/5' : 'border-orange-100 bg-white/75'} shadow-[0_20px_60px_rgba(15,23,42,0.08)]`}>
                                <div className='relative overflow-hidden rounded-[24px]'>
                                    {frontendImage ? (
                                        <>
                                            <img src={frontendImage} alt={name || 'Food preview'} className='h-80 w-full object-cover' />
                                            <div className='absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent' />
                                            <div className='absolute bottom-0 left-0 right-0 p-5 text-white'>
                                                <div className='flex items-center justify-between gap-3'>
                                                    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${previewTone ? 'bg-emerald-400/20 text-emerald-100' : 'bg-red-400/20 text-red-100'}`}>
                                                        {foodType === 'non veg' ? 'Non Veg' : 'Veg'}
                                                    </span>
                                                    <span className='rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-100'>
                                                        {category || 'Category'}
                                                    </span>
                                                </div>
                                                <h2 className='mt-4 text-2xl font-bold'>{name || 'Dish name'}</h2>
                                                <p className='mt-2 text-sm text-white/80 line-clamp-2'>{description || 'Give this item a crisp, tasty description so customers understand the flavor fast.'}</p>
                                                <p className='mt-4 text-xl font-black'>Rs {price || 0}</p>
                                            </div>
                                        </>
                                    ) : (
                                        <div className={`flex h-80 flex-col justify-between p-5 ${isDark ? 'bg-[linear-gradient(135deg,#1b2942,#0f172a)] text-white' : 'bg-[linear-gradient(135deg,#ffecd9,#fff7f1)] text-slate-900'}`}>
                                            <div className='flex items-center justify-between'>
                                                <div className='rounded-full bg-[#ff6b43]/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ff6b43]'>
                                                    Dish Preview
                                                </div>
                                                <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ff6b43] text-white shadow-lg shadow-orange-300'>
                                                    <FaUtensils size={18} />
                                                </div>
                                            </div>
                                            <div>
                                                <h2 className='text-3xl font-black'>{name || 'Dish image missing'}</h2>
                                                <p className={`mt-3 text-sm leading-6 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                                    Replace or add a sharper photo if you want this item to feel more premium inside the menu grid.
                                                </p>
                                            </div>
                                            <div className='flex items-center justify-between'>
                                                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${previewTone ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}>
                                                    {foodType === 'non veg' ? 'Non Veg' : 'Veg'}
                                                </span>
                                                <span className='text-lg font-bold text-[#ff6b43]'>Rs {price || 0}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className='mt-8'>
                            <p className='text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ff6b43]'>Shop Context</p>
                            <div className='mt-3 flex flex-wrap gap-3'>
                                {myShops.map((shop) => {
                                    const isActive = String(shop?._id) === String(activeShop?._id)

                                    return (
                                        <div
                                            key={shop._id}
                                            className={`rounded-2xl border px-4 py-3 text-left ${isActive ? 'border-[#ff6b43] bg-[#ff4d2d] text-white shadow-lg shadow-orange-300/30' : isDark ? 'border-white/10 bg-white/5 text-slate-100' : 'border-orange-100 bg-white/75 text-slate-700'}`}
                                        >
                                            <p className='text-sm font-semibold'>{shop.name}</p>
                                            <p className={`mt-1 text-xs ${isActive ? 'text-white/80' : isDark ? 'text-slate-400' : 'text-slate-500'}`}>{shop.city}, {shop.state}</p>
                                        </div>
                                    )
                                })}
                                <button
                                    type="button"
                                    className={`inline-flex items-center gap-2 rounded-2xl border border-dashed px-4 py-3 text-sm font-semibold transition ${isDark ? 'border-[#ff6b43]/60 bg-[#ff6b43]/10 text-orange-200 hover:bg-[#ff6b43]/15' : 'border-orange-300 bg-white/80 text-[#ff4d2d] hover:bg-orange-50'}`}
                                    onClick={() => navigate(`/add-item${activeShop?._id ? `?shopId=${activeShop._id}` : ''}`)}
                                >
                                    <FaPlus size={12} />
                                    Add Another Item
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                <section className={`${sectionCardClass} p-6 sm:p-8`}>
                    <div className='flex items-start justify-between gap-4'>
                        <div>
                            <p className='text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ff6b43]'>Dish Details</p>
                            <h2 className={`mt-2 text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Edit the menu card</h2>
                            <p className={`mt-2 text-sm leading-6 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
                                Tune the content carefully so the dish remains clear, compelling, and easy for customers to trust at a glance.
                            </p>
                        </div>
                        <div className={`hidden rounded-2xl px-4 py-3 sm:block ${isDark ? 'bg-white/5 text-slate-200' : 'bg-orange-50 text-slate-700'}`}>
                            <p className='text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ff6b43]'>Editing</p>
                            <p className='mt-2 text-sm font-semibold'>{currentItem?._id ? 'Existing menu item' : 'Loading item...'}</p>
                        </div>
                    </div>

                    <form className='mt-8 space-y-6' onSubmit={handleSubmit}>
                        <div className='space-y-3'>
                            <label htmlFor="edit-item-name" className={`block text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Food Name</label>
                            <input
                                id="edit-item-name"
                                name="name"
                                type="text"
                                placeholder='Enter item name'
                                className={inputClass}
                                onChange={(e) => setName(e.target.value)}
                                value={name}
                            />
                        </div>

                        <div className='space-y-3'>
                            <div className='flex items-center justify-between gap-3'>
                                <label htmlFor="edit-item-image" className={`block text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Food Image</label>
                                <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Upload only if you want to replace the current image</span>
                            </div>
                            <label htmlFor="edit-item-image" className={`flex cursor-pointer items-center justify-between gap-4 rounded-[24px] border border-dashed px-5 py-4 transition ${isDark ? 'border-white/15 bg-white/5 hover:bg-white/10' : 'border-orange-200 bg-orange-50/70 hover:bg-orange-50'}`}>
                                <div className='flex items-center gap-4'>
                                    <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ff6b43] text-white shadow-lg shadow-orange-300/30'>
                                        <FaCamera size={18} />
                                    </div>
                                    <div>
                                        <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{backendImage?.name || 'Choose a replacement image'}</p>
                                        <p className={`mt-1 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>PNG, JPG or WEBP recommended</p>
                                    </div>
                                </div>
                                <span className='rounded-full bg-[#ff6b43]/10 px-3 py-1 text-xs font-semibold text-[#ff6b43]'>Upload</span>
                            </label>
                            <input id="edit-item-image" name="image" type="file" accept='image/*' className='hidden' onChange={handleImage} />
                        </div>

                        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                            <div className={`rounded-[24px] border p-4 ${isDark ? 'border-white/10 bg-white/5' : 'border-orange-100 bg-orange-50/60'}`}>
                                <div className='flex items-center gap-2 text-[#ff6b43]'>
                                    <FaRupeeSign />
                                    <p className='text-[11px] font-semibold uppercase tracking-[0.2em]'>Price</p>
                                </div>
                                <input
                                    id="edit-item-price"
                                    name="price"
                                    type="number"
                                    min="0"
                                    placeholder='0'
                                    className={`${inputClass} mt-3`}
                                    onChange={(e) => setPrice(e.target.value)}
                                    value={price}
                                />
                            </div>
                            <div className={`rounded-[24px] border p-4 ${isDark ? 'border-white/10 bg-white/5' : 'border-orange-100 bg-orange-50/60'}`}>
                                <div className='flex items-center gap-2 text-[#ff6b43]'>
                                    <FaLeaf />
                                    <p className='text-[11px] font-semibold uppercase tracking-[0.2em]'>Food Type</p>
                                </div>
                                <select
                                    id="edit-item-food-type"
                                    name="foodType"
                                    className={`${inputClass} mt-3`}
                                    onChange={(e) => setFoodType(e.target.value)}
                                    value={foodType}
                                >
                                    <option value="veg">veg</option>
                                    <option value="non veg">non veg</option>
                                </select>
                            </div>
                        </div>

                        <div className='space-y-3'>
                            <label className={`block text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Description</label>
                            <textarea
                                className={`${inputClass} min-h-[140px] resize-none`}
                                rows={4}
                                value={description}
                                onChange={(e)=>setDescription(e.target.value)}
                                placeholder='Describe the dish for search and recommendations'
                            />
                        </div>

                        <div className='space-y-3'>
                            <label htmlFor="edit-item-category" className={`block text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Category</label>
                            <select
                                id="edit-item-category"
                                name="category"
                                className={inputClass}
                                onChange={(e) => setCategory(e.target.value)}
                                value={category}
                            >
                                <option value="">select Category</option>
                                {categories.map((cate, index) => (
                                    <option value={cate} key={index}>{cate}</option>
                                ))}
                            </select>
                        </div>

                        <button className='flex w-full items-center justify-center gap-3 rounded-[22px] bg-gradient-to-r from-[#ff6b43] to-[#ff4d2d] px-6 py-4 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(255,107,67,0.35)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-75' disabled={loading}>
                            {loading ? <ClipLoader size={18} color='white'/> : <FaUtensils size={15} />}
                            {loading ? 'Saving changes...' : 'Save Item Changes'}
                        </button>
                    </form>
                </section>
            </div>
        </div>
    )
}

export default EditItem

