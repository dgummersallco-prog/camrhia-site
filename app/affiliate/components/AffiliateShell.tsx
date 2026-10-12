'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { BRAND_NAME } from '@/lib/brand'
import AffiliateTabs from './AffiliateTabs'

export type ShellAffiliate = {
  id: string
  name: string | null
  referral_code: string
  is_master: boolean | null
  commission_rate: number | null
  override_rate: number | null
  parent_affiliate_id: string | null
}

export default function AffiliateShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: (a: ShellAffiliate) => ReactNode
}) {
  const router = useRouter()
  const [affiliate, setAffiliate] = useState<ShellAffiliate | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const client = supabase
    if (!client) { setLoading(false); return }
    let cancelled = false
    ;(async () => {
      const { data: { session } } = await client.auth.getSession()
      if (!session) { router.replace('/affiliate/login'); return }
      const { data } = await client
        .from('affiliates')
        .select('id, name, referral_code, is_master, commission_rate, override_rate, parent_affiliate_id')
        .eq('id', session.user.id)
        .maybeSingle()
      if (!cancelled) {
        setAffiliate((data as ShellAffiliate | null) ?? null)
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [router])

  async function signOut() {
    if (supabase) await supabase.auth.signOut()
    router.replace('/affiliate/login')
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-6 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="font-fraunces text-lg font-semibold text-ink hover:text-twilight transition-colors">
            {BRAND_NAME} <span className="text-ink-soft font-normal">/ affiliate</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden sm:block text-sm text-ink-soft">{affiliate?.name}</span>
            <button onClick={signOut} className="text-sm text-ink-soft hover:text-ink transition-colors">Sign out</button>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-5xl px-6 py-10 space-y-8">
        <AffiliateTabs />
        <div>
          <h1 className="font-fraunces text-3xl font-semibold text-ink">{title}</h1>
          {subtitle ? <p className="mt-2 text-sm text-ink-soft max-w-2xl">{subtitle}</p> : null}
        </div>
        {loading ? (
          <p className="text-sm text-ink-soft">Loading…</p>
        ) : affiliate ? (
          children(affiliate)
        ) : (
          <p className="text-sm text-ink-soft">
            No affiliate account found. <Link href="/affiliate/dashboard" className="text-twilight underline">Go to Overview</Link> to activate it.
          </p>
        )}
      </main>
    </div>
  )
}
