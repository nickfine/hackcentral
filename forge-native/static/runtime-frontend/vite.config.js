import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Forge Custom UI requires relative paths for static assets
// https://developer.atlassian.com/platform/forge/custom-ui/
export default defineConfig({
  plugins: [react()],
  base: './', // CRITICAL: Required for Forge Custom UI hosting
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Ensure source maps are not included in production
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/lucide-react')) return 'icons-vendor';
          if (id.includes('node_modules/@forge/bridge')) return 'forge-vendor';
          if (id.includes('node_modules')) return 'vendor';
          return undefined;
        },
      },
    },
  },
})
