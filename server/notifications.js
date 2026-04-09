import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
// On Render, set FIREBASE_SERVICE_ACCOUNT env var to the JSON string of your service account key
let firebaseInitialized = false;

try {
  const serviceAccountJSON = process.env.FIREBASE_SERVICE_ACCOUNT;
  
  if (serviceAccountJSON) {
    const serviceAccount = JSON.parse(serviceAccountJSON);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    
    firebaseInitialized = true;
    console.log("🔔 Firebase Admin initialized");
  } else {
    console.warn("⚠️ FIREBASE_SERVICE_ACCOUNT not set — push notifications disabled");
  }
} catch (err) {
  console.error("❌ Firebase Admin init error:", err.message);
}

/**
 * Send a push notification to a specific FCM token.
 * @param {string} token - FCM device token
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {string} link - URL to open on click
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export async function sendPushNotification(token, title, body, link) {
  if (!firebaseInitialized) {
    return { success: false, message: 'Firebase Admin not initialized' };
  }

  if (!token) {
    return { success: false, message: 'No FCM token provided' };
  }

  try {
    const message = {
      token,
      notification: {
        title,
        body,
      },
      data: {
        link: link || '/',
      },
      webpush: {
        notification: {
          icon: '/favicon.svg',
          badge: '/favicon.svg',
          requireInteraction: true,
          vibrate: [200, 100, 200],
        },
        fcmOptions: {
          link: link || '/',
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log('🔔 Push notification sent:', response);
    return { success: true, messageId: response };
  } catch (err) {
    console.error('❌ Push notification error:', err.message);
    
    // Handle invalid/expired tokens
    if (err.code === 'messaging/invalid-registration-token' ||
        err.code === 'messaging/registration-token-not-registered') {
      return { success: false, message: 'Invalid or expired token' };
    }
    
    return { success: false, message: err.message };
  }
}

export { firebaseInitialized };
