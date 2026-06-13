const sharp = require('sharp')
const path = require('path')

const WIDTH = 1032, HEIGHT = 336
const FILLED = '#185FA5', EMPTY_FILL = '#F9FAFB', EMPTY_STROKE = '#D1D5DB', STROKE_WIDTH = 6, BG = '#FFFFFF'

function buildSvg(count, max) {
  const rows = max <= 5 ? 1 : 2
  const cols = rows === 1 ? max : Math.ceil(max / 2)
  const padX = 60, padY = 40
  const usableW = WIDTH - padX * 2, usableH = HEIGHT - padY * 2
  const diameter = Math.floor(Math.min(usableW / cols, usableH / rows) * 0.72)
  const radius = diameter / 2
  const gapX = (usableW - cols * diameter) / (cols + 1)
  const gapY = rows === 1 ? 0 : (usableH - rows * diameter) / (rows + 1)

  const circles = []
  for (let i = 0; i < max; i++) {
    const row = rows === 1 ? 0 : Math.floor(i / cols)
    const col = i % cols
    const cx = padX + gapX * (col + 1) + diameter * col + radius
    const cy = rows === 1 ? HEIGHT / 2 : padY + gapY * (row + 1) + diameter * row + radius
    const filled = i < count
    circles.push(filled
      ? `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${FILLED}" />`
      : `<circle cx="${cx}" cy="${cy}" r="${radius - STROKE_WIDTH / 2}" fill="${EMPTY_FILL}" stroke="${EMPTY_STROKE}" stroke-width="${STROKE_WIDTH}" />`)
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${BG}" />
  ${circles.join('\n  ')}
</svg>`
}

async function main() {
  for (const [count, max] of [[3, 10], [0, 10], [10, 10], [2, 5]]) {
    const svg = buildSvg(count, max)
    const file = path.join(__dirname, `test-stamp-${count}-of-${max}.png`)
    await sharp(Buffer.from(svg)).png().toFile(file)
    console.log(`OK: ${file}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
