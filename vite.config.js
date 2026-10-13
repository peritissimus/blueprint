import { defineConfig } from 'vite';

export default defineConfig({
  server: { host: true, open: true },   // host: true lets you open it from your phone on the same Wi-Fi
  build: { target: 'es2020', chunkSizeWarningLimit: 1200 }
});
