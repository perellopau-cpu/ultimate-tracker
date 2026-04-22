import sharp from 'sharp'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const svgPath = resolve(__dirname, '../public/logo.svg')
const svg = readFileSync(svgPath)

const sizes = [192, 512]

for (const size of sizes) {
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(resolve(__dirname, `../public/pwa-${size}x${size}.png`))
  console.log(`Generated pwa-${size}x${size}.png`)
}

await sharp(svg)
  .resize(32, 32)
  .png()
  .toFile(resolve(__dirname, '../public/favicon.png'))
console.log('Generated favicon.png')
