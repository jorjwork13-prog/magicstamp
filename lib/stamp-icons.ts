/**
 * Stamp glyph shapes — one per business kind, drawn identically wherever a
 * stamp grid appears: the server-rendered wallet-pass graphic
 * (lib/stamp-graphic.ts, used by both Apple's strip and Google's hero image)
 * and the in-app preview (components/WalletPassCard.tsx). Both call
 * `glyphMarkup()` and inject the same SVG string, so the two can never drift.
 *
 * Every shape lives in a 100x100 box, filled shapes carry a punched "hole" in
 * `stampHole`, exactly like the original hexagon — that hole is the visual
 * language a stamp is "earned," so every glyph keeps it for consistency.
 */

export type StampIcon = 'hex' | 'cup' | 'clippers'

export const STAMP_ICONS: StampIcon[] = ['hex', 'cup', 'clippers']

export function isStampIcon(v: unknown): v is StampIcon {
  return v === 'hex' || v === 'cup' || v === 'clippers'
}

/** Public path to the cup artwork, for browser-rendered previews
 *  (WalletPassCard, StampIconForm) — the server-rendered pass instead
 *  reads the same file off disk and inlines it as a data: URI, since it
 *  has no network access at render time. */
export const CUP_IMAGE_PATH = '/icons/cup.png'

export const STAMP_ICON_LABELS: Record<StampIcon, { label: string; labelKa: string }> = {
  hex:      { label: 'Hexagon', labelKa: 'ჰექსაგონი' },
  cup:      { label: 'Coffee cup', labelKa: 'ყავის ჭიქა' },
  clippers: { label: 'Clippers', labelKa: 'საპარსი' },
}

export type GlyphPalette = {
  stampFill: string
  stampHole: string
  stampEmpty: string
  /** Empty glyphs are a solid spec colour when themed, a wash when derived. */
  emptyOpacity: number
}

/** Inner SVG markup for one glyph — no outer <svg>/<g transform>, so callers
 *  can position it however they need (a `<g transform>` wrapper in both the
 *  string-built pass graphic and the React preview).
 *
 *  `cupImageHref` is the business-supplied coffee-cup artwork (a traced
 *  line-art mark, not a flat-colour shape we can theme) — callers pass
 *  whatever reference works in their context: a data: URI for the
 *  server-rendered pass (lib/stamp-graphic.ts, no network access at
 *  render time) or a plain /icons/cup.png path for the browser-rendered
 *  preview (components/WalletPassCard.tsx, StampIconForm.tsx). Falls back
 *  to the drawn vector mug if no href is supplied. */
export function glyphMarkup(icon: StampIcon, filled: boolean, p: GlyphPalette, cupImageHref?: string): string {
  if (icon === 'cup') return cupImageHref ? cupImageMarkup(filled, cupImageHref) : cupMarkup(filled, p)
  if (icon === 'clippers') return clippersMarkup(filled, p)
  return hexMarkup(filled, p)
}

/** The uploaded artwork itself, dimmed for an empty stamp rather than
 *  recoloured — it's a fixed brown/grey line drawing, not a themeable
 *  single-colour silhouette like the drawn glyphs. */
function cupImageMarkup(filled: boolean, href: string): string {
  const opacity = filled ? 1 : 0.22
  return (
    `<image href="${href}" x="4" y="2" width="92" height="96" ` +
    `opacity="${opacity}" preserveAspectRatio="xMidYMid meet"/>`
  )
}

function hexMarkup(filled: boolean, p: GlyphPalette): string {
  if (filled) {
    return (
      `<polygon points="50,12 83,31 83,69 50,88 17,69 17,31" fill="${p.stampFill}" ` +
      `stroke="${p.stampFill}" stroke-width="12" stroke-linejoin="round"/>` +
      `<circle cx="50" cy="50" r="11" fill="${p.stampHole}"/>`
    )
  }
  return (
    `<polygon points="50,14 81,32 81,68 50,86 19,68 19,32" fill="none" ` +
    `stroke="${p.stampEmpty}" stroke-opacity="${p.emptyOpacity}" stroke-width="9" stroke-linejoin="round"/>`
  )
}

/** Coffee mug — body, saucer and a looped handle. */
function cupMarkup(filled: boolean, p: GlyphPalette): string {
  if (filled) {
    return (
      `<rect x="20" y="78" width="60" height="8" rx="4" fill="${p.stampFill}"/>` +
      `<rect x="28" y="30" width="44" height="44" rx="9" fill="${p.stampFill}"/>` +
      `<path d="M70,42 a15,15 0 0 1 0,28" fill="none" stroke="${p.stampFill}" stroke-width="9" stroke-linecap="round"/>` +
      `<circle cx="50" cy="49" r="10" fill="${p.stampHole}"/>`
    )
  }
  const s = p.stampEmpty
  const o = p.emptyOpacity
  return (
    `<rect x="20" y="78" width="60" height="8" rx="4" fill="none" stroke="${s}" stroke-opacity="${o}" stroke-width="6"/>` +
    `<rect x="28" y="30" width="44" height="44" rx="9" fill="none" stroke="${s}" stroke-opacity="${o}" stroke-width="7"/>` +
    `<path d="M70,42 a15,15 0 0 1 0,28" fill="none" stroke="${s}" stroke-opacity="${o}" stroke-width="7" stroke-linecap="round"/>`
  )
}

/** Hair clipper — handle body, blade block, tooth notches and a toggle dot. */
function clippersMarkup(filled: boolean, p: GlyphPalette): string {
  if (filled) {
    const teeth = [0, 1, 2, 3]
      .map((i) => `<rect x="${30 + i * 11}" y="75" width="5" height="9" fill="${p.stampHole}"/>`)
      .join('')
    return (
      `<rect x="36" y="16" width="28" height="46" rx="7" fill="${p.stampFill}"/>` +
      `<circle cx="50" cy="29" r="4.5" fill="${p.stampHole}"/>` +
      `<rect x="24" y="58" width="52" height="26" rx="5" fill="${p.stampFill}"/>` +
      teeth
    )
  }
  const s = p.stampEmpty
  const o = p.emptyOpacity
  return (
    `<rect x="36" y="16" width="28" height="46" rx="7" fill="none" stroke="${s}" stroke-opacity="${o}" stroke-width="6"/>` +
    `<rect x="24" y="58" width="52" height="26" rx="5" fill="none" stroke="${s}" stroke-opacity="${o}" stroke-width="6"/>`
  )
}
