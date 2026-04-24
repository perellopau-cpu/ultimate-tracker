const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const svg = fs.readFileSync(path.join(__dirname, '../public/logo.svg'))

async function run() {
  await sharp(svg).resize(32, 32).png().toFile(path.join(__dirname, '../public/favicon.png'))
  console.log('✓ favicon.png')

  await sharp(svg).resize(192, 192).png().toFile(path.join(__dirname, '../public/pwa-192x192.png'))
  console.log('✓ pwa-192x192.png')

  await sharp(svg).resize(512, 512).png().toFile(path.join(__dirname, '../public/pwa-512x512.png'))
  console.log('✓ pwa-512x512.png')

  console.log('All icons generated!')
}

run().catch(console.error)
