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

  const loyaltyClass = {
    id: CLASS_ID,
    issuerName: 'MagicStamp',
    programName: 'MagicStamp Loyalty',
    reviewStatus: 'UNDER_REVIEW',
    programLogo: {
      sourceUri: {
        uri: 'https://placehold.co/512x512.png',
      },
      contentDescription: {
        defaultValue: { language: 'en-US', value: 'MagicStamp logo' },
      },
    },
  }

  try {
    const res = await walletobjects.loyaltyclass.insert({ requestBody: loyaltyClass })
    console.log('Class created:', res.data.id)
  } catch (err) {
    if (err?.response?.status === 409) {
      console.log('Class already exists:', CLASS_ID)
    } else {
      console.error('Error:', err?.response?.data ?? err.message)
      process.exit(1)
    }
  }
}

main()
