import express from "express";
import isAuth from "../middlewares/isAuth.js";
import { addFavorite, removeFavorite, getMyFavorites, toggleFavorite } from "../controllers/favorite.controllers.js";

const favoriteRouter = express.Router();

favoriteRouter.post("/add/:itemId", isAuth, addFavorite);
favoriteRouter.delete("/remove/:itemId", isAuth, removeFavorite);
favoriteRouter.get("/my-favorites", isAuth, getMyFavorites);
favoriteRouter.post("/toggle/:itemId", isAuth, toggleFavorite);

export default favoriteRouter;
