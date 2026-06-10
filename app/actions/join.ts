'use server'

import { createSupabaseServerClient } from '@/lib/supabase-server'

type JoinState = { error?: string; success?: boolean; memberId?: string } | undefined

export async function joinAction(
  _state: JoinState,
  formData: FormData
): Promise<JoinState> {
  const businessId = formData.get('businessId') as string
  const name = (formData.get('name') as string)?.trim()
  const phone = (formData.get('phone') as string)?.trim()

  if (!name || !phone) {
    return { error: 'ყველა ველი სავალდებულოა' }
  }

  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('members')
    .insert({ business_id: businessId, name, phone, stamp_count: 0 })
    .select('id')
    .single()

  if (error || !data) {
    return { error: 'დარეგისტრირება ვერ მოხერხდა' }
  }

  return { success: true, memberId: data.id }
}
