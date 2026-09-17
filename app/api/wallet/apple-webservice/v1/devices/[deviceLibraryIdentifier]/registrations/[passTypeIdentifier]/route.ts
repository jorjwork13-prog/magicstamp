import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { isWalletPushEnabled } from '@/lib/wallet-push-flag'
import { PASS_TYPE_IDENTIFIER } from '@/lib/apple-pass-builder'
import { parseSerialNumber } from '@/lib/wallet-serial'

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
 * "Updated" is read off members.last_visit, which QrScanner.tsx already
 * bumps on every stamp (see supabase/migrations/006_wallet_push_tokens.sql)
 * — no separate version/tag column was added for this.
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
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('id, last_visit')
      .eq('business_id', businessId)
      .in('id', memberIds)

    if (membersError) {
      console.error('WALLET_WEBSERVICE_LIST_MEMBERS_ERROR:', membersError.message)
      continue
    }

    for (const member of members ?? []) {
      if (!member.last_visit) continue
      if (passesUpdatedSince && member.last_visit <= passesUpdatedSince) continue

      updatedSerials.push(`${businessId}.${member.id}`)
      if (member.last_visit > lastUpdated) lastUpdated = member.last_visit
    }
  }

  if (!updatedSerials.length) return new NextResponse(null, { status: 204 })

  return NextResponse.json({ lastUpdated, serialNumbers: updatedSerials })
}
