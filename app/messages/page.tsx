'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { DashboardHeader } from '@/app/components/DashboardHeader'

type Thread = { key: string; kind: 'inq' | 'wed'; id: string; name: string; snippet: string; lastAt: string; unread: boolean }
type Msg = { id: string; body: string; at: string; mine: boolean; type: string | null }

function isUnread(otherAt: string | undefined, readAt: string | undefined): boolean {
  if (!otherAt) return false
  if (!readAt) return true
  return otherAt > readAt
}

function snip(body: string, type: string | null): string {
  if (type && type !== 'text') return type === 'packages' ? 'Sent packages' : 'Attachment'
  const t = body.trim()
  if (t.startsWith('{') || t.startsWith('[')) return 'Attachment'
  return t.length > 80 ? t.slice(0, 80) + '…' : t
}

function when(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default function MessagesPage() {
  const router = useRouter()
  const [uid, setUid] = useState<string | null>(null)
  const [threads, setThreads] = useState<Thread[]>([])
  const [ready, setReady] = useState(false)
  const [sel, setSel] = useState<string | null>(null)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const selRef = useRef<string | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)

  const markRead = useCallback(async (me: string, t: { kind: 'inq' | 'wed'; id: string }) => {
    const sb = supabase
    if (!sb) return
    const col = t.kind === 'inq' ? 'inquiry_id' : 'wedding_id'
    await sb.from('thread_reads').delete().eq('user_id', me).eq(col, t.id)
    await sb.from('thread_reads').insert({ user_id: me, [col]: t.id, read_at: new Date().toISOString() })
  }, [])

  const loadMsgs = useCallback(async (me: string, key: string) => {
    const sb = supabase
    if (!sb) return
    const [kind, id] = key.split(':') as ['inq' | 'wed', string]
    if (kind === 'inq') {
      const { data } = await sb.from('inquiry_messages').select('id, body, sender_id, created_at, message_type').eq('inquiry_id', id).is('deleted_at', null).order('created_at', { ascending: true })
      setMsgs(((data ?? []) as any[]).map((m) => ({ id: m.id, body: m.body, at: m.created_at, mine: m.sender_id === me, type: m.message_type })))
    } else {
      const { data } = await sb.from('messages').select('id, body, sender, created_at').eq('wedding_id', id).order('created_at', { ascending: true })
      setMsgs(((data ?? []) as any[]).map((m) => ({ id: m.id, body: m.body, at: m.created_at, mine: m.sender === 'photographer', type: null })))
    }
  }, [])

  const loadThreads = useCallback(async (me: string) => {
    const sb = supabase
    if (!sb) return
    const [inqR, wedR, hidR, readR, blkR] = await Promise.all([
      sb.from('inquiries').select('id, couple_id, couple_names, converted_wedding_id, created_at').eq('photographer_id', me),
      sb.from('weddings').select('id, names').eq('owner_id', me),
      sb.from('hidden_threads').select('*').eq('user_id', me),
      sb.from('thread_reads').select('inquiry_id, wedding_id, read_at').eq('user_id', me),
      sb.from('blocked_users').select('blocker_id, blocked_id').or(`blocker_id.eq.${me},blocked_id.eq.${me}`),
    ])
    const blocked = new Set<string>()
    ;((blkR.data ?? []) as any[]).forEach((b) => blocked.add(b.blocker_id === me ? b.blocked_id : b.blocker_id))
    const hiddenInq = new Set<string>(); const hiddenWed = new Set<string>()
    ;((hidR.data ?? []) as any[]).forEach((h) => { if (h.inquiry_id) hiddenInq.add(h.inquiry_id); if (h.wedding_id) hiddenWed.add(h.wedding_id) })
    const readAt = new Map<string, string>()
    ;((readR.data ?? []) as any[]).forEach((r) => {
      if (r.inquiry_id) readAt.set('inq:' + r.inquiry_id, r.read_at)
      if (r.wedding_id) readAt.set('wed:' + r.wedding_id, r.read_at)
    })
    const inqs = ((inqR.data ?? []) as any[]).filter((i) => !hiddenInq.has(i.id) && !(i.couple_id && blocked.has(i.couple_id)))
    const weds = ((wedR.data ?? []) as any[]).filter((w) => !hiddenWed.has(w.id))
    const wedName = new Map<string, string>(weds.map((w) => [w.id, w.names]))
    const converted = new Set<string>(inqs.filter((i) => i.converted_wedding_id).map((i) => i.converted_wedding_id))
    const wedsOnly = weds.filter((w) => !converted.has(w.id))

    const [imR, wmR] = await Promise.all([
      inqs.length ? sb.from('inquiry_messages').select('inquiry_id, body, sender_id, created_at, message_type').in('inquiry_id', inqs.map((i) => i.id)).is('deleted_at', null).order('created_at', { ascending: false }) : Promise.resolve({ data: [] as any[] }),
      wedsOnly.length ? sb.from('messages').select('wedding_id, body, sender, created_at').in('wedding_id', wedsOnly.map((w) => w.id)).order('created_at', { ascending: false }) : Promise.resolve({ data: [] as any[] }),
    ])
    const lastI = new Map<string, any>(); const otherI = new Map<string, string>()
    ;((imR.data ?? []) as any[]).forEach((m) => {
      if (!lastI.has(m.inquiry_id)) lastI.set(m.inquiry_id, m)
      if (m.sender_id !== me && !otherI.has(m.inquiry_id)) otherI.set(m.inquiry_id, m.created_at)
    })
    const lastW = new Map<string, any>(); const otherW = new Map<string, string>()
    ;((wmR.data ?? []) as any[]).forEach((m) => {
      if (!lastW.has(m.wedding_id)) lastW.set(m.wedding_id, m)
      if (m.sender === 'couple' && !otherW.has(m.wedding_id)) otherW.set(m.wedding_id, m.created_at)
    })

    const out: Thread[] = []
    inqs.forEach((i) => {
      const l = lastI.get(i.id)
      out.push({
        key: 'inq:' + i.id, kind: 'inq', id: i.id,
        name: (i.converted_wedding_id && wedName.get(i.converted_wedding_id)) || i.couple_names || 'Client',
        snippet: l ? snip(l.body, l.message_type) : 'No messages yet',
        lastAt: l?.created_at ?? i.created_at,
        unread: isUnread(otherI.get(i.id), readAt.get('inq:' + i.id)),
      })
    })
    wedsOnly.forEach((w) => {
      const l = lastW.get(w.id)
      if (!l) return
      out.push({
        key: 'wed:' + w.id, kind: 'wed', id: w.id, name: w.names || 'Session',
        snippet: snip(l.body, null), lastAt: l.created_at,
        unread: isUnread(otherW.get(w.id), readAt.get('wed:' + w.id)),
      })
    })
    out.sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1))
    setThreads(out)
  }, [])

  const refresh = useCallback(async (me: string) => {
    await loadThreads(me)
    const k = selRef.current
    if (k) {
      await loadMsgs(me, k)
      const [kind, id] = k.split(':') as ['inq' | 'wed', string]
      await markRead(me, { kind, id })
      setThreads((t) => t.map((x) => (x.key === k ? { ...x, unread: false } : x)))
    }
  }, [loadThreads, loadMsgs, markRead])

  useEffect(() => {
    async function init() {
      const sb = supabase
      if (!sb) return
      const { data } = await sb.auth.getSession()
      if (!data.session) { router.replace('/login?next=/messages'); return }
      const me = data.session.user.id
      setUid(me)
      await loadThreads(me)
      setReady(true)
    }
    init()
  }, [router, loadThreads])

  useEffect(() => {
    if (!uid) return
    const t = setInterval(() => { refresh(uid) }, 20000)
    const onFocus = () => { refresh(uid) }
    window.addEventListener('focus', onFocus)
    return () => { clearInterval(t); window.removeEventListener('focus', onFocus) }
  }, [uid, refresh])

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [msgs.length, sel])

  async function open(t: Thread) {
    if (!uid) return
    selRef.current = t.key
    setSel(t.key)
    setError(null)
    setMsgs([])
    await loadMsgs(uid, t.key)
    await markRead(uid, t)
    setThreads((list) => list.map((x) => (x.key === t.key ? { ...x, unread: false } : x)))
  }

  async function send() {
    const sb = supabase
    const body = reply.trim()
    if (!sb || !uid || !sel || !body) return
    const [kind, id] = sel.split(':') as ['inq' | 'wed', string]
    setSending(true)
    setError(null)
    const { error: e } = kind === 'inq'
      ? await sb.from('inquiry_messages').insert({ inquiry_id: id, sender_id: uid, body })
      : await sb.from('messages').insert({ wedding_id: id, sender: 'photographer', body })
    setSending(false)
    if (e) { setError(e.message); return }
    setReply('')
    await loadMsgs(uid, sel)
    await loadThreads(uid)
    await markRead(uid, { kind, id })
    setThreads((list) => list.map((x) => (x.key === sel ? { ...x, unread: false } : x)))
  }

  const cur = threads.find((t) => t.key === sel) ?? null
  const unreadCount = threads.filter((t) => t.unread).length

  return (
    <div className="min-h-screen bg-paper lg:pl-60">
      <DashboardHeader active="dashboard" />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-brass">Messages</p>
        <h1 className="font-fraunces text-3xl font-semibold text-ink md:text-4xl">Messages and inquiries</h1>
        <p className="mt-2 text-sm text-ink-soft">
          {unreadCount > 0 ? `${unreadCount} unread. ` : ''}Read status is shared with the app, so a conversation you read on your phone is read here too.
        </p>

        {!ready ? (
          <p className="mt-8 text-sm text-ink-soft">Loading…</p>
        ) : threads.length === 0 ? (
          <p className="mt-8 text-sm text-ink-soft">No conversations yet. Inquiries from your website and messages from clients show up here.</p>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[320px_1fr]">
            <ul className={`divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card ${sel ? 'hidden lg:block' : ''}`}>
              {threads.map((t) => (
                <li key={t.key}>
                  <button
                    type="button"
                    onClick={() => open(t)}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-paper ${sel === t.key ? 'bg-paper' : ''}`}
                  >
                    <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${t.unread ? 'bg-brass' : 'bg-transparent'}`} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className={`truncate text-sm ${t.unread ? 'font-semibold text-ink' : 'text-ink'}`}>{t.name}</span>
                        <span className="shrink-0 text-xs text-ink-soft">{when(t.lastAt)}</span>
                      </span>
                      <span className="block truncate text-xs text-ink-soft">{t.kind === 'inq' ? 'Inquiry · ' : ''}{t.snippet}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            <section className={`rounded-2xl border border-line bg-card p-5 ${sel ? '' : 'hidden lg:block'}`}>
              {!cur ? (
                <p className="text-sm text-ink-soft">Pick a conversation.</p>
              ) : (
                <>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <button type="button" onClick={() => { selRef.current = null; setSel(null) }} className="text-sm text-ink-soft hover:text-ink lg:hidden">← All</button>
                    <p className="font-fraunces text-xl font-semibold text-ink">{cur.name}</p>
                    {cur.kind === 'wed' ? <Link href={`/sessions/${cur.id}`} className="text-sm text-twilight hover:underline">Open session →</Link> : <span />}
                  </div>
                  <div className="max-h-[50vh] space-y-2 overflow-auto rounded-xl bg-paper p-3">
                    {msgs.map((m) => (
                      <div key={m.id} className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${m.mine ? 'bg-twilight text-white' : 'bg-card text-ink'}`}>
                          {m.type && m.type !== 'text' ? snip(m.body, m.type) : m.body}
                          <div className={`mt-1 text-[10px] ${m.mine ? 'text-white/70' : 'text-ink-soft'}`}>{when(m.at)}</div>
                        </div>
                      </div>
                    ))}
                    <div ref={endRef} />
                  </div>
                  {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
                  <div className="mt-3 flex gap-2">
                    <textarea
                      rows={2}
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder="Write a reply"
                      className="min-w-0 flex-1 rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-twilight focus:outline-none focus:ring-2 focus:ring-twilight/25"
                    />
                    <button type="button" disabled={sending || !reply.trim()} onClick={send} className="self-end rounded-full bg-twilight px-5 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50">Send</button>
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
