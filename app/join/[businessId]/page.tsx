import { notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import JoinForm from './JoinForm'

export default async function JoinPage({
  params,
}: {
  params: Promise<{ businessId: string }>
}) {
  const { businessId } = await params
  const supabase = await createSupabaseServerClient()

  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'MISSING'
  console.error('DEBUG_KEY:', key.slice(0, 12) + '...', '| len =', key.length)

  const { count } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true })
  console.error('DEBUG_COUNT:', count)

  const { data: business, error } = await supabase
    .from('businesses')
    .select('id, name, max_stamps')
    .eq('id', businessId)
    .single()

  if (error) console.error('JOIN_PAGE_ERROR:', error.message, error.code)

  if (!business) notFound()

  return (
    <JoinForm
      businessId={business.id}
      businessName={business.name}
      maxStamps={business.max_stamps}
    />
  )
}