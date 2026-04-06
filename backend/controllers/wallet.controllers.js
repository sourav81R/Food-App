import RazorPay from "razorpay"
import User from "../models/user.model.js"
import { creditWallet } from "../utils/wallet.js"

const SAMPLE_KEY_IDS = new Set([
    "rzp_test_1DP5mmOlF5G5ag",
    "rzp_test_xxxxxxxxxxxxxx"
])
const SAMPLE_SECRETS = new Set([
    "qwertyui",
    "your_razorpay_secret"
])

const normalizeEnvValue = (value = "") =>
    String(value).trim().replace(/^['"]|['"]$/g, "")

const getRazorpayClient = () => {
    const keyId = normalizeEnvValue(process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_API_KEY || "")
    const keySecret = normalizeEnvValue(process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_API_SECRET || "")

    if (!keyId || !keySecret) {
        return {
            error: "Razorpay is not configured on server. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env"
        }
    }

    if (SAMPLE_KEY_IDS.has(keyId) || SAMPLE_SECRETS.has(keySecret)) {
        return {
            error: "Razorpay is using sample credentials. Replace RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET with real Dashboard API keys."
        }
    }

    return {
        client: new RazorPay({
            key_id: keyId,
            key_secret: keySecret
        }),
        keyId
    }
}

const normalizeTopupAmount = (amount) => {
    const parsed = Number(amount)
    if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error("Enter a valid wallet top-up amount")
    }

    const rounded = Number(parsed.toFixed(2))
    if (rounded < 1) {
        throw new Error("Minimum wallet top-up amount is Rs 1")
    }
    if (rounded > 50000) {
        throw new Error("Maximum wallet top-up amount is Rs 50000")
    }

    return rounded
}

const buildWalletResponse = (user) => ({
    walletBalance: Number(user?.walletBalance || 0),
    transactions: [...(user?.walletTransactions || [])]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
})

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

export const createWalletTopupOrder = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select("_id fullName email mobile")
        if (!user) {
            return res.status(404).json({ message: "user not found" })
        }

        let amount = 0
        try {
            amount = normalizeTopupAmount(req.body?.amount)
        } catch (error) {
            return res.status(400).json({ message: error.message })
        }

        const { client, error, keyId } = getRazorpayClient()
        if (error) {
            return res.status(503).json({ message: error })
        }

        let razorOrder
        try {
            razorOrder = await client.orders.create({
                amount: Math.round(amount * 100),
                currency: "INR",
                receipt: `wt_${String(req.userId).slice(-8)}_${Date.now()}`,
                notes: {
                    userId: String(req.userId),
                    purpose: "wallet_topup"
                }
            })
        } catch (razorpayError) {
            const providerStatus = razorpayError?.statusCode
            const statusCode = providerStatus === 401 ? 502 : (providerStatus || 502)
            const description = providerStatus === 401
                ? "Razorpay authentication failed. Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET."
                : (razorpayError?.error?.description || razorpayError?.message || "Failed to create wallet top-up order")
            return res.status(statusCode).json({ message: description })
        }

        return res.status(200).json({
            razorOrder,
            razorpayKeyId: keyId,
            amount,
            customer: {
                name: user.fullName || "Foodooza User",
                email: user.email || "",
                contact: user.mobile || ""
            }
        })
    } catch (error) {
        return res.status(500).json({ message: `wallet top-up order error ${error.message}` })
    }
}

export const verifyWalletTopup = async (req, res) => {
    try {
        const { razorpay_payment_id, razorpay_order_id } = req.body
        if (!razorpay_payment_id || !razorpay_order_id) {
            return res.status(400).json({ message: "razorpay_payment_id and razorpay_order_id are required" })
        }

        const { client, error } = getRazorpayClient()
        if (error) {
            return res.status(503).json({ message: error })
        }

        let payment
        try {
            payment = await client.payments.fetch(razorpay_payment_id)
        } catch (razorpayError) {
            const providerStatus = razorpayError?.statusCode
            const statusCode = providerStatus === 401 ? 502 : (providerStatus || 502)
            const description = providerStatus === 401
                ? "Razorpay authentication failed. Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET."
                : (razorpayError?.error?.description || razorpayError?.message || "Failed to verify wallet top-up payment")
            return res.status(statusCode).json({ message: description })
        }

        if (!payment || payment.status !== "captured") {
            return res.status(400).json({ message: "payment not captured" })
        }
        if (payment.order_id !== razorpay_order_id) {
            return res.status(400).json({ message: "payment does not belong to this wallet top-up order" })
        }

        const user = await User.findById(req.userId).select("walletBalance walletTransactions")
        if (!user) {
            return res.status(404).json({ message: "user not found" })
        }

        const alreadyCredited = (user.walletTransactions || []).some((transaction) =>
            transaction?.direction === "credit" &&
            transaction?.metadata?.purpose === "wallet_topup" &&
            transaction?.metadata?.razorpayPaymentId === razorpay_payment_id
        )

        if (alreadyCredited) {
            return res.status(200).json({
                message: "Wallet already credited for this payment",
                ...buildWalletResponse(user)
            })
        }

        const creditedUser = await creditWallet({
            userId: req.userId,
            amount: Number(payment.amount || 0) / 100,
            type: "credit",
            description: `Wallet top-up via Razorpay payment #${String(razorpay_payment_id).slice(-6)}`,
            metadata: {
                purpose: "wallet_topup",
                razorpayPaymentId: razorpay_payment_id,
                razorpayOrderId: razorpay_order_id,
                source: "razorpay"
            }
        })

        return res.status(200).json({
            message: "Wallet balance added successfully",
            ...buildWalletResponse(creditedUser)
        })
    } catch (error) {
        return res.status(500).json({ message: `wallet top-up verify error ${error.message}` })
    }
}
