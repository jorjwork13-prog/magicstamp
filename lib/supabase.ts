import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// There is deliberately no plain `createClient` export here. That client reads
// no cookies, so it has no session: under RLS its queries return zero rows with
// NO error, and callers silently render empty data as if it were the truth.
// Client Components use the browser client below; server code uses
// `@/lib/supabase-server` (session-aware) or `@/lib/supabase-admin` (service role).

// Browser client (for use in Client Components)
export function createSupabaseBrowserClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
