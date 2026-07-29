import { NextRequest, NextResponse } from 'next/server'
import { updateWalletPass } from '@/lib/wallet-update'

export async function POST(req: NextRequest) {
  const { memberId, stampCount, maxStamps, businessId, brandColor } = await req.json()

  await updateWalletPass({ memberId, stampCount, maxStamps, businessId, brandColor })

  return NextResponse.json({ ok: true })
}
