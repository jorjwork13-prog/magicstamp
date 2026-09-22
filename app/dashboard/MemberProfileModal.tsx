'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import StampGrid from '@/components/StampGrid'
import { CARD_THEME_SPECS, type CardTheme } from '@/lib/card-themes'
import {
  computeMemberStats,
  computeVisitDays,
  type MemberRhythm,
  type MemberStats,
  type VisitDay,
} from '@/lib/analytics'

export type ProfileMember = {
  id: string
  name: string
  phone: string
  stamp_count: number
  created_at: string
}

const STRIP_DAYS = 84 // 12 weeks — long enough to show a rhythm, short enough to stay legible

const RHYTHM_COPY: Record<MemberRhythm, { label: string; tone: string; hint: string }> = {
  never: {
    label: 'ჯერ არ მოსულა',
    tone: 'text-dmuted border-dline',
    hint: 'დარეგისტრირდა, მაგრამ ჯერ არცერთი ვიზიტი არ დაფიქსირებულა',
  },
  'too-early': {
    label: 'ჯერ ნაადრევია',
    tone: 'text-dmuted border-dline',
    hint: 'რიტმის სათქმელად სულ მცირე 3 ვიზიტია საჭირო',
  },
  steady: {
    label: 'თავის რიტმშია',
    tone: 'text-honey border-honey/40',
    hint: 'ბოლო ვიზიტიდან იმაზე ნაკლები გავიდა, ვიდრე მისი ჩვეული ინტერვალია',
  },
  slowing: {
    label: 'ნელდება',
    tone: 'text-dtext border-dline',
    hint: 'ჩვეულზე დიდი ხანია არ ყოფილა — ჯერ არა კრიტიკული',
  },
  'at-risk': {
    label: 'საყურადღებოა',
    tone: 'text-dtext border-honey/40',
    hint: 'საკუთარ ინტერვალს ორჯერზე მეტად გადააჭარბა',
  },
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('ka-GE', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatDays(n: number | null) {
  if (n === null) return '—'
  if (n < 1) return 'დღეს'
  return `${Math.round(n)} დღე`
}

/** One cell per day, 12 weeks. Intensity is a single-hue ramp: the only thing
 *  encoded is "how many visits", so a second hue would be noise. */
function VisitStrip({ days }: { days: VisitDay[] }) {
  const weeks: VisitDay[][] = []
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))

  return (
    <div>
      <div className="flex gap-[3px] overflow-x-auto pb-1" role="img" aria-label="ვიზიტები ბოლო 12 კვირაში">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((d) => {
              const bg =
                d.count === 0
                  ? 'transparent'
                  : d.count === 1
                    ? 'color-mix(in oklab, var(--honey) 45%, var(--dbg2))'
                    : 'var(--honey)'
              return (
                <div
                  key={d.date}
                  title={`${formatDate(d.date)} — ${d.count === 0 ? 'ვიზიტი არ ყოფილა' : `${d.count} ვიზიტი`}`}
                  className="w-[11px] h-[11px] rounded-[3px] border border-dline"
                  style={{ background: bg }}
                />
              )
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 mt-2 text-[10px] text-dmuted">
        <span>ნაკლები</span>
        <span className="w-[11px] h-[11px] rounded-[3px] border border-dline" />
        <span
          className="w-[11px] h-[11px] rounded-[3px] border border-dline"
          style={{ background: 'color-mix(in oklab, var(--honey) 45%, var(--dbg2))' }}
        />
        <span
          className="w-[11px] h-[11px] rounded-[3px] border border-dline"
          style={{ background: 'var(--honey)' }}
        />
        <span>მეტი</span>
      </div>
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-dbg rounded-xl border border-dline px-3 py-2.5">
      <div className="text-[11px] text-dmuted">{label}</div>
      <div className="text-lg font-semibold text-dtext tabular-nums leading-tight mt-0.5">{value}</div>
      {sub && <div className="text-[10px] text-dmuted mt-0.5">{sub}</div>}
    </div>
  )
}

export default function MemberProfileModal({
  member,
  maxStamps,
  cardTheme = 'honey',
  onClose,
}: {
  member: ProfileMember
  maxStamps: number
  cardTheme?: CardTheme
  onClose: () => void
}) {
  const [loading, setLoading] = useState(true)
  const [visits, setVisits] = useState<string[]>([])
  const [rewardCount, setRewardCount] = useState<number | null>(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    let alive = true

    ;(async () => {
      const visitsQuery = supabase
        .from('stamps')
        .select('created_at')
        .eq('member_id', member.id)
        .order('created_at', { ascending: false })
        .limit(500)

      // The rewards table arrives with migration 007. Until that has been run
      // this query errors, which must not blank out the rest of the profile —
      // the visit history is the part that matters and it comes from `stamps`.
      const rewardsQuery = supabase
        .from('rewards')
        .select('id', { count: 'exact', head: true })
        .eq('member_id', member.id)

      const [visitsRes, rewardsRes] = await Promise.all([visitsQuery, rewardsQuery])
      if (!alive) return

      if (visitsRes.error) setLoadError(true)
      setVisits((visitsRes.data ?? []).map((r: { created_at: string }) => r.created_at))
      setRewardCount(rewardsRes.error ? null : (rewardsRes.count ?? 0))
      setLoading(false)
    })()

    return () => { alive = false }
  }, [member.id])

  const stats: MemberStats = computeMemberStats(visits)
  const strip = computeVisitDays(visits, STRIP_DAYS)
  const rhythm = RHYTHM_COPY[stats.rhythm]
  const themeSpec = CARD_THEME_SPECS[cardTheme]

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/60 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${member.name} — პროფილი`}
    >
      <div
        className="bg-dbg2 border border-dline w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 pb-4 border-b border-dline sticky top-0 bg-dbg2">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-dtext truncate">{member.name}</h3>
            <p className="text-sm text-dmuted tabular-nums">{member.phone}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            autoFocus
            aria-label="დახურვა"
            className="shrink-0 text-dmuted hover:text-dtext transition text-xl leading-none px-2 py-1 rounded-lg hover:bg-dbg"
          >
            ✕
          </button>
        </div>

        <div className="p-5 flex flex-col gap-5">
          {/* Current card */}
          <div className="flex items-center gap-3">
            <StampGrid
              count={member.stamp_count}
              max={maxStamps}
              circleSize={13}
              gap={3}
              fillColor={themeSpec.stampFill}
              emptyColor={themeSpec.stampEmpty}
            />
            <span className="text-sm text-dmuted tabular-nums whitespace-nowrap">
              {member.stamp_count}/{maxStamps}
            </span>
          </div>

          {/* Rhythm */}
          <div className={`rounded-xl border px-3.5 py-3 ${rhythm.tone}`}>
            <div className="text-sm font-semibold">{rhythm.label}</div>
            <p className="text-[11px] text-dmuted mt-0.5 leading-snug">{rhythm.hint}</p>
          </div>

          {loading ? (
            <p className="text-sm text-dmuted text-center py-6">იტვირთება…</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2.5">
                <Stat label="სულ ვიზიტი" value={String(stats.totalVisits)} />
                <Stat
                  label="საშუალო ინტერვალი"
                  value={stats.avgIntervalDays === null ? '—' : formatDays(stats.avgIntervalDays)}
                  sub={stats.avgIntervalDays === null ? 'ორი ვიზიტიდან იწყება' : 'ვიზიტებს შორის'}
                />
                <Stat label="ბოლო ვიზიტი" value={formatDays(stats.daysSinceLastVisit)} sub={formatDate(stats.lastVisit)} />
                <Stat
                  label="ჯილდო"
                  value={rewardCount === null ? '—' : String(rewardCount)}
                  sub={rewardCount === null ? 'მიგრაცია 007 ჯერ არ გაშვებულა' : 'გაცემული'}
                />
              </div>

              <div>
                <h4 className="text-xs font-semibold text-dtext mb-2">ბოლო 12 კვირა</h4>
                <VisitStrip days={strip} />
              </div>

              {/* The history only starts from the day visit logging shipped, so an
                  empty strip on an old member is expected rather than a bug. */}
              {stats.totalVisits === 0 && !loadError && (
                <p className="text-[11px] text-dmuted leading-snug">
                  ვიზიტების ისტორია მხოლოდ ჩაწერის ჩართვის შემდეგ გროვდება — ამ წევრის
                  ადრინდელი ვიზიტები აქ არ გამოჩნდება.
                </p>
              )}

              {loadError && (
                <p className="text-[11px] text-dmuted">ისტორიის წაკითხვა ვერ მოხერხდა.</p>
              )}

              <div className="text-[11px] text-dmuted border-t border-dline pt-3">
                გაწევრიანდა {formatDate(member.created_at)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
