import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
import path from 'path'
import fs from 'fs'
import type { Plugin } from 'vite'

/** Serve potrace-plus.workers.js so the library's HEAD fetch + Worker load succeed */
function potraceWorkerPlugin(): Plugin {
  const source = path.resolve(
    __dirname,
    'node_modules/potrace-plus/dist/potrace-plus.workers.js',
  )

  return {
    name: 'potrace-worker',
    configureServer(server) {
      // Dev: serve the file when potrace-plus probes its expected relative path
      server.middlewares.use((req, res, next) => {
        if (req.url?.includes('potrace-plus.workers.js')) {
          try {
            const content = fs.readFileSync(source, 'utf-8')
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
            res.end(content)
            return
          } catch {
            // fall through
          }
        }
        next()
      })
    },
    // Build: copy workers file into output assets directory
    writeBundle(_opts, bundle) {
      const dest = path.resolve(__dirname, 'dist/assets/potrace-plus.workers.js')
      fs.mkdirSync(path.dirname(dest), { recursive: true })
      fs.copyFileSync(source, dest)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    svelte(),
    wasm(),
    topLevelAwait(),
    potraceWorkerPlugin(),
  ],
  worker: {
    format: 'es',
    plugins: () => [
      wasm(),
      topLevelAwait(),
    ],
  },
  server: {
    fs: {
      allow: [
        // Allow serving from project root
        '.',
      ],
    },
  },
  resolve: {
    alias: {
      '$lib': path.resolve(__dirname, './src/lib'),
    },
  },
  optimizeDeps: {
    // No exclusions needed
  },
})
