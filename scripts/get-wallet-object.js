const { google } = require('googleapis')
const path = require('path')

const OBJECT_ID = '3388000000023159453.magicstamp_loyalty.3a6de117-4af5-44f2-a42a-47f5193e5473'
const KEY_FILE = path.join(__dirname, '..', 'google-wallet-key.json')

async function main() {
  const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE,
    scopes: ['https://www.googleapis.com/auth/wallet_object.issuer'],
  })

  const walletobjects = google.walletobjects({ version: 'v1', auth })

  const res = await walletobjects.loyaltyobject.get({ resourceId: OBJECT_ID })

  console.log('heroImage:', JSON.stringify(res.data.heroImage, null, 2))
  console.log('loyaltyPoints:', JSON.stringify(res.data.loyaltyPoints, null, 2))
}

main().catch(err => {
  console.error('Error:', err?.response?.data ?? err.message)
  process.exit(1)
})
