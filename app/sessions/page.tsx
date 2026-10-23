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

export function fmtDate(d: string | null): string {
  if (!d) return 'No date yet'
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, m - 1, day).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function prettyType(t: string | null): string {
  if (!t) return 'Session'
  return t.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
}

export default function SessionsPage() {
  const router = useRouter()
  const [rows, setRows] = useState<Session[] | null>(null)
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming')
  const [q, setQ] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const sb = supabase
      if (!sb) return
      const { data: sess } = await sb.auth.getSession()
      if (!sess.session) { router.replace('/login?next=/sessions'); return }
      const { data, error: e } = await sb
        .from('weddings')
        .select('id, names, wedding_date, session_type, status, city, state, venue, package_name, gallery_url, paid_in_full')
        .order('wedding_date', { ascending: false, nullsFirst: false })
      if (e) { setError(e.message); return }
      setRows((data ?? []) as Session[])
    }
    load()
  }, [router])

  const shown = useMemo(() => {
    if (!rows) return []
    const today = todayStr()
    const needle = q.trim().toLowerCase()
    let list = rows.filter((r) => {
      if (filter === 'upcoming' && !(r.wedding_date && r.wedding_date >= today)) return false
      if (filter === 'past' && !(r.wedding_date && r.wedding_date < today)) return false
      if (needle) {
        const hay = `${r.names ?? ''} ${r.venue ?? ''} ${r.city ?? ''} ${r.session_type ?? ''}`.toLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })
    if (filter === 'upcoming') list = [...list].sort((a, b) => (a.wedding_date ?? '').localeCompare(b.wedding_date ?? ''))
    return list
  }, [rows, filter, q])

  const tab = (key: typeof filter, label: string) => (
    <button
      onClick={() => setFilter(key)}
      className={`rounded-full px-4 py-1.5 text-sm ${filter === key ? 'bg-twilight text-white' : 'border border-line text-ink'}`}
    >
      {label}
    </button>
  )

  return (
    <div className="min-h-screen bg-paper xl:pl-60">
      <DashboardHeader active="sessions" />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-brass">Studio</p>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-fraunces text-3xl font-semibold text-ink">Sessions</h1>
          <Link href="/sessions/new" className="rounded-xl bg-twilight px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90">+ New session</Link>
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            {tab('upcoming', 'Upcoming')}
            {tab('past', 'Past')}
            {tab('all', 'All')}
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, venue or city"
            className="w-full rounded-xl border border-line bg-card px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 focus:border-twilight focus:outline-none focus:ring-2 focus:ring-twilight/25 sm:w-72"
          />
        </div>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {rows === null ? (
          <p className="text-sm text-ink-soft">Loading…</p>
        ) : shown.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-card px-6 py-16 text-center">
            <p className="font-fraunces text-xl text-ink">No sessions here</p>
            <p className="mt-1 text-sm text-ink-soft">New sessions you add in the Camrhia app show up here.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {shown.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/sessions/${s.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-card px-5 py-4 transition hover:-translate-y-0.5 hover:border-twilight hover:shadow-md"
                >
                  <div className="min-w-0">
                    <p className="truncate font-fraunces text-lg font-semibold text-ink">{s.names || 'Untitled session'}</p>
                    <p className="mt-0.5 text-sm text-ink-soft">
                      {fmtDate(s.wedding_date)}
                      {[s.venue, [s.city, s.state].filter(Boolean).join(', ')].filter(Boolean).length > 0 &&
                        ` · ${[s.venue, [s.city, s.state].filter(Boolean).join(', ')].filter(Boolean).join(', ')}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full bg-line px-3 py-1 text-ink-soft">{prettyType(s.session_type)}</span>
                    {s.status && <span className="rounded-full bg-twilight/10 px-3 py-1 text-twilight">{s.status}</span>}
                    {s.paid_in_full && <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">Paid</span>}
                    {s.gallery_url && <span className="rounded-full bg-brass/15 px-3 py-1 text-brass">Gallery sent</span>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
