import Order from "./models/order.model.js";
import User from "./models/user.model.js";
import { SOCKET_EVENTS } from "./utils/socketEvents.js";
import { resolveOrderEta } from "./utils/trafficEta.js";

const ACTIVE_DELIVERY_STATUSES = new Set(["assigned", "picked_up", "on_the_way"]);

const getOrderProgressStatus = (order = {}) => {
  if (order?.deliveryStatus === "delivered") return "delivered";
  if ((order?.shopOrders || []).every((shopOrder) => shopOrder?.status === "delivered")) return "delivered";
  if (order?.deliveryStatus) return order.deliveryStatus;
  if ((order?.shopOrders || []).some((shopOrder) => String(shopOrder?.status || "").toLowerCase() === "out of delivery")) return "out of delivery";
  if ((order?.shopOrders || []).some((shopOrder) => String(shopOrder?.status || "").toLowerCase() === "preparing")) return "preparing";
  if (order?.deliveryPartner) return "out of delivery";
  return "placed";
};

const getStatusIndex = (status = "") => {
  const normalizedStatus = String(status || "").trim().toLowerCase();
  if (normalizedStatus === "delivered") return 3;
  if (["out of delivery", "picked_up", "picked-up", "on_the_way", "on-the-way", "assigned"].includes(normalizedStatus)) return 2;
  if (normalizedStatus === "preparing") return 1;
  return 0;
};

const emitEtaUpdatesForDriver = async ({ io, userId, latitude, longitude }) => {
  const activeOrders = await Order.find({
    $or: [
      {
        deliveryPartner: userId,
        deliveryStatus: { $in: [...ACTIVE_DELIVERY_STATUSES] }
      },
      {
        shopOrders: {
          $elemMatch: {
            assignedDeliveryBoy: userId,
            status: { $ne: "delivered" }
          }
        }
      }
    ]
  })
    .select("_id user createdAt deliveryAddress deliveryStatus shopOrders.status")
    .populate("user", "socketId");

  for (const order of activeOrders) {
    const userSocketId = order?.user?.socketId;
    if (!userSocketId) continue;

    try {
      const eta = await resolveOrderEta({
        order,
        statusIndex: getStatusIndex(getOrderProgressStatus(order)),
        fromCoords: { lat: latitude, lon: longitude },
        destinationCoords: {
          lat: order?.deliveryAddress?.latitude,
          lon: order?.deliveryAddress?.longitude
        },
        providerOverride: "osrm"
      });

      io.to(userSocketId).emit(SOCKET_EVENTS.ETA_UPDATE, {
        orderId: order._id,
        etaSeconds: Number(eta?.remainingSeconds || 0)
      });
    } catch (error) {
      console.error("ETA update error:", error.message);
    }
  }
};

export const socketHandler = (io) => {
  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on(SOCKET_EVENTS.IDENTITY, async ({ userId }) => {
      try {
        if (!userId) return;
        await User.findByIdAndUpdate(
          userId,
          { socketId: socket.id, isOnline: true },
          { new: true }
        );
        console.log(`User ${userId} marked online`);
      } catch (error) {
        console.error("identity event error:", error.message);
      }
    });

    socket.on(SOCKET_EVENTS.UPDATE_LOCATION, async ({ latitude, longitude, userId }) => {
      try {
        if (!userId || latitude == null || longitude == null) return;

        const user = await User.findByIdAndUpdate(userId, {
          location: {
            type: "Point",
            coordinates: [longitude, latitude],
          },
          isOnline: true,
          socketId: socket.id,
        }, { new: true });

        if (user) {
          io.emit(SOCKET_EVENTS.UPDATE_DELIVERY_LOCATION, {
            deliveryBoyId: userId,
            latitude,
            longitude,
          });

          await emitEtaUpdatesForDriver({
            io,
            userId,
            latitude,
            longitude
          });
        }
      } catch (error) {
        console.error("updateLocation event error:", error.message);
      }
    });

    socket.on("disconnect", async (reason) => {
      try {
        console.log(`Socket ${socket.id} disconnected (${reason})`);
        await User.findOneAndUpdate(
          { socketId: socket.id },
          { socketId: null, isOnline: false }
        );
      } catch (error) {
        console.error("disconnect event error:", error.message);
      }
    });

    socket.on("error", (err) => {
      console.error("Socket error:", err.message);
    });
  });
};
