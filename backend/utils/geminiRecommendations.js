const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

const extractJsonArray = (text = "") => {
    const trimmed = String(text || "").trim()
    if (!trimmed) return []

    try {
        const direct = JSON.parse(trimmed)
        return Array.isArray(direct) ? direct : []
    } catch (error) {
        const match = trimmed.match(/\[[\s\S]*\]/)
        if (!match) return []
        try {
            const parsed = JSON.parse(match[0])
            return Array.isArray(parsed) ? parsed : []
        } catch (innerError) {
            return []
        }
    }
}

export const getGeminiRecommendations = async ({
    recentOrders = [],
    availableItems = [],
    city = ""
}) => {
    const apiKey = String(process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY || "").trim()
    if (!apiKey) {
        return []
    }

    const prompt = [
        "You are a food recommendation engine.",
        "Return exactly 5 personalized dish recommendations as a JSON array.",
        "Each entry must include: name, reason, category, price, shopName.",
        "Only recommend dishes from the available menu items.",
        "Keep reasons short and specific.",
        `City: ${city || "Unknown"}`,
        `Recent orders: ${JSON.stringify(recentOrders)}`,
        `Available menu items: ${JSON.stringify(availableItems)}`
    ].join("\n")

    const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            contents: [
                {
                    parts: [
                        {
                            text: prompt
                        }
                    ]
                }
            ],
            generationConfig: {
                responseMimeType: "application/json"
            }
        })
    })

    if (!response.ok) {
        throw new Error(`Gemini request failed with status ${response.status}`)
    }

    const payload = await response.json()
    const text = payload?.candidates?.[0]?.content?.parts?.map((part) => part?.text || "").join("") || ""
    return extractJsonArray(text).slice(0, 5)
}
