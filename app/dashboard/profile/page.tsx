import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import BusinessQrCode from '@/app/dashboard/BusinessQrCode'
import DashboardDrawer from '@/components/DashboardDrawer'

export default async function ProfilePage() {
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

  const headersList = await headers()
  const host = headersList.get('host') ?? 'localhost:3000'
  const proto = headersList.get('x-forwarded-proto') ?? 'http'
  const joinUrl = `${proto}://${host}/join/${business.id}`

  return (
    <div className="min-h-screen bg-cream">
      {/* Top bar */}
      <header className="bg-cream2 border-b border-line sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DashboardDrawer businessName={business.name} />
            <Link href="/dashboard" className="text-sm text-muted hover:text-comb transition">
              ← უკან
            </Link>
          </div>
          <span className="text-sm font-semibold text-gray-700">პროფილი</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Business info */}
        <section className="bg-cream2 rounded-2xl shadow-sm border border-line p-6 space-y-4">
          <h2 className="text-base font-semibold text-ink">ბიზნეს ინფო</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
              <span className="text-sm text-gray-400">სახელი</span>
              <span className="text-sm font-medium text-gray-800">{business.name}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
              <span className="text-sm text-gray-400">ელ-ფოსტა</span>
              <span className="text-sm font-medium text-gray-800">{user.email}</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-gray-400">სტემპების რაოდენობა</span>
              <span className="text-sm font-medium text-comb">{business.max_stamps}</span>
            </div>
          </div>
        </section>

        {/* QR Code */}
        <section className="bg-cream2 rounded-2xl shadow-sm border border-line p-6">
          <h2 className="text-base font-semibold text-ink mb-5">ჩემი QR კოდი</h2>
          <BusinessQrCode joinUrl={joinUrl} />
        </section>
      </main>
    </div>
  )
}
