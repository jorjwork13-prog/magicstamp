const { google } = require('googleapis')
const path = require('path')

const CLASS_ID = '3388000000023159453.magicstamp_loyalty'
const KEY_FILE = path.join(__dirname, '..', 'google-wallet-key.json')

async function main() {
  const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE,
    scopes: ['https://www.googleapis.com/auth/wallet_object.issuer'],
  })

  const walletobjects = google.walletobjects({ version: 'v1', auth })

  // List all loyalty objects for this class
  let objects = []
  let token
  do {
    const res = await walletobjects.loyaltyobject.list({
      classId: CLASS_ID,
      ...(token ? { token } : {}),
    })
    objects = objects.concat(res.data.resources ?? [])
    token = res.data.pagination?.nextPageToken
  } while (token)

  console.log(`Found ${objects.length} object(s)`)

  for (const obj of objects) {
    const memberId = obj.id.replace(`${CLASS_ID}.`, '')
    try {
      await walletobjects.loyaltyobject.patch({
        resourceId: obj.id,
        requestBody: {
          barcode: { type: 'QR_CODE', value: memberId, alternateText: memberId },
        },
      })
      console.log(`Patched: ${obj.id}`)
    } catch (err) {
      console.error(`Failed ${obj.id}:`, err?.response?.data ?? err.message)
    }
  }
}

main()
