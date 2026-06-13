import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

const ISSUER_ID = '3388000000023159453'
const CLASS_ID = `${ISSUER_ID}.magicstamp_loyalty`

export async function POST(req: NextRequest) {
  const { memberId, stampCount, maxStamps } = await req.json()

  const credentials = JSON.parse(process.env.GOOGLE_WALLET_CREDENTIALS!)

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/wallet_object.issuer'],
  })

  const walletobjects = google.walletobjects({ version: 'v1', auth })
  const objectId = `${CLASS_ID}.${memberId}`

  try {
    const heroUri = `https://magicstamp.vercel.app/api/stamp-image?count=${stampCount}&max=${maxStamps}`

    await walletobjects.loyaltyobject.patch({
      resourceId: objectId,
      requestBody: {
        loyaltyPoints: {
          label: 'სტემპი',
          balance: { int: stampCount },
        },
        textModulesData: [
          {
            header: 'სტემპები',
            body: `${stampCount}/${maxStamps} სტემპი`,
            id: 'stamp_progress',
          },
        ],
        heroImage: {
          sourceUri: { uri: heroUri },
          contentDescription: {
            defaultValue: { language: 'en-US', value: `${stampCount} of ${maxStamps} stamps` },
          },
        },
      },
    })
  } catch (err: any) {
    if (err?.response?.status !== 404) {
      console.error('WALLET_UPDATE_ERROR:', err?.response?.data ?? err.message)
    }
  }

  return NextResponse.json({ ok: true })
}
