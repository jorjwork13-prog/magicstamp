'use client'

import { QRCodeSVG } from 'qrcode.react'

export default function BusinessQrCode({ joinUrl }: { joinUrl: string }) {
  return (
    <div className="flex flex-col items-center gap-4">
      {/* QR stays on a white plate for scan contrast in both themes */}
      <div className="bg-white p-4 rounded-xl border border-dline">
        <QRCodeSVG value={joinUrl} size={180} level="M" />
      </div>
      <p className="text-xs text-dmuted text-center break-all max-w-xs">{joinUrl}</p>
      <button
        onClick={() => window.print()}
        className="px-6 py-2.5 border border-dlink text-dlink rounded-lg text-sm font-medium hover:bg-honey/10 transition"
      >
        დაბეჭდე
      </button>
    </div>
  )
}
