import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/cluster': 'http://localhost:8080',
      '/deploy': 'http://localhost:8080',
      '/rbac': 'http://localhost:8080',
      '/cicd': 'http://localhost:8080',
      '/wiki': 'http://localhost:8080',
      '/search': 'http://localhost:8080',
      '/app': 'http://localhost:8080',
      '/public': 'http://localhost:8080',
      '/favorite': 'http://localhost:8080',
      '/event': 'http://localhost:8080',
      '/gateway': 'http://localhost:8080',
      '/ws': { target: 'ws://localhost:8080', ws: true },
    },
  },
})
