import Order from "./models/order.model.js";
import User from "./models/user.model.js";
import { broadcastEtaForActiveOrders, emitEtaForOrder } from "./utils/orderRealtime.js";
import { SOCKET_EVENTS } from "./utils/socketEvents.js";

const ACTIVE_DELIVERY_STATUSES = new Set(["assigned", "picked_up", "on_the_way"]);
let etaBroadcastLoopStarted = false;

const emitEtaUpdatesForDriver = async ({ io, userId }) => {
  const activeOrders = await Order.find({
    status: { $nin: ["cancelled", "scheduled", "delivered"] },
    hiddenFromUser: { $ne: true },
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
    .select("_id user createdAt activatedAt scheduledFor deliveryAddress deliveryStatus status shopOrders.status shopOrders.assignedDeliveryBoy")
    .populate("user", "socketId")
    .populate("deliveryPartner", "location")
    .populate("shopOrders.assignedDeliveryBoy", "location");

  for (const order of activeOrders) {
    try {
      await emitEtaForOrder(io, order);
    } catch (error) {
      console.error("ETA update error:", error.message);
    }
  }
};

export const socketHandler = (io) => {
  if (!etaBroadcastLoopStarted) {
    etaBroadcastLoopStarted = true;
    setInterval(() => {
      broadcastEtaForActiveOrders(io).catch((error) => {
        console.error("ETA broadcast loop error:", error.message);
      });
    }, 60 * 1000);
  }

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
            userId
          });
        }
      } catch (error) {
        console.error("updateLocation event error:", error.message);
      }
    });

    socket.on("disconnect", async (reason) => {
      try {
        await User.findOneAndUpdate(
          { socketId: socket.id },
          { socketId: null, isOnline: false }
        );
        console.log(`Socket ${socket.id} disconnected (${reason})`);
      } catch (error) {
        console.error("disconnect event error:", error.message);
      }
    });

    socket.on("error", (err) => {
      console.error("Socket error:", err.message);
    });
  });
};
