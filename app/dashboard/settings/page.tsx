import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import SettingsForm from './SettingsForm'
import BrandingForm from './BrandingForm'

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
    <>
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <h1 className="text-lg font-semibold text-dtext px-1">პარამეტრები</h1>

        <section className="bg-dbg2 rounded-2xl shadow-sm border border-dline p-6">
          <h2 className="text-base font-semibold text-dtext mb-5">სტემპ-ბარათის პარამეტრები</h2>
          <SettingsForm
            currentMaxStamps={business.max_stamps}
            currentStartingStamps={business.starting_stamps ?? 0}
          />
        </section>

        <section className="bg-dbg2 rounded-2xl shadow-sm border border-dline p-6">
          <h2 className="text-base font-semibold text-dtext mb-1">ბრენდირება</h2>
          <p className="text-xs text-dmuted mb-5">
            ლოგო და ფერი გამოჩნდება კლიენტის გაწევრიანების გვერდზე. დაშბორდი უცვლელი რჩება.
          </p>
          <BrandingForm
            businessId={business.id}
            currentBrandColor={business.brand_color ?? null}
            currentLogoUrl={business.logo_url ?? null}
          />
        </section>
      </main>

      <footer className="max-w-3xl mx-auto px-4 py-6 flex justify-center gap-4 text-xs text-dmuted border-t border-dline">
        <Link href="/privacy" className="hover:text-dlink transition">
          კონფიდენციალურობა
        </Link>
        <span>·</span>
        <Link href="/terms" className="hover:text-dlink transition">
          პირობები
        </Link>
      </footer>
    </>
  )
}
