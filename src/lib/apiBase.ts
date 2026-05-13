/**
 * API base URL for the shared Cloudflare Worker that backs both the AOS
 * Convergence website (`convergence.andotherstuff.org`) and this attendee
 * app. The schedule and other gated event details are served from here.
 *
 * Override at build time with `VITE_API_URL` if pointing at a staging
 * worker; the default is the production deployment.
 */
export const API_BASE: string =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  "https://aos-convergence-api.protestnet.workers.dev";
