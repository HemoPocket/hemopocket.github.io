/* HemoPocket — Service Worker de Firebase Cloud Messaging (notificaciones push).
   Maneja las notificaciones cuando la app está en segundo plano o cerrada.
   Debe servirse desde la raíz del dominio (https://hemopocket.github.io/firebase-messaging-sw.js). */
importScripts('https://www.gstatic.com/firebasejs/12.14.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.14.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCyP3Enuoh8K2Y39rROTbQ_mhx9OmBjWtY",
  authDomain: "hemopocket.firebaseapp.com",
  projectId: "hemopocket",
  storageBucket: "hemopocket.firebasestorage.app",
  messagingSenderId: "873773275437",
  appId: "1:873773275437:web:4d6ec7c118f50c4a445ba4"
});

const messaging = firebase.messaging();

// Mensaje recibido con la app en segundo plano: mostrar la notificación.
messaging.onBackgroundMessage(function (payload) {
  const n = payload.notification || payload.data || {};
  const title = n.title || 'HemoPocket';
  const options = {
    body: n.body || '',
    icon: './icono-192.png',
    badge: './icono-192.png',
    data: { url: (payload.fcmOptions && payload.fcmOptions.link) || (payload.data && payload.data.url) || './' }
  };
  self.registration.showNotification(title, options);
});

// Al pulsar la notificación: abrir/enfocar la app.
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || './';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (const c of list) { if ('focus' in c) return c.focus(); }
      if (clients.openWindow) return clients.openWindow(target);
    })
  );
});
