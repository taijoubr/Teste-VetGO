// Vetgo Service Worker - Web Push Notifications & Offline Support
const CACHE_NAME = 'vetgo-cache-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.png',
  '/logo.svg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Cache addAll warning:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Cache Strategy: Network-first with Cache Fallback for assets & pages
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Deixa as chamadas de API serem tratadas pelo cliente com IndexedDB/LocalStorage
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Apenas métodos GET
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache).catch(() => {});
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Se estiver offline, retorna do cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Para navegação de páginas, retorna index.html em cache
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html') || caches.match('/');
          }
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        });
      })
  );
});

// Listener de Notificações Push
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Vetgo', body: event.data.text() };
    }
  }

  const title = data.title || 'Vetgo - Notificação';
  const options = {
    body: data.body || 'Você tem um novo aviso na plataforma Vetgo.',
    icon: data.icon || '/logo.png',
    badge: data.badge || '/logo.png',
    data: {
      url: data.url || '/',
      dateOfArrival: Date.now(),
    },
    vibrate: [150, 80, 150],
    tag: data.tag || 'vetgo-notification',
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Clique na Notificação: Abre ou foca na tela correspondente
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          if (client.url.includes(self.location.origin)) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
