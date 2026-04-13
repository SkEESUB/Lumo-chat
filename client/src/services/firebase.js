import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

let app = null;
let messaging = null;

try {
  if (firebaseConfig.apiKey) {
    app = initializeApp(firebaseConfig);
    messaging = getMessaging(app);
    console.log("🔔 Firebase initialized");
  } else {
    console.warn("⚠️ Firebase config missing — push notifications disabled");
  }
} catch (err) {
  console.error("❌ Firebase init error:", err);
}

export async function requestNotificationPermission() {
  try {
    if (!messaging) return null;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("🔕 Notification permission denied");
      return null;
    }

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.warn("⚠️ VAPID key missing — cannot get FCM token");
      return null;
    }

    // Pass environment variables to Service Worker via query params
    const swUrl = `/firebase-messaging-sw.js?` + new URLSearchParams(firebaseConfig).toString();
    const registration = await navigator.serviceWorker.register(swUrl);
    
    // Wait for the service worker to become ready
    await navigator.serviceWorker.ready;

    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
    
    if (token) {
      console.log("🔔 FCM token obtained");
      localStorage.setItem("fcmToken", token);
      return token;
    }

    return null;
  } catch (err) {
    console.error("❌ FCM token error:", err);
    return null;
  }
}

export function onForegroundMessage(callback) {
  if (!messaging) return () => {};

  return onMessage(messaging, (payload) => {
    console.log("📩 Foreground notification:", payload);
    if (callback) callback(payload);
  });
}

export { messaging };
