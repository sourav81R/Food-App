import jwt from "jsonwebtoken"
import User from "../models/user.model.js"
import { normalizeRole } from "../utils/roles.js"

export const protectRoute = async (req, res, next) => {
    try {
        const token = req.cookies.token
        if (!token) {
            return res.status(401).json({ message: "Unauthorized: token not found" })
        }

        const decodedToken = jwt.verify(token, process.env.JWT_SECRET)
        if (!decodedToken?.userId) {
            return res.status(401).json({ message: "Unauthorized: invalid token" })
        }

        const user = await User.findById(decodedToken.userId).select("_id role isSuspended")
        if (!user) {
            return res.status(401).json({ message: "Unauthorized" })
        }
        if (user.isSuspended) {
            res.clearCookie("token")
            return res.status(403).json({ message: "Your account is suspended. Contact admin." })
        }

        req.userId = user._id
        req.userRole = normalizeRole(user.role)
        next()
    } catch (error) {
        return res.status(401).json({ message: "Unauthorized" })
    }
}

export const authorizeRoles = (...allowedRoles) => {
    const normalizedAllowed = new Set(allowedRoles.map((role) => normalizeRole(role)))

    return async (req, res, next) => {
        try {
            if (!req.userId) {
                return res.status(401).json({ message: "Unauthorized" })
            }

            let userRole = req.userRole
            if (!userRole) {
                const user = await User.findById(req.userId).select("role")
                if (!user) {
                    return res.status(401).json({ message: "Unauthorized" })
                }
                userRole = normalizeRole(user.role)
                req.userRole = userRole
            }

            if (!normalizedAllowed.has(userRole)) {
                return res.status(403).json({ message: "Forbidden: access denied" })
            }

            next()
        } catch (error) {
            return res.status(500).json({ message: `role authorization error ${error}` })
        }
    }
}
