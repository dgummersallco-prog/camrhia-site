'use client'

import { useEffect, useState } from 'react'

// Where the current site's links should point: a photographer's own domain gets
// clean paths (/galleries), camrhia.com/<name> gets /<name>/galleries, and the
// Website tab preview keeps using /site/<token>.
export function useSiteBase(token: string): string {
  const [base, setBase] = useState(`/site/${token}`)
  useEffect(() => {
    const h = window.location.hostname
    const platform = h === 'localhost' || h === 'camrhia.com' || h === 'www.camrhia.com' || h.endsWith('.netlify.app')
    if (!platform) { setBase(''); return }
    const first = window.location.pathname.split('/')[1] || ''
    setBase(first && first !== 'site' ? '/' + first : `/site/${token}`)
  }, [token])
  return base
}
