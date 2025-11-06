import User from "./models/user.model.js";

export const socketHandler = (io) => {
  io.on("connection", (socket) => {
    console.log("🟢 Socket connected:", socket.id);

    // Identify user after login
    socket.on("identity", async ({ userId }) => {
      try {
        if (!userId) return;
        await User.findByIdAndUpdate(
          userId,
          { socketId: socket.id, isOnline: true },
          { new: true }
        );
        console.log(`✅ User ${userId} marked online`);
      } catch (error) {
        console.error("❌ identity event error:", error.message);
      }
    });

    // Update delivery location and broadcast to all clients
    socket.on("updateLocation", async ({ latitude, longitude, userId }) => {
      try {
        if (!userId || latitude == null || longitude == null) return;

        const user = await User.findByIdAndUpdate(userId, {
          location: {
            type: "Point",
            coordinates: [longitude, latitude],
          },
          isOnline: true,
          socketId: socket.id,
        });

        if (user) {
          io.emit("updateDeliveryLocation", {
            deliveryBoyId: userId,
            latitude,
            longitude,
          });
        }
      } catch (error) {
        console.error("❌ updateLocation event error:", error.message);
      }
    });

    // Handle disconnection safely
    socket.on("disconnect", async (reason) => {
      try {
        console.log(`🔴 Socket ${socket.id} disconnected (${reason})`);
        await User.findOneAndUpdate(
          { socketId: socket.id },
          { socketId: null, isOnline: false }
        );
      } catch (error) {
        console.error("❌ disconnect event error:", error.message);
      }
    });

    // Handle unexpected errors
    socket.on("error", (err) => {
      console.error("⚠️ Socket error:", err.message);
    });
  });
};
