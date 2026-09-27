import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // In dev (npm run dev) use '/' so localhost:5173/ works directly.
  // In prod (npm run build) use the GitHub Pages repo sub-path.
  base: command === 'build' ? '/CybrStudy/' : '/',
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        // Code-split for better performance (function form required by rolldown/Vite 8)
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/react-router-dom') || id.includes('node_modules/react-router')) {
            return 'router';
          }
          if (id.includes('node_modules/firebase')) {
            return 'firebase';
          }
          if (id.includes('node_modules/pdfjs-dist')) {
            return 'pdf';
          }
        },
      },
    },
  },
}))
