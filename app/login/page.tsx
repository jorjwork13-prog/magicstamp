'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { loginAction } from '@/app/actions/auth'
import TaplyLogo from '@/components/TaplyLogo'
import LoginBees from '@/components/LoginBees'

const cardStyle: React.CSSProperties = {
  background: 'var(--boxbg, rgba(255,253,248,.93))',
  borderColor: 'var(--boxline, #E3D9C6)',
  color: 'var(--boxtxt, #2B2118)',
  backdropFilter: 'blur(6px)',
  boxShadow: '0 18px 40px rgba(43,33,24,.14)',
  transition: 'background .8s, border-color .8s, color .8s',
}

const fieldStyle: React.CSSProperties = {
  background: 'var(--fldbg, #fff)',
  borderColor: 'var(--boxline, #E3D9C6)',
  color: 'var(--boxtxt, #2B2118)',
  transition: 'background .8s, border-color .8s, color .8s',
}

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, undefined)

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4">
      <LoginBees />
      <div className="relative z-10 w-full max-w-md rounded-2xl border p-8" style={cardStyle}>
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-1">
            <TaplyLogo size={28} />
            <span className="text-3xl font-bold">Taply</span>
          </div>
          <p className="text-muted text-sm">შედით თქვენს ანგარიშში</p>
        </div>

        <form action={action} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1.5">
              ელ-ფოსტა
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              style={fieldStyle}
              className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none focus:!border-honey focus:ring-1 focus:ring-honey placeholder:text-muted"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1.5">
              პაროლი
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="••••••••"
              style={fieldStyle}
              className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none focus:!border-honey focus:ring-1 focus:ring-honey placeholder:text-muted"
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
            {pending ? 'გთხოვთ მოიცადოთ...' : 'შესვლა'}
          </button>
        </form>

        <p className="text-center text-sm text-muted mt-6">
          არ გაქვთ ანგარიში?{' '}
          <Link href="/register" className="text-comb font-medium hover:underline">
            რეგისტრაცია
          </Link>
        </p>
      </div>
    </div>
  )
}
