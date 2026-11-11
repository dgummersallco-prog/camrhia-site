'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { DashboardHeader } from '@/app/components/DashboardHeader'

type S = { id: string; names: string | null; wedding_date: string | null; session_type: string | null; status: string | null }
type Contact = { wedding_id: string; phone: string | null }
type Inquiry = { invited_wedding_id: string | null; email: string | null; phone: string | null }
type Client = { key: string; name: string; sessions: S[]; last: string | null; next: string | null; phone: string | null; email: string | null; fromWeb: boolean }

type Fam = { id: string; client_key: string; name: string; kind: string; date: string | null }
type FamIn = { name: string; kind: string; date: string }
type Person = { id: string; name: string; role: string | null; phone: string | null; email: string | null }
type Ct = Person & { client_key: string }
type CtIn = { name: string; role: string; phone: string; email: string }
type Note = { id: string; client_key: string; body: string; remind_on: string | null; done: boolean }
type NoteIn = { body: string; remind_on: string }
type Api = {
  addFam: (k: string, f: FamIn) => void
  delFam: (id: string) => void
  addCt: (k: string, v: CtIn) => void
  delCt: (id: string) => void
  addNote: (k: string, v: NoteIn) => void
  toggleNote: (n: Note) => void
  delNote: (id: string) => void
}

const ROSE = 'rgb(var(--scene-b, 184 98 106))'
const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const todayStr = () => fmt(new Date())
const addDays = (s: string, n: number) => { const [y, m, d] = s.split('-').map(Number); return fmt(new Date(y, m - 1, d + n)) }
const fmtDate = (d: string | null) => { if (!d) return 'No date'; const [y, m, day] = d.split('-').map(Number); return new Date(y, m - 1, day).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) }
const typeLabel = (t: string | null) => (t ? t.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()) : 'Session')
const isDue = (n: Note, limit: string) => !n.done && !!n.remind_on && n.remind_on <= limit

const KINDS: [string, string][] = [['child', 'Child'], ['spouse', 'Spouse'], ['partner', 'Partner'], ['anniversary', 'Anniversary'], ['other', 'Other']]
const FIELD = 'w-full rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs text-ink outline-none focus:border-twilight'
const LABEL = 'text-[11px] uppercase tracking-[0.12em] text-ink-soft'

const GLASS = {
  background: 'linear-gradient(160deg, rgba(255,255,255,0.62), rgba(255,255,255,0.34))',
  border: '1px solid rgba(255,255,255,0.75)',
  boxShadow: '0 18px 40px -22px rgba(90,50,60,0.45)',
} as const
const GLASS_BACK = {
  background: 'rgba(255,255,255,0.8)',
  border: '1px solid rgba(255,255,255,0.85)',
  boxShadow: '0 18px 40px -22px rgba(90,50,60,0.45)',
} as const

function FamilyBlock({ items, onAdd, onDelete }: { items: Fam[]; onAdd: (f: FamIn) => void; onDelete: (id: string) => void }) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [kind, setKind] = useState('child')
  const [date, setDate] = useState('')
  const field = FIELD
  function save() {
    const n = name.trim() || (kind === 'anniversary' ? 'Anniversary' : '')
    if (!n) return
    onAdd({ name: n, kind, date })
    setName(''); setDate(''); setKind('child'); setAdding(false)
  }
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className={LABEL}>Family</p>
        {!adding && <button type="button" onClick={() => setAdding(true)} className="text-xs font-medium text-twilight hover:underline">+ Add</button>}
      </div>
      {items.length === 0 && !adding && <p className="mt-1 text-xs text-ink-soft">Nothing added yet.</p>}
      {items.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {items.map((f) => (
            <span key={f.id} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1 text-xs text-ink">
              <span>{f.name}{f.date ? ' · ' + (f.kind === 'anniversary' ? '' : 'Birthday ') + fmtDate(f.date) : ''}</span>
              <button type="button" aria-label={'Remove ' + f.name} onClick={() => { if (window.confirm('Remove ' + f.name + '?')) onDelete(f.id) }} className="text-ink-soft hover:text-red-600">×</button>
            </span>
          ))}
        </div>
      )}
      {adding && (
        <div className="mt-2 space-y-2">
          <input className={field} placeholder={kind === 'anniversary' ? 'Label (optional)' : 'Name'} value={name} onChange={(e) => setName(e.target.value)} />
          <select className={field} value={kind} onChange={(e) => setKind(e.target.value)}>
            {KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <div>
            <p className="mb-0.5 text-[11px] text-ink-soft">{kind === 'anniversary' ? 'Anniversary date' : 'Birthday'}</p>
            <input type="date" className={field} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={save} className="rounded-lg bg-twilight px-3 py-1.5 text-xs font-medium text-white">Save</button>
            <button type="button" onClick={() => setAdding(false)} className="rounded-lg border border-line px-3 py-1.5 text-xs text-ink">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

function ContactsBlock({ items, onAdd, onDelete }: { items: Ct[]; onAdd: (v: CtIn) => void; onDelete: (id: string) => void }) {
  const empty: CtIn = { name: '', role: '', phone: '', email: '' }
  const [adding, setAdding] = useState(false)
  const [v, setV] = useState<CtIn>(empty)
  function save() {
    if (!v.name.trim()) return
    onAdd({ name: v.name.trim(), role: v.role.trim(), phone: v.phone.trim(), email: v.email.trim() })
    setV(empty); setAdding(false)
  }
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className={LABEL}>Who we talk to</p>
        {!adding && <button type="button" onClick={() => setAdding(true)} className="text-xs font-medium text-twilight hover:underline">+ Add</button>}
      </div>
      {items.length === 0 && !adding && <p className="mt-1 text-xs text-ink-soft">Add the coach, team mom, parent, whoever you deal with.</p>}
      <div className="mt-2 space-y-1.5">
        {items.map((p) => (
          <div key={p.id} className="flex items-start justify-between gap-2 rounded-xl border border-white/80 bg-white/70 px-3 py-2">
            <div className="min-w-0 text-xs">
              <p className="font-medium text-ink">{p.name}{p.role ? ' · ' + p.role : ''}</p>
              {(p.phone || p.email) && <p className="break-words text-ink-soft">{[p.phone, p.email].filter(Boolean).join(' · ')}</p>}
            </div>
            <button type="button" aria-label={'Remove ' + p.name} onClick={() => { if (window.confirm('Remove ' + p.name + '?')) onDelete(p.id) }} className="text-ink-soft hover:text-red-600">×</button>
          </div>
        ))}
      </div>
      {adding && (
        <div className="mt-2 space-y-2">
          <input className={FIELD} placeholder="Name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
          <input className={FIELD} placeholder="Role (Coach, Team mom, Mom...)" value={v.role} onChange={(e) => setV({ ...v, role: e.target.value })} />
          <input className={FIELD} placeholder="Phone" inputMode="tel" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} />
          <input className={FIELD} placeholder="Email" inputMode="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} />
          <div className="flex gap-2">
            <button type="button" onClick={save} className="rounded-lg bg-twilight px-3 py-1.5 text-xs font-medium text-white">Save</button>
            <button type="button" onClick={() => { setV(empty); setAdding(false) }} className="rounded-lg border border-line px-3 py-1.5 text-xs text-ink">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

function NotesBlock({ items, onAdd, onToggle, onDelete }: { items: Note[]; onAdd: (v: NoteIn) => void; onToggle: (n: Note) => void; onDelete: (id: string) => void }) {
  const [body, setBody] = useState('')
  const [date, setDate] = useState('')
  const limit = addDays(todayStr(), 14)
  function save() {
    if (!body.trim()) return
    onAdd({ body: body.trim(), remind_on: date })
    setBody(''); setDate('')
  }
  return (
    <div>
      <p className={LABEL}>Notes for future shoots</p>
      <div className="mt-2 space-y-1.5">
        {items.map((n) => (
          <div key={n.id} className="flex items-start gap-2 rounded-xl border border-white/80 bg-white/70 px-3 py-2">
            {n.remind_on && <input type="checkbox" checked={n.done} onChange={() => onToggle(n)} className="mt-0.5" aria-label="Done" />}
            <div className="min-w-0 flex-1 text-xs">
              <p className={'break-words text-ink ' + (n.done ? 'line-through opacity-60' : '')}>{n.body}</p>
              {n.remind_on && (
                <p className={isDue(n, limit) ? 'font-semibold' : 'text-ink-soft'} style={isDue(n, limit) ? { color: ROSE } : undefined}>
                  Remind {fmtDate(n.remind_on)}{isDue(n, limit) ? ' · due' : ''}
                </p>
              )}
            </div>
            <button type="button" aria-label="Delete note" onClick={() => { if (window.confirm('Delete this note?')) onDelete(n.id) }} className="text-ink-soft hover:text-red-600">×</button>
          </div>
        ))}
      </div>
      <div className="mt-2 space-y-2">
        <textarea className={FIELD} rows={2} placeholder="e.g. Son is 17, will need seniors next year" value={body} onChange={(e) => setBody(e.target.value)} />
        <div>
          <p className="mb-0.5 text-[11px] text-ink-soft">Remind me on (optional)</p>
          <input type="date" className={FIELD} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <button type="button" onClick={save} className="rounded-lg bg-twilight px-3 py-1.5 text-xs font-medium text-white">Add note</button>
      </div>
    </div>
  )
}

function ClientDetails({ c, fam, cts, notes, api }: { c: Client; fam: Fam[]; cts: Ct[]; notes: Note[]; api: Api }) {
  return (
    <div className="space-y-5">
      <div>
        <p className={LABEL}>Sessions</p>
        <div className="mt-2 space-y-2">
          {c.sessions.map((s) => (
            <Link key={s.id} href={`/sessions/${s.id}`} className="flex items-center justify-between gap-2 rounded-xl border border-white/80 bg-white/70 px-3 py-2 transition hover:border-ink">
              <span className="text-sm font-medium text-ink">{typeLabel(s.session_type)}</span>
              <span className="text-[11px] text-ink-soft">{fmtDate(s.wedding_date)}</span>
            </Link>
          ))}
        </div>
      </div>
      <NotesBlock items={notes} onAdd={(v) => api.addNote(c.key, v)} onToggle={api.toggleNote} onDelete={api.delNote} />
      <ContactsBlock items={cts} onAdd={(v) => api.addCt(c.key, v)} onDelete={api.delCt} />
      <FamilyBlock items={fam} onAdd={(f) => api.addFam(c.key, f)} onDelete={api.delFam} />
    </div>
  )
}

function ClientCard({ c, fam, cts, notes, api }: { c: Client; fam: Fam[]; cts: Ct[]; notes: Note[]; api: Api }) {
  const [flipped, setFlipped] = useState(false)
  const stop = (e: React.MouseEvent) => e.stopPropagation()
  const face = 'absolute inset-0 overflow-hidden rounded-2xl border border-line shadow-lg'
  const faceStyle = {
    background: '#FFFFFF',
    backfaceVisibility: 'hidden' as const,
    WebkitBackfaceVisibility: 'hidden' as const,
  }
  const pill = 'rounded-full border border-white/80 bg-white/70 px-3 py-1 text-xs font-medium text-ink transition hover:border-ink'
  const limit = addDays(todayStr(), 14)
  const due = notes.some((n) => isDue(n, limit))
  const people: Person[] = cts.length
    ? cts
    : c.phone || c.email
      ? [{ id: 'primary', name: 'Primary contact', role: null, phone: c.phone, email: c.email }]
      : []
  const types = Array.from(new Set(c.sessions.map((s) => typeLabel(s.session_type)))).join(' · ')

  return (
    <div className="w-full" style={{ perspective: '1200px', aspectRatio: '4 / 5' }}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setFlipped((f) => !f)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFlipped((f) => !f) } }}
        className="relative h-full w-full cursor-pointer transition-transform duration-500"
        style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'none' }}
      >
        {/* FRONT */}
        <div className={face} style={{ ...faceStyle, ...GLASS }}>
          {due && <span className="absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white" style={{ background: ROSE }}>Reminder</span>}
          <div className="flex h-full flex-col px-5 pb-5 pt-6">
            <p className="line-clamp-2 break-words text-center font-fraunces text-2xl font-bold leading-tight text-ink">{c.name}</p>
            <p className="mt-1 truncate text-center text-xs text-ink-soft">{types}</p>
            <div className="mt-4 min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-0.5" onClick={stop}>
              {people.length === 0 && <p className="pt-4 text-center text-xs text-ink-soft">Flip the card to add who you talk to.</p>}
              {people.map((p) => (
                <div key={p.id} className="rounded-xl border border-white/80 bg-white/60 px-3 py-2.5">
                  <p className="text-sm font-semibold text-ink">{p.name}</p>
                  {p.role && <p className="text-[11px] uppercase tracking-[0.12em] text-ink-soft">{p.role}</p>}
                  {(p.phone || p.email) && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {p.phone && <a href={`tel:${p.phone}`} className={pill}>Call</a>}
                      {p.phone && <a href={`sms:${p.phone}`} className={pill}>Text</a>}
                      {p.email && <a href={`mailto:${p.email}`} className={pill}>Email</a>}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <Link href="/messages" onClick={stop} className="mt-3 rounded-xl bg-[rgb(var(--scene-b,201_133_136))] px-4 py-2.5 text-center text-sm font-medium text-white transition hover:opacity-90">Message on Camrhia</Link>
          </div>
        </div>

        {/* BACK */}
        <div className={face} style={{ ...faceStyle, ...GLASS_BACK, transform: 'rotateY(180deg)' }}>
          <div className="flex h-full flex-col p-5">
            <p className="truncate font-fraunces text-lg font-semibold text-ink">{c.name}</p>
            {c.fromWeb && <p className="mt-1 text-xs text-ink-soft">Came in through your website</p>}
            <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1" onClick={stop}>
              <ClientDetails c={c} fam={fam} cts={cts} notes={notes} api={api} />
            </div>
            <p className="mt-3 text-center text-[11px] text-ink-soft">Tap to flip back</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ClientsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sessions, setSessions] = useState<S[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<'recent' | 'name'>('recent')
  const [view, setView] = useState<'cards' | 'list'>('cards')
  const [open, setOpen] = useState<string | null>(null)
  const [fams, setFams] = useState<Fam[]>([])
  const [cts, setCts] = useState<Ct[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [uid, setUid] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      if (!supabase) { router.push('/login'); return }
      const { data: sess } = await supabase.auth.getSession()
      if (!sess.session) { router.push('/login'); return }
      setUid(sess.session.user.id)
      const { data, error: e } = await supabase.from('weddings').select('id, names, wedding_date, session_type, status').order('wedding_date', { ascending: false, nullsFirst: false })
      if (e) { setError(e.message); setLoading(false); return }
      const rows = (data ?? []) as S[]
      setSessions(rows)
      const ids = rows.map((r) => r.id)
      const cs: Contact[] = []
      const inq: Inquiry[] = []
      for (let i = 0; i < ids.length; i += 100) {
        const chunk = ids.slice(i, i + 100)
        const { data: c } = await supabase.from('wedding_contacts').select('wedding_id, phone').in('wedding_id', chunk)
        cs.push(...((c ?? []) as Contact[]))
        const { data: w } = await supabase.from('web_inquiries').select('invited_wedding_id, email, phone').in('invited_wedding_id', chunk)
        inq.push(...((w ?? []) as Inquiry[]))
      }
      setContacts(cs)
      setInquiries(inq)
      const { data: fm } = await supabase.from('client_family').select('id, client_key, name, kind, date').order('date', { ascending: true })
      setFams((fm ?? []) as Fam[])
      const { data: ct } = await supabase.from('client_contacts').select('id, client_key, name, role, phone, email').order('created_at', { ascending: true })
      setCts((ct ?? []) as Ct[])
      const { data: nt } = await supabase.from('client_notes').select('id, client_key, body, remind_on, done').order('remind_on', { ascending: true, nullsFirst: false })
      setNotes((nt ?? []) as Note[])
      setLoading(false)
    }
    load()
  }, [router])

  const api: Api = {
    async addFam(key, f) {
      if (!supabase || !uid) return
      const { data, error: e } = await supabase.from('client_family').insert({ owner_id: uid, client_key: key, name: f.name, kind: f.kind, date: f.date || null }).select('id, client_key, name, kind, date').single()
      if (e) { setError(e.message); return }
      setFams((l) => [...l, data as Fam])
    },
    async delFam(id) {
      if (!supabase) return
      const { error: e } = await supabase.from('client_family').delete().eq('id', id)
      if (e) { setError(e.message); return }
      setFams((l) => l.filter((x) => x.id !== id))
    },
    async addCt(key, v) {
      if (!supabase || !uid) return
      const { data, error: e } = await supabase.from('client_contacts').insert({ owner_id: uid, client_key: key, name: v.name, role: v.role || null, phone: v.phone || null, email: v.email || null }).select('id, client_key, name, role, phone, email').single()
      if (e) { setError(e.message); return }
      setCts((l) => [...l, data as Ct])
    },
    async delCt(id) {
      if (!supabase) return
      const { error: e } = await supabase.from('client_contacts').delete().eq('id', id)
      if (e) { setError(e.message); return }
      setCts((l) => l.filter((x) => x.id !== id))
    },
    async addNote(key, v) {
      if (!supabase || !uid) return
      const { data, error: e } = await supabase.from('client_notes').insert({ owner_id: uid, client_key: key, body: v.body, remind_on: v.remind_on || null }).select('id, client_key, body, remind_on, done').single()
      if (e) { setError(e.message); return }
      setNotes((l) => [...l, data as Note])
    },
    async toggleNote(n) {
      if (!supabase) return
      const { error: e } = await supabase.from('client_notes').update({ done: !n.done }).eq('id', n.id)
      if (e) { setError(e.message); return }
      setNotes((l) => l.map((x) => (x.id === n.id ? { ...x, done: !x.done } : x)))
    },
    async delNote(id) {
      if (!supabase) return
      const { error: e } = await supabase.from('client_notes').delete().eq('id', id)
      if (e) { setError(e.message); return }
      setNotes((l) => l.filter((x) => x.id !== id))
    },
  }

  const famBy = useMemo(() => {
    const m: Record<string, Fam[]> = {}
    for (const f of fams) (m[f.client_key] ??= []).push(f)
    return m
  }, [fams])
  const ctBy = useMemo(() => {
    const m: Record<string, Ct[]> = {}
    for (const c of cts) (m[c.client_key] ??= []).push(c)
    return m
  }, [cts])
  const noteBy = useMemo(() => {
    const m: Record<string, Note[]> = {}
    for (const n of notes) (m[n.client_key] ??= []).push(n)
    return m
  }, [notes])

  const clients = useMemo(() => {
    const today = todayStr()
    const phoneBy: Record<string, string> = {}
    const emailBy: Record<string, string> = {}
    const webBy: Record<string, boolean> = {}
    for (const ct of contacts) { if (ct.phone && !phoneBy[ct.wedding_id]) phoneBy[ct.wedding_id] = ct.phone }
    for (const iq of inquiries) {
      const wid = iq.invited_wedding_id
      if (!wid) continue
      webBy[wid] = true
      if (iq.email && !emailBy[wid]) emailBy[wid] = iq.email
      if (iq.phone && !phoneBy[wid]) phoneBy[wid] = iq.phone
    }
    const map = new Map<string, Client>()
    for (const s of sessions) {
      const name = (s.names ?? '').trim()
      const key = name ? name.toLowerCase() : 'unnamed-' + s.id
      let c = map.get(key)
      if (!c) { c = { key, name: name || 'Unnamed client', sessions: [], last: null, next: null, phone: null, email: null, fromWeb: false }; map.set(key, c) }
      c.sessions.push(s)
      if (!c.phone && phoneBy[s.id]) c.phone = phoneBy[s.id]
      if (!c.email && emailBy[s.id]) c.email = emailBy[s.id]
      if (webBy[s.id]) c.fromWeb = true
      const d = s.wedding_date
      if (d) {
        if (d >= today) { if (!c.next || d < c.next) c.next = d }
        else if (!c.last || d > c.last) c.last = d
      }
    }
    return Array.from(map.values())
  }, [sessions, contacts, inquiries])

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase()
    const list = clients.filter((c) => !term || c.name.toLowerCase().includes(term))
    const recentKey = (c: Client) => c.next ?? c.last ?? ''
    if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name))
    else list.sort((a, b) => (recentKey(a) < recentKey(b) ? 1 : -1))
    return list
  }, [clients, q, sort])

  const limit = addDays(todayStr(), 14)
  const reminders = useMemo(() => {
    const nameBy: Record<string, string> = {}
    for (const c of clients) nameBy[c.key] = c.name
    return notes
      .filter((n) => isDue(n, limit) && nameBy[n.client_key])
      .sort((a, b) => ((a.remind_on ?? '') < (b.remind_on ?? '') ? -1 : 1))
      .map((n) => ({ ...n, name: nameBy[n.client_key] }))
  }, [notes, clients, limit])

  const input = 'rounded-xl border border-white/70 bg-white/60 px-4 py-2.5 text-sm text-ink outline-none focus:border-twilight'

  return (
    <div className="min-h-screen bg-paper xl:pl-60">
      <DashboardHeader active="clients" />
      <main className={'mx-auto px-6 py-10 ' + (view === 'cards' ? 'max-w-6xl' : 'max-w-4xl')}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-fraunces text-4xl font-bold text-ink">Clients</h1>
            {!loading && <p className="mt-1 text-sm text-ink-soft">{clients.length} {clients.length === 1 ? 'client' : 'clients'}</p>}
          </div>
          <Link href="/sessions/new" className="rounded-xl bg-[rgb(var(--scene-b,201_133_136))] px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90">+ New session</Link>
        </div>

        {error && <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        {reminders.length > 0 && (
          <section className="mt-6 rounded-2xl border border-white/70 bg-white/60 p-4 backdrop-blur-xl">
            <p className={LABEL}>Reminders</p>
            <div className="mt-2 space-y-1.5">
              {reminders.map((n) => (
                <div key={n.id} className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                  <span className="text-ink"><span className="font-semibold">{n.name}</span> · {n.body}</span>
                  <span className={'text-xs ' + ((n.remind_on ?? '') < todayStr() ? 'font-semibold' : 'text-ink-soft')} style={(n.remind_on ?? '') < todayStr() ? { color: ROSE } : undefined}>{fmtDate(n.remind_on)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {loading ? (
          <p className="mt-8 text-sm text-ink-soft">Loading…</p>
        ) : clients.length === 0 ? (
          <section className="mt-8 rounded-2xl border border-line bg-card p-8 text-center">
            <p className="font-fraunces text-lg font-semibold text-ink">No clients yet</p>
            <p className="mt-2 text-sm text-ink-soft">Clients appear here as you add sessions.</p>
          </section>
        ) : (
          <>
            <div className="mt-6 flex flex-wrap gap-3">
              <input className={input + ' min-w-[14rem] flex-1'} placeholder="Search clients" value={q} onChange={(e) => setQ(e.target.value)} />
              <select className={input} value={sort} onChange={(e) => setSort(e.target.value as 'recent' | 'name')}>
                <option value="recent">Most recent</option>
                <option value="name">Name A to Z</option>
              </select>
              <div className="flex overflow-hidden rounded-xl border border-white/70 bg-white/60 text-sm">
                {(['cards', 'list'] as const).map((v) => (
                  <button key={v} type="button" onClick={() => setView(v)} className={'px-4 py-2.5 font-medium transition ' + (view === v ? 'bg-[rgb(var(--scene-b,201_133_136))] text-white' : 'text-ink-soft hover:text-ink')}>
                    {v === 'cards' ? 'Cards' : 'List'}
                  </button>
                ))}
              </div>
            </div>

            {shown.length === 0 && <p className="mt-5 text-sm text-ink-soft">No clients match that search.</p>}

            {view === 'cards' ? (
              <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {shown.map((c) => <ClientCard key={c.key} c={c} fam={famBy[c.key] ?? []} cts={ctBy[c.key] ?? []} notes={noteBy[c.key] ?? []} api={api} />)}
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {shown.map((c) => {
                  const cn = ctBy[c.key] ?? []
                  const nn = noteBy[c.key] ?? []
                  const due = nn.some((n) => isDue(n, limit))
                  return (
                    <div key={c.key} className="rounded-2xl border border-white/60 bg-white/50 backdrop-blur-xl">
                      <button type="button" onClick={() => setOpen(open === c.key ? null : c.key)} className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-4 text-left">
                        <span className="min-w-0">
                          <span className="block truncate font-fraunces text-lg font-semibold text-ink">{c.name}</span>
                          <span className="block truncate text-xs text-ink-soft">
                            {cn.length ? cn.map((p) => p.name + (p.role ? ' (' + p.role + ')' : '')).join(' · ') : c.phone || c.email || 'No contact added'}
                          </span>
                        </span>
                        {due && <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-white" style={{ background: ROSE }}>Reminder</span>}
                      </button>
                      {open === c.key && (
                        <div className="border-t border-line px-5 py-4">
                          <ClientDetails c={c} fam={famBy[c.key] ?? []} cts={cn} notes={nn} api={api} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
