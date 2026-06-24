import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import jwt from 'jsonwebtoken'

const ISSUER_ID = '3388000000023159453'

/** Validates a hex color string. Returns it if valid, falls back to #185FA5. */
function validHex(color: string | null | undefined): string {
  if (color && /^#[0-9A-Fa-f]{6}$/.test(color)) return color
  return '#185FA5'
}

export async function POST(req: NextRequest) {
  const { memberId, memberName, stampCount, maxStamps, businessName, businessId, brandColor } =
    await req.json()

  const credentials = JSON.parse(process.env.GOOGLE_WALLET_CREDENTIALS!)
  const hexColor    = validHex(brandColor)
  const classId     = `${ISSUER_ID}.magicstamp_loyalty_${businessId}`

  // ── Upsert the per-business loyalty class ──────────────────────────────────
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/wallet_object.issuer'],
  })
  const walletobjects = google.walletobjects({ version: 'v1', auth })

  try {
    await walletobjects.loyaltyclass.insert({
      requestBody: {
        id:          classId,
        issuerName:  'MagicStamp',
        programName: businessName,
        reviewStatus: 'UNDER_REVIEW',
        hexBackgroundColor: hexColor,
        programLogo: {
          sourceUri: { uri: 'https://placehold.co/512x512.png' },
          contentDescription: {
            defaultValue: { language: 'en-US', value: `${businessName} logo` },
          },
        },
      },
    })
  } catch (err: any) {
    if (err?.response?.status === 409) {
      // Class already exists — patch color ONLY so no other fields are touched
      try {
        await walletobjects.loyaltyclass.patch({
          resourceId:  classId,
          requestBody: { hexBackgroundColor: hexColor },
        })
      } catch (patchErr: any) {
        console.error('WALLET_CLASS_PATCH_ERROR:', patchErr?.response?.data ?? patchErr.message)
      }
    } else {
      console.error('WALLET_CLASS_ERROR:', err?.response?.data ?? err.message)
    }
    // Always proceed — let Google surface any class problem to the user at save time
  }

  // ── Build the loyalty object JWT ───────────────────────────────────────────
  const loyaltyObject = {
    id:          `${classId}.${memberId}`,
    classId,
    state:       'ACTIVE',
    accountId:   memberId,
    accountName: memberName,
    barcode:     { type: 'QR_CODE', value: memberId, alternateText: memberId },
    loyaltyPoints: {
      label:   'სტემპი',
      balance: { int: stampCount },
    },
    textModulesData: [
      {
        header: businessName,
        body:   `${stampCount}/${maxStamps} სტემპი`,
        id:     'stamp_progress',
      },
    ],
  }

  const payload = {
    iss:     credentials.client_email,
    aud:     'google',
    origins: ['https://magicstamp.vercel.app'],
    typ:     'savetowallet',
    payload: { loyaltyObjects: [loyaltyObject] },
  }

  const token   = jwt.sign(payload, credentials.private_key, { algorithm: 'RS256' })
  const saveUrl = `https://pay.google.com/gp/v/save/${token}`

  return NextResponse.json({ saveUrl })
}
