import qrcode from 'qrcode-generator'

/**
 * Styled Taply QR, ported from design-refs/taply-qr.html: rounded data
 * dots, near-square finder cells, and a center hexagon logo in the QR
 * foreground color. The visual treatment is safe because:
 *  - error correction is always H (30% recovery)
 *  - the logo footprint scales as (6.1/37) of the module count, the same
 *    proportion as the reference (~8.5% of the code area)
 *  - colors are never inverted: fg is always the darker color on a light bg
 */
export default function StyledQr({
  value,
  size = 230,
  fg,
  bg,
}: {
  value: string
  size?: number
  fg: string
  bg: string
}) {
  const qr = qrcode(0, 'H')
  qr.addData(value)
  qr.make()
  const n = qr.getModuleCount()

  const cell = 7
  const pad = 14
  const svgSize = n * cell + pad * 2
  const cx = svgSize / 2
  const cy = svgSize / 2
  const logoR = n * cell * (6.1 / 37) // logo footprint radius, ref proportion

  const isFinder = (r: number, c: number) =>
    (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7)

  const modules: React.ReactNode[] = []
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!qr.isDark(r, c)) continue
      const x = pad + c * cell + cell / 2
      const y = pad + r * cell + cell / 2
      // skip modules under the center logo
      if (Math.hypot(x - cx, y - cy) < logoR) continue
      if (isFinder(r, c)) {
        modules.push(
          <rect
            key={`${r}-${c}`}
            x={x - cell / 2}
            y={y - cell / 2}
            width={cell}
            height={cell}
            rx={1.6}
            fill={fg}
          />
        )
      } else {
        modules.push(
          <circle key={`${r}-${c}`} cx={x} cy={y} r={cell * 0.42} fill={fg} />
        )
      }
    }
  }

  // center hex logo — pointy-top (vertically symmetric, like the brand mark)
  const hr = logoR * 0.98
  let pts = ''
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 3
    pts += `${cx + hr * Math.cos(a)},${cy + hr * Math.sin(a)} `
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${svgSize} ${svgSize}`} role="img" aria-label="QR">
      <rect width={svgSize} height={svgSize} rx={cell * 2.4} fill={bg} />
      {modules}
      <polygon
        points={pts.trim()}
        fill={fg}
        stroke={fg}
        strokeWidth={hr * 0.3}
        strokeLinejoin="round"
      />
      <circle cx={cx} cy={cy} r={hr * 0.36} fill={bg} />
    </svg>
  )
}
