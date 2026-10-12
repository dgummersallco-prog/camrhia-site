'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AffiliateTabs() {
  const pathname = usePathname() ?? ''
  const [isMaster, setIsMaster] = useState(false)
  const [onTeam, setOnTeam] = useState(false)

  useEffect(() => {
    const client = supabase
    if (!client) return
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

  const tabs = [{ href: '/affiliate/dashboard', label: 'Overview' }]
  if (isMaster || onTeam) tabs.push({ href: '/affiliate/dashboard/team', label: 'Team' })
  if (isMaster) {
    tabs.push({ href: '/affiliate/dashboard/numbers', label: 'Numbers' })
    tabs.push({ href: '/affiliate/dashboard/recruit', label: 'Recruit' })
  }
  tabs.push({ href: '/affiliate/dashboard/pay', label: 'Pay breakdown' })

  return (
    <nav className="flex items-center gap-2 overflow-x-auto whitespace-nowrap">
      {tabs.map((t) => {
        const active = t.href === '/affiliate/dashboard' ? pathname === t.href : pathname.startsWith(t.href)
        return (
          <Link
            key={t.href}
            href={t.href}
            className={
              active
                ? 'rounded-full bg-ink px-4 py-1.5 text-sm font-medium text-white'
                : 'rounded-full border border-line px-4 py-1.5 text-sm text-ink-soft hover:text-ink'
            }
          >
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}
