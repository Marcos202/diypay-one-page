// Service Worker para Push Notifications - DiyPay
// Este arquivo gerencia notificações nativas quando o PWA está instalado

self.addEventListener('push', (event) => {
  console.log('[SW-Custom] Push event received');
  
  const data = event.data ? event.data.json() : {};
  
  const options = {
    body: data.body || 'Você tem uma nova notificação',
    icon: '/logo-192x192.png',
    badge: '/logo-192x192.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'diypay-notification',
    renotify: true,
    requireInteraction: false,
    data: { url: data.url || '/dashboard' }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'DiyPay', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW-Custom] Notification clicked');
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/dashboard';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Tentar focar em uma aba existente do app
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      // Se não encontrar aba aberta, abrir nova
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Evento para quando o SW é ativado
self.addEventListener('activate', (event) => {
  console.log('[SW-Custom] Service Worker activated');
});
