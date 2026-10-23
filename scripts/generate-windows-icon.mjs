import { mkdir, readFile, writeFile } from 'node:fs/promises'
import sharp from 'sharp'

const sizes = [16, 20, 24, 32, 40, 48, 64, 128, 256]
const source = await readFile(new URL('../build/icon.svg', import.meta.url))
const images = await Promise.all(
  sizes.map((size) =>
    sharp(source)
      .resize(size, size)
      .png({ compressionLevel: 9 })
      .toBuffer(),
  ),
)

const headerSize = 6 + images.length * 16
const header = Buffer.alloc(headerSize)
header.writeUInt16LE(1, 2)
header.writeUInt16LE(images.length, 4)

let offset = headerSize
images.forEach((image, idx) => {
  const size = sizes[idx]
  const entryOffset = 6 + idx * 16
  header.writeUInt8(size === 256 ? 0 : size, entryOffset)
  header.writeUInt8(size === 256 ? 0 : size, entryOffset + 1)
  header.writeUInt16LE(1, entryOffset + 4)
  header.writeUInt16LE(32, entryOffset + 6)
  header.writeUInt32LE(image.length, entryOffset + 8)
  header.writeUInt32LE(offset, entryOffset + 12)
  offset += image.length
})

await mkdir(new URL('../build/', import.meta.url), { recursive: true })
await writeFile(new URL('../build/icon.ico', import.meta.url), Buffer.concat([header, ...images]))
