'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'taply-dash-theme'

/** Sun/moon toggle for the dashboard-only dark mode. The current theme
 *  lives on <html data-dash-theme> (pre-set before paint by the inline
 *  script in the dashboard layout) and persists in localStorage. */
export default function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null)

  useEffect(() => {
    // Reconcile from storage: on client-side navigation into the dashboard
    // the root layout's init script does not re-run, so apply it here too.
    let stored: string | null = null
    try {
      stored = localStorage.getItem(STORAGE_KEY)
    } catch {}
    const isDark = stored
      ? stored === 'dark'
      : document.documentElement.dataset.dashTheme === 'dark'
    if (isDark) {
      document.documentElement.dataset.dashTheme = 'dark'
    } else {
      delete document.documentElement.dataset.dashTheme
    }
    setDark(isDark)
  }, [])

  function toggle() {
    const next = !dark
    setDark(next)
    if (next) {
      document.documentElement.dataset.dashTheme = 'dark'
    } else {
      delete document.documentElement.dataset.dashTheme
    }
    try {
      localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light')
    } catch {}
  }

  return (
    <button
      onClick={toggle}
      aria-label={dark ? 'ღია რეჟიმი' : 'მუქი რეჟიმი'}
      className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-honey/15 transition"
      style={{ color: 'var(--dburger)' }}
    >
      {/* render both icons only after mount to avoid a hydration mismatch */}
      {dark === null ? null : dark ? (
        /* sun */
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" fill="currentColor" />
          <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8" />
        </svg>
      ) : (
        /* moon */
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.5 14.6a8.5 8.5 0 1 1-11-11 7 7 0 1 0 11 11z" />
        </svg>
      )}
    </button>
  )
}
