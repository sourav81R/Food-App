import nodemailer from "nodemailer"
import dotenv from "dotenv"
dotenv.config()

const getTransporter = () => {
  const smtpUser = process.env.EMAIL
  const smtpPass = (process.env.EMAIL_PASS || process.env.PASS || "").replace(/\s+/g, "")

  if (!smtpUser || !smtpPass) {
    throw new Error("Missing EMAIL/EMAIL_PASS in backend environment")
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  })

  return { transporter, smtpUser }
}

export const sendOtpMail=async (to,otp) => {
    const { transporter, smtpUser } = getTransporter()
    await transporter.sendMail({
        from:smtpUser,
        to,
        subject:"Reset Your Password",
        html:`<p>Your OTP for password reset is <b>${otp}</b>. It expires in 5 minutes.</p>`
    })
}


export const sendDeliveryOtpMail=async (user,otp) => {
    const { transporter, smtpUser } = getTransporter()
    await transporter.sendMail({
        from:smtpUser,
        to:user.email,
        subject:"Delivery OTP",
        html:`<p>Your OTP for delivery is <b>${otp}</b>. It expires in 5 minutes.</p>`
    })
}
