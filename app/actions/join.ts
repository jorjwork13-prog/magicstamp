'use server'

import { createClient } from '@supabase/supabase-js'

type JoinState = {
  error?: string
  success?: boolean
  memberId?: string
  memberName?: string
  startingStamps?: number
} | undefined

export async function joinAction(
  _state: JoinState,
  formData: FormData
): Promise<JoinState> {
  const businessId = formData.get('businessId') as string
  const name  = (formData.get('name')  as string)?.trim()
  const phone = (formData.get('phone') as string)?.trim()

  if (!name || !phone) {
    return { error: 'ყველა ველი სავალდებულოა' }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Fetch business to determine the pre-filled stamp count for new members
  const { data: business } = await supabase
    .from('businesses')
    .select('max_stamps, starting_stamps')
    .eq('id', businessId)
    .single()

  const maxStamps = business?.max_stamps ?? 10
  // Clamp: starting_stamps must be strictly less than max_stamps
  const startingStamps = Math.min(business?.starting_stamps ?? 0, maxStamps - 1)

  const { data, error } = await supabase
    .from('members')
    .insert({ business_id: businessId, name, phone, stamp_count: startingStamps })
    .select('id')
    .single()

  if (error || !data) {
    console.error('JOIN_ACTION_ERROR:', error)
    return { error: 'დარეგისტრირება ვერ მოხერხდა' }
  }

  return { success: true, memberId: data.id, memberName: name, startingStamps }
}
