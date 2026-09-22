import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { parse, type Font } from 'opentype.js'
import sharp from 'sharp'
import { CARD_THEME_SPECS, isCardTheme, type CardTheme } from '@/lib/card-themes'

/**
 * The stamp graphic on both wallet passes — Apple's strip.png and Google's
 * hero image (/api/stamp-image): the "პროგრესი  N / M" row above the
 * honeycomb, laid out like WalletPassCard.
 *
 * Everything the customer reads lives inside this image. In an Apple
 * storeCard, primaryFields render on top of the strip, so a native progress
 * field would collide with the hexagons; on Google, Georgian in
 * textModulesData is unreliable, but text drawn into the image is not.
 *
 * Geometry is lifted from the StampHex component in WalletPassCard so the
 * honeycomb on a pass is the same shape the customer already saw on the join
 * page: a filled hexagon punched with a centre hole, an empty one drawn as an
 * outline. Colours come from CARD_THEME_SPECS rather than the single flat
 * WALLET_HEX, which is what made the pass look unrelated to the product.
 *
 * Renders straight to a Buffer: Apple embeds the bytes, and the Google route
 * returns them as the hero image.
 */

/** Hexagon path in a 100x100 box — identical to StampHex. */
const HEX_FILLED = '50,12 83,31 83,69 50,88 17,69 17,31'
const HEX_EMPTY  = '50,14 81,32 81,68 50,86 19,68 19,32'

/** Visible hexagon height as a fraction of its box. */
const GLYPH_H = 0.88
/** WalletPassCard's grid: 48px hexes with a 10px gap on both axes. */
const GAP = 10 / 48

// Layout in points on Apple's 375pt-wide strip; everything scales with width,
// so the @2x/@3x renders are the same picture with more pixels. The card's own
// sizes (12px label, 22px number, 16px row gap) are tightened slightly to fit
// the strip's 123pt height.
const REF_W          = 375
const PAD_X          = 22
const PAD_TOP        = 14
const PAD_BOTTOM     = 12
const LABEL_SIZE     = 11
const LABEL_TRACKING = 0.08 // em, as on the card
const NUM_SIZE       = 20
const ROW_TO_GRID    = 12
/** Minimum space between label and number when the grid is narrow. */
const MIN_ROW_GAP    = 16
/** The card's content edge sits this far (in hex boxes) outside the grid. */
const ROW_OVERHANG   = 8 / 48

const LABEL = 'პროგრესი'

export type StampPalette = {
  background: string
  stampFill: string
  stampHole: string
  stampEmpty: string
  /** Empty hexes are a solid spec colour when themed, a wash when derived. */
  emptyOpacity: number
  progressLabel: string
  progressNum: string
  progressDim: string
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

/** `t` of the way from `to` towards `from`, as hex. */
function mix(from: string, to: string, t: number): string {
  const a = hexToRgb(from)
  const b = hexToRgb(to)
  if (!a || !b) return from
  const ch = (x: number, y: number) => Math.round(y + (x - y) * t).toString(16).padStart(2, '0')
  return `#${ch(a.r, b.r)}${ch(a.g, b.g)}${ch(a.b, b.b)}`
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
      stampEmpty:    t.stampEmpty,
      emptyOpacity:  1,
      progressLabel: t.progressLabel,
      progressNum:   t.progressNum,
      progressDim:   t.progressDim,
    }
  }

  const contrast = luminance(fallbackHex) > 0.4 ? '#1A1A1A' : '#FFFFFF'
  return {
    background:    fallbackHex,
    stampFill:     contrast,
    stampHole:     fallbackHex,
    stampEmpty:    contrast,
    emptyOpacity:  0.28,
    progressLabel: mix(contrast, fallbackHex, 0.6),
    progressNum:   contrast,
    progressDim:   mix(contrast, fallbackHex, 0.45),
  }
}

export type StampGraphicOptions = {
  count: number
  max: number
  width: number
  height: number
  palette: StampPalette
}

// ── Text ─────────────────────────────────────────────────────────────────────
// sharp draws SVG <text> with whatever fonts the host has installed, which on
// Vercel is none, so Georgian would come out as empty boxes. Text is turned
// into outline paths from bundled fonts instead, so the output is the same on
// every machine. Both fonts are OFL (licences sit beside the files) and
// next.config.ts traces them into the wallet route.

type Fonts = { label: Font; mono: Font }

let fontCache: Promise<Fonts> | null = null

function loadFonts(): Promise<Fonts> {
  if (!fontCache) {
    fontCache = (async () => {
      const dir = path.join(process.cwd(), 'assets', 'fonts')
      const [label, mono] = await Promise.all(
        ['NotoSansGeorgian-SemiBold.ttf', 'JetBrainsMono-Medium.ttf'].map(async (file) => {
          const buf = await readFile(path.join(dir, file))
          return parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))
        }),
      )
      return { label, mono }
    })()
    fontCache.catch(() => { fontCache = null })
  }
  return fontCache
}

/** Advance width of `text`, with CSS-style letter-spacing between glyphs. */
function textWidth(font: Font, text: string, size: number, tracking = 0): number {
  const glyphs = font.stringToGlyphs(text)
  const scale  = size / font.unitsPerEm
  const advance = glyphs.reduce((w, g) => w + (g.advanceWidth ?? 0) * scale, 0)
  return advance + tracking * size * Math.max(0, glyphs.length - 1)
}

/** `text` as one filled path, starting at (x, baseline). */
function textPath(font: Font, text: string, x: number, baseline: number, size: number, fill: string, tracking = 0): string {
  const scale = size / font.unitsPerEm
  let d = ''
  let cx = x
  for (const g of font.stringToGlyphs(text)) {
    d += g.getPath(cx, baseline, size).toPathData(2)
    cx += (g.advanceWidth ?? 0) * scale + tracking * size
  }
  return d ? `<path d="${d}" fill="${fill}"/>` : ''
}

function capHeight(font: Font): number {
  return (font.tables.os2?.sCapHeight || font.unitsPerEm * 0.7) / font.unitsPerEm
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

export function buildStampSvg({ count, max, width, height, palette }: StampGraphicOptions, fonts: Fonts): string {
  const total  = Math.max(1, max)
  const filled = Math.min(Math.max(0, count), total)
  const s      = width / REF_W

  // ── Progress row metrics ──────────────────────────────────────────────────
  const labelSize = LABEL_SIZE * s
  const numSize   = NUM_SIZE * s
  const baseline  = PAD_TOP * s + numSize * capHeight(fonts.mono)
  const countText = String(filled)
  const maxText   = ` / ${total}`
  const labelW    = textWidth(fonts.label, LABEL, labelSize, LABEL_TRACKING)
  const countW    = textWidth(fonts.mono, countText, numSize)
  const maxW      = textWidth(fonts.mono, maxText, numSize)

  // ── Hex grid ──────────────────────────────────────────────────────────────
  // Pick the row count that lets the hexes be biggest in the space under the
  // row rather than fixing a threshold. Ties keep the flatter layout.
  const gridTop = baseline + ROW_TO_GRID * s
  const availW  = width - 2 * PAD_X * s
  const availH  = height - PAD_BOTTOM * s - gridTop

  let rows = 1
  let perRow = total
  let size = 0

  for (let r = 1; r <= 3; r++) {
    const n = Math.ceil(total / r)
    const candidate = Math.min(
      availW / (n + (n - 1) * GAP),
      availH / ((r - 1) * (1 + GAP) + GLYPH_H),
    )
    if (candidate > size) {
      size = candidate
      rows = r
      perRow = n
    }
  }

  const pitch    = size * (1 + GAP)
  const gridW    = perRow * size + (perRow - 1) * GAP * size
  const gridX0   = (width - gridW) / 2
  const blockH   = (rows - 1) * pitch + size * GLYPH_H
  const blockTop = gridTop + (availH - blockH) / 2

  let hexes = ''
  let idx = 0

  for (let row = 0; row < rows; row++) {
    const n = Math.min(perRow, total - row * perRow)
    if (n <= 0) break
    // The glyph is inset ~6% from the top of its box; pull it back so the
    // visible hexagon, not the box, is what gets centred.
    const y = blockTop + row * pitch - size * 0.06

    // A short last row stays on the grid's columns, as in the card's CSS grid.
    for (let col = 0; col < n; col++) {
      hexes += hexSvg(gridX0 + col * pitch, y, size, idx < filled, palette)
      idx++
    }
  }

  // ── Progress row ──────────────────────────────────────────────────────────
  // Spans the grid like the card's row spans its content box, widened when a
  // narrow grid would crowd the label into the number.
  let rowLeft  = Math.max(PAD_X * s, gridX0 - ROW_OVERHANG * size)
  let rowRight = Math.min(width - PAD_X * s, gridX0 + gridW + ROW_OVERHANG * size)
  const needed = labelW + MIN_ROW_GAP * s + countW + maxW
  if (rowRight - rowLeft < needed) {
    rowLeft  = Math.max(PAD_X * s, (width - needed) / 2)
    rowRight = Math.min(width - PAD_X * s, rowLeft + needed)
  }

  const progress =
    textPath(fonts.label, LABEL, rowLeft, baseline, labelSize, palette.progressLabel, LABEL_TRACKING) +
    textPath(fonts.mono, countText, rowRight - maxW - countW, baseline, numSize, palette.progressNum) +
    textPath(fonts.mono, maxText, rowRight - maxW, baseline, numSize, palette.progressDim)

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect width="${width}" height="${height}" fill="${palette.background}"/>
  ${progress}
  ${hexes}
</svg>`
}

// Every pass rebuild rasterises the strip three times (@1x/@2x/@3x), and the
// result is a pure function of (count, max, size, palette). Across a café's
// customers those inputs repeat constantly — the same theme and the same
// handful of counts — so the render is memoised. This is the difference
// between "the card redraws while you watch" and "it just changed".
const STRIP_CACHE_MAX = 150
const stripCache = new Map<string, Buffer>()

function stripCacheKey({ count, max, width, height, palette }: StampGraphicOptions): string {
  return [
    count, max, width, height,
    palette.background, palette.stampFill, palette.stampHole,
    palette.stampEmpty, palette.emptyOpacity,
    palette.progressLabel, palette.progressNum, palette.progressDim,
  ].join('|')
}

export async function renderStampPng(options: StampGraphicOptions): Promise<Buffer> {
  const key = stripCacheKey(options)
  const hit = stripCache.get(key)
  if (hit) return hit

  const fonts = await loadFonts()
  const png = await sharp(Buffer.from(buildStampSvg(options, fonts))).png().toBuffer()

  // Plain FIFO eviction — the working set is tiny and uniform, so there is
  // nothing an LRU would buy here beyond bookkeeping.
  if (stripCache.size >= STRIP_CACHE_MAX) {
    const oldest = stripCache.keys().next().value
    if (oldest !== undefined) stripCache.delete(oldest)
  }
  stripCache.set(key, png)

  return png
}
