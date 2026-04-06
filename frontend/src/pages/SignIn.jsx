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

function SignIn() {
  const primaryColor = "#ff4d2d";
  const bgColor = "#fff9f6";
  const borderColor = "#ddd";

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const toast = useToast();

  const handleSignIn = async () => {
    if (!email || !password) {
      toast.warning("Please enter email and password");
      return;
    }

    setLoading(true);
    try {
      const result = await axios.post(
        `${serverUrl}/api/auth/signin`,
        { email, password },
        { withCredentials: true }
      );
      dispatch(setUserData(result.data));
      toast.success("Welcome back");
    } catch (error) {
      const message = error?.response?.data?.message || "Sign in failed. Please try again.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
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
          email: googleEmail,
          fullName: googleUser?.displayName || "",
          mobile: googleUser?.phoneNumber || "",
        },
        { withCredentials: true }
      );

      dispatch(setUserData(data));
      toast.success("Signed in with Google");
    } catch (error) {
      await firebaseSignOut(auth).catch(() => {});
      const firebaseMessage =
        error?.code === "auth/popup-closed-by-user"
          ? "Google popup was closed before completion"
          : error?.code === "auth/popup-blocked"
            ? "Popup blocked by browser. Allow popups and try again."
            : "Google sign in failed. Please try again.";
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
          Foodooza
        </h1>

        <p className="text-gray-600 mb-6 sm:mb-8 text-sm sm:text-base">Sign In to your account to get started with delicious food deliveries</p>

        <form
          autoComplete="off"
          onSubmit={(e) => {
            e.preventDefault();
            handleSignIn();
          }}
        >
          <input type="text" name="fake-username" autoComplete="username" className="hidden" tabIndex={-1} />
          <input type="password" name="fake-password" autoComplete="new-password" className="hidden" tabIndex={-1} />

          <div className="mb-4">
            <label htmlFor="signin-email" className="block text-gray-700 font-medium mb-1 text-sm sm:text-base">
              Email
            </label>
            <input
              id="signin-email"
              name="signin_email_no_autofill"
              type="email"
              className="w-full border rounded-lg px-3 py-2.5 sm:py-2 focus:outline-none text-sm sm:text-base"
              placeholder="Enter your Email"
              style={{ border: `1px solid ${borderColor}` }}
              onChange={(e) => setEmail(e.target.value)}
              value={email}
              autoComplete="off"
              spellCheck={false}
              data-lpignore="true"
              data-1p-ignore="true"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="signin-password" className="block text-gray-700 font-medium mb-1 text-sm sm:text-base">
              Password
            </label>
            <div className="relative">
              <input
                id="signin-password"
                name="signin_password_no_autofill"
                type={showPassword ? "text" : "password"}
                className="w-full border rounded-lg px-3 py-2.5 sm:py-2 focus:outline-none pr-10 text-sm sm:text-base"
                placeholder="Enter your password"
                style={{ border: `1px solid ${borderColor}` }}
                onChange={(e) => setPassword(e.target.value)}
                value={password}
                autoComplete="new-password"
                data-lpignore="true"
                data-1p-ignore="true"
                required
              />
              <button
                type="button"
                className="absolute right-3 cursor-pointer top-1/2 -translate-y-1/2 text-gray-500"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {!showPassword ? <FaRegEye size={18} /> : <FaRegEyeSlash size={18} />}
              </button>
            </div>
          </div>

          <div className="text-right mb-4 cursor-pointer text-[#ff4d2d] font-medium text-sm sm:text-base hover:underline" onClick={() => navigate("/forgot-password")}>
            Forgot Password
          </div>

          <button type="submit" className="w-full font-semibold py-2.5 sm:py-2 rounded-lg transition duration-200 bg-[#ff4d2d] text-white hover:bg-[#e64323] cursor-pointer text-sm sm:text-base" disabled={loading}>
            {loading ? <ClipLoader size={20} color="white" /> : "Sign In"}
          </button>
        </form>

        <button className="w-full mt-4 flex items-center justify-center gap-2 border rounded-lg px-4 py-2.5 sm:py-2 transition cursor-pointer duration-200 border-gray-400 hover:bg-gray-100 text-sm sm:text-base" onClick={handleGoogleAuth} disabled={googleLoading}>
          {googleLoading ? (
            <ClipLoader size={20} color="#ff4d2d" />
          ) : (
            <>
              <FcGoogle size={20} />
              <span>Sign In with Google</span>
            </>
          )}
        </button>

        <p className="text-center mt-6 cursor-pointer text-sm sm:text-base" onClick={() => navigate("/signup")}>
          Want to create a new account? <span className="text-[#ff4d2d] hover:underline">Sign Up</span>
        </p>
      </div>
    </div>
  );
}

export default SignIn;
