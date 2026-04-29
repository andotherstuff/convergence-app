import { createRoot } from 'react-dom/client';

// Import polyfills first
import './lib/polyfills.ts';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import App from './App.tsx';
import './index.css';

// FIXME: a custom font should be used. Eg:
// import '@fontsource-variable/<font-name>';

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

// SERVICE WORKER RECOVERY
//
// Previously this file registered `/sw.js`, which shipped an HTML
// shell cache that broke the app after every redeploy (old HTML
// referenced renamed JS bundles, causing `ReferenceError` crashes in
// `TreasureCardBody` that the root ErrorBoundary surfaced as
// "Something went wrong").
//
// Two things happen here now:
//
// 1. If any service worker is still registered on this origin from a
//    prior session, we unregister it and wipe CacheStorage. This
//    covers users who never refreshed into the kill-switch SW cycle.
//
// 2. We re-register `/sw.js`, which is now itself a kill-switch — it
//    evicts all caches, unregisters itself on activate, and asks open
//    tabs to reload. After one cycle the origin is SW-less.
//
// Net effect: every returning visitor gets back to a clean,
// network-served baseline without touching their browser settings.
// Both branches guard with a sessionStorage flag so we don't
// reload-loop.
if ("serviceWorker" in navigator) {
  const RELOAD_FLAG = "aos:sw-reloaded";

  const reloadOnce = () => {
    if (sessionStorage.getItem(RELOAD_FLAG) === "1") return;
    sessionStorage.setItem(RELOAD_FLAG, "1");
    setTimeout(() => window.location.reload(), 100);
  };

  // Listen for the kill-switch's goodbye message.
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type === "SW_KILLED") reloadOnce();
  });

  // Proactively clean up any old registration + caches on load.
  window.addEventListener("load", async () => {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      // If there's already at least one registration, let it update
      // and run its kill-switch lifecycle. If there's none, do nothing
      // — we don't want to re-register a SW on this origin for now.
      if (regs.length === 0) return;

      // Trigger an update check so any updated /sw.js (the
      // kill-switch) can install + activate + unregister.
      await Promise.all(regs.map((r) => r.update().catch(() => {})));
    } catch {
      /* ignore */
    }
  });
}
