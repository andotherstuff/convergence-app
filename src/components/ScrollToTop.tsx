import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      // Page content may be loading asynchronously — retry a few times
      // until the target element exists, then smooth-scroll to it.
      const id = hash.slice(1);
      let attempts = 0;
      const maxAttempts = 30; // ~1.5s at 50ms intervals

      const tryScroll = () => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
        if (attempts++ < maxAttempts) {
          window.setTimeout(tryScroll, 50);
        } else {
          // Fallback: scroll to top so the user isn't stuck mid-page.
          window.scrollTo(0, 0);
        }
      };

      tryScroll();
      return;
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}
