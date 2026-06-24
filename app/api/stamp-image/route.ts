import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

const WIDTH  = 1032
const HEIGHT = 336

// ── Contrast helpers (WCAG relative luminance) ─────────────────────────────

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

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
           .replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

// ── Route ──────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const bgParam   = searchParams.get('bg')
  const rawName   = searchParams.get('name') ?? ''
  // Truncate long names so they don't overflow the banner
  const displayName = rawName.length > 22 ? rawName.slice(0, 20) + '…' : rawName || 'LOYALTY'

  const { bgHex, iconColor } = resolveColors(bgParam)

  // 5 decorative circles, evenly spaced, centered across the full width
  // Centers: 156, 336, 516, 696, 876  (symmetric padding = 112px each side)
  const CIRCLE_CENTERS = [156, 336, 516, 696, 876]
  const CY      = 222   // vertical center of circles — sits below the text block
  const R_GLOW  = 60    // soft halo radius
  const R_SOLID = 44    // filled circle radius

  const circles = CIRCLE_CENTERS.map(cx =>
    `<circle cx="${cx}" cy="${CY}" r="${R_GLOW}"  fill="${iconColor}" fill-opacity="0.18"/>` +
    `<circle cx="${cx}" cy="${CY}" r="${R_SOLID}" fill="${iconColor}"/>`
  ).join('\n  ')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <defs>
    <linearGradient id="vgn" x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox">
      <stop offset="0%"   stop-color="black" stop-opacity="0.22"/>
      <stop offset="45%"  stop-color="black" stop-opacity="0"/>
      <stop offset="55%"  stop-color="black" stop-opacity="0"/>
      <stop offset="100%" stop-color="black" stop-opacity="0.22"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${bgHex}"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#vgn)"/>

  <!-- Business name -->
  <text x="64" y="80"
    font-family="Arial, Helvetica, sans-serif"
    font-size="34" font-weight="700"
    fill="${iconColor}">${escapeXml(displayName)}</text>

  <!-- "LOYALTY CARD" subtitle -->
  <text x="66" y="110"
    font-family="Arial, Helvetica, sans-serif"
    font-size="13" letter-spacing="5"
    fill="${iconColor}" fill-opacity="0.55">LOYALTY CARD</text>

  <!-- Decorative stamp circles -->
  ${circles}
</svg>`

  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer()

  return new NextResponse(new Uint8Array(pngBuffer), {
    headers: {
      'Content-Type':  'image/png',
      // URL contains bg+name so different brands get different cache entries
      'Cache-Control': 'public, max-age=86400, immutable',
    },
  })
}
