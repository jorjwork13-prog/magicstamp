import { NextRequest, NextResponse } from 'next/server'
import { buildLoyaltyPass } from '@/lib/apple-pass-builder'

// node-forge, sharp and fs — this route cannot run on the edge runtime.
export const runtime = 'nodejs'

/**
 * Accept both a JSON body (parity with the Google Wallet route) and a
 * form-encoded one. The form path matters: letting Safari navigate to a real
 * POST is the most reliable way to hand a .pkpass to iOS Wallet — a blob
 * download built in JS is flaky in in-app browsers.
 */
type PassRequestBody = {
  memberId?: string
  memberName?: string
  stampCount?: number | string
  maxStamps?: number | string
  businessName?: string
  businessId?: string
  brandColor?: string | null
  logoUrl?: string | null
  cardTheme?: unknown
}

async function readBody(req: NextRequest): Promise<PassRequestBody> {
  if (req.headers.get('content-type')?.includes('application/json')) {
    return await req.json()
  }
  const form = await req.formData()
  return Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]))
}

/**
 * The pass itself is built in lib/apple-pass-builder.ts, shared with the
 * PassKit web service's "get latest pass" route so a pass downloaded here and
 * one re-fetched after a push update are identical — including the
 * webServiceURL that only ships while WALLET_APNS_PUSH_ENABLED is on.
 */
export async function POST(req: NextRequest) {
  const body = await readBody(req)
  const { memberId, memberName, businessName, businessId, brandColor, logoUrl, cardTheme } = body

  if (!memberId || !businessId) {
    return NextResponse.json({ error: 'memberId and businessId are required' }, { status: 400 })
  }

  try {
    const pass = await buildLoyaltyPass({
      memberId,
      memberName,
      stampCount: Number(body.stampCount) || 0,
      maxStamps:  Number(body.maxStamps) || 0,
      businessName,
      businessId,
      brandColor,
      logoUrl,
      cardTheme,
    })
    const buffer = pass.getAsBuffer()

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type':        'application/vnd.apple.pkpass',
        'Content-Disposition': `attachment; filename="taply-${memberId}.pkpass"`,
        'Cache-Control':       'no-store',
      },
    })
  } catch (err) {
    console.error('APPLE_PASS_ERROR:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'პასის შექმნა ვერ მოხერხდა' }, { status: 500 })
  }
}
