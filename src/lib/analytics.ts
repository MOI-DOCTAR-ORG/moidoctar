/**
 * Sabilytics analytics. Injects the tracking script once, in production only.
 *
 * Equivalent to the dashboard snippet:
 *   <script async src="https://www.sabilytics.com/script.js"
 *           data-site="45js3fu9vug6" data-domain="moidoctar8.pxxlspace.cv"></script>
 *
 * The site ID and domain are public (they sit in the page HTML), so they are hardcoded as
 * defaults and NO env var is required. Optional BUILD-time overrides (Vite only exposes VITE_*):
 *   VITE_SABILYTICS_SITE_ID   override site ID
 *   VITE_SABILYTICS_DOMAIN    override registered domain
 *   VITE_SABILYTICS_SRC       override script URL
 *   VITE_SABILYTICS_DISABLED  set to "true" to switch analytics off
 *
 * Verified against https://www.sabilytics.com/script.js: it reads `data-site` (required) and
 * `data-domain` (optional, informational), posts to <script origin>/api/e, and auto-tracks
 * history.pushState/popstate, so React Router navigation is counted without extra code.
 */
const DEFAULT_SITE_ID = '45js3fu9vug6'
const DEFAULT_DOMAIN = 'moidoctar8.pxxlspace.cv'
const DEFAULT_SRC = 'https://www.sabilytics.com/script.js'

export function initAnalytics(): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return
  const env = import.meta.env
  if (env.VITE_SABILYTICS_DISABLED === 'true') return

  const siteId = (env.VITE_SABILYTICS_SITE_ID || DEFAULT_SITE_ID).trim()
  const domain = (env.VITE_SABILYTICS_DOMAIN || DEFAULT_DOMAIN).trim()
  const src = (env.VITE_SABILYTICS_SRC || DEFAULT_SRC).trim()
  if (!siteId) return

  // Keep localhost, preview builds and other hosts out of the real dashboard.
  const host = window.location.hostname.replace(/^www\./i, '').toLowerCase()
  if (domain && host !== domain.toLowerCase()) return

  // Never inject twice (StrictMode / HMR).
  if (document.querySelector('script[data-site]')) return

  const s = document.createElement('script')
  s.async = true
  s.src = src
  s.setAttribute('data-site', siteId)
  if (domain) s.setAttribute('data-domain', domain)
  document.head.appendChild(s)
}
