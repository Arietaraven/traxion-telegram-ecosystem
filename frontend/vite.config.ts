import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'serve' ? '/' : '/app/', 
  server: {
    port: 5173,
    host: '127.0.0.1',
    strictPort: true,
    allowedHosts: ['.ngrok-free.dev']
  },
  build: {
    rollupOptions: {
      output: {
        // ✨ FORCE ASSET INVALIDATION: Dynamically injects timestamps to defeat browser/Telegram memory caching completely
        entryFileNames: `assets/[name]-${Date.now()}.js`,
        chunkFileNames: `assets/[name]-${Date.now()}.js`,
        assetFileNames: `assets/[name]-${Date.now()}.[ext]`
      }
    }
  }
}));