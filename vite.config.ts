import { defineConfig } from 'vite'
import { resolve } from 'path'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'
import { libInjectCss } from 'vite-plugin-lib-inject-css'

import pkg from './package.json'

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/sdmx-dashboard-components/' : '/',
  plugins: [
    react(),
    libInjectCss(),
    dts({include: ['lib']})
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'lib/index.ts'),
      formats: ['es']
    },
    rollupOptions: {
      external: [ ...Object.keys(pkg.peerDependencies), /^highcharts\/modules\/.*/]
    },
    copyPublicDir: false
  }
})
