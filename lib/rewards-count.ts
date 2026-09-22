import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Lifetime count of rewards a member has earned, read from public.rewards
 * (migration 007_visit_history.sql) rather than a resettable counter on
 * members — stamp_count zeroes out on every reward, so it can't answer
 * this on its own. Any query failure (table not migrated yet, RLS denial)
 * degrades to 0 rather than failing the caller — this number is a nice-to-
 * have on the pass, not something worth blocking a wallet update over.
 */
export async function countRewardsEarned(
  supabase: SupabaseClient,
  memberId: string,
): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('rewards')
      .select('id', { count: 'exact', head: true })
      .eq('member_id', memberId)
    if (error) return 0
    return count ?? 0
  } catch {
    return 0
  }
}
