import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { computeDailySignups, computeKpis, computeSegments, type AnalyticsMember } from '@/lib/analytics'
import SignupsChart from './SignupsChart'
import MemberSegmentList from './MemberSegmentList'
import {
  AnalyticsIcon,
  PeopleIcon,
  CycleIcon,
  GiftIcon,
  PulseIcon,
  StarIcon,
  SparkleIcon,
  AlertIcon,
} from '@/components/HexIcons'

export const dynamic = 'force-dynamic'

const LOW_DATA_THRESHOLD = 5

export default async function AnalyticsPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, max_stamps')
    .eq('email', user.email!)
    .single()

  if (!business) redirect('/login')

  const { data: membersData } = await supabase
    .from('members')
    .select('id, name, phone, stamp_count, created_at, last_visit')
    .eq('business_id', business.id)
    .order('created_at', { ascending: false })

  const members: AnalyticsMember[] = membersData ?? []

  if (members.length < LOW_DATA_THRESHOLD) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-6">
        <section className="bg-dbg2 rounded-2xl shadow-sm border border-dline p-10 flex flex-col items-center justify-center gap-4 text-center">
          <span className="text-honey"><AnalyticsIcon size={46} /></span>
          <h1 className="text-xl font-bold text-dtext">ანალიტიკა</h1>
          <p className="text-sm text-dmuted max-w-sm">
            ჯერ არ გაქვს საკმარისი მონაცემი — სტატისტიკა გამოჩნდება პირველი 5 წევრის შემდეგ.
          </p>
        </section>
      </main>
    )
  }

  const kpis = computeKpis(members, business.max_stamps)
  const dailySignups = computeDailySignups(members, 30)
  const segments = computeSegments(members, business.max_stamps)

  const kpiCards = [
    { label: 'სულ წევრები', value: String(kpis.totalMembers), Icon: PeopleIcon },
    {
      label: 'დაბრუნების %',
      value: kpis.returnRatePercent === null ? '—' : `${kpis.returnRatePercent}%`,
      Icon: CycleIcon,
    },
    { label: 'გაცემული ჯილდოები', value: String(kpis.rewardsIssued), Icon: GiftIcon },
    { label: 'აქტიური ამ კვირაში', value: String(kpis.activeThisWeek), Icon: PulseIcon },
  ]

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpiCards.map((card) => (
          <div
            key={card.label}
            className="bg-dbg2 rounded-2xl shadow-sm border border-dline p-4 flex flex-col gap-1"
          >
            <span className="text-honey"><card.Icon /></span>
            <span className="text-2xl font-bold text-dtext tabular-nums">{card.value}</span>
            <span className="text-xs text-dmuted leading-tight">{card.label}</span>
          </div>
        ))}
      </div>

      {/* Chart */}
      <section className="bg-dbg2 rounded-2xl shadow-sm border border-dline p-5">
        <h2 className="text-sm font-semibold text-dtext mb-4">ახალი წევრები — ბოლო 30 დღე</h2>
        <SignupsChart data={dailySignups} />
      </section>

      {/* Segments */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <MemberSegmentList
          title="მუდმივები"
          Icon={StarIcon}
          emptyLabel="ჯერ არავინაა ამ სეგმენტში"
          members={segments.loyal}
          total={segments.loyalTotal}
          maxStamps={business.max_stamps}
        />
        <MemberSegmentList
          title="ახლები"
          Icon={SparkleIcon}
          emptyLabel="ბოლო 7 დღეში ახალი წევრი არ ყოფილა"
          members={segments.fresh}
          total={segments.freshTotal}
          maxStamps={business.max_stamps}
        />
        <div className="sm:col-span-2">
          <MemberSegmentList
            title="საყურადღებო"
            Icon={AlertIcon}
            emptyLabel="ამჟამად არავინაა ყურადღების საჭირო"
            members={segments.atRisk}
            total={segments.atRiskTotal}
            maxStamps={business.max_stamps}
          />
        </div>
      </div>
    </main>
  )
}
