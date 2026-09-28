import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { isWalletPushEnabled } from '@/lib/wallet-push-flag'
import { PASS_TYPE_IDENTIFIER } from '@/lib/apple-pass-builder'
import { parseSerialNumber } from '@/lib/wallet-serial'
import { walletChangeTime } from '@/lib/wallet-change-time'

export const runtime = 'nodejs'

type Params = {
  params: Promise<{
    deviceLibraryIdentifier: string
    passTypeIdentifier: string
  }>
}

/**
 * GET /v1/devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}?passesUpdatedSince={tag}
 * https://developer.apple.com/documentation/walletpasses/get-the-list-of-updatable-passes
 *
 * No Authorization header on this one per Apple's spec — the device is
 * asking "which of *my own* registered passes changed", scoped by
 * deviceLibraryIdentifier alone.
 *
 * "Updated" is the later of members.last_visit (bumped on every stamp) and
 * members.wallet_message_at (bumped when a message is sent, migration 011) —
 * see lib/wallet-change-time.ts. A message never touches last_visit, which
 * the analytics read as a real visit.
 */
export async function GET(req: NextRequest, { params }: Params) {
  if (!isWalletPushEnabled()) return new NextResponse(null, { status: 204 })

  const { deviceLibraryIdentifier, passTypeIdentifier } = await params
  if (passTypeIdentifier !== PASS_TYPE_IDENTIFIER) return new NextResponse(null, { status: 404 })

  const passesUpdatedSince = req.nextUrl.searchParams.get('passesUpdatedSince')

  const supabase = createSupabaseAdminClient()

  const { data: registrations, error } = await supabase
    .from('wallet_push_tokens')
    .select('serial_number')
    .eq('device_library_identifier', deviceLibraryIdentifier)
    .eq('pass_type_identifier', passTypeIdentifier)

  if (error) {
    console.error('WALLET_WEBSERVICE_LIST_ERROR:', error.message)
    return new NextResponse(null, { status: 500 })
  }
  if (!registrations?.length) return new NextResponse(null, { status: 204 })

  // Group by business so each lookup is one `in (...)` query instead of N.
  const byBusiness = new Map<string, string[]>()
  for (const { serial_number } of registrations) {
    const parsed = parseSerialNumber(serial_number)
    if (!parsed) continue
    const list = byBusiness.get(parsed.businessId) ?? []
    list.push(parsed.memberId)
    byBusiness.set(parsed.businessId, list)
  }

  const updatedSerials: string[] = []
  let lastUpdated = passesUpdatedSince ?? new Date(0).toISOString()

  for (const [businessId, memberIds] of byBusiness) {
    // `*` rather than naming wallet_message_at: until migration 011 is run
    // that column doesn't exist, and naming it would fail this query and
    // silently stop every pass from updating.
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('*')
      .eq('business_id', businessId)
      .in('id', memberIds)

    if (membersError) {
      console.error('WALLET_WEBSERVICE_LIST_MEMBERS_ERROR:', membersError.message)
      continue
    }

    for (const member of members ?? []) {
      const changedAt = walletChangeTime(member)
      if (!changedAt) continue
      if (passesUpdatedSince && changedAt <= passesUpdatedSince) continue

      updatedSerials.push(`${businessId}.${member.id}`)
      if (changedAt > lastUpdated) lastUpdated = changedAt
    }
  }

  if (!updatedSerials.length) return new NextResponse(null, { status: 204 })

  return NextResponse.json({ lastUpdated, serialNumbers: updatedSerials })
}
