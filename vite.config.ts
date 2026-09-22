import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Repo GitHub Pages ini hidup di /Hikayat-Journal/, bukan di root domain.
  // Tanpa ini, semua CSS/JS hasil build akan mengarah ke path yang salah (404).
  base: '/Hikayat-Journal/',
})
