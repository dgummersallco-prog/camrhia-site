'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { supabaseAffiliate as supabase } from '@/lib/supabaseAffiliate'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import AffiliateTabs from './AffiliateTabs'

export type ShellAffiliate = {
  id: string
  name: string | null
  referral_code: string
  team_code: string | null
  is_master: boolean | null
  commission_rate: number | null
  override_rate: number | null
  parent_affiliate_id: string | null
  approved: boolean | null
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
  const isAdminArea = (usePathname() ?? '').startsWith('/admin')
  const [affiliate, setAffiliate] = useState<ShellAffiliate | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isAdminArea) {
      const ac = supabaseAdmin
      if (!ac) { setLoading(false); return }
      ;(async () => {
        const { data: { session } } = await ac.auth.getSession()
        if (!session) { router.replace('/admin/login'); return }
        const { data: adm } = await ac.rpc('hub_is_admin')
        if (adm !== true) { router.replace('/admin/login'); return }
        setAffiliate({ id: session.user.id, name: 'Camrhia', referral_code: '', team_code: null, is_master: false, commission_rate: null, override_rate: null, parent_affiliate_id: null, approved: true })
        setLoading(false)
      })()
      return
    }
    const client = supabase
    if (!client) { setLoading(false); return }
    let cancelled = false
    ;(async () => {
      const { data: { session } } = await client.auth.getSession()
      if (!session) { router.replace('/affiliate/login'); return }
      const { data } = await client
        .from('affiliates')
        .select('id, name, referral_code, team_code, is_master, commission_rate, override_rate, parent_affiliate_id, approved')
        .eq('id', session.user.id)
        .maybeSingle()
      if (!cancelled) {
        setAffiliate((data as ShellAffiliate | null) ?? null)
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [router, isAdminArea])

  const [teamName, setTeamName] = useState<string | null>(null)
  useEffect(() => {
    const client = supabase
    if (!client || !affiliate?.parent_affiliate_id) return
    let cancelled = false
    ;(async () => {
      const { data } = await client.rpc('get_my_team')
      const row = Array.isArray(data) ? data[0] : data
      if (!cancelled && row?.master_name) setTeamName(String(row.master_name))
    })()
    return () => { cancelled = true }
  }, [affiliate?.parent_affiliate_id])

  return (
    <div className={`min-h-screen bg-paper flex flex-col ${isAdminArea ? '' : 'aff-scope xl:pl-60'}`}>
      <main className={`flex-1 mx-auto w-full px-6 py-8 ${isAdminArea ? 'max-w-6xl lg:grid lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-10' : 'max-w-5xl'}`}>
        <aside>
          <AffiliateTabs />
        </aside>
        <div className="min-w-0 space-y-6 pt-6 lg:pt-0">
        {affiliate && (affiliate.is_master || teamName) ? (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {affiliate.is_master ? (
              <span className="rounded-full bg-brass/15 text-brass px-3 py-1 font-medium">Master partner</span>
            ) : null}
            {teamName ? (
              <span className="rounded-full bg-[#3A4A6B]/10 text-[#3A4A6B] px-3 py-1 font-medium">
                On {teamName}&apos;s team
              </span>
            ) : null}
          </div>
        ) : null}
        <div>
          <h1 className="font-fraunces text-4xl font-semibold tracking-tight text-ink md:text-5xl">{title}</h1>
          {subtitle ? <p className="mt-3 text-base text-ink-soft max-w-2xl">{subtitle}</p> : null}
          <div className="mt-4 h-px w-16 bg-brass/60" />
        </div>
        {loading ? (
          <p className="text-sm text-ink-soft">Loading…</p>
        ) : affiliate && !affiliate.approved ? (
          <div className="rounded-3xl border border-[#D5DCEA] bg-[linear-gradient(160deg,#FCFDFE_0%,#E9EEF7_100%)] shadow-[0_1px_2px_rgba(60,30,30,0.04),0_14px_34px_-18px_rgba(120,60,60,0.22)] p-6">
            <p className="font-medium text-ink">Your application is being reviewed</p>
            <p className="mt-2 text-sm text-ink-soft">Once you are approved, your referral link and earnings will show up here.</p>
          </div>
        ) : affiliate ? (
          children(affiliate)
        ) : (
          <p className="text-sm text-ink-soft">
            No affiliate account found. <Link href="/affiliate/dashboard" className="text-[#3A4A6B] underline">Go to Overview</Link> to activate it.
          </p>
        )}
        </div>
      </main>
    </div>
  )
}
