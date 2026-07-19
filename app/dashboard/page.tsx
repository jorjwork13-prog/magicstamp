import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import QrScanner from './QrScanner'
import MembersTable from './MembersTable'

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
    <>
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* QR Scanner */}
        <section className="bg-dbg2 rounded-2xl shadow-sm border border-dline p-6">
          <h2 className="text-base font-semibold text-dtext mb-5">სკანირება</h2>
          <QrScanner businessId={business.id} maxStamps={business.max_stamps} brandColor={business.brand_color ?? null} />
        </section>

        {/* Members table */}
        <section className="bg-dbg2 rounded-2xl shadow-sm border border-dline p-6">
          <MembersTable members={members ?? []} maxStamps={business.max_stamps} />
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
