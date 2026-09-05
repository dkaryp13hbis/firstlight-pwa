import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
const build = new Date().toISOString().slice(0, 10) + '-' +
  (process.env.CF_PAGES_COMMIT_SHA || 'local').slice(0, 7);

export default defineConfig({
  define: { __BUILD__: JSON.stringify(build) },
  plugins: [react()],
})
