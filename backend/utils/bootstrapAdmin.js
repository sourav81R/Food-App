import bcrypt from "bcryptjs"
import User from "../models/user.model.js"

const DEFAULT_ADMIN_MOBILE = "9999999999"
const DEFAULT_ADMIN_NAME = "System Admin"

export const bootstrapAdminFromEnv = async () => {
    const adminEmailRaw = process.env.ADMIN_EMAIL
    const adminPassRaw = process.env.ADMIN_PASS

    if (!adminEmailRaw || !adminPassRaw) {
        console.log("ADMIN_EMAIL/ADMIN_PASS not set. Skipping admin bootstrap.")
        return
    }

    const adminEmail = adminEmailRaw.trim().toLowerCase()
    const adminPass = adminPassRaw.trim()
    if (!adminEmail || !adminPass) {
        console.log("ADMIN_EMAIL/ADMIN_PASS is empty after trim. Skipping admin bootstrap.")
        return
    }

    let user = await User.findOne({ email: adminEmail })
    const hashedPassword = await bcrypt.hash(adminPass, 10)

    if (!user) {
        user = await User.create({
            fullName: DEFAULT_ADMIN_NAME,
            email: adminEmail,
            mobile: DEFAULT_ADMIN_MOBILE,
            role: "admin",
            password: hashedPassword
        })
        console.log(`Admin account created for ${adminEmail}`)
        return
    }

    const updates = {}
    if (user.role !== "admin") {
        updates.role = "admin"
    }

    if (!user.password) {
        updates.password = hashedPassword
    } else {
        const isSamePassword = await bcrypt.compare(adminPass, user.password)
        if (!isSamePassword) {
            updates.password = hashedPassword
        }
    }

    if (!user.fullName || !user.fullName.trim()) {
        updates.fullName = DEFAULT_ADMIN_NAME
    }
    if (!user.mobile || String(user.mobile).trim().length < 10) {
        updates.mobile = DEFAULT_ADMIN_MOBILE
    }

    if (Object.keys(updates).length > 0) {
        await User.findByIdAndUpdate(user._id, updates, { new: true })
        console.log(`Admin account synced for ${adminEmail}`)
    } else {
        console.log(`Admin account already up to date for ${adminEmail}`)
    }
}
