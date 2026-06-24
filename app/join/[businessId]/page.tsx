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

  const { data: business, error } = await supabase
    .from('businesses')
    .select('id, name, max_stamps, starting_stamps, logo_url, brand_color')
    .eq('id', businessId)
    .single()

  if (error) console.error('JOIN_PAGE_ERROR:', error.message, error.code)

  if (!business) notFound()

  return (
    <JoinForm
      businessId={business.id}
      businessName={business.name}
      maxStamps={business.max_stamps}
      startingStamps={business.starting_stamps ?? 0}
      logoUrl={business.logo_url ?? null}
      brandColor={business.brand_color ?? null}
    />
  )
}