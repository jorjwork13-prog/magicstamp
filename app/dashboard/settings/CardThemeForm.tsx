'use client'

import { useState, useTransition } from 'react'
import WalletPassCard from '@/components/WalletPassCard'
import { CARD_THEMES, CARD_THEME_SPECS, type CardTheme } from '@/lib/card-themes'
import { updateCardThemeAction } from '@/app/actions/card-theme'

/* Mini preview: the real WalletPassCard scaled down inside a fixed-size
   clickable frame. 340px-wide card at 0.42 ≈ 143px columns. */
const SCALE = 0.42

export default function CardThemeForm({
  currentTheme,
  businessName,
  maxStamps,
}: {
  currentTheme: CardTheme
  businessName: string
  maxStamps: number
}) {
  const [selected, setSelected] = useState<CardTheme>(currentTheme)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [pending, startTransition] = useTransition()

  function choose(theme: CardTheme) {
    if (theme === selected || pending) return
    const previous = selected
    setSelected(theme)
    setSaved(false)
    setError(null)
    startTransition(async () => {
      const result = await updateCardThemeAction(theme)
      if (result?.error) {
        setSelected(previous)
        setError(result.error)
      } else {
        setSaved(true)
      }
    })
  }

  const previewStamps = Math.min(7, Math.max(1, maxStamps - 3))

  return (
    <div>
      <div className="flex flex-wrap gap-4">
        {CARD_THEMES.map((theme) => {
          const active = theme === selected
          return (
            <button
              key={theme}
              type="button"
              onClick={() => choose(theme)}
              disabled={pending}
              aria-pressed={active}
              className={`rounded-2xl p-2 transition text-left ${
                active ? 'ring-2 ring-honey' : 'ring-1 ring-dline hover:ring-honey/60'
              } disabled:opacity-70`}
            >
              <div
                style={{
                  width: 340 * SCALE,
                  height: 580 * SCALE,
                  overflow: 'hidden',
                  borderRadius: 12,
                }}
              >
                <div style={{ transform: `scale(${SCALE})`, transformOrigin: 'top left' }}>
                  <WalletPassCard
                    businessName={businessName}
                    theme={theme}
                    stampCount={previewStamps}
                    maxStamps={maxStamps}
                    passId="preview"
                    qrValue="https://taply.ge"
                  />
                </div>
              </div>
              <p className="text-xs font-semibold text-dtext text-center mt-2">
                {CARD_THEME_SPECS[theme].label}
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
