import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import DashboardDrawer from '@/components/DashboardDrawer'

export default async function AnalyticsPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('name')
    .eq('email', user.email!)
    .single()

  if (!business) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DashboardDrawer businessName={business.name} />
            <Link href="/dashboard" className="text-sm text-gray-400 hover:text-[#185FA5] transition">
              ← უკან
            </Link>
          </div>
          <span className="text-sm font-semibold text-gray-700">ანალიტიკა</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 flex flex-col items-center justify-center gap-4 text-center">
          <span className="text-4xl">📊</span>
          <h1 className="text-xl font-bold text-gray-800">ანალიტიკა</h1>
          <p className="text-sm text-gray-400">მალე დაემატება</p>
        </section>
      </main>
    </div>
  )
}
