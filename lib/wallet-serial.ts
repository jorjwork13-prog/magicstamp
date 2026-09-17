/**
 * PKPass.serialNumber is `${businessId}.${memberId}` (see
 * lib/apple-pass-builder.ts) — both are Postgres uuids, which never contain
 * a `.`, so splitting on the first dot is unambiguous.
 */
export function parseSerialNumber(serialNumber: string): { businessId: string; memberId: string } | null {
  const dot = serialNumber.indexOf('.')
  if (dot < 0) return null

  const businessId = serialNumber.slice(0, dot)
  const memberId    = serialNumber.slice(dot + 1)
  if (!businessId || !memberId) return null

  return { businessId, memberId }
}
