'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Wordmark from '@/app/components/Wordmark'

type Tab = 'dashboard' | 'sessions' | 'calendar' | 'storage' | 'galleries' | 'portfolio' | 'reminders' | 'billing'

const ICONS: Record<string, string> = {
  dashboard: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  sessions: 'M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  calendar: 'M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  galleries: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M9 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z M21 15l-3.086-3.086a2 2 0 0 0-2.828 0L6 21',
  portfolio: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M3 12h18 M12 3a14 14 0 0 1 0 18 M12 3a14 14 0 0 0 0 18',
  reminders: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9 M10.3 21a1.94 1.94 0 0 0 3.4 0',
  storage: 'M22 12H2 M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z M6 16h.01 M10 16h.01',
  billing: 'M3 5h18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z M1 10h22',
  affiliate: 'M20 12v10H4V12 M2 7h20v5H2z M12 22V7 M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z',
}

const ITEMS: { tab: Tab | 'affiliate'; href: string; label: string }[] = [
  { tab: 'dashboard', href: '/dashboard', label: 'Home' },
  { tab: 'galleries', href: '/galleries', label: 'Galleries' },
  { tab: 'sessions', href: '/sessions', label: 'Sessions' },
  { tab: 'calendar', href: '/calendar', label: 'Calendar' },
  { tab: 'portfolio', href: '/portfolio', label: 'Your website' },
  { tab: 'reminders', href: '/reminders', label: 'Reminders' },
  { tab: 'storage', href: '/storage', label: 'Storage' },
  { tab: 'billing', href: '/billing', label: 'Billing' },
]

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
      </Link>
    )
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-line bg-card px-4 py-6 lg:flex">
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
