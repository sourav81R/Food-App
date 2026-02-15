import React, { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useSelector } from "react-redux";

const SocketContext = createContext(null);
const socketServerUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

export function SocketProvider({ children }) {
  const userId = useSelector((state) => state.user.userData?._id);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!userId) {
      setSocket((previousSocket) => {
        previousSocket?.disconnect();
        return null;
      });
      return;
    }

    const socketInstance = io(socketServerUrl, { withCredentials: true });
    setSocket(socketInstance);

    socketInstance.on("connect", () => {
      socketInstance.emit("identity", { userId });
    });

    return () => {
      socketInstance.disconnect();
      setSocket((currentSocket) => (currentSocket === socketInstance ? null : currentSocket));
    };
  }, [userId]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  return useContext(SocketContext);
}
