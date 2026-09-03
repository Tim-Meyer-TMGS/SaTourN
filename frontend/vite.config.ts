import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

function resolveBasePath(mode: string) {
  const env = loadEnv(mode, '.', '');
  return env.VITE_BASE_PATH || '/';
}

export default defineConfig(({ mode }) => ({
  base: resolveBasePath(mode),
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 4173,
    fs: {
      allow: ['..']
    }
  }
}));
