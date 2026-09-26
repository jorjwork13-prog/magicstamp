'use client'

import { useActionState } from 'react'
import { updateBillingDetailsAction } from './actions'

const INPUT =
  'w-full rounded-xl border border-dline px-4 py-3 text-sm text-dtext outline-none focus:border-honey focus:ring-1 focus:ring-honey transition bg-dbg2'

export default function BillingDetailsForm({
  currentLegalName,
  currentTaxId,
  currentLegalAddress,
}: {
  currentLegalName: string | null
  currentTaxId: string | null
  currentLegalAddress: string | null
}) {
  const [state, formAction, pending] = useActionState(updateBillingDetailsAction, undefined)

  return (
    <form action={formAction} className="space-y-6">
      <div>
        <label htmlFor="legal_name" className="block text-sm font-medium text-dtext mb-2">
          იურიდიული დასახელება
        </label>
        <input
          id="legal_name"
          name="legal_name"
          type="text"
          maxLength={200}
          defaultValue={currentLegalName ?? ''}
          placeholder="შ.პ.ს. „...“"
          className={INPUT}
        />
      </div>

      <div>
        <label htmlFor="tax_id" className="block text-sm font-medium text-dtext mb-2">
          საიდენტიფიკაციო კოდი (ს/კ)
        </label>
        <input
          id="tax_id"
          name="tax_id"
          type="text"
          inputMode="numeric"
          pattern="\d{9}|\d{11}"
          title="მხოლოდ ციფრები — 9 ან 11 სიმბოლო"
          maxLength={11}
          defaultValue={currentTaxId ?? ''}
          className={`${INPUT} tabular-nums`}
        />
        <p className="text-xs text-dmuted mt-2">
          9 ციფრი კომპანიისთვის, 11 — ინდ. მეწარმისთვის. იწერება ინვოისზე.
        </p>
      </div>

      <div>
        <label htmlFor="legal_address" className="block text-sm font-medium text-dtext mb-2">
          იურიდიული მისამართი
        </label>
        <input
          id="legal_address"
          name="legal_address"
          type="text"
          maxLength={300}
          defaultValue={currentLegalAddress ?? ''}
          className={INPUT}
        />
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
