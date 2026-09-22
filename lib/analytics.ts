const DAY_MS = 24 * 60 * 60 * 1000

export type AnalyticsMember = {
  id: string
  name: string
  phone: string
  stamp_count: number
  created_at: string
  last_visit: string | null
}

export type Kpis = {
  totalMembers: number
  /** null when no member has ever earned a stamp — nothing to compute a rate from */
  returnRatePercent: number | null
  rewardsIssued: number
  activeThisWeek: number
}

export type DailySignup = { date: string; count: number }

export type Segments = {
  loyal: AnalyticsMember[]
  loyalTotal: number
  fresh: AnalyticsMember[]
  freshTotal: number
  atRisk: AnalyticsMember[]
  atRiskTotal: number
}

function daysSince(iso: string, now: number): number {
  return (now - new Date(iso).getTime()) / DAY_MS
}

export function computeKpis(members: AnalyticsMember[], maxStamps: number, now = Date.now()): Kpis {
  const totalMembers = members.length
  const withStamps = members.filter((m) => m.stamp_count > 0)
  const returned = withStamps.filter((m) => m.stamp_count > 1)
  const returnRatePercent =
    withStamps.length > 0 ? Math.round((returned.length / withStamps.length) * 100) : null

  // NOTE: stamp_count is reset to 0 the moment a member hits maxStamps (see
  // QrScanner.tsx), so this will almost never catch anyone mid-reward — it's
  // a placeholder until a real redemption log exists.
  const rewardsIssued = members.filter((m) => m.stamp_count >= maxStamps).length

  const activeThisWeek = members.filter((m) => m.last_visit && daysSince(m.last_visit, now) <= 7).length

  return { totalMembers, returnRatePercent, rewardsIssued, activeThisWeek }
}

export function computeDailySignups(members: AnalyticsMember[], days = 30, now = Date.now()): DailySignup[] {
  const buckets = new Map<string, number>()
  for (let i = days - 1; i >= 0; i--) {
    const key = new Date(now - i * DAY_MS).toISOString().slice(0, 10)
    buckets.set(key, 0)
  }
  for (const m of members) {
    const key = new Date(m.created_at).toISOString().slice(0, 10)
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1)
  }
  return Array.from(buckets.entries()).map(([date, count]) => ({ date, count }))
}

export function computeSegments(members: AnalyticsMember[], maxStamps: number, now = Date.now()): Segments {
  const loyalAll = members
    .filter((m) => m.last_visit && daysSince(m.last_visit, now) <= 7 && m.stamp_count >= 2)
    .sort((a, b) => new Date(b.last_visit as string).getTime() - new Date(a.last_visit as string).getTime())

  const freshAll = members
    .filter((m) => daysSince(m.created_at, now) <= 7)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  // Never-visited-since-joining counts as "went quiet" too, not just old last_visit.
  const atRiskAll = members
    .filter(
      (m) =>
        (m.last_visit === null || daysSince(m.last_visit, now) > 14) &&
        m.stamp_count > 0 &&
        m.stamp_count < maxStamps,
    )
    .sort((a, b) => {
      const aTime = a.last_visit ? new Date(a.last_visit).getTime() : 0
      const bTime = b.last_visit ? new Date(b.last_visit).getTime() : 0
      return aTime - bTime
    })

  return {
    loyal: loyalAll.slice(0, 5),
    loyalTotal: loyalAll.length,
    fresh: freshAll.slice(0, 5),
    freshTotal: freshAll.length,
    atRisk: atRiskAll.slice(0, 5),
    atRiskTotal: atRiskAll.length,
  }
}

// ── Single member ───────────────────────────────────────────────────────────
// Everything below reads the visit log (public.stamps) rather than
// members.stamp_count. The count is a balance that resets to 0 on every reward,
// so it can answer "how close is this card to full?" and nothing else — not
// "how often does this person actually come?", which is the question that sells.

/**
 * Where a member sits against **their own** rhythm, not a fixed number of days.
 * Somebody who comes daily and has been away a week is in trouble; somebody who
 * comes monthly and has been away a week is perfectly normal. One global
 * threshold calls the second one at risk and misses the first entirely.
 */
export type MemberRhythm = 'never' | 'too-early' | 'steady' | 'slowing' | 'at-risk'

export type MemberStats = {
  totalVisits: number
  firstVisit: string | null
  lastVisit: string | null
  daysSinceLastVisit: number | null
  /** Mean days between consecutive visits. Null below two visits — one visit is not an interval. */
  avgIntervalDays: number | null
  rhythm: MemberRhythm
}

export type VisitDay = { date: string; count: number }

/**
 * Visit timestamps (ISO, any order) → per-day counts for the last `days` days.
 *
 * Buckets by UTC date, matching computeDailySignups above. Georgia is UTC+4, so
 * a visit between 00:00 and 04:00 local lands on the previous day — harmless for
 * a café, but this needs a real timezone before the peak-hours view ships, since
 * that one is read hour by hour.
 */
export function computeVisitDays(visits: string[], days = 84, now = Date.now()): VisitDay[] {
  const buckets = new Map<string, number>()
  for (let i = days - 1; i >= 0; i--) {
    buckets.set(new Date(now - i * DAY_MS).toISOString().slice(0, 10), 0)
  }
  for (const v of visits) {
    const key = new Date(v).toISOString().slice(0, 10)
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1)
  }
  return Array.from(buckets.entries()).map(([date, count]) => ({ date, count }))
}

export function computeMemberStats(visits: string[], now = Date.now()): MemberStats {
  const sorted = [...visits].sort()
  const totalVisits = sorted.length

  if (totalVisits === 0) {
    return {
      totalVisits: 0,
      firstVisit: null,
      lastVisit: null,
      daysSinceLastVisit: null,
      avgIntervalDays: null,
      rhythm: 'never',
    }
  }

  const firstVisit = sorted[0]
  const lastVisit = sorted[totalVisits - 1]
  const daysSinceLastVisit = daysSince(lastVisit, now)

  // Span over gaps, not a mean of pairwise diffs: same value, but it makes the
  // "fewer than two visits ⇒ no interval" case impossible to get wrong.
  const avgIntervalDays =
    totalVisits >= 2
      ? (new Date(lastVisit).getTime() - new Date(firstVisit).getTime()) / DAY_MS / (totalVisits - 1)
      : null

  // Three visits is the first point at which an "interval" is more than an
  // accident of two dates, so anything below that is reported as such rather
  // than dressed up as a rhythm.
  let rhythm: MemberRhythm
  if (avgIntervalDays === null || totalVisits < 3) {
    rhythm = 'too-early'
  } else {
    const ratio = daysSinceLastVisit / Math.max(avgIntervalDays, 0.5)
    rhythm = ratio <= 1.5 ? 'steady' : ratio <= 2.5 ? 'slowing' : 'at-risk'
  }

  return { totalVisits, firstVisit, lastVisit, daysSinceLastVisit, avgIntervalDays, rhythm }
}
