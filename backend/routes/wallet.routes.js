import express from "express"
import isAuth from "../middlewares/isAuth.js"
import { getWalletBalance, getWalletTransactions } from "../controllers/wallet.controllers.js"

const walletRouter = express.Router()

walletRouter.get("/balance", isAuth, getWalletBalance)
walletRouter.get("/transactions", isAuth, getWalletTransactions)

export default walletRouter
