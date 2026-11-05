import type { Metadata } from 'next'
import { BRAND_NAME } from '@/lib/brand'
import RecruitCapture from './RecruitCapture'

export const metadata: Metadata = {
  title: `Become an Affiliate — ${BRAND_NAME}`,
  description: `Earn recurring commissions by referring photographers to ${BRAND_NAME}. 30% recurring on every photographer you sign. No cap.`,
}

export default function AffiliateSignupLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <RecruitCapture />
      {children}
    </>
  )
}
