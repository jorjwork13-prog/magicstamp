'use client'

import { computeRowLayout } from '@/lib/stamps'

export default function StampGrid({
  count,
  max,
  circleSize = 44,
  gap = 10,
}: {
  count: number
  max: number
  circleSize?: number
  gap?: number
}) {
  const layout = computeRowLayout(max)
  let index = 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap, alignItems: 'center', width: '100%' }}>
      {layout.map((n, r) => {
        const rowStart = index
        index += n
        return (
          <div key={r} style={{ display: 'flex', gap, justifyContent: 'center' }}>
            {Array.from({ length: n }, (_, c) => {
              const i = rowStart + c
              const filled = i < count
              return (
                <div
                  key={c}
                  style={{
                    width: circleSize,
                    height: circleSize,
                    flexShrink: 0,
                    borderRadius: '50%',
                  }}
                  className={filled ? 'bg-[#185FA5]' : 'border-2 border-gray-200 bg-gray-50'}
                />
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
