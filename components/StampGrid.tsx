'use client'

import { computeRowLayout } from '@/lib/stamps'

export default function StampGrid({
  count,
  max,
  circleSize = 44,
  gap = 10,
  animateLastFilled = false,
}: {
  count: number
  max: number
  circleSize?: number
  gap?: number
  /** When true, the circle at index (count-1) pops in with a spring animation.
   *  Keys include the filled state so the element remounts when a circle
   *  transitions empty→filled, re-triggering the animation on live-refresh. */
  animateLastFilled?: boolean
}) {
  const layout = computeRowLayout(max)
  let index = 0

  return (
    <>
      {animateLastFilled && count > 0 && (
        <style>{`
          @keyframes stamp-pop {
            0%   { transform: scale(0.6); }
            70%  { transform: scale(1.18); }
            100% { transform: scale(1); }
          }
        `}</style>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap, alignItems: 'center', width: '100%' }}>
        {layout.map((n, r) => {
          const rowStart = index
          index += n
          return (
            <div key={r} style={{ display: 'flex', gap, justifyContent: 'center' }}>
              {Array.from({ length: n }, (_, c) => {
                const i = rowStart + c
                const filled = i < count
                const isNew = animateLastFilled && filled && i === count - 1
                return (
                  <div
                    // Key changes when filled state flips so React remounts the
                    // element, causing the animation to retrigger on each stamp.
                    key={`${r}-${c}-${String(filled)}`}
                    style={{
                      width: circleSize,
                      height: circleSize,
                      flexShrink: 0,
                      borderRadius: '50%',
                      animation: isNew
                        ? 'stamp-pop 0.35s cubic-bezier(0.34,1.56,0.64,1) both'
                        : undefined,
                    }}
                    className={filled ? 'bg-[#185FA5]' : 'border-2 border-gray-200 bg-gray-50'}
                  />
                )
              })}
            </div>
          )
        })}
      </div>
    </>
  )
}
