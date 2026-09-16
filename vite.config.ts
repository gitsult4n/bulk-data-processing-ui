import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiUrl = process.env.API_URL ?? 'http://localhost:5276'
const proxy = { '/api': { target: apiUrl, changeOrigin: true } }

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true, proxy },
  preview: { port: 4173, strictPort: true, proxy },
})
