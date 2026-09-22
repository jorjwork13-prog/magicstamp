'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { isStampIcon } from '@/lib/stamp-icons'

type State = { error?: string; success?: boolean } | undefined

/**
 * Saves ONLY stamp_icon — same partial-update discipline as
 * updateCardThemeAction, so this can never clobber logo_url or brand_color.
 */
export async function updateStampIconAction(icon: string): Promise<State> {
  if (!isStampIcon(icon)) return { error: 'არასწორი ხატულა' }

  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'ავტორიზაცია საჭიროა' }

  const { error } = await supabase
    .from('businesses')
    .update({ stamp_icon: icon })
    .eq('email', user.email!)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/settings')
  return { success: true }
}
