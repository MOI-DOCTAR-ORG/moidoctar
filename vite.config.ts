import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Sabilytics install snippet, written literally into the BUILT index.html.
 *
 * Why not only inject it from React? Sabilytics' "verify installation" and any crawler read the
 * raw HTML, which for a Vite SPA is just <div id="root">. A tag that only exists after JS runs
 * can look "not installed" and loads later. Writing it into dist/index.html fixes both.
 *
 * Build only (apply: 'build'), so `npm run dev` / localhost never sends events.
 * Overrides (build-time env): VITE_SABILYTICS_SITE_ID, VITE_SABILYTICS_DOMAIN,
 * VITE_SABILYTICS_SRC, VITE_SABILYTICS_DISABLED=true
 */
function sabilytics(env: Record<string, string>): Plugin {
  const siteId = (env.VITE_SABILYTICS_SITE_ID || '45js3fu9vug6').trim()
  const domain = (env.VITE_SABILYTICS_DOMAIN || 'moidoctar8.pxxlspace.cv').trim()
  const src = (env.VITE_SABILYTICS_SRC || 'https://www.sabilytics.com/script.js').trim()
  const off = env.VITE_SABILYTICS_DISABLED === 'true' || !siteId
  return {
    name: 'sabilytics-snippet',
    apply: 'build',
    transformIndexHtml() {
      if (off) return []
      return [
        {
          tag: 'script',
          attrs: { async: true, src, 'data-site': siteId, 'data-domain': domain },
          injectTo: 'head',
        },
      ]
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'VITE_')
  return {
    plugins: [react(), sabilytics(env)],
    build: {
      rollupOptions: {
        output: {
          manualChunks: undefined,
        },
      },
    },
  }
})
