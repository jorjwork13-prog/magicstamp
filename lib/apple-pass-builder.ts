import { readFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { PKPass } from 'passkit-generator'
import { loadPassCertificates } from '@/lib/apple-pass-certs'
import { CARD_THEME_SPECS, isCardTheme, type CardTheme } from '@/lib/card-themes'
import { paletteFor, renderStampPng } from '@/lib/stamp-graphic'
import { isWalletPushEnabled } from '@/lib/wallet-push-flag'
import { passAuthToken } from '@/lib/wallet-webservice-auth'

// Pulled out of app/api/wallet/apple/route.ts so the PassKit Web Service
// "get latest pass" endpoint (app/api/wallet/apple-webservice/v1/passes/...)
// can build the exact same .pkpass without duplicating this logic. The
// route still owns request parsing and the HTTP response; this module only
// knows how to turn already-validated member/business data into a pass.

export const PASS_TYPE_IDENTIFIER = 'pass.ge.taply.loyalty'
export const TEAM_IDENTIFIER      = 'SRYGT4Q4LY'
export const ORGANIZATION_NAME    = 'Taply'

// Where a pass tells iOS to register and fetch updates. Defaults to
// production; set WALLET_WEBSERVICE_URL on a preview deployment so a test pass
// registers against that deployment's routes instead of production's.
export const WALLET_WEBSERVICE_URL =
  process.env.WALLET_WEBSERVICE_URL || 'https://magicstamp.vercel.app/api/wallet/apple-webservice/v1'

/** Same fallback the Google Wallet route uses, so both passes agree on color. */
function validHex(color: string | null | undefined): string {
  if (color && /^#[0-9A-Fa-f]{6}$/.test(color)) return color
  return '#185FA5'
}

function hexToRgbTriplet(hex: string): { r: number; g: number; b: number } {
  const c = hex.slice(1)
  return {
    r: parseInt(c.slice(0, 2), 16),
    g: parseInt(c.slice(2, 4), 16),
    b: parseInt(c.slice(4, 6), 16),
  }
}

/** pass.json takes CSS-style "rgb(r, g, b)", not hex. */
function toPassColor(hex: string): string {
  const { r, g, b } = hexToRgbTriplet(hex)
  return `rgb(${r}, ${g}, ${b})`
}

function linearize(c: number): number {
  const s = c / 255
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

/**
 * Pass chrome taken from the card theme the customer already saw on the join
 * page, rather than from the single flat WALLET_HEX. Without a theme we fall
 * back to the brand colour and pick readable text by luminance — the `cream`
 * theme is light enough that a hardcoded white foreground would be unreadable.
 */
function passColors(theme: unknown, fallbackHex: string): {
  backgroundColor: string
  foregroundColor: string
  labelColor: string
  stripColor: string
} {
  if (isCardTheme(theme)) {
    const t = CARD_THEME_SPECS[theme as CardTheme]
    return {
      backgroundColor: toPassColor(t.cardBg),
      foregroundColor: toPassColor(t.headerText),
      labelColor:      toPassColor(t.headerMuted),
      stripColor:      toPassColor(t.cardBg),
    }
  }

  const { r, g, b } = hexToRgbTriplet(fallbackHex)
  const lum = 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)
  return lum > 0.4
    ? {
        backgroundColor: toPassColor(fallbackHex),
        foregroundColor: 'rgb(26, 26, 26)',
        labelColor:      'rgb(110, 95, 73)',
        stripColor:      toPassColor(fallbackHex),
      }
    : {
        backgroundColor: toPassColor(fallbackHex),
        foregroundColor: 'rgb(255, 255, 255)',
        labelColor:      'rgb(220, 220, 220)',
        stripColor:      toPassColor(fallbackHex),
      }
}

// Apple's storeCard strip in points (375x144 is the coupon/gift-card size),
// rendered at @1x, @2x and @3x. The "პროგრესი N / M" row and the honeycomb are
// both drawn into the image; see lib/stamp-graphic.ts.
const STRIP_W = 375
const STRIP_H = 123

// ── Pass images ─────────────────────────────────────────────────────────────
// Apple refuses to open a pass that has no icon.png, so the bundled Taply mark
// is always used as the icon; logoUrl only ever replaces the logo slot.

let iconCache: Promise<{ icon: Buffer; icon2x: Buffer }> | null = null

function loadIcons() {
  if (!iconCache) {
    iconCache = (async () => {
      const src = await readFile(path.join(process.cwd(), 'public', 'logo.png'))
      const [icon, icon2x] = await Promise.all([
        sharp(src).resize(29, 29, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(),
        sharp(src).resize(58, 58, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(),
      ])
      return { icon, icon2x }
    })()
    iconCache.catch(() => { iconCache = null })
  }
  return iconCache
}

/**
 * Fetch the business logo for the pass's logo slot. Any failure here is
 * non-fatal — a pass without a logo still scans, so we fall back to the
 * Taply mark rather than failing the download.
 */
async function fetchLogo(logoUrl: string | null | undefined): Promise<Buffer | null> {
  if (!logoUrl?.trim()) return null

  let parsed: URL
  try {
    parsed = new URL(logoUrl)
  } catch {
    return null
  }
  if (parsed.protocol !== 'https:') return null

  try {
    const res = await fetch(parsed, { signal: AbortSignal.timeout(5_000) })
    if (!res.ok) return null

    const bytes = Buffer.from(await res.arrayBuffer())
    if (bytes.byteLength > 2_000_000) return null

    // Apple's logo slot is 160x50pt; emit @2x and let it scale down.
    return await sharp(bytes)
      .resize(320, 100, { fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer()
  } catch {
    return null
  }
}

export type BuildLoyaltyPassInput = {
  memberId: string
  memberName?: string | null
  stampCount: number
  maxStamps: number
  businessName?: string | null
  businessId: string
  brandColor?: string | null
  logoUrl?: string | null
  cardTheme?: unknown
}

/**
 * Builds the loyalty pass for one member. Returns the PKPass instance (not
 * the buffer) so callers that only need to check a modification time before
 * deciding whether to actually re-serialize it (the webservice "get pass"
 * route, which supports If-Modified-Since) can do so cheaply — building the
 * strip/logo images is the expensive part, calling getAsBuffer() is not.
 */
export async function buildLoyaltyPass(input: BuildLoyaltyPassInput): Promise<PKPass> {
  const { memberId, businessId, stampCount, maxStamps, memberName, logoUrl, cardTheme } = input
  const business = input.businessName?.trim() || ORGANIZATION_NAME
  const hexColor = validHex(input.brandColor)
  const colors   = passColors(cardTheme, hexColor)
  const palette  = paletteFor(cardTheme, hexColor)
  const serialNumber = `${businessId}.${memberId}`

  const [certificates, icons, logo, strip, strip2x, strip3x] = await Promise.all([
    loadPassCertificates(),
    loadIcons(),
    fetchLogo(logoUrl),
    renderStampPng({ count: stampCount, max: maxStamps, width: STRIP_W,     height: STRIP_H,     palette }),
    renderStampPng({ count: stampCount, max: maxStamps, width: STRIP_W * 2, height: STRIP_H * 2, palette }),
    renderStampPng({ count: stampCount, max: maxStamps, width: STRIP_W * 3, height: STRIP_H * 3, palette }),
  ])

  const pass = new PKPass({}, certificates, {
    description:          `${business} — სტემპ-ბარათი`,
    organizationName:     ORGANIZATION_NAME,
    passTypeIdentifier:   PASS_TYPE_IDENTIFIER,
    teamIdentifier:       TEAM_IDENTIFIER,
    // Unique per member per business, mirroring the Google object id.
    serialNumber,
    logoText:             business,
    ...colors,
    // Gated behind WALLET_APNS_PUSH_ENABLED: until Phase 2 is reviewed and
    // turned on, passes ship with no webServiceURL, so iOS never attempts
    // to register a device for push updates against routes that (for now)
    // still treat that as a no-op anyway — this is belt-and-suspenders.
    ...(isWalletPushEnabled()
      ? { webServiceURL: WALLET_WEBSERVICE_URL, authenticationToken: passAuthToken(serialNumber) }
      : {}),
  })

  pass.type = 'storeCard'

  // No primary field on purpose: in a storeCard it renders on top of the
  // strip and collides with the hexagons. The progress row is drawn into
  // the strip image instead.

  const remaining = Math.max(0, maxStamps - stampCount)
  const rewardText = remaining > 0
    ? `კიდევ ${remaining} ვიზიტი — და ერთი საჩუქრად`
    : 'ბარათი სავსეა — მიიღე საჩუქარი'

  pass.secondaryFields.push(
    { key: 'member', label: 'მფლობელი', value: memberName || '—' },
    { key: 'reward', label: 'ჯილდო',    value: rewardText },
  )

  pass.backFields.push(
    { key: 'business', label: 'ბიზნესი', value: business },
    { key: 'memberId', label: 'წევრის კოდი', value: memberId },
  )

  // Same value the Google pass encodes, so one member scans identically
  // whichever wallet the code is shown from.
  pass.setBarcodes({
    format:          'PKBarcodeFormatQR',
    message:         memberId,
    messageEncoding: 'iso-8859-1',
    // No altText: it would print the raw member UUID under the QR, which
    // means nothing to the customer. The QR still encodes memberId.
  })

  pass.addBuffer('icon.png', icons.icon)
  pass.addBuffer('icon@2x.png', icons.icon2x)
  pass.addBuffer('strip.png', strip)
  pass.addBuffer('strip@2x.png', strip2x)
  pass.addBuffer('strip@3x.png', strip3x)
  if (logo) {
    pass.addBuffer('logo.png', logo)
    pass.addBuffer('logo@2x.png', logo)
  } else {
    pass.addBuffer('logo.png', icons.icon2x)
    pass.addBuffer('logo@2x.png', icons.icon2x)
  }

  return pass
}
