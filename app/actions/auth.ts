'use server'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'

type AuthState = { error?: string } | undefined

export async function registerAction(
  _state: AuthState,
  formData: FormData
): Promise<AuthState> {
  const name = (formData.get('name') as string)?.trim()
  const email = (formData.get('email') as string)?.trim()
  const password = formData.get('password') as string

  if (!name || !email || !password) {
    return { error: 'ყველა ველი სავალდებულოა' }
  }

  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error) return { error: error.message }

  if (data.user) {
    const { error: dbError } = await supabase
      .from('businesses')
      .insert({ name, email })

    if (dbError) return { error: dbError.message }
  }

  redirect('/dashboard')
}

export async function loginAction(
  _state: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = (formData.get('email') as string)?.trim()
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'ყველა ველი სავალდებულოა' }
  }

  const supabase = await createSupabaseServerClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) return { error: error.message }

  redirect('/dashboard')
}
