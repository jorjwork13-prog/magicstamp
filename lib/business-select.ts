import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Select business columns plus card_theme, retrying without card_theme
 * when the column doesn't exist yet (migration 004 not applied). This
 * keeps join/dashboard pages working during the deploy window before
 * the SQL is run in Supabase; card_theme simply falls back to 'honey'.
 */
export async function selectBusinessWithTheme(
  supabase: SupabaseClient,
  baseColumns: string,
  filterColumn: string,
  filterValue: string,
): Promise<{ data: any; error: any }> {
  const first = await supabase
    .from('businesses')
    .select(`${baseColumns}, card_theme`)
    .eq(filterColumn, filterValue)
    .single()

  if (first.error && (first.error.code === '42703' || first.error.message?.includes('card_theme'))) {
    return supabase
      .from('businesses')
      .select(baseColumns)
      .eq(filterColumn, filterValue)
      .single()
  }
  return first
}
