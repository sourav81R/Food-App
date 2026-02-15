import React, { useState } from "react";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { serverUrl } from "../App";
import { ClipLoader } from "react-spinners";
import { useDispatch } from "react-redux";
import { setUserData } from "../redux/userSlice";
import { useToast } from "../context/ToastContext";
import { signInWithPopup, signOut as firebaseSignOut } from "firebase/auth";
import { auth, googleProvider } from "../config/firebase";

function SignUp() {
  const primaryColor = "#ff4d2d";
  const bgColor = "#fff9f6";
  const borderColor = "#ddd";

  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("user");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const toast = useToast();

  const validateForm = () => {
    if (!fullName.trim()) {
      toast.warning("Please enter your full name");
      return false;
    }
    if (!email.trim()) {
      toast.warning("Please enter your email");
      return false;
    }
    if (!mobile.trim()) {
      toast.warning("Please enter your mobile number");
      return false;
    }
    if (!password.trim() || password.length < 6) {
      toast.warning("Password must be at least 6 characters");
      return false;
    }
    return true;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const result = await axios.post(
        `${serverUrl}/api/auth/signup`,
        { fullName, email, password, mobile, role },
        { withCredentials: true }
      );
      dispatch(setUserData(result.data));
      toast.success("Account created successfully");
    } catch (error) {
      const message = error?.response?.data?.message || "Sign up failed. Please try again.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    if (!mobile.trim()) {
      toast.warning("Please enter mobile number for Google signup");
      return;
    }
    setGoogleLoading(true);
    try {
      const firebaseResult = await signInWithPopup(auth, googleProvider);
      const googleUser = firebaseResult?.user;
      const googleEmail = googleUser?.email;

      if (!googleEmail) {
        toast.error("Google account email not available");
        return;
      }

      const { data } = await axios.post(
        `${serverUrl}/api/auth/google-auth`,
        {
          fullName: googleUser?.displayName || fullName || "Google User",
          email: googleEmail,
          role,
          mobile,
        },
        { withCredentials: true }
      );

      dispatch(setUserData(data));
      toast.success("Account created with Google");
    } catch (error) {
      await firebaseSignOut(auth).catch(() => {});
      const firebaseMessage =
        error?.code === "auth/popup-closed-by-user"
          ? "Google popup was closed before completion"
          : error?.code === "auth/popup-blocked"
            ? "Popup blocked by browser. Allow popups and try again."
            : "Google sign up failed. Please try again.";
      const message = error?.response?.data?.message || firebaseMessage;
      toast.error(message);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6" style={{ backgroundColor: bgColor }}>
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 sm:p-8 border-[1px]" style={{ border: `1px solid ${borderColor}` }}>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 italic" style={{ color: primaryColor }}>
          PetPooja
        </h1>
        <p className="text-gray-600 mb-6 sm:mb-8 text-sm sm:text-base">Create your account to get started with delicious food deliveries</p>

        <div className="mb-4">
          <label htmlFor="fullName" className="block text-gray-700 font-medium mb-1 text-sm sm:text-base">
            Full Name
          </label>
          <input
            type="text"
            className="w-full border rounded-lg px-3 py-2.5 sm:py-2 focus:outline-none text-sm sm:text-base"
            placeholder="Enter your Full Name"
            style={{ border: `1px solid ${borderColor}` }}
            onChange={(e) => setFullName(e.target.value)}
            value={fullName}
            required
          />
        </div>

        <div className="mb-4">
          <label htmlFor="email" className="block text-gray-700 font-medium mb-1 text-sm sm:text-base">
            Email
          </label>
          <input
            type="email"
            className="w-full border rounded-lg px-3 py-2.5 sm:py-2 focus:outline-none text-sm sm:text-base"
            placeholder="Enter your Email"
            style={{ border: `1px solid ${borderColor}` }}
            onChange={(e) => setEmail(e.target.value)}
            value={email}
            required
          />
        </div>

        <div className="mb-4">
          <label htmlFor="mobile" className="block text-gray-700 font-medium mb-1 text-sm sm:text-base">
            Mobile
          </label>
          <input
            type="tel"
            className="w-full border rounded-lg px-3 py-2.5 sm:py-2 focus:outline-none text-sm sm:text-base"
            placeholder="Enter your Mobile Number"
            style={{ border: `1px solid ${borderColor}` }}
            onChange={(e) => setMobile(e.target.value)}
            value={mobile}
            required
          />
        </div>

        <div className="mb-4">
          <label htmlFor="password" className="block text-gray-700 font-medium mb-1 text-sm sm:text-base">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              className="w-full border rounded-lg px-3 py-2.5 sm:py-2 focus:outline-none pr-10 text-sm sm:text-base"
              placeholder="Enter your password"
              style={{ border: `1px solid ${borderColor}` }}
              onChange={(e) => setPassword(e.target.value)}
              value={password}
              required
            />
            <button className="absolute right-3 cursor-pointer top-1/2 -translate-y-1/2 text-gray-500" onClick={() => setShowPassword((prev) => !prev)}>
              {!showPassword ? <FaRegEye size={18} /> : <FaRegEyeSlash size={18} />}
            </button>
          </div>
        </div>

        <div className="mb-4">
          <label htmlFor="role" className="block text-gray-700 font-medium mb-1 text-sm sm:text-base">
            Role
          </label>
          <div className="flex gap-2">
            {["user", "owner", "deliveryBoy"].map((r) => (
              <button
                key={r}
                className="flex-1 border rounded-lg px-2 sm:px-3 py-2 text-center font-medium transition-colors cursor-pointer text-xs sm:text-sm"
                onClick={() => setRole(r)}
                style={
                  role === r
                    ? { backgroundColor: primaryColor, color: "white" }
                    : { border: `1px solid ${primaryColor}`, color: primaryColor }
                }
              >
                {r === "deliveryBoy" ? "Delivery" : r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <button className="w-full font-semibold py-2.5 sm:py-2 rounded-lg transition duration-200 bg-[#ff4d2d] text-white hover:bg-[#e64323] cursor-pointer text-sm sm:text-base" onClick={handleSignUp} disabled={loading}>
          {loading ? <ClipLoader size={20} color="white" /> : "Sign Up"}
        </button>

        <button className="w-full mt-4 flex items-center justify-center gap-2 border rounded-lg px-4 py-2.5 sm:py-2 transition cursor-pointer duration-200 border-gray-400 hover:bg-gray-100 text-sm sm:text-base" onClick={handleGoogleAuth} disabled={googleLoading}>
          {googleLoading ? (
            <ClipLoader size={20} color="#ff4d2d" />
          ) : (
            <>
              <FcGoogle size={20} />
              <span>Sign up with Google</span>
            </>
          )}
        </button>

        <p className="text-center mt-6 cursor-pointer text-sm sm:text-base" onClick={() => navigate("/signin")}>
          Already have an account? <span className="text-[#ff4d2d] hover:underline">Sign In</span>
        </p>
      </div>
    </div>
  );
}

export default SignUp;
