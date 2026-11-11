'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import SceneSidebar from '@/app/components/SceneSidebar'
import { supabaseAffiliate as supabase } from '@/lib/supabaseAffiliate'

export default function AffiliateTabs() {
  const pathname = usePathname() ?? ''
  const router = useRouter()
  const admin = pathname.startsWith('/admin')
  const [isMaster, setIsMaster] = useState(false)
  const [onTeam, setOnTeam] = useState(false)

  useEffect(() => {
    const client = supabase
    if (!client || window.location.pathname.startsWith('/admin')) return
    let cancelled = false
    ;(async () => {
      const { data: { session } } = await client.auth.getSession()
      const user = session?.user
      if (!user) return
      const load = async () => {
        const { data } = await client
          .from('affiliates')
          .select('is_master, parent_affiliate_id')
          .eq('id', user.id)
          .maybeSingle()
        return data as { is_master: boolean | null; parent_affiliate_id: string | null } | null
      }
      let me = await load()
      // If they signed up with a team code (or arrived through a recruit link), attach them once.
      if (me && !me.is_master && !me.parent_affiliate_id) {
        try {
          const pending =
            window.localStorage.getItem('camrhia_recruit') ||
            (user.user_metadata?.recruit_code as string | undefined)
          if (pending) {
            await client.rpc('claim_team', { p_code: pending })
            window.localStorage.removeItem('camrhia_recruit')
            me = await load()
          }
        } catch {}
      }
      if (!cancelled && me) {
        setIsMaster(!!me.is_master)
        setOnTeam(!!me.parent_affiliate_id)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const tabs = admin
    ? [
        { href: '/admin/hub', label: 'Home' },
        { href: '/admin/hub/team', label: 'Team Hub' },
        { href: '/admin/hub/pitch', label: 'Marketing HQ' },
        { href: '/admin/hub/boosted', label: 'Boosted posts' },
        { href: '/admin/hub/pay', label: 'Pay breakdown' },
        { href: '/admin/hub/account', label: 'Account' },
      ]
    : [{ href: '/affiliate/dashboard', label: 'Home' }, { href: '/affiliate/dashboard/hub', label: 'Team Hub' }]
  if (isMaster) tabs.push({ href: '/affiliate/dashboard/team', label: 'Team' })
  if (isMaster) {
    tabs.push({ href: '/affiliate/dashboard/numbers', label: 'Numbers' })
    tabs.push({ href: '/affiliate/dashboard/recruit', label: 'Recruit' })
  }
  if (!admin) tabs.push({ href: '/affiliate/dashboard/pitch', label: 'Marketing HQ' })
  if (!admin) tabs.push({ href: '/affiliate/dashboard/boosted', label: 'Boosted posts' })
  if (!admin) tabs.push({ href: '/affiliate/dashboard/pay', label: 'Pay breakdown' })
  if (!admin) tabs.push({ href: '/affiliate/dashboard/account', label: 'Account' })

  if (!admin) {
    const activeHref = tabs
      .filter((t) => (t.href === '/affiliate/dashboard' ? pathname === t.href : pathname.startsWith(t.href)))
      .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? ''
    return (
      <SceneSidebar
        groups={[{ items: tabs }]}
        activeHref={activeHref}
        homeHref="/affiliate/dashboard"
        onSignOut={async () => { if (supabase) await supabase.auth.signOut(); router.replace('/affiliate/login') }}
      />
    )
  }

  return (
    <nav className="flex items-center gap-2 overflow-x-auto whitespace-nowrap lg:sticky lg:top-24 lg:flex-col lg:items-stretch lg:overflow-visible">
      {tabs.map((t) => {
        const active = t.href === '/affiliate/dashboard' || t.href === '/admin/hub' ? pathname === t.href : pathname.startsWith(t.href)
        return (
          <Link
            key={t.href}
            href={t.href}
            className={
              active
                ? 'rounded-full bg-[#3A4A6B] px-4 py-1.5 text-sm font-medium text-white shadow-md lg:rounded-xl lg:py-2.5'
                : 'rounded-full border border-[#D5DCEA] bg-white/60 px-4 py-1.5 text-sm text-ink-soft transition hover:border-[#3A4A6B] hover:text-ink lg:rounded-xl lg:py-2.5'
            }
          >
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}
