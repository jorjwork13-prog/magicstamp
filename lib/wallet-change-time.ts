/**
 * When a member's Apple pass last changed, as the PassKit web service sees it:
 * the later of a real visit (last_visit) and a sent message (wallet_message_at,
 * migration 011). Both the "which passes changed" list and the "get pass"
 * Last-Modified/304 check go through this, so they can never disagree.
 *
 * Returns the original timestamptz string rather than a re-serialized Date:
 * the registrations route hands it back to iOS as the `lastUpdated` tag and
 * compares it as a string against the next `passesUpdatedSince`, and a Date
 * round trip would drop Postgres's microseconds.
 */
export function walletChangeTime(member: {
  last_visit?: string | null
  wallet_message_at?: string | null
}): string | null {
  const visit   = member.last_visit ?? null
  const message = member.wallet_message_at ?? null
  if (!visit) return message
  if (!message) return visit

  const v = Date.parse(visit)
  const m = Date.parse(message)
  if (v !== m) return m > v ? message : visit
  return message > visit ? message : visit
}
