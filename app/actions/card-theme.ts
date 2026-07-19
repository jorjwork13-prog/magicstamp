'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { isCardTheme } from '@/lib/card-themes'

type State = { error?: string; success?: boolean } | undefined

/**
 * Saves ONLY card_theme. Deliberately a partial update — this project has
 * previously hit a bug where a color-only save wiped logo_url, so this
 * action must never include any other column in the update payload.
 */
export async function updateCardThemeAction(theme: string): Promise<State> {
  if (!isCardTheme(theme)) return { error: 'არასწორი თემა' }

  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'ავტორიზაცია საჭიროა' }

  const { error } = await supabase
    .from('businesses')
    .update({ card_theme: theme })
    .eq('email', user.email!)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/settings')
  return { success: true }
}
