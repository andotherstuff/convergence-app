/**
 * Minimal service worker for AOS Convergence.
 *
 * Purpose: meet PWA installability requirements (a registered SW with a
 * fetch handler is required by Chrome, Edge, and most Android browsers
 * before they'll show the "install" prompt).
 *
 * Strategy: network-first pass-through for navigations, with a tiny
 * cache fallback for the app shell (`/` and the manifest) so the app
 * can still "open" when launched from the home screen with no network.
 * This is intentionally minimal — a Nostr feed is useless offline, but
 * the home screen icon should at least open to a page instead of a
 * browser error.
 */

const CACHE_NAME = "aos-convergence-shell-v1";
const SHELL_URLS = [
  "/",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/AOS_Official.svg",
  "/og-image.jpg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // Don't fail the install if a shell asset 404s — just cache what
      // we can.
      await Promise.all(
        SHELL_URLS.map(async (url) => {
          try {
            const res = await fetch(url, { cache: "reload" });
            if (res.ok) await cache.put(url, res);
          } catch {
            /* ignore */
          }
        })
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Purge old caches.
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

/**
 * Focus the most-recently-used AOS Convergence window when a
 * notification is clicked, or open a new one if none is open. If the
 * notification carries a `data.path`, navigate to it.
 *
 * Currently the client fires notifications via `new Notification(...)`
 * (foreground only), which handles its own `onclick`. This handler is
 * here for resilience — if a notification was shown via
 * `registration.showNotification(...)` (e.g. future Web Push), it'll
 * be routed correctly.
 */
self.addEventListener("notificationclick", (event) => {
  const notif = event.notification;
  notif.close();
  const path =
    (notif.data && typeof notif.data.path === "string" && notif.data.path) ||
    "/";
  const target = new URL(path, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of all) {
        if ("focus" in client) {
          try {
            await client.focus();
            if ("navigate" in client) {
              try {
                await client.navigate(target);
              } catch {
                /* some browsers disallow cross-origin / closed-tab navigate */
              }
            }
            return;
          } catch {
            /* try next */
          }
        }
      }
      await self.clients.openWindow(target);
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // Only handle same-origin GETs.
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navigation requests: network-first, fall back to cached shell.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          return fresh;
        } catch {
          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match("/");
          return cached ?? Response.error();
        }
      })()
    );
    return;
  }

  // Static assets: stale-while-revalidate for anything in the shell.
  if (SHELL_URLS.some((u) => url.pathname === u)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(req);
        const networkPromise = fetch(req)
          .then((res) => {
            if (res.ok) cache.put(req, res.clone()).catch(() => {});
            return res;
          })
          .catch(() => cached);
        return cached ?? networkPromise;
      })()
    );
  }
});
