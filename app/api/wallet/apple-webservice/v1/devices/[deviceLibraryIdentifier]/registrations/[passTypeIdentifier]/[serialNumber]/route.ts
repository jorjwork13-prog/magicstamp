import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { verifyPassAuth } from '@/lib/wallet-webservice-auth'
import { isWalletPushEnabled } from '@/lib/wallet-push-flag'
import { PASS_TYPE_IDENTIFIER } from '@/lib/apple-pass-builder'

// node-forge/pg client — same runtime constraint as the other wallet routes.
export const runtime = 'nodejs'

type Params = {
  params: Promise<{
    deviceLibraryIdentifier: string
    passTypeIdentifier: string
    serialNumber: string
  }>
}

/**
 * POST /v1/devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}/{serialNumber}
 * Apple's spec: https://developer.apple.com/documentation/walletpasses/register-a-pass-for-update-notifications
 * Body: { pushToken: string }. 201 = newly registered, 200 = already was.
 */
export async function POST(req: NextRequest, { params }: Params) {
  if (!isWalletPushEnabled()) {
    // Passes shouldn't carry a webServiceURL while the flag is off, so this
    // is a defensive no-op rather than the expected path.
    return new NextResponse(null, { status: 503 })
  }

  const { deviceLibraryIdentifier, passTypeIdentifier, serialNumber } = await params

  if (passTypeIdentifier !== PASS_TYPE_IDENTIFIER) {
    return new NextResponse(null, { status: 404 })
  }
  if (!verifyPassAuth(req.headers.get('authorization'), serialNumber)) {
    return new NextResponse(null, { status: 401 })
  }

  let pushToken: string | undefined
  try {
    const body = await req.json()
    pushToken = body?.pushToken
  } catch {
    return new NextResponse(null, { status: 400 })
  }
  if (!pushToken) return new NextResponse(null, { status: 400 })

  const supabase = createSupabaseAdminClient()

  const { data: existing } = await supabase
    .from('wallet_push_tokens')
    .select('id')
    .eq('device_library_identifier', deviceLibraryIdentifier)
    .eq('pass_type_identifier', passTypeIdentifier)
    .eq('serial_number', serialNumber)
    .maybeSingle()

  const { error } = await supabase
    .from('wallet_push_tokens')
    .upsert(
      {
        device_library_identifier: deviceLibraryIdentifier,
        pass_type_identifier:      passTypeIdentifier,
        serial_number:             serialNumber,
        push_token:                pushToken,
        updated_at:                new Date().toISOString(),
      },
      { onConflict: 'device_library_identifier,pass_type_identifier,serial_number' },
    )

  if (error) {
    console.error('WALLET_WEBSERVICE_REGISTER_ERROR:', error.message)
    return new NextResponse(null, { status: 500 })
  }

  return new NextResponse(null, { status: existing ? 200 : 201 })
}

/**
 * DELETE /v1/devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}/{serialNumber}
 * https://developer.apple.com/documentation/walletpasses/unregister-a-pass-for-update-notifications
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  if (!isWalletPushEnabled()) return new NextResponse(null, { status: 503 })

  const { deviceLibraryIdentifier, passTypeIdentifier, serialNumber } = await params

  if (passTypeIdentifier !== PASS_TYPE_IDENTIFIER) {
    return new NextResponse(null, { status: 404 })
  }
  if (!verifyPassAuth(req.headers.get('authorization'), serialNumber)) {
    return new NextResponse(null, { status: 401 })
  }

  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from('wallet_push_tokens')
    .delete()
    .eq('device_library_identifier', deviceLibraryIdentifier)
    .eq('pass_type_identifier', passTypeIdentifier)
    .eq('serial_number', serialNumber)

  if (error) {
    console.error('WALLET_WEBSERVICE_UNREGISTER_ERROR:', error.message)
    return new NextResponse(null, { status: 500 })
  }

  return new NextResponse(null, { status: 200 })
}
