import User from "../models/user.model.js"

const isAdmin = async (req, res, next) => {
    try {
        const user = await User.findById(req.userId).select("role")
        if (!user) {
            return res.status(401).json({ message: "Unauthorized" })
        }
        if (user.role !== "admin") {
            return res.status(403).json({ message: "Forbidden: admin access required" })
        }
        next()
    } catch (error) {
        return res.status(500).json({ message: `admin auth error ${error}` })
    }
}

export default isAdmin
