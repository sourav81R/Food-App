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

let razorpaySdkPromise = null

const loadRazorpaySdk = () => {
  if (window.Razorpay) {
    return Promise.resolve(true)
  }

  if (razorpaySdkPromise) {
    return razorpaySdkPromise
  }

  razorpaySdkPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[data-razorpay-sdk="true"]')
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true), { once: true })
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Razorpay SDK')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.dataset.razorpaySdk = 'true'
    script.onload = () => resolve(true)
    script.onerror = () => reject(new Error('Failed to load Razorpay SDK'))
    document.body.appendChild(script)
  }).catch((error) => {
    razorpaySdkPromise = null
    throw error
  })

  return razorpaySdkPromise
}

function RecenterMap({ location }) {
  if (location.lat && location.lon) {
    const map = useMap()
    map.setView([location.lat, location.lon], 16, { animate: true })
  }
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
    <div className={`min-h-screen flex items-center justify-center p-3 sm:p-6 pt-16 sm:pt-6 ${isDark ? 'bg-[#1a1a2e]' : 'bg-[#fff9f6]'}`}>
      <div className={`fixed top-3 left-3 sm:top-[20px] sm:left-[20px] z-[20] rounded-full p-1 shadow-sm cursor-pointer ${isDark ? 'bg-[#16213e]' : 'bg-white/90'}`} onClick={() => navigate("/")}>
        <IoIosArrowRoundBack size={35} className='text-[#ff4d2d]' />
      </div>
      <div className={`w-full max-w-[980px] rounded-2xl shadow-xl p-4 sm:p-6 space-y-6 ${isDark ? 'bg-[#16213e] text-white' : 'bg-white'}`}>
        <h1 className='text-2xl font-bold'>Checkout</h1>

        {addresses.length > 0 && (
          <section>
            <h2 className='text-lg font-semibold mb-3'>Saved Addresses</h2>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              {addresses.map((savedAddress) => (
                <button
                  key={savedAddress._id}
                  className={`rounded-xl border p-4 text-left transition ${selectedAddressId === savedAddress._id ? 'border-[#ff4d2d] bg-[#ff4d2d]/10' : isDark ? 'border-[#374151] hover:border-[#ff4d2d]/60' : 'border-gray-200 hover:border-[#ff4d2d]/40'}`}
                  onClick={() => handleSelectSavedAddress(savedAddress)}
                >
                  <div className='flex items-center justify-between'>
                    <p className='font-semibold'>{savedAddress.label}</p>
                    {savedAddress.isDefault && <span className='text-xs text-[#ff4d2d] font-semibold'>Default</span>}
                  </div>
                  <p className={`text-sm mt-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{savedAddress.fullAddress}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className='text-lg font-semibold mb-2 flex items-center gap-2'><IoLocationSharp className='text-[#ff4d2d]' /> Delivery Location</h2>
          <div className='flex flex-col sm:flex-row gap-2 mb-3'>
            <input id="checkout-delivery-address" name="deliveryAddress" type="text" className={`flex-1 border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff4d2d] ${isDark ? 'bg-[#0f3460] border-[#374151]' : 'border-gray-300'}`} placeholder='Enter Your Delivery Address..' value={addressInput} onChange={(e) => {
              setAddressInput(e.target.value)
              setSelectedAddressId("")
            }} />
            <div className='flex gap-2'>
              <button className='bg-[#ff4d2d] hover:bg-[#e64526] text-white px-3 py-2 rounded-lg flex-1 sm:flex-none flex items-center justify-center' onClick={getLatLngByAddress}><IoSearchOutline size={17} /></button>
              <button
                className='bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg flex-1 sm:flex-none flex items-center justify-center disabled:opacity-70'
                onClick={getCurrentLocation}
                disabled={geoLoading}
              >
                {geoLoading ? <ClipLoader size={14} color='white' /> : <TbCurrentLocation size={17} />}
              </button>
            </div>
          </div>
          <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3'>
            <input
              type="text"
              value={addressLabel}
              onChange={(e) => setAddressLabel(e.target.value)}
              placeholder='Address label'
              className={`rounded-lg border px-3 py-2 text-sm ${isDark ? 'bg-[#0f3460] border-[#374151]' : 'border-gray-300'}`}
            />
            <label className={`sm:col-span-2 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${isDark ? 'border-[#374151] bg-[#0f3460]' : 'border-gray-200 bg-gray-50'}`}>
              <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} />
              Save this address to my account
            </label>
          </div>
          <div className='rounded-xl border overflow-hidden'>
            <div className='h-56 sm:h-64 w-full flex items-center justify-center'>
              <MapContainer className={"w-full h-full"} center={mapCenter} zoom={16} maxZoom={20} scrollWheelZoom>
                <EnhancedMapLayers />
                <RecenterMap location={location} />
                {Number.isFinite(location?.lat) && Number.isFinite(location?.lon) && (
                  <Marker position={[location.lat, location.lon]} draggable eventHandlers={{ dragend: onDragEnd }} />
                )}
              </MapContainer>
            </div>
          </div>
        </section>

        <section>
          <h2 className='text-lg font-semibold mb-3 flex items-center gap-2'><FaClock className='text-[#ff4d2d]' /> Schedule Order</h2>
          <div className='space-y-3'>
            <label className={`flex items-center gap-2 rounded-xl border p-4 ${isDark ? 'border-[#374151]' : 'border-gray-200'}`}>
              <input type="checkbox" checked={scheduleOrder} onChange={(e) => setScheduleOrder(e.target.checked)} />
              Deliver later within the next 24 hours
            </label>
            {scheduleOrder && (
              <input
                type="datetime-local"
                min={nowValue}
                max={maxScheduleValue}
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                className={`w-full rounded-xl border px-4 py-3 ${isDark ? 'bg-[#0f3460] border-[#374151]' : 'border-gray-300'}`}
              />
            )}
          </div>
        </section>

        <section>
          <h2 className='text-lg font-semibold mb-3'>Payment Method</h2>
          <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
            <div className={`flex items-start gap-3 rounded-xl border p-4 transition cursor-pointer ${paymentMethod === "cod" ? "border-[#ff4d2d] bg-orange-50 text-gray-800" : isDark ? "border-[#374151]" : "border-gray-200"}`} onClick={() => setPaymentMethod("cod")}>
              <span className='inline-flex h-10 w-10 items-center justify-center rounded-full bg-green-100'>
                <MdDeliveryDining className='text-green-600 text-xl' />
              </span>
              <div>
                <p className='font-medium'>Cash On Delivery</p>
                <p className='text-xs opacity-75'>Pay when your food arrives</p>
              </div>
            </div>
            <div
              className={`flex items-start gap-3 rounded-xl border p-4 transition ${paymentMethod === "online" ? "border-[#ff4d2d] bg-orange-50 text-gray-800" : isDark ? "border-[#374151]" : "border-gray-200"} ${onlinePaymentEnabled ? "cursor-pointer" : "opacity-60 cursor-not-allowed"}`}
              onClick={() => {
                if (!onlinePaymentEnabled) {
                  toast.error(onlinePaymentReason || "Online payment is currently unavailable")
                  return
                }
                setPaymentMethod("online")
              }}
            >
              <span className='inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-100'>
                <FaCreditCard className='text-blue-700 text-lg' />
              </span>
              <span className='inline-flex h-10 w-10 items-center justify-center rounded-full bg-purple-100'>
                <FaMobileScreenButton className='text-purple-700 text-lg' />
              </span>
              <div>
                <p className='font-medium'>Online Payment</p>
                <p className='text-xs opacity-75'>{onlinePaymentEnabled ? "UPI / Card / Netbanking" : (onlinePaymentReason || "Unavailable")}</p>
              </div>
            </div>
            <div
              className={`flex items-start gap-3 rounded-xl border p-4 transition ${paymentMethod === "wallet" ? "border-[#ff4d2d] bg-orange-50 text-gray-800" : isDark ? "border-[#374151]" : "border-gray-200"} ${walletDisabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
              onClick={() => {
                if (walletDisabled) {
                  toast.error("Insufficient wallet balance")
                  return
                }
                setPaymentMethod("wallet")
              }}
            >
              <span className='inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100'>
                <FaWallet className='text-emerald-700 text-lg' />
              </span>
              <div>
                <p className='font-medium'>Pay with Wallet</p>
                <p className='text-xs opacity-75'>Balance: Rs {Number(walletBalance || 0).toFixed(2)}</p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className='flex items-center justify-between mb-3'>
            <h2 className='text-lg font-semibold'>Coupons</h2>
            {bestCoupon && !manualCouponOverride && (
              <span className='inline-flex items-center rounded-full bg-[#ff4d2d]/10 px-3 py-1 text-xs font-semibold text-[#ff4d2d]'>
                Best coupon auto-applied
              </span>
            )}
          </div>
          <div className='space-y-3'>
            <div className='flex flex-col sm:flex-row gap-2'>
              <input
                type="text"
                value={manualCouponCode}
                onChange={(e) => setManualCouponCode(e.target.value.toUpperCase())}
                placeholder='Enter coupon code'
                className={`flex-1 rounded-lg border px-3 py-2 ${isDark ? 'bg-[#0f3460] border-[#374151]' : 'border-gray-300'}`}
              />
              <button className='bg-[#ff4d2d] text-white px-4 py-2 rounded-lg' onClick={() => handleApplyManualCoupon()}>Apply</button>
              <button className={`px-4 py-2 rounded-lg ${isDark ? 'bg-[#0f3460]' : 'bg-gray-100'}`} onClick={() => {
                setManualCouponCode("")
                setManualCouponOverride(false)
                setAppliedCoupon(bestCoupon)
              }}>Use Best</button>
            </div>
            {activeCoupons.length > 0 && (
              <div className='flex flex-wrap gap-2'>
                {activeCoupons.map((coupon) => (
                  <button
                    key={coupon.code}
                    className={`rounded-full border px-3 py-1.5 text-sm ${appliedCoupon?.code === coupon.code ? 'border-[#ff4d2d] text-[#ff4d2d]' : isDark ? 'border-[#374151]' : 'border-gray-200'}`}
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
              <div className={`rounded-xl border p-4 ${isDark ? 'border-[#374151] bg-[#0f3460]' : 'border-orange-100 bg-orange-50'}`}>
                <p className='font-semibold text-[#ff4d2d]'>{appliedCoupon.code}</p>
                <p className={`text-sm mt-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{appliedCoupon.description || appliedCoupon.message}</p>
                <p className='text-sm mt-2'>Discount: Rs {appliedCoupon.discount}</p>
              </div>
            )}
          </div>
        </section>

        <section>
          <h2 className='text-lg font-semibold mb-3'>Order Summary</h2>
          <div className={`rounded-xl border p-4 space-y-2 ${isDark ? 'border-[#374151] bg-[#0f3460]' : 'bg-gray-50'}`}>
            {cartItems.map((item, index) => (
              <div key={index} className='flex justify-between gap-3 text-sm'>
                <span className='truncate'>{item.name} x {item.quantity}</span>
                <span className='whitespace-nowrap'>Rs {item.price * item.quantity}</span>
              </div>
            ))}
            <hr className='border-gray-200 my-2' />
            <div className='flex justify-between font-medium'>
              <span>Subtotal</span>
              <span>Rs {totalAmount}</span>
            </div>
            <div className='flex justify-between text-sm'>
              <span>Delivery Fee</span>
              <span>{deliveryFee === 0 ? "Free" : `Rs ${deliveryFee}`}</span>
            </div>
            <div className='flex justify-between text-sm text-green-500'>
              <span>Coupon Discount</span>
              <span>- Rs {couponDiscount}</span>
            </div>
            <div className='flex justify-between text-lg font-bold text-[#ff4d2d] pt-2'>
              <span>Total</span>
              <span>Rs {payableAmount}</span>
            </div>
          </div>
        </section>

        <button
          className='w-full bg-[#ff4d2d] hover:bg-[#e64526] text-white py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
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
  )
}

export default CheckOut
