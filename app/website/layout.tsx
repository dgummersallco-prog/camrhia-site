'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardHeader } from '@/app/components/DashboardHeader'

// Website builder is locked until launch. Open any /website page with ?preview=1 once to unlock it in your browser (?preview=0 locks it again).
export default function WebsiteLayout({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<'checking' | 'open' | 'locked'>('checking')

  useEffect(() => {
    let open = false
    try {
      const q = new URLSearchParams(window.location.search).get('preview')
      if (q === '1') localStorage.setItem('camrhia-website-preview', '1')
      if (q === '0') localStorage.removeItem('camrhia-website-preview')
      open = localStorage.getItem('camrhia-website-preview') === '1'
    } catch {}
    setState(open ? 'open' : 'locked')
  }, [])

  if (state === 'checking') return null
  if (state === 'open') return <>{children}</>

  return (
    <div className="min-h-screen bg-paper xl:pl-60">
      <DashboardHeader active="website" />
      <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-6 py-16 text-center">
        <p className="mb-3 font-mono text-xs uppercase tracking-widest text-brass">Coming soon</p>
        <h1 className="font-fraunces text-4xl font-semibold text-ink">Your website is on its way</h1>
        <p className="mt-4 text-ink-soft">We&apos;re putting the finishing touches on the website builder. Everything else in Camrhia is ready to use today.</p>
        <Link href="/dashboard" className="mt-8 rounded-xl bg-twilight px-6 py-3 text-sm font-medium text-white transition hover:opacity-90">Back to dashboard</Link>
      </main>
    </div>
  )
}
