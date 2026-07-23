import Link from 'next/link'
import TaplyLogo from '@/components/TaplyLogo'
import ThemeToggle from '@/components/ThemeToggle'
import DashboardDrawer from '@/components/DashboardDrawer'

/** Shared header for every /dashboard page: hamburger + logo flush left
 *  (logo links back to /dashboard), business name + theme toggle right. */
export default function DashboardHeader({ businessName }: { businessName: string }) {
  return (
    <header className="bg-dbg2 border-b border-dline sticky top-0 z-30">
      <div className="max-w-3xl mx-auto pl-0.5 pr-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <DashboardDrawer businessName={businessName} />
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-lg px-1 hover:opacity-80 transition"
          >
            <TaplyLogo size={28} />
            <span className="text-[22px] font-bold text-dtext">Taply</span>
          </Link>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-sm text-dmuted truncate max-w-[150px] mr-1">
            {businessName}
          </span>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
