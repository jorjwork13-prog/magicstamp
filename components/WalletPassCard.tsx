import { CARD_THEME_SPECS, passIdFromMemberId, type CardTheme } from '@/lib/card-themes'
import { glyphMarkup, type StampIcon } from '@/lib/stamp-icons'
import StyledQr from '@/components/StyledQr'

/** One stamp glyph (hex / cup / clippers) — markup comes from stamp-icons.ts,
 *  the same source the server-rendered wallet-pass image uses, so this
 *  preview never drifts from what actually lands in Apple/Google Wallet. */
function StampGlyph({ icon, filled, fill, hole, empty, emptyOpacity, size = 48 }: {
  icon: StampIcon
  filled: boolean
  fill: string
  hole: string
  empty: string
  emptyOpacity: number
  size?: number
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <g
        dangerouslySetInnerHTML={{
          __html: glyphMarkup(icon, filled, { stampFill: fill, stampHole: hole, stampEmpty: empty, emptyOpacity }),
        }}
      />
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
  icon = 'hex',
  memberName,
  rewardsEarned = 0,
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
  /** which glyph the stamp grid uses — set per business in Settings */
  icon?: StampIcon
  /** shown top-right in the header; omitted on previews with no real member */
  memberName?: string | null
  /** lifetime count of completed cards — shown as a small stat, hidden at 0 */
  rewardsEarned?: number
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
      {/* header — business identity only; no Taply mark up here */}
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
        <div
          style={
            t.nameUnderline
              ? { borderBottom: `2px solid ${t.nameUnderline}`, paddingBottom: 16 }
              : undefined
          }
        >
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
            <div
              style={{
                fontSize: 24,
                fontWeight: t.businessNameWeight,
                color: t.headerText,
                letterSpacing: '-0.01em',
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {businessName}
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: t.headerMuted,
                letterSpacing: '0.04em',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {memberName || 'ლოიალობის ბარათი'}
            </span>
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
            <StampGlyph
              key={i}
              icon={icon}
              filled={i < stampCount}
              fill={t.stampFill}
              hole={t.stampHole}
              empty={t.stampEmpty}
              emptyOpacity={1}
            />
          ))}
        </div>

        {/* reward band — the keyword gets its own colour, the rest stays dim;
            a wallet's native text can't do that, but this in-app preview can */}
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
          <span style={{ fontSize: 15, fontWeight: 600, color: t.rewardText, lineHeight: 1.4 }}>
            {remaining > 0 ? (
              <>
                კიდევ <b style={{ color: t.rewardIcon, fontWeight: 800 }}>{remaining} ვიზიტი</b> და{' '}
                <b style={{ color: t.rewardIcon, fontWeight: 800 }}>საჩუქარი</b> შენია
              </>
            ) : (
              <>
                <b style={{ color: t.rewardIcon, fontWeight: 800 }}>საჩუქარი მზადაა</b>, ახლავე წაიღე
              </>
            )}
          </span>
        </div>

        {rewardsEarned > 0 && (
          <p style={{ fontSize: 11.5, color: t.progressLabel, textAlign: 'center', margin: '-6px 0 0' }}>
            🏆 მთლიანობაში მიღებული: {rewardsEarned} საჩუქარი
          </p>
        )}
      </div>

      {/* QR + pass id + Taply attribution (below the code, not above) */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
          <svg width="13" height="13" viewBox="0 0 100 100" aria-hidden="true">
            <polygon
              points="50,12 83,31 83,69 50,88 17,69 17,31"
              fill={t.logoFill}
              stroke={t.logoFill}
              strokeWidth="12"
              strokeLinejoin="round"
            />
            <circle cx="50" cy="50" r="11" fill={t.logoHole} />
          </svg>
          <span style={{ fontSize: 10.5, fontWeight: 600, color: t.headerMuted, letterSpacing: '0.02em' }}>
            Powered by Taply
          </span>
        </div>
      </div>
    </div>
  )
}
