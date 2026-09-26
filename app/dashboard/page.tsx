import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import QrScanner from './QrScanner'
import MembersTable from './MembersTable'
import { isCardTheme } from '@/lib/card-themes'
import { isStampIcon } from '@/lib/stamp-icons'
import { selectBusinessWithTheme } from '@/lib/business-select'
import {
  INVOICE_COLUMNS,
  SUBSCRIPTION_COLUMNS,
  computeBillingState,
  type InvoiceRow,
  type SubscriptionRow,
} from '@/lib/billing'
import BillingBanner from './billing/BillingBanner'

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: business } = await selectBusinessWithTheme(
    supabase,
    'id, name, max_stamps, brand_color',
    'email',
    user.email!,
  )

  if (!business) redirect('/login')

  const { data: members } = await supabase
    .from('members')
    .select('id, name, phone, stamp_count, created_at')
    .eq('business_id', business.id)
    .order('created_at', { ascending: false })

  const [{ data: sub }, { data: openInvoices }] = await Promise.all([
    supabase
      .from('subscriptions')
      .select(SUBSCRIPTION_COLUMNS)
      .eq('business_id', business.id)
      .maybeSingle(),
    supabase
      .from('invoices')
      .select(INVOICE_COLUMNS)
      .eq('business_id', business.id)
      .eq('status', 'open')
      .order('period_start', { ascending: true }),
  ])
  const open = (openInvoices ?? []) as InvoiceRow[]
  const billingState = sub ? computeBillingState(sub as SubscriptionRow, open) : null

  return (
    <>
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {billingState && (
          <BillingBanner state={billingState} openInvoices={open} href="/dashboard/billing" />
        )}

        {/* QR Scanner */}
        <section className="bg-dbg2 rounded-2xl shadow-sm border border-dline p-6">
          <h2 className="text-base font-semibold text-dtext mb-5">სკანირება</h2>
          <QrScanner
            businessId={business.id}
            maxStamps={business.max_stamps}
            brandColor={business.brand_color ?? null}
            cardTheme={isCardTheme(business.card_theme) ? business.card_theme : null}
            stampIcon={isStampIcon(business.stamp_icon) ? business.stamp_icon : 'hex'}
          />
        </section>

        {/* Members table */}
        <section className="bg-dbg2 rounded-2xl shadow-sm border border-dline p-6">
          <MembersTable
            members={members ?? []}
            maxStamps={business.max_stamps}
            cardTheme={isCardTheme(business.card_theme) ? business.card_theme : 'honey'}
          />
        </section>
      </main>

      <footer className="max-w-3xl mx-auto px-4 py-6 flex justify-center gap-4 text-xs text-dmuted border-t border-dline">
        <Link href="/privacy" className="hover:text-dlink transition">კონფიდენციალურობა</Link>
        <span>·</span>
        <Link href="/terms" className="hover:text-dlink transition">პირობები</Link>
      </footer>
    </>
  )
}
