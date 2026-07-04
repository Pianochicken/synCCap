import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    optimizeDeps: {
      include: ['@daml.js/synccap-v3-0.1.0']
    },
    server: {
      proxy: {
        '/v2': {
          target: env.VITE_CANTON_JSON_API_URL || 'http://localhost:7575',
          changeOrigin: true,
          ws: true
        },
        '/devnet-api': {
          target: env.VITE_DEVNET_API_URL || 'https://ledger-api.validator.devnet.sandbox.fivenorth.io',
          changeOrigin: true,
          secure: false,
          ws: true,
          rewrite: (path) => path.replace(/^\/devnet-api/, '')
        },
        '/api': {
          target: env.VITE_BACKEND_API_URL || 'http://localhost:3000',
          changeOrigin: true
        }
      }
    }
  }
})
