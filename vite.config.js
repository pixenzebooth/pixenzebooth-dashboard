import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Code splitting configuration
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React libraries
          vendor: ['react', 'react-dom', 'react-router-dom'],
          // Animation library (loaded separately since it's large)
          motion: ['framer-motion'],
          // UI utilities
          ui: ['lucide-react', 'clsx', 'tailwind-merge'],
          // Supabase (loaded separately for pages that need it)
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Sourcemaps in production (set to false to reduce build size)
    sourcemap: false,
    // Asset size optimization
    assetsInlineLimit: 4096, // Inline assets smaller than 4KB
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
})
