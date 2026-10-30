import { defineConfig } from 'vitest/config'

// Unit tests live next to the library code. The .github/ai-review/*.test.mjs
// files are node:test suites run with `node --test`, so keep vitest out of them.
export default defineConfig({
  test: {
    include: ['lib/**/*.test.{ts,tsx}'],
  },
})
