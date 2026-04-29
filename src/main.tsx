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

// Register the PWA service worker. Kept out of `App.tsx` because the
// React tree shouldn't block on SW registration, and `main.tsx` runs
// exactly once per page load.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.warn("Service worker registration failed:", err);
      });
  });

  // When a newly-installed SW activates, it posts SW_ACTIVATED. Reload
  // the page so the browser picks up the fresh HTML → fresh JS pair,
  // avoiding "old HTML references missing/renamed JS" crashes after a
  // deploy. Gate on `sessionStorage` to avoid reload loops.
  const RELOAD_FLAG = "aos:sw-reloaded";
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type !== "SW_ACTIVATED") return;
    if (sessionStorage.getItem(RELOAD_FLAG) === "1") return;
    sessionStorage.setItem(RELOAD_FLAG, "1");
    // Small delay so any in-flight work settles.
    setTimeout(() => window.location.reload(), 100);
  });
}
