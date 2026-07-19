import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import QrScanner from './QrScanner'
import MembersTable from './MembersTable'
import DashboardDrawer from '@/components/DashboardDrawer'
import TaplyLogo from '@/components/TaplyLogo'

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, max_stamps, brand_color')
    .eq('email', user.email!)
    .single()

  if (!business) redirect('/login')

  const { data: members } = await supabase
    .from('members')
    .select('id, name, phone, stamp_count, created_at')
    .eq('business_id', business.id)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-cream">
      {/* Top bar */}
      <header className="bg-cream2 border-b border-line sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DashboardDrawer businessName={business.name} />
            <span className="flex items-center gap-2">
              <TaplyLogo size={22} />
              <span className="text-lg font-bold text-ink">Taply</span>
            </span>
          </div>
          <span className="text-sm text-muted truncate max-w-[180px]">{business.name}</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* QR Scanner */}
        <section className="bg-cream2 rounded-2xl shadow-sm border border-line p-6">
          <h2 className="text-base font-semibold text-ink mb-5">სკანირება</h2>
          <QrScanner businessId={business.id} maxStamps={business.max_stamps} brandColor={business.brand_color ?? null} />
        </section>

        {/* Members table */}
        <section className="bg-cream2 rounded-2xl shadow-sm border border-line p-6">
          <MembersTable members={members ?? []} maxStamps={business.max_stamps} />
        </section>
      </main>

      <footer className="max-w-3xl mx-auto px-4 py-6 flex justify-center gap-4 text-xs text-muted border-t border-line">
        <Link href="/privacy" className="hover:text-comb transition">კონფიდენციალურობა</Link>
        <span>·</span>
        <Link href="/terms" className="hover:text-comb transition">პირობები</Link>
      </footer>
    </div>
  )
}
