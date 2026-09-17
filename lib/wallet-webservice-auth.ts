import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Apple's PassKit Web Service protocol has each request carry
 * `Authorization: ApplePass <authenticationToken>`, where the token is
 * whatever value shipped inside the pass itself (`pass.json`'s
 * `authenticationToken` field). The web service is expected to recognize
 * that token as belonging to the (passTypeIdentifier, serialNumber) pair
 * the request names.
 *
 * Rather than generating and storing a random token per pass (one more
 * thing that could drift out of sync with what's actually inside a given
 * .pkpass a customer is holding), the token is derived deterministically
 * from the serial number with an HMAC. Anyone who can compute the HMAC can
 * forge a token, so WALLET_WEBSERVICE_SECRET must stay server-only — same
 * trust level as PASS_CERT_PASSWORD.
 */
export function passAuthToken(serialNumber: string): string {
  const secret = process.env.WALLET_WEBSERVICE_SECRET
  if (!secret) throw new Error('WALLET_WEBSERVICE_SECRET is not set')

  return createHmac('sha256', secret).update(serialNumber).digest('hex')
}

/**
 * Verifies the `Authorization: ApplePass <token>` header for a request that
 * names `serialNumber`. Constant-time comparison — this gates a table of
 * device push tokens, so it's worth doing properly even though the token
 * itself isn't a secret an attacker couldn't also derive if they knew
 * WALLET_WEBSERVICE_SECRET (which they shouldn't).
 */
export function verifyPassAuth(authorizationHeader: string | null, serialNumber: string): boolean {
  if (!authorizationHeader?.startsWith('ApplePass ')) return false

  const provided = Buffer.from(authorizationHeader.slice('ApplePass '.length))
  const expected = Buffer.from(passAuthToken(serialNumber))

  return provided.length === expected.length && timingSafeEqual(provided, expected)
}
