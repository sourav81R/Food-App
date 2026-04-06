import axios from "axios";
import { useEffect } from "react";
import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { useSelector } from "react-redux";
import { serverUrl } from "../App";
import { firebaseApp } from "../config/firebase";

function useRegisterPushNotifications() {
  const userId = useSelector((state) => state.user.userData?._id);

  useEffect(() => {
    let cancelled = false;

    const registerNotifications = async () => {
      if (!userId || typeof window === "undefined" || !("Notification" in window)) {
        return;
      }

      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
      if (!vapidKey) {
        return;
      }

      const messagingSupported = await isSupported().catch(() => false);
      if (!messagingSupported) {
        return;
      }

      const permission = Notification.permission === "granted"
        ? "granted"
        : await Notification.requestPermission();

      if (permission !== "granted" || cancelled) {
        return;
      }

      const serviceWorkerRegistration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
      const messaging = getMessaging(firebaseApp);
      const token = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration
      });

      if (!token || cancelled) {
        return;
      }

      await axios.post(`${serverUrl}/api/notifications/token`, { token }, { withCredentials: true });
    };

    registerNotifications().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userId]);
}

export default useRegisterPushNotifications;
