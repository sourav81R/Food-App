import React from 'react'
import { useState } from 'react';
import { FaRegEye } from "react-icons/fa";
import { FaRegEyeSlash } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { useNavigate } from 'react-router-dom';
import axios from "axios"
import { serverUrl } from '../App';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../../firebase';
import { ClipLoader } from 'react-spinners';
import { useDispatch } from 'react-redux';
import { setUserData } from '../redux/userSlice';
import { useToast } from '../context/ToastContext';

function SignIn() {
    const primaryColor = "#ff4d2d";
    const hoverColor = "#e64323";
    const bgColor = "#fff9f6";
    const borderColor = "#ddd";
    const [showPassword, setShowPassword] = useState(false)
    const navigate = useNavigate()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [googleLoading, setGoogleLoading] = useState(false)
    const dispatch = useDispatch()
    const toast = useToast()

    const handleSignIn = async () => {
        if (!email || !password) {
            toast.warning("Please enter email and password")
            return
        }
        setLoading(true)
        try {
            const result = await axios.post(`${serverUrl}/api/auth/signin`, {
                email, password
            }, { withCredentials: true })
            dispatch(setUserData(result.data))
            toast.success("Welcome back! 🎉")
            setLoading(false)
        } catch (error) {
            const message = error?.response?.data?.message || "Sign in failed. Please try again."
            toast.error(message)
            setLoading(false)
        }
    }

    const handleGoogleAuth = async () => {
        setGoogleLoading(true)
        try {
            const provider = new GoogleAuthProvider()
            const result = await signInWithPopup(auth, provider)
            const { data } = await axios.post(`${serverUrl}/api/auth/google-auth`, {
                email: result.user.email,
            }, { withCredentials: true })
            dispatch(setUserData(data))
            toast.success("Signed in with Google! 🎉")
        } catch (error) {
            if (error.code === 'auth/popup-closed-by-user') {
                toast.info("Sign in cancelled")
            } else {
                toast.error("Google sign in failed. Please try again.")
            }
            console.log(error)
        } finally {
            setGoogleLoading(false)
        }
    }

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSignIn()
        }
    }

    return (
        <div className='min-h-screen w-full flex items-center justify-center p-4 sm:p-6' style={{ backgroundColor: bgColor }}>
            <div className={`bg-white rounded-xl shadow-lg w-full max-w-md p-6 sm:p-8 border-[1px] `} style={{
                border: `1px solid ${borderColor}`
            }}>
                <h1
                    className="text-2xl sm:text-3xl font-bold mb-2 italic"
                    style={{ color: primaryColor }}
                >
                    PetPooja
                </h1>

                <p className='text-gray-600 mb-6 sm:mb-8 text-sm sm:text-base'>Sign In to your account to get started with delicious food deliveries
                </p>


                {/* email */}

                <div className='mb-4'>
                    <label htmlFor="email" className='block text-gray-700 font-medium mb-1 text-sm sm:text-base'>Email</label>
                    <input
                        type="email"
                        className='w-full border rounded-lg px-3 py-2.5 sm:py-2 focus:outline-none text-sm sm:text-base'
                        placeholder='Enter your Email'
                        style={{ border: `1px solid ${borderColor}` }}
                        onChange={(e) => setEmail(e.target.value)}
                        value={email}
                        onKeyPress={handleKeyPress}
                        required
                    />
                </div>
                {/* password*/}

                <div className='mb-4'>
                    <label htmlFor="password" className='block text-gray-700 font-medium mb-1 text-sm sm:text-base'>Password</label>
                    <div className='relative'>
                        <input
                            type={`${showPassword ? "text" : "password"}`}
                            className='w-full border rounded-lg px-3 py-2.5 sm:py-2 focus:outline-none pr-10 text-sm sm:text-base'
                            placeholder='Enter your password'
                            style={{ border: `1px solid ${borderColor}` }}
                            onChange={(e) => setPassword(e.target.value)}
                            value={password}
                            onKeyPress={handleKeyPress}
                            required
                        />
                        <button className='absolute right-3 cursor-pointer top-1/2 -translate-y-1/2 text-gray-500' onClick={() => setShowPassword(prev => !prev)}>
                            {!showPassword ? <FaRegEye size={18} /> : <FaRegEyeSlash size={18} />}
                        </button>
                    </div>
                </div>
                <div className='text-right mb-4 cursor-pointer text-[#ff4d2d] font-medium text-sm sm:text-base hover:underline' onClick={() => navigate("/forgot-password")}>
                    Forgot Password
                </div>


                <button
                    className={`w-full font-semibold py-2.5 sm:py-2 rounded-lg transition duration-200 bg-[#ff4d2d] text-white hover:bg-[#e64323] cursor-pointer text-sm sm:text-base`}
                    onClick={handleSignIn}
                    disabled={loading}
                >
                    {loading ? <ClipLoader size={20} color='white' /> : "Sign In"}
                </button>

                <button
                    className='w-full mt-4 flex items-center justify-center gap-2 border rounded-lg px-4 py-2.5 sm:py-2 transition cursor-pointer duration-200 border-gray-400 hover:bg-gray-100 text-sm sm:text-base'
                    onClick={handleGoogleAuth}
                    disabled={googleLoading}
                >
                    {googleLoading ? (
                        <ClipLoader size={20} color='#ff4d2d' />
                    ) : (
                        <>
                            <FcGoogle size={20} />
                            <span>Sign In with Google</span>
                        </>
                    )}
                </button>
                <p className='text-center mt-6 cursor-pointer text-sm sm:text-base' onClick={() => navigate("/signup")}>
                    Want to create a new account? <span className='text-[#ff4d2d] hover:underline'>Sign Up</span>
                </p>
            </div>
        </div>
    )
}

export default SignIn

