'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { registerAction } from '@/app/actions/auth'
import TaplyLogo from '@/components/TaplyLogo'

export default function RegisterPage() {
  const [state, action, pending] = useActionState(registerAction, undefined)

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4">
      <div className="w-full max-w-md bg-cream2 rounded-2xl shadow-sm border border-line p-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-1">
            <TaplyLogo size={28} />
            <span className="text-3xl font-bold text-ink">Taply</span>
          </div>
          <p className="text-muted text-sm">შექმენით თქვენი ბიზნეს ანგარიში</p>
        </div>

        <form action={action} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-ink mb-1.5">
              ბიზნესის სახელი
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="მაგ: კაფე ბათუმი"
              className="w-full rounded-lg border border-line bg-cream2 px-4 py-2.5 text-sm text-ink outline-none focus:border-honey focus:ring-1 focus:ring-honey transition placeholder:text-muted"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-ink mb-1.5">
              ელ-ფოსტა
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className="w-full rounded-lg border border-line bg-cream2 px-4 py-2.5 text-sm text-ink outline-none focus:border-honey focus:ring-1 focus:ring-honey transition placeholder:text-muted"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-ink mb-1.5">
              პაროლი
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              placeholder="მინიმუმ 6 სიმბოლო"
              className="w-full rounded-lg border border-line bg-cream2 px-4 py-2.5 text-sm text-ink outline-none focus:border-honey focus:ring-1 focus:ring-honey transition placeholder:text-muted"
            />
          </div>

          {state?.error && (
            <p className="text-red-500 text-sm rounded-lg bg-red-50 px-4 py-2.5">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full bg-honey text-ink rounded-lg py-2.5 text-sm font-semibold hover:bg-comb active:bg-comb transition disabled:opacity-60 mt-2"
          >
            {pending ? 'გთხოვთ მოიცადოთ...' : 'რეგისტრაცია'}
          </button>
        </form>

        <p className="text-center text-sm text-muted mt-6">
          უკვე გაქვთ ანგარიში?{' '}
          <Link href="/login" className="text-comb font-medium hover:underline">
            შესვლა
          </Link>
        </p>
      </div>
    </div>
  )
}
