import React, { useEffect, useState } from 'react'
import { IoIosArrowRoundBack } from "react-icons/io";
import { IoSearchOutline } from "react-icons/io5";
import { TbCurrentLocation } from "react-icons/tb";
import { IoLocationSharp } from "react-icons/io5";
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import { useDispatch, useSelector } from 'react-redux';
import "leaflet/dist/leaflet.css"
import { setAddress, setLocation } from '../redux/mapSlice';
import { MdDeliveryDining } from "react-icons/md";
import { FaCreditCard } from "react-icons/fa";
import axios from 'axios';
import { FaMobileScreenButton } from "react-icons/fa6";
import { useNavigate } from 'react-router-dom';
import { serverUrl } from '../App';
import { addMyOrder, setTotalAmount, clearCart } from '../redux/userSlice';
import { useToast } from '../context/ToastContext';
import { ClipLoader } from 'react-spinners';
function RecenterMap({ location }) {
  if (location.lat && location.lon) {
    const map = useMap()
    map.setView([location.lat, location.lon], 16, { animate: true })
  }
  return null

}

function CheckOut() {
  const { location, address } = useSelector(state => state.map)
  const { cartItems, totalAmount, userData } = useSelector(state => state.user)
  const [addressInput, setAddressInput] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("cod")
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const apiKey = import.meta.env.VITE_GEOAPIKEY
  const deliveryFee = totalAmount > 500 ? 0 : 40
  const AmountWithDeliveryFee = totalAmount + deliveryFee
  const toast = useToast()
  const [orderLoading, setOrderLoading] = useState(false)
  const [geoLoading, setGeoLoading] = useState(false)






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
      dispatch(setAddress(result?.data?.results[0].address_line2))
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

  const handlePlaceOrder = async () => {
    // Validation
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

    setOrderLoading(true)
    try {
      const result = await axios.post(`${serverUrl}/api/order/place-order`, {
        paymentMethod,
        deliveryAddress: {
          text: addressInput,
          latitude: location.lat,
          longitude: location.lon
        },
        totalAmount: AmountWithDeliveryFee,
        cartItems
      }, { withCredentials: true })

      if (paymentMethod == "cod") {
        dispatch(addMyOrder(result.data))
        dispatch(clearCart())
        toast.success("Order placed successfully! 🎉")
        navigate("/order-placed")
      } else {
        const orderId = result.data.orderId
        const razorOrder = result.data.razorOrder
        const razorpayKeyId = result.data.razorpayKeyId
        openRazorpayWindow(orderId, razorOrder, razorpayKeyId)
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
      console.log(error)
    } finally {
      setOrderLoading(false)
    }
  }

  const openRazorpayWindow = (orderId, razorOrder, razorpayKeyId) => {
    if (!window.Razorpay) {
      toast.error("Razorpay SDK not loaded. Please refresh the page.")
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
      name: "PetPooja",
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
          toast.success("Payment successful! Order placed 🎉")
          navigate("/order-placed")
        } catch (error) {
          toast.error("Payment verification failed. Please contact support.")
          console.log(error)
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
    setAddressInput(address)
  }, [address])

  const mapCenter = [
    Number.isFinite(location?.lat) ? location.lat : 22.5726,
    Number.isFinite(location?.lon) ? location.lon : 88.3639
  ]
  return (
    <div className='min-h-screen bg-[#fff9f6] flex items-center justify-center p-6'>
      <div className=' absolute top-[20px] left-[20px] z-[10]' onClick={() => navigate("/")}>
        <IoIosArrowRoundBack size={35} className='text-[#ff4d2d]' />
      </div>
      <div className='w-full max-w-[900px] bg-white rounded-2xl shadow-xl p-6 space-y-6'>
        <h1 className='text-2xl font-bold text-gray-800'>Checkout</h1>

        <section>
          <h2 className='text-lg font-semibold mb-2 flex items-center gap-2 text-gray-800'><IoLocationSharp className='text-[#ff4d2d]' /> Delivery Location</h2>
          <div className='flex gap-2 mb-3'>
            <label htmlFor="checkout-delivery-address" className='sr-only'>Delivery address</label>
            <input id="checkout-delivery-address" name="deliveryAddress" type="text" className='flex-1 border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff4d2d]' placeholder='Enter Your Delivery Address..' value={addressInput} onChange={(e) => setAddressInput(e.target.value)} />
            <button className='bg-[#ff4d2d] hover:bg-[#e64526] text-white px-3 py-2 rounded-lg flex items-center justify-center' onClick={getLatLngByAddress}><IoSearchOutline size={17} /></button>
            <button
              className='bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center justify-center disabled:opacity-70'
              onClick={getCurrentLocation}
              disabled={geoLoading}
            >
              {geoLoading ? <ClipLoader size={14} color='white' /> : <TbCurrentLocation size={17} />}
            </button>
          </div>
          <div className='rounded-xl border overflow-hidden'>
            <div className='h-64 w-full flex items-center justify-center'>
              <MapContainer
                className={"w-full h-full"}
                center={mapCenter}
                zoom={16}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <RecenterMap location={location} />
                {Number.isFinite(location?.lat) && Number.isFinite(location?.lon) && (
                  <Marker position={[location.lat, location.lon]} draggable eventHandlers={{ dragend: onDragEnd }} />
                )}


              </MapContainer>
            </div>
          </div>
        </section>

        <section>
          <h2 className='text-lg font-semibold mb-3 text-gray-800'>Payment Method</h2>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <div className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${paymentMethod === "cod" ? "border-[#ff4d2d] bg-orange-50 shadow" : "border-gray-200 hover:border-gray-300"
              }`} onClick={() => setPaymentMethod("cod")}>

              <span className='inline-flex h-10 w-10 items-center justify-center rounded-full bg-green-100'>
                <MdDeliveryDining className='text-green-600 text-xl' />
              </span>
              <div >
                <p className='font-medium text-gray-800'>Cash On Delivery</p>
                <p className='text-xs text-gray-500'>Pay when your food arrives</p>
              </div>

            </div>
            <div className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${paymentMethod === "online" ? "border-[#ff4d2d] bg-orange-50 shadow" : "border-gray-200 hover:border-gray-300"
              }`} onClick={() => setPaymentMethod("online")}>

              <span className='inline-flex h-10 w-10 items-center justify-center rounded-full bg-purple-100'>
                <FaMobileScreenButton className='text-purple-700 text-lg' />
              </span>
              <span className='inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-100'>
                <FaCreditCard className='text-blue-700 text-lg' />
              </span>
              <div>
                <p className='font-medium text-gray-800'>UPI / Credit / Debit Card</p>
                <p className='text-xs text-gray-500'>Pay Securely Online</p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className='text-lg font-semibold mb-3 text-gray-800'>Order Summary</h2>
          <div className='rounded-xl border bg-gray-50 p-4 space-y-2'>
            {cartItems.map((item, index) => (
              <div key={index} className='flex justify-between text-sm text-gray-700'>
                <span>{item.name} x {item.quantity}</span>
                <span>₹{item.price * item.quantity}</span>
              </div>

            ))}
            <hr className='border-gray-200 my-2' />
            <div className='flex justify-between font-medium text-gray-800'>
              <span>Subtotal</span>
              <span>{totalAmount}</span>
            </div>
            <div className='flex justify-between text-gray-700'>
              <span>Delivery Fee</span>
              <span>{deliveryFee == 0 ? "Free" : deliveryFee}</span>
            </div>
            <div className='flex justify-between text-lg font-bold text-[#ff4d2d] pt-2'>
              <span>Total</span>
              <span>{AmountWithDeliveryFee}</span>
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
            paymentMethod == "cod" ? "Place Order" : "Pay & Place Order"
          )}
        </button>

      </div>
    </div>
  )
}

export default CheckOut
