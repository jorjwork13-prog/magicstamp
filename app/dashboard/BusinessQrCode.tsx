'use client'

import { QRCodeSVG } from 'qrcode.react'

export default function BusinessQrCode({ joinUrl }: { joinUrl: string }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="bg-white p-4 rounded-xl border border-gray-100">
        <QRCodeSVG value={joinUrl} size={180} level="M" />
      </div>
      <p className="text-xs text-gray-400 text-center break-all max-w-xs">{joinUrl}</p>
      <button
        onClick={() => window.print()}
        className="px-6 py-2.5 border border-[#185FA5] text-[#185FA5] rounded-lg text-sm font-medium hover:bg-blue-50 transition"
      >
        დაბეჭდე
      </button>
    </div>
  )
}
