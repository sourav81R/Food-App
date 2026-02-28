export const normalizeClientRole = (role = "") => {
  if (role === "restaurant") return "owner";
  if (role === "delivery") return "deliveryBoy";
  return role;
};

export const isUserRole = (role = "") => normalizeClientRole(role) === "user";
export const isOwnerRole = (role = "") => normalizeClientRole(role) === "owner";
export const isDeliveryRole = (role = "") => normalizeClientRole(role) === "deliveryBoy";
export const isAdminRole = (role = "") => normalizeClientRole(role) === "admin";
