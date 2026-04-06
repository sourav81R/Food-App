import User from "../models/user.model.js"

const FCM_ENDPOINT = "https://fcm.googleapis.com/fcm/send"

const normalizeTokens = (tokens = []) => [...new Set((tokens || []).filter(Boolean))]

export const sendPushToTokens = async ({ tokens = [], title, body, data = {} }) => {
    const serverKey = String(process.env.FIREBASE_SERVER_KEY || "").trim()
    const cleanTokens = normalizeTokens(tokens)

    if (!serverKey || cleanTokens.length === 0) {
        return { success: false, skipped: true }
    }

    const response = await fetch(FCM_ENDPOINT, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `key=${serverKey}`
        },
        body: JSON.stringify({
            registration_ids: cleanTokens,
            priority: "high",
            notification: {
                title,
                body
            },
            data
        })
    })

    if (!response.ok) {
        throw new Error(`FCM request failed with status ${response.status}`)
    }

    return response.json()
}

export const sendPushToUser = async ({ userId, title, body, data = {} }) => {
    const user = await User.findById(userId).select("fcmTokens")
    if (!user) {
        return { success: false, skipped: true }
    }

    const tokens = normalizeTokens(user.fcmTokens)
    if (tokens.length === 0) {
        return { success: false, skipped: true }
    }

    const result = await sendPushToTokens({ tokens, title, body, data })
    const invalidTokens = []

    if (Array.isArray(result?.results)) {
        result.results.forEach((entry, index) => {
            if (entry?.error && ["InvalidRegistration", "NotRegistered"].includes(entry.error)) {
                invalidTokens.push(tokens[index])
            }
        })
    }

    if (invalidTokens.length > 0) {
        await User.findByIdAndUpdate(userId, {
            $pull: { fcmTokens: { $in: invalidTokens } }
        })
    }

    return result
}
