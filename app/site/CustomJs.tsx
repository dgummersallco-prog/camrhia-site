'use client'

import { useEffect } from 'react'
import { runSiteJs } from '@/lib/siteJs'

// Runs only on the sites host, never on camrhia.com or the dashboard.
export default function CustomJs({ code }: { code: string }) {
  useEffect(() => {
    if (!code) return
    if (process.env.NEXT_PUBLIC_SITES_JS === 'off') return
    if (window.location.hostname !== 'sites.camrhia.com') return
    return runSiteJs(code)
  }, [code])
  return null
}
