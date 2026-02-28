import { authorizeRoles } from "./auth.middleware.js"

const isAdmin = authorizeRoles("admin")

export default isAdmin
