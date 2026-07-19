// Regenerates public/logo.png as the Taply hexagon mark (512x512).
// Usage: node scripts/make-taply-logo.mjs
import sharp from 'sharp'

const svg = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="115" fill="#FFFDF8"/>
  <g transform="translate(66,66) scale(3.8)">
    <polygon points="50,12 83,31 83,69 50,88 17,69 17,31"
      fill="#F2A33C" stroke="#F2A33C" stroke-width="12" stroke-linejoin="round"/>
    <circle cx="50" cy="50" r="11" fill="#FFFDF8"/>
  </g>
</svg>`

await sharp(Buffer.from(svg)).png().toFile('public/logo.png')
console.log('public/logo.png written')
