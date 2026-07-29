import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import QrScanner from './QrScanner'
import MembersTable from './MembersTable'
import ReferralLeaderboard, { type ReferralLeader } from './ReferralLeaderboard'
import { isCardTheme } from '@/lib/card-themes'
import { selectBusinessWithTheme } from '@/lib/business-select'

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: business } = await selectBusinessWithTheme(
    supabase,
    'id, name, max_stamps, brand_color',
    'email',
    user.email!,
  )

  if (!business) redirect('/login')

  const { data: members } = await supabase
    .from('members')
    .select('id, name, phone, stamp_count, created_at')
    .eq('business_id', business.id)
    .order('created_at', { ascending: false })

  // Referral leaderboard. Counted here rather than in SQL because the member
  // names are already loaded above; the error is swallowed so the dashboard
  // still renders while migration 005 is unapplied.
  const { data: referrals } = await supabase
    .from('referrals')
    .select('referrer_member_id')
    .eq('business_id', business.id)

  const nameById = new Map((members ?? []).map((m) => [m.id, m.name]))
  const countById = new Map<string, number>()
  for (const row of referrals ?? []) {
    countById.set(row.referrer_member_id, (countById.get(row.referrer_member_id) ?? 0) + 1)
  }

  const leaders: ReferralLeader[] = [...countById.entries()]
    .map(([id, count]) => ({ id, name: nameById.get(id) ?? '—', count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return (
    <>
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* QR Scanner */}
        <section className="bg-dbg2 rounded-2xl shadow-sm border border-dline p-6">
          <h2 className="text-base font-semibold text-dtext mb-5">სკანირება</h2>
          <QrScanner businessId={business.id} maxStamps={business.max_stamps} brandColor={business.brand_color ?? null} />
        </section>

        {/* Members table */}
        <section className="bg-dbg2 rounded-2xl shadow-sm border border-dline p-6">
          <MembersTable
            members={members ?? []}
            maxStamps={business.max_stamps}
            cardTheme={isCardTheme(business.card_theme) ? business.card_theme : 'honey'}
          />
        </section>

        {/* Referral leaderboard */}
        <section className="bg-dbg2 rounded-2xl shadow-sm border border-dline p-6">
          <ReferralLeaderboard leaders={leaders} />
        </section>
      </main>

      <footer className="max-w-3xl mx-auto px-4 py-6 flex justify-center gap-4 text-xs text-dmuted border-t border-dline">
        <Link href="/privacy" className="hover:text-dlink transition">კონფიდენციალურობა</Link>
        <span>·</span>
        <Link href="/terms" className="hover:text-dlink transition">პირობები</Link>
      </footer>
    </>
  )
}
