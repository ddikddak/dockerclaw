import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    inspectAttr(), 
    react(),
    // Bundle analyzer - generates stats.html on build
    visualizer({
      open: false, // Don't auto-open browser
      gzipSize: true,
      brotliSize: true,
      filename: 'dist/stats.html',
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Manual chunks for better caching
        manualChunks: {
          // Core React - stable, rarely changes
          'react-vendor': ['react', 'react-dom'],
          // Heavy UI components that are used across the app
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-select',
            '@radix-ui/react-tooltip',
          ],
          // Markdown rendering - only needed for Doc blocks
          'markdown': ['react-markdown', 'remark-gfm'],
          // Icons
          'icons': ['lucide-react'],
        },
      },
    },
    // Code splitting threshold
    chunkSizeWarningLimit: 500,
  },
});
