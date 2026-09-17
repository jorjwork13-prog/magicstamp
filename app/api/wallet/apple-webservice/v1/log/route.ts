import { NextRequest, NextResponse } from 'next/server'
import { isWalletPushEnabled } from '@/lib/wallet-push-flag'

export const runtime = 'nodejs'

/** A device's log batch is a few short lines; cap what an anonymous caller can write to our logs. */
const MAX_LOG_CHARS = 4_000

/**
 * POST /v1/log
 * https://developer.apple.com/documentation/walletpasses/log-a-message
 * No auth, no per-pass identity — devices use this to report their own
 * PassKit errors. Body: { logs: string[] }. We just want it in Vercel's
 * function logs so a real device's complaint (bad cert chain, wrong content
 * type, etc.) is visible during Phase 2 testing; nothing here is parsed or
 * stored yet.
 */
export async function POST(req: NextRequest) {
  // Same gate as the other webservice routes: no passes point here while off.
  if (!isWalletPushEnabled()) return new NextResponse(null, { status: 200 })

  try {
    const body = await req.json()
    console.log('WALLET_WEBSERVICE_DEVICE_LOG:', JSON.stringify(body?.logs ?? body).slice(0, MAX_LOG_CHARS))
  } catch {
    // Malformed body from a device isn't worth failing over.
  }
  return new NextResponse(null, { status: 200 })
}
