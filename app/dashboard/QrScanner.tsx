'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import StampGrid from '@/components/StampGrid'

type ScanResult = { name: string; stamp_count: number; rewarded?: boolean }
type Mode = 'idle' | 'scanning' | 'result'

const RESULT_MS  = 2_000  // display duration for normal stamp result
const REWARD_MS  = 3_000  // display duration for card-full celebration
const DEDUP_MS   = 10_000 // same QR can't be re-stamped within this window

// Confetti pieces for the reward celebration (positioned relative to the 🎉 emoji)
const CONFETTI = [
  { dx: -55, dy: -75, rot: -30, size: 8, delay: 0,   color: '#F59E0B', round: true  },
  { dx:  55, dy: -75, rot:  30, size: 8, delay: 60,  color: '#EF4444', round: false },
  { dx: -75, dy: -15, rot: -60, size: 6, delay: 30,  color: '#10B981', round: true  },
  { dx:  75, dy: -15, rot:  60, size: 6, delay: 90,  color: '#3B82F6', round: false },
  { dx: -42, dy:  65, rot: -45, size: 7, delay: 15,  color: '#8B5CF6', round: true  },
  { dx:  42, dy:  65, rot:  45, size: 7, delay: 75,  color: '#EC4899', round: false },
  { dx:   0, dy: -90, rot:   0, size: 5, delay: 45,  color: '#F59E0B', round: true  },
  { dx: -85, dy:  12, rot: -90, size: 5, delay: 105, color: '#06B6D4', round: false },
  { dx:  85, dy:  12, rot:  90, size: 5, delay: 120, color: '#84CC16', round: true  },
]

export default function QrScanner({
  businessId,
  maxStamps,
}: {
  businessId: string
  maxStamps: number
}) {
  const router = useRouter()

  const [mode, setMode]               = useState<Mode>('idle')
  const [result, setResult]           = useState<ScanResult | null>(null)
  const [scanError, setScanError]     = useState<string | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)

  const scannerRef      = useRef<any>(null)
  const processingRef   = useRef(false)
  const resultDelayRef  = useRef(RESULT_MS)            // set per-scan before mode→result
  const recentScansRef  = useRef<Map<string, number>>(new Map())

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
    setMode('idle')
  }

  // ── Effect 1: camera lifecycle ─────────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'scanning') return

    let mounted = true
    const supabase = createSupabaseBrowserClient()

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
          if (!mounted || processingRef.current) return

          const lastSeen = recentScansRef.current.get(decoded)
          if (lastSeen && Date.now() - lastSeen < DEDUP_MS) return

          processingRef.current = true

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

          const newCount = member.stamp_count + 1
          const rewarded = newCount >= maxStamps
          const countToSave = rewarded ? 0 : newCount

          const { data: updated } = await supabase
            .from('members')
            .update({ stamp_count: countToSave, last_visit: new Date().toISOString() })
            .eq('id', decoded)
            .eq('business_id', businessId)
            .select('name, stamp_count')
            .single()

          if (!mounted) return

          recentScansRef.current.set(decoded, Date.now())
          resultDelayRef.current = rewarded ? REWARD_MS : RESULT_MS

          await safeStop()
          if (!mounted) return

          setResult({ ...(updated ?? { name: member.name, stamp_count: countToSave }), rewarded })
          setMode('result')
          router.refresh()

          fetch('/api/wallet/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ memberId: decoded, stampCount: countToSave, maxStamps, businessId }),
          })
        },
        () => {}
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

  // ── Effect 2: auto-restart after result ────────────────────────────────────
  useEffect(() => {
    if (mode !== 'result') return
    const delay = resultDelayRef.current
    const timer = setTimeout(() => {
      processingRef.current = false
      setMode('scanning')
    }, delay)
    return () => clearTimeout(timer)
  }, [mode])

  // ── Render ─────────────────────────────────────────────────────────────────
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
        /* Reward celebration */
        @keyframes qs-celebrate {
          0%   { transform: scale(0.3) rotate(-20deg); opacity: 0; }
          50%  { transform: scale(1.35) rotate(8deg);  opacity: 1; }
          75%  { transform: scale(0.92) rotate(-4deg); }
          100% { transform: scale(1)    rotate(0deg);  opacity: 1; }
        }
        @keyframes qs-burst {
          0%   { transform: translate(0,0) rotate(0deg) scale(0); opacity: 1; }
          60%  { opacity: 1; }
          100% { transform: translate(var(--qs-dx), var(--qs-dy)) rotate(var(--qs-rot)) scale(1); opacity: 0; }
        }
        @keyframes qs-shimmer {
          0%, 100% { box-shadow: 0 0 0 0 #F59E0B44; }
          50%       { box-shadow: 0 0 0 10px #F59E0B00; }
        }
      `}</style>

      {/* ── IDLE ─────────────────────────────────────────────────────────── */}
      {mode === 'idle' && (
        <div className="flex flex-col items-center gap-3 w-full">
          <button
            onClick={startScan}
            className="flex items-center gap-2 bg-[#185FA5] text-white rounded-xl px-8 py-4 text-base font-bold hover:bg-[#134d87] active:scale-95 transition"
          >
            <span className="text-xl leading-none">📷</span>
            სკანირება
          </button>
          {cameraError && <p className="text-sm text-gray-400 text-center">{cameraError}</p>}
          {scanError && (
            <div className="w-full max-w-sm bg-red-50 border border-red-200 rounded-xl px-5 py-3 flex items-center justify-between">
              <p className="text-sm text-red-600">{scanError}</p>
              <button onClick={() => setScanError(null)} className="text-red-400 hover:text-red-600 text-xl ml-3 leading-none">×</button>
            </div>
          )}
        </div>
      )}

      {/* ── SCANNING ─────────────────────────────────────────────────────── */}
      {mode === 'scanning' && (
        <div className="flex flex-col items-center gap-4 w-full">
          <div className="relative w-72 h-72 bg-black rounded-2xl overflow-hidden mx-auto">
            <div id="qr-video-box" style={{ width: 288, height: 288 }} />
            <div style={{
              position: 'absolute', left: '10%', right: '10%', height: 2, borderRadius: 1,
              background: 'linear-gradient(90deg, transparent 0%, #4ade80 20%, #4ade80 80%, transparent 100%)',
              boxShadow: '0 0 6px 1px #4ade8099',
              animation: 'qs-scanline 2s ease-in-out infinite', zIndex: 10,
            }} />
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

      {/* ── RESULT ───────────────────────────────────────────────────────── */}
      {mode === 'result' && result && (
        <div className="flex flex-col items-center gap-3 w-full">

          {result.rewarded ? (
            /* ── REWARD: full celebration card ── */
            <div
              className="w-full max-w-sm bg-amber-50 border-2 border-amber-300 rounded-2xl px-6 py-6 text-center"
              style={{ animation: 'qs-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) both, qs-shimmer 1.2s ease-in-out 0.4s 2' }}
            >
              {/* Confetti + bouncing emoji */}
              <div style={{ position: 'relative', display: 'inline-block', marginBottom: 12 }}>
                {CONFETTI.map((c, i) => (
                  <span
                    key={i}
                    style={{
                      position: 'absolute',
                      top: '50%', left: '50%',
                      width: c.size, height: c.size,
                      marginTop: -c.size / 2, marginLeft: -c.size / 2,
                      borderRadius: c.round ? '50%' : 2,
                      background: c.color,
                      '--qs-dx': `${c.dx}px`,
                      '--qs-dy': `${c.dy}px`,
                      '--qs-rot': `${c.rot}deg`,
                      animation: `qs-burst 0.75s ease-out ${c.delay}ms both`,
                    } as React.CSSProperties}
                  />
                ))}
                <span style={{ fontSize: 52, lineHeight: 1, display: 'block', animation: 'qs-celebrate 0.65s cubic-bezier(0.34,1.56,0.64,1) 0.05s both' }}>
                  🎉
                </span>
              </div>

              <p
                className="font-bold text-amber-800 text-xl truncate"
                style={{ animation: 'qs-pop 0.35s cubic-bezier(0.34,1.56,0.64,1) 0.2s both' }}
              >
                {result.name}
              </p>
              <p className="text-sm text-amber-700 mt-1" style={{ animation: 'qs-pop 0.35s cubic-bezier(0.34,1.56,0.64,1) 0.3s both' }}>
                ბარათი შევსებულია!
              </p>
              <p className="text-base font-medium text-amber-600 mt-1" style={{ animation: 'qs-pop 0.35s cubic-bezier(0.34,1.56,0.64,1) 0.38s both' }}>
                🎁 დაასაჩუქრეთ კლიენტი
              </p>
            </div>
          ) : (
            /* ── NORMAL STAMP: green card with stamp grid ── */
            <div
              className="w-full max-w-sm bg-green-50 border border-green-200 rounded-xl px-5 py-4"
              style={{ animation: 'qs-pop 0.38s cubic-bezier(0.34,1.56,0.64,1) both' }}
            >
              {/* Header: ✓ icon + name */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center text-white font-bold shrink-0"
                  style={{ animation: 'qs-check 0.42s cubic-bezier(0.34,1.56,0.64,1) 0.06s both' }}
                >
                  ✓
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-green-800 truncate">{result.name}</p>
                  <p className="text-xs text-green-600">{result.stamp_count} / {maxStamps} სტემპი</p>
                </div>
              </div>

              {/* Stamp circles — the new stamp pops in */}
              <div style={{ animation: 'qs-pop 0.35s cubic-bezier(0.34,1.56,0.64,1) 0.12s both' }}>
                <StampGrid
                  count={result.stamp_count}
                  max={maxStamps}
                  circleSize={28}
                  gap={6}
                  animateLastFilled
                />
              </div>
            </div>
          )}

          {/* Auto-restart progress bar */}
          <div className="w-full max-w-sm h-1 bg-gray-100 rounded-full overflow-hidden">
            <div style={{
              height: '100%', width: '100%',
              background: result.rewarded ? '#F59E0B' : '#185FA5',
              transformOrigin: 'left',
              animation: `qs-progress ${resultDelayRef.current}ms linear both`,
              borderRadius: '9999px',
            }} />
          </div>

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
