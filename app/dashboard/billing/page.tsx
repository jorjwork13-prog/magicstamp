import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import {
  INVOICE_COLUMNS,
  LIST_PRICE_GEL,
  PLAN_LABEL,
  SUBSCRIPTION_COLUMNS,
  computeBillingState,
  formatDayMonth,
  formatDayMonthDative,
  formatFullDate,
  formatGel,
  founderRateEndsIn,
  sumTotalGel,
  type BillingState,
  type InvoiceRow,
  type SubscriptionRow,
} from '@/lib/billing'
import BillingBanner from './BillingBanner'
import CopyButton from './CopyButton'
import InvoiceList from './InvoiceList'
import { PAYMENT_DETAILS } from './payment-details'

const EXAMPLE_INVOICE_NUMBER = 'TAPLY-202601-000001'

export default async function BillingPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, tax_id')
    .eq('email', user.email!)
    .single()

  if (!business) redirect('/login')

  // Billing tables are read-only for the owner (RLS); nothing here writes.
  const [{ data: subData }, { data: invoiceData }, { data: openData }] = await Promise.all([
    supabase
      .from('subscriptions')
      .select(SUBSCRIPTION_COLUMNS)
      .eq('business_id', business.id)
      .maybeSingle(),
    supabase
      .from('invoices')
      .select(INVOICE_COLUMNS)
      .eq('business_id', business.id)
      .order('issued_at', { ascending: false })
      .limit(12),
    // Every open invoice, not just the last 12, so the outstanding total is whole.
    supabase
      .from('invoices')
      .select(INVOICE_COLUMNS)
      .eq('business_id', business.id)
      .eq('status', 'open')
      .order('period_start', { ascending: true }),
  ])

  const sub = (subData ?? null) as SubscriptionRow | null
  const invoices = (invoiceData ?? []) as InvoiceRow[]
  const openInvoices = (openData ?? []) as InvoiceRow[]

  const state = sub ? computeBillingState(sub, openInvoices) : null
  const founderDays = sub ? founderRateEndsIn(sub) : null

  const outstanding = sumTotalGel(openInvoices)
  const earliestDue = openInvoices
    .map((inv) => inv.due_at)
    .filter((d): d is string => !!d)
    .sort((a, b) => Date.parse(a) - Date.parse(b))[0]

  const outstandingCard = (
    <OutstandingCard
      amount={outstanding}
      hasOpen={openInvoices.length > 0}
      earliestDue={earliestDue ?? null}
    />
  )

  return (
    <>
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Phone: the first question is how much, so the amount leads. */}
        <div className="sm:hidden">{outstandingCard}</div>

        <header className="px-1">
          <p className="text-xs uppercase tracking-[0.08em] text-dmuted">{business.name}</p>
          <h1 className="text-2xl font-bold text-dtext mt-1">გადახდები</h1>
        </header>

        {state && <BillingBanner state={state} openInvoices={openInvoices} href="#invoices" />}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_300px]">
          <PlanCard sub={sub} />
          <StatusCard state={state} />
          <div className="hidden sm:block sm:col-span-2 lg:col-span-1">{outstandingCard}</div>
        </div>

        {sub?.founder_rate_until && founderDays !== null && (
          <FounderNotice sub={sub} daysLeft={founderDays} />
        )}

        <PaymentDetailsCard exampleNumber={invoices[0]?.number ?? EXAMPLE_INVOICE_NUMBER} />

        {!business.tax_id && (
          <div className="bg-dbg2 rounded-2xl border border-dline px-6 py-4 text-sm text-dtext flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p>
              <span className="font-semibold">მიუთითეთ საიდენტიფიკაციო კოდი (ს/კ).</span>{' '}
              <span className="text-dmuted">ის ინვოისზე იწერება — ბუღალტერია მის გარეშე ინვოისს ვერ მიიღებს.</span>
            </p>
            <Link
              href="/dashboard/settings#billing-details"
              className="shrink-0 font-semibold text-dlink hover:underline"
            >
              პარამეტრებში დამატება →
            </Link>
          </div>
        )}

        <section id="invoices" className="bg-dbg2 rounded-2xl border border-dline p-6 scroll-mt-20">
          <InvoiceList invoices={invoices} />
        </section>
      </main>

      <footer className="max-w-5xl mx-auto px-4 py-6 flex justify-center gap-4 text-xs text-dmuted border-t border-dline">
        <Link href="/privacy" className="hover:text-dlink transition">კონფიდენციალურობა</Link>
        <span>·</span>
        <Link href="/terms" className="hover:text-dlink transition">პირობები</Link>
      </footer>
    </>
  )
}

// ── cards ───────────────────────────────────────────────────────────────────

function CardLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold text-dmuted mb-3">{children}</h2>
}

function PlanCard({ sub }: { sub: SubscriptionRow | null }) {
  const period = sub?.billing_period === 'yearly' ? 'წლიური ანგარიშსწორება' : 'ყოველთვიური ანგარიშსწორება'
  const method = sub?.method === 'card' ? 'ბარათით' : 'საბანკო გადარიცხვით'

  return (
    <section className="bg-dbg2 rounded-2xl border border-dline p-6">
      <CardLabel>გეგმა</CardLabel>
      <p className="text-lg font-semibold text-dtext">{sub ? PLAN_LABEL[sub.plan] ?? sub.plan : '—'}</p>
      <p className="text-xs text-dmuted mt-0.5">
        {period} · {method} · დღგ-ს გარეშე
      </p>
      <p className="mt-5 flex items-baseline gap-1.5">
        <span className="text-4xl font-bold tabular-nums text-dtext">
          {sub ? formatGel(sub.price_gel) : '—'}
        </span>
        <span className="text-sm text-dmuted">/ თვე</span>
      </p>
    </section>
  )
}

const STATE_TITLE: Record<BillingState['kind'], string> = {
  trialing: 'საცდელი პერიოდი',
  active: 'აქტიურია',
  past_due: 'გადახდის ვადა გავიდა',
  canceled: 'გაუქმებულია',
}

function stateSentence(state: BillingState): string {
  switch (state.kind) {
    case 'trialing':
      if (!state.endsAt || state.daysLeft === null) return 'საცდელ პერიოდში არაფერს იხდით.'
      if (state.daysLeft === 0) return 'საცდელი პერიოდი დღეს სრულდება. შემდეგ გადახდა ყოველთვიურად იწყება.'
      return `საცდელი პერიოდი სრულდება ${formatDayMonthDative(state.endsAt)} — ${state.daysLeft} დღე დარჩა. მანამდე არაფერს იხდით.`
    case 'active':
      if (!state.nextChargeAt) return 'გამოწერა აქტიურია. ახლა გადასახდელი არაფერია.'
      return state.daysUntilCharge
        ? `შემდეგი ინვოისის ვადაა ${formatDayMonth(state.nextChargeAt)} — ${state.daysUntilCharge} დღეში.`
        : `შემდეგი ინვოისის ვადაა დღეს, ${formatDayMonth(state.nextChargeAt)}.`
    case 'past_due':
      return state.daysOverdue > 0
        ? `ვადა ${state.daysOverdue} დღით გადაცილებულია. სერვისი ჩვეულებრივ მუშაობს — გადარიცხვის აღრიცხვისთანავე სტატუსი განახლდება.`
        : 'ვადა გავიდა. სერვისი ჩვეულებრივ მუშაობს — გადარიცხვის აღრიცხვისთანავე სტატუსი განახლდება.'
    case 'canceled':
      return 'გამოწერა გაუქმებულია. განსაახლებლად დაგვიკავშირდით.'
  }
}

function StatusCard({ state }: { state: BillingState | null }) {
  return (
    <section className="bg-dbg2 rounded-2xl border border-dline p-6">
      <CardLabel>მდგომარეობა</CardLabel>
      {state ? (
        <>
          <p className="flex items-center gap-2 text-lg font-semibold text-dtext">
            <span
              className={`inline-block w-[9px] h-[9px] rounded-full shrink-0 ${
                state.kind === 'canceled' ? 'bg-dmuted' : 'bg-honey'
              }`}
              aria-hidden="true"
            />
            {STATE_TITLE[state.kind]}
          </p>
          <p className="text-sm text-dmuted mt-2 tabular-nums">{stateSentence(state)}</p>
        </>
      ) : (
        <p className="text-sm text-dmuted">გამოწერის ინფორმაცია ჯერ არ არის.</p>
      )}
    </section>
  )
}

function OutstandingCard({
  amount,
  hasOpen,
  earliestDue,
}: {
  amount: number
  hasOpen: boolean
  earliestDue: string | null
}) {
  return (
    <section className="bg-dbg2 rounded-2xl border border-dline p-6 h-full">
      <CardLabel>გადასახდელი</CardLabel>
      <p className="text-4xl font-bold tabular-nums text-dtext">{formatGel(amount)}</p>
      <p className="text-sm text-dmuted mt-2 tabular-nums">
        {!hasOpen
          ? 'გადასახდელი არაფერია'
          : earliestDue
            ? `ვადა — ${formatDayMonth(earliestDue)}`
            : 'იხილეთ ინვოისები ქვემოთ'}
      </p>
    </section>
  )
}

function FounderNotice({ sub, daysLeft }: { sub: SubscriptionRow; daysLeft: number }) {
  const listPrice = LIST_PRICE_GEL[sub.plan]
  const after =
    listPrice !== null
      ? `შემდეგ ფასი იქნება ${formatGel(listPrice)} / თვე.`
      : 'შემდეგ მოქმედებს გეგმის სტანდარტული ფასი.'

  return (
    <div className="bg-honey/10 border border-honey/30 rounded-xl px-4 py-3 flex items-start gap-3 text-sm text-dtext">
      <ClockIcon />
      <p className="tabular-nums">
        დამფუძნებლის ფასი — {formatGel(sub.price_gel)} / თვე — მოქმედებს{' '}
        {formatFullDate(sub.founder_rate_until!)}-მდე ({daysLeft} დღე დარჩა). {after}
      </p>
    </div>
  )
}

function PaymentDetailsCard({ exampleNumber }: { exampleNumber: string }) {
  return (
    <section className="bg-dbg2 rounded-2xl border border-dline p-6">
      <h2 className="text-base font-semibold text-dtext mb-5">გადახდის რეკვიზიტები</h2>

      {/* The one field that decides whether a transfer can be reconciled at
          all — deliberately louder than the account numbers. */}
      <div className="bg-honey/13 border border-honey/45 rounded-xl p-4 flex items-start gap-3">
        <ShieldCheckIcon />
        <div className="min-w-0">
          <p className="font-bold text-dtext">
            გადახდის დანიშნულებაში აუცილებლად მიუთითეთ ინვოისის ნომერი
          </p>
          <p className="text-sm text-dmuted mt-1.5 leading-relaxed">
            <code className="font-mono tabular-nums text-[13px] text-dtext bg-dbg2 border border-dline rounded-md px-1.5 py-0.5">
              {exampleNumber}
            </code>{' '}
            — ამის გარეშე ვერ დავადგენთ რომელ თვეს ეხება გადარიცხვა.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 mt-4">
        {PAYMENT_DETAILS.accounts.map((acc) => (
          <div key={acc.bank} className="border border-dline rounded-xl p-4">
            <p className="text-xs text-dmuted">{acc.bank}</p>
            <div className="mt-1.5 flex items-center justify-between gap-3">
              <span className="font-mono tabular-nums text-sm text-dtext break-all select-all">
                {acc.iban}
              </span>
              <CopyButton value={acc.iban} />
            </div>
          </div>
        ))}
      </div>

      <dl className="border-t border-dline mt-5 pt-4 grid gap-3 sm:grid-cols-3 text-sm">
        <div>
          <dt className="text-xs text-dmuted">მიმღები</dt>
          <dd className="text-dtext mt-0.5">{PAYMENT_DETAILS.legalName}</dd>
        </div>
        <div>
          <dt className="text-xs text-dmuted">ს/კ</dt>
          <dd className="text-dtext mt-0.5 tabular-nums">{PAYMENT_DETAILS.taxId}</dd>
        </div>
        <div>
          <dt className="text-xs text-dmuted">მისამართი</dt>
          <dd className="text-dtext mt-0.5">{PAYMENT_DETAILS.address}</dd>
        </div>
      </dl>

      <p className="mt-5 flex items-start gap-2 text-sm text-dmuted">
        <TransferIcon />
        <span>
          რომ ყოველთვე არ გახსოვდეთ — შეგიძლიათ ბანკის აპში დააყენოთ{' '}
          <strong className="text-dtext">პერიოდული გადარიცხვა</strong>. უფასოა და ორ წუთში კეთდება.
        </span>
      </p>
    </section>
  )
}

// ── icons (outline, currentColor) ───────────────────────────────────────────

function Svg({ size = 18, className, children }: { size?: number; className?: string; children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className ?? ''}`}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

function ClockIcon() {
  return (
    <Svg className="text-honey mt-0.5">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </Svg>
  )
}

function ShieldCheckIcon() {
  return (
    <Svg size={20} className="text-dlink mt-0.5">
      <path d="M12 3 L19.5 6 V11.5 C19.5 16 16.3 19.4 12 21 C7.7 19.4 4.5 16 4.5 11.5 V6 Z" />
      <path d="M8.8 12.2 L11 14.4 L15.4 10" />
    </Svg>
  )
}

function TransferIcon() {
  return (
    <Svg size={16} className="text-dmuted mt-0.5">
      <path d="M4 8h13M13.5 4.5 17 8l-3.5 3.5" />
      <path d="M20 16H7M10.5 12.5 7 16l3.5 3.5" />
    </Svg>
  )
}
