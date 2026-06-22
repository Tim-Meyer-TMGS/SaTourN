import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/SaTourN/frontend-preview/' : '/',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 4173,
    fs: {
      allow: ['..']
    }
  }
}));
