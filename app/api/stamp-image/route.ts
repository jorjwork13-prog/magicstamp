import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { computeRowLayout } from '@/lib/stamps'

const WIDTH        = 1032
const HEIGHT       = 336
const STROKE_WIDTH = 6

// ── Contrast helpers ───────────────────────────────────────────────────────

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.startsWith('#') ? hex.slice(1) : hex
  if (!/^[0-9A-Fa-f]{6}$/.test(clean)) return null
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  }
}

function linearize(c: number): number {
  const s = c / 255
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

function relativeLuminance(r: number, g: number, b: number): number {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)
}

type Colors = { filled: string; emptyFill: string; emptyStroke: string; background: string }

function resolveColors(bgParam: string | null): Colors {
  if (bgParam) {
    const rgb = hexToRgb(bgParam)
    if (rgb) {
      const lum   = relativeLuminance(rgb.r, rgb.g, rgb.b)
      const bgHex = bgParam.startsWith('#') ? bgParam : `#${bgParam}`
      return lum > 0.4
        // Light card (yellow, white…) → dark circles
        ? { filled: '#1A1A1A', emptyFill: 'none', emptyStroke: '#555555', background: bgHex }
        // Dark card (blue, black…) → light circles
        : { filled: '#FFFFFF', emptyFill: 'none', emptyStroke: '#888888', background: bgHex }
    }
  }
  // No bg param or invalid → existing blue-on-white fallback
  return { filled: '#185FA5', emptyFill: '#F9FAFB', emptyStroke: '#D1D5DB', background: '#FFFFFF' }
}

// ── Route ──────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const count  = Math.max(0, parseInt(searchParams.get('count') ?? '0',  10))
  const max    = Math.max(1, parseInt(searchParams.get('max')   ?? '10', 10))
  const bgParam = searchParams.get('bg')

  const { filled, emptyFill, emptyStroke, background } = resolveColors(bgParam)

  const rowLayout = computeRowLayout(max)
  const numRows   = rowLayout.length
  const maxCols   = Math.max(...rowLayout)

  const padX    = 60
  const padY    = 40
  const usableW = WIDTH  - padX * 2
  const usableH = HEIGHT - padY * 2

  const diameter = Math.floor(Math.min(usableW / maxCols, usableH / numRows) * 0.72)
  const radius   = diameter / 2

  const vertTotalGap = usableH - numRows * diameter
  const gapY         = vertTotalGap / (numRows + 1)

  const circles: string[] = []
  let circleIndex = 0

  for (let r = 0; r < numRows; r++) {
    const n    = rowLayout[r]
    const gapX = (usableW - n * diameter) / (n + 1)
    const cy   = padY + gapY * (r + 1) + diameter * r + radius

    for (let c = 0; c < n; c++) {
      const cx       = padX + gapX * (c + 1) + diameter * c + radius
      const isFilled = circleIndex < count
      circleIndex++

      circles.push(
        isFilled
          ? `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${filled}" />`
          : `<circle cx="${cx}" cy="${cy}" r="${radius - STROKE_WIDTH / 2}" fill="${emptyFill}" stroke="${emptyStroke}" stroke-width="${STROKE_WIDTH}" />`
      )
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${background}" />
  ${circles.join('\n  ')}
</svg>`

  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer()

  return new NextResponse(new Uint8Array(pngBuffer), {
    headers: {
      'Content-Type':  'image/png',
      'Cache-Control': 'public, max-age=86400, immutable',
    },
  })
}
