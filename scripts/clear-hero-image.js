// One-time script: clears heroImage from an existing loyalty class.
// Usage: node scripts/clear-hero-image.js <classId>
// Example:
//   node scripts/clear-hero-image.js 3388000000023159453.magicstamp_loyalty_<testcafe13-uuid>

const { google } = require('googleapis')
const path = require('path')
const KEY_FILE = path.join(__dirname, '..', 'google-wallet-key.json')

const classId = process.argv[2]
if (!classId) {
  console.error('Usage: node clear-hero-image.js <classId>')
  process.exit(1)
}

async function main() {
  const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE,
    scopes: ['https://www.googleapis.com/auth/wallet_object.issuer'],
  })
  const walletobjects = google.walletobjects({ version: 'v1', auth })

  const res = await walletobjects.loyaltyclass.patch({
    resourceId:  classId,
    requestBody: { heroImage: null },
  })

  const hero = res.data.heroImage
  if (hero) {
    console.error('WARNING: heroImage still present after patch:', JSON.stringify(hero))
  } else {
    console.log('OK: heroImage cleared on', classId)
  }
}

main().catch(err => {
  console.error(err?.response?.data ?? err.message)
  process.exit(1)
})
