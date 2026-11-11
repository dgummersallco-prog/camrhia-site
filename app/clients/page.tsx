'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { DashboardHeader } from '@/app/components/DashboardHeader'

type S = { id: string; names: string | null; wedding_date: string | null; session_type: string | null; status: string | null }
type Pay = { wedding_id: string; amount: number | null; status: string | null }
type Contact = { wedding_id: string; phone: string | null }
type Inquiry = { invited_wedding_id: string | null; email: string | null; phone: string | null }
type Client = { key: string; name: string; sessions: S[]; paid: number; owed: number; last: string | null; next: string | null; phone: string | null; email: string | null; fromWeb: boolean }

type Fam = { id: string; client_key: string; name: string; kind: string; date: string | null }
type FamIn = { name: string; kind: string; date: string }

const ROSE = '#8C6B3F'
const money = (n: number) => '$' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const fmtDate = (d: string | null) => { if (!d) return 'No date'; const [y, m, day] = d.split('-').map(Number); return new Date(y, m - 1, day).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) }
const typeLabel = (t: string | null) => (t ? t.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()) : 'Session')

function suitFor(t: string | null): { g: string; red: boolean } {
  const k = (t ?? '').toLowerCase()
  if (/wedding|engagement|proposal|boudoir|elope/.test(k)) return { g: '♥', red: true }
  if (/family|maternity|newborn/.test(k)) return { g: '♣', red: false }
  if (/senior|graduation|headshot|branding|portrait/.test(k)) return { g: '♦', red: true }
  return { g: '♠', red: false }
}

const KINDS: [string, string][] = [['child', 'Child'], ['spouse', 'Spouse'], ['partner', 'Partner'], ['anniversary', 'Anniversary'], ['other', 'Other']]

function FamilyBlock({ items, onAdd, onDelete }: { items: Fam[]; onAdd: (f: FamIn) => void; onDelete: (id: string) => void }) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [kind, setKind] = useState('child')
  const [date, setDate] = useState('')
  const field = 'w-full rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs text-ink outline-none focus:border-twilight'
  function save() {
    const n = name.trim() || (kind === 'anniversary' ? 'Anniversary' : '')
    if (!n) return
    onAdd({ name: n, kind, date })
    setName(''); setDate(''); setKind('child'); setAdding(false)
  }
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.12em] text-ink-soft">Family</p>
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

function ClientCard({ c, fam, onAdd, onDelete }: { c: Client; fam: Fam[]; onAdd: (f: FamIn) => void; onDelete: (id: string) => void }) {
  const [flipped, setFlipped] = useState(false)
  const latestType = c.sessions[0]?.session_type ?? null
  const suit = suitFor(latestType)
  const mark = (typeLabel(latestType)[0] ?? 'S').toUpperCase()
  const color = suit.red ? ROSE : '#2B2B2B'
  const total = c.paid + c.owed
  const pct = total > 0 ? Math.round((c.paid / total) * 100) : 0
  const stop = (e: React.MouseEvent) => e.stopPropagation()
  const face = 'absolute inset-0 overflow-hidden rounded-2xl border border-line shadow-lg'
  const faceStyle = {
    background: 'linear-gradient(160deg, #FFFCF9 0%, #F8EAE4 100%)',
    backfaceVisibility: 'hidden' as const,
    WebkitBackfaceVisibility: 'hidden' as const,
  }
  const pill = 'rounded-full border border-line bg-white px-3 py-1 text-xs font-medium text-ink transition hover:border-ink'

  return (
    <div className="w-full" style={{ perspective: '1200px', aspectRatio: '5 / 7' }}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setFlipped((f) => !f)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFlipped((f) => !f) } }}
        className="relative h-full w-full cursor-pointer transition-transform duration-500"
        style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'none' }}
      >
        {/* FRONT */}
        <div className={face} style={faceStyle}>
          <div className="absolute left-4 top-3 text-center leading-none" style={{ color }}>
            <div className="font-fraunces text-2xl font-semibold">{mark}</div>
            <div className="mt-1 text-xl">{suit.g}</div>
          </div>
          <div className="absolute bottom-3 right-4 rotate-180 text-center leading-none" style={{ color }}>
            <div className="font-fraunces text-2xl font-semibold">{mark}</div>
            <div className="mt-1 text-xl">{suit.g}</div>
          </div>

          <div className="absolute inset-x-6 bottom-[26%] top-[16%] flex flex-col items-center justify-center text-center">
            <p className="line-clamp-3 break-words font-fraunces text-2xl font-semibold leading-tight text-ink">{c.name}</p>
            <p className="mt-2 text-xs text-ink-soft">
              {c.sessions.length} {c.sessions.length === 1 ? 'session' : 'sessions'}
              {c.next ? ' · Next ' + fmtDate(c.next) : c.last ? ' · Last ' + fmtDate(c.last) : ''}
            </p>
            {(c.phone || c.email) && (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {c.phone && <a href={`tel:${c.phone}`} onClick={stop} className={pill}>Call</a>}
                {c.phone && <a href={`sms:${c.phone}`} onClick={stop} className={pill}>Text</a>}
                {c.email && <a href={`mailto:${c.email}`} onClick={stop} className={pill}>Email</a>}
              </div>
            )}
          </div>

          <div className="absolute bottom-4 left-5 right-16">
            <div className="flex justify-between text-[11px] uppercase tracking-[0.12em] text-ink-soft">
              <span>Paid {money(c.paid)}</span>
              <span className={c.owed > 0 ? 'font-semibold' : ''} style={c.owed > 0 ? { color: ROSE } : undefined}>Owed {money(c.owed)}</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full" style={{ width: pct + '%', backgroundColor: ROSE }} />
            </div>
          </div>
        </div>

        {/* BACK */}
        <div className={face} style={{ ...faceStyle, transform: 'rotateY(180deg)' }}>
          <div className="flex h-full flex-col p-5">
            <p className="truncate font-fraunces text-lg font-semibold text-ink">{c.name}</p>
            <p className="mt-3 text-[11px] uppercase tracking-[0.12em] text-ink-soft">Lifetime paid</p>
            <p className="font-fraunces text-3xl font-semibold" style={{ color: ROSE }}>{money(c.paid)}</p>
            {c.fromWeb && <p className="mt-2 text-xs text-ink-soft">Came in through your website</p>}
            <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1" onClick={stop}>
              <FamilyBlock items={fam} onAdd={onAdd} onDelete={onDelete} />
              <p className="mt-4 text-[11px] uppercase tracking-[0.12em] text-ink-soft">Sessions</p>
            <div className="mt-2 space-y-2">
              {c.sessions.map((s) => (
                <Link key={s.id} href={`/sessions/${s.id}`} onClick={stop} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-white px-3 py-2 transition hover:border-ink">
                  <span className="text-sm font-medium text-ink">{typeLabel(s.session_type)}</span>
                  <span className="text-[11px] text-ink-soft">{fmtDate(s.wedding_date)}</span>
                </Link>
              ))}
            </div>
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
  const [pays, setPays] = useState<Pay[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<'recent' | 'name' | 'paid'>('recent')
  const [view, setView] = useState<'cards' | 'list'>('cards')
  const [open, setOpen] = useState<string | null>(null)
  const [fams, setFams] = useState<Fam[]>([])
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
      const all: Pay[] = []
      const cts: Contact[] = []
      const inq: Inquiry[] = []
      for (let i = 0; i < ids.length; i += 100) {
        const chunk = ids.slice(i, i + 100)
        const { data: p } = await supabase.from('payment_schedule').select('wedding_id, amount, status').in('wedding_id', chunk)
        all.push(...((p ?? []) as Pay[]))
        const { data: c } = await supabase.from('wedding_contacts').select('wedding_id, phone').in('wedding_id', chunk)
        cts.push(...((c ?? []) as Contact[]))
        const { data: w } = await supabase.from('web_inquiries').select('invited_wedding_id, email, phone').in('invited_wedding_id', chunk)
        inq.push(...((w ?? []) as Inquiry[]))
      }
      setPays(all)
      setContacts(cts)
      setInquiries(inq)
      const { data: fm } = await supabase.from('client_family').select('id, client_key, name, kind, date').order('date', { ascending: true })
      setFams((fm ?? []) as Fam[])
      setLoading(false)
    }
    load()
  }, [router])

  async function addFam(key: string, f: FamIn) {
    if (!supabase || !uid) return
    const { data, error: e } = await supabase.from('client_family').insert({ owner_id: uid, client_key: key, name: f.name, kind: f.kind, date: f.date || null }).select('id, client_key, name, kind, date').single()
    if (e) { setError(e.message); return }
    setFams((l) => [...l, data as Fam])
  }
  async function delFam(id: string) {
    if (!supabase) return
    const { error: e } = await supabase.from('client_family').delete().eq('id', id)
    if (e) { setError(e.message); return }
    setFams((l) => l.filter((x) => x.id !== id))
  }
  const famBy = useMemo(() => {
    const m: Record<string, Fam[]> = {}
    for (const f of fams) (m[f.client_key] ??= []).push(f)
    return m
  }, [fams])

  const clients = useMemo(() => {
    const today = todayStr()
    const byWedding: Record<string, { paid: number; owed: number }> = {}
    for (const p of pays) {
      const b = (byWedding[p.wedding_id] ??= { paid: 0, owed: 0 })
      if (p.status === 'paid') b.paid += Number(p.amount || 0)
      else b.owed += Number(p.amount || 0)
    }
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
      if (!c) { c = { key, name: name || 'Unnamed client', sessions: [], paid: 0, owed: 0, last: null, next: null, phone: null, email: null, fromWeb: false }; map.set(key, c) }
      c.sessions.push(s)
      c.paid += byWedding[s.id]?.paid ?? 0
      c.owed += byWedding[s.id]?.owed ?? 0
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
  }, [sessions, pays, contacts, inquiries])

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase()
    const list = clients.filter((c) => !term || c.name.toLowerCase().includes(term))
    const recentKey = (c: Client) => c.next ?? c.last ?? ''
    if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name))
    else if (sort === 'paid') list.sort((a, b) => b.paid - a.paid)
    else list.sort((a, b) => (recentKey(a) < recentKey(b) ? 1 : -1))
    return list
  }, [clients, q, sort])

  const input = 'rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none focus:border-twilight'

  return (
    <div className="min-h-screen bg-paper xl:pl-60">
      <DashboardHeader active="clients" />
      <main className={'mx-auto px-6 py-10 ' + (view === 'cards' ? 'max-w-6xl' : 'max-w-4xl')}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-fraunces text-3xl font-semibold text-ink">Clients</h1>
            {!loading && <p className="mt-1 text-sm text-ink-soft">{clients.length} {clients.length === 1 ? 'client' : 'clients'} · {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}</p>}
          </div>
          <Link href="/sessions/new" className="rounded-xl bg-twilight px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90">+ New session</Link>
        </div>

        {error && <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
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
              <select className={input} value={sort} onChange={(e) => setSort(e.target.value as 'recent' | 'name' | 'paid')}>
                <option value="recent">Most recent</option>
                <option value="name">Name A to Z</option>
                <option value="paid">Most paid</option>
              </select>
              <div className="flex overflow-hidden rounded-xl border border-line bg-white text-sm">
                {(['cards', 'list'] as const).map((v) => (
                  <button key={v} type="button" onClick={() => setView(v)} className={'px-4 py-2.5 font-medium transition ' + (view === v ? 'bg-twilight text-white' : 'text-ink-soft hover:text-ink')}>
                    {v === 'cards' ? 'Cards' : 'List'}
                  </button>
                ))}
              </div>
            </div>

            {shown.length === 0 && <p className="mt-5 text-sm text-ink-soft">No clients match that search.</p>}

            {view === 'cards' ? (
              <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {shown.map((c) => <ClientCard key={c.key} c={c} fam={famBy[c.key] ?? []} onAdd={(f) => addFam(c.key, f)} onDelete={delFam} />)}
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {shown.map((c) => (
                  <div key={c.key} className="rounded-2xl border border-line bg-card">
                    <button type="button" onClick={() => setOpen(open === c.key ? null : c.key)} className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-4 text-left">
                      <span className="min-w-0">
                        <span className="block truncate font-fraunces text-lg font-semibold text-ink">{c.name}</span>
                        <span className="block text-xs text-ink-soft">
                          {c.sessions.length} {c.sessions.length === 1 ? 'session' : 'sessions'}
                          {c.next ? ' · Next ' + fmtDate(c.next) : c.last ? ' · Last ' + fmtDate(c.last) : ''}
                        </span>
                      </span>
                      <span className="flex items-center gap-5 text-right">
                        <span><span className="block text-[11px] uppercase tracking-[0.12em] text-ink-soft">Paid</span><span className="text-sm font-medium text-ink">{money(c.paid)}</span></span>
                        <span><span className="block text-[11px] uppercase tracking-[0.12em] text-ink-soft">Owed</span><span className={'text-sm font-medium ' + (c.owed > 0 ? 'text-twilight' : 'text-ink')}>{money(c.owed)}</span></span>
                      </span>
                    </button>
                    {open === c.key && (
                      <div className="space-y-2 border-t border-line px-5 py-4">
                        <FamilyBlock items={famBy[c.key] ?? []} onAdd={(f) => addFam(c.key, f)} onDelete={delFam} />
                        {c.sessions.map((s) => (
                          <Link key={s.id} href={`/sessions/${s.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3 transition hover:border-ink">
                            <span className="text-sm font-medium text-ink">{typeLabel(s.session_type)}</span>
                            <span className="text-xs text-ink-soft">{fmtDate(s.wedding_date)}{s.status ? ' · ' + s.status.replace(/_/g, ' ') : ''}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
