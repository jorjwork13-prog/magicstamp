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

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, max_stamps')
    .eq('id', businessId)
    .single()

  if (!business) notFound()

  return (
    <JoinForm
      businessId={business.id}
      businessName={business.name}
      maxStamps={business.max_stamps}
    />
  )
}
