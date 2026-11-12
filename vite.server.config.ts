import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    ssr: 'server/index.ts',
    outDir: 'api',
    emptyOutDir: true,
    rollupOptions: {
      external: [
        'fs',
        'path',
        'os',
        'http',
        'crypto',
        'express',
        'cors',
        'socket.io',
        'dotenv/config',
        '@paypal/paypal-server-sdk',
      ],
      output: {
        format: 'esm',
        entryFileNames: 'index.js',
      },
    },
  },
});
