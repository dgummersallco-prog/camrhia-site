'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Wordmark from '@/app/components/Wordmark'

export type ClientTab = 'home' | 'sessions' | 'galleries' | 'messages' | 'account'

const ICONS: Record<ClientTab, string> = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  sessions: 'M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  galleries: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M9 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z M21 15l-3.086-3.086a2 2 0 0 0-2.828 0L6 21',
  messages: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  account: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
}

const ITEMS: { tab: ClientTab; href: string; label: string }[] = [
  { tab: 'home', href: '/my', label: 'Home' },
  { tab: 'sessions', href: '/my/sessions', label: 'My sessions' },
  { tab: 'galleries', href: '/my/galleries', label: 'Galleries' },
  { tab: 'messages', href: '/my/messages', label: 'Messages' },
  { tab: 'account', href: '/my/account', label: 'Account' },
]

function Icon({ name }: { name: ClientTab }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d={ICONS[name]} />
    </svg>
  )
}

export function ClientHeader({ active }: { active: ClientTab }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function signOut() {
    if (supabase) await supabase.auth.signOut()
    router.push('/login')
  }

  const item = (it: { tab: ClientTab; href: string; label: string }) => {
    const isActive = active === it.tab
    return (
      <Link
        key={it.href}
        href={it.href}
        onClick={() => setOpen(false)}
        className={`relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13.5px] font-medium tracking-wide transition ${
          isActive ? 'bg-blush-wash text-twilight' : 'text-ink-soft hover:bg-blush-wash/60 hover:text-ink'
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
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-line bg-card px-4 py-6 lg:flex">
        <Link href="/my" className="mb-8 px-2"><Wordmark className="text-3xl" /></Link>
        <nav className="flex flex-1 flex-col gap-1">
          {ITEMS.map((it) => item(it))}
        </nav>
        <button onClick={signOut} className="rounded-xl px-3.5 py-2.5 text-left text-sm text-ink-soft transition hover:bg-line/60 hover:text-ink">
          Sign out
        </button>
      </aside>

      <header className="sticky top-0 z-40 border-b border-line bg-paper lg:hidden">
        <div className="flex items-center justify-between px-6 py-3">
          <Link href="/my"><Wordmark className="text-3xl" /></Link>
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
            <button onClick={signOut} className="rounded-xl px-3.5 py-2.5 text-left text-sm text-ink-soft">Sign out</button>
          </nav>
        )}
      </header>
    </>
  )
}
