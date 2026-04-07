import React, { useEffect, useMemo, useState } from 'react'
import { IoIosArrowRoundBack } from "react-icons/io";
import { IoSearchOutline, IoLocationSharp } from "react-icons/io5";
import { TbCurrentLocation } from "react-icons/tb";
import { MapContainer, Marker, useMap } from 'react-leaflet';
import { useDispatch, useSelector } from 'react-redux';
import "leaflet/dist/leaflet.css"
import { setAddress, setLocation } from '../redux/mapSlice';
import { MdDeliveryDining } from "react-icons/md";
import { FaCreditCard, FaWallet, FaClock } from "react-icons/fa";
import axios from 'axios';
import { FaMobileScreenButton } from "react-icons/fa6";
import { useNavigate } from 'react-router-dom';
import { serverUrl } from '../App';
import { addMyOrder, clearCart, setAddresses, setBestCoupon, setWalletBalance } from '../redux/userSlice';
import { useToast } from '../context/ToastContext';
import { ClipLoader } from 'react-spinners';
import EnhancedMapLayers from '../components/EnhancedMapLayers';
import { useTheme } from '../context/ThemeContext';
import { loadRazorpaySdk } from '../utils/razorpay';

function RecenterMap({ location }) {
  const map = useMap()

  useEffect(() => {
    const lat = Number(location?.lat)
    const lon = Number(location?.lon)
    const isValidPoint =
      Number.isFinite(lat) &&
      Number.isFinite(lon) &&
      lat >= -90 &&
      lat <= 90 &&
      lon >= -180 &&
      lon <= 180 &&
      !(Math.abs(lat) < 0.000001 && Math.abs(lon) < 0.000001)

    if (!isValidPoint) return

    map.invalidateSize()
    map.setView([lat, lon], 16, { animate: true })
  }, [map, location?.lat, location?.lon])

  return null
}

function CheckOut() {
  const { location, address } = useSelector(state => state.map)
  const { cartItems, totalAmount, userData, addresses, walletBalance, bestCoupon } = useSelector(state => state.user)
  const [addressInput, setAddressInput] = useState("")
  const [addressLabel, setAddressLabel] = useState("Home")
  const [paymentMethod, setPaymentMethod] = useState("cod")
  const [scheduleOrder, setScheduleOrder] = useState(false)
  const [scheduledFor, setScheduledFor] = useState("")
  const [saveAddress, setSaveAddress] = useState(false)
  const [selectedAddressId, setSelectedAddressId] = useState("")
  const [activeCoupons, setActiveCoupons] = useState([])
  const [manualCouponCode, setManualCouponCode] = useState("")
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [manualCouponOverride, setManualCouponOverride] = useState(false)
  const [orderLoading, setOrderLoading] = useState(false)
  const [geoLoading, setGeoLoading] = useState(false)
  const [onlinePaymentEnabled, setOnlinePaymentEnabled] = useState(true)
  const [onlinePaymentReason, setOnlinePaymentReason] = useState("")
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const apiKey = import.meta.env.VITE_GEOAPIKEY
  const toast = useToast()
  const { isDark } = useTheme()

  const deliveryFee = totalAmount > 500 ? 0 : 40
  const couponDiscount = Number(appliedCoupon?.discount || 0)
  const payableAmount = Math.max(0, totalAmount + deliveryFee - couponDiscount)
  const walletDisabled = Number(walletBalance || 0) < payableAmount
  const totalItems = cartItems.reduce((sum, item) => sum + Number(item?.quantity || 0), 0)
  const hasSavedAddresses = addresses.length > 0
  const sectionCardClass = isDark
    ? 'overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,27,48,0.96),rgba(11,18,33,0.98))] shadow-[0_18px_50px_rgba(2,6,23,0.24)]'
    : 'overflow-hidden rounded-[24px] border border-orange-100 bg-white shadow-[0_16px_50px_rgba(15,23,42,0.07)]'
  const subtlePanelClass = isDark
    ? 'rounded-[20px] border border-white/10 bg-white/5'
    : 'rounded-[20px] border border-orange-100 bg-[linear-gradient(180deg,#fff8f3,#ffffff)]'
  const inputClass = isDark
    ? 'w-full rounded-[20px] border border-white/10 bg-[#0f172c] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ff6b43]'
    : 'w-full rounded-[20px] border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#ff6b43]'
  const paymentCardBase = isDark
    ? 'rounded-[20px] border border-white/10 bg-white/5 text-white'
    : 'rounded-[20px] border border-slate-200 bg-white text-slate-900'

  const nowValue = useMemo(() => {
    const now = new Date()
    now.setMinutes(now.getMinutes() + 5)
    return now.toISOString().slice(0, 16)
  }, [])

  const maxScheduleValue = useMemo(() => {
    const date = new Date()
    date.setHours(date.getHours() + 24)
    return date.toISOString().slice(0, 16)
  }, [])

  const onDragEnd = (e) => {
    const { lat, lng } = e.target.getLatLng()
    dispatch(setLocation({ lat, lon: lng }))
    void getAddressByLatLng(lat, lng)
  }

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported in this browser")
      return
    }

    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude
        const longitude = position.coords.longitude
        dispatch(setLocation({ lat: latitude, lon: longitude }))
        void getAddressByLatLng(latitude, longitude)
        setGeoLoading(false)
      },
      () => {
        const savedLongitude = userData?.location?.coordinates?.[0]
        const savedLatitude = userData?.location?.coordinates?.[1]
        if (Number.isFinite(savedLongitude) && Number.isFinite(savedLatitude)) {
          dispatch(setLocation({ lat: savedLatitude, lon: savedLongitude }))
          void getAddressByLatLng(savedLatitude, savedLongitude)
        } else {
          toast.error("Unable to fetch current location")
        }
        setGeoLoading(false)
      },
      { enableHighAccuracy: false, timeout: 7000, maximumAge: 5 * 60 * 1000 }
    )
  }

  const getAddressByLatLng = async (lat, lng) => {
    try {
      const result = await axios.get(`https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lng}&format=json&apiKey=${apiKey}`)
      const formattedAddress = result?.data?.results?.[0]?.address_line2 || result?.data?.results?.[0]?.formatted || ""
      dispatch(setAddress(formattedAddress))
      setAddressInput(formattedAddress)
    } catch (error) {
      console.log(error)
    }
  }

  const getLatLngByAddress = async () => {
    try {
      const result = await axios.get(`https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(addressInput)}&apiKey=${apiKey}`)
      const firstMatch = result?.data?.features?.[0]?.properties
      if (!firstMatch) {
        toast.warning("No matching address found")
        return
      }
      const { lat, lon } = firstMatch
      dispatch(setLocation({ lat, lon }))
    } catch (error) {
      console.log(error)
    }
  }

  const fetchCheckoutData = async () => {
    try {
      const [paymentConfig, addressRes, balanceRes, activeCouponRes, bestCouponRes] = await Promise.all([
        axios.get(`${serverUrl}/api/order/payment-config`, { withCredentials: true }),
        axios.get(`${serverUrl}/api/user/addresses`, { withCredentials: true }),
        axios.get(`${serverUrl}/api/wallet/balance`, { withCredentials: true }),
        axios.get(`${serverUrl}/api/coupon/active`, { withCredentials: true }),
        axios.get(`${serverUrl}/api/coupon/best`, {
          params: { orderAmount: totalAmount + deliveryFee },
          withCredentials: true
        })
      ])

      const isEnabled = Boolean(paymentConfig.data?.onlinePaymentEnabled)
      setOnlinePaymentEnabled(isEnabled)
      setOnlinePaymentReason(paymentConfig.data?.reason || "")
      if (!isEnabled && paymentMethod === "online") {
        setPaymentMethod("cod")
      }

      dispatch(setAddresses(addressRes.data))
      dispatch(setWalletBalance(balanceRes.data?.walletBalance || 0))
      setActiveCoupons(activeCouponRes.data || [])
      dispatch(setBestCoupon(bestCouponRes.data || null))

      if (!manualCouponOverride) {
        setAppliedCoupon(bestCouponRes.data || null)
      }
    } catch (error) {
      setOnlinePaymentEnabled(false)
      setOnlinePaymentReason("Unable to validate online payment configuration")
      if (paymentMethod === "online") {
        setPaymentMethod("cod")
      }
    }
  }

  const handleApplyManualCoupon = async (code) => {
    const couponCode = String(code || manualCouponCode).trim()
    if (!couponCode) {
      setManualCouponOverride(false)
      setAppliedCoupon(bestCoupon)
      return
    }

    try {
      const { data } = await axios.post(`${serverUrl}/api/coupon/validate`, {
        code: couponCode,
        orderAmount: totalAmount + deliveryFee
      }, { withCredentials: true })

      setAppliedCoupon(data)
      setManualCouponCode(couponCode)
      setManualCouponOverride(true)
      toast.success(`Coupon ${data.code} applied`)
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to apply coupon")
    }
  }

  const handleSelectSavedAddress = (selected) => {
    setSelectedAddressId(selected._id)
    setAddressInput(selected.fullAddress)
    setAddressLabel(selected.label)
    dispatch(setAddress(selected.fullAddress))
    dispatch(setLocation({ lat: selected.lat, lon: selected.lng }))
    setSaveAddress(false)
  }

  const handleMaybeSaveAddress = async () => {
    if (!saveAddress || !addressInput.trim() || location.lat == null || location.lon == null) {
      return
    }

    const exists = addresses.some((entry) => entry.fullAddress === addressInput.trim())
    if (exists) {
      return
    }

    const { data } = await axios.post(`${serverUrl}/api/user/addresses`, {
      label: addressLabel || "Saved",
      fullAddress: addressInput.trim(),
      lat: location.lat,
      lng: location.lon,
      isDefault: addresses.length === 0
    }, { withCredentials: true })
    dispatch(setAddresses(data))
  }

  const handlePlaceOrder = async () => {
    if (!addressInput.trim()) {
      toast.warning("Please enter a delivery address")
      return
    }
    if (!location.lat || !location.lon) {
      toast.warning("Please select a location on the map")
      return
    }
    if (cartItems.length === 0) {
      toast.warning("Your cart is empty")
      return
    }
    if (paymentMethod === "online" && !onlinePaymentEnabled) {
      toast.error(onlinePaymentReason || "Online payment is currently unavailable")
      return
    }
    if (paymentMethod === "wallet" && walletDisabled) {
      toast.error("Insufficient wallet balance")
      return
    }
    if (scheduleOrder && !scheduledFor) {
      toast.warning("Please select a scheduled date and time")
      return
    }

    setOrderLoading(true)
    try {
      await handleMaybeSaveAddress()

      const result = await axios.post(`${serverUrl}/api/order/place-order`, {
        paymentMethod,
        deliveryAddress: {
          text: addressInput,
          latitude: location.lat,
          longitude: location.lon
        },
        totalAmount: payableAmount,
        cartItems,
        coupon: appliedCoupon,
        scheduledFor: scheduleOrder ? scheduledFor : null
      }, { withCredentials: true })

      if (paymentMethod === "cod" || paymentMethod === "wallet") {
        dispatch(addMyOrder(result.data))
        dispatch(clearCart())
        dispatch(setWalletBalance(paymentMethod === "wallet" ? Number(walletBalance || 0) - payableAmount : walletBalance))
        toast.success(scheduleOrder ? "Order scheduled successfully!" : "Order placed successfully!")
        navigate("/order-placed")
      } else {
        await openRazorpayWindow(result.data.orderId, result.data.razorOrder, result.data.razorpayKeyId)
      }
    } catch (error) {
      const statusCode = error?.response?.status
      if (statusCode === 401) {
        toast.error("Session expired. Please sign in again.")
        navigate("/signin")
        return
      }
      const message = error?.response?.data?.message || "Failed to place order. Please try again."
      toast.error(message)
    } finally {
      setOrderLoading(false)
    }
  }

  const openRazorpayWindow = async (orderId, razorOrder, razorpayKeyId) => {
    try {
      await loadRazorpaySdk()
    } catch (error) {
      toast.error("Razorpay SDK not loaded. Please try again.")
      setOrderLoading(false)
      return
    }

    const keyToUse = razorpayKeyId || import.meta.env.VITE_RAZORPAY_KEY_ID
    if (!keyToUse) {
      toast.error("Razorpay key is missing. Contact support.")
      return
    }

    const options = {
      key: keyToUse,
      amount: razorOrder.amount,
      currency: 'INR',
      name: "Foodooza",
      description: "Food Delivery Order",
      order_id: razorOrder.id,
      handler: async function (response) {
        try {
          const result = await axios.post(`${serverUrl}/api/order/verify-payment`, {
            razorpay_payment_id: response.razorpay_payment_id,
            orderId
          }, { withCredentials: true })
          dispatch(addMyOrder(result.data))
          dispatch(clearCart())
          toast.success(scheduleOrder ? "Payment successful. Order scheduled!" : "Payment successful! Order placed")
          navigate("/order-placed")
        } catch (error) {
          toast.error("Payment verification failed. Please contact support.")
        }
      },
      modal: {
        ondismiss: function () {
          toast.info("Payment cancelled")
          setOrderLoading(false)
        }
      },
      theme: {
        color: '#ff4d2d'
      }
    }

    const rzp = new window.Razorpay(options)
    rzp.on('payment.failed', function (response) {
      toast.error("Payment failed: " + response.error.description)
      setOrderLoading(false)
    })
    rzp.open()
  }

  useEffect(() => {
    if (address && !selectedAddressId) {
      setAddressInput(address)
    }
  }, [address, selectedAddressId])

  useEffect(() => {
    fetchCheckoutData()
  }, [totalAmount, deliveryFee, manualCouponOverride])

  useEffect(() => {
    const defaultAddress = addresses.find((entry) => entry.isDefault)
    if (!defaultAddress || selectedAddressId) {
      return
    }
    handleSelectSavedAddress(defaultAddress)
  }, [addresses, selectedAddressId])

  const mapCenter = [
    Number.isFinite(location?.lat) ? location.lat : 22.5726,
    Number.isFinite(location?.lon) ? location.lon : 88.3639
  ]

  return (
    <div className={`min-h-screen px-3 py-3 sm:px-4 sm:py-5 ${isDark ? 'bg-[linear-gradient(180deg,#090f1f_0%,#10172a_45%,#0a1020_100%)]' : 'bg-[linear-gradient(180deg,#fff7f2_0%,#fffaf7_38%,#ffffff_100%)]'}`}>
      <div className='mx-auto flex w-full max-w-6xl flex-col gap-4'>
        <div className={sectionCardClass}>
          <div className={`px-4 py-4 sm:px-5 sm:py-5 ${isDark ? 'bg-[radial-gradient(circle_at_top_left,_rgba(255,120,82,0.16),_transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.02),rgba(255,255,255,0))]' : 'bg-[radial-gradient(circle_at_top_left,_rgba(255,120,82,0.22),_transparent_46%),linear-gradient(135deg,_#fff5ef,_#ffffff_62%)]'}`}>
            <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
              <div className='flex items-start gap-3 sm:gap-4'>
                <button
                  type='button'
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px] text-[#ff4d2d] shadow-sm transition ${isDark ? 'bg-white/10 hover:bg-white/15' : 'bg-white hover:bg-orange-50 ring-1 ring-orange-100'}`}
                  onClick={() => navigate("/cart")}
                >
                  <IoIosArrowRoundBack size={26} />
                </button>
                <div>
                  <p className='text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ff6b43]'>Final Step</p>
                  <h1 className={`mt-1 text-xl font-bold sm:text-2xl ${isDark ? 'text-white' : 'text-slate-900'}`}>Checkout</h1>
                  <p className={`mt-2 max-w-2xl text-sm leading-6 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
                    Confirm your address, choose how you want to pay, and place your order with a cleaner, faster checkout flow.
                  </p>
                </div>
              </div>

              <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
                <div className={`rounded-[20px] px-3.5 py-3 shadow-sm backdrop-blur ${isDark ? 'border border-white/10 bg-white/5' : 'border border-orange-100 bg-white/85'}`}>
                  <p className='text-[11px] font-semibold uppercase tracking-wide text-slate-400'>Cart Items</p>
                  <p className={`mt-1.5 text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{totalItems}</p>
                  <p className={`mt-1 text-sm ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>Ready for delivery</p>
                </div>
                <div className={`rounded-[20px] px-3.5 py-3 shadow-sm backdrop-blur ${isDark ? 'border border-white/10 bg-white/5' : 'border border-orange-100 bg-white/85'}`}>
                  <p className='text-[11px] font-semibold uppercase tracking-wide text-slate-400'>Payment</p>
                  <p className={`mt-1.5 text-lg font-bold capitalize ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {paymentMethod === "cod" ? "Cash" : paymentMethod === "online" ? "Online" : "Wallet"}
                  </p>
                  <p className={`mt-1 text-sm ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>Selected method</p>
                </div>
                <div className={`rounded-[20px] px-3.5 py-3 shadow-sm backdrop-blur ${isDark ? 'border border-white/10 bg-white/5' : 'border border-orange-100 bg-white/85'}`}>
                  <p className='text-[11px] font-semibold uppercase tracking-wide text-slate-400'>Payable</p>
                  <p className='mt-1.5 text-2xl font-bold text-[#ff4d2d]'>Rs {payableAmount}</p>
                  <p className={`mt-1 text-sm ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>{deliveryFee === 0 ? 'Free delivery unlocked' : 'Includes delivery fee'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className='space-y-4'>
            {hasSavedAddresses && (
              <section className={sectionCardClass}>
                <div className='p-4 sm:p-5'>
                  <div className='mb-4 flex items-center justify-between gap-3'>
                    <div>
                      <p className='text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ff6b43]'>Saved Places</p>
                      <h2 className={`mt-1 text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Choose a saved address</h2>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isDark ? 'bg-white/10 text-slate-300' : 'bg-orange-50 text-[#ff4d2d]'}`}>
                      {addresses.length} saved
                    </span>
                  </div>

                  <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                    {addresses.map((savedAddress) => (
                      <button
                        key={savedAddress._id}
                        className={`rounded-[18px] border p-3.5 text-left transition ${selectedAddressId === savedAddress._id
                          ? 'border-[#ff6b43] bg-[#ff6b43]/10 shadow-[0_16px_40px_rgba(255,107,67,0.15)]'
                          : isDark
                            ? 'border-white/10 bg-white/5 hover:border-[#ff6b43]/60'
                            : 'border-slate-200 bg-white hover:border-[#ff6b43]/40 hover:shadow-sm'
                          }`}
                        onClick={() => handleSelectSavedAddress(savedAddress)}
                      >
                        <div className='flex items-center justify-between gap-3'>
                          <div className='flex items-center gap-3'>
                            <span className='inline-flex h-10 w-10 items-center justify-center rounded-[18px] bg-[#fff1ea] text-[#ff4d2d]'>
                              <IoLocationSharp size={18} />
                            </span>
                            <div>
                              <p className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{savedAddress.label}</p>
                              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                {savedAddress.isDefault ? 'Default address' : 'Saved location'}
                              </p>
                            </div>
                          </div>
                          {savedAddress.isDefault && <span className='rounded-full bg-[#ff4d2d]/10 px-2.5 py-1 text-[11px] font-semibold text-[#ff4d2d]'>Default</span>}
                        </div>
                        <p className={`mt-3 text-sm leading-6 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{savedAddress.fullAddress}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            )}

            <section className={sectionCardClass}>
              <div className='p-4 sm:p-5'>
                <div className='mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between'>
                  <div>
                    <p className='text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ff6b43]'>Location</p>
                    <h2 className={`mt-1 flex items-center gap-2 text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      <IoLocationSharp className='text-[#ff4d2d]' />
                      Delivery Address
                    </h2>
                  </div>
                  <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>Search, pin, and save the exact drop point for a smoother handoff.</p>
                </div>

                <div className='flex flex-col gap-3 lg:flex-row'>
                  <div className='flex-1'>
                    <input
                      id="checkout-delivery-address"
                      name="deliveryAddress"
                      type="text"
                      className={inputClass}
                      placeholder='Enter your delivery address'
                      value={addressInput}
                      onChange={(e) => {
                        setAddressInput(e.target.value)
                        setSelectedAddressId("")
                      }}
                    />
                  </div>
                  <div className='flex gap-3'>
                    <button
                      className='inline-flex h-11 min-w-[52px] items-center justify-center rounded-[18px] bg-gradient-to-r from-[#ff6b43] to-[#ff4d2d] px-3.5 text-white shadow-lg shadow-orange-200 transition hover:brightness-105'
                      onClick={getLatLngByAddress}
                    >
                      <IoSearchOutline size={20} />
                    </button>
                    <button
                      className='inline-flex h-11 min-w-[52px] items-center justify-center rounded-[18px] bg-gradient-to-r from-sky-500 to-blue-500 px-3.5 text-white shadow-lg shadow-blue-200 transition hover:brightness-105 disabled:opacity-70'
                      onClick={getCurrentLocation}
                      disabled={geoLoading}
                    >
                      {geoLoading ? <ClipLoader size={14} color='white' /> : <TbCurrentLocation size={20} />}
                    </button>
                  </div>
                </div>

                <div className='mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[220px_minmax(0,1fr)]'>
                  <input
                    type="text"
                    value={addressLabel}
                    onChange={(e) => setAddressLabel(e.target.value)}
                    placeholder='Address label'
                    className={inputClass}
                  />
                  <label className={`${subtlePanelClass} flex items-center gap-3 px-4 py-3 text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} />
                    Save this address to my account for faster checkout next time
                  </label>
                </div>

                <div className={`mt-4 overflow-hidden rounded-[20px] border ${isDark ? 'border-white/10' : 'border-orange-100'}`}>
                  <div className='h-56 sm:h-60 w-full flex items-center justify-center'>
                    <MapContainer className={"w-full h-full"} center={mapCenter} zoom={16} maxZoom={20} scrollWheelZoom>
                      <EnhancedMapLayers />
                      <RecenterMap location={location} />
                      {Number.isFinite(location?.lat) && Number.isFinite(location?.lon) && (
                        <Marker position={[location.lat, location.lon]} draggable eventHandlers={{ dragend: onDragEnd }} />
                      )}
                    </MapContainer>
                  </div>
                </div>
              </div>
            </section>
            <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
              <section className={sectionCardClass}>
                <div className='p-4 sm:p-5'>
                  <div className='mb-4'>
                    <p className='text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ff6b43]'>Schedule</p>
                    <h2 className={`mt-1 flex items-center gap-2 text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      <FaClock className='text-[#ff4d2d]' />
                      Delivery Timing
                    </h2>
                  </div>
                  <label className={`${subtlePanelClass} flex items-start gap-3 px-3.5 py-3.5`}>
                    <input type="checkbox" checked={scheduleOrder} onChange={(e) => setScheduleOrder(e.target.checked)} className='mt-1' />
                    <div>
                      <p className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Deliver later within the next 24 hours</p>
                      <p className={`mt-1 text-sm ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>Choose a precise slot if you want this order to arrive later.</p>
                    </div>
                  </label>
                  {scheduleOrder && (
                    <input
                      type="datetime-local"
                      min={nowValue}
                      max={maxScheduleValue}
                      value={scheduledFor}
                      onChange={(e) => setScheduledFor(e.target.value)}
                      className={`mt-4 ${inputClass}`}
                    />
                  )}
                </div>
              </section>

              <section className={sectionCardClass}>
                <div className='p-4 sm:p-5'>
                  <div className='mb-4 flex items-center justify-between gap-3'>
                    <div>
                      <p className='text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ff6b43]'>Coupons</p>
                      <h2 className={`mt-1 text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Offers & savings</h2>
                    </div>
                    {bestCoupon && !manualCouponOverride && (
                      <span className='rounded-full bg-[#ff4d2d]/10 px-3 py-1 text-xs font-semibold text-[#ff4d2d]'>
                        Best auto-applied
                      </span>
                    )}
                  </div>

                  <div className='space-y-4'>
                    <div className='flex flex-col gap-3'>
                      <input
                        type="text"
                        value={manualCouponCode}
                        onChange={(e) => setManualCouponCode(e.target.value.toUpperCase())}
                        placeholder='Enter coupon code'
                        className={inputClass}
                      />
                      <div className='flex gap-3'>
                        <button className='flex-1 rounded-[18px] bg-gradient-to-r from-[#ff6b43] to-[#ff4d2d] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition hover:brightness-105' onClick={() => handleApplyManualCoupon()}>
                          Apply
                        </button>
                        <button
                          className={`flex-1 rounded-[18px] px-4 py-2.5 text-sm font-semibold transition ${isDark ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                          onClick={() => {
                            setManualCouponCode("")
                            setManualCouponOverride(false)
                            setAppliedCoupon(bestCoupon)
                          }}
                        >
                          Use Best
                        </button>
                      </div>
                    </div>

                    {activeCoupons.length > 0 && (
                      <div className='flex flex-wrap gap-2'>
                        {activeCoupons.map((coupon) => (
                          <button
                            key={coupon.code}
                            className={`rounded-full border px-3 py-2 text-sm font-medium transition ${appliedCoupon?.code === coupon.code
                              ? 'border-[#ff4d2d] bg-[#ff4d2d]/10 text-[#ff4d2d]'
                              : isDark
                                ? 'border-white/10 bg-white/5 text-slate-200 hover:border-[#ff4d2d]/40'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-[#ff4d2d]/40'
                              }`}
                            onClick={() => {
                              setManualCouponCode(coupon.code)
                              handleApplyManualCoupon(coupon.code)
                            }}
                          >
                            {coupon.code}
                          </button>
                        ))}
                      </div>
                    )}

                    {appliedCoupon && (
                      <div className={`rounded-[18px] border p-3.5 ${isDark ? 'border-[#ff6b43]/20 bg-[#ff6b43]/10' : 'border-orange-100 bg-orange-50'}`}>
                        <div className='flex items-center justify-between gap-3'>
                          <p className='font-semibold text-[#ff4d2d]'>{appliedCoupon.code}</p>
                          <span className='rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-emerald-600'>Save Rs {appliedCoupon.discount}</span>
                        </div>
                        <p className={`mt-2 text-sm leading-6 ${isDark ? 'text-slate-200' : 'text-slate-600'}`}>{appliedCoupon.description || appliedCoupon.message}</p>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </div>

            <section className={sectionCardClass}>
              <div className='p-4 sm:p-5'>
                <div className='mb-4'>
                  <p className='text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ff6b43]'>Payment</p>
                  <h2 className={`mt-1 text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Choose a payment method</h2>
                </div>

                <div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
                  <div
                    className={`${paymentCardBase} ${paymentMethod === "cod" ? 'border-[#ff6b43] bg-[#ff6b43]/10 shadow-[0_16px_40px_rgba(255,107,67,0.15)]' : ''} cursor-pointer p-3.5 transition`}
                    onClick={() => setPaymentMethod("cod")}
                  >
                    <div className='flex items-start justify-between gap-3'>
                      <span className='inline-flex h-10 w-10 items-center justify-center rounded-[18px] bg-green-100'>
                        <MdDeliveryDining className='text-green-600 text-2xl' />
                      </span>
                      {paymentMethod === "cod" && <span className='rounded-full bg-[#ff4d2d]/10 px-2.5 py-1 text-[11px] font-semibold text-[#ff4d2d]'>Selected</span>}
                    </div>
                    <p className={`mt-4 font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Cash on Delivery</p>
                    <p className={`mt-1 text-sm leading-6 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>Pay only when the order arrives at your doorstep.</p>
                  </div>

                  <div
                    className={`${paymentCardBase} ${paymentMethod === "online" ? 'border-[#ff6b43] bg-[#ff6b43]/10 shadow-[0_16px_40px_rgba(255,107,67,0.15)]' : ''} ${onlinePaymentEnabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'} p-3.5 transition`}
                    onClick={() => {
                      if (!onlinePaymentEnabled) {
                        toast.error(onlinePaymentReason || "Online payment is currently unavailable")
                        return
                      }
                      setPaymentMethod("online")
                    }}
                  >
                    <div className='flex items-start justify-between gap-3'>
                      <div className='flex gap-2'>
                        <span className='inline-flex h-10 w-10 items-center justify-center rounded-[18px] bg-blue-100'>
                          <FaCreditCard className='text-blue-700 text-xl' />
                        </span>
                        <span className='inline-flex h-10 w-10 items-center justify-center rounded-[18px] bg-purple-100'>
                          <FaMobileScreenButton className='text-purple-700 text-xl' />
                        </span>
                      </div>
                      {paymentMethod === "online" && <span className='rounded-full bg-[#ff4d2d]/10 px-2.5 py-1 text-[11px] font-semibold text-[#ff4d2d]'>Selected</span>}
                    </div>
                    <p className={`mt-4 font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Online Payment</p>
                    <p className={`mt-1 text-sm leading-6 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
                      {onlinePaymentEnabled ? "UPI, cards, and netbanking with instant confirmation." : (onlinePaymentReason || "Currently unavailable")}
                    </p>
                  </div>

                  <div
                    className={`${paymentCardBase} ${paymentMethod === "wallet" ? 'border-[#ff6b43] bg-[#ff6b43]/10 shadow-[0_16px_40px_rgba(255,107,67,0.15)]' : ''} ${walletDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} p-3.5 transition`}
                    onClick={() => {
                      if (walletDisabled) {
                        toast.error("Insufficient wallet balance")
                        return
                      }
                      setPaymentMethod("wallet")
                    }}
                  >
                    <div className='flex items-start justify-between gap-3'>
                      <span className='inline-flex h-10 w-10 items-center justify-center rounded-[18px] bg-emerald-100'>
                        <FaWallet className='text-emerald-700 text-xl' />
                      </span>
                      {paymentMethod === "wallet" && <span className='rounded-full bg-[#ff4d2d]/10 px-2.5 py-1 text-[11px] font-semibold text-[#ff4d2d]'>Selected</span>}
                    </div>
                    <p className={`mt-4 font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Wallet</p>
                    <p className={`mt-1 text-sm leading-6 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>Balance available: Rs {Number(walletBalance || 0).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </section>
            <section className={sectionCardClass}>
              <div className={`p-4 sm:p-5 ${isDark ? 'bg-[radial-gradient(circle_at_top_left,_rgba(255,120,82,0.14),_transparent_52%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))]' : 'bg-[radial-gradient(circle_at_top_left,_rgba(255,120,82,0.18),_transparent_52%),linear-gradient(180deg,#fff7f1,#ffffff)]'}`}>
                <div className='flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between'>
                  <div>
                    <p className='text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ff6b43]'>Order Summary</p>
                    <h2 className={`mt-1 text-xl font-bold sm:text-2xl ${isDark ? 'text-white' : 'text-slate-900'}`}>Ready to place your order</h2>
                    <p className={`mt-2 max-w-2xl text-sm leading-6 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>Review your dishes, delivery charges, and final payable amount before confirming checkout.</p>
                  </div>
                  <div className={`inline-flex self-start rounded-[18px] px-3.5 py-2.5 text-sm font-semibold ${isDark ? 'bg-white/10 text-slate-200' : 'bg-white text-slate-700 ring-1 ring-orange-100'}`}>
                    {totalItems} item{totalItems > 1 ? 's' : ''} • Rs {payableAmount}
                  </div>
                </div>
              </div>

              <div className='p-4 sm:p-5'>
                <div className='grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.9fr)_minmax(240px,0.8fr)]'>
                  <div className={subtlePanelClass}>
                    <div className='p-3.5 space-y-2.5'>
                      <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>Items in this order</p>
                      {cartItems.map((item, index) => (
                        <div key={index} className='flex items-start justify-between gap-3 rounded-[18px] border border-transparent bg-white/40 p-2.5 text-sm backdrop-blur-sm'>
                          <div className='min-w-0'>
                            <p className={`truncate font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.name}</p>
                            <p className={`${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Qty {item.quantity}</p>
                          </div>
                          <span className={`shrink-0 font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Rs {item.price * item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={subtlePanelClass}>
                    <div className='p-3.5 space-y-3'>
                      <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>Cost breakdown</p>
                      <div className='space-y-3'>
                        <div className='flex items-center justify-between text-sm'>
                          <span className={isDark ? 'text-slate-300' : 'text-slate-500'}>Subtotal</span>
                          <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Rs {totalAmount}</span>
                        </div>
                        <div className='flex items-center justify-between text-sm'>
                          <span className={isDark ? 'text-slate-300' : 'text-slate-500'}>Delivery Fee</span>
                          <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{deliveryFee === 0 ? "Free" : `Rs ${deliveryFee}`}</span>
                        </div>
                        <div className='flex items-center justify-between text-sm'>
                          <span className='text-emerald-500'>Coupon Discount</span>
                          <span className='font-semibold text-emerald-500'>- Rs {couponDiscount}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={`rounded-[20px] border p-4 ${isDark ? 'border-[#ff6b43]/20 bg-[#ff6b43]/10' : 'border-orange-100 bg-orange-50'}`}>
                    <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>Final total</p>
                    <p className='mt-2.5 text-4xl font-bold text-[#ff4d2d]'>Rs {payableAmount}</p>
                    <p className={`mt-2 text-sm leading-6 ${isDark ? 'text-slate-200' : 'text-slate-600'}`}>Inclusive of taxes and applicable discounts for this delivery.</p>
                    <button
                      className='mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[20px] bg-gradient-to-r from-[#ff6b43] to-[#ff4d2d] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60'
                      onClick={handlePlaceOrder}
                      disabled={orderLoading}
                    >
                      {orderLoading ? (
                        <><ClipLoader size={20} color='white' /> Processing...</>
                      ) : (
                        scheduleOrder
                          ? (paymentMethod === "online" ? "Pay & Schedule Order" : "Schedule Order")
                          : (paymentMethod === "online" ? "Pay & Place Order" : "Place Order")
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </section>
        </div>
      </div>
    </div>
  )
}

export default CheckOut
