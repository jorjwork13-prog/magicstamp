import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

const ISSUER_ID = '3388000000023159453'
const CLASS_ID = `${ISSUER_ID}.magicstamp_loyalty`

export async function POST(req: NextRequest) {
  const { memberId, memberName, stampCount, maxStamps, businessName } = await req.json()

  const credentials = JSON.parse(process.env.GOOGLE_WALLET_CREDENTIALS!)

  const loyaltyObject = {
    id: `${CLASS_ID}.${memberId}`,
    classId: CLASS_ID,
    state: 'ACTIVE',
    accountId: memberId,
    accountName: memberName,
    loyaltyPoints: {
      label: 'სტემპი',
      balance: { int: stampCount },
    },
    textModulesData: [
      {
        header: businessName,
        body: `${stampCount}/${maxStamps} სტემპი`,
        id: 'stamp_progress',
      },
    ],
  }

  const payload = {
    iss: credentials.client_email,
    aud: 'google',
    origins: ['https://magicstamp.vercel.app'],
    typ: 'savetowallet',
    payload: { loyaltyObjects: [loyaltyObject] },
  }

  const token = jwt.sign(payload, credentials.private_key, { algorithm: 'RS256' })
  const saveUrl = `https://pay.google.com/gp/v/save/${token}`

  return NextResponse.json({ saveUrl })
}
