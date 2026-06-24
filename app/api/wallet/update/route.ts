import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

const ISSUER_ID      = '3388000000023159453'
const SHARED_CLASS_ID = `${ISSUER_ID}.magicstamp_loyalty`

export async function POST(req: NextRequest) {
  const { memberId, stampCount, maxStamps, businessId, brandColor } = await req.json()

  const credentials = JSON.parse(process.env.GOOGLE_WALLET_CREDENTIALS!)

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/wallet_object.issuer'],
  })
  const walletobjects = google.walletobjects({ version: 'v1', auth })

  // heroImage lives on the class now (static branded banner), not on the object.
  // Object patches only update the stamp count and progress text.
  const patchBody = {
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
