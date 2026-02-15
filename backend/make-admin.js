import dotenv from "dotenv"
import mongoose from "mongoose"
import User from "./models/user.model.js"

dotenv.config()

const run = async () => {
    const email = process.argv[2]
    if (!email) {
        console.error("Usage: npm run make-admin -- <email>")
        process.exit(1)
    }
    if (!process.env.MONGODB_URL) {
        console.error("MONGODB_URL is missing in backend/.env")
        process.exit(1)
    }

    try {
        await mongoose.connect(process.env.MONGODB_URL)
        const user = await User.findOneAndUpdate(
            { email: email.trim().toLowerCase() },
            { role: "admin" },
            { new: true }
        )
        if (!user) {
            console.error("User not found")
            process.exit(1)
        }

        console.log(`User ${user.email} promoted to admin`)
    } catch (error) {
        console.error("make-admin error:", error.message)
        process.exit(1)
    } finally {
        await mongoose.disconnect()
    }
}

run()
