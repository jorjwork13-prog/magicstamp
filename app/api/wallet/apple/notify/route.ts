import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { isWalletPushEnabled } from '@/lib/wallet-push-flag'
import { sendPassUpdatePush } from '@/lib/apns-push'
import { PASS_TYPE_IDENTIFIER } from '@/lib/apple-pass-builder'

export const runtime = 'nodejs'

/**
 * Called (fire-and-forget, same pattern as /api/wallet/update for Google)
 * from the scan flow after a stamp is saved. Everything here is behind
 * WALLET_APNS_PUSH_ENABLED — this whole route is the "separate function"
 * the task asked for so Phase 2 can be killed by flipping one env var
 * without touching QrScanner.tsx again.
 *
 * The device doesn't get the pass in this request — it gets told "go fetch
 * it" via a silent push, then calls back into
 * .../apple-webservice/v1/passes/{passTypeIdentifier}/{serialNumber}. That
 * round trip is Apple's design, not something we chose.
 */
export async function POST(req: NextRequest) {
  if (!isWalletPushEnabled()) return NextResponse.json({ ok: true, skipped: 'flag-off' })

  const { memberId, businessId } = await req.json()
  if (!memberId || !businessId) {
    return NextResponse.json({ error: 'memberId and businessId are required' }, { status: 400 })
  }

  // Only the signed-in owner of this business may trigger pushes for its
  // passes. Without this anyone could fire pushes at any member, and `sent`
  // would reveal whether that member has the pass on an iPhone.
  const session = await createSupabaseServerClient()
  const { data: { user } } = await session.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const serialNumber = `${businessId}.${memberId}`
  const supabase = createSupabaseAdminClient()

  // The ownership check and the token lookup don't depend on each other, and
  // every round trip here sits between the scan and the customer's card
  // changing — so they go out together. The tokens are still only *used* once
  // ownership has been confirmed below.
  const [{ data: owned }, { data: tokens, error }] = await Promise.all([
    session
      .from('businesses')
      .select('id')
      .eq('id', businessId)
      .eq('email', user.email)
      .maybeSingle(),
    supabase
      .from('wallet_push_tokens')
      .select('push_token')
      .eq('pass_type_identifier', PASS_TYPE_IDENTIFIER)
      .eq('serial_number', serialNumber),
  ])

  if (!owned) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  if (error) {
    console.error('WALLET_APNS_NOTIFY_LOOKUP_ERROR:', error.message)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
  if (!tokens?.length) return NextResponse.json({ ok: true, sent: 0 })

  const results = await Promise.all(tokens.map(t => sendPassUpdatePush(t.push_token)))
  const sent = results.filter(r => r.ok).length

  const failures = results.filter(r => !r.ok)
  if (failures.length) {
    console.error('WALLET_APNS_NOTIFY_PARTIAL_FAILURE:', JSON.stringify(failures))
  }

  return NextResponse.json({ ok: true, sent, failed: failures.length })
}
