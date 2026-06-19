'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { registerAction } from '@/app/actions/auth'

export default function RegisterPage() {
  const [state, action, pending] = useActionState(registerAction, undefined)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="text-center mb-8">
          <div className="text-3xl font-bold text-[#185FA5] mb-1">MagicStamp</div>
          <p className="text-gray-500 text-sm">შექმენით თქვენი ბიზნეს ანგარიში</p>
        </div>

        <form action={action} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
              ბიზნესის სახელი
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="მაგ: კაფე ბათუმი"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-[#185FA5] focus:ring-1 focus:ring-[#185FA5] transition placeholder:text-gray-500"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
              ელ-ფოსტა
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-[#185FA5] focus:ring-1 focus:ring-[#185FA5] transition placeholder:text-gray-500"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
              პაროლი
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              placeholder="მინიმუმ 6 სიმბოლო"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-[#185FA5] focus:ring-1 focus:ring-[#185FA5] transition placeholder:text-gray-500"
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
            className="w-full bg-[#185FA5] text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-[#134d87] active:bg-[#0f3d6b] transition disabled:opacity-60 mt-2"
          >
            {pending ? 'გთხოვთ მოიცადოთ...' : 'რეგისტრაცია'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          უკვე გაქვთ ანგარიში?{' '}
          <Link href="/login" className="text-[#185FA5] font-medium hover:underline">
            შესვლა
          </Link>
        </p>
      </div>
    </div>
  )
}
