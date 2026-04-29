/**
 * Minimal service worker for AOS Convergence.
 *
 * Purpose: meet PWA installability requirements (Chrome, Edge, and
 * most Android browsers require a registered SW with a fetch handler
 * before they'll show the install prompt).
 *
 * Strategy:
 *
 *  - We DO NOT cache the HTML shell ('/'). The HTML references
 *    fingerprinted JS bundles (e.g. /main-ABCD1234.js). If the HTML
 *    is stale but the JS filename has changed on the server, the
 *    user's browser loads the old HTML and tries to execute the old
 *    JS — which either 404s or (worse) has been tree-shaken
 *    differently, producing ReferenceError: Gauge / difficulty style
 *    crashes from a previously-compiled dead branch.
 *
 *  - We DO cache a small set of stable-path static assets
 *    (favicon / logo / og-image / manifest) that don't change names
 *    between builds, so a home-screen launch with a flaky network
 *    still shows branding.
 *
 *  - On activate we purge any cache that isn't the current version,
 *    which lets us invalidate everything by bumping CACHE_NAME.
 *
 *  - When a new SW takes over we tell every open client to reload so
 *    HTML and JS stay in sync across deploys.
 */

// Bump this on any SW change to force a clean slate for returning users.
const CACHE_NAME = "aos-convergence-shell-v3";

// Only cache assets whose *paths* are stable across builds. Never
// cache HTML or fingerprinted JS / CSS — they change filename each
// build and stale copies cause runtime crashes.
const STABLE_ASSETS = [
  "/manifest.webmanifest",
  "/favicon.svg",
  "/AOS_Official.svg",
  "/og-image.jpg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await Promise.all(
        STABLE_ASSETS.map(async (url) => {
          try {
            const res = await fetch(url, { cache: "reload" });
            if (res.ok) await cache.put(url, res);
          } catch {
            /* ignore — cache is best-effort */
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
      // Purge every cache that isn't the current version.
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
      await self.clients.claim();

      // When a new SW takes over, tell every open tab to reload so it
      // picks up the new HTML (and therefore the new fingerprinted
      // JS / CSS). This prevents the "old HTML references old JS"
      // class of crashes after a deploy.
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of allClients) {
        try {
          client.postMessage({ type: "SW_ACTIVATED" });
        } catch {
          /* ignore */
        }
      }
    })()
  );
});

/**
 * Focus or open a window when a notification is clicked.
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
  // Only interested in same-origin GETs.
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // HTML navigations: network-only. Don't cache the shell — stale HTML
  // referencing missing fingerprinted JS is the #1 cause of
  // "Something went wrong" after a deploy. If the network is actually
  // offline, the browser will show its own offline page, which is
  // acceptable for a live Nostr feed app.
  if (req.mode === "navigate") return;

  // Stable static assets: stale-while-revalidate.
  if (STABLE_ASSETS.some((u) => url.pathname === u)) {
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
