'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Wordmark from '@/app/components/Wordmark'

type Tab = 'dashboard' | 'sessions' | 'calendar' | 'storage' | 'galleries' | 'portfolio' | 'reminders' | 'billing'

const ICONS: Record<string, string> = {
  reminders: 'M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9 M10 21a2 2 0 0 0 4 0',
  sessions: 'M4 8h4l2-3h4l2 3h4v11H4z M12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  calendar: 'M4 6h16v14H4z M4 10h16 M8 3v4 M16 3v4 M8 14h2 M12 14h2 M8 17h2',
  dashboard: 'M4 4h7v7H4z M13 4h7v4h-7z M13 10h7v10h-7z M4 13h7v7H4z',
  galleries: 'M3 5h18v14H3z M3 16l5-5 4 4 3-3 6 6 M9 9.5h.01',
  portfolio: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M3 12h18 M12 3c3 3 3 15 0 18 M12 3c-3 3-3 15 0 18',
  billing: 'M3 6h18v12H3z M3 10h18',
  storage: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3z M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6 M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6',
  affiliate: 'M4 12v8h16v-8 M2 8h20v4H2z M12 8v12 M12 8c-2 0-4-1-4-3s3-2 4 1c1-3 4-3 4-1s-2 3-4 3',
}

const ITEMS: { tab: Tab | 'affiliate'; href: string; label: string }[] = [
  { tab: 'dashboard', href: '/dashboard', label: 'Home' },
  { tab: 'sessions', href: '/sessions', label: 'Sessions' },
  { tab: 'calendar', href: '/calendar', label: 'Calendar' },
  { tab: 'galleries', href: '/galleries', label: 'Galleries' },
  { tab: 'portfolio', href: '/portfolio', label: 'Portfolio' },
  { tab: 'reminders', href: '/reminders', label: 'Reminders' },
  { tab: 'storage', href: '/storage', label: 'Storage' },
  { tab: 'billing', href: '/billing', label: 'Billing' },
]

function Icon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d={ICONS[name]} />
    </svg>
  )
}

export function DashboardHeader({ active }: { active: Tab }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function signOut() {
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
        className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
          isActive
            ? 'bg-twilight/10 text-twilight'
            : accent
              ? 'text-brass hover:bg-line/60'
              : 'text-ink-soft hover:bg-line/60 hover:text-ink'
        }`}
      >
        <Icon name={it.tab} />
        {it.label}
      </Link>
    )
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-line bg-paper-deep px-4 py-6 lg:flex">
        <Link href="/" className="mb-8 px-2"><Wordmark className="text-3xl" /></Link>
        <nav className="flex flex-1 flex-col gap-1">
          {ITEMS.map((it) => item(it))}
          <div className="mt-6 border-t border-line pt-6">
            {item({ tab: 'affiliate', href: '/affiliate/signup', label: 'Earn with Camrhia' }, true)}
          </div>
        </nav>
        <button onClick={signOut} className="rounded-xl px-3.5 py-2.5 text-left text-sm text-ink-soft transition hover:bg-line/60 hover:text-ink">
          Sign out
        </button>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 border-b border-line bg-paper lg:hidden">
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
          <nav className="flex flex-col gap-1 border-t border-line px-4 pb-4 pt-2">
            {ITEMS.map((it) => item(it))}
            {item({ tab: 'affiliate', href: '/affiliate/signup', label: 'Earn with Camrhia' }, true)}
            <button onClick={signOut} className="rounded-xl px-3.5 py-2.5 text-left text-sm text-ink-soft">Sign out</button>
          </nav>
        )}
      </header>
    </>
  )
}
