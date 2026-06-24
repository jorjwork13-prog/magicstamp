'use client'

import { useState, useRef } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { updateBrandingAction } from '@/app/actions/settings'

export default function BrandingForm({
  businessId,
  currentBrandColor,
  currentLogoUrl,
}: {
  businessId: string
  currentBrandColor: string | null
  currentLogoUrl: string | null
}) {
  const [color, setColor]       = useState(currentBrandColor ?? '#185FA5')
  const [logoUrl, setLogoUrl]   = useState<string | null>(currentLogoUrl)
  const [status, setStatus]     = useState<{ error?: string; success?: boolean }>({})
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving]     = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus({})

    let finalLogoUrl = logoUrl

    const file = fileRef.current?.files?.[0]
    if (file) {
      setUploading(true)
      const supabase = createSupabaseBrowserClient()
      const { data, error } = await supabase.storage
        .from('logos')
        .upload(businessId, file, { upsert: true, contentType: file.type })

      if (error) {
        setStatus({ error: `ლოგოს ატვირთვა ვერ მოხერხდა: ${error.message}` })
        setUploading(false)
        return
      }

      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(data.path)
      finalLogoUrl = publicUrl
      setLogoUrl(publicUrl)
      setUploading(false)
    }

    setSaving(true)
    const result = await updateBrandingAction(color, finalLogoUrl)
    setSaving(false)
    setStatus(result ?? {})
  }

  const busy = uploading || saving

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Brand color */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          ბრენდის ფერი
        </label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-10 w-16 rounded-lg border border-gray-300 cursor-pointer p-0.5 bg-white"
          />
          <span className="text-sm text-gray-500 font-mono">{color}</span>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          ეს ფერი გამოჩნდება კლიენტის გაწევრიანების გვერდზე — ღილაკებსა და სათაურზე.
        </p>
      </div>

      {/* Logo upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          ლოგო
        </label>
        {logoUrl && (
          <div className="mb-3 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt="ლოგოს გადახედვა"
              className="h-16 max-w-[160px] object-contain rounded-xl border border-gray-100 bg-gray-50 p-1"
            />
            <button
              type="button"
              onClick={() => setLogoUrl(null)}
              className="text-xs text-red-400 hover:text-red-600 transition"
            >
              წაშლა
            </button>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 transition"
        />
        <p className="text-xs text-gray-400 mt-2">
          PNG, JPG, WebP ან SVG. კლიენტის გვერდის სათავეში გამოჩნდება.
        </p>
      </div>

      {status.error && (
        <p className="text-red-500 text-sm rounded-xl bg-red-50 px-4 py-3">{status.error}</p>
      )}
      {status.success && (
        <p className="text-green-600 text-sm rounded-xl bg-green-50 px-4 py-3 font-medium">
          შენახულია ✓
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full bg-[#185FA5] text-white rounded-xl py-3 text-sm font-bold hover:bg-[#134d87] transition disabled:opacity-60"
      >
        {uploading ? 'ლოგო იტვირთება...' : saving ? 'იტვირთება...' : 'შენახვა'}
      </button>
    </form>
  )
}
