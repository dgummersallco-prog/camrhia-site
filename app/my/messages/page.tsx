'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ClientHeader } from '@/app/components/ClientHeader'
import { loadClientThreads, type CThread } from '@/lib/clientThreads'

function when(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default function MyMessagesPage() {
  const router = useRouter()
  const [threads, setThreads] = useState<CThread[]>([])
  const [ready, setReady] = useState(false)

  const refresh = useCallback(async () => {
    const sb = supabase
    if (!sb) return
    const { data: sess } = await sb.auth.getSession()
    if (!sess.session) { router.replace('/login?next=/my/messages'); return }
    setThreads(await loadClientThreads(sb, sess.session.user.id))
    setReady(true)
  }, [router])

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, 20000)
    window.addEventListener('focus', refresh)
    return () => { clearInterval(t); window.removeEventListener('focus', refresh) }
  }, [refresh])

  const unread = threads.filter((t) => t.unread).length

  return (
    <div className="min-h-screen bg-paper xl:pl-60">
      <ClientHeader active="messages" />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-brass">Messages</p>
        <h1 className="font-fraunces text-3xl font-semibold text-ink md:text-4xl">Your conversations</h1>
        <p className="mt-2 text-sm text-ink-soft">{unread > 0 ? `${unread} unread. ` : ''}Read status matches the app, so what you read on your phone is read here too.</p>
        {!ready ? (
          <p className="mt-8 text-sm text-ink-soft">Loading…</p>
        ) : threads.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-line bg-card p-6 text-ink-soft">No conversations yet. Messages with your photographer will show up here.</p>
        ) : (
          <ul className="mt-8 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
            {threads.map((t) => (
              <li key={t.key}>
                <Link href={t.href} className="flex items-start gap-3 px-5 py-4 transition hover:bg-paper">
                  <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${t.unread ? 'bg-brass' : 'bg-transparent'}`} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={`truncate font-fraunces text-lg ${t.unread ? 'font-semibold' : 'font-medium'} text-ink`}>{t.name}</span>
                      <span className="shrink-0 text-xs text-ink-soft">{when(t.lastAt)}</span>
                    </span>
                    <span className="block truncate text-sm text-ink-soft">{t.kind === 'inq' ? 'Inquiry · ' : ''}{t.snippet}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
