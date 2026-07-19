import { CARD_THEME_SPECS, passIdFromMemberId, type CardTheme } from '@/lib/card-themes'
import StyledQr from '@/components/StyledQr'

/** Hexagon stamp — filled hexes are punched with a hole (honeycomb card
 *  concept), empty hexes are outlines. Geometry from design-refs/cards.html. */
function StampHex({ filled, fill, hole, empty, size = 48 }: {
  filled: boolean
  fill: string
  hole: string
  empty: string
  size?: number
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      {filled ? (
        <>
          <polygon
            points="50,12 83,31 83,69 50,88 17,69 17,31"
            fill={fill}
            stroke={fill}
            strokeWidth="12"
            strokeLinejoin="round"
          />
          <circle cx="50" cy="50" r="11" fill={hole} />
        </>
      ) : (
        <polygon
          points="50,14 81,32 81,68 50,86 19,68 19,32"
          fill="none"
          stroke={empty}
          strokeWidth="9"
          strokeLinejoin="round"
        />
      )}
    </svg>
  )
}

/**
 * The Taply wallet pass, matching design-refs/cards.html (340x580, three
 * themes) with the styled QR from design-refs/taply-qr.html.
 * `qrValue` is what the QR encodes (member id for personal passes).
 */
export default function WalletPassCard({
  businessName,
  theme,
  stampCount,
  maxStamps,
  passId,
  qrValue,
  passIdText,
  subtitle = 'სტემპ-ბარათი',
}: {
  businessName: string
  theme: CardTheme
  stampCount: number
  maxStamps: number
  /** member UUID — drives both the QR and the printed TPL id */
  passId: string
  /** override what the QR encodes; defaults to passId */
  qrValue?: string
  /** override the printed TPL id (demo/preview passes without a real member) */
  passIdText?: string
  subtitle?: string
}) {
  const t = CARD_THEME_SPECS[theme]
  const remaining = Math.max(0, maxStamps - stampCount)
  const mono = "'JetBrains Mono', ui-monospace, monospace"

  return (
    <div
      style={{
        width: 340,
        background: t.cardBg,
        borderRadius: 18,
        overflow: 'hidden',
        boxShadow: t.cardShadow,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Outfit', 'Noto Sans Georgian', sans-serif",
      }}
    >
      {/* header */}
      <div
        style={{
          background: t.headerBg || undefined,
          borderBottom: t.headerBorder ? `1px solid ${t.headerBorder}` : undefined,
          padding: t.headerBg ? '18px 22px 16px 22px' : '20px 22px 0 22px',
          display: 'flex',
          flexDirection: 'column',
          gap: t.headerBg ? 12 : 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <svg width="17" height="17" viewBox="0 0 100 100" aria-hidden="true">
              <polygon
                points="50,12 83,31 83,69 50,88 17,69 17,31"
                fill={t.logoFill}
                stroke={t.logoFill}
                strokeWidth="12"
                strokeLinejoin="round"
              />
              <circle cx="50" cy="50" r="11" fill={t.logoHole} />
            </svg>
            <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.02em', color: t.headerText }}>
              Taply
            </span>
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: t.headerMuted, letterSpacing: '0.06em' }}>
            ლოიალობის ბარათი
          </span>
        </div>
        <div
          style={
            t.nameUnderline
              ? { borderBottom: `2px solid ${t.nameUnderline}`, paddingBottom: 16 }
              : undefined
          }
        >
          <div
            style={{
              fontSize: 24,
              fontWeight: t.businessNameWeight,
              color: t.headerText,
              letterSpacing: '-0.01em',
            }}
          >
            {businessName}
          </div>
          <div style={{ fontSize: 12, fontWeight: 500, color: t.headerMuted, marginTop: 2 }}>
            {subtitle}
          </div>
        </div>
      </div>

      {/* progress + stamps */}
      <div
        style={{
          padding: t.headerBg ? '22px 22px 0 22px' : '18px 22px 0 22px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          flex: 1,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: t.progressLabel, letterSpacing: '0.08em' }}>
            პროგრესი
          </span>
          <span style={{ fontFamily: mono, fontSize: 22, fontWeight: 500, color: t.progressNum }}>
            {stampCount}
            <span style={{ color: t.progressDim }}> / {maxStamps}</span>
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 10,
            justifyItems: 'center',
          }}
        >
          {Array.from({ length: maxStamps }, (_, i) => (
            <StampHex
              key={i}
              filled={i < stampCount}
              fill={t.stampFill}
              hole={t.stampHole}
              empty={t.stampEmpty}
            />
          ))}
        </div>

        {/* reward band */}
        <div
          style={{
            background: t.rewardBg,
            border: `1px solid ${t.rewardBorder}`,
            borderRadius: 12,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <svg width="26" height="26" viewBox="0 0 100 100" aria-hidden="true">
            <polygon
              points="50,12 83,31 83,69 50,88 17,69 17,31"
              fill="none"
              stroke={t.rewardIcon}
              strokeWidth="9"
              strokeLinejoin="round"
            />
            <circle cx="50" cy="50" r="13" fill={t.rewardIcon} />
          </svg>
          <span style={{ fontSize: 14, fontWeight: 600, color: t.rewardText, lineHeight: 1.4 }}>
            {remaining > 0
              ? `კიდევ ${remaining} ვიზიტი — და ერთი საჩუქრად`
              : 'ბარათი სავსეა — მიიღე საჩუქარი'}
          </span>
        </div>
      </div>

      {/* QR + pass id */}
      <div
        style={{
          padding: '16px 22px 20px 22px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          borderTop: `1px dashed ${t.divider}`,
          marginTop: 16,
        }}
      >
        <div
          style={{
            background: t.qrPlateBg,
            border: t.qrPlateBorder ? `1px solid ${t.qrPlateBorder}` : undefined,
            borderRadius: 10,
            padding: 9,
            lineHeight: 0,
          }}
        >
          <StyledQr value={qrValue ?? passId} size={110} fg={t.qrFg} bg={t.qrBg} />
        </div>
        <span style={{ fontFamily: mono, fontSize: 10, color: t.passIdColor, letterSpacing: '0.1em' }}>
          {passIdText ?? passIdFromMemberId(passId)}
        </span>
      </div>
    </div>
  )
}
