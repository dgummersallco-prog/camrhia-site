import type { Metadata } from 'next'
import { BRAND_NAME } from '@/lib/brand'

export const metadata: Metadata = {
  title: `Become an Affiliate — ${BRAND_NAME}`,
  description: `Earn recurring commissions by referring wedding photographers to ${BRAND_NAME}. Tiered rates that grow as you do.`,
}

export default function AffiliateSignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
