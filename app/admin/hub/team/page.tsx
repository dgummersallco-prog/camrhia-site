'use client'

import AffiliateShell from '@/app/affiliate/components/AffiliateShell'
import HubHome from '@/app/affiliate/components/HubHome'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export default function AdminHubPage() {
  return (
    <AffiliateShell title="Community">
      {() => <HubHome client={supabaseAdmin} />}
    </AffiliateShell>
  )
}
