import User from "../models/user.model.js"

export const registerNotificationToken = async (req, res) => {
    try {
        const token = String(req.body?.token || "").trim()
        if (!token) {
            return res.status(400).json({ message: "token is required" })
        }

        const user = await User.findByIdAndUpdate(
            req.userId,
            { $addToSet: { fcmTokens: token } },
            { new: true }
        ).select("fcmTokens")

        if (!user) {
            return res.status(404).json({ message: "user not found" })
        }

        return res.status(200).json({
            message: "notification token registered",
            totalTokens: user.fcmTokens.length
        })
    } catch (error) {
        return res.status(500).json({ message: `notification token error ${error.message}` })
    }
}
