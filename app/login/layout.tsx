import type { Metadata } from 'next'
import { BRAND_NAME } from '@/lib/brand'

export const metadata: Metadata = {
  title: `Log in — ${BRAND_NAME}`,
  description: `Sign in to your ${BRAND_NAME} photographer account.`,
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
