import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Sabilytics install snippet, written literally into the BUILT index.html.
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
    base: '/',
    plugins: [react(), sabilytics(env)],
    build: {
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks: undefined,
        },
      },
    },
  }
})
