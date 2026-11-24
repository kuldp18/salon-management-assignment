import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

const serverDirectory = fileURLToPath(new URL('./server/', import.meta.url));

export default defineConfig(({ mode }) => {
  const { PORT = '3001' } = loadEnv(mode, serverDirectory, 'PORT');
  const proxy = { '/api': `http://127.0.0.1:${PORT}` };

  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
      fs: { deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/server/**'] },
      proxy,
    },
    preview: { proxy },
  };
});
