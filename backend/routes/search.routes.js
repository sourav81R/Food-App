import express from "express"
import isAuth from "../middlewares/isAuth.js"
import { smartSearch } from "../controllers/search.controllers.js"

const searchRouter = express.Router()

searchRouter.get("/", isAuth, smartSearch)

export default searchRouter
