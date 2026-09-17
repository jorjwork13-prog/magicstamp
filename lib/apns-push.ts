import http2 from 'node:http2'
import { loadPassCertificates } from './apple-pass-certs'

/**
 * Wallet pass updates use *certificate-based* APNs auth, not the separate
 * .p8 auth-key flow that plain-app push notifications use — Apple lets the
 * Pass Type ID certificate double as the APNs client certificate for its own
 * pass type. That means PASS_CERT_P12_BASE64 / PASS_CERT_PATH (already
 * required for signing .pkpass files, see lib/apple-pass-certs.ts) is also
 * everything this needs. No separate APNs auth key was required — noting
 * this explicitly since the original task asked to flag it if one was
 * needed and we didn't have it.
 */
const PASS_TYPE_IDENTIFIER = 'pass.ge.taply.loyalty'

// Apple has two independent APNs environments; a pass signed with a
// production certificate must be pushed through the production host.
// Flip this only if certs are ever swapped for a sandbox pair.
const APNS_HOST = 'api.push.apple.com'

export type PushResult = { ok: boolean; status?: number; error?: string }

/**
 * Sends a silent "your pass changed" notification, per Apple's Wallet push
 * spec: an empty JSON body to /3/device/<token>, apns-topic = pass type
 * identifier. The device that receives it is expected to call back into the
 * webServiceURL routes (GET .../passes/...) to fetch the new pass — this
 * function only fires the doorbell.
 *
 * NOT yet exercised against a real device/token — there is no registered
 * device to test with in this environment. Treat as unverified until
 * someone adds a real pass to an iPhone and stamps it once with
 * WALLET_APNS_PUSH_ENABLED=true.
 */
export async function sendPassUpdatePush(pushToken: string): Promise<PushResult> {
  let certificates
  try {
    certificates = await loadPassCertificates()
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }

  const { signerCert, signerKey, wwdr } = certificates

  return new Promise((resolve) => {
    let settled = false
    const settle = (result: PushResult) => {
      if (settled) return
      settled = true
      resolve(result)
    }

    const client = http2.connect(`https://${APNS_HOST}`, {
      // Leaf + intermediate, so APNs can build the chain back to its trusted
      // root without a separate `ca` option.
      cert: `${signerCert}\n${wwdr}`,
      key: signerKey,
    })

    client.on('error', (err) => settle({ ok: false, error: err.message }))

    const req = client.request({
      ':method': 'POST',
      ':path': `/3/device/${pushToken}`,
      'apns-topic': PASS_TYPE_IDENTIFIER,
      'content-type': 'application/json',
    })

    req.on('error', (err) => settle({ ok: false, error: err.message }))

    let status: number | undefined
    req.on('response', (headers) => {
      status = Number(headers[':status'])
    })

    let body = ''
    req.setEncoding('utf8')
    req.on('data', (chunk: string) => { body += chunk })
    req.on('end', () => {
      client.close()
      settle({ ok: status === 200, status, error: status !== 200 ? body : undefined })
    })

    req.end(JSON.stringify({}))
  })
}
