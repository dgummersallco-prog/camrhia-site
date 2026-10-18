'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Wordmark from '@/app/components/Wordmark'

type Tab = 'galleries' | 'portfolio' | 'billing'

export function DashboardHeader({ active }: { active: Tab }) {
  const router = useRouter()
  const tab = (t: Tab, href: string, label: string) => (
    <Link href={href} className={active === t ? 'font-medium text-ink' : 'text-ink-soft hover:text-ink'}>
      {label}
    </Link>
  )
  async function signOut() {
    if (supabase) await supabase.auth.signOut()
    router.push('/login')
  }
  return (
    <header className="flex items-center justify-between border-b border-line bg-paper px-6 py-4">
      <div className="flex items-center gap-8">
        <Link href="/"><Wordmark className="text-3xl" /></Link>
        <nav className="flex gap-6 text-sm">
          {tab('galleries', '/galleries', 'Galleries')}
          {tab('portfolio', '/portfolio', 'Portfolio')}
          {tab('billing', '/billing', 'Billing')}
        </nav>
      </div>
      <button onClick={signOut} className="text-sm text-ink-soft hover:text-ink">Sign out</button>
    </header>
  )
}
