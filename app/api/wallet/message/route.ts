import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { isWalletPushEnabled } from '@/lib/wallet-push-flag'
import { sendPassUpdatePush } from '@/lib/apns-push'
import { PASS_TYPE_IDENTIFIER } from '@/lib/apple-pass-builder'

export const runtime = 'nodejs'

const MAX_LENGTH = 120

/**
 * POST /api/wallet/message — put a one-off note on ONE member's Apple pass.
 *
 * Wallet has no messaging API: the text goes into the pass's `notice` back
 * field (lib/apple-pass-builder.ts), wallet_message_at marks the member as
 * changed for the PassKit web service (lib/wallet-change-time.ts), and a push
 * tells the device to re-fetch. iOS raises the banner from that field's
 * changeMessage. last_visit is deliberately left alone — it is a real visit
 * and the analytics count it as one.
 */
export async function POST(req: NextRequest) {
  let body: { memberId?: string; businessId?: string; text?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  const { memberId, businessId } = body
  if (!memberId || !businessId) {
    return NextResponse.json({ error: 'memberId and businessId are required' }, { status: 400 })
  }

  const text = typeof body.text === 'string' ? body.text.trim() : ''
  if (!text) return NextResponse.json({ error: 'შეტყობინება ცარიელია' }, { status: 400 })
  if (text.length > MAX_LENGTH) {
    return NextResponse.json({ error: `მაქსიმუმ ${MAX_LENGTH} სიმბოლო` }, { status: 400 })
  }

  // Only the signed-in owner of this business may message its members. This
  // check, plus the business_id filter on the update below, is the entire
  // security of this endpoint.
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

  // Filtering on business_id is what proves the member belongs to this
  // business: a member of someone else's business matches no row.
  const { data: updated, error: updateError } = await supabase
    .from('members')
    .update({ wallet_message: text, wallet_message_at: new Date().toISOString() })
    .eq('id', memberId)
    .eq('business_id', businessId)
    .select('id')

  if (updateError) {
    console.error('WALLET_MESSAGE_UPDATE_ERROR:', updateError.message)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }
  if (!updated?.length) return NextResponse.json({ error: 'not found' }, { status: 404 })

  // Same as /api/wallet/apple/notify: with pushes off the message is saved
  // and shows up on the next pass fetch, but no device is told.
  if (!isWalletPushEnabled()) return NextResponse.json({ ok: true, pushed: 0 })

  const { data: tokens, error } = await supabase
    .from('wallet_push_tokens')
    .select('push_token')
    .eq('pass_type_identifier', PASS_TYPE_IDENTIFIER)
    .eq('serial_number', `${businessId}.${memberId}`)

  if (error) {
    console.error('WALLET_MESSAGE_LOOKUP_ERROR:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!tokens?.length) return NextResponse.json({ ok: true, pushed: 0 })

  const results = await Promise.all(tokens.map(t => sendPassUpdatePush(t.push_token)))
  const pushed = results.filter(r => r.ok).length

  const failures = results.filter(r => !r.ok)
  if (failures.length) {
    console.error('WALLET_MESSAGE_PARTIAL_FAILURE:', JSON.stringify(failures))
  }

  return NextResponse.json({ ok: true, pushed })
}
