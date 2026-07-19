export default function TaplyLogo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <polygon
        points="50,12 83,31 83,69 50,88 17,69 17,31"
        fill="#F2A33C"
        stroke="#F2A33C"
        strokeWidth="12"
        strokeLinejoin="round"
      />
      {/* Hole color follows the auth-page day cycle via --taply-logo-hole */}
      <circle cx="50" cy="50" r="11" fill="var(--taply-logo-hole, #F7F1E5)" />
    </svg>
  )
}
