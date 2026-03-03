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
        // Manual chunks for better caching: stable third-party code lives in
        // separate chunks so an app-code change only invalidates the app chunk.
        manualChunks: {
          // Core React
          'react-vendor': ['react', 'react-dom'],
          // All Radix UI primitives in one vendor chunk
          'radix-ui': [
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-aspect-ratio',
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-context-menu',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-hover-card',
            '@radix-ui/react-label',
            '@radix-ui/react-menubar',
            '@radix-ui/react-navigation-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-progress',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-select',
            '@radix-ui/react-separator',
            '@radix-ui/react-slider',
            '@radix-ui/react-slot',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toggle',
            '@radix-ui/react-toggle-group',
            '@radix-ui/react-tooltip',
          ],
          // Rich-text editor stack (only needed when a DocBlock is on screen)
          // Note: @tiptap/pm is excluded — it only exports subpaths, not a root entry.
          'tiptap': [
            '@tiptap/react',
            '@tiptap/starter-kit',
            '@tiptap/extension-code-block-lowlight',
            '@tiptap/extension-link',
            '@tiptap/extension-table',
            '@tiptap/extension-table-cell',
            '@tiptap/extension-table-header',
            '@tiptap/extension-table-row',
            '@tiptap/extension-task-item',
            '@tiptap/extension-task-list',
            'tiptap-markdown',
            'lowlight',
          ],
          // Mermaid is large; isolate it so boards without diagrams pay zero cost
          'mermaid': ['mermaid'],
          // Markdown rendering
          'markdown': ['react-markdown', 'remark-gfm'],
          // Icons
          'icons': ['lucide-react'],
          // Database
          'db': ['dexie'],
          // Supabase
          'sync': ['@supabase/supabase-js'],
        },
      },
    },
    // Warn when any chunk exceeds 250 KB (gzipped is roughly 3–5× smaller)
    chunkSizeWarningLimit: 250,
  },
});
