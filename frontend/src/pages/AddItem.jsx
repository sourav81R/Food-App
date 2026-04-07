import React, { useMemo, useState } from 'react'
import { IoIosArrowRoundBack } from "react-icons/io";
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FaStore, FaUtensils } from "react-icons/fa";
import axios from 'axios';
import { serverUrl } from '../App';
import { setMyShopData } from '../redux/ownerSlice';
import { ClipLoader } from 'react-spinners';

function AddItem() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const { myShopData, myShops } = useSelector(state => state.owner)
    const requestedShopId = searchParams.get("shopId")
    const activeShop = useMemo(() => {
        if (requestedShopId) {
            return myShops.find((shop) => String(shop?._id) === String(requestedShopId)) || null
        }

        return myShopData
    }, [requestedShopId, myShops, myShopData])
    const [loading,setLoading]=useState(false)
    const [name, setName] = useState("")
    const [price, setPrice] = useState(0)
    const [frontendImage, setFrontendImage] = useState(null)
    const [backendImage, setBackendImage] = useState(null)
    const [category, setCategory] = useState("")
    const [foodType, setFoodType] = useState("veg")
    const [description, setDescription] = useState("")
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
    const handleImage = (e) => {
        const file = e.target.files[0]
        setBackendImage(file)
        setFrontendImage(URL.createObjectURL(file))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            if (!activeShop?._id) {
                setLoading(false)
                return
            }

            const formData = new FormData()
            formData.append("shopId", activeShop._id)
            formData.append("name",name)
            formData.append("category",category)
            formData.append("foodType", foodType)
            formData.append("price", price)
            formData.append("description", description)
            if (backendImage) {
                formData.append("image", backendImage)
            }
            const result = await axios.post(`${serverUrl}/api/item/add-item`, formData, { withCredentials: true })
            dispatch(setMyShopData(result.data))
           setLoading(false)
           navigate("/")
        } catch (error) {
            console.log(error)
            setLoading(false)
        }
    }
    return (
        <div className='flex justify-center flex-col items-center p-3 sm:p-6 bg-gradient-to-br from-orange-50 relative to-white min-h-screen'>
            <div className='absolute top-3 left-3 sm:top-[20px] sm:left-[20px] z-[10] mb-[10px]' onClick={() => navigate("/")}>
                <IoIosArrowRoundBack size={35} className='text-[#ff4d2d]' />
            </div>

            <div className='max-w-lg w-full bg-white shadow-xl rounded-2xl p-4 sm:p-8 border border-orange-100'>
                <div className='flex flex-col items-center mb-6'>
                    <div className='bg-orange-100 p-4 rounded-full mb-4'>
                        <FaUtensils className='text-[#ff4d2d] w-16 h-16' />
                    </div>
                    <div className="text-3xl font-extrabold text-gray-900">
                        Add Food
                    </div>
                    <div className='mt-3 inline-flex items-center gap-2 rounded-full bg-orange-50 px-4 py-2 text-sm font-medium text-[#ff4d2d]'>
                        <FaStore size={14} />
                        {activeShop?.name || "Select a shop first"}
                    </div>
                    {myShops.length > 1 && (
                        <div className='mt-4 flex flex-wrap justify-center gap-2'>
                            {myShops.map((shop) => {
                                const isActive = String(shop?._id) === String(activeShop?._id)

                                return (
                                    <button
                                        key={shop._id}
                                        type="button"
                                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${isActive ? 'bg-[#ff4d2d] text-white' : 'bg-orange-50 text-[#ff4d2d]'}`}
                                        onClick={() => navigate(`/add-item?shopId=${shop._id}`)}
                                    >
                                        {shop.name}
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>
                {!activeShop && (
                    <div className='mb-5 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-gray-700'>
                        Create or select a shop before adding menu items.
                    </div>
                )}
                <form className='space-y-5' onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="add-item-name" className='block text-sm font-medium text-gray-700 mb-1'>Name</label>
                        <input id="add-item-name" name="name" type="text" placeholder='Enter Food Name' className='w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500'
                            onChange={(e) => setName(e.target.value)}
                            value={name}
                        />
                    </div>
                    <div>
                        <label htmlFor="add-item-image" className='block text-sm font-medium text-gray-700 mb-1'>Food Image</label>
                        <input id="add-item-image" name="image" type="file" accept='image/*' className='w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500' onChange={handleImage} />
                        {frontendImage && <div className='mt-4'>
                            <img src={frontendImage} alt="" className='w-full h-48 object-cover rounded-lg border' />
                        </div>}

                    </div>
                    <div>
                        <label htmlFor="add-item-price" className='block text-sm font-medium text-gray-700 mb-1'>Price</label>
                        <input id="add-item-price" name="price" type="number" placeholder='0' className='w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500'
                            onChange={(e) => setPrice(e.target.value)}
                            value={price}
                        />
                    </div>
                    <div>
                        <label className='block text-sm font-medium text-gray-700 mb-1'>Description</label>
                        <textarea className='w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500' rows={3} value={description} onChange={(e)=>setDescription(e.target.value)} placeholder='Describe the dish for search and recommendations' />
                    </div>
                    <div>
                        <label htmlFor="add-item-category" className='block text-sm font-medium text-gray-700 mb-1'>Select Category</label>
                        <select id="add-item-category" name="category" className='w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500'
                            onChange={(e) => setCategory(e.target.value)}
                            value={category}

                        >
                            <option value="">select Category</option>
                            {categories.map((cate, index) => (
                                <option value={cate} key={index}>{cate}</option>
                            ))}

                        </select>
                    </div>
                    <div>
                        <label htmlFor="add-item-food-type" className='block text-sm font-medium text-gray-700 mb-1'>Select Food Type</label>
                        <select id="add-item-food-type" name="foodType" className='w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500'
                            onChange={(e) => setFoodType(e.target.value)}
                            value={foodType}

                        >
                            <option value="veg" >veg</option>
 <option value="non veg" >non veg</option>




                        </select>
                    </div>

                    <button className='w-full bg-[#ff4d2d] text-white px-6 py-3 rounded-lg font-semibold shadow-md hover:bg-orange-600 hover:shadow-lg transition-all duration-200 cursor-pointer' disabled={loading || !activeShop}>
                      {loading?<ClipLoader size={20} color='white' />:"Save"}
                    </button>
                </form>
            </div>



        </div>
    )
}

export default AddItem

