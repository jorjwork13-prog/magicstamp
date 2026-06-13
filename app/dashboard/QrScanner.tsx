'use client'

import { useEffect, useRef, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'

type ScanResult = { name: string; stamp_count: number; rewarded?: boolean }

export default function QrScanner({
  businessId,
  maxStamps,
}: {
  businessId: string
  maxStamps: number
}) {
  const [result, setResult] = useState<ScanResult | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const lastScannedRef = useRef<string | null>(null)
  const scannerRef = useRef<any>(null)

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    let mounted = true

    import('html5-qrcode').then(({ Html5Qrcode }) => {
      if (!mounted) return

      const qr = new Html5Qrcode('qr-video-box')
      scannerRef.current = qr

      qr.start(
        { facingMode: 'environment' },
        { fps: 10 },
        async (decoded: string) => {
          if (decoded === lastScannedRef.current) return
          lastScannedRef.current = decoded

          // Fetch current stamp count
          const { data: member } = await supabase
            .from('members')
            .select('name, stamp_count')
            .eq('id', decoded)
            .eq('business_id', businessId)
            .single()

          if (!mounted) return

          if (!member) {
            setScanError('წევრი ვერ მოიძებნა')
            setResult(null)
            return
          }

          const rewarded = member.stamp_count >= maxStamps
          const newCount = rewarded ? 0 : member.stamp_count + 1

          const { data: updated } = await supabase
            .from('members')
            .update({ stamp_count: newCount, last_visit: new Date().toISOString() })
            .eq('id', decoded)
            .eq('business_id', businessId)
            .select('name, stamp_count')
            .single()

          if (!mounted) return

          setResult({ ...(updated ?? { name: member.name, stamp_count: newCount }), rewarded })
          setScanError(null)

          fetch('/api/wallet/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ memberId: decoded, stampCount: newCount, maxStamps }),
          })
        },
        () => {} // per-frame scan failures are normal — ignore
      ).catch(() => {
        if (mounted) setCameraError('კამერაზე წვდომა ვერ მოხერხდა')
      })
    })

    return () => {
      mounted = false
      scannerRef.current?.stop().catch(() => {})
    }
  }, [businessId])

  function dismiss() {
    setResult(null)
    setScanError(null)
    lastScannedRef.current = null
  }

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Viewfinder */}
      <div className="relative w-72 h-72 bg-black rounded-2xl overflow-hidden mx-auto">
        {/* html5-qrcode mounts a <video> inside this div */}
        <div id="qr-video-box" style={{ width: 288, height: 288 }} />

        {/* Green corner brackets */}
        <span className="pointer-events-none absolute top-6 left-6 w-7 h-7 border-t-[3px] border-l-[3px] border-green-400 rounded-tl-sm" />
        <span className="pointer-events-none absolute top-6 right-6 w-7 h-7 border-t-[3px] border-r-[3px] border-green-400 rounded-tr-sm" />
        <span className="pointer-events-none absolute bottom-6 left-6 w-7 h-7 border-b-[3px] border-l-[3px] border-green-400 rounded-bl-sm" />
        <span className="pointer-events-none absolute bottom-6 right-6 w-7 h-7 border-b-[3px] border-r-[3px] border-green-400 rounded-br-sm" />
      </div>

      {/* Camera unavailable */}
      {cameraError && (
        <p className="text-sm text-gray-400 text-center">{cameraError}</p>
      )}

      {/* Success */}
      {result && (
        result.rewarded ? (
          <div className="w-full max-w-sm bg-amber-50 border border-amber-300 rounded-xl px-5 py-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-400 flex items-center justify-center text-white font-bold shrink-0 text-lg">
              🎁
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-amber-800 truncate">{result.name}</p>
              <p className="text-sm text-amber-700">ბარათი შევსებულია! 🎁 დაასაჩუქრეთ კლიენტი</p>
            </div>
            <button
              onClick={dismiss}
              className="text-amber-400 hover:text-amber-600 text-xl leading-none shrink-0"
              aria-label="დახურვა"
            >
              ×
            </button>
          </div>
        ) : (
          <div className="w-full max-w-sm bg-green-50 border border-green-200 rounded-xl px-5 py-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center text-white font-bold shrink-0">
              ✓
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-green-800 truncate">{result.name}</p>
              <p className="text-sm text-green-600">
                {result.stamp_count} / {maxStamps} სტემპი
              </p>
            </div>
            <button
              onClick={dismiss}
              className="text-green-400 hover:text-green-600 text-xl leading-none shrink-0"
              aria-label="დახურვა"
            >
              ×
            </button>
          </div>
        )
      )}

      {/* Member not found */}
      {scanError && !result && (
        <div className="w-full max-w-sm bg-red-50 border border-red-200 rounded-xl px-5 py-3 flex items-center justify-between">
          <p className="text-sm text-red-600">{scanError}</p>
          <button onClick={dismiss} className="text-red-400 hover:text-red-600 text-xl ml-3 leading-none">
            ×
          </button>
        </div>
      )}
    </div>
  )
}
