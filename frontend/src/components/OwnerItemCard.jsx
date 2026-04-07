import axios from 'axios';
import React from 'react'
import { FaFireAlt, FaLeaf, FaPen, FaTag, FaTrashAlt, FaUtensils } from "react-icons/fa";
import { useNavigate } from 'react-router-dom';
import { serverUrl } from '../App';
import { useDispatch } from 'react-redux';
import { setMyShopData } from '../redux/ownerSlice';
import { useTheme } from '../context/ThemeContext';
function OwnerItemCard({data}) {
    const navigate=useNavigate()
    const dispatch=useDispatch()
    const { isDark } = useTheme()
    const handleDelete=async () => {
      try {
        const result=await axios.get(`${serverUrl}/api/item/delete/${data._id}`,{withCredentials:true})
        dispatch(setMyShopData(result.data))
      } catch (error) {
        console.log(error)
      }
    }

    const isVeg = String(data.foodType || "").toLowerCase().includes("veg") && !String(data.foodType || "").toLowerCase().includes("non")
  return (
    <div className={`group w-full overflow-hidden rounded-[28px] border transition-all duration-300 ${isDark ? 'border-white/10 bg-[linear-gradient(180deg,rgba(18,28,46,0.98),rgba(12,20,34,0.98))] shadow-[0_22px_70px_rgba(2,6,23,0.36)] hover:border-[#ff6b43]/30' : 'border-orange-100 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)] hover:-translate-y-0.5 hover:shadow-[0_24px_70px_rgba(15,23,42,0.12)]'}`}>
      <div className='flex flex-col md:flex-row'>
        <div className='relative h-52 w-full overflow-hidden md:h-auto md:w-64 md:min-w-[16rem]'>
          <img src={data.image} alt={data.name} className='h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]'/>
          <div className='absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent' />
          <div className='absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ff6b43] shadow-sm backdrop-blur'>
            <FaUtensils size={10} />
            Menu Item
          </div>
          <div className='absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3'>
            <div className='rounded-2xl bg-white/92 px-3 py-2 shadow-sm backdrop-blur'>
              <p className='text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400'>Starting Price</p>
              <p className='mt-1 text-xl font-bold text-[#ff4d2d]'>Rs {data.price}</p>
            </div>
            <div className={`rounded-full px-3 py-1 text-xs font-semibold capitalize shadow-sm backdrop-blur ${isVeg ? 'bg-emerald-100/95 text-emerald-700' : 'bg-red-100/95 text-red-600'}`}>
              {data.foodType || 'Food'}
            </div>
          </div>
        </div>

        <div className='flex flex-1 flex-col justify-between p-5 sm:p-6'>
          <div>
            <div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
              <div className='min-w-0'>
                <p className='text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ff6b43]'>Signature Plate</p>
                <h2 className={`mt-2 text-2xl font-bold capitalize ${isDark ? 'text-white' : 'text-slate-900'}`}>{data.name}</h2>
                <p className={`mt-3 max-w-2xl text-sm leading-7 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
                  A menu-ready highlight built to catch attention fast, communicate flavor clearly, and make your restaurant lineup feel more premium.
                </p>
              </div>

              <div className='flex items-center gap-2 self-start'>
                <button
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition ${isDark ? 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10' : 'border-orange-100 bg-orange-50 text-[#ff4d2d] hover:bg-orange-100'}`}
                  onClick={()=>navigate(`/edit-item/${data._id}`)}
                  title='Edit item'
                >
                  <FaPen size={15}/>
                </button>
                <button
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition ${isDark ? 'border-red-400/20 bg-red-500/10 text-red-300 hover:bg-red-500/15' : 'border-red-100 bg-red-50 text-red-500 hover:bg-red-100'}`}
                  onClick={handleDelete}
                  title='Delete item'
                >
                  <FaTrashAlt size={15}/>
                </button>
              </div>
            </div>

            <div className='mt-5 flex flex-wrap gap-3'>
              <div className={`inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium ${isDark ? 'bg-white/5 text-slate-200' : 'bg-slate-50 text-slate-700'}`}>
                <FaTag className='text-[#ff6b43]' />
                <span>Category: {data.category}</span>
              </div>
              <div className={`inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium ${isVeg ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                <FaLeaf className={isVeg ? 'text-emerald-600' : 'text-red-500'} />
                <span>{data.foodType}</span>
              </div>
              <div className={`inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium ${isDark ? 'bg-white/5 text-slate-200' : 'bg-slate-50 text-slate-700'}`}>
                <FaFireAlt className='text-amber-500' />
                <span>High-visibility menu pick</span>
              </div>
            </div>
          </div>

          <div className={`mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
            <div className={`rounded-[22px] border p-4 ${isDark ? 'border-white/10 bg-white/5' : 'border-orange-100 bg-[linear-gradient(180deg,#fff8f3,#ffffff)]'}`}>
              <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ff6b43]'>Quick Note</p>
              <p className='mt-2 text-sm leading-6'>Well suited for eye-catching placement in the menu list with a clear price-first presentation.</p>
            </div>
            <div className={`rounded-[22px] border p-4 ${isDark ? 'border-white/10 bg-white/5' : 'border-orange-100 bg-[linear-gradient(180deg,#fff8f3,#ffffff)]'}`}>
              <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ff6b43]'>Pricing</p>
              <p className={`mt-2 text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Rs {data.price}</p>
              <p className='mt-1 text-sm text-[#ff6b43]'>Clean value signal for your storefront.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OwnerItemCard
