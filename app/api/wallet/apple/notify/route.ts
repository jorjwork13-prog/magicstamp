import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
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

  const serialNumber = `${businessId}.${memberId}`
  const supabase = createSupabaseAdminClient()

  const { data: tokens, error } = await supabase
    .from('wallet_push_tokens')
    .select('push_token')
    .eq('pass_type_identifier', PASS_TYPE_IDENTIFIER)
    .eq('serial_number', serialNumber)

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
