import express from "express"
import isAuth from "../middlewares/isAuth.js"
import { createWalletTopupOrder, getWalletBalance, getWalletTransactions, verifyWalletTopup } from "../controllers/wallet.controllers.js"

const walletRouter = express.Router()

walletRouter.get("/balance", isAuth, getWalletBalance)
walletRouter.get("/transactions", isAuth, getWalletTransactions)
walletRouter.post("/topup-order", isAuth, createWalletTopupOrder)
walletRouter.post("/verify-topup", isAuth, verifyWalletTopup)

export default walletRouter
