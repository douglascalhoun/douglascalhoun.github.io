// Service Worker for push notifications
self.addEventListener('install', (event) => {
  console.log('Service Worker installing');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  console.log('Push notification received', event);
  
  if (!event.data) {
    console.log('No data in push event');
    return;
  }
  
  let data;
  try {
    data = event.data.json();
  } catch (error) {
    console.error('Error parsing push data:', error);
    return;
  }
  
  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/badge-72.png',
    data: data.data,
    actions: data.actions || [],
    vibrate: [200, 100, 200],
    tag: data.data?.articleId || 'default',
    requireInteraction: false
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked', event);
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(urlToOpen)
    );
  }
});

self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed', event);
});
