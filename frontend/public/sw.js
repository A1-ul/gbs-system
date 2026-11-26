/* 
================================================================================
   GBS ENTERPRISE SERVICE WORKER & AUTOMATIC MOBILE/WEB UPGRADE ENGINE
   Intelligence Talks to Wisdom • Zero-Stale-Cache Self-Updating PWA Shell
================================================================================
*/

const CACHE_NAME = "gbs-cache-v2026.22";
const OFFLINE_URL = "/offline.html";

const PRECACHE_ASSETS = [
  "/",
  "/login?source=pwa",
  "/offline.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-144.png",
  "/icons/apple-touch-icon.png",
  "/assets/gbs_crest_badge.jpg"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch(() => { });
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      const staleCaches = cacheNames.filter((name) => name !== CACHE_NAME);
      const upgradedFromOlderVersion = staleCaches.length > 0;
      return Promise.all(staleCaches.map((name) => caches.delete(name))).then(() => upgradedFromOlderVersion);
    }).then((upgradedFromOlderVersion) => {
      return self.clients.claim().then(() => upgradedFromOlderVersion);
    }).then((upgradedFromOlderVersion) => {
      if (!upgradedFromOlderVersion) return;
      return self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsList) => {
        clientsList.forEach((client) => {
          try {
            client.postMessage({ type: "GBS_APP_UPDATED", version: CACHE_NAME });
          } catch { }
        });
      });
    })
  );
});

self.addEventListener("message", (event) => {
  const payload = event?.data;
  if (!payload) return;
  if (payload.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }
  if (payload.type === "DISPATCH_LOCK_SCREEN_PUSH") {
    const title = payload.title || "GBS School Management Alert";
    const options = {
      body: payload.body || "New update on your GBS dashboard.",
      icon: payload.icon || "/assets/gbs_crest_badge.jpg",
      badge: payload.badge || "/assets/gbs_crest_badge.jpg",
      vibrate: [200, 100, 200, 100, 250],
      tag: payload.tag || `gbs-push-${Date.now()}`,
      renotify: true,
      requireInteraction: true,
      data: {
        url: payload.url || "/login?source=pwa",
        dispatchedAt: new Date().toISOString()
      },
      actions: [
        { action: "open_dashboard", title: "📲 Open Portal" },
        { action: "dismiss", title: "✕ Dismiss" }
      ]
    };
    event.waitUntil(self.registration.showNotification(title, options));
  }
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);

  // Bypass API calls & Range requests (critical for Apple iOS Safari video/audio streaming)
  if (url.pathname.startsWith("/api/") || event.request.headers.get("range")) return;

  const isDocument = event.request.mode === "navigate" || event.request.headers.get("accept")?.includes("text/html") || url.pathname === "/manifest.json" || url.pathname === "/index.html";

  event.respondWith(
    fetch(isDocument ? new Request(event.request, { cache: "no-store" }) : event.request)
      .then((networkRes) => {
        if (networkRes && networkRes.ok && url.origin === self.location.origin) {
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => { });
        }
        return networkRes;
      })
      .catch(() => {
        return caches.match(event.request).then(async (cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (isDocument) {
            const cachedRoot = (await caches.match("/")) || (await caches.match("/index.html"));
            if (cachedRoot) return cachedRoot;
            return caches.match(OFFLINE_URL);
          }
        });
      })
  );
});

self.addEventListener("push", (event) => {
  let data = {
    title: "GBS School Management Alert",
    body: "New update on your institutional dashboard.",
    category: "GENERAL",
    url: "/login?source=pwa",
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
