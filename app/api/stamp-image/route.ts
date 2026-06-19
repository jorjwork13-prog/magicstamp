import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { computeRowLayout } from '@/lib/stamps'

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

  const rowLayout = computeRowLayout(max)
  const numRows = rowLayout.length
  const maxCols = Math.max(...rowLayout)

  const padX = 60
  const padY = 40
  const usableW = WIDTH - padX * 2
  const usableH = HEIGHT - padY * 2

  const diameter = Math.floor(Math.min(usableW / maxCols, usableH / numRows) * 0.72)
  const radius = diameter / 2

  const vertTotalGap = usableH - numRows * diameter
  const gapY = vertTotalGap / (numRows + 1)

  const circles: string[] = []
  let circleIndex = 0

  for (let r = 0; r < numRows; r++) {
    const n = rowLayout[r]
    const horizTotalGap = usableW - n * diameter
    const gapX = horizTotalGap / (n + 1)
    const cy = padY + gapY * (r + 1) + diameter * r + radius

    for (let c = 0; c < n; c++) {
      const cx = padX + gapX * (c + 1) + diameter * c + radius
      const filled = circleIndex < count
      circleIndex++

      circles.push(
        filled
          ? `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${FILLED}" />`
          : `<circle cx="${cx}" cy="${cy}" r="${radius - STROKE_WIDTH / 2}" fill="${EMPTY_FILL}" stroke="${EMPTY_STROKE}" stroke-width="${STROKE_WIDTH}" />`
      )
    }
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
