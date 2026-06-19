import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import QrScanner from './QrScanner'
import MembersTable from './MembersTable'
import DashboardDrawer from '@/components/DashboardDrawer'

export default async function DashboardPage() {
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

  const { data: members } = await supabase
    .from('members')
    .select('id, name, phone, stamp_count, created_at')
    .eq('business_id', business.id)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DashboardDrawer businessName={business.name} />
            <span className="text-lg font-bold text-[#185FA5]">MagicStamp</span>
          </div>
          <span className="text-sm text-gray-500 truncate max-w-[180px]">{business.name}</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* QR Scanner */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-5">სკანირება</h2>
          <QrScanner businessId={business.id} maxStamps={business.max_stamps} />
        </section>

        {/* Members table */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <MembersTable members={members ?? []} maxStamps={business.max_stamps} />
        </section>
      </main>

      <footer className="max-w-3xl mx-auto px-4 py-6 flex justify-center gap-4 text-xs text-gray-400 border-t border-gray-100">
        <Link href="/privacy" className="hover:text-[#185FA5] transition">კონფიდენციალურობა</Link>
        <span>·</span>
        <Link href="/terms" className="hover:text-[#185FA5] transition">პირობები</Link>
      </footer>
    </div>
  )
}
