'use client'

import { useState } from 'react'
import { useActionState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { joinAction } from '@/app/actions/join'

export default function JoinForm({
  businessId,
  businessName,
  maxStamps,
}: {
  businessId: string
  businessName: string
  maxStamps: number
}) {
  const [state, formAction, pending] = useActionState(joinAction, undefined)

  if (state?.success && state.memberId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center space-y-5">
          <div>
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-2xl mx-auto mb-3">
              ✓
            </div>
            <h2 className="text-xl font-bold text-gray-800">გამარჯობა!</h2>
            <p className="text-gray-500 text-sm mt-1">
              შეუერთდით{' '}
              <span className="font-semibold text-[#185FA5]">{businessName}</span>-ს
            </p>
          </div>

          <div className="border-t border-gray-100 pt-5 space-y-3">
            <p className="text-xs text-gray-400 uppercase tracking-widest">ჩემი QR კოდი</p>
            <div className="flex justify-center">
              <div className="bg-white p-3 rounded-xl border border-gray-100 inline-block">
                <QRCodeSVG value={state.memberId} size={160} level="M" />
              </div>
            </div>
            <p className="text-xs text-gray-400">ეს QR კოდი შეინახეთ — მაღაზია სტემპს ამ კოდით დაამატებს</p>
          </div>

          <WalletButton
            memberId={state.memberId}
            memberName={state.memberName ?? ''}
            businessName={businessName}
            maxStamps={maxStamps}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-sm mx-auto space-y-6">
        <div className="text-center">
          <p className="text-sm text-gray-400">კეთილი იყოს თქვენი მობრძანება</p>
          <h1 className="text-2xl font-bold text-[#185FA5] mt-1">{businessName}</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs text-gray-400 mb-4 uppercase tracking-widest">სტემპ-ბარათი</p>
          <div className="grid grid-cols-5 gap-3 justify-items-center">
            {Array.from({ length: maxStamps }).map((_, i) => (
              <div key={i} className="w-11 h-11 rounded-full border-2 border-gray-200 bg-gray-50" />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="businessId" value={businessId} />
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">სახელი</label>
              <input id="name" name="name" type="text" required placeholder="თქვენი სახელი"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#185FA5] focus:ring-1 focus:ring-[#185FA5] transition placeholder:text-gray-400" />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">ტელეფონი</label>
              <input id="phone" name="phone" type="tel" required placeholder="555 00 00 00"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#185FA5] focus:ring-1 focus:ring-[#185FA5] transition placeholder:text-gray-400" />
            </div>
            {state?.error && (
              <p className="text-red-500 text-sm rounded-xl bg-red-50 px-4 py-3">{state.error}</p>
            )}
            <button type="submit" disabled={pending}
              className="w-full bg-[#185FA5] text-white rounded-xl py-4 text-base font-bold hover:bg-[#134d87] transition disabled:opacity-60 mt-2">
              {pending ? 'დამუშავება...' : 'შემოუერთდი'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

function WalletButton({ memberId, memberName, businessName, maxStamps }: {
  memberId: string
  memberName: string
  businessName: string
  maxStamps: number
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, memberName, stampCount: 0, maxStamps, businessName }),
      })
      const data = await res.json()
      if (data.saveUrl) window.open(data.saveUrl, '_blank')
    } catch {
      setError('შეცდომა. სცადეთ კვლავ.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button onClick={handleSave} disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-black text-white rounded-xl py-3 text-sm font-semibold hover:bg-gray-900 transition disabled:opacity-60">
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
        </svg>
        {loading ? 'იტვირთება...' : 'Google Wallet-ში დამატება'}
      </button>
      {error && <p className="text-red-500 text-xs mt-2 text-center">{error}</p>}
    </div>
  )
}