import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const target = 'http://127.0.0.1:4936';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: target,
        changeOrigin: true,
      },
      '/slides': {
        target: target,
        changeOrigin: true,
      },
      '/media': {
        target: target,
        changeOrigin: true,
      },
    },
  },
})
