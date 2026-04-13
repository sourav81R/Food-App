import React from 'react'
import Nav from './Nav'
import { useSelector } from 'react-redux'
import { FaChartLine, FaClock, FaMapMarkerAlt, FaPen, FaPlus, FaStore, FaUtensils } from "react-icons/fa";
import { useNavigate } from 'react-router-dom';
import OwnerItemCard from './OwnerItemCard';
import axios from 'axios';
import { serverUrl } from '../App';
import { setMyShopData, setSelectedShopId } from '../redux/ownerSlice';
import { useDispatch } from 'react-redux';
import OwnerAnalyticsPanel from './OwnerAnalyticsPanel';
import { useTheme } from '../context/ThemeContext';

function OwnerDashboard() {
  const { myShopData, myShops, selectedShopId } = useSelector(state => state.owner)
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { isDark } = useTheme()
  const hasSelectedShop = Boolean(myShopData?._id)
  const activeItems = myShopData?.items || []

  const toggleBusyMode = async () => {
    try {
      if (!myShopData?._id) {
        return
      }

      const result = await axios.patch(`${serverUrl}/api/shop/busy-mode`, { shopId: myShopData._id }, { withCredentials: true })
      dispatch(setMyShopData(result.data.shop))
    } catch (error) {
      console.log(error)
    }
  }

  const handleSelectShop = (shopId) => {
    dispatch(setSelectedShopId(shopId))
  }

  const handleManageShop = () => {
    if (!myShopData?._id) {
      navigate("/create-edit-shop?mode=create")
      return
    }

    navigate(`/create-edit-shop?shopId=${myShopData._id}`)
  }

  const handleAddAnotherShop = () => {
    navigate("/create-edit-shop?mode=create")
  }

  const handleAddFoodItem = () => {
    if (!myShopData?._id) {
      return
    }

    navigate(`/add-item?shopId=${myShopData._id}`)
  }

  
  return (
    <div className={`w-full min-h-screen flex flex-col items-center pt-[90px] px-3 sm:px-4 ${isDark ? 'bg-[linear-gradient(180deg,#091120_0%,#10192d_48%,#0b1425_100%)]' : 'bg-[linear-gradient(180deg,#fff7f2_0%,#fffaf7_38%,#ffffff_100%)]'}`}>
      <Nav />
      {!hasSelectedShop &&
        <div className='flex justify-center items-center p-4 sm:p-6'>
          <div className={`w-full max-w-md rounded-[28px] p-6 border transition-shadow duration-300 ${isDark ? 'border-white/10 bg-[#10182b] shadow-[0_24px_60px_rgba(2,6,23,0.4)]' : 'border-orange-100 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)]'}`}>
            <div className='flex flex-col items-center text-center'>
              <FaUtensils className='text-[#ff4d2d] w-16 h-16 sm:w-20 sm:h-20 mb-4' />
              <h2 className={`text-xl sm:text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>Add Your Restaurant</h2>
              <p className={`mb-4 text-sm sm:text-base ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>Join our food delivery platform and reach thousands of hungry customers every day.
              </p>
              <button className='bg-[#ff4d2d] text-white px-5 sm:px-6 py-2 rounded-full font-medium shadow-md hover:bg-orange-600 transition-colors duration-200' onClick={handleAddAnotherShop}>
                Get Started
              </button>
            </div>
          </div>
        </div>
      }

      {hasSelectedShop &&
        <div className='w-full flex flex-col items-center gap-6 px-4 sm:px-6'>
          <div className={`w-full max-w-6xl rounded-[28px] border p-4 sm:p-5 ${isDark ? 'border-white/10 bg-[#10182b]' : 'border-orange-100 bg-white'} shadow-[0_20px_60px_rgba(15,23,42,0.08)]`}>
            <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
              <div>
                <p className='text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ff6b43]'>Shop Portfolio</p>
                <h2 className={`mt-2 text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{myShops.length} storefront{myShops.length === 1 ? '' : 's'}</h2>
                <p className={`mt-2 text-sm ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>Switch between shops, edit the current one, or open a brand-new storefront under the same owner account.</p>
              </div>
              <button
                className='inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#ff6b43] to-[#ff4d2d] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition hover:brightness-105'
                onClick={handleAddAnotherShop}
              >
                <FaPlus size={13} />
                Add Another Shop
              </button>
            </div>

            <div className='mt-4 flex flex-wrap gap-3'>
              {myShops.map((shop) => {
                const isActive = String(shop?._id) === String(selectedShopId)

                return (
                  <button
                    key={shop._id}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${isActive ? 'border-[#ff6b43] bg-[#ff4d2d] text-white shadow-lg shadow-orange-200' : isDark ? 'border-white/10 bg-white/5 text-slate-100 hover:bg-white/10' : 'border-orange-100 bg-orange-50 text-slate-700 hover:border-orange-200 hover:bg-orange-100/60'}`}
                    onClick={() => handleSelectShop(shop._id)}
                  >
                    <p className='text-sm font-semibold'>{shop.name}</p>
                    <p className={`mt-1 break-words text-xs ${isActive ? 'text-white/85' : isDark ? 'text-slate-300' : 'text-slate-500'}`}>{shop.city}, {shop.state}</p>
                  </button>
                )
              })}
            </div>
          </div>

          <div className={`w-full max-w-6xl overflow-hidden rounded-[32px] border ${isDark ? 'border-white/10 bg-[linear-gradient(180deg,rgba(18,28,46,0.98),rgba(12,20,34,0.98))] shadow-[0_30px_90px_rgba(2,6,23,0.42)]' : 'border-orange-100 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.1)]'}`}>
            <div className={`${isDark ? 'bg-[radial-gradient(circle_at_top_left,_rgba(255,120,82,0.18),_transparent_45%),linear-gradient(135deg,rgba(255,255,255,0.02),rgba(255,255,255,0))]' : 'bg-[radial-gradient(circle_at_top_left,_rgba(255,120,82,0.24),_transparent_44%),linear-gradient(135deg,_#fff5ef,_#ffffff_62%)]'} px-5 py-5 sm:px-7 sm:py-7`}>
              <div className='flex flex-col gap-6 xl:flex-row xl:items-stretch'>
                <div className='flex-1'>
                  <div className='inline-flex items-center gap-2 rounded-full bg-[#ff4d2d]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ff6b43]'>
                    <FaStore />
                    Restaurant Command Deck
                  </div>
                  <h1 className={`mt-4 text-3xl font-bold sm:text-4xl ${isDark ? 'text-white' : 'text-slate-900'}`}>Welcome to {myShopData.name}</h1>
                  <p className={`mt-3 max-w-2xl text-sm leading-7 sm:text-base ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
                    Keep your storefront polished, monitor service flow, and manage your menu from one sharper dashboard built for busy food businesses.
                  </p>

                  <div className='mt-5 flex flex-wrap gap-3'>
                    <button
                      className='inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#ff6b43] to-[#ff4d2d] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition hover:brightness-105'
                      onClick={handleManageShop}
                    >
                      <FaPen size={13} />
                      Edit Restaurant
                    </button>
                    <button
                      className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${isDark ? 'border-white/10 bg-white/5 text-slate-100 hover:bg-white/10' : 'border-orange-100 bg-white text-slate-700 hover:border-orange-200 hover:bg-orange-50'}`}
                      onClick={handleAddFoodItem}
                    >
                      <FaPlus size={13} />
                      Add Food Item
                    </button>
                    <button
                      className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${isDark ? 'border-white/10 bg-white/5 text-slate-100 hover:bg-white/10' : 'border-orange-100 bg-white text-slate-700 hover:border-orange-200 hover:bg-orange-50'}`}
                      onClick={handleAddAnotherShop}
                    >
                      <FaStore size={13} />
                      Add Another Shop
                    </button>
                    <button
                      className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${myShopData.isBusy ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                      onClick={toggleBusyMode}
                    >
                      <FaClock size={13} />
                      {myShopData.isBusy ? 'Disable Busy Mode' : 'Enable Busy Mode'}
                    </button>
                  </div>

                  <div className='mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3'>
                    <div className={`rounded-[24px] border p-4 ${isDark ? 'border-white/10 bg-white/5' : 'border-orange-100 bg-white/80'}`}>
                      <p className='text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ff6b43]'>Service Window</p>
                      <p className={`mt-3 text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{myShopData.openingTime || "08:00"} - {myShopData.closingTime || "00:45"}</p>
                      <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Visible to customers on your storefront.</p>
                    </div>
                    <div className={`rounded-[24px] border p-4 ${isDark ? 'border-white/10 bg-white/5' : 'border-orange-100 bg-white/80'}`}>
                      <p className='text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ff6b43]'>Coverage Zone</p>
                      <p className={`mt-3 text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{myShopData.city}, {myShopData.state}</p>
                      <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Serving local customers with a stronger city presence.</p>
                    </div>
                    <div className={`rounded-[24px] border p-4 ${isDark ? 'border-white/10 bg-white/5' : 'border-orange-100 bg-white/80'}`}>
                      <p className='text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ff6b43]'>Menu Strength</p>
                      <p className={`mt-3 text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{myShopData.items?.length || 0} active items</p>
                      <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Keep your bestsellers fresh and visible.</p>
                    </div>
                  </div>
                </div>

                <div className='w-full xl:w-[420px]'>
                  <div className={`overflow-hidden rounded-[30px] border ${isDark ? 'border-white/10 bg-white/5' : 'border-orange-100 bg-white'} shadow-[0_18px_50px_rgba(15,23,42,0.1)]`}>
                    <div className='relative'>
                      <img src={myShopData.image} alt={myShopData.name} className='h-64 w-full object-cover sm:h-72 xl:h-[310px]' />
                      <div className='absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent' />
                      <div className='absolute left-5 right-5 top-5 flex items-start justify-between gap-3'>
                        <div className='rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ff6b43] shadow-sm backdrop-blur'>
                          {myShops.length > 1 ? `Store ${myShops.findIndex((shop) => String(shop?._id) === String(myShopData._id)) + 1}` : 'Signature Store'}
                        </div>
                        <div
                          className='flex h-11 w-11 cursor-pointer items-center justify-center rounded-2xl bg-[#ff4d2d] text-white shadow-lg shadow-orange-300 transition hover:brightness-105'
                          onClick={handleManageShop}
                        >
                          <FaPen size={16} />
                        </div>
                      </div>
                      <div className='absolute bottom-0 left-0 right-0 p-5 text-white'>
                        <h2 className='text-2xl font-bold'>{myShopData.name}</h2>
                        <div className='mt-2 flex items-center gap-2 text-sm text-white/85'>
                          <FaMapMarkerAlt className='text-[#ff9a62]' />
                          <span className='break-words'>{myShopData.address}</span>
                        </div>
                      </div>
                    </div>
                    <div className='grid grid-cols-1 gap-3 p-5 sm:grid-cols-2'>
                      <div className={`rounded-2xl px-4 py-3 ${isDark ? 'bg-white/5' : 'bg-orange-50'}`}>
                        <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ff6b43]'>Store Rhythm</p>
                        <p className={`mt-2 text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{myShopData.isBusy ? 'Busy mode active' : 'Ready for orders'}</p>
                      </div>
                      <div className={`rounded-2xl px-4 py-3 ${isDark ? 'bg-white/5' : 'bg-orange-50'}`}>
                        <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ff6b43]'>Growth Pulse</p>
                        <p className={`mt-2 flex items-center gap-2 text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}><FaChartLine className='text-emerald-500' />Menu momentum ready</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {activeItems.length===0 && 
            <div className='flex justify-center items-center p-4 sm:p-6'>
          <div className={`w-full max-w-md rounded-[28px] p-6 border transition-shadow duration-300 ${isDark ? 'border-white/10 bg-[#10182b] shadow-[0_24px_60px_rgba(2,6,23,0.4)]' : 'border-orange-100 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)]'}`}>
            <div className='flex flex-col items-center text-center'>
              <FaUtensils className='text-[#ff4d2d] w-16 h-16 sm:w-20 sm:h-20 mb-4' />
              <h2 className={`text-xl sm:text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>Add Your Food Item</h2>
              <p className={`mb-4 text-sm sm:text-base ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>Share your delicious creations with our customers by adding them to the menu.
              </p>
              <button className='bg-[#ff4d2d] text-white px-5 sm:px-6 py-2 rounded-full font-medium shadow-md hover:bg-orange-600 transition-colors duration-200' onClick={handleAddFoodItem}>
              Add Food
              </button>
            </div>
          </div>
        </div>
            }

            {activeItems.length>0 && <div className='flex flex-col items-center gap-4 w-full max-w-6xl '>
              {activeItems.map((item,index)=>(
                <OwnerItemCard data={item} key={index}/>
              ))}
              </div>}

          <OwnerAnalyticsPanel />
            
        </div>}



    </div>
  )
}

export default OwnerDashboard
