'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Wordmark from '@/app/components/Wordmark'
import { fetchUnreadCount } from '@/lib/unreadMessages'
import { APP_STORE_URL } from '@/lib/appStore'

type Tab = 'dashboard' | 'messages' | 'sessions' | 'contracts' | 'payments' | 'calendar' | 'storage' | 'galleries' | 'portfolio' | 'website' | 'reminders' | 'billing' | 'settings' | 'team' | 'clients' | 'invoices' | 'packages' | 'questionnaires'

const ICONS: Record<string, string> = {
  dashboard: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  messages: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  sessions: 'M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  contracts: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M8 13h8 M8 17h5',
  payments: 'M12 1v22 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  calendar: 'M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  galleries: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M9 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z M21 15l-3.086-3.086a2 2 0 0 0-2.828 0L6 21',
  portfolio: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M3 12h18 M12 3a14 14 0 0 1 0 18 M12 3a14 14 0 0 0 0 18',
  website: 'M3 4h18a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z M2 9h20 M6 6.5h.01 M9 6.5h.01',
  reminders: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9 M10.3 21a1.94 1.94 0 0 0 3.4 0',
  storage: 'M22 12H2 M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z M6 16h.01 M10 16h.01',
  invoices: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z M14 3v5h5 M9 13h6 M9 17h6',
  clients: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  team: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
  settings: 'M4 21v-7 M4 10V3 M12 21v-9 M12 8V3 M20 21v-5 M20 12V3 M1 14h6 M9 8h6 M17 16h6',
  billing: 'M3 5h18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z M1 10h22',
  packages: 'M21 8l-9-5-9 5v8l9 5 9-5z M3.3 7.5L12 12l8.7-4.5 M12 21v-9',
  questionnaires: 'M9 2h6a1 1 0 0 1 1 1v2H8V3a1 1 0 0 1 1-1z M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2 M9 12h6 M9 16h4',
  affiliate: 'M20 12v10H4V12 M2 7h20v5H2z M12 22V7 M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z',
}

const ITEMS: { tab: Tab | 'affiliate'; href: string; label: string }[] = [
  { tab: 'dashboard', href: '/dashboard', label: 'Home' },
  { tab: 'clients', href: '/clients', label: 'Clients' },
  { tab: 'galleries', href: '/galleries', label: 'Galleries' },
  { tab: 'packages', href: '/portfolio/packages', label: 'Packages' },
  { tab: 'questionnaires', href: '/questionnaires', label: 'Questionnaires' },
  { tab: 'sessions', href: '/sessions', label: 'Sessions' },
  { tab: 'contracts', href: '/contracts', label: 'Contracts' },
  { tab: 'payments', href: '/payments', label: 'Payments' },
  { tab: 'invoices', href: '/invoices', label: 'Invoices' },
  { tab: 'team', href: '/team', label: 'Team' },
  { tab: 'messages', href: '/messages', label: 'Messages' },
  { tab: 'calendar', href: '/calendar', label: 'Calendar' },
  { tab: 'website', href: '/website', label: 'Your website' },
  { tab: 'portfolio', href: '/portfolio', label: 'App portfolio' },
  { tab: 'billing', href: '/billing', label: 'Billing' },
  { tab: 'settings', href: '/settings', label: 'Settings' },
]

// Returns the color only if white text stays readable on it.
function usableAccent(c: string | null | undefined): string | null {
  if (!c) return null
  const m = /^#?([0-9a-f]{6})$/i.exec(c.trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
  return lum > 0.8 ? null : '#' + m[1]
}

function Icon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d={ICONS[name]} />
    </svg>
  )
}

export function DashboardHeader({ active }: { active: Tab }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [blocked, setBlocked] = useState(false)

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

  async function signOut() {
    try { localStorage.removeItem('camrhia_accent') } catch {}
    document.documentElement.style.removeProperty('--color-twilight')
    document.documentElement.style.removeProperty('--color-blush-wash')
    if (supabase) await supabase.auth.signOut()
    router.push('/login')
  }

  const item = (it: { tab: Tab | 'affiliate'; href: string; label: string }, accent = false) => {
    const isActive = active === it.tab
    return (
      <Link
        key={it.href}
        href={it.href}
        onClick={() => setOpen(false)}
        className={`relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13.5px] font-medium tracking-wide transition ${
          isActive
            ? 'bg-blush-wash text-twilight'
            : accent
              ? 'text-brass hover:bg-blush-wash/60'
              : 'text-ink-soft hover:bg-blush-wash/60 hover:text-ink'
        }`}
      >
        {isActive && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-twilight" />}
        <Icon name={it.tab} />
        {it.label}
        {it.tab === 'messages' && unread > 0 && (
          <span className="ml-auto rounded-full bg-brass px-2 py-0.5 text-[11px] font-semibold text-white">{unread > 9 ? '9+' : unread}</span>
        )}
      </Link>
    )
  }

  const GROUPS: { label: string | null; tabs: string[] }[] = [
    { label: null, tabs: ['dashboard'] },
    { label: 'Clients', tabs: ['clients', 'messages', 'sessions', 'calendar'] },
    { label: 'Work', tabs: ['galleries', 'packages', 'questionnaires', 'contracts', 'payments', 'invoices', 'team'] },
    { label: 'Your brand', tabs: ['website', 'portfolio'] },
    { label: 'Account', tabs: ['billing', 'settings'] },
  ]
  const groupedNav = GROUPS.map((g, gi) => (
    <div key={gi} className={gi === 0 ? '' : 'mt-5'}>
      {g.label && <p className="mb-1.5 px-3.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-soft/70">{g.label}</p>}
      <div className="flex flex-col gap-1">
        {g.tabs.map((t) => item(ITEMS.find((i) => i.tab === t)!))}
        {g.label === 'Account' && item({ tab: 'affiliate', href: '/affiliate/signup', label: 'Earn with Camrhia' }, true)}
      </div>
    </div>
  ))

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-line bg-card px-4 py-6 xl:flex">
        <Link href="/" className="mb-8 px-2"><Wordmark className="text-3xl" /></Link>
        <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {groupedNav}
        </nav>
        <button onClick={signOut} className="rounded-xl px-3.5 py-2.5 text-left text-sm text-ink-soft transition hover:bg-line/60 hover:text-ink">
          Sign out
        </button>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 border-b border-line bg-paper xl:hidden">
        <div className="flex items-center justify-between px-6 py-3">
          <Link href="/"><Wordmark className="text-3xl" /></Link>
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-lg text-ink"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
        {open && (
          <nav className="flex flex-col border-t border-line px-4 pb-4 pt-3">
            {groupedNav}
            <button onClick={signOut} className="rounded-xl px-3.5 py-2.5 text-left text-sm text-ink-soft">Sign out</button>
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
