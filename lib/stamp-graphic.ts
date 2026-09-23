import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { parse, type Font } from 'opentype.js'
import sharp from 'sharp'
import { CARD_THEME_SPECS, isCardTheme, type CardTheme } from '@/lib/card-themes'
import { glyphMarkup, type StampIcon } from '@/lib/stamp-icons'

/**
 * The stamp graphic on both wallet passes — Apple's strip.png and Google's
 * hero image (/api/stamp-image): the "პროგრესი  N / M" row above the stamp
 * grid, laid out like WalletPassCard.
 *
 * Everything the customer reads lives inside this image. In an Apple
 * storeCard, primaryFields render on top of the strip, so a native progress
 * field would collide with the grid; on Google, Georgian in textModulesData
 * is unreliable, but text drawn into the image is not.
 *
 * Glyph shapes live in lib/stamp-icons.ts and are shared with WalletPassCard,
 * so the pass shows the same icon the customer already saw on the join page
 * (hex by default, or cup/clippers per the business's stamp_icon setting).
 * Colours come from CARD_THEME_SPECS rather than the single flat WALLET_HEX,
 * which is what made the pass look unrelated to the product.
 *
 * Renders straight to a Buffer: Apple embeds the bytes, and the Google route
 * returns them as the hero image.
 */

/** Visible glyph height as a fraction of its box — same for every icon kind. */
const GLYPH_H = 0.88
/** WalletPassCard's grid: 48px hexes with a 10px gap on both axes. */
const GAP = 10 / 48

// Layout in points on Apple's 375pt-wide strip; everything scales with width,
// so the @2x/@3x renders are the same picture with more pixels. The card's own
// sizes (12px label, 22px number, 16px row gap) are tightened slightly to fit
// the strip's 123pt height.
//
// PAD_X is intentionally generous (~14% of the width per side, not the ~6% a
// 375pt-authored image would suggest is safe): on a real device the label and
// the ones digit of the count were getting clipped at both edges — Wallet
// doesn't letterbox the strip into the card, it fills the card's actual
// (wider, per-device) width, and content that assumed a snug edge lost its
// margin in that scale-up. Treat this canvas as having a wide unsafe bleed.
// The progress row (label + count) is deliberately modest — the grid is the
// thing a customer should actually look at, not the number restating what
// the grid already shows. Shrinking this row's footprint hands its space to
// the grid loop below, which always sizes glyphs to fill whatever is left.
const REF_W          = 375
const PAD_X          = 52
const PAD_TOP        = 10
const PAD_BOTTOM     = 12
const LABEL_SIZE     = 9
const LABEL_TRACKING = 0.08 // em, as on the card
const NUM_SIZE       = 15
const ROW_TO_GRID    = 8
/** Minimum space between label and number when the grid is narrow. */
const MIN_ROW_GAP    = 16
/** The card's content edge sits this far (in hex boxes) outside the grid. */
const ROW_OVERHANG   = 8 / 48

const LABEL = 'პროგრესი'

// ── Reward line ──────────────────────────────────────────────────────────────
// Drawn into the image rather than a wallet textModule/secondaryField: those
// render one flat colour for the whole value, and the keyword ("3 ვიზიტი",
// "საჩუქარი") needs its own colour to actually read as an incentive rather
// than a status line. Target size shrinks to fit the strip width — a two-
// digit remaining count on a narrow strip is the one case that would overflow.
const REWARD_SIZE    = 14
const REWARD_MIN_SIZE = 10
const REWARD_GAP     = 8   // gap between the grid and the reward line
const REWARD_PAD_TOP = 3   // breathing room above the glyphs inside its band

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
  /** Reward line: the keyword gets rewardAccent, everything else rewardDim. */
  rewardAccent: string
  rewardDim: string
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
      rewardAccent:  t.rewardIcon,
      rewardDim:     t.rewardText,
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
    rewardAccent:  contrast,
    rewardDim:     mix(contrast, fallbackHex, 0.45),
  }
}

export type StampGraphicOptions = {
  count: number
  max: number
  width: number
  height: number
  palette: StampPalette
  icon?: StampIcon
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

// The business-supplied cup artwork, read once and kept as a data: URI so
// the SVG string is self-contained — sharp/librsvg has no network access
// at render time, so a plain /icons/cup.png reference (fine in the browser
// preview) would not resolve here.
let cupImageCache: Promise<string> | null = null

function loadCupImage(): Promise<string> {
  if (!cupImageCache) {
    cupImageCache = (async () => {
      const buf = await readFile(path.join(process.cwd(), 'public', 'icons', 'cup.png'))
      return `data:image/png;base64,${buf.toString('base64')}`
    })()
    cupImageCache.catch(() => { cupImageCache = null })
  }
  return cupImageCache
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
 * One glyph (hex / cup / clippers), scaled from its native 100x100 box to
 * `size` at (x, y). Each glyph only fills ~72-88% of its box, so boxes can
 * sit flush and still leave a visible gap between them.
 */
function glyphSvg(icon: StampIcon, x: number, y: number, size: number, filled: boolean, p: StampPalette, cupImageHref?: string): string {
  const s = size / 100
  return (
    `<g transform="translate(${r2(x)} ${r2(y)}) scale(${r4(s)})">` +
    glyphMarkup(icon, filled, p, cupImageHref) +
    `</g>`
  )
}

function r2(v: number) { return Math.round(v * 100) / 100 }
function r4(v: number) { return Math.round(v * 10000) / 10000 }

// Digits render as tofu in the Georgian font (same reason the progress row
// uses fonts.mono for its numbers) — every run needing a digit is marked
// 'mono'; pure Georgian words use 'label'.
type TextRun = { text: string; color: string; font: 'label' | 'mono' }

function rewardRuns(remaining: number, p: StampPalette): TextRun[] {
  if (remaining > 0) {
    return [
      { text: 'კიდევ ',   color: p.rewardDim,    font: 'label' },
      { text: `${remaining}`, color: p.rewardAccent, font: 'mono' },
      { text: ' ვიზიტი',  color: p.rewardAccent, font: 'label' },
      { text: ' და ',     color: p.rewardDim,    font: 'label' },
      { text: 'საჩუქარი', color: p.rewardAccent, font: 'label' },
      { text: ' შენია',   color: p.rewardDim,    font: 'label' },
    ]
  }
  return [
    { text: 'საჩუქარი მზადაა', color: p.rewardAccent, font: 'label' },
    { text: ' ახლავე წაიღე',  color: p.rewardDim,    font: 'label' },
  ]
}

function measureRuns(fonts: Fonts, runs: TextRun[], size: number): number {
  return runs.reduce((w, r) => w + textWidth(fonts[r.font], r.text, size), 0)
}

function drawRuns(fonts: Fonts, runs: TextRun[], x: number, baseline: number, size: number): string {
  let cx = x
  let out = ''
  for (const r of runs) {
    out += textPath(fonts[r.font], r.text, cx, baseline, size, r.color)
    cx += textWidth(fonts[r.font], r.text, size)
  }
  return out
}

export function buildStampSvg({ count, max, width, height, palette, icon = 'hex' }: StampGraphicOptions, fonts: Fonts, cupImageHref?: string): string {
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

  // ── Reward line ────────────────────────────────────────────────────────────
  // Sized before the grid, since the grid gets whatever height is left over.
  const remaining = total - filled
  const runs       = rewardRuns(remaining, palette)
  const availRewardW = width - 2 * PAD_X * s
  let rewardSize   = Math.max(REWARD_MIN_SIZE * s, REWARD_SIZE * s)
  let rewardW      = measureRuns(fonts, runs, rewardSize)
  if (rewardW > availRewardW) {
    rewardSize = Math.max(REWARD_MIN_SIZE * s, rewardSize * (availRewardW / rewardW))
    rewardW    = measureRuns(fonts, runs, rewardSize)
  }
  const rewardBandH = rewardSize * capHeight(fonts.label) + REWARD_PAD_TOP * s

  // ── Hex grid ──────────────────────────────────────────────────────────────
  // Pick the row count that lets the hexes be biggest in the space under the
  // row rather than fixing a threshold. Ties keep the flatter layout.
  const gridTop = baseline + ROW_TO_GRID * s
  const availW  = width - 2 * PAD_X * s
  const availH  = height - PAD_BOTTOM * s - REWARD_GAP * s - rewardBandH - gridTop

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
      hexes += glyphSvg(icon, gridX0 + col * pitch, y, size, idx < filled, palette, cupImageHref)
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

  // Centred in its reserved band at the very bottom.
  const rewardX0      = (width - rewardW) / 2
  const rewardBaseline = height - PAD_BOTTOM * s - (rewardBandH - rewardSize * capHeight(fonts.label)) / 2
  const reward = drawRuns(fonts, runs, rewardX0, rewardBaseline, rewardSize)

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect width="${width}" height="${height}" fill="${palette.background}"/>
  ${progress}
  ${reward}
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

function stripCacheKey({ count, max, width, height, palette, icon = 'hex' }: StampGraphicOptions): string {
  return [
    count, max, width, height, icon,
    palette.background, palette.stampFill, palette.stampHole,
    palette.stampEmpty, palette.emptyOpacity,
    palette.progressLabel, palette.progressNum, palette.progressDim,
    palette.rewardAccent, palette.rewardDim,
  ].join('|')
}

export async function renderStampPng(options: StampGraphicOptions): Promise<Buffer> {
  const key = stripCacheKey(options)
  const hit = stripCache.get(key)
  if (hit) return hit

  const [fonts, cupImageHref] = await Promise.all([
    loadFonts(),
    options.icon === 'cup' ? loadCupImage() : Promise.resolve(undefined),
  ])
  const png = await sharp(Buffer.from(buildStampSvg(options, fonts, cupImageHref))).png().toBuffer()

  // Plain FIFO eviction — the working set is tiny and uniform, so there is
  // nothing an LRU would buy here beyond bookkeeping.
  if (stripCache.size >= STRIP_CACHE_MAX) {
    const oldest = stripCache.keys().next().value
    if (oldest !== undefined) stripCache.delete(oldest)
  }
  stripCache.set(key, png)

  return png
}
