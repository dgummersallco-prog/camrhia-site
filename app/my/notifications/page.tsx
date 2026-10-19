'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ClientHeader } from '@/app/components/ClientHeader'

type Notif = {
  id: string; type: string | null; title: string | null; body: string | null
  wedding_id: string | null; inquiry_id: string | null; read: boolean; created_at: string
}

function route(n: Notif): string {
  if (n.inquiry_id && !n.wedding_id) return `/my/inquiry/${n.inquiry_id}`
  if (!n.wedding_id) return '/my'
  if (n.type === 'message') return `/my/messages/${n.wedding_id}`
  if (n.type === 'contract') return `/my/contract/${n.wedding_id}`
  if (n.type === 'questionnaire') return `/my/questionnaire/${n.wedding_id}`
  if (n.type === 'gallery_ready') return '/my/galleries'
  return `/my/session/${n.wedding_id}`
}

function ago(iso: string): string {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.round(hrs / 24)}d ago`
}

export default function MyNotificationsPage() {
  const router = useRouter()
  const [uid, setUid] = useState<string | null>(null)
  const [items, setItems] = useState<Notif[]>([])
  const [ready, setReady] = useState(false)

  const load = useCallback(async () => {
    const sb = supabase
    if (!sb) return
    const { data: sess } = await sb.auth.getSession()
    if (!sess.session) { router.replace('/login?next=/my/notifications'); return }
    setUid(sess.session.user.id)
    const { data } = await sb
      .from('notifications')
      .select('id, type, title, body, wedding_id, inquiry_id, read, created_at')
      .eq('user_id', sess.session.user.id)
      .order('created_at', { ascending: false })
      .limit(100)
    setItems((data ?? []) as Notif[])
    setReady(true)
  }, [router])

  useEffect(() => {
    load()
    const t = setInterval(load, 30000)
    window.addEventListener('focus', load)
    return () => { clearInterval(t); window.removeEventListener('focus', load) }
  }, [load])

  async function markRead(n: Notif) {
    if (n.read) return
    setItems((list) => list.map((x) => (x.id === n.id ? { ...x, read: true } : x)))
    if (supabase) await supabase.from('notifications').update({ read: true }).eq('id', n.id)
    window.dispatchEvent(new Event('camrhia-unread'))
  }

  async function markAll() {
    if (!supabase || !uid) return
    setItems((list) => list.map((x) => ({ ...x, read: true })))
    await supabase.from('notifications').update({ read: true }).eq('user_id', uid).eq('read', false)
    window.dispatchEvent(new Event('camrhia-unread'))
  }

  const unread = items.filter((n) => !n.read).length

  return (
    <div className="min-h-screen bg-paper lg:pl-60">
      <ClientHeader active="notifications" />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-brass">Notifications</p>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="font-fraunces text-3xl font-semibold text-ink md:text-4xl">What is new</h1>
          {unread > 0 && (
            <button type="button" onClick={markAll} className="text-sm text-twilight hover:underline">Mark all as read</button>
          )}
        </div>
        <p className="mt-2 text-sm text-ink-soft">Read status matches the app, so what you read on your phone is read here too.</p>
        {!ready ? (
          <p className="mt-8 text-sm text-ink-soft">Loading…</p>
        ) : items.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-line bg-card p-6 text-ink-soft">Nothing yet. Updates from your photographer will show up here.</p>
        ) : (
          <ul className="mt-8 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
            {items.map((n) => (
              <li key={n.id}>
                <Link href={route(n)} onClick={() => markRead(n)} className="flex items-start gap-3 px-5 py-4 transition hover:bg-paper">
                  <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-brass'}`} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={`truncate text-sm ${n.read ? 'text-ink' : 'font-semibold text-ink'}`}>{n.title || 'Update'}</span>
                      <span className="shrink-0 text-xs text-ink-soft">{ago(n.created_at)}</span>
                    </span>
                    {n.body && <span className="block text-sm text-ink-soft">{n.body}</span>}
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
