'use client'

import { useEffect, useState } from 'react'

/** Copies an IBAN; the label reads "დაკოპირდა ✓" for two seconds after. */
export default function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(t)
  }, [copied])

  async function copy() {
    try {
      await navigator.clipboard.writeText(value.replace(/\s+/g, ''))
      setCopied(true)
    } catch {
      // Clipboard can be blocked (insecure context, permissions); the IBAN
      // stays selectable, so there is nothing else to do.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="shrink-0 min-h-[44px] sm:min-h-0 rounded-lg border border-dline px-3 py-1.5 text-xs font-medium text-dtext hover:border-honey hover:bg-honey/10 transition"
    >
      {copied ? 'დაკოპირდა ✓' : 'კოპირება'}
    </button>
  )
}
