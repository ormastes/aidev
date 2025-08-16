import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { path } from '../infra_external-log-lib/src';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': {},
    'global': "globalThis",
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './children'),
      '@components': path.resolve(__dirname, './children/components'),
      '@services': path.resolve(__dirname, './children/services'),
      '@stores': path.resolve(__dirname, './children/stores'),
      '@types': path.resolve(__dirname, './children/types'),
      '@utils': path.resolve(__dirname, './children/utils'),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3457',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3457',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          antd: ['antd', '@ant-design/icons'],
          editor: ['@monaco-editor/react'],
          ai: ['@anthropic-ai/sdk', 'openai'],
        },
      },
    },
  },
});
