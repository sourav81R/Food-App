import React, { useEffect, useMemo, useState } from 'react'
import { IoIosArrowRoundBack } from "react-icons/io";
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FaPlus, FaUtensils } from "react-icons/fa";
import axios from 'axios';
import { serverUrl } from '../App';
import { setMyShopData } from '../redux/ownerSlice';
import { ClipLoader } from 'react-spinners';

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
                        {isEditing ? "Edit Shop" : "Add Shop"}
                    </div>
                    <p className='mt-2 text-sm text-center text-gray-500'>
                        {isEditing ? "Update the selected storefront details." : "Create a new storefront under your owner account."}
                    </p>
                    {myShops.length > 0 && (
                        <div className='mt-4 flex flex-wrap justify-center gap-2'>
                            {myShops.map((shop) => {
                                const isActive = String(shop?._id) === String(shopToEdit?._id || myShopData?._id || "")

                                return (
                                    <button
                                        key={shop._id}
                                        type="button"
                                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${isActive ? 'bg-[#ff4d2d] text-white' : 'bg-orange-50 text-[#ff4d2d]'}`}
                                        onClick={() => navigate(`/create-edit-shop?shopId=${shop._id}`)}
                                    >
                                        {shop.name}
                                    </button>
                                )
                            })}
                            <button
                                type="button"
                                className='inline-flex items-center gap-2 rounded-full border border-dashed border-orange-300 px-3 py-1.5 text-xs font-semibold text-[#ff4d2d]'
                                onClick={() => navigate("/create-edit-shop?mode=create")}
                            >
                                <FaPlus size={10} />
                                New Shop
                            </button>
                        </div>
                    )}
                </div>
                <form className='space-y-5' onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="shop-name" className='block text-sm font-medium text-gray-700 mb-1'>Name</label>
                        <input id="shop-name" name="name" type="text" placeholder='Enter Shop Name' className='w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500'
                        onChange={(e)=>setName(e.target.value)}
                        value={name}
                        />
                    </div>
                    <div>
                        <label htmlFor="shop-image" className='block text-sm font-medium text-gray-700 mb-1'>Shop Image</label>
                        <input id="shop-image" name="image" type="file" accept='image/*' className='w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500' onChange={handleImage}  />
                        {frontendImage &&   <div className='mt-4'>
                            <img src={frontendImage} alt="" className='w-full h-48 object-cover rounded-lg border'/>
                        </div>}
                      
                    </div>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                        <div>
                           <label htmlFor="shop-city" className='block text-sm font-medium text-gray-700 mb-1'>City</label>
                        <input id="shop-city" name="city" type="text" placeholder='City' className='w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500' onChange={(e)=>setCity(e.target.value)}
                        value={city}/> 
                        </div>
                        <div>
                            <label htmlFor="shop-state" className='block text-sm font-medium text-gray-700 mb-1'>State</label>
                        <input id="shop-state" name="state" type="text" placeholder='State' className='w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500' onChange={(e)=>setState(e.target.value)}
                        value={state}/> 
                        </div>
                    </div>
                    <div>
                        <label htmlFor="shop-address" className='block text-sm font-medium text-gray-700 mb-1'>Address</label>
                        <input id="shop-address" name="address" type="text" placeholder='Enter Shop Address' className='w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500' onChange={(e)=>setAddress(e.target.value)}
                        value={address}/> 
                    </div>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                        <div>
                           <label className='block text-sm font-medium text-gray-700 mb-1'>Opening Time</label>
                           <input type="time" className='w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500' value={openingTime} onChange={(e)=>setOpeningTime(e.target.value)} />
                        </div>
                        <div>
                           <label className='block text-sm font-medium text-gray-700 mb-1'>Closing Time</label>
                           <input type="time" className='w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500' value={closingTime} onChange={(e)=>setClosingTime(e.target.value)} />
                        </div>
                    </div>
                    <label className='flex items-center gap-2 text-sm font-medium text-gray-700'>
                        <input type="checkbox" checked={isOpen} onChange={(e)=>setIsOpen(e.target.checked)} />
                        Shop is open for orders
                    </label>
                    <button className='w-full bg-[#ff4d2d] text-white px-6 py-3 rounded-lg font-semibold shadow-md hover:bg-orange-600 hover:shadow-lg transition-all duration-200 cursor-pointer' disabled={loading}>
                        {loading?<ClipLoader size={20} color='white'/>:isEditing ? "Save Changes" : "Create Shop"}
                    
                    </button>
                </form>
            </div>
                
                

        </div>
    )
}

export default CreateEditShop

