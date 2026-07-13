import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

const WIDTH  = 1032
const HEIGHT = 336

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

function resolveColors(bgParam: string | null): { bgHex: string; iconColor: string } {
  if (bgParam) {
    const rgb = hexToRgb(bgParam)
    if (rgb) {
      const bgHex    = bgParam.startsWith('#') ? bgParam : `#${bgParam}`
      const iconColor = relativeLuminance(rgb.r, rgb.g, rgb.b) > 0.4 ? '#1A1A1A' : '#FFFFFF'
      return { bgHex, iconColor }
    }
  }
  return { bgHex: '#185FA5', iconColor: '#FFFFFF' }
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const bgParam = searchParams.get('bg')
  const count   = Math.max(0, parseInt(searchParams.get('count') ?? '0', 10))
  const max     = Math.max(1, parseInt(searchParams.get('max')   ?? '10', 10))
  const filled  = Math.min(count, max)

  const { bgHex, iconColor } = resolveColors(bgParam)

  // Single row for ≤10 stamps, two rows above that.
  const rows   = max > 10 ? 2 : 1
  const perRow = rows === 1 ? max : Math.ceil(max / 2)

  // Scale circle size so the row always fits inside WIDTH with comfortable padding.
  const R_SOLID = perRow <= 4  ? 52
                : perRow <= 6  ? 44
                : perRow <= 8  ? 38
                : perRow <= 10 ? 32
                :               24
  const R_GLOW = Math.round(R_SOLID * 1.35)
  const GAP    = Math.round(R_SOLID * 0.45)

  // Vertical centres for each row.
  const ROW_GAP    = Math.round(R_SOLID * 2.6)
  const rowCenters = rows === 1
    ? [HEIGHT / 2]
    : [HEIGHT / 2 - ROW_GAP / 2, HEIGHT / 2 + ROW_GAP / 2]

  let circlesSvg = ''
  let idx = 0

  for (let row = 0; row < rows; row++) {
    const n  = row === 0 ? perRow : max - perRow
    const tw = n * 2 * R_SOLID + (n - 1) * GAP
    const x0 = (WIDTH - tw) / 2 + R_SOLID
    const cy = rowCenters[row]

    for (let col = 0; col < n; col++) {
      const cx       = x0 + col * (2 * R_SOLID + GAP)
      const isFilled = idx < filled
      idx++

      if (isFilled) {
        circlesSvg += `<circle cx="${cx}" cy="${cy}" r="${R_GLOW}"  fill="${iconColor}" fill-opacity="0.22"/>`
        circlesSvg += `<circle cx="${cx}" cy="${cy}" r="${R_SOLID}" fill="${iconColor}"/>`
      } else {
        circlesSvg += `<circle cx="${cx}" cy="${cy}" r="${R_SOLID}" fill="none" stroke="${iconColor}" stroke-width="3" stroke-opacity="0.3"/>`
      }
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <defs>
    <linearGradient id="vgn" x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox">
      <stop offset="0%"   stop-color="black" stop-opacity="0.22"/>
      <stop offset="45%"  stop-color="black" stop-opacity="0"/>
      <stop offset="55%"  stop-color="black" stop-opacity="0"/>
      <stop offset="100%" stop-color="black" stop-opacity="0.22"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${bgHex}"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#vgn)"/>
  ${circlesSvg}
</svg>`

  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer()

  return new NextResponse(new Uint8Array(pngBuffer), {
    headers: {
      'Content-Type':  'image/png',
      // Each unique count+max+bg combo is its own immutable URL.
      'Cache-Control': 'public, max-age=86400, immutable',
    },
  })
}
