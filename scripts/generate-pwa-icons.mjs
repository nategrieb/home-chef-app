/**
 * Generates the PNG home-screen icons into public/. Same look as the LFD icon (green gradient tile,
 * heavy white lettering), with "MENU" over a faint triangle, the app's brand mark.
 *
 *   node scripts/generate-pwa-icons.mjs
 *
 * Uses `sharp`, which ships with Next.js. Icons are full-bleed squares: iOS rounds the corners itself.
 */

import sharp from 'sharp'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const OUT = join(process.cwd(), 'public')
mkdirSync(OUT, { recursive: true })

function iconSvg(size) {
  const fontSize = size * 0.27
  const p = (x, y) => `${(x * size).toFixed(1)},${(y * size).toFixed(1)}`
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#166534"/>
      <stop offset="1" stop-color="#16a34a"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#g)"/>
  <polygon points="${p(0.5, 0.1)} ${p(0.93, 0.86)} ${p(0.07, 0.86)}" fill="#ffffff" fill-opacity="0.07"/>
  <text x="${size / 2}" y="${size / 2 + fontSize * 0.35}" text-anchor="middle"
        font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-weight="800"
        font-size="${fontSize}" letter-spacing="${-fontSize * 0.02}" fill="#ffffff">MENU</text>
</svg>`)
}

const targets = [
  { file: 'apple-touch-icon.png', size: 180 },
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
]

for (const { file, size } of targets) {
  await sharp(iconSvg(size)).png().toFile(join(OUT, file))
  console.log(`✓ public/${file} (${size}×${size})`)
}
