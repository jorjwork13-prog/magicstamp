'use server'

import { createClient } from '@supabase/supabase-js'
import { updateWalletPass } from '@/lib/wallet-update'

type JoinState = {
  error?: string
  /** Shown under the referral-code field only; the rest of the form survives. */
  referralError?: string
  /** Echoed back so a rejected code doesn't cost the customer their typing. */
  values?: { name: string; phone: string; referralCode: string }
  success?: boolean
  memberId?: string
  memberName?: string
  startingStamps?: number
  referralCode?: string
} | undefined

const REFERRAL_NOT_FOUND =
  'კოდი ვერ მოიძებნა — შეამოწმე და სცადე თავიდან, ან გააგრძელე კოდის გარეშე'

/** PostgREST codes meaning "this migration hasn't been applied yet". */
const MISSING_COLUMN   = '42703'
const MISSING_FUNCTION = 'PGRST202'

export async function joinAction(
  _state: JoinState,
  formData: FormData
): Promise<JoinState> {
  const businessId   = formData.get('businessId') as string
  const name         = (formData.get('name')  as string)?.trim()
  const phone        = (formData.get('phone') as string)?.trim()
  const referralCode = ((formData.get('referralCode') as string) ?? '').trim().toUpperCase()

  const values = { name: name ?? '', phone: phone ?? '', referralCode }

  if (!name || !phone) {
    return { error: 'ყველა ველი სავალდებულოა', values }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Fetch business to determine the pre-filled stamp count for new members
  const { data: business } = await supabase
    .from('businesses')
    .select('max_stamps, starting_stamps, brand_color')
    .eq('id', businessId)
    .single()

  const maxStamps = business?.max_stamps ?? 10
  // Clamp: starting_stamps must be strictly less than max_stamps
  const startingStamps = Math.min(business?.starting_stamps ?? 0, maxStamps - 1)

  // ── Referral code ────────────────────────────────────────────────────────
  // Resolved before the member row is written so a typo can be corrected in
  // the form instead of stranding a half-referred member in the table.
  let referrerId: string | null = null

  if (referralCode) {
    const { data: referrer, error } = await supabase.rpc('lookup_referral_code', {
      p_business_id: businessId,
      p_code:        referralCode,
    })

    if (error && error.code !== MISSING_FUNCTION) {
      console.error('REFERRAL_LOOKUP_ERROR:', error)
    }

    if (!error && !referrer) {
      return { referralError: REFERRAL_NOT_FOUND, values }
    }

    // MISSING_FUNCTION → migration 005 isn't applied yet; join without a
    // referral rather than blocking signups during the deploy window.
    referrerId = (referrer as string | null) ?? null
  }

  // ── Create the member ────────────────────────────────────────────────────
  // Built as one annotated object rather than a ternary: postgrest-js infers
  // the insert shape from the argument, and a union of two shapes makes it
  // pick the narrower branch and reject the other one's keys.
  const row: {
    business_id: string
    name: string
    phone: string
    stamp_count: number
    referred_by_member_id?: string
  } = { business_id: businessId, name, phone, stamp_count: startingStamps }

  if (referrerId) row.referred_by_member_id = referrerId

  let { data, error } = await supabase
    .from('members')
    .insert(row)
    .select('id, referral_code')
    .single()

  // Same deploy-window guard as lib/business-select.ts: the RETURNING clause
  // fails to plan when the column is absent, so nothing was inserted yet.
  // referrerId is necessarily null here — the lookup RPC ships in the same
  // migration as the column — so `row` carries no referral fields either.
  if (error && (error.code === MISSING_COLUMN || error.message?.includes('referral_code'))) {
    const retry = await supabase.from('members').insert(row).select('id').single()
    data  = retry.data as typeof data
    error = retry.error
  }

  if (error || !data) {
    console.error('JOIN_ACTION_ERROR:', error)
    return { error: 'დარეგისტრირება ვერ მოხერხდა', values }
  }

  // ── Record the referral and pay out the referrer if they hit the threshold ─
  if (referrerId) {
    const { data: result, error: referralError } = await supabase.rpc('register_referral', {
      p_referrer_member_id: referrerId,
      p_referred_member_id: data.id,
      p_business_id:        businessId,
    })

    if (referralError) {
      // The member is already joined — a failed referral must not undo that.
      console.error('REGISTER_REFERRAL_ERROR:', referralError)
    } else if (result?.rewarded) {
      // Same wallet patch the scan flow triggers via /api/wallet/update, so
      // the referrer's card refreshes with the bonus stamps.
      try {
        await updateWalletPass({
          memberId:   referrerId,
          stampCount: result.stamp_count,
          maxStamps,
          businessId,
          brandColor: business?.brand_color ?? null,
        })
      } catch (err) {
        console.error('REFERRAL_WALLET_UPDATE_ERROR:', err)
      }
    }
  }

  return {
    success:      true,
    memberId:     data.id,
    memberName:   name,
    startingStamps,
    referralCode: data.referral_code ?? undefined,
  }
}
