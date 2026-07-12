const CACHE_NAME = 'ecosphere-v1';
const STATIC_ASSETS = ['/', '/icon-192.png', '/icon-512.png'];

// Install: Cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Ignore errors for missing files like icons if they don't exist yet
      return Promise.allSettled(STATIC_ASSETS.map(url => cache.add(url)));
    })
  );
  self.skipWaiting();
});

// Activate: Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => 
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// Fetch: Cache-first strategy for navigation and static assets
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request).then((response) => 
      response || fetch(event.request)
    ).catch(() => {
      // Fallback for offline navigation if it's an HTML page request
      if (event.request.mode === 'navigate') {
        return caches.match('/');
      }
    })
  );
});

// Push: Display notification
self.addEventListener('push', (event) => {
  let data = { title: "EcoSphere Notification", body: "You have a new update." };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    console.error("Error parsing push data", e);
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      data: { url: data.url || '/' },
      actions: [
        { action: 'open', title: 'Open' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    })
  );
});

// Notification click: Open URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'dismiss') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === event.notification.data.url && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});
