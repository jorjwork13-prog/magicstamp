import Link from 'next/link'
import type { AnalyticsMember } from '@/lib/analytics'

function formatDate(iso: string | null) {
  if (!iso) return 'არასდროს'
  return new Date(iso).toLocaleDateString('ka-GE', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function MemberSegmentList({
  title,
  icon,
  emptyLabel,
  members,
  total,
  maxStamps,
}: {
  title: string
  icon: string
  emptyLabel: string
  members: AnalyticsMember[]
  total: number
  maxStamps: number
}) {
  return (
    <div className="bg-dbg2 rounded-2xl shadow-sm border border-dline p-5 flex flex-col">
      <div className="flex items-center justify-between mb-4 gap-2">
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <h3 className="text-sm font-semibold text-dtext">{title}</h3>
        </div>
        <span className="bg-honey text-ink text-xs font-bold px-2 py-0.5 rounded-full">{total}</span>
      </div>

      {members.length === 0 ? (
        <p className="text-xs text-dmuted py-6 text-center">{emptyLabel}</p>
      ) : (
        <ul className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {members.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium text-dtext truncate">{m.name}</p>
                <p className="text-xs text-dmuted">{formatDate(m.last_visit)}</p>
              </div>
              <span className="shrink-0 text-xs text-dmuted tabular-nums whitespace-nowrap">
                {m.stamp_count}/{maxStamps}
              </span>
            </li>
          ))}
        </ul>
      )}

      {total > members.length && (
        <Link
          href="/dashboard"
          className="mt-4 text-xs font-medium text-dlink hover:opacity-80 transition self-start"
        >
          ყველას ნახვა →
        </Link>
      )}
    </div>
  )
}
