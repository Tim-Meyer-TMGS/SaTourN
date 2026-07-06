import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

function resolveBasePath(command: string, mode: string) {
  const env = loadEnv(mode, '.', '');
  if (env.VITE_BASE_PATH) return env.VITE_BASE_PATH;
  if (env.VERCEL) return '/';
  return command === 'build' ? '/SaTourN/frontend-preview/' : '/';
}

export default defineConfig(({ command, mode }) => ({
  base: resolveBasePath(command, mode),
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 4173,
    fs: {
      allow: ['..']
    }
  }
}));
