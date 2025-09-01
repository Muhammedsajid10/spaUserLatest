import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          stripe: ['@stripe/stripe-js', '@stripe/react-stripe-js']
        }
      }
    }
  },
  server: {
    port: 5175,
    host: '0.0.0.0', // Allow all external connections
    strictPort: false,
    cors: true,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      'usersidespa.onrender.com',
      '.onrender.com'
    ],
    hmr: {
      host: 'localhost'
    },
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      },
    },
  },
  preview: {
    port: process.env.PORT || 3000,
    host: '0.0.0.0',
    strictPort: false
  },
  define: {
    global: 'globalThis',
  },
})
