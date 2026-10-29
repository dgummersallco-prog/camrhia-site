'use client'

import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { DashboardHeader } from '@/app/components/DashboardHeader'

type Thread = { key: string; kind: 'inq' | 'wed'; id: string; name: string; snippet: string; lastAt: string; unread: boolean; waiting: boolean; lastMine: boolean; avatar: string | null; convertedId: string | null }
type Msg = { id: string; body: string; at: string; mine: boolean; type: string | null }
type Filter = 'all' | 'unread' | 'waiting' | 'inq'

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

function dayLabel(iso: string): string {
  const d = new Date(iso)
  const n = new Date()
  const y = new Date()
  y.setDate(n.getDate() - 1)
  if (d.toDateString() === n.toDateString()) return 'Today'
  if (d.toDateString() === y.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

function initials(name: string): string {
  const words = name.split(/\s+/).filter((w) => w && /[a-z0-9]/i.test(w[0]))
  return (words.slice(0, 2).map((w) => w[0]).join('') || '?').toUpperCase()
}

const AVATAR_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}/storage/v1/object/public/portfolio/`

function Avatar({ name, path, size = 'h-10 w-10' }: { name: string; path: string | null; size?: string }) {
  if (path) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={AVATAR_BASE + path} alt="" className={`${size} shrink-0 rounded-full object-cover`} />
  }
  return <span className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-blush-wash text-xs font-semibold text-twilight`}>{initials(name)}</span>
}

const DETAIL_FIELDS: [string, string][] = [
  ['session_type', 'Session'],
  ['event_type', 'Session'],
  ['wedding_date', 'Date'],
  ['event_date', 'Date'],
  ['session_date', 'Date'],
  ['location', 'Location'],
  ['venue', 'Location'],
  ['budget', 'Budget'],
  ['email', 'Email'],
  ['phone', 'Phone'],
]

function fmtVal(v: unknown): string {
  const s = String(v)
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s.length === 10 ? s + 'T12:00:00' : s)
    if (!isNaN(d.getTime())) return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  }
  return s
}

function Body({ m }: { m: Msg }) {
  const t = m.body.trim()
  const isObj = t.startsWith('{') || t.startsWith('[')
  if ((m.type && m.type !== 'text') || isObj) {
    let list: { title: string; price: string }[] | null = null
    try {
      const j = JSON.parse(t)
      const arr = Array.isArray(j) ? j : Array.isArray(j?.packages) ? j.packages : Array.isArray(j?.items) ? j.items : null
      if (arr) {
        list = arr
          .map((p: any) => ({ title: String(p?.title ?? p?.name ?? ''), price: p?.price != null ? String(p.price) : '' }))
          .filter((p: { title: string }) => p.title)
      }
    } catch { /* not json */ }
    if (list && list.length > 0) {
      return (
        <div className="min-w-[200px]">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider opacity-70">Packages</p>
          <ul className="space-y-1">
            {list.map((p, i) => (
              <li key={i} className="flex items-baseline justify-between gap-4 rounded-lg bg-black/5 px-2.5 py-1.5">
                <span className="text-sm">{p.title}</span>
                {p.price && <span className="shrink-0 text-xs opacity-80">{p.price}</span>}
              </li>
            ))}
          </ul>
        </div>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-black/5 px-2.5 py-1.5 text-xs">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.5 12.5 21a5 5 0 0 1-7-7L14 5.5a3.4 3.4 0 0 1 5 5L10.5 19a1.7 1.7 0 0 1-2.5-2.5L15 9.5" /></svg>
        {m.type === 'packages' ? 'Sent packages' : 'Attachment'}
      </span>
    )
  }
  return <>{m.body}</>
}

const QUICK: { label: string; text: string }[] = [
  { label: 'Thanks for reaching out', text: "Thank you so much for reaching out! I'd love to hear more about what you have in mind. What date and location are you thinking?" },
  { label: 'Availability', text: "I'd love to work with you. Let me check my calendar and get back to you with my availability shortly." },
  { label: 'Next steps', text: "The next step is to pick a package and lock in your date. Let me know which one feels right and I'll send over the contract." },
  { label: 'Follow up', text: "Just following up to see if you had any questions. I'd love to get your date on the calendar!" },
]

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
  const [filter, setFilter] = useState<Filter>('all')
  const [q, setQ] = useState('')
  const [detail, setDetail] = useState<Record<string, any> | null>(null)
  const selRef = useRef<string | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)
  const autoRef = useRef(false)

  const markRead = useCallback(async (me: string, t: { kind: 'inq' | 'wed'; id: string }) => {
    const sb = supabase
    if (!sb) return
    const col = t.kind === 'inq' ? 'inquiry_id' : 'wedding_id'
    await sb.from('thread_reads').delete().eq('user_id', me).eq(col, t.id)
    await sb.from('thread_reads').insert({ user_id: me, [col]: t.id, read_at: new Date().toISOString() })
    window.dispatchEvent(new Event('camrhia-unread'))
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
      sb.from('weddings').select('id, names, couple_user_id').eq('owner_id', me),
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
    const pairedCouples = new Set<string>(((inqR.data ?? []) as any[]).map((i) => i.couple_id).filter(Boolean))
    const wedsOnly = weds.filter((w) => !converted.has(w.id) && !(w.couple_user_id && pairedCouples.has(w.couple_user_id)))

    const cpIds = Array.from(new Set([...inqs.map((i) => i.couple_id), ...weds.map((w) => w.couple_user_id)].filter(Boolean)))
    const profR = cpIds.length ? await sb.from('profiles').select('id, avatar_path').in('id', cpIds) : { data: [] as any[] }
    const avatarOf = new Map<string, string | null>(((profR.data ?? []) as any[]).map((p) => [p.id, p.avatar_path ?? null]))

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
        snippet: l ? (snip(l.body, l.message_type) === 'Attachment' ? 'Sent their details' : snip(l.body, l.message_type)) : 'No messages yet',
        lastAt: l?.created_at ?? i.created_at,
        unread: isUnread(otherI.get(i.id), readAt.get('inq:' + i.id)),
        convertedId: i.converted_wedding_id ?? null,
        avatar: avatarOf.get(i.couple_id) ?? null,
        waiting: !!l && l.sender_id !== me,
        lastMine: !!l && l.sender_id === me,
      })
    })
    wedsOnly.forEach((w) => {
      const l = lastW.get(w.id)
      if (!l) return
      out.push({
        key: 'wed:' + w.id, kind: 'wed', id: w.id, name: w.names || 'Session',
        snippet: snip(l.body, null), lastAt: l.created_at,
        unread: isUnread(otherW.get(w.id), readAt.get('wed:' + w.id)),
        convertedId: null,
        avatar: avatarOf.get(w.couple_user_id) ?? null,
        waiting: l.sender === 'couple',
        lastMine: l.sender === 'photographer',
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

  useEffect(() => {
    const sb = supabase
    if (!sb || !uid) return
    const ch = sb
      .channel('msgs-' + uid)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'inquiry_messages' }, () => { refresh(uid) })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => { refresh(uid) })
      .subscribe()
    return () => { sb.removeChannel(ch) }
  }, [uid, refresh])

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [msgs.length, sel])

  async function open(t: Thread) {
    if (!uid) return
    selRef.current = t.key
    setSel(t.key)
    setError(null)
    setMsgs([])
    setDetail(null)
    if (t.kind === 'inq' && supabase) {
      supabase.from('inquiries').select('*').eq('id', t.id).maybeSingle().then(({ data }) => {
        if (selRef.current === t.key) setDetail((data as Record<string, any>) ?? null)
      })
    }
    await loadMsgs(uid, t.key)
    await markRead(uid, t)
    setThreads((list) => list.map((x) => (x.key === t.key ? { ...x, unread: false } : x)))
  }

  async function send() {
    const sb = supabase
    const body = reply.trim()
    if (!sb || !uid || !sel || !body || sending) return
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

  useEffect(() => {
    if (autoRef.current || !ready || sel || threads.length === 0) return
    if (typeof window === 'undefined' || window.innerWidth < 1024) return
    autoRef.current = true
    open(threads[0])
  }, [ready, threads, sel])

  const cur = threads.find((t) => t.key === sel) ?? null
  const unreadCount = threads.filter((t) => t.unread).length
  const waitingCount = threads.filter((t) => t.waiting).length
  const needle = q.trim().toLowerCase()
  const shown = threads.filter((t) => {
    if (filter === 'unread' && !t.unread) return false
    if (filter === 'waiting' && !t.waiting) return false
    if (filter === 'inq' && t.kind !== 'inq') return false
    if (needle && !(t.name.toLowerCase().includes(needle) || t.snippet.toLowerCase().includes(needle))) return false
    return true
  })
  const detailRows: { label: string; value: string }[] = []
  if (detail) {
    const seen = new Set<string>()
    DETAIL_FIELDS.forEach(([k, label]) => {
      const v = detail[k]
      if (v == null || v === '' || typeof v === 'object' || seen.has(label)) return
      seen.add(label)
      detailRows.push({ label, value: fmtVal(v) })
    })
  }

  return (
    <div className="min-h-screen bg-paper xl:pl-60">
      <DashboardHeader active="messages" />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-brass">Messages</p>
        <h1 className="font-fraunces text-3xl font-semibold text-ink md:text-4xl">Messages and inquiries</h1>
        {unreadCount > 0 && <p className="mt-2 text-sm text-ink-soft">{unreadCount} unread</p>}

        {!ready ? (
          <p className="mt-8 text-sm text-ink-soft">Loading…</p>
        ) : threads.length === 0 ? (
          <p className="mt-8 text-sm text-ink-soft">No conversations yet. Inquiries from your website and messages from clients show up here.</p>
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
                {([['all', 'All'], ['unread', `Unread${unreadCount ? ` (${unreadCount})` : ''}`], ['waiting', `Needs reply${waitingCount ? ` (${waitingCount})` : ''}`], ['inq', 'Inquiries']] as [Filter, string][]).map(([v, label]) => (
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
                      onClick={() => open(t)}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-paper ${sel === t.key ? 'bg-paper' : ''}`}
                    >
                      <span className="relative shrink-0">
                        <Avatar name={t.name} path={t.avatar} />
                        {t.unread && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-card bg-brass" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className={`truncate text-sm ${t.unread ? 'font-semibold text-ink' : 'text-ink'}`}>{t.name}</span>
                          <span className="shrink-0 text-xs text-ink-soft">{when(t.lastAt)}</span>
                        </span>
                        <span className="flex items-center justify-between gap-2 text-xs text-ink-soft">
                          <span className="truncate">{t.kind === 'inq' ? 'Inquiry · ' : ''}{t.lastMine ? 'You: ' : ''}{t.snippet}</span>
                          {t.waiting && <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">Needs reply</span>}
                        </span>
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
                  <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
                    <button type="button" onClick={() => { selRef.current = null; setSel(null) }} className="text-sm text-ink-soft hover:text-ink lg:hidden">← All</button>
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={cur.name} path={cur.avatar} size="h-9 w-9" />
                      <p className="truncate font-fraunces text-xl font-semibold text-ink">{cur.name}</p>
                    </div>
                    {cur.kind === 'wed'
                      ? <Link href={`/sessions/${cur.id}`} className="text-sm text-twilight hover:underline">Open session →</Link>
                      : cur.convertedId
                        ? <Link href={`/sessions/${cur.convertedId}`} className="text-sm text-twilight hover:underline">Open session →</Link>
                        : <Link href="/sessions/new" className="text-sm text-twilight hover:underline">Create a session →</Link>}
                  </div>
                  {cur.kind === 'inq' && detailRows.length > 0 && (
                    <div className="mb-3 grid shrink-0 grid-cols-2 gap-x-4 gap-y-2 rounded-xl border border-line bg-paper px-3 py-2.5 sm:grid-cols-3">
                      {detailRows.map((r) => (
                        <div key={r.label} className="min-w-0">
                          <p className="text-[10px] uppercase tracking-wider text-ink-soft">{r.label}</p>
                          <p className="truncate text-sm text-ink">{r.value}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="min-h-0 flex-1 space-y-2 overflow-auto rounded-xl bg-paper p-3">
                    {msgs.map((m, i) => {
                      const showDay = i === 0 || new Date(m.at).toDateString() !== new Date(msgs[i - 1].at).toDateString()
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
                              <Body m={m} />
                              <div className={`mt-1 text-[10px] ${m.mine ? 'text-white/70' : 'text-ink-soft'}`}>{when(m.at)}</div>
                            </div>
                          </div>
                        </Fragment>
                      )
                    })}
                    <div ref={endRef} />
                  </div>
                  {error && <p className="mt-2 shrink-0 text-sm text-red-600">{error}</p>}
                  <div className="mt-3 flex shrink-0 gap-2 overflow-x-auto">
                    {QUICK.map((qr) => (
                      <button key={qr.label} type="button" onClick={() => setReply((r) => (r.trim() ? r.trimEnd() + '\n' + qr.text : qr.text))}
                        className="whitespace-nowrap rounded-full border border-line px-3 py-1 text-xs text-ink-soft transition hover:border-twilight hover:text-ink">{qr.label}</button>
                    ))}
                  </div>
                  <div className="mt-2 flex shrink-0 gap-2">
                    <textarea
                      rows={2}
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send() }
                      }}
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
