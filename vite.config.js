import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Read PORT from .env (all keys, not just VITE_*) so the proxy follows the newsletter server.
  const env = loadEnv(mode, process.cwd(), '');
  const API = `http://localhost:${env.PORT || 5100}`;

  return {
    plugins: [react()],
    server: {
      port: 3001,
      open: true,
      // API calls go to the newsletter server.
      proxy: { '/api': API },
    },
  };
});
