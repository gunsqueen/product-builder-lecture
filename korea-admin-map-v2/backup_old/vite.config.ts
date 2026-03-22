import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/sgis': {
        target: 'https://sgisapi.mods.go.kr',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/sgis/, ''),
      },
      '/api/mois': {
        target: 'https://jumin.mois.go.kr',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/mois/, ''),
      },
      '/api/nec': {
        target: 'https://apis.data.go.kr',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nec/, ''),
      },
    },
  },
})
