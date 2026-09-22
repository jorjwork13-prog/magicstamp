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

// A mutual-TLS handshake against APNs costs a few hundred ms, and we used to
// pay it on every single stamp. The session is pooled instead; APNs multiplexes
// as many pushes over one connection as we care to send.
const REQUEST_TIMEOUT_MS = 5_000
const CONNECT_TIMEOUT_MS = 5_000

export type PushResult = { ok: boolean; status?: number; error?: string }

let sessionPromise: Promise<http2.ClientHttp2Session> | null = null

function resetSession(): void {
  const stale = sessionPromise
  sessionPromise = null
  stale?.then(s => { if (!s.destroyed) s.destroy() }).catch(() => {})
}

async function getSession(): Promise<http2.ClientHttp2Session> {
  const existing = sessionPromise
  if (existing) {
    const session = await existing.catch(() => null)
    if (session && !session.closed && !session.destroyed) return session
    if (sessionPromise === existing) sessionPromise = null
  }

  const pending = (async () => {
    const { signerCert, signerKey, wwdr } = await loadPassCertificates()

    return await new Promise<http2.ClientHttp2Session>((resolve, reject) => {
      const client = http2.connect(`https://${APNS_HOST}`, {
        // Leaf + intermediate, so APNs can build the chain back to its trusted
        // root without a separate `ca` option.
        cert: `${signerCert}\n${wwdr}`,
        key: signerKey,
      })

      const timer = setTimeout(() => {
        cleanup()
        client.destroy()
        reject(new Error('APNs connect timed out'))
      }, CONNECT_TIMEOUT_MS)

      const cleanup = () => {
        clearTimeout(timer)
        client.off('error', onError)
        client.off('connect', onConnect)
      }
      const onError = (err: Error) => { cleanup(); reject(err) }
      const onConnect = () => { cleanup(); resolve(client) }

      client.once('error', onError)
      client.once('connect', onConnect)
    })
  })()

  // However the session ends — close, GOAWAY, transport error — stop handing
  // it out, so the next push dials a fresh one.
  pending
    .then(session => {
      const drop = () => { if (sessionPromise === pending) sessionPromise = null }
      session.once('close', drop)
      session.once('goaway', drop)
      session.once('error', drop)
      // Idle between invocations, the socket must not hold the function open.
      session.unref()
    })
    .catch(() => { if (sessionPromise === pending) sessionPromise = null })

  sessionPromise = pending
  return pending
}

// ref()/unref() is a flag on the socket, not a counter, so concurrent pushes
// (a pass registered on two devices) have to share one. Track the depth here
// and only let the socket go idle once nothing is in flight.
let inFlight = 0

function retainSession(session: http2.ClientHttp2Session): void {
  if (inFlight++ === 0) session.ref()
}

function releaseSession(session: http2.ClientHttp2Session): void {
  if (--inFlight <= 0) {
    inFlight = 0
    if (!session.destroyed) session.unref()
  }
}

/** One attempt on the pooled session. Rejects on transport trouble. */
function sendOnce(session: http2.ClientHttp2Session, pushToken: string): Promise<PushResult> {
  return new Promise((resolve, reject) => {
    let settled = false

    // Keep the socket alive for the duration of this request only.
    retainSession(session)
    const finish = (fn: () => void) => {
      if (settled) return
      settled = true
      releaseSession(session)
      fn()
    }

    // session.request() throws synchronously on an already-closed session, and
    // that must not strand the retain above — a leaked count would pin the
    // socket open and stop every later request from ever releasing it.
    let req: http2.ClientHttp2Stream
    try {
      req = session.request({
        ':method': 'POST',
        ':path': `/3/device/${pushToken}`,
        'apns-topic': PASS_TYPE_IDENTIFIER,
        'content-type': 'application/json',
      })
    } catch (err) {
      finish(() => reject(err instanceof Error ? err : new Error(String(err))))
      return
    }

    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      req.close(http2.constants.NGHTTP2_CANCEL)
      finish(() => reject(new Error('APNs request timed out')))
    })

    req.on('error', err => finish(() => reject(err)))

    let status: number | undefined
    req.on('response', headers => { status = Number(headers[':status']) })

    let body = ''
    req.setEncoding('utf8')
    req.on('data', (chunk: string) => { body += chunk })
    req.on('end', () => {
      finish(() => resolve({ ok: status === 200, status, error: status !== 200 ? body : undefined }))
    })

    req.end(JSON.stringify({}))
  })
}

/**
 * Sends a silent "your pass changed" notification, per Apple's Wallet push
 * spec: an empty JSON body to /3/device/<token>, apns-topic = pass type
 * identifier. The device that receives it is expected to call back into the
 * webServiceURL routes (GET .../passes/...) to fetch the new pass — this
 * function only fires the doorbell.
 */
export async function sendPassUpdatePush(pushToken: string): Promise<PushResult> {
  try {
    return await sendOnce(await getSession(), pushToken)
  } catch {
    // A pooled session can be dead in ways that only show up on use: the
    // instance was frozen and thawed, or APNs recycled the connection. Drop it
    // and give the push one clean retry before calling it a failure.
    resetSession()
    try {
      return await sendOnce(await getSession(), pushToken)
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  }
}
