import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Only initialize if config is present
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

/**
 * Request notification permission and get FCM token.
 * Returns the token string or null on failure.
 */
export async function requestNotificationPermission() {
  try {
    if (!messaging) {
      console.warn("⚠️ Firebase messaging not available");
      return null;
    }

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

    const token = await getToken(messaging, { vapidKey });
    
    if (token) {
      console.log("🔔 FCM token obtained");
      localStorage.setItem("fcmToken", token);
      return token;
    }

    console.warn("⚠️ No FCM token received");
    return null;
  } catch (err) {
    console.error("❌ FCM token error:", err);
    return null;
  }
}

/**
 * Listen for foreground push messages.
 * Calls the provided callback with the notification payload.
 */
export function onForegroundMessage(callback) {
  if (!messaging) return () => {};

  return onMessage(messaging, (payload) => {
    console.log("📩 Foreground notification:", payload);
    if (callback) callback(payload);
  });
}

export { messaging };
