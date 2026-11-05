'use client'

import HubFeed from '@/app/affiliate/components/HubFeed'

export default function AdminHubPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 font-fraunces text-3xl font-semibold text-ink">Team Hub</h1>
      <HubFeed />
    </main>
  )
}
