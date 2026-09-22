import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { verifyPassAuth } from '@/lib/wallet-webservice-auth'
import { isWalletPushEnabled } from '@/lib/wallet-push-flag'
import { buildLoyaltyPass, PASS_TYPE_IDENTIFIER } from '@/lib/apple-pass-builder'
import { parseSerialNumber } from '@/lib/wallet-serial'
import { countRewardsEarned } from '@/lib/rewards-count'

export const runtime = 'nodejs'

type Params = {
  params: Promise<{ passTypeIdentifier: string; serialNumber: string }>
}

/**
 * GET /v1/passes/{passTypeIdentifier}/{serialNumber}
 * https://developer.apple.com/documentation/walletpasses/get-the-latest-version-of-a-pass
 *
 * Rebuilds the pass from the current members/businesses rows — same data
 * source app/api/wallet/apple/route.ts already uses, just fetched here
 * instead of arriving in the request body, since Apple's spec gives us
 * nothing but the serial number and an If-Modified-Since header.
 */
export async function GET(req: NextRequest, { params }: Params) {
  if (!isWalletPushEnabled()) return new NextResponse(null, { status: 404 })

  const { passTypeIdentifier, serialNumber } = await params
  if (passTypeIdentifier !== PASS_TYPE_IDENTIFIER) return new NextResponse(null, { status: 404 })
  if (!verifyPassAuth(req.headers.get('authorization'), serialNumber)) {
    return new NextResponse(null, { status: 401 })
  }

  const parsed = parseSerialNumber(serialNumber)
  if (!parsed) return new NextResponse(null, { status: 404 })

  const supabase = createSupabaseAdminClient()

  const { data: member } = await supabase
    .from('members')
    .select('id, name, stamp_count, last_visit')
    .eq('id', parsed.memberId)
    .eq('business_id', parsed.businessId)
    .maybeSingle()

  if (!member) return new NextResponse(null, { status: 404 })

  const { data: business } = await supabase
    .from('businesses')
    .select('name, max_stamps, brand_color, logo_url, card_theme, stamp_icon')
    .eq('id', parsed.businessId)
    .maybeSingle()

  if (!business) return new NextResponse(null, { status: 404 })

  const lastModified = member.last_visit ? new Date(member.last_visit) : new Date(0)
  const ifModifiedSince = req.headers.get('if-modified-since')
  if (ifModifiedSince) {
    const since = new Date(ifModifiedSince)
    if (!Number.isNaN(since.getTime()) && lastModified <= since) {
      return new NextResponse(null, { status: 304 })
    }
  }

  try {
    const rewardsEarned = await countRewardsEarned(supabase, member.id)
    const pass = await buildLoyaltyPass({
      memberId:     member.id,
      memberName:   member.name,
      stampCount:   member.stamp_count,
      maxStamps:    business.max_stamps,
      businessName: business.name,
      businessId:   parsed.businessId,
      brandColor:   business.brand_color,
      logoUrl:      business.logo_url,
      cardTheme:    business.card_theme,
      stampIcon:    business.stamp_icon,
      rewardsEarned,
    })
    const buffer = pass.getAsBuffer()

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type':   'application/vnd.apple.pkpass',
        'Last-Modified':  lastModified.toUTCString(),
        'Cache-Control':  'no-store',
      },
    })
  } catch (err) {
    console.error('WALLET_WEBSERVICE_GETPASS_ERROR:', err instanceof Error ? err.message : err)
    return new NextResponse(null, { status: 500 })
  }
}
