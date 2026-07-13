import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

const WIDTH  = 1032
const HEIGHT = 336
const PAD_X  = 56   // min horizontal clearance from canvas edge to nearest circle edge
const PAD_Y  = 40   // min vertical clearance

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

function luminance(r: number, g: number, b: number): number {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)
}

function resolveColors(bgParam: string | null): { bgHex: string; iconColor: string } {
  if (bgParam) {
    const rgb = hexToRgb(bgParam)
    if (rgb) {
      const bgHex = bgParam.startsWith('#') ? bgParam : `#${bgParam}`
      return { bgHex, iconColor: luminance(rgb.r, rgb.g, rgb.b) > 0.4 ? '#1A1A1A' : '#FFFFFF' }
    }
  }
  return { bgHex: '#185FA5', iconColor: '#FFFFFF' }
}

function n2(v: number) { return Math.round(v * 100) / 100 }

export async function GET(req: NextRequest) {
  const sp      = req.nextUrl.searchParams
  const bgParam = sp.get('bg')
  const count   = Math.max(0, parseInt(sp.get('count') ?? '0', 10))
  const max     = Math.max(1, parseInt(sp.get('max')   ?? '10', 10))
  const filled  = Math.min(count, max)

  const { bgHex, iconColor } = resolveColors(bgParam)

  // Layout: single row for ≤10, two rows above that.
  const rows   = max > 10 ? 2 : 1
  const perRow = rows === 1 ? max : Math.ceil(max / 2)

  // ── Radius calculation ────────────────────────────────────────────────────
  // Gap between adjacent circle edges = R (one full radius of breathing room).
  // Row step = 2R (diameter) + R (gap) = 3R.
  // Width budget:  perRow*(2R) + (perRow-1)*R + 2*PAD_X ≤ WIDTH
  //                R*(3*perRow - 1) ≤ WIDTH - 2*PAD_X
  const R_fromWidth = Math.floor((WIDTH - 2 * PAD_X) / (3 * perRow - 1))
  // Height budget (2 rows): top of upper row = HEIGHT/2 − 5R/2 ≥ PAD_Y
  //                         R ≤ (HEIGHT/2 − PAD_Y) × 2/5
  const R_fromHeight = rows === 2
    ? Math.floor((HEIGHT / 2 - PAD_Y) * 2 / 5)
    : HEIGHT / 2 - PAD_Y  // 1-row height ceiling — not the binding constraint
  const R = Math.min(64, R_fromWidth, R_fromHeight)

  // ── Row vertical centres ──────────────────────────────────────────────────
  // Row-to-row gap matches the column gap (= R), so: ROW_GAP = 2R + R = 3R.
  const rowCenters = rows === 1
    ? [HEIGHT / 2]
    : [HEIGHT / 2 - (3 * R) / 2, HEIGHT / 2 + (3 * R) / 2]

  // ── Circle SVG builder ────────────────────────────────────────────────────
  const strokeW  = Math.max(2, Math.round(R * 0.12))  // empty ring stroke
  const checkW   = Math.max(2, Math.round(R * 0.17))  // checkmark stroke

  function makeCheck(cx: number, cy: number): string {
    // Checkmark as three-point SVG path, colour = bgHex (contrasts with filled circle).
    const p1 = `${n2(cx - R * 0.30)} ${n2(cy + R * 0.06)}`
    const p2 = `${n2(cx - R * 0.03)} ${n2(cy + R * 0.32)}`
    const p3 = `${n2(cx + R * 0.38)} ${n2(cy - R * 0.26)}`
    return `<path d="M ${p1} L ${p2} L ${p3}" ` +
           `stroke="${bgHex}" stroke-width="${checkW}" ` +
           `stroke-linecap="round" stroke-linejoin="round" fill="none"/>`
  }

  let circlesSvg = ''
  let idx = 0

  for (let row = 0; row < rows; row++) {
    const n   = row === 0 ? perRow : max - perRow
    // Total row width = n*2R + (n-1)*R = (3n-1)*R
    const tw  = (3 * n - 1) * R
    const x0  = (WIDTH - tw) / 2 + R
    const cy  = rowCenters[row]

    for (let col = 0; col < n; col++) {
      const cx       = n2(x0 + col * 3 * R)
      const isFilled = idx < filled
      idx++

      if (isFilled) {
        // Solid circle + inner radial highlight overlay (top-left lit) + checkmark path
        circlesSvg +=
          `<circle cx="${cx}" cy="${n2(cy)}" r="${R}" fill="${iconColor}"/>` +
          `<circle cx="${cx}" cy="${n2(cy)}" r="${R}" fill="url(#hl)"/>` +
          makeCheck(cx, cy)
      } else {
        // Hollow ring — thin, muted
        circlesSvg +=
          `<circle cx="${cx}" cy="${n2(cy)}" r="${R}" ` +
          `fill="none" stroke="${iconColor}" stroke-width="${strokeW}" stroke-opacity="0.28"/>`
      }
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <defs>
    <linearGradient id="vgn" x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox">
      <stop offset="0%"   stop-color="black" stop-opacity="0.20"/>
      <stop offset="40%"  stop-color="black" stop-opacity="0"/>
      <stop offset="60%"  stop-color="black" stop-opacity="0"/>
      <stop offset="100%" stop-color="black" stop-opacity="0.20"/>
    </linearGradient>
    <radialGradient id="hl" cx="38%" cy="30%" r="65%">
      <stop offset="0%"   stop-color="white" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="white" stop-opacity="0"/>
    </radialGradient>
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
