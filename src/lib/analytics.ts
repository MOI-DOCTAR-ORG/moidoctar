/**
 * Sabilytics (AIB Ship analytics). Loads the tracking script once, only when a site ID is
 * configured, so local dev and preview builds stay out of the real dashboard.
 *
 * Set at BUILD time (Pxxl frontend project -> Environment variables):
 *   VITE_SABILYTICS_SITE_ID   the site ID from the Sabilytics dashboard
 * Optional, only if the dashboard snippet differs from the defaults:
 *   VITE_SABILYTICS_SRC       script URL       (default https://www.sabilytics.com/script.js)
 *   VITE_SABILYTICS_ATTR      site-id attribute (default data-site-id)
 */
export function initAnalytics(): void {
  const siteId = import.meta.env.VITE_SABILYTICS_SITE_ID
  if (!siteId || typeof document === 'undefined') return
  const src = import.meta.env.VITE_SABILYTICS_SRC || 'https://www.sabilytics.com/script.js'
  if (document.querySelector(`script[src="${src}"]`)) return
  const s = document.createElement('script')
  s.defer = true
  s.src = src
  s.setAttribute(import.meta.env.VITE_SABILYTICS_ATTR || 'data-site-id', siteId)
  document.head.appendChild(s)
}
