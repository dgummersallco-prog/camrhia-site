'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Wordmark from '@/app/components/Wordmark'
import { fetchUnreadCount } from '@/lib/unreadMessages'
import { APP_STORE_URL } from '@/lib/appStore'
import { DASH_BG_KEY, applyDashBg } from '@/lib/dashBg'
import DashScenes from '@/app/components/DashScenes'

type Tab = 'dashboard' | 'messages' | 'sessions' | 'contracts' | 'payments' | 'calendar' | 'storage' | 'galleries' | 'portfolio' | 'website' | 'reminders' | 'billing' | 'settings' | 'team' | 'clients' | 'edit' | 'insights' | 'minis' | 'help' | 'packages' | 'questionnaires' | 'specials'

const ICONS: Record<string, string> = {
  specials: 'M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z',
  dashboard: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  messages: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  sessions: 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z M12 9a4 4 0 1 0 0 8a4 4 0 1 0 0-8z',
  contracts: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z M14 3v5h5 M9 13h6 M9 17h6',
  payments: 'M12 2v20 M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  calendar: 'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z M16 2v4 M8 2v4 M3 10h18',
  galleries: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M8.5 7a1.5 1.5 0 1 0 0 3a1.5 1.5 0 1 0 0-3z M21 15l-5-5L5 21',
  portfolio: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M3 12h18 M12 3a14 14 0 0 1 0 18 M12 3a14 14 0 0 0 0 18',
  website: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z M3 12h18 M12 3a14 14 0 0 1 0 18 M12 3a14 14 0 0 0 0 18',
  reminders: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9 M10.3 21a1.94 1.94 0 0 0 3.4 0',
  edit: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M7 3v18 M17 3v18 M3 8h4 M3 16h4 M17 8h4 M17 16h4',
  storage: 'M22 12H2 M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z M6 16h.01 M10 16h.01',
  help: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7 M12 17h.01',
  minis: 'M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  insights: 'M4 20V10 M10 20V4 M16 20v-7 M22 20H2',
  clients: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8a4 4 0 1 0 0-8z M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
  team: 'M12 3a4 4 0 1 0 0 8a4 4 0 1 0 0-8z M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1',
  settings: 'M4 21v-7 M4 10V3 M12 21v-9 M12 8V3 M20 21v-5 M20 12V3 M1 14h6 M9 8h6 M17 16h6',
  billing: 'M3 5h18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z M1 10h22',
  packages: 'M21 8l-9-5-9 5v8l9 5 9-5z M3 8l9 5 9-5 M12 13v8',
  questionnaires: 'M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2 M9 12h6 M9 16h4',
  affiliate: 'M20 12v10H4V12 M2 7h20v5H2z M12 22V7 M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z',
}

const COVERS: Record<string, string[]> = {
  payments: ['payments', 'insights'],
  packages: ['packages', 'minis'],
  settings: ['settings', 'billing'],
}

const ITEMS: { tab: Tab | 'affiliate'; href: string; label: string }[] = [
  { tab: 'dashboard', href: '/dashboard', label: 'Home' },
  { tab: 'clients', href: '/clients', label: 'Clients' },
  { tab: 'galleries', href: '/galleries', label: 'Galleries' },
  { tab: 'edit', href: '/edit', label: 'The Editing Room' },
  { tab: 'packages', href: '/portfolio/packages', label: 'Packages' },
  { tab: 'questionnaires', href: '/questionnaires', label: 'Questionnaires' },
  { tab: 'sessions', href: '/sessions', label: 'Sessions' },
  { tab: 'contracts', href: '/contracts', label: 'Contracts' },
  { tab: 'payments', href: '/payments', label: 'Money' },
  { tab: 'insights', href: '/insights', label: 'Insights' },
  { tab: 'minis', href: '/minis', label: 'Mini-sessions' },
  { tab: 'team', href: '/team', label: 'Team' },
  { tab: 'messages', href: '/messages', label: 'Messages' },
  { tab: 'calendar', href: '/calendar', label: 'Calendar' },
  { tab: 'website', href: '/website', label: 'Your website' },
  { tab: 'specials', href: '/specials', label: 'Specials' },
  { tab: 'billing', href: '/billing', label: 'Billing' },
  { tab: 'settings', href: '/settings', label: 'Settings' },
  { tab: 'help', href: '/help', label: 'Help' },
]

// Returns the color only if white text stays readable on it.
// The dashboard keeps one gold accent for everyone.
function usableAccent(c: string | null | undefined): string | null {
  void c
  return null
}

function Icon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d={ICONS[name]} />
    </svg>
  )
}

export function DashboardHeader({ active }: { active: Tab }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [blocked, setBlocked] = useState(false)
  const [showTeam, setShowTeam] = useState(false)
  const [isAffiliate, setIsAffiliate] = useState(false)

  useEffect(() => {
    async function run() {
      const sb = supabase
      if (!sb) return
      const { data } = await sb.auth.getSession()
      if (!data.session) return
      const uid = data.session.user.id
      const [pr, mem] = await Promise.all([
        sb.from('profiles').select('account_type, subscription_status, trial_ends_at').eq('id', uid).maybeSingle(),
        sb.from('studio_members').select('studio_owner_id, status').eq('member_id', uid).limit(1),
      ])
      const p = pr.data as { account_type?: string | null; subscription_status?: string | null; trial_ends_at?: string | null } | null
      if (!p || p.account_type === 'couple') return
      const row = ((mem.data ?? []) as { studio_owner_id: string; status: string }[]).find((m) => m.status === 'active')
      let access: boolean
      if (row) {
        const { data: os } = await sb.rpc('get_studio_owner_status', { p_owner_id: row.studio_owner_id })
        access = os === 'active' || os === 'comped'
      } else {
        const trialActive = !!p.trial_ends_at && new Date(p.trial_ends_at) > new Date()
        access = p.subscription_status === 'active' || p.subscription_status === 'comped' || trialActive
      }
      setBlocked(!access)
    }
    run().catch(() => {})
  }, [])

  useEffect(() => {
    async function run() {
      const sb = supabase
      if (!sb) return
      const { data } = await sb.auth.getSession()
      if (!data.session) return
      const uid = data.session.user.id
      const [pr, mem] = await Promise.all([
        sb.from('profiles').select('plan_tier').eq('id', uid).maybeSingle(),
        sb.from('studio_members').select('role').eq('member_id', uid).eq('status', 'active').maybeSingle(),
      ])
      const tier = (pr.data as { plan_tier?: string | null } | null)?.plan_tier
      const role = (mem.data as { role?: string | null } | null)?.role
      setShowTeam(tier === 'studio' || role === 'admin')
    }
    run().catch(() => {})
  }, [])

  useEffect(() => {
    let off = false
    async function run() {
      const sb = supabase
      if (!sb) return
      const { data } = await sb.auth.getSession()
      if (!data.session) return
      const n = await fetchUnreadCount(sb, data.session.user.id)
      if (!off) setUnread(n)
    }
    run()
    const t = setInterval(run, 30000)
    window.addEventListener('camrhia-unread', run)
    return () => { off = true; clearInterval(t); window.removeEventListener('camrhia-unread', run) }
  }, [])

  useEffect(() => {
    const root = document.documentElement
    const apply = (c: string) => {
      root.style.setProperty('--color-twilight', c)
      root.style.setProperty('--color-blush-wash', `color-mix(in srgb, ${c} 12%, white)`)
    }
    const clear = () => {
      root.style.removeProperty('--color-twilight')
      root.style.removeProperty('--color-blush-wash')
    }
    try {
      const cached = usableAccent(localStorage.getItem('camrhia_accent'))
      if (cached) apply(cached)
    } catch {}
    async function run() {
      const sb = supabase
      if (!sb) return
      const { data } = await sb.auth.getSession()
      if (!data.session) return
      const { data: pr } = await sb.from('profiles').select('accent_color').eq('id', data.session.user.id).maybeSingle()
      const a = usableAccent((pr as { accent_color?: string | null } | null)?.accent_color)
      if (a) {
        apply(a)
        try { localStorage.setItem('camrhia_accent', a) } catch {}
      } else {
        clear()
        try { localStorage.removeItem('camrhia_accent') } catch {}
      }
    }
    run()
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.classList.add('dash-shell')
    return () => root.classList.remove('dash-shell')
  }, [])

  useEffect(() => {
    async function run() {
      try {
        const c = localStorage.getItem(DASH_BG_KEY)
        if (c) applyDashBg(c, supabase)
      } catch {}
      const sb = supabase
      if (!sb) return
      const { data } = await sb.auth.getSession()
      if (!data.session) return
      const { data: pr } = await sb.from('profiles').select('dash_bg').eq('id', data.session.user.id).maybeSingle()
      const v = (pr as { dash_bg?: string | null } | null)?.dash_bg ?? null
      applyDashBg(v && v !== 'golden' ? v : null, sb)
    }
    run().catch(() => {})
  }, [])

  async function signOut() {
    applyDashBg(null, null)
    try { localStorage.removeItem('camrhia_accent') } catch {}
    document.documentElement.style.removeProperty('--color-twilight')
    document.documentElement.style.removeProperty('--color-blush-wash')
    if (supabase) await supabase.auth.signOut()
    router.push('/login')
  }

  useEffect(() => {
    async function run() {
      const sb = supabase
      if (!sb) return
      const { data } = await sb.auth.getSession()
      if (!data.session) return
      const { data: aff } = await sb.from('affiliates').select('id').eq('id', data.session.user.id).maybeSingle()
      if (aff) setIsAffiliate(true)
    }
    run()
  }, [])

  const item = (it: { tab: Tab | 'affiliate'; href: string; label: string }, accent = false) => {
    const isActive = (COVERS[it.tab] ?? [it.tab]).includes(active)
    return (
      <Link
        key={it.href}
        href={it.href}
        onClick={() => setOpen(false)}
        className={`relative flex items-center gap-3.5 rounded-2xl px-3 py-2.5 text-[15px] transition ${
          isActive
            ? 'bg-gradient-to-r from-[#7A6A47] via-[#9C8559] to-[#6F5F3F] font-semibold text-[#FBF6EA] shadow-[inset_0_0_0_1px_rgba(227,200,143,0.55),0_4px_14px_-6px_rgba(0,0,0,0.6)]'
            : accent
              ? 'text-[#E3C88F] hover:bg-white/5'
              : 'text-[#EFE6D2] hover:bg-white/5 hover:text-white'
        }`}
      >
        <span className={isActive ? 'text-[#F3E3B8]' : 'text-[#D4B574]'}><Icon name={it.tab} /></span>
        {it.label}
        {it.tab === 'messages' && unread > 0 && (
          <span className="ml-auto rounded-full bg-[#D9B36A] px-2 py-0.5 text-[11px] font-semibold text-[#2A2326]">{unread > 9 ? '9+' : unread}</span>
        )}
      </Link>
    )
  }

  const GROUPS: { label: string | null; tabs: string[] }[] = [
    { label: null, tabs: ['dashboard', 'galleries', 'edit'] },
    { label: 'Clients', tabs: ['clients', 'messages', 'sessions', 'calendar'] },
    { label: 'Work', tabs: ['packages', 'questionnaires', 'contracts', 'payments', 'team'] },
    { label: 'Your brand', tabs: ['website', 'specials'] },
    { label: 'Account', tabs: ['settings', 'help'] },
  ]
  const groupedNav = GROUPS.map((g, gi) => (
    <div key={gi} className={gi === 0 ? '' : 'mt-6'}>
      {g.label && (
        <div className="mb-2 flex items-center gap-3 px-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-[#D4B574]">{g.label}</p>
          <span className="h-px flex-1 bg-[#D4B574]/40" />
        </div>
      )}
      <div className="flex flex-col gap-1">
        {g.tabs.filter((t) => t !== 'team' || showTeam || active === 'team').map((t) => item(ITEMS.find((i) => i.tab === t)!))}
        {g.label === 'Account' && item(isAffiliate ? { tab: 'affiliate', href: '/affiliate/dashboard', label: 'Affiliate dashboard' } : { tab: 'affiliate', href: '/affiliate/signup', label: 'Earn with Camrhia' }, true)}
      </div>
    </div>
  ))

  return (
    <>
      <DashScenes />
      {/* Desktop sidebar */}
      <aside className="fixed bottom-0 left-0 top-0 z-40 hidden w-60 flex-col border-r border-[#D4B574]/30 bg-[linear-gradient(180deg,rgba(70,88,74,0.93)_0%,rgba(54,68,58,0.93)_100%)] px-3 py-7 shadow-[8px_0_40px_-18px_rgba(0,0,0,0.45)] backdrop-blur-xl xl:flex">
        <Link href="/" className="mb-8 block px-3 text-center"><Wordmark className="text-4xl text-[#E3C88F]!" /></Link>
        <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {groupedNav}
        </nav>
        <button onClick={signOut} className="rounded-xl px-3 py-2.5 text-left text-sm text-[#EFE6D2] transition hover:bg-white/5 hover:text-white">
          Sign out
        </button>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 border-b border-[#D4B574]/30 bg-[#34423A] xl:hidden">
        <div className="flex items-center justify-between px-6 py-3">
          <Link href="/"><Wordmark className="text-3xl text-[#E3C88F]!" /></Link>
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-lg text-[#E3C88F]"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
        {open && (
          <nav className="flex flex-col border-t border-[#D4B574]/30 px-4 pb-4 pt-3">
            {groupedNav}
            <button onClick={signOut} className="rounded-xl px-3 py-2.5 text-left text-sm text-[#EFE6D2]">Sign out</button>
          </nav>
        )}
      </header>

      {blocked && active !== 'billing' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-paper px-6 py-10">
          <div className="w-full max-w-md text-center">
            <Wordmark className="text-4xl" />
            <h1 className="mt-8 font-fraunces text-3xl font-semibold text-ink">Subscribe to keep going</h1>
            <p className="mt-3 text-sm text-ink-soft">
              Your free trial or subscription is no longer active. Subscribe in the Camrhia app and everything here will be right where you left it.
            </p>
            <p className="mt-2 text-xs text-ink-soft">On a studio team? Ask your studio owner to renew.</p>
            <a href={APP_STORE_URL} className="mt-6 inline-block rounded-full bg-twilight px-6 py-3 text-sm font-medium text-white transition hover:opacity-90">Open the App Store</a>
            <div className="mt-4">
              <button type="button" onClick={signOut} className="text-sm text-ink-soft underline hover:text-ink">Sign out</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
