'use client'

import type { ReactNode } from 'react'

// Copies the referral code so the app can pick it up on first launch.
export default function CopyRefOnClick({ code, children }: { code: string; children: ReactNode }) {
  return (
    <span
      onClick={() => {
        try {
          navigator.clipboard.writeText(`camrhia-ref:${code}`)
        } catch {}
      }}
    >
      {children}
    </span>
  )
}
