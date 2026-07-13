import { notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import JoinForm from './JoinForm'

export default async function JoinPage({
  params,
}: {
  params: Promise<{ businessId: string }>
}) {
  const { businessId } = await params
  console.log('[JOIN] businessId received:', businessId)

  const supabase = await createSupabaseServerClient()

  const { data: business, error } = await supabase
    .from('businesses')
    .select('id, name, max_stamps, starting_stamps, logo_url, brand_color')
    .eq('id', businessId)
    .single()

  console.log('[JOIN] query result — data:', JSON.stringify(business), '| error:', JSON.stringify(error))

  if (error) {
    console.error('[JOIN] error detail — code:', error.code, 'message:', error.message, 'hint:', (error as any).hint, 'details:', (error as any).details)
    // PGRST116 = no rows found — treat as 404. Any other error is a server fault.
    if (error.code !== 'PGRST116') throw new Error(error.message)
  }

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