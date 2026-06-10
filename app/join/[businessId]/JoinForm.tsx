'use client'

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
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-sm mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <p className="text-sm text-gray-400">კეთილი იყოს თქვენი მობრძანება</p>
          <h1 className="text-2xl font-bold text-[#185FA5] mt-1">{businessName}</h1>
        </div>

        {/* Stamp card preview */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs text-gray-400 mb-4 uppercase tracking-widest">სტემპ-ბარათი</p>
          <div className="grid grid-cols-5 gap-3 justify-items-center">
            {Array.from({ length: maxStamps }).map((_, i) => (
              <div
                key={i}
                className="w-11 h-11 rounded-full border-2 border-gray-200 bg-gray-50"
              />
            ))}
          </div>
        </div>

        {/* Join form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="businessId" value={businessId} />

            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                სახელი
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                placeholder="თქვენი სახელი"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#185FA5] focus:ring-1 focus:ring-[#185FA5] transition placeholder:text-gray-400"
              />
            </div>

            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                ტელეფონი
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                placeholder="555 00 00 00"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#185FA5] focus:ring-1 focus:ring-[#185FA5] transition placeholder:text-gray-400"
              />
            </div>

            {state?.error && (
              <p className="text-red-500 text-sm rounded-xl bg-red-50 px-4 py-3">
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full bg-[#185FA5] text-white rounded-xl py-4 text-base font-bold hover:bg-[#134d87] active:bg-[#0f3d6b] transition disabled:opacity-60 mt-2"
            >
              {pending ? 'დამუშავება...' : 'შემოუერთდი'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
