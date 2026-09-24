import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// WhatsApp, Facebook, dan X hanya membaca og:image dengan URL absolut.
// Vercel mengisi VERCEL_PROJECT_PRODUCTION_URL saat build (domain produksi,
// tanpa https://). SITE_URL bisa dipakai untuk menimpanya.
function absoluteOgUrls(): Plugin {
  const raw = process.env.SITE_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL
  const origin = raw ? (raw.startsWith('http') ? raw : `https://${raw}`).replace(/\/$/, '') : null

  return {
    name: 'absolute-og-urls',
    transformIndexHtml(html) {
      if (!origin) return html
      return html
        .replace('<meta property="og:image" content="/logo.png" />', `<meta property="og:image" content="${origin}/logo.png" />`)
        .replace('<meta property="og:type"', `<meta property="og:url" content="${origin}/" />\n    <meta property="og:type"`)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), absoluteOgUrls()],
})
