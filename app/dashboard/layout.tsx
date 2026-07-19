import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import DashboardHeader from '@/components/DashboardHeader'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
    <div className="dash min-h-screen bg-dbg text-dtext flex-1 flex flex-col">
      <DashboardHeader businessName={business.name} />
      <div className="flex-1">{children}</div>
    </div>
  )
}
