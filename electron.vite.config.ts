import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// Layer mapping (see .specs/architecture.md): the Electron main process is
// platform/ + adapters/ + core/; the renderer is ui/; ipc/ is shared contract.
export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: { entry: 'src/platform/main.ts' }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: { entry: 'src/platform/preload.ts' }
    }
  },
  renderer: {
    root: 'src/ui',
    plugins: [react()],
    build: {
      rollupOptions: {
        input: fileURLToPath(new URL('src/ui/index.html', import.meta.url))
      }
    }
  }
})
