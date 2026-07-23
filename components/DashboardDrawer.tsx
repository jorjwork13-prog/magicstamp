'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logoutAction } from '@/app/actions/auth'

/** Shared hexagon frame for every drawer icon — same size, stroke weight and
 *  corner style as the logo, so the set reads as one designed family. Icons
 *  inherit color from the link (ink in light / cream in dark, honey via
 *  text-dlink when active). Inner detail fills use --dbg2 to punch through. */
function HexIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 3 L20 7.5 L20 16.5 L12 21 L4 16.5 L4 7.5 Z" />
      {children}
    </svg>
  )
}

/* Profile / QR — hexagon with a QR finder-dot pattern */
const ProfileIcon = () => (
  <HexIcon>
    <g fill="currentColor" stroke="none">
      <rect x="8" y="8" width="2" height="2" rx="0.4" />
      <rect x="14" y="8" width="2" height="2" rx="0.4" />
      <rect x="11" y="11" width="2" height="2" rx="0.4" />
      <rect x="8" y="14" width="2" height="2" rx="0.4" />
      <rect x="14" y="14" width="2" height="2" rx="0.4" />
    </g>
  </HexIcon>
)

/* Settings — hexagon with adjustment-dial sliders */
const SettingsIcon = () => (
  <HexIcon>
    <line x1="8" y1="10.5" x2="16" y2="10.5" />
    <circle cx="13.5" cy="10.5" r="1.5" fill="var(--dbg2)" />
    <line x1="8" y1="14" x2="16" y2="14" />
    <circle cx="10.5" cy="14" r="1.5" fill="var(--dbg2)" />
  </HexIcon>
)

/* Analytics — hexagon with a rising bar-chart glyph */
const AnalyticsIcon = () => (
  <HexIcon>
    <line x1="8" y1="15.5" x2="16" y2="15.5" />
    <line x1="9.5" y1="15.5" x2="9.5" y2="13.5" />
    <line x1="12" y1="15.5" x2="12" y2="11.5" />
    <line x1="14.5" y1="15.5" x2="14.5" y2="9.5" />
  </HexIcon>
)

/* Logout — hexagon with an exit-arrow glyph */
const LogoutIcon = () => (
  <HexIcon>
    <path d="M11.5 7.8 H8.5 V16.2 H11.5" />
    <line x1="10.3" y1="12" x2="16.3" y2="12" />
    <path d="M14 9.8 L16.4 12 L14 14.2" />
  </HexIcon>
)

const NAV_ITEMS = [
  { Icon: ProfileIcon,   label: 'პროფილი',    href: '/dashboard/profile'   },
  { Icon: SettingsIcon,  label: 'პარამეტრები', href: '/dashboard/settings'  },
  { Icon: AnalyticsIcon, label: 'ანალიტიკა',  href: '/dashboard/analytics' },
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
                <span className="w-6 flex justify-center"><item.Icon /></span>
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
              <span className="w-6 flex justify-center"><LogoutIcon /></span>
              გასვლა
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
