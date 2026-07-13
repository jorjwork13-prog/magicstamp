import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

const ISSUER_ID        = '3388000000023159453'
const SHARED_CLASS_ID  = `${ISSUER_ID}.magicstamp_loyalty`
const STAMP_IMAGE_BASE = 'https://magicstamp.vercel.app/api/stamp-image'

function validHex(color: string | null | undefined): string {
  if (color && /^#[0-9A-Fa-f]{6}$/.test(color)) return color
  return '#185FA5'
}

export async function POST(req: NextRequest) {
  const { memberId, stampCount, maxStamps, businessId, brandColor } = await req.json()

  const credentials = JSON.parse(process.env.GOOGLE_WALLET_CREDENTIALS!)

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/wallet_object.issuer'],
  })
  const walletobjects = google.walletobjects({ version: 'v1', auth })

  const hexColor      = validHex(brandColor)
  const stampImageUrl = `${STAMP_IMAGE_BASE}?bg=${encodeURIComponent(hexColor)}&count=${stampCount}&max=${maxStamps}`

  const patchBody = {
    heroImage: {
      sourceUri:          { uri: stampImageUrl },
      contentDescription: { defaultValue: { language: 'en-US', value: 'Stamp progress' } },
    },
    loyaltyPoints: {
      label:   'სტემპი',
      balance: { int: stampCount },
    },
    textModulesData: [
      {
        header: 'სტემპები',
        body:   `${stampCount}/${maxStamps} სტემპი`,
        id:     'stamp_progress',
      },
      {
        header: 'ჯილდო',
        body:   `უფასო ყავა ${maxStamps} სტემპის შემდეგ`,
        id:     'reward',
      },
    ],
  }

  // Per-business object is the primary target; shared class is the fallback for
  // customers who added their pass before per-business classes were introduced.
  const perClassId    = businessId ? `${ISSUER_ID}.magicstamp_loyalty_${businessId}` : null
  const primaryId     = perClassId ? `${perClassId}.${memberId}` : `${SHARED_CLASS_ID}.${memberId}`
  const sharedObjId   = `${SHARED_CLASS_ID}.${memberId}`

  try {
    await walletobjects.loyaltyobject.patch({ resourceId: primaryId, requestBody: patchBody })
  } catch (err: any) {
    if (err?.response?.status === 404 && perClassId) {
      // 404 on per-business object → customer added the pass under the old shared class
      try {
        await walletobjects.loyaltyobject.patch({ resourceId: sharedObjId, requestBody: patchBody })
      } catch (fallback: any) {
        if (fallback?.response?.status !== 404) {
          // 404 here just means the member never added a pass at all — silently swallow
          console.error('WALLET_UPDATE_ERROR (shared fallback):', fallback?.response?.data ?? fallback.message)
        }
      }
    } else if (err?.response?.status !== 404) {
      console.error('WALLET_UPDATE_ERROR:', err?.response?.data ?? err.message)
    }
  }

  return NextResponse.json({ ok: true })
}
