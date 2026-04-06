import User from "../models/user.model.js"
import bcrypt from "bcryptjs"
import genToken from "../utils/token.js"
import { sendOtpMail } from "../utils/mail.js"
import { ALL_SUPPORTED_ROLES } from "../utils/roles.js"

const sanitizeUser = (user) => {
    const safeUser = user?.toObject ? user.toObject() : { ...user }
    delete safeUser.password
    delete safeUser.resetOtp
    delete safeUser.otpExpires
    return safeUser
}

const normalizeEmail = (email = "") => String(email).trim().toLowerCase()

const normalizeMobile = (mobile = "") => String(mobile).replace(/\D/g, "")

const createFallbackMobile = () =>
    `9${Math.floor(Math.random() * 1_000_000_000).toString().padStart(9, "0")}`

const getCookieOptions = () => {
    const isProduction = process.env.NODE_ENV === "production"
    return {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000
    }
}

export const signUp=async (req,res) => {
    try {
        const {fullName,email,password,mobile,role}=req.body
        const normalizedEmail = normalizeEmail(email)
        const normalizedMobile = normalizeMobile(mobile)
        const normalizedRole=ALL_SUPPORTED_ROLES.includes(role) ? role : "user"
        if(!fullName?.trim() || !normalizedEmail || !password || !normalizedMobile){
            return res.status(400).json({message:"fullName, email, password and mobile are required."})
        }
        let user=await User.findOne({email:normalizedEmail})
        if(user){
            return res.status(400).json({message:"User Already exist."})
        }
        if(password.length<6){
            return res.status(400).json({message:"password must be at least 6 characters."})
        }
        if(normalizedMobile.length<10){
            return res.status(400).json({message:"mobile no must be at least 10 digits."})
        }
     
        const hashedPassword=await bcrypt.hash(password,10)
        user=await User.create({
            fullName:String(fullName).trim(),
            email:normalizedEmail,
            role:normalizedRole,
            mobile:normalizedMobile,
            password:hashedPassword
        })

        const token=await genToken(user._id)
        res.cookie("token", token, getCookieOptions())
  
        return res.status(201).json(sanitizeUser(user))

    } catch (error) {
        return res.status(500).json({message:`sign up error ${error.message}`})
    }
}

export const signIn=async (req,res) => {
    try {
        const {email,password}=req.body
        const normalizedEmail = normalizeEmail(email)
        const user=await User.findOne({email:normalizedEmail})
        if(!user){
            return res.status(400).json({message:"User does not exist."})
        }
        if(user.isSuspended){
            res.clearCookie("token", getCookieOptions())
            return res.status(403).json({message:"Your account is suspended. Contact admin."})
        }
        if(!user.password){
            return res.status(400).json({message:"This account uses Google sign-in. Please continue with Google."})
        }
        
     const isMatch=await bcrypt.compare(password,user.password)
     if(!isMatch){
         return res.status(400).json({message:"incorrect Password"})
     }

        const token=await genToken(user._id)
        res.cookie("token", token, getCookieOptions())
  
        return res.status(200).json(sanitizeUser(user))

    } catch (error) {
        return res.status(500).json({message:`sign In error ${error.message}`})
    }
}

export const signOut=async (req,res) => {
    try {
        res.clearCookie("token", getCookieOptions())
return res.status(200).json({message:"log out successfully"})
    } catch (error) {
        return res.status(500).json({message:`sign out error ${error.message}`})
    }
}

export const sendOtp=async (req,res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body?.email)
    const user=await User.findOne({email:normalizedEmail})
    if(!user){
       return res.status(400).json({message:"User does not exist."})
    }
    const otp=Math.floor(1000 + Math.random() * 9000).toString()
    user.resetOtp=otp
    user.otpExpires=Date.now()+5*60*1000
    user.isOtpVerified=false
    await user.save()
    await sendOtpMail(normalizedEmail,otp)
    return res.status(200).json({message:"otp sent successfully"})
  } catch (error) {
     console.error("sendOtp error:", error.message)
     return res.status(500).json({message:`Unable to send OTP: ${error.message}`})
  }  
}

export const verifyOtp=async (req,res) => {
    try {
        const {email,otp}=req.body
        const normalizedEmail = normalizeEmail(email)
        const user=await User.findOne({email:normalizedEmail})
        if(!user || user.resetOtp!=otp || user.otpExpires<Date.now()){
            return res.status(400).json({message:"invalid/expired otp"})
        }
        user.isOtpVerified=true
        user.resetOtp=undefined
        user.otpExpires=undefined
        await user.save()
        return res.status(200).json({message:"otp verify successfully"})
    } catch (error) {
         return res.status(500).json({message:`verify otp error ${error.message}`})
    }
}

export const resetPassword=async (req,res) => {
    try {
        const {email,newPassword}=req.body
        const normalizedEmail = normalizeEmail(email)
        const user=await User.findOne({email:normalizedEmail})
    if(!user || !user.isOtpVerified){
       return res.status(400).json({message:"otp verification required"})
    }
    const hashedPassword=await bcrypt.hash(newPassword,10)
    user.password=hashedPassword
    user.isOtpVerified=false
    await user.save()
     return res.status(200).json({message:"password reset successfully"})
    } catch (error) {
         return res.status(500).json({message:`reset password error ${error.message}`})
    }
}

export const googleAuth=async (req,res) => {
    try {
        const {fullName,email,mobile,role}=req.body
        const normalizedEmail = normalizeEmail(email)
        if(!normalizedEmail){
            return res.status(400).json({message:"Email is required for Google authentication."})
        }
        let user=await User.findOne({email:normalizedEmail})
        if(!user){
            const normalizedRole=ALL_SUPPORTED_ROLES.includes(role) ? role : "user"
            const safeFullName=(fullName && fullName.trim()) || email.split("@")[0] || "Google User"
            const cleanedMobile=normalizeMobile(mobile)
            const safeMobile=cleanedMobile.length>=10
                ? cleanedMobile.slice(-10)
                : createFallbackMobile()

            user=await User.create({
                fullName:safeFullName,
                email:normalizedEmail,
                mobile:safeMobile,
                role:normalizedRole
            })
        } else {
            let shouldSave = false
            if (!user.fullName && fullName?.trim()) {
                user.fullName = fullName.trim()
                shouldSave = true
            }
            if ((!user.mobile || normalizeMobile(user.mobile).length < 10)) {
                const cleanedMobile = normalizeMobile(mobile)
                user.mobile = cleanedMobile.length >= 10 ? cleanedMobile.slice(-10) : createFallbackMobile()
                shouldSave = true
            }
            if (shouldSave) {
                await user.save()
            }
        }
        if(user.isSuspended){
            res.clearCookie("token", getCookieOptions())
            return res.status(403).json({message:"Your account is suspended. Contact admin."})
        }

        const token=await genToken(user._id)
        res.cookie("token", token, getCookieOptions())
  
        return res.status(200).json(sanitizeUser(user))


    } catch (error) {
         if (error?.code === 11000) {
            const normalizedEmail = normalizeEmail(req.body?.email)
            const existingUser = normalizedEmail
                ? await User.findOne({ email: normalizedEmail })
                : null

            if (existingUser) {
                if(existingUser.isSuspended){
                    res.clearCookie("token", getCookieOptions())
                    return res.status(403).json({message:"Your account is suspended. Contact admin."})
                }

                const token=await genToken(existingUser._id)
                res.cookie("token", token, getCookieOptions())
                return res.status(200).json(sanitizeUser(existingUser))
            }
         }
         return res.status(500).json({message:`googleAuth error ${error.message}`})
    }
}
