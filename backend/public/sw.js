/* 
================================================================================
   GBS ENTERPRISE SERVICE WORKER & LOCK SCREEN PUSH NOTIFICATION ENGINE
   Intelligence Talks to Wisdom • Native Mobile & Lock Screen Delivery
================================================================================
*/

const CACHE_NAME = "gbs-cache-v2026.11";
const OFFLINE_URL = "/offline.html";

// Assets to pre-cache for instant offline startup
const PRECACHE_ASSETS = [
  "/",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/assets/gbs_crest_badge.jpg"
];

// Service Worker Installation
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch(() => { });
    })
  );
});

// Service Worker Activation & Cache Cleanup
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Interceptor: Network-First with Offline Fallback
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);

  // Skip API calls from cache interception
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        if (event.request.headers.get("accept")?.includes("text/html")) {
          return caches.match(OFFLINE_URL);
        }
      });
    })
  );
});

// Native Lock Screen Push Notification Interceptor
self.addEventListener("push", (event) => {
  let data = {
    title: "GBS School Management Alert",
    body: "New update on your institutional dashboard.",
    category: "GENERAL",
    url: "/portal/dashboard",
    icon: "/assets/gbs_crest_badge.jpg",
    badge: "/assets/gbs_crest_badge.jpg"
  };

  if (event.data) {
    try {
      data = Object.assign(data, event.data.json());
    } catch {
      data.body = event.data.text();
    }
  }

  const notificationOptions = {
    body: data.body,
    icon: data.icon || "/assets/gbs_crest_badge.jpg",
    badge: data.badge || "/assets/gbs_crest_badge.jpg",
    vibrate: [200, 100, 200, 100, 250],
    tag: data.tag || `gbs-${Date.now()}`,
    renotify: true,
    requireInteraction: true,
    data: {
      url: data.url || "/",
      dispatchedAt: new Date().toISOString()
    },
    actions: [
      { action: "open_dashboard", title: "📲 Open Portal" },
      { action: "dismiss", title: "✕ Dismiss" }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, notificationOptions)
  );
});

// Notification Click Handler (Brings User Directly to Their Target Dashboard)
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
