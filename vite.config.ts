import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const portalApi = 'http://localhost:3001';
const investmentApi = 'http://localhost:8080';
const discordBot = 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api/auth': { target: portalApi, changeOrigin: true },
      '/api/admin': { target: portalApi, changeOrigin: true },
      '/api': { target: investmentApi, changeOrigin: true },
      '/discord-api': {
        target: discordBot,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/discord-api/, ''),
      },
    },
  },
});
