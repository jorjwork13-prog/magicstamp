/**
 * The three wallet-pass themes. Every hex value is copied verbatim from
 * design-refs/cards.html (card structure/colors) and design-refs/taply-qr.html
 * (per-theme QR foreground/background — verified to decode).
 */

export type CardTheme = 'honey' | 'ink' | 'cream'

export const CARD_THEMES: CardTheme[] = ['honey', 'ink', 'cream']

export function isCardTheme(v: unknown): v is CardTheme {
  return v === 'honey' || v === 'ink' || v === 'cream'
}

/** card_theme -> Google Wallet loyalty class hexBackgroundColor */
export const WALLET_HEX: Record<CardTheme, string> = {
  honey: '#F2A33C',
  ink:   '#2B2118',
  cream: '#F7F1E5',
}

export type CardThemeSpec = {
  /** display name shown under theme pickers */
  label: string
  cardBg: string
  cardShadow: string
  /** header block */
  headerBg: string          // '' = no distinct header background (cream)
  headerBorder: string      // '' = none
  logoFill: string
  logoHole: string
  headerText: string        // Taply wordmark + business name
  headerMuted: string       // top-right label + subtitle
  businessNameWeight: number
  /** cream only: underline below the name block instead of a filled header */
  nameUnderline: string     // '' = none
  /** progress row */
  progressLabel: string
  progressNum: string
  progressDim: string
  /** stamps */
  stampFill: string
  stampHole: string
  stampEmpty: string
  /** reward band */
  rewardBg: string
  rewardBorder: string
  rewardIcon: string
  rewardText: string
  /** dashed divider above the QR section */
  divider: string
  /** QR plate */
  qrPlateBg: string
  qrPlateBorder: string     // '' = none
  qrFg: string
  qrBg: string
  /** monospace pass id under the QR */
  passIdColor: string
}

export const CARD_THEME_SPECS: Record<CardTheme, CardThemeSpec> = {
  honey: {
    label: 'Honey',
    cardBg: '#FFFDF8',
    cardShadow: '0 24px 50px rgba(43,33,24,0.20)',
    headerBg: '#F2A33C',
    headerBorder: '',
    logoFill: '#2B2118',
    logoHole: '#F2A33C',
    headerText: '#2B2118',
    headerMuted: '#8A5E1A',
    businessNameWeight: 800,
    nameUnderline: '',
    progressLabel: '#9A8B72',
    progressNum: '#2B2118',
    progressDim: '#C4B296',
    stampFill: '#F2A33C',
    stampHole: '#FFFDF8',
    stampEmpty: '#E3D9C6',
    rewardBg: '#FBF3E2',
    rewardBorder: '#F0DFBC',
    rewardIcon: '#C97F1E',
    rewardText: '#8A5E1A',
    divider: '#E3D9C6',
    qrPlateBg: '#FFFDF8',
    qrPlateBorder: '#EFE6D4',
    qrFg: '#2B2118',
    qrBg: '#FFFDF8',
    passIdColor: '#9A8B72',
  },
  ink: {
    label: 'Ink',
    cardBg: '#241C12',
    cardShadow: '0 24px 50px rgba(43,33,24,0.35)',
    headerBg: '#2B2118',
    headerBorder: '#3A2E1E',
    logoFill: '#F2A33C',
    logoHole: '#2B2118',
    headerText: '#F7F1E5',
    headerMuted: '#A8987D',
    businessNameWeight: 800,
    nameUnderline: '',
    progressLabel: '#7A6C55',
    progressNum: '#F2A33C',
    progressDim: '#5C4C36',
    stampFill: '#F2A33C',
    stampHole: '#241C12',
    stampEmpty: '#4A3D2C',
    rewardBg: 'rgba(242,163,60,0.10)',
    rewardBorder: 'rgba(242,163,60,0.28)',
    rewardIcon: '#F2A33C',
    rewardText: '#F2A33C',
    divider: '#3A2E1E',
    qrPlateBg: '#FFFDF8',
    qrPlateBorder: '',
    qrFg: '#2B2118',
    qrBg: '#FFFDF8',
    passIdColor: '#7A6C55',
  },
  cream: {
    label: 'Cream',
    cardBg: '#F7F1E5',
    cardShadow: '0 24px 50px rgba(43,33,24,0.14)',
    headerBg: '',
    headerBorder: '',
    logoFill: '#F2A33C',
    logoHole: '#F7F1E5',
    headerText: '#2B2118',
    headerMuted: '#9A8B72',
    businessNameWeight: 700,
    nameUnderline: '#EBE0CC',
    progressLabel: '#9A8B72',
    progressNum: '#C97F1E',
    progressDim: '#C4B296',
    stampFill: '#C97F1E',
    stampHole: '#F7F1E5',
    stampEmpty: '#DCCFB8',
    rewardBg: '#FFFDF8',
    rewardBorder: '#EBE0CC',
    rewardIcon: '#C97F1E',
    rewardText: '#6E5F49',
    divider: '#E3D9C6',
    qrPlateBg: '#F7F1E5',
    qrPlateBorder: '#EFE6D4',
    qrFg: '#C97F1E',
    qrBg: '#F7F1E5',
    passIdColor: '#9A8B72',
  },
}

/** Short stable pass id ("TPL-XXXX-XXXX") derived from the member UUID.
 *  Purely cosmetic — consistent per member, not cryptographic. */
export function passIdFromMemberId(memberId: string): string {
  const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ0123456789'
  let h1 = 5381
  let h2 = 52711
  for (let i = 0; i < memberId.length; i++) {
    const c = memberId.charCodeAt(i)
    h1 = (h1 * 33) ^ c
    h2 = (h2 * 31) ^ c
  }
  h1 = h1 >>> 0
  h2 = h2 >>> 0
  let out = ''
  for (let i = 0; i < 8; i++) {
    const v = i < 4 ? h1 : h2
    out += ALPHABET[Math.floor(v / Math.pow(ALPHABET.length, i % 4)) % ALPHABET.length]
  }
  return `TPL-${out.slice(0, 4)}-${out.slice(4)}`
}
