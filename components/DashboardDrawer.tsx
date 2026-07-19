'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logoutAction } from '@/app/actions/auth'

const NAV_ITEMS = [
  { icon: '👤', label: 'პროფილი',    href: '/dashboard/profile'   },
  { icon: '⚙️', label: 'პარამეტრები', href: '/dashboard/settings'  },
  { icon: '📊', label: 'ანალიტიკა',  href: '/dashboard/analytics' },
]

export default function DashboardDrawer({ businessName }: { businessName: string }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <>
      {/* Hamburger button — ink in light / cream in dark, honey-tint hover */}
      <button
        onClick={() => setOpen(true)}
        aria-label="მენიუ"
        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-honey/15 transition"
        style={{ color: 'var(--dtext)' }}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <path d="M4 6.5h16M4 12h16M4 17.5h16" />
        </svg>
      </button>

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 transition-opacity duration-300"
        style={{ opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none' }}
        onClick={() => setOpen(false)}
      />

      {/* Drawer panel */}
      <div
        className="fixed inset-y-0 left-0 z-50 w-72 bg-dbg2 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out"
        style={{ transform: open ? 'translateX(0)' : 'translateX(-100%)' }}
      >
        {/* Close button */}
        <button
          onClick={() => setOpen(false)}
          aria-label="დახურვა"
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full text-dmuted hover:bg-honey/15 transition text-lg"
        >
          ✕
        </button>

        {/* Business header */}
        <div className="px-6 pt-6 pb-5 border-b border-dline">
          <p className="text-[10px] text-dmuted uppercase tracking-widest font-medium mb-1">Taply</p>
          <p className="font-semibold text-dtext truncate pr-8">{businessName}</p>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-6 py-3.5 text-sm font-medium transition-colors rounded-none ${
                  active
                    ? 'bg-honey/15 text-dlink'
                    : 'text-dtext hover:bg-honey/10 hover:text-dlink'
                }`}
              >
                <span className="text-base w-6 text-center">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="border-t border-dline p-4">
          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-dmuted hover:bg-red-500/10 hover:text-red-500 rounded-xl transition"
            >
              <span className="text-base w-6 text-center">🚪</span>
              გასვლა
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
