'use client'

import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ClientHeader } from '@/app/components/ClientHeader'
import { loadClientThreads, type CThread } from '@/lib/clientThreads'

type Msg = { id: string; mine: boolean; body: string; at: string; type: string | null }

const SPECIAL: Record<string, string> = {
  packages: 'Shared pricing packages',
  package_selected: 'Selected a package',
  package_change: 'Updated the package',
  questionnaire: 'Sent a questionnaire',
}

function when(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function dayLabel(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return 'Today'
  const y = new Date(now)
  y.setDate(now.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

function Initial({ name, size = 'h-10 w-10' }: { name: string; size?: string }) {
  return (
    <span className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-twilight/10 font-fraunces text-sm font-semibold text-twilight`}>
      {(name.trim()[0] ?? '?').toUpperCase()}
    </span>
  )
}

export default function MyMessagesPage() {
  const router = useRouter()
  const [threads, setThreads] = useState<CThread[]>([])
  const [ready, setReady] = useState(false)
  const [uid, setUid] = useState<string | null>(null)
  const [sel, setSel] = useState<string | null>(null)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const curRef = useRef<CThread | null>(null)
  const autoRef = useRef(false)
  const endRef = useRef<HTMLDivElement>(null)
  const lastCount = useRef(0)

  const loadMsgs = useCallback(async (me: string, t: CThread) => {
    const sb = supabase
    if (!sb) return
    if (t.kind === 'inq') {
      const { data } = await sb
        .from('inquiry_messages')
        .select('id, sender_id, body, created_at, message_type')
        .eq('inquiry_id', t.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
      if (curRef.current?.key !== t.key) return
      setMsgs(((data ?? []) as any[]).map((m) => ({ id: m.id, mine: m.sender_id === me, body: m.body, at: m.created_at, type: m.message_type })))
    } else {
      const { data } = await sb.rpc('client_get_thread', { p_wedding_id: t.id })
      if (curRef.current?.key !== t.key) return
      setMsgs(((data ?? []) as any[]).map((m) => ({ id: m.id, mine: m.sender === 'couple', body: m.body, at: m.created_at, type: null })))
    }
  }, [])

  const markRead = useCallback(async (me: string, t: CThread) => {
    const sb = supabase
    if (sb && t.kind === 'inq') {
      await sb.from('thread_reads').delete().eq('user_id', me).eq('inquiry_id', t.id)
      await sb.from('thread_reads').insert({ user_id: me, inquiry_id: t.id, read_at: new Date().toISOString() })
    }
    window.dispatchEvent(new Event('camrhia-unread'))
  }, [])

  const openThread = useCallback(async (me: string, t: CThread) => {
    curRef.current = t
    setSel(t.key)
    setMsgs([])
    setError(null)
    await loadMsgs(me, t)
    await markRead(me, t)
    setThreads((list) => list.map((x) => (x.key === t.key ? { ...x, unread: false } : x)))
  }, [loadMsgs, markRead])

  const refresh = useCallback(async () => {
    const sb = supabase
    if (!sb) return
    const { data: sess } = await sb.auth.getSession()
    if (!sess.session) { router.replace('/login?next=/my/messages'); return }
    const me = sess.session.user.id
    setUid(me)
    const list = await loadClientThreads(sb, me)
    setThreads(list.map((x) => (x.key === curRef.current?.key ? { ...x, unread: false } : x)))
    setReady(true)
  }, [router])

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, 20000)
    window.addEventListener('focus', refresh)
    return () => { clearInterval(t); window.removeEventListener('focus', refresh) }
  }, [refresh])

  useEffect(() => {
    if (!uid) return
    const t = setInterval(() => {
      const cur = curRef.current
      if (cur) loadMsgs(uid, cur).then(() => markRead(uid, cur))
    }, 8000)
    return () => clearInterval(t)
  }, [uid, loadMsgs, markRead])

  useEffect(() => {
    if (autoRef.current || !ready || !uid || sel || threads.length === 0) return
    const want = new URLSearchParams(window.location.search).get('t')
    const target = threads.find((t) => t.key === want)
    if (!target && window.innerWidth < 1024) return
    autoRef.current = true
    openThread(uid, target ?? threads[0])
  }, [ready, uid, threads, sel, openThread])

  useEffect(() => {
    if (msgs.length !== lastCount.current) {
      lastCount.current = msgs.length
      endRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [msgs])

  async function send() {
    const sb = supabase
    const cur = curRef.current
    const body = reply.trim()
    if (!sb || !uid || !cur || !body || sending) return
    setSending(true)
    setError(null)
    const { error: e } = cur.kind === 'inq'
      ? await sb.rpc('client_send_inquiry_message', { p_inquiry_id: cur.id, p_body: body })
      : await sb.rpc('client_send_message', { p_wedding_id: cur.id, p_body: body })
    setSending(false)
    if (e) { setError('Message did not send. Try again.'); return }
    setReply('')
    await loadMsgs(uid, cur)
    await markRead(uid, cur)
  }

  const cur = threads.find((t) => t.key === sel) ?? null
  const unreadCount = threads.filter((t) => t.unread).length
  const needle = q.trim().toLowerCase()
  const shown = threads.filter((t) => {
    if (filter === 'unread' && !t.unread) return false
    if (needle && !(t.name.toLowerCase().includes(needle) || t.snippet.toLowerCase().includes(needle))) return false
    return true
  })

  return (
    <div className="min-h-screen bg-paper xl:pl-60">
      <ClientHeader active="messages" />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-brass">Messages</p>
        <h1 className="font-fraunces text-3xl font-semibold text-ink md:text-4xl">Your conversations</h1>
        {unreadCount > 0 && <p className="mt-2 text-sm text-ink-soft">{unreadCount} unread</p>}

        {!ready ? (
          <p className="mt-8 text-sm text-ink-soft">Loading…</p>
        ) : threads.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-line bg-card p-6 text-ink-soft">No conversations yet. Messages with your photographer will show up here.</p>
        ) : (
          <div className="mt-8 grid h-[calc(100vh-18rem)] min-h-[460px] gap-6 lg:grid-cols-[320px_1fr]">
            <div className={`min-h-0 flex-col gap-3 ${sel ? 'hidden lg:flex' : 'flex'}`}>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search conversations"
                className="w-full rounded-xl border border-line bg-card px-3 py-2 text-sm text-ink focus:border-twilight focus:outline-none focus:ring-2 focus:ring-twilight/25"
              />
              <div className="flex gap-1 rounded-full border border-line bg-card p-1">
                {([['all', 'All'], ['unread', `Unread${unreadCount ? ` (${unreadCount})` : ''}`]] as ['all' | 'unread', string][]).map(([v, label]) => (
                  <button key={v} type="button" onClick={() => setFilter(v)}
                    className={`flex-1 rounded-full whitespace-nowrap px-2 py-1.5 text-xs transition ${filter === v ? 'bg-twilight text-white' : 'text-ink-soft hover:text-ink'}`}>{label}</button>
                ))}
              </div>
              <ul className="min-h-0 flex-1 divide-y divide-line overflow-y-auto rounded-2xl border border-line bg-card">
                {shown.length === 0 && <li className="px-4 py-6 text-center text-sm text-ink-soft">Nothing here.</li>}
                {shown.map((t) => (
                  <li key={t.key}>
                    <button
                      type="button"
                      onClick={() => uid && openThread(uid, t)}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-paper ${sel === t.key ? 'bg-paper' : ''}`}
                    >
                      <span className="relative shrink-0">
                        <Initial name={t.name} />
                        {t.unread && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-card bg-brass" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className={`truncate text-sm ${t.unread ? 'font-semibold text-ink' : 'text-ink'}`}>{t.name}</span>
                          <span className="shrink-0 text-xs text-ink-soft">{when(t.lastAt)}</span>
                        </span>
                        <span className="block truncate text-xs text-ink-soft">{t.snippet}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <section className={`min-h-0 flex-col rounded-2xl border border-line bg-card p-5 ${sel ? 'flex' : 'hidden lg:flex'}`}>
              {!cur ? (
                <p className="text-sm text-ink-soft">Pick a conversation.</p>
              ) : (
                <>
                  <div className="mb-3 flex shrink-0 items-center gap-3">
                    <button type="button" onClick={() => { curRef.current = null; setSel(null) }} className="text-sm text-ink-soft hover:text-ink lg:hidden">← All</button>
                    <div className="flex min-w-0 items-center gap-3">
                      <Initial name={cur.name} size="h-9 w-9" />
                      <p className="truncate font-fraunces text-xl font-semibold text-ink">{cur.name}</p>
                    </div>
                  </div>
                  <div className="min-h-0 flex-1 space-y-2 overflow-auto rounded-xl bg-paper p-3">
                    {msgs.length === 0 && <p className="text-sm text-ink-soft">No messages yet.</p>}
                    {msgs.map((m, i) => {
                      const showDay = i === 0 || new Date(m.at).toDateString() !== new Date(msgs[i - 1].at).toDateString()
                      const special = m.type && m.type !== 'text' ? (SPECIAL[m.type] ?? 'Update') : null
                      return (
                        <Fragment key={m.id}>
                          {showDay && (
                            <div className="flex items-center gap-3 py-2">
                              <span className="h-px flex-1 bg-line" />
                              <span className="text-[11px] uppercase tracking-wider text-ink-soft">{dayLabel(m.at)}</span>
                              <span className="h-px flex-1 bg-line" />
                            </div>
                          )}
                          <div className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${m.mine ? 'bg-twilight text-white' : 'bg-card text-ink'}`}>
                              {special ? <p className="italic">{special}. Open the Camrhia app to view and respond.</p> : <p>{m.body}</p>}
                              <div className={`mt-1 text-[10px] ${m.mine ? 'text-white/70' : 'text-ink-soft'}`}>{when(m.at)}</div>
                            </div>
                          </div>
                        </Fragment>
                      )
                    })}
                    <div ref={endRef} />
                  </div>
                  {error && <p className="mt-2 shrink-0 text-sm text-red-600">{error}</p>}
                  <div className="mt-3 flex shrink-0 gap-2">
                    <textarea
                      rows={2}
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                      placeholder="Write a message"
                      className="flex-1 resize-none rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-soft/50 focus:border-twilight focus:outline-none focus:ring-2 focus:ring-twilight/25"
                    />
                    <button onClick={send} disabled={sending || !reply.trim()} className="self-end rounded-full bg-twilight px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
                      Send
                    </button>
                  </div>
                </>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
