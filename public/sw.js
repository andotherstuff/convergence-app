/**
 * KILL-SWITCH service worker.
 *
 * We previously shipped a SW that cached the HTML navigation shell.
 * After any redeploy, that cached HTML referenced fingerprinted JS
 * bundles that had been renamed on disk, leading to
 * `ReferenceError: Gauge is not defined` / `difficulty is not defined`
 * style crashes inside `TreasureCardBody` — which the root
 * ErrorBoundary surfaced as "Something went wrong."
 *
 * Every browser that registered that buggy SW will keep serving the
 * stale shell until something actively evicts it. This file is that
 * something: on install it wipes every cache, on activate it reloads
 * every open client AND unregisters itself so no SW remains on the
 * origin. After one activation cycle, affected clients are back to
 * a clean no-SW baseline served directly from the network.
 *
 * Reintroduce a purposeful service worker (for PWA installability,
 * offline handling, push, etc.) in a follow-up — but keep it
 * navigation-network-only to avoid repeating this bug.
 */

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch {
        /* ignore */
      }
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Ensure caches are gone (belt and suspenders).
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch {
        /* ignore */
      }

      // Take control of any existing clients so this SW handles the
      // (now empty) fetch pipeline cleanly.
      await self.clients.claim();

      // Tell open tabs to reload — they were likely running old HTML
      // that references missing JS and would crash on next interaction.
      try {
        const all = await self.clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });
        for (const client of all) {
          try {
            client.postMessage({ type: "SW_KILLED" });
          } catch {
            /* ignore */
          }
        }
      } catch {
        /* ignore */
      }

      // Finally, remove this SW so the origin is back to SW-less.
      try {
        await self.registration.unregister();
      } catch {
        /* ignore */
      }
    })()
  );
});

// Pass-through fetch handler — present only because some browsers
// require a `fetch` listener for the SW to be considered valid.
self.addEventListener("fetch", () => {
  // Intentionally empty; no respondWith → browser handles the request.
});
