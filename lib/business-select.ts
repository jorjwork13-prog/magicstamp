import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Select business columns plus card_theme and stamp_icon, retrying without
 * them when the columns don't exist yet (migration 004 / 007 not applied).
 * This keeps join/dashboard pages working during the deploy window before
 * the SQL is run in Supabase; card_theme falls back to 'honey', stamp_icon
 * to 'hex'.
 */
export async function selectBusinessWithTheme(
  supabase: SupabaseClient,
  baseColumns: string,
  filterColumn: string,
  filterValue: string,
): Promise<{ data: any; error: any }> {
  const first = await supabase
    .from('businesses')
    .select(`${baseColumns}, card_theme, stamp_icon`)
    .eq(filterColumn, filterValue)
    .single()

  if (first.error?.code === '42703') {
    return supabase
      .from('businesses')
      .select(baseColumns)
      .eq(filterColumn, filterValue)
      .single()
  }
  return first
}
