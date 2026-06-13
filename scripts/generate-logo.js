const sharp = require('sharp')
const path = require('path')

const SIZE = 512
const RADIUS = 96

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <!-- Blue rounded square background -->
  <rect width="${SIZE}" height="${SIZE}" rx="${RADIUS}" ry="${RADIUS}" fill="#185FA5"/>

  <!-- Stamp border ring -->
  <circle cx="256" cy="220" r="130" fill="none" stroke="white" stroke-width="14" stroke-dasharray="18 10"/>

  <!-- Checkmark -->
  <polyline points="170,220 230,285 350,160"
    fill="none" stroke="white" stroke-width="28"
    stroke-linecap="round" stroke-linejoin="round"/>

  <!-- "STAMP" label at bottom -->
  <text x="256" y="395" font-family="Arial, sans-serif" font-size="52" font-weight="bold"
    fill="white" text-anchor="middle" letter-spacing="10">STAMP</text>
</svg>`

sharp(Buffer.from(svg))
  .png()
  .toFile(path.join(__dirname, '..', 'public', 'logo.png'))
  .then(() => console.log('logo.png written to public/'))
  .catch(err => { console.error(err); process.exit(1) })
