import User from "../models/user.model.js"

const normalizeAmount = (amount) => {
    const parsed = Number(amount)
    if (!Number.isFinite(parsed) || parsed < 0) {
        throw new Error("Invalid wallet amount")
    }
    return Number(parsed.toFixed(2))
}

const createTransaction = ({
    type,
    direction,
    amount,
    description = "",
    order = null,
    balanceAfter = 0,
    metadata = {}
}) => ({
    type,
    direction,
    amount,
    description,
    order,
    balanceAfter,
    metadata,
    createdAt: new Date()
})

export const creditWallet = async ({
    userId,
    amount,
    type = "refund",
    description = "",
    orderId = null,
    metadata = {}
}) => {
    const safeAmount = normalizeAmount(amount)
    const user = await User.findById(userId)
    if (!user) {
        throw new Error("User not found")
    }

    user.walletBalance = Number((Number(user.walletBalance || 0) + safeAmount).toFixed(2))
    user.walletTransactions.unshift(createTransaction({
        type,
        direction: "credit",
        amount: safeAmount,
        description,
        order: orderId,
        balanceAfter: user.walletBalance,
        metadata
    }))
    await user.save()
    return user
}

export const debitWallet = async ({
    userId,
    amount,
    type = "payment",
    description = "",
    orderId = null,
    metadata = {}
}) => {
    const safeAmount = normalizeAmount(amount)
    const user = await User.findById(userId)
    if (!user) {
        throw new Error("User not found")
    }

    if (Number(user.walletBalance || 0) < safeAmount) {
        throw new Error("Insufficient wallet balance")
    }

    user.walletBalance = Number((Number(user.walletBalance || 0) - safeAmount).toFixed(2))
    user.walletTransactions.unshift(createTransaction({
        type,
        direction: "debit",
        amount: safeAmount,
        description,
        order: orderId,
        balanceAfter: user.walletBalance,
        metadata
    }))
    await user.save()
    return user
}
