import express from "express"
import {
    clearAllUsersByAdmin,
    deleteItemByAdmin,
    deleteOrderByAdmin,
    deleteShopByAdmin,
    deleteUserByAdmin,
    getAdminOverview,
    getAllItemsForAdmin,
    getAllOrdersForAdmin,
    getAllShopsForAdmin,
    getAllUsersForAdmin,
    suspendUserByAdmin,
    updateUserRoleByAdmin
} from "../controllers/admin.controllers.js"
import isAdmin from "../middlewares/isAdmin.js"
import isAuth from "../middlewares/isAuth.js"

const adminRouter = express.Router()

adminRouter.get("/overview", isAuth, isAdmin, getAdminOverview)

adminRouter.get("/users", isAuth, isAdmin, getAllUsersForAdmin)
adminRouter.delete("/users", isAuth, isAdmin, clearAllUsersByAdmin)
adminRouter.patch("/users/:userId/role", isAuth, isAdmin, updateUserRoleByAdmin)
adminRouter.patch("/users/:userId/suspend", isAuth, isAdmin, suspendUserByAdmin)
adminRouter.delete("/users/:userId", isAuth, isAdmin, deleteUserByAdmin)

adminRouter.get("/shops", isAuth, isAdmin, getAllShopsForAdmin)
adminRouter.delete("/shops/:shopId", isAuth, isAdmin, deleteShopByAdmin)

adminRouter.get("/items", isAuth, isAdmin, getAllItemsForAdmin)
adminRouter.delete("/items/:itemId", isAuth, isAdmin, deleteItemByAdmin)

adminRouter.get("/orders", isAuth, isAdmin, getAllOrdersForAdmin)
adminRouter.delete("/orders/:orderId", isAuth, isAdmin, deleteOrderByAdmin)

export default adminRouter
