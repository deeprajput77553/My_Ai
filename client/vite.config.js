import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

const isTermux = process.platform === 'android';

// https://vite.dev/config/
export default defineConfig({
  plugins: isTermux ? [react(), basicSsl()] : [react()],
  server: {
    host: true,
    port: 5173
  }
});
