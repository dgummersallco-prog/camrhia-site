'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { DashboardHeader } from '@/app/components/DashboardHeader'

type Session = {
  id: string
  names: string | null
  wedding_date: string | null
  session_type: string | null
  status: string | null
  city: string | null
  state: string | null
  venue: string | null
  package_name: string | null
  gallery_url: string | null
  paid_in_full: boolean | null
}

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function toDate(d: string): Date {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, m - 1, day)
}

function daysFrom(d: string, today: string): number {
  return Math.round((toDate(d).getTime() - toDate(today).getTime()) / 86400000)
}

function countdown(n: number): string {
  if (n === 0) return 'Today'
  if (n === 1) return 'Tomorrow'
  if (n === -1) return 'Yesterday'
  if (n > 1) return `In ${n} days`
  return `${-n} days ago`
}

function monthLabel(d: string | null): string {
  if (!d) return 'No date yet'
  return toDate(d).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

export function fmtDate(d: string | null): string {
  if (!d) return 'No date yet'
  return toDate(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function prettyType(t: string | null): string {
  if (!t) return 'Session'
  return t.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
}

export default function SessionsPage() {
  const router = useRouter()
  const [rows, setRows] = useState<Session[] | null>(null)
  const [contracts, setContracts] = useState<Record<string, string>>({})
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming')
  const [typeFilter, setTypeFilter] = useState('')
  const [q, setQ] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const sb = supabase
      if (!sb) return
      const { data: sess } = await sb.auth.getSession()
      if (!sess.session) { router.replace('/login?next=/sessions'); return }
      const uid = sess.session.user.id
      const { data, error: e } = await sb
        .from('weddings')
        .select('id, names, wedding_date, session_type, status, city, state, venue, package_name, gallery_url, paid_in_full')
        .order('wedding_date', { ascending: false, nullsFirst: false })
      if (e) { setError(e.message); return }
      setRows((data ?? []) as Session[])
      const { data: cs } = await sb.from('contracts').select('wedding_id, status').eq('owner_id', uid)
      const map: Record<string, string> = {}
      for (const c of (cs ?? []) as { wedding_id: string; status: string | null }[]) {
        const prev = map[c.wedding_id]
        const st = c.status === 'signed' ? 'signed' : c.status === 'sent' ? 'sent' : 'draft'
        if (!prev || st === 'signed' || (st === 'sent' && prev === 'draft')) map[c.wedding_id] = st
      }
      setContracts(map)
    }
    load()
  }, [router])

  const today = todayStr()

  const needsAttention = (s: Session) => {
    const past = !!s.wedding_date && s.wedding_date < today
    return contracts[s.id] === 'sent' || (past && (!s.gallery_url || !s.paid_in_full))
  }

  const stats = useMemo(() => {
    if (!rows) return { next30: 0, thisMonth: 0, attention: 0 }
    const month = today.slice(0, 7)
    let next30 = 0, thisMonth = 0, attention = 0
    for (const s of rows) {
      if (s.wedding_date) {
        const n = daysFrom(s.wedding_date, today)
        if (n >= 0 && n <= 30) next30++
        if (s.wedding_date.slice(0, 7) === month) thisMonth++
      }
      const past = !!s.wedding_date && s.wedding_date < today
      if (contracts[s.id] === 'sent' || (past && (!s.gallery_url || !s.paid_in_full))) attention++
    }
    return { next30, thisMonth, attention }
  }, [rows, contracts, today])

  const types = useMemo(() => {
    const set = new Set<string>()
    for (const r of rows ?? []) if (r.session_type) set.add(r.session_type)
    return Array.from(set).sort()
  }, [rows])

  const shown = useMemo(() => {
    if (!rows) return []
    const needle = q.trim().toLowerCase()
    let list = rows.filter((r) => {
      if (filter === 'upcoming' && !(r.wedding_date && r.wedding_date >= today)) return false
      if (filter === 'past' && !(r.wedding_date && r.wedding_date < today)) return false
      if (typeFilter && r.session_type !== typeFilter) return false
      if (needle) {
        const hay = `${r.names ?? ''} ${r.venue ?? ''} ${r.city ?? ''} ${r.session_type ?? ''}`.toLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })
    if (filter === 'upcoming') list = [...list].sort((a, b) => (a.wedding_date ?? '').localeCompare(b.wedding_date ?? ''))
    return list
  }, [rows, filter, typeFilter, q, today])

  const tab = (key: typeof filter, label: string) => (
    <button
      onClick={() => setFilter(key)}
      className={`rounded-full px-4 py-1.5 text-sm ${filter === key ? 'bg-twilight text-white' : 'border border-line text-ink'}`}
    >
      {label}
    </button>
  )

  const stat = (label: string, value: number, warn?: boolean, info?: string) => (
    <div className="rounded-2xl border border-line bg-card px-5 py-4">
      <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-ink-soft">
        {label}
        {info && (
          <span tabIndex={0} className="group relative inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-line text-[10px] font-semibold normal-case text-ink-soft outline-none">
            i
            <span className="pointer-events-none absolute left-1/2 top-6 z-10 hidden w-64 -translate-x-1/2 rounded-xl border border-line bg-card p-3 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-ink shadow-lg group-hover:block group-focus:block">{info}</span>
          </span>
        )}
      </p>
      <p className={`mt-1 font-fraunces text-2xl font-semibold ${warn && value > 0 ? 'text-amber-700' : 'text-ink'}`}>{value}</p>
    </div>
  )

  const chip = (text: string, cls: string) => <span className={`rounded-full px-3 py-1 ${cls}`}>{text}</span>

  return (
    <div className="min-h-screen bg-paper xl:pl-60">
      <DashboardHeader active="sessions" />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-brass">Studio</p>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-fraunces text-3xl font-semibold text-ink">Sessions</h1>
          <Link href="/sessions/new" className="rounded-xl bg-twilight px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90">+ New session</Link>
        </div>

        {rows && (
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {stat('Next 30 days', stats.next30)}
            {stat('Shoots this month', stats.thisMonth)}
            {stat('Needs attention', stats.attention, true, 'Sessions with a loose end: a contract you sent that is still waiting for a signature, or a past session that has no gallery delivered yet or an open balance.')}
          </div>
        )}

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            {tab('upcoming', 'Upcoming')}
            {tab('past', 'Past')}
            {tab('all', 'All')}
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            {types.length > 1 && (
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="rounded-xl border border-line bg-card px-3 py-2.5 text-sm text-ink focus:border-twilight focus:outline-none"
              >
                <option value="">All types</option>
                {types.map((t) => <option key={t} value={t}>{prettyType(t)}</option>)}
              </select>
            )}
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, venue or city"
              className="min-w-0 flex-1 rounded-xl border border-line bg-card px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 focus:border-twilight focus:outline-none focus:ring-2 focus:ring-twilight/25 sm:w-72 sm:flex-none"
            />
          </div>
        </div>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {rows === null ? (
          <p className="text-sm text-ink-soft">Loading…</p>
        ) : shown.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-card px-6 py-16 text-center">
            <p className="font-fraunces text-xl text-ink">
              {filter === 'upcoming' ? 'No upcoming sessions' : filter === 'past' ? 'No past sessions' : 'No sessions here'}
            </p>
            <p className="mt-1 text-sm text-ink-soft">New sessions you add in the Camrhia app show up here.</p>
          </div>
        ) : (
          <div>
            {shown.map((s, i) => {
              const prev = i > 0 ? shown[i - 1] : null
              const heading = monthLabel(s.wedding_date)
              const showHeading = !prev || monthLabel(prev.wedding_date) !== heading
              const dt = s.wedding_date ? toDate(s.wedding_date) : null
              const n = s.wedding_date ? daysFrom(s.wedding_date, today) : null
              const where = [s.venue, [s.city, s.state].filter(Boolean).join(', ')].filter(Boolean).join(', ')
              const c = contracts[s.id]
              return (
                <div key={s.id}>
                  {showHeading && (
                    <p className={`mb-3 font-mono text-xs uppercase tracking-widest text-ink-soft ${i > 0 ? 'mt-8' : ''}`}>{heading}</p>
                  )}
                  <Link
                    href={`/sessions/${s.id}`}
                    className="mb-3 flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-card px-5 py-4 transition hover:-translate-y-0.5 hover:border-twilight hover:shadow-md"
                  >
                    <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-twilight/10 text-twilight">
                      {dt ? (
                        <>
                          <span className="text-[10px] font-medium uppercase tracking-wider">{dt.toLocaleDateString(undefined, { month: 'short' })}</span>
                          <span className="font-fraunces text-xl font-semibold leading-none">{dt.getDate()}</span>
                        </>
                      ) : (
                        <span className="text-xs">TBD</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-fraunces text-lg font-semibold text-ink">{s.names || 'Untitled session'}</p>
                      <p className="mt-0.5 text-sm text-ink-soft">
                        {n !== null ? countdown(n) : 'No date yet'}
                        {where && ` · ${where}`}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {chip(prettyType(s.session_type), 'bg-line text-ink-soft')}
                      {c === 'signed'
                        ? chip('Contract signed', 'bg-emerald-100 text-emerald-700')
                        : c === 'sent'
                        ? chip('Contract waiting', 'bg-amber-100 text-amber-700')
                        : c === 'draft'
                        ? chip('Contract draft', 'bg-line text-ink-soft')
                        : chip('No contract', 'bg-line text-ink-soft')}
                      {s.paid_in_full ? chip('Paid in full', 'bg-emerald-100 text-emerald-700') : chip('Balance open', 'bg-amber-100 text-amber-700')}
                      {s.gallery_url ? chip('Gallery delivered', 'bg-brass/15 text-brass') : chip('No gallery yet', 'bg-line text-ink-soft')}
                    </div>
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
