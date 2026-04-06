import User from "../models/user.model.js"

export const getWalletBalance = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select("walletBalance")
        if (!user) {
            return res.status(404).json({ message: "user not found" })
        }

        return res.status(200).json({
            walletBalance: Number(user.walletBalance || 0)
        })
    } catch (error) {
        return res.status(500).json({ message: `wallet balance error ${error.message}` })
    }
}

export const getWalletTransactions = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select("walletTransactions walletBalance")
        if (!user) {
            return res.status(404).json({ message: "user not found" })
        }

        const transactions = [...(user.walletTransactions || [])]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

        return res.status(200).json({
            walletBalance: Number(user.walletBalance || 0),
            transactions
        })
    } catch (error) {
        return res.status(500).json({ message: `wallet transactions error ${error.message}` })
    }
}
