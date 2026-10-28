'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { DashboardHeader } from '@/app/components/DashboardHeader'

type S = { id: string; names: string | null; wedding_date: string | null; session_type: string | null; status: string | null }
type Pay = { wedding_id: string; amount: number | null; status: string | null }
type Client = { key: string; name: string; sessions: S[]; paid: number; owed: number; last: string | null; next: string | null }

const money = (n: number) => '$' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const fmtDate = (d: string | null) => { if (!d) return 'No date'; const [y, m, day] = d.split('-').map(Number); return new Date(y, m - 1, day).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) }
const typeLabel = (t: string | null) => (t ? t.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()) : 'Session')

export default function ClientsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sessions, setSessions] = useState<S[]>([])
  const [pays, setPays] = useState<Pay[]>([])
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<'recent' | 'name' | 'paid'>('recent')
  const [open, setOpen] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      if (!supabase) { router.push('/login'); return }
      const { data: sess } = await supabase.auth.getSession()
      if (!sess.session) { router.push('/login'); return }
      const { data, error: e } = await supabase.from('weddings').select('id, names, wedding_date, session_type, status').order('wedding_date', { ascending: false, nullsFirst: false })
      if (e) { setError(e.message); setLoading(false); return }
      const rows = (data ?? []) as S[]
      setSessions(rows)
      const ids = rows.map((r) => r.id)
      const all: Pay[] = []
      for (let i = 0; i < ids.length; i += 100) {
        const { data: p } = await supabase.from('payment_schedule').select('wedding_id, amount, status').in('wedding_id', ids.slice(i, i + 100))
        all.push(...((p ?? []) as Pay[]))
      }
      setPays(all)
      setLoading(false)
    }
    load()
  }, [router])

  const clients = useMemo(() => {
    const today = todayStr()
    const byWedding: Record<string, { paid: number; owed: number }> = {}
    for (const p of pays) {
      const b = (byWedding[p.wedding_id] ??= { paid: 0, owed: 0 })
      if (p.status === 'paid') b.paid += Number(p.amount || 0)
      else b.owed += Number(p.amount || 0)
    }
    const map = new Map<string, Client>()
    for (const s of sessions) {
      const name = (s.names ?? '').trim()
      const key = name ? name.toLowerCase() : 'unnamed-' + s.id
      let c = map.get(key)
      if (!c) { c = { key, name: name || 'Unnamed client', sessions: [], paid: 0, owed: 0, last: null, next: null }; map.set(key, c) }
      c.sessions.push(s)
      c.paid += byWedding[s.id]?.paid ?? 0
      c.owed += byWedding[s.id]?.owed ?? 0
      const d = s.wedding_date
      if (d) {
        if (d >= today) { if (!c.next || d < c.next) c.next = d }
        else if (!c.last || d > c.last) c.last = d
      }
    }
    return Array.from(map.values())
  }, [sessions, pays])

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
      <main className="mx-auto max-w-4xl px-6 py-10">
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
            </div>
            <div className="mt-5 space-y-3">
              {shown.length === 0 && <p className="text-sm text-ink-soft">No clients match that search.</p>}
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
          </>
        )}
      </main>
    </div>
  )
}
