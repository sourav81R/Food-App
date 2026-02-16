import axios from 'axios'
import React, { useEffect, useState } from 'react'
import { serverUrl } from '../App'
import { useNavigate, useParams } from 'react-router-dom'
import { FaStore } from "react-icons/fa6";
import { FaLocationDot } from "react-icons/fa6";
import { FaUtensils } from "react-icons/fa";
import FoodCard from '../components/FoodCard';
import { FaArrowLeft } from "react-icons/fa";

const fallbackHeroImages = [
  "https://images.pexels.com/photos/260922/pexels-photo-260922.jpeg?auto=compress&cs=tinysrgb&w=1400",
  "https://images.pexels.com/photos/941861/pexels-photo-941861.jpeg?auto=compress&cs=tinysrgb&w=1400",
  "https://images.pexels.com/photos/67468/pexels-photo-67468.jpeg?auto=compress&cs=tinysrgb&w=1400",
  "https://images.pexels.com/photos/696218/pexels-photo-696218.jpeg?auto=compress&cs=tinysrgb&w=1400"
]

const isNonFoodImageUrl = (url = "") =>
  /cat|dog|kitten|puppy|animal|pet|loremflickr|placekitten|placebear/i.test(url);
function Shop() {
    const {shopId}=useParams()
    const [items,setItems]=useState([])
    const [shop,setShop]=useState([])
    const navigate=useNavigate()
    const fallbackHeroIndex = ([...(shop?.name || "shop")].reduce((acc, char) => acc + char.charCodeAt(0), 0) % fallbackHeroImages.length)
    const resolvedShopImage = !shop?.image || isNonFoodImageUrl(shop.image) ? fallbackHeroImages[fallbackHeroIndex] : shop.image
    const handleShop=async () => {
        try {
           const result=await axios.get(`${serverUrl}/api/item/get-by-shop/${shopId}`,{withCredentials:true}) 
           setShop(result.data.shop)
           setItems(result.data.items)
        } catch (error) {
            console.log(error)
        }
    }

    useEffect(()=>{
handleShop()
    },[shopId])
  return (
    <div className='min-h-screen bg-gray-50'>
        <button className='absolute top-3 left-3 sm:top-4 sm:left-4 z-20 flex items-center gap-2 bg-black/50 hover:bg-black/70 text-white px-3 py-2 rounded-full shadow-md transition' onClick={()=>navigate("/")}>
        <FaArrowLeft />
<span className='hidden sm:inline'>Back</span>
        </button>
      {shop && <div className='relative w-full h-56 sm:h-64 md:h-80 lg:h-96'>
          <img
            src={resolvedShopImage}
            alt={shop.name}
            loading='lazy'
            className='w-full h-full object-cover'
            onError={(event) => {
              if (event.currentTarget.src === fallbackHeroImages[fallbackHeroIndex]) {
                return
              }
              event.currentTarget.src = fallbackHeroImages[fallbackHeroIndex]
            }}
          />
          <div className='absolute inset-0 bg-gradient-to-b from-black/70 to-black/30 flex flex-col justify-center items-center text-center px-4'>
          <FaStore className='text-white text-4xl mb-3 drop-shadow-md'/>
          <h1 className='text-2xl sm:text-3xl md:text-5xl font-extrabold text-white drop-shadow-lg'>{shop.name}</h1>
          <div className='flex items-center justify-center flex-wrap gap-2 mt-2'>
          <FaLocationDot size={22} color='red'/>
             <p className='text-sm sm:text-lg font-medium text-gray-200'>{shop.address}</p>
             </div>
          </div>
       
        </div>}

<div className='max-w-7xl mx-auto px-3 sm:px-6 py-8 sm:py-10'>
<h2 className='flex items-center justify-center gap-3 text-2xl sm:text-3xl font-bold mb-8 sm:mb-10 text-gray-800'><FaUtensils color='red'/> Our Menu</h2>

{items.length>0?(
    <div className='flex flex-wrap justify-center gap-4 sm:gap-8'>
        {items.map((item)=>(
            <FoodCard key={item._id} data={item}/>
        ))}
    </div>
):<p className='text-center text-gray-500 text-lg'>No Items Available</p>}
</div>



    </div>
  )
}

export default Shop
