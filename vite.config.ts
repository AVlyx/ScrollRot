import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        options: 'index.html',
        shortsContent: 'src/content/shortsContent.ts',
        reelsContent: 'src/content/reelsContent.ts',
        tiktokContent: 'src/content/tiktokContent.ts'
      },
      output: {
        entryFileNames: '[name].js'
      }
    }
  }
});