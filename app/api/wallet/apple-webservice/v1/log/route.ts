import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

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
  try {
    const body = await req.json()
    console.log('WALLET_WEBSERVICE_DEVICE_LOG:', JSON.stringify(body?.logs ?? body))
  } catch {
    // Malformed body from a device isn't worth failing over.
  }
  return new NextResponse(null, { status: 200 })
}
