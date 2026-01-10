import Favorite from "../models/favorite.model.js";
import Item from "../models/item.model.js";

// Add item to favorites
export const addFavorite = async (req, res) => {
    try {
        const { itemId } = req.params;
        const userId = req.userId;

        // Check if item exists
        const item = await Item.findById(itemId);
        if (!item) {
            return res.status(404).json({ message: "Item not found" });
        }

        // Check if already favorited
        const existingFavorite = await Favorite.findOne({ user: userId, item: itemId });
        if (existingFavorite) {
            return res.status(400).json({ message: "Item already in favorites" });
        }

        const favorite = await Favorite.create({
            user: userId,
            item: itemId
        });

        await favorite.populate("item");
        return res.status(201).json(favorite);
    } catch (error) {
        return res.status(500).json({ message: `Add favorite error: ${error.message}` });
    }
};

// Remove item from favorites
export const removeFavorite = async (req, res) => {
    try {
        const { itemId } = req.params;
        const userId = req.userId;

        const favorite = await Favorite.findOneAndDelete({ user: userId, item: itemId });
        if (!favorite) {
            return res.status(404).json({ message: "Favorite not found" });
        }

        return res.status(200).json({ message: "Removed from favorites", itemId });
    } catch (error) {
        return res.status(500).json({ message: `Remove favorite error: ${error.message}` });
    }
};

// Get user's favorites
export const getMyFavorites = async (req, res) => {
    try {
        const userId = req.userId;

        const favorites = await Favorite.find({ user: userId })
            .populate({
                path: "item",
                populate: { path: "shop", select: "name city" }
            })
            .sort({ createdAt: -1 });

        const items = favorites.map(f => f.item);
        return res.status(200).json(items);
    } catch (error) {
        return res.status(500).json({ message: `Get favorites error: ${error.message}` });
    }
};

// Toggle favorite (add if not exists, remove if exists)
export const toggleFavorite = async (req, res) => {
    try {
        const { itemId } = req.params;
        const userId = req.userId;

        const existingFavorite = await Favorite.findOne({ user: userId, item: itemId });

        if (existingFavorite) {
            await Favorite.findByIdAndDelete(existingFavorite._id);
            return res.status(200).json({ isFavorite: false, message: "Removed from favorites" });
        } else {
            const item = await Item.findById(itemId);
            if (!item) {
                return res.status(404).json({ message: "Item not found" });
            }
            await Favorite.create({ user: userId, item: itemId });
            return res.status(200).json({ isFavorite: true, message: "Added to favorites" });
        }
    } catch (error) {
        return res.status(500).json({ message: `Toggle favorite error: ${error.message}` });
    }
};
