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

  const patch = {
    reviewStatus: 'UNDER_REVIEW',
    programLogo: {
      sourceUri: {
        uri: 'https://magicstamp.vercel.app/logo.png',
      },
      contentDescription: {
        defaultValue: { language: 'en-US', value: 'Taply logo' },
      },
    },
  }

  const res = await walletobjects.loyaltyclass.patch({
    resourceId: CLASS_ID,
    requestBody: patch,
  })

  const logo = res.data.programLogo?.sourceUri?.uri
  console.log('Updated programLogo.sourceUri:', logo)
  if (logo === 'https://magicstamp.vercel.app/logo.png') {
    console.log('SUCCESS: logo URL confirmed.')
  } else {
    console.error('UNEXPECTED value returned:', logo)
    process.exit(1)
  }
}

main().catch(err => {
  console.error('Error:', err?.response?.data ?? err.message)
  process.exit(1)
})
