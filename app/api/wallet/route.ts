import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import jwt from 'jsonwebtoken'

const ISSUER_ID         = '3388000000023159453'
const STAMP_IMAGE_BASE  = 'https://magicstamp.vercel.app/api/stamp-image'

function validHex(color: string | null | undefined): string {
  if (color && /^#[0-9A-Fa-f]{6}$/.test(color)) return color
  return '#185FA5'
}

/** Strip browser cache-buster (?v=…) before handing a URL to Google. */
function cleanUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null
  return url.replace(/[?&]v=\d+/, '').replace(/[?&]$/, '')
}

export async function POST(req: NextRequest) {
  const { memberId, memberName, stampCount, maxStamps, businessName, businessId, brandColor, logoUrl } =
    await req.json()

  const credentials = JSON.parse(process.env.GOOGLE_WALLET_CREDENTIALS!)
  const hexColor    = validHex(brandColor)
  const classId     = `${ISSUER_ID}.magicstamp_loyalty_${businessId}`
  const cleanLogo   = cleanUrl(logoUrl)

  // ── Upsert the per-business loyalty class ──────────────────────────────────
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/wallet_object.issuer'],
  })
  const walletobjects = google.walletobjects({ version: 'v1', auth })

  try {
    await walletobjects.loyaltyclass.insert({
      requestBody: {
        id:                 classId,
        issuerName:         'MagicStamp',
        programName:        businessName,
        reviewStatus:       'UNDER_REVIEW',
        hexBackgroundColor: hexColor,
        ...(cleanLogo ? {
          programLogo: {
            sourceUri:          { uri: cleanLogo },
            contentDescription: { defaultValue: { language: 'en-US', value: `${businessName} logo` } },
          },
        } : {}),
      },
    })
  } catch (err: any) {
    if (err?.response?.status === 409) {
      // Class already exists — patch only the fields we're changing.
      // programLogo is only patched when logoUrl is present so we never
      // overwrite a real logo with the placeholder on repeat joins.
      const patchBody: Record<string, unknown> = {
        hexBackgroundColor: hexColor,
      }
      if (cleanLogo) {
        patchBody.programLogo = {
          sourceUri:          { uri: cleanLogo },
          contentDescription: { defaultValue: { language: 'en-US', value: `${businessName} logo` } },
        }
      }
      try {
        await walletobjects.loyaltyclass.patch({
          resourceId:  classId,
          requestBody: patchBody,
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
  const stampImageUrl = `${STAMP_IMAGE_BASE}?bg=${encodeURIComponent(hexColor)}&count=${stampCount}&max=${maxStamps}`

  const loyaltyObject = {
    id:          `${classId}.${memberId}`,
    classId,
    state:       'ACTIVE',
    accountId:   memberId,
    accountName: memberName,
    barcode:     { type: 'QR_CODE', value: memberId, alternateText: memberId },
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
        header: businessName,
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
