import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import SettingsForm from './SettingsForm'
import BrandingForm from './BrandingForm'
import TaplyLogo from '@/components/TaplyLogo'

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, max_stamps, starting_stamps, brand_color, logo_url')
    .eq('email', user.email!)
    .single()

  if (!business) redirect('/login')

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-cream2 border-b border-line sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-sm text-muted hover:text-comb transition"
            >
              ← უკან
            </Link>
            <span className="flex items-center gap-2">
              <TaplyLogo size={22} />
              <span className="text-lg font-bold text-ink">Taply</span>
            </span>
          </div>
          <span className="text-sm text-gray-500 truncate max-w-[180px]">{business.name}</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <section className="bg-cream2 rounded-2xl shadow-sm border border-line p-6">
          <h2 className="text-base font-semibold text-ink mb-5">სტემპ-ბარათის პარამეტრები</h2>
          <SettingsForm
            currentMaxStamps={business.max_stamps}
            currentStartingStamps={business.starting_stamps ?? 0}
          />
        </section>

        <section className="bg-cream2 rounded-2xl shadow-sm border border-line p-6">
          <h2 className="text-base font-semibold text-ink mb-1">ბრენდირება</h2>
          <p className="text-xs text-gray-400 mb-5">
            ლოგო და ფერი გამოჩნდება კლიენტის გაწევრიანების გვერდზე. დაშბორდი უცვლელი რჩება.
          </p>
          <BrandingForm
            businessId={business.id}
            currentBrandColor={business.brand_color ?? null}
            currentLogoUrl={business.logo_url ?? null}
          />
        </section>
      </main>

      <footer className="max-w-3xl mx-auto px-4 py-6 flex justify-center gap-4 text-xs text-muted border-t border-line">
        <Link href="/privacy" className="hover:text-comb transition">
          კონფიდენციალურობა
        </Link>
        <span>·</span>
        <Link href="/terms" className="hover:text-comb transition">
          პირობები
        </Link>
      </footer>
    </div>
  )
}
