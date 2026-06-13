import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

const WIDTH = 1032
const HEIGHT = 336
const FILLED = '#185FA5'
const EMPTY_FILL = '#F9FAFB'
const EMPTY_STROKE = '#D1D5DB'
const STROKE_WIDTH = 6
const BG = '#FFFFFF'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const count = Math.max(0, parseInt(searchParams.get('count') ?? '0', 10))
  const max = Math.max(1, parseInt(searchParams.get('max') ?? '10', 10))

  const rows = max <= 5 ? 1 : 2
  const cols = rows === 1 ? max : Math.ceil(max / 2)

  const padX = 60
  const padY = 40
  const usableW = WIDTH - padX * 2
  const usableH = HEIGHT - padY * 2

  const diameter = Math.floor(Math.min(usableW / cols, usableH / rows) * 0.72)
  const radius = diameter / 2
  const gapX = (usableW - cols * diameter) / (cols + 1)
  const gapY = rows === 1 ? 0 : (usableH - rows * diameter) / (rows + 1)

  const circles: string[] = []

  for (let i = 0; i < max; i++) {
    const row = rows === 1 ? 0 : Math.floor(i / cols)
    const col = i % cols

    const cx = padX + gapX * (col + 1) + diameter * col + radius
    const cy = rows === 1
      ? HEIGHT / 2
      : padY + gapY * (row + 1) + diameter * row + radius

    const filled = i < count

    circles.push(
      filled
        ? `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${FILLED}" />`
        : `<circle cx="${cx}" cy="${cy}" r="${radius - STROKE_WIDTH / 2}" fill="${EMPTY_FILL}" stroke="${EMPTY_STROKE}" stroke-width="${STROKE_WIDTH}" />`
    )
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${BG}" />
  ${circles.join('\n  ')}
</svg>`

  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer()

  return new NextResponse(new Uint8Array(pngBuffer), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400, immutable',
    },
  })
}
