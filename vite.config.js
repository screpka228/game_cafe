import { defineConfig } from 'vite';

export default defineConfig({
  // относительные пути нужны для WebView внутри Capacitor
  base: './',
  build: {
    target: 'es2018',
    chunkSizeWarningLimit: 2000,
  },
});
