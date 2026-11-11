'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { loadClientThreads } from '@/lib/clientThreads'
import SceneSidebar from '@/app/components/SceneSidebar'

export type ClientTab = 'home' | 'sessions' | 'galleries' | 'messages' | 'notifications' | 'account'

const ICONS: Record<ClientTab, string> = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  sessions: 'M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  galleries: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M9 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z M21 15l-3.086-3.086a2 2 0 0 0-2.828 0L6 21',
  messages: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  notifications: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9 M10.3 21a1.94 1.94 0 0 0 3.4 0',
  account: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
}

const ITEMS: { tab: ClientTab; href: string; label: string }[] = [
  { tab: 'home', href: '/my', label: 'Home' },
  { tab: 'sessions', href: '/my/sessions', label: 'My sessions' },
  { tab: 'galleries', href: '/my/galleries', label: 'Galleries' },
  { tab: 'messages', href: '/my/messages', label: 'Messages' },
  { tab: 'account', href: '/my/account', label: 'Account' },
]

export function ClientHeader({ active }: { active: ClientTab }) {
  const router = useRouter()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    let off = false
    async function run() {
      const sb = supabase
      if (!sb) return
      const { data } = await sb.auth.getSession()
      if (!data.session) return
      const t = await loadClientThreads(sb, data.session.user.id)
      if (!off) setUnread(t.filter((x) => x.unread).length)
    }
    run()
    const timer = setInterval(run, 45000)
    window.addEventListener('camrhia-unread', run)
    return () => { off = true; clearInterval(timer); window.removeEventListener('camrhia-unread', run) }
  }, [])

  async function signOut() {
    if (supabase) await supabase.auth.signOut()
    router.push('/login')
  }

  const activeHref = ITEMS.find((i) => i.tab === active)?.href ?? ''
  return (
    <SceneSidebar
      groups={[{ items: ITEMS.map((i) => ({ href: i.href, label: i.label, icon: ICONS[i.tab], badge: i.tab === 'messages' ? unread : 0 })) }]}
      activeHref={activeHref}
      homeHref="/my"
      onSignOut={signOut}
    />
  )
}
