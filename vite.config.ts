import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Cloudflare Pages (prod) sirve en la raíz → '/'.
  // GitHub Pages sirve en subruta → el workflow pasa VITE_BASE=/crow-comics/.
  base: process.env.VITE_BASE || '/',
})

