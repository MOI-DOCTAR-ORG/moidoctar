// Regenerates the default (logo blue) light/dark token blocks in src/index.css from src/lib/palette.ts.
// Run: npx esbuild src/lib/palette.ts --bundle --format=esm --outfile=/tmp/palette.mjs && node scripts/gen-theme-css.mjs
import fs from 'node:fs'
import * as P from '/tmp/palette.mjs'
const block = mode => {
  const pal = P.buildPalette(P.DEFAULT_ACCENT, mode)
  const lines = Object.entries(pal.vars).map(([k, v]) => `  ${k}: ${v};`).join('\n')
  return `body.${mode} {\n  background-color: rgb(var(--rgb-background));\n  color: rgb(var(--rgb-on-background));\n  color-scheme: ${mode};\n${lines}\n}\n`
}
const header = `/* =====================================================================
   THEME TOKENS (generated, default = MoiDoctar logo blue)
   These are the first-paint defaults. At runtime ThemeContext recomputes the
   same variables from the user's chosen accent (src/lib/palette.ts) and sets
   them on <body>, which overrides these. Regenerate with scripts/gen-theme-css.mjs.
   Urgency colours (error/warning/success) are fixed and never follow the accent.
   ===================================================================== */
`
const p = 'src/index.css'
let s = fs.readFileSync(p, 'utf8')
const start = s.indexOf('/* =====================================================================\n   THEME TOKENS')
const darkStart = s.indexOf('body.dark {')
const darkEnd = s.indexOf('\n}\n', darkStart) + 3
if (start < 0 || darkStart < 0) throw new Error('markers not found')
s = s.slice(0, start) + header + block('light') + '\n' + block('dark') + s.slice(darkEnd)
fs.writeFileSync(p, s)
console.log('rewrote token blocks:', s.length, 'bytes')
