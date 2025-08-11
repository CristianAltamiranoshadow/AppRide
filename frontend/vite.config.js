import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';

export default defineConfig({
  plugins: [react()],
  server: {
    https: {
      key: fs.readFileSync('key.pem'),
      cert: fs.readFileSync('cert.pem')
    },
    host: true, // Para acceder desde otros dispositivos
    port: 5173  // Puerto opcional (puedes cambiarlo si lo necesitas)
  }
});