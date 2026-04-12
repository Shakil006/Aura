// Aura PWA Service Worker
const CACHE_NAME = 'aura-v2';  // ← bumped to v2 — forces full refresh
const ASSETS = ['./index.html', './', './manifest.json', './icon.svg'];

// ── Install: cache app files ──────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(() => {});
    })
  );
  self.skipWaiting(); // activate immediately, don't wait
});

// ── Activate: delete ALL old caches ──────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => {
        console.log('Deleting old cache:', k);
        return caches.delete(k);
      }))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: network first, cache fallback ─────────────────────────────────
// Changed to network-first so updates show immediately!
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Update cache with fresh response
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => {
        // Network failed — serve from cache (offline mode)
        return caches.match(e.request);
      })
  );
});

// ── Notification click: open app ──────────────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        if ('focus' in client) return client.focus();
      }
      return self.clients.openWindow('./');
    })
  );
});

// ── Message from app: schedule a notification ─────────────────────────────
self.addEventListener('message', e => {
  if (!e.data) return;

  if (e.data.type === 'SCHEDULE') {
    const { delay, title, body, tag, icon } = e.data;
    if (delay <= 0) {
      fireNotification(title, body, tag, icon);
    } else {
      setTimeout(() => {
        fireNotification(title, body, tag, icon);
      }, delay);
    }
  }

  if (e.data.type === 'CANCEL') {
    self.registration.getNotifications({ tag: e.data.tag }).then(notifs => {
      notifs.forEach(n => n.close());
    });
  }
});

function fireNotification(title, body, tag, icon) {
  self.registration.showNotification(title, {
    body,
    tag,
    icon: icon || './icon.svg',
    badge: './icon.svg',
    requireInteraction: false,
    vibrate: [200, 100, 200],
    data: { url: './' }
  });
}
