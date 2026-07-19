'use server'

import { after }    from 'next/server'
import { redirect } from 'next/navigation'
import { google }   from 'googleapis'
import { createSupabaseServerClient } from '@/lib/supabase-server'

type SettingsState = { error?: string; success?: boolean } | undefined
type BrandingState = { error?: string; success?: boolean } | undefined

const VALID_MAX        = [3, 4, 5, 6, 8, 10, 12, 15, 20]
const ISSUER_ID        = '3388000000023159453'
const STAMP_IMAGE_BASE = 'https://magicstamp.vercel.app/api/stamp-image'

function validHex(color: string | null | undefined): string {
  if (color && /^#[0-9A-Fa-f]{6}$/.test(color)) return color
  return '#185FA5'
}

/**
 * Strip the legacy ?v=… cache-buster before handing a URL to Google.
 * New uploads get a unique file path per logo, so those URLs pass through
 * unchanged and Google's per-URL image cache is busted by the path itself.
 */
function cleanUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null
  return url.replace(/[?&]v=\d+/, '').replace(/[?&]$/, '')
}

function makeWalletAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_WALLET_CREDENTIALS!)
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/wallet_object.issuer'],
  })
  return { walletobjects: google.walletobjects({ version: 'v1', auth }) }
}

export async function updateSettingsAction(
  _state: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const maxStamps   = parseInt(formData.get('max_stamps')      as string, 10)
  const startingRaw = parseInt(formData.get('starting_stamps') as string, 10)

  if (!VALID_MAX.includes(maxStamps)) {
    return { error: 'არასწორი სტემპების რაოდენობა' }
  }

  const startingStamps = Math.min(
    Math.max(0, isNaN(startingRaw) ? 0 : startingRaw),
    maxStamps - 1,
    3,
  )

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('businesses')
    .update({ max_stamps: maxStamps, starting_stamps: startingStamps })
    .eq('email', user.email!)

  if (error) return { error: error.message }

  // After the response is sent, patch every member's wallet heroImage so the
  // new max is reflected immediately without waiting for the next stamp scan.
  after(async () => {
    try {
      const { data: business } = await supabase
        .from('businesses')
        .select('id, brand_color')
        .eq('email', user.email!)
        .single()

      if (!business) return

      const { data: members } = await supabase
        .from('members')
        .select('id, stamp_count')
        .eq('business_id', business.id)

      if (!members?.length) return

      const { walletobjects } = makeWalletAuth()
      const classId  = `${ISSUER_ID}.magicstamp_loyalty_${business.id}`
      const hexColor = validHex(business.brand_color)

      await Promise.allSettled(
        members.map((m) => {
          const stampImageUrl =
            `${STAMP_IMAGE_BASE}?bg=${encodeURIComponent(hexColor)}` +
            `&count=${m.stamp_count}&max=${maxStamps}`
          return walletobjects.loyaltyobject.patch({
            resourceId:  `${classId}.${m.id}`,
            requestBody: {
              heroImage: {
                sourceUri:          { uri: stampImageUrl },
                contentDescription: { defaultValue: { language: 'en-US', value: 'Stamp progress' } },
              },
            },
          })
        })
      )
    } catch (err) {
      console.error('WALLET_BACKFILL_ERROR:', err)
    }
  })

  return { success: true }
}

export async function updateBrandingAction(
  brandColor: string,
  logoUrl: string | null | undefined,
): Promise<BrandingState> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const updates: Record<string, string | null> = { brand_color: brandColor }
  if (logoUrl !== undefined) updates.logo_url = logoUrl

  const { error } = await supabase
    .from('businesses')
    .update(updates)
    .eq('email', user.email!)

  if (error) return { error: error.message }

  // After the response is sent, patch the wallet class logo and background.
  after(async () => {
    try {
      const { data: business } = await supabase
        .from('businesses')
        .select('id')
        .eq('email', user.email!)
        .single()

      if (!business) return

      const { walletobjects } = makeWalletAuth()
      const classId  = `${ISSUER_ID}.magicstamp_loyalty_${business.id}`
      const hexColor = validHex(brandColor)
      const logo     = cleanUrl(logoUrl)

      const patchBody: Record<string, unknown> = { hexBackgroundColor: hexColor }
      if (logo) {
        // Google rejects a programLogo change on an approved class unless the
        // patch also resubmits it for review.
        patchBody.reviewStatus = 'UNDER_REVIEW'
        patchBody.programLogo = {
          sourceUri:          { uri: logo },
          contentDescription: { defaultValue: { language: 'en-US', value: 'Business logo' } },
        }
      }

      await walletobjects.loyaltyclass.patch({
        resourceId:  classId,
        requestBody: patchBody,
      })
    } catch (err: any) {
      console.error('WALLET_BRANDING_PATCH_ERROR:', err?.response?.data ?? err)
    }
  })

  return { success: true }
}
