export const ROLE = Object.freeze({
    USER: "user",
    ADMIN: "admin",
    RESTAURANT: "restaurant",
    DELIVERY: "delivery"
})

export const LEGACY_ROLE_ALIASES = Object.freeze({
    owner: ROLE.RESTAURANT,
    deliveryBoy: ROLE.DELIVERY
})

export const ALL_SUPPORTED_ROLES = Object.freeze([
    ROLE.USER,
    ROLE.ADMIN,
    ROLE.RESTAURANT,
    ROLE.DELIVERY,
    ...Object.keys(LEGACY_ROLE_ALIASES)
])

export const normalizeRole = (role = "") => LEGACY_ROLE_ALIASES[role] || role

export const expandRoleValues = (...roles) => {
    const normalizedTargets = roles.map((role) => normalizeRole(role))
    const values = new Set(normalizedTargets)

    Object.entries(LEGACY_ROLE_ALIASES).forEach(([legacyRole, canonicalRole]) => {
        if (normalizedTargets.includes(canonicalRole)) {
            values.add(legacyRole)
        }
    })

    return [...values]
}
