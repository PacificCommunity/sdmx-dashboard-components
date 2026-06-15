import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./lib/index.ts'],
  platform: 'browser',
  outDir: 'dist',
  dts: true
})
