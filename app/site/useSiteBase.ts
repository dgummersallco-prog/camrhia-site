'use client'

import { useEffect, useState } from 'react'

// Where the current site's links should point: a photographer's own domain gets
// clean paths (/galleries), camrhia.com/<name> and sites.camrhia.com/<name> get
// /<name>/galleries, and the Website tab preview keeps using /site/<token>.
const isPlatform = (h: string) => h === 'localhost' || h === 'camrhia.com' || h.endsWith('.camrhia.com') || h.endsWith('.netlify.app')

export function useSiteBase(token: string): string {
  const [base, setBase] = useState(`/site/${token}`)
  useEffect(() => {
    const h = window.location.hostname
    const platform = isPlatform(h)
    if (!platform) { setBase(''); return }
    const first = window.location.pathname.split('/')[1] || ''
    setBase(first && first !== 'site' ? '/' + first : `/site/${token}`)
  }, [token])
  return base
}
