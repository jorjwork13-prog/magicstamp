'use client'

import { useActionState } from 'react'
import { updateSettingsAction } from '@/app/actions/settings'

const MAX_OPTIONS     = [3, 4, 5, 6, 8, 10, 12, 15, 20]
const STARTING_OPTIONS = [0, 1, 2, 3]

export default function SettingsForm({
  currentMaxStamps,
  currentStartingStamps,
}: {
  currentMaxStamps: number
  currentStartingStamps: number
}) {
  const [state, formAction, pending] = useActionState(updateSettingsAction, undefined)

  return (
    <form action={formAction} className="space-y-6">
      {/* Max stamps */}
      <div>
        <label htmlFor="max_stamps" className="block text-sm font-medium text-dtext mb-2">
          სტემპების რაოდენობა
        </label>
        <select
          id="max_stamps"
          name="max_stamps"
          defaultValue={currentMaxStamps}
          className="w-full rounded-xl border border-dline px-4 py-3 text-sm text-dtext outline-none focus:border-honey focus:ring-1 focus:ring-honey transition bg-dbg2"
        >
          {MAX_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n} სტემპი
            </option>
          ))}
        </select>
        <p className="text-xs text-dmuted mt-2">
          ეს განსაზღვრავს, რამდენი სტემპი სჭირდება ერთი ბარათის შევსებას.
        </p>
      </div>

      {/* Starting stamps */}
      <div>
        <label htmlFor="starting_stamps" className="block text-sm font-medium text-dtext mb-2">
          წინასწარ შევსებული სტემპები ახალი კლიენტებისთვის
        </label>
        <select
          id="starting_stamps"
          name="starting_stamps"
          defaultValue={currentStartingStamps}
          className="w-full rounded-xl border border-dline px-4 py-3 text-sm text-dtext outline-none focus:border-honey focus:ring-1 focus:ring-honey transition bg-dbg2"
        >
          {STARTING_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n === 0 ? '0 — გამორთულია' : `${n} სტემპი`}
            </option>
          ))}
        </select>
        <p className="text-xs text-dmuted mt-2">
          მხოლოდ ახლად რეგისტრირებულ კლიენტებს მიენიჭებათ ეს სტემპები.
          უკვე არსებული კლიენტები არ შეიცვლებიან.
        </p>
      </div>

      {state?.error && (
        <p className="text-red-500 text-sm rounded-xl bg-red-50 px-4 py-3">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-green-600 text-sm rounded-xl bg-green-50 px-4 py-3 font-medium">
          შენახულია ✓
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-honey text-ink rounded-xl py-3 text-sm font-bold hover:bg-comb transition disabled:opacity-60"
      >
        {pending ? 'იტვირთება...' : 'შენახვა'}
      </button>
    </form>
  )
}
