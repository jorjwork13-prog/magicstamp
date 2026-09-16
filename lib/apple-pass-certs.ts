import { readFile } from 'node:fs/promises'
import path from 'node:path'
import forge from 'node-forge'

export type PassCertificates = {
  wwdr: string
  signerCert: string
  signerKey: string
}

/**
 * passkit-generator signs with three separate PEMs, but the only signing
 * artifact we keep on disk is the PKCS#12 bundle Apple's flow produces
 * (key + Pass Type ID cert + WWDR chain in one file). Decompose it here so
 * the rest of the app only ever knows about PASS_CERT_PATH.
 */
function decompose(p12Der: string, passphrase: string): PassCertificates {
  const p12 = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(p12Der), passphrase)

  const certs: forge.pki.Certificate[] = []
  let signerKey: forge.pki.rsa.PrivateKey | null = null

  for (const safeContent of p12.safeContents) {
    for (const bag of safeContent.safeBags) {
      if (bag.cert) certs.push(bag.cert)
      if (bag.key) signerKey = bag.key as forge.pki.rsa.PrivateKey
    }
  }

  if (!signerKey) throw new Error('PASS_CERT: no private key found in the .p12 bundle')

  // The signer cert is the one this key actually belongs to; whatever else
  // shipped in the bundle is the WWDR intermediate. Matching on the modulus
  // avoids depending on bag order or on Apple's cert naming.
  const signerCert = certs.find(c => (c.publicKey as forge.pki.rsa.PublicKey)?.n?.equals(signerKey!.n))
  const wwdr = certs.find(c => c !== signerCert)

  if (!signerCert) throw new Error('PASS_CERT: no certificate in the .p12 matches the private key')
  if (!wwdr) throw new Error('PASS_CERT: the .p12 has no WWDR intermediate (re-export with -certfile)')

  return {
    wwdr: forge.pki.certificateToPem(wwdr),
    signerCert: forge.pki.certificateToPem(signerCert),
    // Re-emitted unencrypted; it never leaves this process.
    signerKey: forge.pki.privateKeyToPem(signerKey),
  }
}

/**
 * Serverless deploys have no repo checkout to read from — certs/ is gitignored
 * and never ships — so production carries the whole bundle as base64 in
 * PASS_CERT_P12_BASE64. The on-disk path stays as the local-dev fallback, so a
 * fresh clone with the certs in place works without any extra env setup.
 */
async function readP12Der(): Promise<string> {
  const inline = process.env.PASS_CERT_P12_BASE64?.trim()

  if (inline) {
    const buf = Buffer.from(inline, 'base64')
    // Buffer.from silently drops invalid base64 rather than throwing, so a
    // truncated paste would otherwise surface as an opaque ASN.1 parse error.
    if (buf.byteLength < 100) {
      throw new Error('PASS_CERT_P12_BASE64 did not decode to a usable .p12 (truncated or not base64?)')
    }
    return buf.toString('binary')
  }

  const certPath = process.env.PASS_CERT_PATH
  if (!certPath) {
    throw new Error('Neither PASS_CERT_P12_BASE64 nor PASS_CERT_PATH is set')
  }

  const abs = path.isAbsolute(certPath) ? certPath : path.join(process.cwd(), certPath)
  return (await readFile(abs)).toString('binary')
}

let cached: Promise<PassCertificates> | null = null

/** Parsed once per server process — the .p12 never changes at runtime. */
export function loadPassCertificates(): Promise<PassCertificates> {
  if (cached) return cached

  cached = (async () => {
    const passphrase = process.env.PASS_CERT_PASSWORD
    if (!passphrase) throw new Error('PASS_CERT_PASSWORD is not set')

    return decompose(await readP12Der(), passphrase)
  })()

  // Don't cache a failure — a missing env var should be retryable after a fix.
  cached.catch(() => { cached = null })

  return cached
}
