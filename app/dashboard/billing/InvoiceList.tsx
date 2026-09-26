'use client'

import { useState } from 'react'
import {
  formatGel,
  formatPeriod,
  formatShortDate,
  toTetri,
  type InvoiceRow,
  type InvoiceStatus,
} from '@/lib/billing'

type Filter = 'all' | 'open' | 'paid'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'ყველა' },
  { value: 'open', label: 'გადასახდელი' },
  { value: 'paid', label: 'გადახდილი' },
]

// Static class strings so Tailwind can see them.
const GRID_PLAIN = 'sm:grid-cols-[190px_1fr_110px_90px_130px]'
const GRID_VAT = 'sm:grid-cols-[190px_1fr_100px_90px_100px_80px_120px]'

export default function InvoiceList({ invoices }: { invoices: InvoiceRow[] }) {
  const [filter, setFilter] = useState<Filter>('all')

  // VAT columns only once there is VAT to show; today every invoice is zero.
  const hasVat = invoices.some((inv) => toTetri(inv.vat_gel) > 0)
  const grid = hasVat ? GRID_VAT : GRID_PLAIN

  const shown = filter === 'all' ? invoices : invoices.filter((inv) => inv.status === filter)
  const paidCount = invoices.filter((inv) => inv.status === 'paid').length

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h2 className="text-base font-semibold text-dtext">ინვოისები</h2>
        <div className="flex gap-1.5" role="group" aria-label="ფილტრი">
          {FILTERS.map((f) => {
            const active = f.value === filter
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                aria-pressed={active}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                  active
                    ? 'bg-dtext text-dbg border border-dtext'
                    : 'border border-dline text-dtext bg-transparent hover:border-honey'
                }`}
              >
                {f.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Column headers — wide screens only; on a phone each row is a card. */}
      <div
        className={`hidden sm:grid ${grid} gap-3 pb-2.5 border-b border-dline text-[11.5px] uppercase tracking-[0.05em] text-dmuted`}
      >
        <span>ნომერი</span>
        <span>პერიოდი</span>
        <span className="text-right">თანხა</span>
        {hasVat && <span className="text-right">დღგ 18%</span>}
        {hasVat && <span className="text-right">სულ</span>}
        <span>ვადა</span>
        <span>სტატუსი</span>
      </div>

      {shown.length === 0 ? (
        <p className="py-10 text-center text-sm text-dmuted">ამ ფილტრში ინვოისი არ არის</p>
      ) : (
        <ul>
          {shown.map((inv) => (
            <li key={inv.id} className="border-b border-dline/60 last:border-b-0 sm:last:border-b">
              {/* Wide: one grid row */}
              <div className={`hidden sm:grid ${grid} gap-3 items-center py-[13px] text-sm text-dtext`}>
                <span className="font-mono text-[13px] tabular-nums truncate">{inv.number}</span>
                <span className="tabular-nums text-dmuted truncate">
                  {formatPeriod(inv.period_start, inv.period_end)}
                </span>
                <span className="text-right tabular-nums">{formatGel(inv.subtotal_gel)}</span>
                {hasVat && <span className="text-right tabular-nums">{formatGel(inv.vat_gel)}</span>}
                {hasVat && (
                  <span className="text-right tabular-nums font-semibold">{formatGel(inv.total_gel)}</span>
                )}
                <span className="tabular-nums text-dmuted text-[13px]">
                  {inv.due_at ? formatShortDate(inv.due_at) : '—'}
                </span>
                <span>
                  <StatusPill status={inv.status} />
                </span>
              </div>

              {/* Phone: card — number and period left, amount and status right */}
              <div className="sm:hidden flex items-start justify-between gap-3 py-[13px]">
                <div className="min-w-0">
                  <p className="font-mono text-[13px] tabular-nums text-dtext truncate">{inv.number}</p>
                  <p className="text-xs tabular-nums text-dmuted mt-1">
                    {formatPeriod(inv.period_start, inv.period_end)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="text-sm font-semibold tabular-nums text-dtext">
                    {formatGel(inv.total_gel)}
                  </span>
                  <StatusPill status={inv.status} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-dmuted">
        <p className="tabular-nums">
          ნაჩვენებია {shown.length} / {invoices.length} · გადახდილია {paidCount}
        </p>
        <p>უფასო თვეებზეც იწერება ინვოისი — ₾0-ზე, რომ ისტორია არ გაწყდეს.</p>
      </div>
    </>
  )
}

/** Inverted on purpose: what still needs paying stands out, paid is quiet. */
function StatusPill({ status }: { status: InvoiceStatus }) {
  if (status === 'open') {
    return (
      <span className="inline-block rounded-full bg-honey/16 border border-honey/55 px-2.5 py-0.5 text-xs font-semibold text-dlink">
        გადასახდელი
      </span>
    )
  }
  if (status === 'paid') {
    return (
      <span className="inline-block rounded-full bg-dtext/5 border border-transparent px-2.5 py-0.5 text-xs text-dmuted">
        გადახდილი
      </span>
    )
  }
  return (
    <span className="inline-block rounded-full bg-dtext/5 border border-transparent px-2.5 py-0.5 text-xs text-dmuted opacity-60">
      გაუქმებული
    </span>
  )
}
