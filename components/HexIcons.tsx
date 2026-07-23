/** Shared hexagon icon set for the whole dashboard (drawer nav + analytics +
 *  anywhere else that needs a brand glyph). Every icon sits inside the same
 *  hexagon frame as the logo — identical size, stroke weight and corner style
 *  — so the app reads as one designed system rather than mismatched symbols.
 *
 *  Icons draw with `currentColor`, so they inherit the surrounding text color:
 *  ink in light mode, cream in dark, honey when the caller sets text-honey or
 *  the drawer link is active (text-dlink). Solid detail fills use --dbg2 so the
 *  surface behind punches through cleanly. Pure SVG, no hooks — safe to render
 *  from server or client components. */

type IconProps = { size?: number }

function HexIcon({ size = 22, children }: { size?: number; children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 3 L20 7.5 L20 16.5 L12 21 L4 16.5 L4 7.5 Z" />
      {children}
    </svg>
  )
}

/* ── Drawer navigation ─────────────────────────────────────────────── */

/* Dashboard / home — grid of four tiles */
export const DashboardIcon = ({ size }: IconProps) => (
  <HexIcon size={size}>
    <rect x="8" y="8.5" width="3.2" height="3.2" rx="0.8" />
    <rect x="12.8" y="8.5" width="3.2" height="3.2" rx="0.8" />
    <rect x="8" y="13.3" width="3.2" height="3.2" rx="0.8" />
    <rect x="12.8" y="13.3" width="3.2" height="3.2" rx="0.8" />
  </HexIcon>
)

/* Profile / QR — QR finder-dot pattern */
export const ProfileIcon = ({ size }: IconProps) => (
  <HexIcon size={size}>
    <g fill="currentColor" stroke="none">
      <rect x="8" y="8" width="2" height="2" rx="0.4" />
      <rect x="14" y="8" width="2" height="2" rx="0.4" />
      <rect x="11" y="11" width="2" height="2" rx="0.4" />
      <rect x="8" y="14" width="2" height="2" rx="0.4" />
      <rect x="14" y="14" width="2" height="2" rx="0.4" />
    </g>
  </HexIcon>
)

/* Settings — adjustment-dial sliders */
export const SettingsIcon = ({ size }: IconProps) => (
  <HexIcon size={size}>
    <line x1="8" y1="10.5" x2="16" y2="10.5" />
    <circle cx="13.5" cy="10.5" r="1.5" fill="var(--dbg2)" />
    <line x1="8" y1="14" x2="16" y2="14" />
    <circle cx="10.5" cy="14" r="1.5" fill="var(--dbg2)" />
  </HexIcon>
)

/* Analytics — rising bar chart */
export const AnalyticsIcon = ({ size }: IconProps) => (
  <HexIcon size={size}>
    <line x1="8" y1="15.5" x2="16" y2="15.5" />
    <line x1="9.5" y1="15.5" x2="9.5" y2="13.5" />
    <line x1="12" y1="15.5" x2="12" y2="11.5" />
    <line x1="14.5" y1="15.5" x2="14.5" y2="9.5" />
  </HexIcon>
)

/* Logout — exit arrow */
export const LogoutIcon = ({ size }: IconProps) => (
  <HexIcon size={size}>
    <path d="M11.5 7.8 H8.5 V16.2 H11.5" />
    <line x1="10.3" y1="12" x2="16.3" y2="12" />
    <path d="M14 9.8 L16.4 12 L14 14.2" />
  </HexIcon>
)

/* ── Analytics KPIs ────────────────────────────────────────────────── */

/* Total members — a small group of people */
export const PeopleIcon = ({ size }: IconProps) => (
  <HexIcon size={size}>
    <circle cx="10" cy="10.3" r="1.9" />
    <path d="M6.7 15.8 a3.3 3.3 0 0 1 6.6 0" />
    <circle cx="15.3" cy="10.9" r="1.5" />
    <path d="M14 15.8 a2.7 2.7 0 0 1 3.3 -0.6" />
  </HexIcon>
)

/* Return rate — a circular / cycle arrow */
export const CycleIcon = ({ size }: IconProps) => (
  <HexIcon size={size}>
    <path d="M8.6 13.8 A4 4 0 1 1 12 16" />
    <path d="M8.6 13.8 L7 12.2 L9.4 11.4 Z" fill="currentColor" stroke="none" />
  </HexIcon>
)

/* Rewards issued — a gift box with a bow */
export const GiftIcon = ({ size }: IconProps) => (
  <HexIcon size={size}>
    <rect x="7.8" y="11.2" width="8.4" height="5.1" rx="0.7" />
    <rect x="7" y="9" width="10" height="2.4" rx="0.7" />
    <line x1="12" y1="9.2" x2="12" y2="16.3" />
    <path d="M12 9 L9.4 7.3 L9.8 9 Z" fill="currentColor" stroke="none" />
    <path d="M12 9 L14.6 7.3 L14.2 9 Z" fill="currentColor" stroke="none" />
  </HexIcon>
)

/* Active this week — a heartbeat / activity pulse */
export const PulseIcon = ({ size }: IconProps) => (
  <HexIcon size={size}>
    <path d="M6.8 12 H10 L11.4 8.6 L13.4 15.4 L14.8 12 H17.2" />
  </HexIcon>
)

/* ── Analytics segments ────────────────────────────────────────────── */

/* Regulars / loyal — a star */
export const StarIcon = ({ size }: IconProps) => (
  <HexIcon size={size}>
    <path d="M12 6.5 L13.7 9.94 L17.5 10.5 L14.75 13.18 L15.4 16.96 L12 15.17 L8.6 16.96 L9.25 13.18 L6.5 10.5 L10.3 9.94 Z" />
  </HexIcon>
)

/* New — a sparkle with a small accent */
export const SparkleIcon = ({ size }: IconProps) => (
  <HexIcon size={size}>
    <path d="M12 7 C12.4 10.4 13.6 11.6 17 12 C13.6 12.4 12.4 13.6 12 17 C11.6 13.6 10.4 12.4 7 12 C10.4 11.6 11.6 10.4 12 7 Z" />
    <path
      d="M16 7.2 L16.35 8.15 L17.3 8.5 L16.35 8.85 L16 9.8 L15.65 8.85 L14.7 8.5 L15.65 8.15 Z"
      fill="currentColor"
      stroke="none"
    />
  </HexIcon>
)

/* At-risk / needs attention — an exclamation mark */
export const AlertIcon = ({ size }: IconProps) => (
  <HexIcon size={size}>
    <path d="M12 8.2 V12.7" />
    <path d="M12 15.1 V15.2" />
  </HexIcon>
)
