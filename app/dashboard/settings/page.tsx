import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import SettingsForm from './SettingsForm'
import BrandingForm from './BrandingForm'
import CardThemeForm from './CardThemeForm'
import StampIconForm from './StampIconForm'
import BillingDetailsForm from './BillingDetailsForm'
import { isCardTheme } from '@/lib/card-themes'
import { isStampIcon } from '@/lib/stamp-icons'
import { selectBusinessWithTheme } from '@/lib/business-select'

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: business } = await selectBusinessWithTheme(
    supabase,
    'id, name, max_stamps, starting_stamps, brand_color, logo_url',
    'email',
    user.email!,
  )

  if (!business) redirect('/login')

  // Separate from the query above so a missing billing column can't take the
  // rest of the settings page down with it.
  const { data: legal } = await supabase
    .from('businesses')
    .select('legal_name, tax_id, legal_address')
    .eq('id', business.id)
    .single()

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
          <h2 className="text-base font-semibold text-dtext mb-1">ბარათის თემა</h2>
          <p className="text-xs text-dmuted mb-5">
            აირჩიე, როგორ გამოიყურება კლიენტის ბარათი — არჩევა მაშინვე ინახება.
          </p>
          <CardThemeForm
            currentTheme={isCardTheme(business.card_theme) ? business.card_theme : 'honey'}
            businessName={business.name}
            maxStamps={business.max_stamps}
            icon={isStampIcon(business.stamp_icon) ? business.stamp_icon : 'hex'}
          />
        </section>

        <section className="bg-dbg2 rounded-2xl shadow-sm border border-dline p-6">
          <h2 className="text-base font-semibold text-dtext mb-1">სტემპის ხატულა</h2>
          <p className="text-xs text-dmuted mb-5">
            აირჩიე ხატულა, რომელიც ბიზნესს ყველაზე მეტად შეესაბამება — ცვლილება ბარათის პროგრესის ბადეზეც აისახება.
          </p>
          <StampIconForm currentIcon={isStampIcon(business.stamp_icon) ? business.stamp_icon : 'hex'} />
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

        <section id="billing-details" className="bg-dbg2 rounded-2xl shadow-sm border border-dline p-6 scroll-mt-20">
          <h2 className="text-base font-semibold text-dtext mb-1">იურიდიული რეკვიზიტები</h2>
          <p className="text-xs text-dmuted mb-5">
            ეს მონაცემები იწერება თქვენს ინვოისებზე, რომ ბუღალტერიამ ისინი მიიღოს.
          </p>
          <BillingDetailsForm
            currentLegalName={legal?.legal_name ?? null}
            currentTaxId={legal?.tax_id ?? null}
            currentLegalAddress={legal?.legal_address ?? null}
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
