'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase-server'

type BillingDetailsState = { error?: string; success?: boolean } | undefined

/** Legal requisites printed on the business's invoices. These three columns
 *  are the only billing data a business may write; subscriptions and
 *  invoices stay read-only. */
export async function updateBillingDetailsAction(
  _state: BillingDetailsState,
  formData: FormData,
): Promise<BillingDetailsState> {
  const clean = (key: string) => {
    const v = String(formData.get(key) ?? '').trim()
    return v === '' ? null : v
  }

  const legalName = clean('legal_name')
  const taxId = clean('tax_id')
  const legalAddress = clean('legal_address')

  if (taxId !== null && !/^(\d{9}|\d{11})$/.test(taxId)) {
    return { error: 'ს/კ უნდა შედგებოდეს მხოლოდ ციფრებისგან — 9 ან 11 სიმბოლო.' }
  }
  if ((legalName?.length ?? 0) > 200 || (legalAddress?.length ?? 0) > 300) {
    return { error: 'ტექსტი ძალიან გრძელია.' }
  }

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('businesses')
    .update({ legal_name: legalName, tax_id: taxId, legal_address: legalAddress })
    .eq('email', user.email!)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/billing')
  return { success: true }
}
