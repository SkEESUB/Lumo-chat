/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

try {
  const urlParams = new URL(location).searchParams;
  
  if (urlParams.get('apiKey')) {
    firebase.initializeApp({
      apiKey: urlParams.get('apiKey'),
      authDomain: urlParams.get('authDomain'),
      projectId: urlParams.get('projectId'),
      storageBucket: urlParams.get('storageBucket'),
      messagingSenderId: urlParams.get('messagingSenderId'),
      appId: urlParams.get('appId'),
    });

    const messaging = firebase.messaging();

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
        vibrate: [200, 100, 200],
        requireInteraction: true,
      };

      self.registration.showNotification(notificationTitle, notificationOptions);
    });
  }
} catch (e) {
  console.error('[SW] Firebase config initialization failed', e);
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          return client.navigate(targetUrl);
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});
