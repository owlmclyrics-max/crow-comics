import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Ruta base desplegable: si más adelante publicas en GitHub Pages u otro host
  // en subcarpeta, solo define VITE_BASE=/nombre-repo/ en el .env o en el host.
  // En Vercel/Netlify no hace falta nada (raíz por defecto "/").
  base: process.env.VITE_BASE || '/',
})

