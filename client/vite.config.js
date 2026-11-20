import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// realpath keeps Vite working when the project is opened through a Windows
// junction. On a normal folder this is simply the client directory.
const root = realpathSync(fileURLToPath(new URL('.', import.meta.url)));

export default defineConfig({
  root,
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
