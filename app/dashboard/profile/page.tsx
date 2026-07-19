import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import BusinessQrCode from '@/app/dashboard/BusinessQrCode'

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
    <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-lg font-semibold text-dtext px-1">პროფილი</h1>

      {/* Business info */}
      <section className="bg-dbg2 rounded-2xl shadow-sm border border-dline p-6 space-y-4">
        <h2 className="text-base font-semibold text-dtext">ბიზნეს ინფო</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-3 border-b border-dline last:border-0">
            <span className="text-sm text-dmuted">სახელი</span>
            <span className="text-sm font-medium text-dtext">{business.name}</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-dline last:border-0">
            <span className="text-sm text-dmuted">ელ-ფოსტა</span>
            <span className="text-sm font-medium text-dtext">{user.email}</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-sm text-dmuted">სტემპების რაოდენობა</span>
            <span className="text-sm font-medium text-dlink">{business.max_stamps}</span>
          </div>
        </div>
      </section>

      {/* QR Code */}
      <section className="bg-dbg2 rounded-2xl shadow-sm border border-dline p-6">
        <h2 className="text-base font-semibold text-dtext mb-5">ჩემი QR კოდი</h2>
        <BusinessQrCode joinUrl={joinUrl} />
      </section>
    </main>
  )
}
