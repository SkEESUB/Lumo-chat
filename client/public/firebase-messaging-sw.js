/* eslint-disable no-undef */
// Firebase Messaging Service Worker
// This handles background push notifications when the app is not in focus

// These will be injected by the build, or you can hardcode them
// For Vite, env vars aren't available in service workers, so we use importScripts
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
// IMPORTANT: Replace these with your actual Firebase config
firebase.initializeApp({
  apiKey: "REPLACE_WITH_YOUR_API_KEY",
  authDomain: "REPLACE_WITH_YOUR_AUTH_DOMAIN",
  projectId: "REPLACE_WITH_YOUR_PROJECT_ID",
  storageBucket: "REPLACE_WITH_YOUR_STORAGE_BUCKET",
  messagingSenderId: "REPLACE_WITH_YOUR_MESSAGING_SENDER_ID",
  appId: "REPLACE_WITH_YOUR_APP_ID",
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message received:', payload);

  const notificationTitle = payload.notification?.title || 'Lumo Chat';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    data: {
      url: payload.data?.link || '/',
    },
    // Vibrate pattern for mobile
    vibrate: [200, 100, 200],
    // Auto-close after 10 seconds
    requireInteraction: true,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click — open the room link
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If the app is already open, focus it and navigate
      for (const client of clientList) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      // Otherwise open a new window
      return clients.openWindow(targetUrl);
    })
  );
});
