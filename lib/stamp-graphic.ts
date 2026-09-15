import sharp from 'sharp'
import { CARD_THEME_SPECS, isCardTheme, type CardTheme } from '@/lib/card-themes'

/**
 * The honeycomb stamp graphic embedded in the Apple Wallet pass.
 *
 * Geometry is lifted from the StampHex component in WalletPassCard so the
 * honeycomb on a pass is the same shape the customer already saw on the join
 * page: a filled hexagon punched with a centre hole, an empty one drawn as an
 * outline. Colours come from CARD_THEME_SPECS rather than the single flat
 * WALLET_HEX, which is what made the pass look unrelated to the product.
 *
 * Apple embeds the bytes (strip.png), so this renders straight to a Buffer.
 * Google still draws its hero image from /api/stamp-image, which has its own
 * older circle renderer — pointing that at this module is a separate change.
 */

/** Hexagon path in a 100x100 box — identical to StampHex. */
const HEX_FILLED = '50,12 83,31 83,69 50,88 17,69 17,31'
const HEX_EMPTY  = '50,14 81,32 81,68 50,86 19,68 19,32'

/** Visible hexagon height as a fraction of its box, plus the gap between rows. */
const GLYPH_H  = 0.88
const ROW_GAP  = 0.12

export type StampPalette = {
  background: string
  stampFill: string
  stampHole: string
  stampEmpty: string
  /** Empty hexes are a solid spec colour when themed, a wash when derived. */
  emptyOpacity: number
}

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

export function luminance(hex: string): number {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0
  return 0.2126 * linearize(rgb.r) + 0.7152 * linearize(rgb.g) + 0.0722 * linearize(rgb.b)
}

/**
 * Theme wins when there is one. Otherwise derive a palette from the brand
 * colour, so a business with no card_theme still gets a sensible graphic.
 */
export function paletteFor(theme: unknown, fallbackHex: string): StampPalette {
  if (isCardTheme(theme)) {
    const t = CARD_THEME_SPECS[theme as CardTheme]
    return {
      background:   t.cardBg,
      stampFill:    t.stampFill,
      stampHole:    t.stampHole,
      stampEmpty:   t.stampEmpty,
      emptyOpacity: 1,
    }
  }

  const contrast = luminance(fallbackHex) > 0.4 ? '#1A1A1A' : '#FFFFFF'
  return {
    background:   fallbackHex,
    stampFill:    contrast,
    stampHole:    fallbackHex,
    stampEmpty:   contrast,
    emptyOpacity: 0.28,
  }
}

export type StampGraphicOptions = {
  count: number
  max: number
  width: number
  height: number
  palette: StampPalette
  /** Fraction of the short edge kept clear of the outermost hex. */
  padding?: number
}

/**
 * One hexagon, scaled from its native 100x100 box to `size` at (x, y).
 * The glyph only fills ~72% of its box width, so boxes can sit flush and
 * still leave a visible gap between hexes.
 */
function hexSvg(x: number, y: number, size: number, filled: boolean, p: StampPalette): string {
  const s = size / 100
  const open = `<g transform="translate(${r2(x)} ${r2(y)}) scale(${r4(s)})">`

  if (filled) {
    return (
      open +
      `<polygon points="${HEX_FILLED}" fill="${p.stampFill}" stroke="${p.stampFill}" ` +
      `stroke-width="12" stroke-linejoin="round"/>` +
      `<circle cx="50" cy="50" r="11" fill="${p.stampHole}"/>` +
      `</g>`
    )
  }

  return (
    open +
    `<polygon points="${HEX_EMPTY}" fill="none" stroke="${p.stampEmpty}" ` +
    `stroke-opacity="${p.emptyOpacity}" stroke-width="9" stroke-linejoin="round"/>` +
    `</g>`
  )
}

function r2(v: number) { return Math.round(v * 100) / 100 }
function r4(v: number) { return Math.round(v * 10000) / 10000 }

export function buildStampSvg({ count, max, width, height, palette, padding = 0.12 }: StampGraphicOptions): string {
  const total  = Math.max(1, max)
  const filled = Math.min(Math.max(0, count), total)

  const padX = width * padding * 0.5
  const padY = height * padding

  // Pick the row count that lets the hexes be biggest on this canvas rather
  // than fixing a threshold: a wide hero and a shorter Apple strip want
  // different splits. Boxes sit flush horizontally; the glyph's own margin
  // supplies the gap. Ties keep the flatter layout.
  let rows = 1
  let perRow = total
  let size = 0

  for (let r = 1; r <= 3; r++) {
    const n = Math.ceil(total / r)
    const candidate = Math.min(
      (width - 2 * padX) / n,
      (height - 2 * padY) / (r * GLYPH_H + (r - 1) * ROW_GAP),
    )
    if (candidate > size) {
      size = candidate
      rows = r
      perRow = n
    }
  }

  const rowStep    = size * (GLYPH_H + ROW_GAP)
  const blockHeight = size * (rows * GLYPH_H + (rows - 1) * ROW_GAP)
  const blockTop   = (height - blockHeight) / 2

  let hexes = ''
  let idx = 0

  for (let row = 0; row < rows; row++) {
    const n = Math.min(perRow, total - row * perRow)
    if (n <= 0) break
    const x0 = (width - n * size) / 2
    // The glyph is inset ~6% from the top of its box; pull it back so the
    // visible hexagon, not the box, is what gets centred.
    const y  = blockTop + row * rowStep - size * 0.06

    for (let col = 0; col < n; col++) {
      hexes += hexSvg(x0 + col * size, y, size, idx < filled, palette)
      idx++
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect width="${width}" height="${height}" fill="${palette.background}"/>
  ${hexes}
</svg>`
}

export async function renderStampPng(options: StampGraphicOptions): Promise<Buffer> {
  return sharp(Buffer.from(buildStampSvg(options))).png().toBuffer()
}
