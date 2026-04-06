import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: 'all',
    // Proxy only in dev mode
    proxy: command === 'serve' ? {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    } : undefined
  }
}));
