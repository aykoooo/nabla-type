// Copies potrace-plus workers file from node_modules to public/assets/
// so potrace-plus can find it at runtime (its internal URL resolution
// expects the file next to its own ESM bundle).

import { copyFileSync, mkdirSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const src = resolve(__dirname, '../node_modules/potrace-plus/dist/potrace-plus.workers.js')
const destDir = resolve(__dirname, '../public/assets')
const dest = resolve(destDir, 'potrace-plus.workers.js')

if (!existsSync(src)) {
    console.error('[postinstall] Source not found:', src)
    process.exit(1)
}

mkdirSync(destDir, { recursive: true })
copyFileSync(src, dest)
console.log('[postinstall] Copied potrace-plus.workers.js → public/assets/')