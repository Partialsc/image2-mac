import { mkdir, readFile, writeFile } from 'node:fs/promises'
import sharp from 'sharp'

// macOS 图标：electron-builder 会自动把 ≥512px 的 PNG 转成 icns
const source = await readFile(new URL('../build/icon.svg', import.meta.url))
const image = await sharp(source)
  .resize(1024, 1024)
  .png({ compressionLevel: 9 })
  .toBuffer()

await mkdir(new URL('../build/', import.meta.url), { recursive: true })
await writeFile(new URL('../build/icon.png', import.meta.url), image)
