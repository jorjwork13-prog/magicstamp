'use client'

import { useState } from 'react'
import { useActionState } from 'react'
import Link from 'next/link'
import { joinAction } from '@/app/actions/join'
import StampGrid from '@/components/StampGrid'
import WalletPassCard from '@/components/WalletPassCard'
import type { CardTheme } from '@/lib/card-themes'

export default function JoinForm({
  businessId,
  businessName,
  maxStamps,
  startingStamps,
  logoUrl,
  brandColor,
  cardTheme = 'honey',
}: {
  businessId: string
  businessName: string
  maxStamps: number
  startingStamps: number
  logoUrl?: string | null
  brandColor?: string | null
  cardTheme?: CardTheme
}) {
  const [state, formAction, pending] = useActionState(joinAction, undefined)
  const accent = brandColor ?? '#F2A33C'

  // After successful registration, use the count the server actually saved
  const earnedStamps = state?.startingStamps ?? 0

  if (state?.success && state.memberId) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4 py-10">
        <div className="flex flex-col items-center space-y-5 w-full max-w-sm">
          <div className="text-center">
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={businessName} className="h-14 max-w-[160px] object-contain mx-auto mb-3" />
            )}
            <h2 className="text-xl font-bold text-ink">გამარჯობა!</h2>
            <p className="text-muted text-sm mt-1">
              შეუერთდით{' '}
              <span className="font-semibold" style={{ color: accent }}>{businessName}</span>-ს
            </p>
          </div>

          {/* Show pre-filled stamps on the success card if any were granted */}
          {earnedStamps > 0 && (
            <div className="rounded-xl px-4 py-3 text-sm font-medium" style={{ backgroundColor: `${accent}18`, color: accent }}>
              🎁 დაიწყე {earnedStamps} სტემპით!
            </div>
          )}

          {/* The member's wallet pass — the QR inside is their personal code */}
          <WalletPassCard
            businessName={businessName}
            theme={cardTheme}
            stampCount={earnedStamps}
            maxStamps={maxStamps}
            passId={state.memberId}
          />
          <p className="text-xs text-gray-400 text-center">
            ეს QR კოდი შეინახეთ — მაღაზია სტემპს ამ კოდით დაამატებს
          </p>

          <div className="w-full space-y-2">
            <WalletButton
              memberId={state.memberId}
              memberName={state.memberName ?? ''}
              businessName={businessName}
              businessId={businessId}
              brandColor={brandColor ?? null}
              logoUrl={logoUrl ?? null}
              stampCount={earnedStamps}
              maxStamps={maxStamps}
              cardTheme={cardTheme}
            />
            <AppleWalletButton
              memberId={state.memberId}
              memberName={state.memberName ?? ''}
              businessName={businessName}
              businessId={businessId}
              brandColor={brandColor ?? null}
              logoUrl={logoUrl ?? null}
              stampCount={earnedStamps}
              maxStamps={maxStamps}
              cardTheme={cardTheme}
            />
          </div>

          {/* Their own code to share. Whether *they* arrived via someone
              else's code is deliberately not surfaced — the referrer is the
              one who earns from it. */}
          {state.referralCode && (
            <ReferralCodeCard code={state.referralCode} accent={accent} />
          )}
        </div>
        <LegalFooter />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream px-4 py-10">
      <div className="max-w-sm mx-auto space-y-6">
        <div className="text-center">
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={businessName} className="h-14 max-w-[180px] object-contain mx-auto mb-3" />
          )}
          <p className="text-sm text-gray-400">კეთილი იყოს თქვენი მობრძანება</p>
          <h1 className="text-2xl font-bold mt-1" style={{ color: accent }}>{businessName}</h1>
        </div>

        <div className="bg-cream2 rounded-2xl shadow-sm border border-line p-5">
          <p className="text-xs text-muted mb-4 uppercase tracking-widest">სტემპ-ბარათი</p>
          {/* Show pre-filled circles so customers see the "head-start" before signing up */}
          <StampGrid count={startingStamps} max={maxStamps} fillColor={accent} />
          {startingStamps > 0 && (
            <p className="text-xs font-medium mt-3 text-center" style={{ color: accent }}>
              🎁 {startingStamps} სტემპი უკვე გელოდება!
            </p>
          )}
        </div>

        <div className="bg-cream2 rounded-2xl shadow-sm border border-line p-6">
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="businessId" value={businessId} />
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">სახელი</label>
              <input id="name" name="name" type="text" required placeholder="თქვენი სახელი" defaultValue={state?.values?.name}
                className="w-full rounded-xl border border-line bg-cream2 px-4 py-3 text-sm text-ink outline-none focus:border-honey focus:ring-1 focus:ring-honey transition placeholder:text-muted" />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">ტელეფონი</label>
              <input id="phone" name="phone" type="tel" required placeholder="555 00 00 00" defaultValue={state?.values?.phone}
                className="w-full rounded-xl border border-line bg-cream2 px-4 py-3 text-sm text-ink outline-none focus:border-honey focus:ring-1 focus:ring-honey transition placeholder:text-muted" />
            </div>
            <div>
              <label htmlFor="referralCode" className="block text-sm font-medium text-gray-700 mb-1.5">
                მოწვევის კოდი (არასავალდებულო)
              </label>
              <input id="referralCode" name="referralCode" type="text" placeholder="მაგ: K7X2"
                defaultValue={state?.values?.referralCode}
                maxLength={4} autoCapitalize="characters" autoComplete="off" spellCheck={false}
                aria-invalid={state?.referralError ? true : undefined}
                className={`w-full rounded-xl border bg-cream2 px-4 py-3 text-sm text-ink uppercase tracking-widest outline-none focus:ring-1 transition placeholder:text-muted placeholder:normal-case placeholder:tracking-normal ${
                  state?.referralError
                    ? 'border-amber-400 focus:border-amber-400 focus:ring-amber-400'
                    : 'border-line focus:border-honey focus:ring-honey'
                }`} />
              {state?.referralError && (
                <p className="text-amber-700 text-xs mt-1.5 leading-relaxed">{state.referralError}</p>
              )}
            </div>
            {state?.error && (
              <p className="text-red-500 text-sm rounded-xl bg-red-50 px-4 py-3">{state.error}</p>
            )}
            <button type="submit" disabled={pending}
              style={{ backgroundColor: accent }}
              className="w-full text-white rounded-xl py-4 text-base font-bold transition disabled:opacity-60 mt-2">
              {pending ? 'დამუშავება...' : 'შემოუერთდი'}
            </button>
          </form>
        </div>
        <LegalFooter />
      </div>
    </div>
  )
}

function ReferralCodeCard({ code, accent }: { code: string; accent: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2_000)
    } catch {
      // Clipboard is blocked on insecure origins and some in-app browsers —
      // the code stays selectable on screen either way.
    }
  }

  return (
    <div className="w-full rounded-2xl border border-line bg-cream2 p-4 text-center">
      <p className="text-sm text-muted">შენი მოწვევის კოდი:</p>
      <p className="text-3xl font-bold tracking-[0.3em] mt-1.5 select-all" style={{ color: accent }}>
        {code}
      </p>
      <p className="text-xs text-muted mt-1.5">გაუზიარე მეგობრებს</p>
      <button
        type="button"
        onClick={handleCopy}
        className="mt-3 w-full rounded-xl border border-line py-2.5 text-sm font-semibold text-ink hover:bg-cream transition"
      >
        {copied ? 'დაკოპირდა ✓' : 'კოპირება'}
      </button>
    </div>
  )
}

function LegalFooter() {
  return (
    <div className="flex justify-center gap-4 text-xs text-gray-400 mt-6">
      <Link href="/privacy" className="hover:text-comb transition">კონფიდენციალურობა</Link>
      <span>·</span>
      <Link href="/terms" className="hover:text-comb transition">პირობები</Link>
    </div>
  )
}

function WalletButton({ memberId, memberName, businessName, businessId, brandColor, logoUrl, stampCount, maxStamps, cardTheme }: {
  memberId: string
  memberName: string
  businessName: string
  businessId: string
  brandColor: string | null
  logoUrl: string | null
  stampCount: number
  maxStamps: number
  cardTheme: CardTheme
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function handleSave() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, memberName, stampCount, maxStamps, businessName, businessId, brandColor, logoUrl, cardTheme }),
      })
      const data = await res.json()
      if (data.saveUrl) window.open(data.saveUrl, '_blank')
    } catch {
      setError('შეცდომა. სცადეთ კვლავ.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button onClick={handleSave} disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-black text-white rounded-xl py-3 text-sm font-semibold hover:bg-gray-900 transition disabled:opacity-60">
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
          <rect x="2" y="5" width="20" height="14" rx="2" fill="white" fillOpacity="0.2" stroke="white" strokeWidth="1.5"/>
          <rect x="2" y="9" width="20" height="3" fill="white" fillOpacity="0.3"/>
          <circle cx="17" cy="15" r="2.5" fill="#4285F4"/>
          <circle cx="19.2" cy="15" r="2.5" fill="#EA4335" fillOpacity="0.85"/>
        </svg>
        {loading ? 'იტვირთება...' : 'Google Wallet-ში დამატება'}
      </button>
      {error && <p className="text-red-500 text-xs mt-2 text-center">{error}</p>}
    </div>
  )
}

/**
 * A real form POST rather than a fetch: the endpoint answers with the .pkpass
 * binary, and letting Safari navigate to it is what makes iOS hand the pass
 * straight to Wallet. A JS blob download is unreliable in in-app browsers.
 */
function AppleWalletButton({ memberId, memberName, businessName, businessId, brandColor, logoUrl, stampCount, maxStamps, cardTheme }: {
  memberId: string
  memberName: string
  businessName: string
  businessId: string
  brandColor: string | null
  logoUrl: string | null
  stampCount: number
  maxStamps: number
  cardTheme: CardTheme
}) {
  return (
    <form action="/api/wallet/apple" method="POST">
      <input type="hidden" name="memberId" value={memberId} />
      <input type="hidden" name="memberName" value={memberName} />
      <input type="hidden" name="businessName" value={businessName} />
      <input type="hidden" name="businessId" value={businessId} />
      <input type="hidden" name="brandColor" value={brandColor ?? ''} />
      <input type="hidden" name="logoUrl" value={logoUrl ?? ''} />
      <input type="hidden" name="stampCount" value={stampCount} />
      <input type="hidden" name="maxStamps" value={maxStamps} />
      <input type="hidden" name="cardTheme" value={cardTheme} />
      <button type="submit"
        className="w-full flex items-center justify-center gap-2 bg-black text-white rounded-xl py-3 text-sm font-semibold hover:bg-gray-900 transition">
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="white" aria-hidden="true">
          <path d="M16.36 12.73c-.02-2.02 1.65-2.99 1.73-3.04-.94-1.38-2.41-1.57-2.93-1.59-1.25-.13-2.44.73-3.07.73-.63 0-1.61-.71-2.65-.69-1.36.02-2.62.79-3.32 2.01-1.41 2.45-.36 6.08 1.02 8.07.67.97 1.48 2.07 2.53 2.03 1.02-.04 1.4-.66 2.63-.66s1.58.66 2.65.64c1.09-.02 1.79-1 2.46-1.98.77-1.13 1.09-2.23 1.11-2.29-.02-.01-2.14-.82-2.16-3.25zM14.5 6.9c.56-.68.94-1.62.83-2.56-.81.03-1.79.54-2.36 1.21-.51.6-.96 1.56-.84 2.48.9.07 1.82-.46 2.37-1.13z"/>
        </svg>
        Apple Wallet-ში დამატება
      </button>
    </form>
  )
}
