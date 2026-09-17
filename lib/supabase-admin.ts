import { createClient } from '@supabase/supabase-js'

/**
 * Service-role client for the small set of server routes that must read/
 * write Supabase without an owning business's auth session — right now
 * that's only the Apple PassKit Web Service routes
 * (app/api/wallet/apple-webservice/**), which are called by Apple's
 * servers and authenticate themselves via the pass's own
 * authenticationToken (lib/wallet-webservice-auth.ts) rather than a
 * Supabase JWT.
 *
 * ⚠️ SUPABASE_SERVICE_ROLE_KEY bypasses every RLS policy in the project.
 * Never import this file from a Client Component, and never forward its
 * client (or anything derived from it) to the browser. This env var is not
 * set yet anywhere the app currently runs — it needs to be added to
 * .env.local and to the Vercel project before the Phase 2 routes that use
 * it can work. (It's the "service_role" key already shown on the
 * Supabase project's API settings page — nothing new to generate.)
 */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
