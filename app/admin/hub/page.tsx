'use client'

import HubHome from '@/app/affiliate/components/HubHome'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export default function AdminHubPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 font-fraunces text-3xl font-semibold text-ink">Team Hub</h1>
      <HubHome client={supabaseAdmin} />
    </main>
  )
}
