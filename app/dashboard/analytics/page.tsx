import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'

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
    <main className="max-w-3xl mx-auto px-4 py-6">
      <section className="bg-dbg2 rounded-2xl shadow-sm border border-dline p-10 flex flex-col items-center justify-center gap-4 text-center">
        <span className="text-4xl">📊</span>
        <h1 className="text-xl font-bold text-dtext">ანალიტიკა</h1>
        <p className="text-sm text-dmuted">მალე დაემატება</p>
      </section>
    </main>
  )
}
