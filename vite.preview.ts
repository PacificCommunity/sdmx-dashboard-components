import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const normalizedBasePath = (env.VITE_DEMO_BASE_PATH || '').replace(/^\/+|\/+$/g, '')
  const base = mode === 'production' && normalizedBasePath ? `/${normalizedBasePath}/` : '/'

  return {
    base,
    plugins: [
      react(),
    ],
  }
})
