'use client'

import AffiliateShell from '../../components/AffiliateShell'
import HubHome from '../../components/HubHome'

export default function HubPage() {
  return (
    <AffiliateShell title="Community" subtitle="Share what is working, swap ideas, and learn from each other.">
      {() => <HubHome />}
    </AffiliateShell>
  )
}
