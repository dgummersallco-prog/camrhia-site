'use client'

import { usePathname, useRouter } from 'next/navigation'
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin'
import SceneSidebar, { type SceneGroup, type SceneItem } from '@/app/components/SceneSidebar'

const I = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  chart: 'M4 20V10 M10 20V4 M16 20v-7 M22 20H2',
  spark: 'M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z',
  funnel: 'M3 4h18l-7 8v6l-4 2v-8z',
  people: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8a4 4 0 1 0 0-8z M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
  gift: 'M20 12v10H4V12 M2 7h20v5H2z M12 22V7 M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z',
  dollar: 'M12 2v20 M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  user: 'M12 3a4 4 0 1 0 0 8a4 4 0 1 0 0-8z M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1',
}

const GROUPS = [
  { label: 'Overview', items: [
    { href: '/admin/dashboard', label: 'Dashboard', icon: I.home },
    { href: '/admin/metrics', label: 'Metrics', icon: I.chart },
  ] },
  { label: 'Marketing', items: [
    { href: '/admin/ads', label: 'Ads', icon: I.spark },
    { href: '/admin/pages', label: 'Funnels', icon: I.funnel },
  ] },
  { label: 'People', items: [
    { href: '/admin/users', label: 'Users', icon: I.user },
    { href: '/admin/affiliates', label: 'Affiliates', icon: I.gift },
    { href: '/admin/masters', label: 'Masters', icon: I.star },
    { href: '/admin/hub', label: 'Hub', icon: I.people },
  ] },
  { label: 'Money', items: [
    { href: '/admin/payouts', label: 'Payouts', icon: I.dollar },
  ] },
]

const HUB = [
  { href: '/admin/hub', label: 'Home' },
  { href: '/admin/hub/team', label: 'Team Hub' },
  { href: '/admin/hub/pitch', label: 'Marketing HQ' },
  { href: '/admin/hub/boosted', label: 'Boosted posts' },
  { href: '/admin/hub/pay', label: 'Pay breakdown' },
  { href: '/admin/hub/account', label: 'Account' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? ''
  const router = useRouter()
  if (pathname.startsWith('/admin/login')) return <>{children}</>

  const all = GROUPS.flatMap((g) => g.items)
  const activeHref = all.find((t) => pathname.startsWith(t.href))?.href ?? ''
  const inHub = pathname.startsWith('/admin/hub')
  const groups: SceneGroup[] = GROUPS.map((g) => ({
    ...g,
    items: g.items.flatMap((it): SceneItem[] =>
      it.href === '/admin/hub'
        ? [
            { ...it, id: 'hub-parent', active: inHub },
            ...(inHub
              ? HUB.map((h) => ({ ...h, sub: true, id: 'hub-' + h.href, active: h.href === '/admin/hub' ? pathname === '/admin/hub' : pathname.startsWith(h.href) }))
              : []),
          ]
        : [it]
    ),
  }))

  return (
    <>
      <SceneSidebar
        groups={groups}
        activeHref={activeHref}
        homeHref="/admin/dashboard"
        onSignOut={async () => { await supabase?.auth.signOut(); router.replace('/admin/login') }}
      />
      <div className="admin-shell">{children}</div>
    </>
  )
}
