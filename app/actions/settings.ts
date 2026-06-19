'use server'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'

type SettingsState = { error?: string; success?: boolean } | undefined

const VALID_OPTIONS = [3, 4, 5, 6, 8, 10, 12, 15, 20]

export async function updateMaxStampsAction(
  _state: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const maxStamps = parseInt(formData.get('max_stamps') as string, 10)

  if (!VALID_OPTIONS.includes(maxStamps)) {
    return { error: 'არასწორი მნიშვნელობა' }
  }

  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { error } = await supabase
    .from('businesses')
    .update({ max_stamps: maxStamps })
    .eq('email', user.email!)

  if (error) return { error: error.message }

  return { success: true }
}
