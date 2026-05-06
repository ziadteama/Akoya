import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    //host: 'http://192.168.1.245',
    host: 'localhost',
    port: 5173,
    strictPort: true,
    
    hmr: {
      clientPort: 5173
    }
  },
  
  base: '/',
  
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true
  }
})
