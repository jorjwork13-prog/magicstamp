import Link from 'next/link'
import {
  formatGel,
  monthGenitive,
  shouldShowBanner,
  type BillingState,
  type InvoiceRow,
} from '@/lib/billing'

/** One-line billing reminder for the billing page and the dashboard home.
 *  Honey, never red: the service keeps running, nobody is cut off, and a red
 *  banner would read as "your customers' cards stopped working". Renders
 *  nothing for a healthy account. */
export default function BillingBanner({
  state,
  openInvoices,
  href,
}: {
  state: BillingState
  openInvoices: InvoiceRow[]
  href: string
}) {
  if (!shouldShowBanner(state)) return null

  return (
    <div className="bg-dbg2 border border-honey/55 border-l-4 border-l-honey rounded-xl px-4 py-3 flex items-center gap-3 text-sm text-dtext">
      <WarningIcon />
      <p className="flex-1 min-w-0">{message(state, openInvoices)}</p>
      <Link href={href} className="shrink-0 font-semibold text-dlink hover:underline">
        ინვოისები →
      </Link>
    </div>
  )
}

function message(state: BillingState, openInvoices: InvoiceRow[]): string {
  if (state.kind === 'past_due') {
    const open = openInvoices.filter((inv) => inv.status === 'open')
    const amount = state.amountGel !== null ? ` თანხა: ${formatGel(state.amountGel)}.` : ''
    if (open.length === 1) {
      return `${monthGenitive(open[0].period_start)} ინვოისი გადაუხდელია.${amount}`
    }
    if (open.length > 1) {
      return `${open.length} ინვოისი გადაუხდელია.${amount}`
    }
    return 'გადახდის ვადა გავიდა.'
  }

  if (state.kind === 'trialing' && state.daysLeft !== null) {
    const when = state.daysLeft === 0 ? 'დღეს' : `${state.daysLeft} დღეში`
    return `საცდელი პერიოდი ${when} სრულდება — შემდეგი თვიდან გადახდა იწყება.`
  }

  return ''
}

function WarningIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-honey"
      aria-hidden="true"
    >
      <path d="M12 3.5 L21.5 20 H2.5 Z" />
      <path d="M12 10v4.5" />
      <path d="M12 17.3v.2" />
    </svg>
  )
}
