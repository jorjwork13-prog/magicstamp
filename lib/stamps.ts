/**
 * Returns row sizes for a balanced stamp-circle grid.
 *
 * Rules:
 *  - max ≤ 5  → single row [max]
 *  - max 6-14 → 2 rows: perRow = ceil(max/2), last row holds remainder
 *  - max ≥ 15 → 3 rows: perRow = ceil(max/3), last row holds remainder
 *    (switches at 15 so no row exceeds 7 circles)
 *
 * Examples: 6→3+3, 7→4+3, 8→4+4, 10→5+5, 12→6+6, 15→5+5+5, 20→7+7+6
 */
export function computeRowLayout(max: number): number[] {
  if (max <= 5) return [max]
  const rows = Math.ceil(max / 2) > 7 ? 3 : 2
  const perRow = Math.ceil(max / rows)
  const layout: number[] = []
  let remaining = max
  while (remaining > 0) {
    layout.push(Math.min(perRow, remaining))
    remaining -= perRow
  }
  return layout
}
