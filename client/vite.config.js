import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  build: {
    // El servidor Express sirve esta carpeta: un solo despliegue en el hosting.
    outDir: '../server/public',
    emptyOutDir: true,
  },
});
