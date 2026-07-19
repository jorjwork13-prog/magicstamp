import type { Metadata } from 'next'
import DemoClient from './DemoClient'

export const metadata: Metadata = {
  title: 'Taply — შენი ბარათი, ტელეფონში',
  description:
    'ნახე, როგორი იქნება შენი ლოიალობის ბარათი — შენთვის და შენი კლიენტისთვის.',
}

/* Conversion showcase scanned from business cards / Instagram bio.
   Fully static: no members are created, no wallet passes are issued,
   and nothing here touches Supabase — the page renders even if the
   database is down. The real join flow stays at /join/[businessId]. */
export default function DemoPage() {
  return <DemoClient />
}
