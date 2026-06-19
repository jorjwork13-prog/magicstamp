'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase'

type ScanResult = { name: string; stamp_count: number; rewarded?: boolean }
type Mode = 'idle' | 'scanning' | 'result'

const RESULT_MS = 2_000  // how long to show result before auto-restarting camera
const DEDUP_MS  = 10_000 // same member QR can't be re-stamped within this window

export default function QrScanner({
  businessId,
  maxStamps,
}: {
  businessId: string
  maxStamps: number
}) {
  const router = useRouter()

  const [mode, setMode]         = useState<Mode>('idle')
  const [result, setResult]     = useState<ScanResult | null>(null)
  const [scanError, setScanError]   = useState<string | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)

  const scannerRef    = useRef<any>(null)
  const processingRef = useRef(false)
  // memberId → timestamp of last successful stamp, to guard against double-counting
  const recentScansRef = useRef<Map<string, number>>(new Map())

  // ── helpers ────────────────────────────────────────────────────────────────

  async function safeStop() {
    const qr = scannerRef.current
    if (!qr) return
    scannerRef.current = null
    try { await qr.stop() } catch {}
    try { qr.clear()      } catch {}
  }

  function startScan() {
    setScanError(null)
    setCameraError(null)
    setResult(null)
    processingRef.current = false
    setMode('scanning')
  }

  function cancelScan() {
    // cleanup in the scanning effect handles safeStop
    setMode('idle')
  }

  // ── Effect 1: camera lifecycle ──────────────────────────────────────────────
  // Runs once whenever mode flips to 'scanning'; cleans up when it leaves.
  useEffect(() => {
    if (mode !== 'scanning') return

    let mounted = true
    const supabase = createSupabaseBrowserClient()

    // Wipe any DOM residue left by a previous html5-qrcode session
    const box = document.getElementById('qr-video-box')
    if (box) box.innerHTML = ''

    import('html5-qrcode').then(({ Html5Qrcode }) => {
      if (!mounted) return

      const qr = new Html5Qrcode('qr-video-box')
      scannerRef.current = qr

      qr.start(
        { facingMode: 'environment' },
        { fps: 10 },
        async (decoded: string) => {
          // Block concurrent / re-entrant processing
          if (!mounted || processingRef.current) return

          // Dedup: same QR stamped within DEDUP_MS → skip silently
          const lastSeen = recentScansRef.current.get(decoded)
          if (lastSeen && Date.now() - lastSeen < DEDUP_MS) return

          processingRef.current = true

          // 1. Read current stamp count
          const { data: member } = await supabase
            .from('members')
            .select('name, stamp_count')
            .eq('id', decoded)
            .eq('business_id', businessId)
            .single()

          if (!mounted) return

          if (!member) {
            setScanError('წევრი ვერ მოიძებნა')
            processingRef.current = false
            return
          }

          // 2. Compute new count (reset to 0 on reward)
          const rewarded = member.stamp_count >= maxStamps
          const newCount = rewarded ? 0 : member.stamp_count + 1

          // 3. Write new count + last_visit
          const { data: updated } = await supabase
            .from('members')
            .update({ stamp_count: newCount, last_visit: new Date().toISOString() })
            .eq('id', decoded)
            .eq('business_id', businessId)
            .select('name, stamp_count')
            .single()

          if (!mounted) return

          // Record scan timestamp (dedup guard)
          recentScansRef.current.set(decoded, Date.now())

          // 4. Stop camera, then show result
          await safeStop()
          if (!mounted) return

          setResult({ ...(updated ?? { name: member.name, stamp_count: newCount }), rewarded })
          setMode('result')

          // 5. Live-refresh the members table without a full page reload
          router.refresh()

          // 6. Fire-and-forget wallet update (same as before)
          fetch('/api/wallet/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ memberId: decoded, stampCount: newCount, maxStamps }),
          })
        },
        () => {} // per-frame scan failures are normal — ignore
      ).catch(() => {
        if (mounted) {
          setCameraError('კამერაზე წვდომა ვერ მოხერხდა')
          setMode('idle')
        }
      })
    })

    return () => {
      mounted = false
      safeStop()
    }
  }, [mode]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Effect 2: auto-restart after result ─────────────────────────────────────
  // Shows result for RESULT_MS then quietly resumes scanning.
  useEffect(() => {
    if (mode !== 'result') return
    const timer = setTimeout(() => {
      processingRef.current = false
      setMode('scanning')
    }, RESULT_MS)
    return () => clearTimeout(timer)
  }, [mode])

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center gap-5">
      <style>{`
        @keyframes qs-scanline {
          0%   { top: 10%; }
          50%  { top: 78%; }
          100% { top: 10%; }
        }
        @keyframes qs-pop {
          0%   { transform: scale(0.72); opacity: 0; }
          65%  { transform: scale(1.06); opacity: 1; }
          100% { transform: scale(1);    opacity: 1; }
        }
        @keyframes qs-check {
          0%   { transform: scale(0.5) rotate(-15deg); opacity: 0; }
          60%  { transform: scale(1.2) rotate(4deg);  opacity: 1; }
          100% { transform: scale(1)   rotate(0deg);  opacity: 1; }
        }
        @keyframes qs-progress {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
      `}</style>

      {/* ── IDLE: start button ─────────────────────────────────────────────── */}
      {mode === 'idle' && (
        <div className="flex flex-col items-center gap-3 w-full">
          <button
            onClick={startScan}
            className="flex items-center gap-2 bg-[#185FA5] text-white rounded-xl px-8 py-4 text-base font-bold hover:bg-[#134d87] active:scale-95 transition"
          >
            <span className="text-xl leading-none">📷</span>
            სკანირება
          </button>

          {cameraError && (
            <p className="text-sm text-gray-400 text-center">{cameraError}</p>
          )}
          {scanError && (
            <div className="w-full max-w-sm bg-red-50 border border-red-200 rounded-xl px-5 py-3 flex items-center justify-between">
              <p className="text-sm text-red-600">{scanError}</p>
              <button onClick={() => setScanError(null)} className="text-red-400 hover:text-red-600 text-xl ml-3 leading-none">×</button>
            </div>
          )}
        </div>
      )}

      {/* ── SCANNING: viewfinder ──────────────────────────────────────────── */}
      {mode === 'scanning' && (
        <div className="flex flex-col items-center gap-4 w-full">
          <div className="relative w-72 h-72 bg-black rounded-2xl overflow-hidden mx-auto">
            {/* html5-qrcode mounts a <video> inside here */}
            <div id="qr-video-box" style={{ width: 288, height: 288 }} />

            {/* Animated green scan line */}
            <div
              style={{
                position: 'absolute',
                left: '10%',
                right: '10%',
                height: 2,
                borderRadius: 1,
                background: 'linear-gradient(90deg, transparent 0%, #4ade80 20%, #4ade80 80%, transparent 100%)',
                boxShadow: '0 0 6px 1px #4ade8099',
                animation: 'qs-scanline 2s ease-in-out infinite',
                zIndex: 10,
              }}
            />

            {/* Corner brackets */}
            <span className="pointer-events-none absolute top-5 left-5  w-8 h-8 border-t-[3px] border-l-[3px] border-green-400 rounded-tl" />
            <span className="pointer-events-none absolute top-5 right-5 w-8 h-8 border-t-[3px] border-r-[3px] border-green-400 rounded-tr" />
            <span className="pointer-events-none absolute bottom-5 left-5  w-8 h-8 border-b-[3px] border-l-[3px] border-green-400 rounded-bl" />
            <span className="pointer-events-none absolute bottom-5 right-5 w-8 h-8 border-b-[3px] border-r-[3px] border-green-400 rounded-br" />
          </div>

          {scanError && (
            <div className="w-full max-w-sm bg-red-50 border border-red-200 rounded-xl px-5 py-3 flex items-center justify-between">
              <p className="text-sm text-red-600">{scanError}</p>
              <button onClick={() => setScanError(null)} className="text-red-400 hover:text-red-600 text-xl ml-3 leading-none">×</button>
            </div>
          )}

          <button onClick={cancelScan} className="text-sm text-gray-400 hover:text-gray-600 transition">
            გაუქმება
          </button>
        </div>
      )}

      {/* ── RESULT: success / reward card + auto-restart progress bar ─────── */}
      {mode === 'result' && result && (
        <div className="flex flex-col items-center gap-3 w-full">
          {result.rewarded ? (
            <div
              className="w-full max-w-sm bg-amber-50 border border-amber-300 rounded-xl px-5 py-4 flex items-center gap-3"
              style={{ animation: 'qs-pop 0.38s cubic-bezier(0.34,1.56,0.64,1) both' }}
            >
              <div
                className="w-9 h-9 rounded-full bg-amber-400 flex items-center justify-center text-lg shrink-0"
                style={{ animation: 'qs-check 0.42s cubic-bezier(0.34,1.56,0.64,1) 0.06s both' }}
              >
                🎁
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-amber-800 truncate">{result.name}</p>
                <p className="text-sm text-amber-700">ბარათი შევსებულია! 🎁 დაასაჩუქრეთ კლიენტი</p>
              </div>
            </div>
          ) : (
            <div
              className="w-full max-w-sm bg-green-50 border border-green-200 rounded-xl px-5 py-4 flex items-center gap-3"
              style={{ animation: 'qs-pop 0.38s cubic-bezier(0.34,1.56,0.64,1) both' }}
            >
              <div
                className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center text-white font-bold shrink-0"
                style={{ animation: 'qs-check 0.42s cubic-bezier(0.34,1.56,0.64,1) 0.06s both' }}
              >
                ✓
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-green-800 truncate">{result.name}</p>
                <p className="text-sm text-green-600">{result.stamp_count} / {maxStamps} სტემპი</p>
              </div>
            </div>
          )}

          {/* Progress bar — drains over RESULT_MS, then camera auto-restarts */}
          <div className="w-full max-w-sm h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              style={{
                height: '100%',
                width: '100%',
                background: '#185FA5',
                transformOrigin: 'left',
                animation: `qs-progress ${RESULT_MS}ms linear both`,
                borderRadius: '9999px',
              }}
            />
          </div>

          {/* Skip the wait */}
          <button
            onClick={startScan}
            className="text-sm text-[#185FA5] hover:text-[#134d87] font-medium transition"
          >
            📷 ახლავე სკანირება
          </button>
        </div>
      )}
    </div>
  )
}
