'use client'

import { useState, useTransition } from 'react'
import { STAMP_ICONS, STAMP_ICON_LABELS, glyphMarkup, type StampIcon } from '@/lib/stamp-icons'
import { updateStampIconAction } from '@/app/actions/stamp-icon'

/** Small filled+empty pair, previewing the glyph exactly as it draws on the
 *  actual wallet pass (same glyphMarkup the pass renderer calls). */
function GlyphPreview({ icon }: { icon: StampIcon }) {
  const palette = { stampFill: '#F2A33C', stampHole: '#FFFDF8', stampEmpty: '#E3D9C6', emptyOpacity: 1 }
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
      {[true, false].map((filled) => (
        <svg key={String(filled)} width={40} height={40} viewBox="0 0 100 100" aria-hidden="true">
          <g dangerouslySetInnerHTML={{ __html: glyphMarkup(icon, filled, palette) }} />
        </svg>
      ))}
    </div>
  )
}

export default function StampIconForm({ currentIcon }: { currentIcon: StampIcon }) {
  const [selected, setSelected] = useState<StampIcon>(currentIcon)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [pending, startTransition] = useTransition()

  function choose(icon: StampIcon) {
    if (icon === selected || pending) return
    const previous = selected
    setSelected(icon)
    setSaved(false)
    setError(null)
    startTransition(async () => {
      const result = await updateStampIconAction(icon)
      if (result?.error) {
        setSelected(previous)
        setError(result.error)
      } else {
        setSaved(true)
      }
    })
  }

  return (
    <div>
      <div className="flex flex-wrap gap-4">
        {STAMP_ICONS.map((icon) => {
          const active = icon === selected
          return (
            <button
              key={icon}
              type="button"
              onClick={() => choose(icon)}
              disabled={pending}
              aria-pressed={active}
              className={`rounded-2xl p-4 transition text-center bg-dbg ${
                active ? 'ring-2 ring-honey' : 'ring-1 ring-dline hover:ring-honey/60'
              } disabled:opacity-70`}
            >
              <GlyphPreview icon={icon} />
              <p className="text-xs font-semibold text-dtext mt-3">
                {STAMP_ICON_LABELS[icon].labelKa}
                {active && <span className="text-dlink"> ✓</span>}
              </p>
            </button>
          )
        })}
      </div>

      {error && (
        <p className="text-red-500 text-sm rounded-xl bg-red-50 px-4 py-3 mt-4">{error}</p>
      )}
      {saved && !pending && (
        <p className="text-green-600 text-sm rounded-xl bg-green-50 px-4 py-3 mt-4 font-medium">
          შენახულია ✓
        </p>
      )}
    </div>
  )
}
