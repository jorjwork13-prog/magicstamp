import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'

/**
 * POST /api/stamps/scan — the whole of "a customer scanned their card".
 *
 * The scan used to be three separate writes from the browser (update members,
 * insert stamps, insert rewards), which could land independently and so were
 * guaranteed to drift apart eventually. They now happen inside one transaction
 * in public.record_scan() (migration 008).
 *
 * The new count and the reward decision are computed in the database from the
 * business's own max_stamps — the client sends only *who* was scanned, never
 * what the result should be.
 */
export async function POST(req: NextRequest) {
  let body: { memberId?: string; businessId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  const { memberId, businessId } = body
  if (!memberId || !businessId) {
    return NextResponse.json({ error: 'memberId and businessId are required' }, { status: 400 })
  }

  // Only the signed-in owner of this business may stamp its cards.
  const session = await createSupabaseServerClient()
  const { data: { user } } = await session.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: owned } = await session
    .from('businesses')
    .select('id')
    .eq('id', businessId)
    .eq('email', user.email)
    .maybeSingle()
  if (!owned) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.rpc('record_scan', {
    p_member_id: memberId,
    p_business_id: businessId,
  })

  if (error) {
    // The function raises no_data_found for an unknown member or business,
    // which is a 404 rather than a server fault.
    if (error.code === 'P0002' || /not found/i.test(error.message)) {
      return NextResponse.json({ error: 'not found' }, { status: 404 })
    }

    // Migration 008 not applied yet. Without this branch a deploy that lands
    // before the migration would take every till offline mid-service, which is
    // not a risk worth running on the one flow the customer stands and waits
    // for. Same writes, minus the transaction — delete once 008 is confirmed.
    if (error.code === 'PGRST202' || error.code === '42883') {
      console.warn('RECORD_SCAN_FALLBACK: migration 008 not applied')
      return await scanWithoutTransaction(supabase, memberId, businessId)
    }

    console.error('RECORD_SCAN_ERROR:', error.message)
    return NextResponse.json({ error: 'scan failed' }, { status: 500 })
  }

  const row = Array.isArray(data) ? data[0] : data
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 })

  return NextResponse.json({
    name: row.member_name as string,
    stampCount: row.stamp_count as number,
    rewarded: row.rewarded as boolean,
  })
}

/** Pre-008 bridge. Still server-side, so the client never decides the count. */
async function scanWithoutTransaction(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  memberId: string,
  businessId: string,
) {
  const { data: business } = await supabase
    .from('businesses')
    .select('max_stamps')
    .eq('id', businessId)
    .maybeSingle()

  const { data: member } = await supabase
    .from('members')
    .select('name, stamp_count')
    .eq('id', memberId)
    .eq('business_id', businessId)
    .maybeSingle()

  if (!business || !member) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const maxStamps = business.max_stamps as number
  const next = (member.stamp_count as number) + 1
  const rewarded = next >= maxStamps
  const stampCount = rewarded ? 0 : next

  const { error: updateError } = await supabase
    .from('members')
    .update({ stamp_count: stampCount, last_visit: new Date().toISOString() })
    .eq('id', memberId)
    .eq('business_id', businessId)

  if (updateError) {
    console.error('RECORD_SCAN_FALLBACK_ERROR:', updateError.message)
    return NextResponse.json({ error: 'scan failed' }, { status: 500 })
  }

  // History is best-effort here by design: a missing row is a gap in analytics,
  // while a failed stamp is a customer standing at the counter.
  const { error: stampError } = await supabase
    .from('stamps')
    .insert({ member_id: memberId, business_id: businessId })
  if (stampError) console.error('STAMP_LOG_ERROR:', stampError.message)

  if (rewarded) {
    const { error: rewardError } = await supabase
      .from('rewards')
      .insert({ member_id: memberId, business_id: businessId, stamps_required: maxStamps })
    if (rewardError) console.error('REWARD_LOG_ERROR:', rewardError.message)
  }

  return NextResponse.json({ name: member.name as string, stampCount, rewarded })
}
