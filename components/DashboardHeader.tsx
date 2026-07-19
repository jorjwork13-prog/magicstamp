import Link from 'next/link'
import TaplyLogo from '@/components/TaplyLogo'
import ThemeToggle from '@/components/ThemeToggle'
import DashboardDrawer from '@/components/DashboardDrawer'

/** Shared header for every /dashboard page: logo on the left linking back
 *  to /dashboard, theme toggle + hamburger drawer on the right. */
export default function DashboardHeader({ businessName }: { businessName: string }) {
  return (
    <header className="bg-dbg2 border-b border-dline sticky top-0 z-10">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-lg -ml-1 px-1 hover:opacity-80 transition"
        >
          <TaplyLogo size={22} />
          <span className="text-lg font-bold text-dtext">Taply</span>
        </Link>

        <div className="flex items-center gap-1.5">
          <span className="text-sm text-dmuted truncate max-w-[150px] mr-1.5">
            {businessName}
          </span>
          <ThemeToggle />
          <DashboardDrawer businessName={businessName} />
        </div>
      </div>
    </header>
  )
}
