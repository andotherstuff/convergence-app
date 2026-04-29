import { createRoot } from 'react-dom/client';

// Import polyfills first
import './lib/polyfills.ts';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import App from './App.tsx';
import './index.css';

// FIXME: a custom font should be used. Eg:
// import '@fontsource-variable/<font-name>';

// Build marker so we can confirm in the console which bundle is live.
// eslint-disable-next-line no-console
console.log("[AOS] booting", { ts: Date.now() });

// ─────────────────────────────────────────────────────────────────────
// SERVICE WORKER PURGE — fire-and-forget
//
// An earlier SW revision cached the HTML shell, which caused stale
// HTML to reference renamed fingerprinted JS after a redeploy. That
// produced `ReferenceError` crashes in `TreasureCardBody` that
// surfaced as "Something went wrong." We're getting rid of it.
//
// On every page load:
//  1. Unregister every service worker on this origin.
//  2. Delete every CacheStorage entry.
//  3. If anything was unregistered or purged, reload once (guarded by
//     sessionStorage so we don't loop).
//
// We do NOT re-register any SW for now. Reintroduce one later only
// after confirming the purge is clean.
// ─────────────────────────────────────────────────────────────────────
(async () => {
  if (typeof navigator === "undefined") return;
  const RELOAD_FLAG = "aos:sw-purge-done";

  let didPurge = false;

  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      if (regs.length > 0) {
        await Promise.all(
          regs.map((r) => r.unregister().catch(() => false))
        );
        didPurge = true;
      }
    }
  } catch {
    /* ignore */
  }

  try {
    if ("caches" in self) {
      const keys = await caches.keys();
      if (keys.length > 0) {
        await Promise.all(keys.map((k) => caches.delete(k).catch(() => false)));
        didPurge = true;
      }
    }
  } catch {
    /* ignore */
  }

  if (didPurge && sessionStorage.getItem(RELOAD_FLAG) !== "1") {
    sessionStorage.setItem(RELOAD_FLAG, "1");
    // eslint-disable-next-line no-console
    console.log("[AOS] purged stale service worker / caches, reloading");
    // Give the browser a beat to finish the unregister handshake.
    setTimeout(() => window.location.reload(), 150);
  }
})();

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
