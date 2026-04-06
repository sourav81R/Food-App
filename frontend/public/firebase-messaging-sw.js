/* global importScripts, firebase */
importScripts("https://www.gstatic.com/firebasejs/12.1.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.1.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDn7uT7cC1mUUDfAeokWR83ULxl4k7-6Ag",
  authDomain: "foodooza-12d9e.firebaseapp.com",
  projectId: "foodooza-12d9e",
  storageBucket: "foodooza-12d9e.firebasestorage.app",
  messagingSenderId: "927963719557",
  appId: "1:927963719557:web:88412cd7cf6ee630cec6ec",
  measurementId: "G-QC4RWJVG1Y"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload?.notification?.title || "Foodooza";
  const options = {
    body: payload?.notification?.body || "",
    icon: "/favicon.ico"
  };

  self.registration.showNotification(title, options);
});
