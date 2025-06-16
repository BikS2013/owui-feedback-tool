import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')
  
  // Parse the port from env variable, default to 5173
  const port = parseInt(env.VITE_CLIENT_PORT || '5173')
  
  return {
    plugins: [react()],
    resolve: {
      extensions: ['.tsx', '.ts', '.jsx', '.js']
    },
    server: {
      port: port,
      strictPort: true, // Exit if port is already in use
      host: true, // Listen on all addresses
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:3001',
          changeOrigin: true
        },
        '/health': {
          target: (env.VITE_API_URL || 'http://localhost:3001').replace('/api', ''),
          changeOrigin: true
        }
      }
    }
  }
})
