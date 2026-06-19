'use server'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'

type SettingsState = { error?: string; success?: boolean } | undefined

const VALID_MAX = [3, 4, 5, 6, 8, 10, 12, 15, 20]

export async function updateSettingsAction(
  _state: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const maxStamps     = parseInt(formData.get('max_stamps')     as string, 10)
  const startingRaw   = parseInt(formData.get('starting_stamps') as string, 10)

  if (!VALID_MAX.includes(maxStamps)) {
    return { error: 'არასწორი სტემპების რაოდენობა' }
  }

  // starting_stamps must be 0–3 and strictly less than max_stamps
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

  return { success: true }
}
