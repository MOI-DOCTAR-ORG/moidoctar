/**
 * Sabilytics analytics.
 *
 * Primary install: the vite.config.ts plugin writes this exact snippet into the built index.html
 *   <script async src="https://www.sabilytics.com/script.js"
 *           data-site="45js3fu9vug6" data-domain="moidoctar8.pxxlspace.cv"></script>
 * so it is visible to Sabilytics' installation check and loads before React.
 *
 * initAnalytics() is only a FALLBACK: if that tag is missing (e.g. an old cached index.html) it
 * injects it from JS, on the registered domain only. It never injects twice.
 *
 * Build-time overrides (Vite only exposes VITE_*): VITE_SABILYTICS_SITE_ID,
 * VITE_SABILYTICS_DOMAIN, VITE_SABILYTICS_SRC, VITE_SABILYTICS_DISABLED=true
 *
 * The script (verified against https://www.sabilytics.com/script.js) reads `data-site`
 * (required) and `data-domain` (informational), posts to <script origin>/api/e, and tracks
 * history.pushState/popstate itself, so React Router navigation is counted automatically.
 * It also exposes window.sabilytics.track(name, props) for custom events (see trackEvent).
 */
const DEFAULT_SITE_ID = '45js3fu9vug6'
const DEFAULT_DOMAIN = 'moidoctar8.pxxlspace.cv'
const DEFAULT_SRC = 'https://www.sabilytics.com/script.js'

type SabilyticsApi = { track?: (name: string, props?: Record<string, string | number | boolean | null>) => void }

export function initAnalytics(): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return
  const env = import.meta.env
  if (env.VITE_SABILYTICS_DISABLED === 'true') return

  const siteId = (env.VITE_SABILYTICS_SITE_ID || DEFAULT_SITE_ID).trim()
  const domain = (env.VITE_SABILYTICS_DOMAIN || DEFAULT_DOMAIN).trim()
  const src = (env.VITE_SABILYTICS_SRC || DEFAULT_SRC).trim()
  if (!siteId) return

  // Already installed by the build (or injected earlier): nothing to do.
  if (document.querySelector('script[data-site]')) return

  // Keep localhost, preview builds and other hosts out of the real dashboard.
  const host = window.location.hostname.replace(/^www\./i, '').toLowerCase()
  if (domain && host !== domain.toLowerCase()) return

  const s = document.createElement('script')
  s.async = true
  s.src = src
  s.setAttribute('data-site', siteId)
  if (domain) s.setAttribute('data-domain', domain)
  s.onerror = () => console.warn('[analytics] Sabilytics script failed to load (ad blocker or network).')
  document.head.appendChild(s)
}

/**
 * Send a custom event (e.g. "triage_started"). Safe to call anywhere: it does nothing if the
 * script has not loaded yet, is blocked by an ad blocker, or the app runs on localhost.
 * Props: up to 12 keys, values must be string / number / boolean / null. NEVER pass health
 * details, names, emails or message text: only coarse, non-identifying values.
 */
export function trackEvent(name: string, props?: Record<string, string | number | boolean | null>): void {
  try {
    const api = (window as unknown as { sabilytics?: SabilyticsApi }).sabilytics
    api?.track?.(name, props)
  } catch {
    /* analytics must never break the app */
  }
}
