import jwt from "jsonwebtoken"
import User from "../models/user.model.js"
const isAuth=async (req,res,next) => {
    try {
        const token=req.cookies.token
        if(!token){
            return res.status(401).json({message:"Unauthorized: token not found"})
        }
        const decodeToken=jwt.verify(token,process.env.JWT_SECRET)
        if(!decodeToken){
 return res.status(401).json({message:"Unauthorized: invalid token"})
        }
        req.userId=decodeToken.userId
        const user = await User.findById(req.userId).select("isSuspended")
        if(!user){
            return res.status(401).json({message:"Unauthorized"})
        }
        if(user.isSuspended){
            res.clearCookie("token")
            return res.status(403).json({message:"Your account is suspended. Contact admin."})
        }
        next()
    } catch (error) {
         return res.status(401).json({message:"Unauthorized"})
    }
}

export default isAuth
