/** Billing: pure functions over the rows in migration 010_billing.sql.
 *  No supabase imports — the page reads the rows, this file only interprets
 *  them. Numeric columns arrive from Supabase as strings, so every amount is
 *  parsed here once rather than at each call site. */

export type Plan = 'starter' | 'growth' | 'network'
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled'
export type InvoiceStatus = 'open' | 'paid' | 'void'

/** numeric columns come back as strings from PostgREST */
type Numeric = number | string

export type SubscriptionRow = {
  id: string
  business_id: string
  plan: Plan
  status: SubscriptionStatus
  price_gel: Numeric
  billing_period: 'monthly' | 'yearly'
  trial_ends_at: string | null
  current_period_end: string | null
  founder_rate_until: string | null
  method: string
  provider: string | null
  provider_ref: string | null
  notes: string | null
}

export type InvoiceRow = {
  id: string
  business_id: string
  number: string
  subtotal_gel: Numeric
  vat_rate: Numeric
  vat_gel: Numeric
  total_gel: Numeric
  period_start: string // date, YYYY-MM-DD
  period_end: string // date, YYYY-MM-DD
  status: InvoiceStatus
  issued_at: string
  due_at: string | null
  paid_at: string | null
  method: string | null
  provider_ref: string | null
  notes: string | null
}

/** Columns to select for each row type — keeps the page's queries in step
 *  with the types above. */
export const SUBSCRIPTION_COLUMNS =
  'id, business_id, plan, status, price_gel, billing_period, trial_ends_at, current_period_end, founder_rate_until, method, provider, provider_ref, notes'
export const INVOICE_COLUMNS =
  'id, business_id, number, subtotal_gel, vat_rate, vat_gel, total_gel, period_start, period_end, status, issued_at, due_at, paid_at, method, provider_ref, notes'

export type BillingState =
  // A trial row without trial_ends_at has no countdown; both fields are null then.
  | { kind: 'trialing'; daysLeft: number | null; endsAt: string | null }
  | { kind: 'active'; nextChargeAt: string | null; daysUntilCharge: number | null }
  | { kind: 'past_due'; daysOverdue: number; amountGel: number | null }
  | { kind: 'canceled' }

/** Public list price per plan, before VAT. Mirrors components/PricingSection.
 *  Network is priced per deal, so it has no list price. */
export const LIST_PRICE_GEL: Record<Plan, number | null> = {
  starter: 99,
  growth: 189,
  network: null,
}

export const PLAN_LABEL: Record<Plan, string> = {
  starter: 'დამწყები',
  growth: 'მზარდი',
  network: 'ქსელი',
}

// ── money ───────────────────────────────────────────────────────────────────

/** Whole tetri. Summing in integers keeps 57.03 + 12.01 from drifting. */
export function toTetri(n: Numeric | null | undefined): number {
  const v = typeof n === 'string' ? Number(n.trim()) : n
  if (v === null || v === undefined || !Number.isFinite(v)) return 0
  return Math.round(v * 100)
}

export function toGel(n: Numeric | null | undefined): number {
  return toTetri(n) / 100
}

/** "₾69.00" — always two decimals, so a column of amounts scans evenly. */
export function formatGel(n: number | string): string {
  const tetri = toTetri(n)
  const sign = tetri < 0 ? '-' : ''
  return `${sign}₾${(Math.abs(tetri) / 100).toFixed(2)}`
}

/** Sum of total_gel over the invoices, in GEL. */
export function sumTotalGel(invoices: Pick<InvoiceRow, 'total_gel'>[]): number {
  return invoices.reduce((acc, inv) => acc + toTetri(inv.total_gel), 0) / 100
}

// ── days ────────────────────────────────────────────────────────────────────

const DAY_MS = 86_400_000
// Georgia is UTC+4 all year (no DST), so a fixed offset gives the local
// calendar date without Intl.
const TBILISI_OFFSET_MS = 4 * 3_600_000

function toMs(value: string | number): number {
  // A bare date column (YYYY-MM-DD) is a calendar date, not a UTC instant.
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return Date.parse(`${value}T00:00:00+04:00`)
  }
  return typeof value === 'number' ? value : Date.parse(value)
}

/** Index of the Tbilisi calendar day containing this instant. */
function tbilisiDay(ms: number): number {
  return Math.floor((ms + TBILISI_OFFSET_MS) / DAY_MS)
}

/** Calendar days from `now` until `target`; negative when target is past. */
export function calendarDaysUntil(target: string, now: number = Date.now()): number | null {
  const t = toMs(target)
  if (!Number.isFinite(t)) return null
  return tbilisiDay(t) - tbilisiDay(now)
}

// ── state ───────────────────────────────────────────────────────────────────

/** The subscription's status column decides the state. Dates only supply the
 *  countdowns: a late payment recorded late must not flip anyone to past_due. */
export function computeBillingState(
  sub: SubscriptionRow,
  openInvoices: InvoiceRow[],
  now: number = Date.now(),
): BillingState {
  switch (sub.status) {
    case 'trialing': {
      const endsAt = sub.trial_ends_at
      const days = endsAt ? calendarDaysUntil(endsAt, now) : null
      return {
        kind: 'trialing',
        endsAt,
        daysLeft: days === null ? null : Math.max(0, days),
      }
    }

    case 'active': {
      const nextChargeAt = sub.current_period_end
      const days = nextChargeAt ? calendarDaysUntil(nextChargeAt, now) : null
      return {
        kind: 'active',
        nextChargeAt,
        daysUntilCharge: days === null ? null : Math.max(0, days),
      }
    }

    case 'past_due': {
      const open = openInvoices.filter((inv) => inv.status === 'open')
      // Overdue since the earliest due date we know of.
      const dueDates = open
        .map((inv) => inv.due_at)
        .filter((d): d is string => !!d)
      if (sub.current_period_end) dueDates.push(sub.current_period_end)
      const earliest = dueDates
        .map((d) => calendarDaysUntil(d, now))
        .filter((d): d is number => d !== null)
        .reduce<number | null>((min, d) => (min === null || d < min ? d : min), null)
      return {
        kind: 'past_due',
        daysOverdue: earliest === null ? 0 : Math.max(0, -earliest),
        amountGel: open.length ? sumTotalGel(open) : null,
      }
    }

    case 'canceled':
    default:
      return { kind: 'canceled' }
  }
}

/** Days left on the founder rate; null when not on it or when it has ended. */
export function founderRateEndsIn(
  sub: Pick<SubscriptionRow, 'founder_rate_until'>,
  now: number = Date.now(),
): number | null {
  if (!sub.founder_rate_until) return null
  const t = toMs(sub.founder_rate_until)
  if (!Number.isFinite(t) || t <= now) return null
  const days = calendarDaysUntil(sub.founder_rate_until, now)
  return days === null ? null : Math.max(0, days)
}

/** The one-line reminder shows only for a past-due account or a trial in its
 *  last week. A healthy account renders nothing. */
export function shouldShowBanner(state: BillingState): boolean {
  if (state.kind === 'past_due') return true
  return state.kind === 'trialing' && state.daysLeft !== null && state.daysLeft <= 7
}

// ── Georgian dates ──────────────────────────────────────────────────────────

const MONTHS = [
  'იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი',
  'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი',
]
const MONTHS_GENITIVE = [
  'იანვრის', 'თებერვლის', 'მარტის', 'აპრილის', 'მაისის', 'ივნისის',
  'ივლისის', 'აგვისტოს', 'სექტემბრის', 'ოქტომბრის', 'ნოემბრის', 'დეკემბრის',
]

function tbilisiParts(value: string | number) {
  const d = new Date(toMs(value) + TBILISI_OFFSET_MS)
  return { day: d.getUTCDate(), month: d.getUTCMonth(), year: d.getUTCFullYear() }
}

/** "5 ოქტომბერი" */
export function formatDayMonth(value: string | number): string {
  const { day, month } = tbilisiParts(value)
  return `${day} ${MONTHS[month]}`
}

/** "5 ოქტომბერს" — dative, for "ends on …" sentences. */
export function formatDayMonthDative(value: string | number): string {
  const { day, month } = tbilisiParts(value)
  const name = MONTHS[month]
  return `${day} ${name.endsWith('ი') ? name.slice(0, -1) : name}ს`
}

/** "5 ოქტომბერი 2026" */
export function formatFullDate(value: string | number): string {
  const { day, month, year } = tbilisiParts(value)
  return `${day} ${MONTHS[month]} ${year}`
}

/** "05.10.2026" — compact enough for a narrow table column. */
export function formatShortDate(value: string | number): string {
  const { day, month, year } = tbilisiParts(value)
  return `${String(day).padStart(2, '0')}.${String(month + 1).padStart(2, '0')}.${year}`
}

/** "სექტემბრის" — whose invoice, by billing month. */
export function monthGenitive(value: string | number): string {
  return MONTHS_GENITIVE[tbilisiParts(value).month]
}

/** "1–30 სექტემბერი 2026", or "15 სექტემბერი – 14 ოქტომბერი 2026" across months. */
export function formatPeriod(start: string, end: string): string {
  const a = tbilisiParts(start)
  const b = tbilisiParts(end)
  if (a.year === b.year && a.month === b.month) {
    return `${a.day}–${b.day} ${MONTHS[a.month]} ${a.year}`
  }
  if (a.year === b.year) {
    return `${a.day} ${MONTHS[a.month]} – ${b.day} ${MONTHS[b.month]} ${b.year}`
  }
  return `${a.day} ${MONTHS[a.month]} ${a.year} – ${b.day} ${MONTHS[b.month]} ${b.year}`
}
