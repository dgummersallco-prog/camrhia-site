import type { Metadata } from 'next'
import { BRAND_NAME } from '@/lib/brand'

export const metadata: Metadata = {
  title: `Affiliate Log in — ${BRAND_NAME}`,
  description: `Sign in to your ${BRAND_NAME} affiliate dashboard to track referrals and commissions.`,
}

export default function AffiliateLoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
