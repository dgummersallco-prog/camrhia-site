'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { DashboardHeader } from '@/app/components/DashboardHeader'

type Row = { id: string; names: string | null; wedding_date: string | null; session_type: string | null; status: string | null }

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function pretty(t: string | null): string {
  if (!t) return 'Session'
  return t.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
}

function key(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export default function CalendarPage() {
  const router = useRouter()
  const now = new Date()
  const [y, setY] = useState(now.getFullYear())
  const [m, setM] = useState(now.getMonth())
  const [rows, setRows] = useState<Row[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [feedUrl, setFeedUrl] = useState<string | null>(null)
  const [feedBusy, setFeedBusy] = useState(false)
  const [feedCopied, setFeedCopied] = useState(false)

  useEffect(() => {
    async function load() {
      const sb = supabase
      if (!sb) return
      const { data: sess } = await sb.auth.getSession()
      if (!sess.session) { router.replace('/login?next=/calendar'); return }
      const { data, error: e } = await sb
        .from('weddings')
        .select('id, names, wedding_date, session_type, status')
        .not('wedding_date', 'is', null)
      if (e) { setError(e.message); return }
      setRows((data ?? []) as Row[])
    }
    load()
  }, [router])

  const byDate = useMemo(() => {
    const map: Record<string, Row[]> = {}
    ;(rows ?? []).forEach((r) => {
      if (!r.wedding_date) return
      ;(map[r.wedding_date] ||= []).push(r)
    })
    return map
  }, [rows])

  const first = new Date(y, m, 1)
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(first.getDay()).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const todayKey = key(now.getFullYear(), now.getMonth(), now.getDate())
  const monthLabel = first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  const monthList = Array.from({ length: daysInMonth }, (_, i) => i + 1)
    .flatMap((d) => (byDate[key(y, m, d)] ?? []).map((r) => ({ d, r })))

  function shift(delta: number) {
    const dt = new Date(y, m + delta, 1)
    setY(dt.getFullYear())
    setM(dt.getMonth())
  }
  function today() {
    setY(now.getFullYear())
    setM(now.getMonth())
  }

  async function getFeed() {
    const sb = supabase
    if (!sb) return
    setFeedBusy(true)
    const { data, error: e } = await sb.rpc('get_calendar_token')
    setFeedBusy(false)
    if (e || !data) { setError(e?.message ?? 'Could not create your calendar link'); return }
    setFeedUrl(`${window.location.origin}/api/calendar/${data as string}.ics`)
  }
  function copyFeed() {
    if (!feedUrl) return
    navigator.clipboard?.writeText(feedUrl)
    setFeedCopied(true)
    setTimeout(() => setFeedCopied(false), 1800)
  }

  const btn = 'rounded-full border border-line px-4 py-1.5 text-sm text-ink hover:border-twilight'

  return (
    <div className="min-h-screen bg-paper lg:pl-60">
      <DashboardHeader active="calendar" />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-brass">Studio</p>
        <h1 className="mb-6 font-fraunces text-3xl font-semibold text-ink">Calendar</h1>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="font-fraunces text-xl font-semibold text-ink">{monthLabel}</p>
          <div className="flex gap-2">
            <button onClick={() => shift(-1)} className={btn} aria-label="Previous month">←</button>
            <button onClick={today} className={btn}>Today</button>
            <button onClick={() => shift(1)} className={btn} aria-label="Next month">→</button>
          </div>
        </div>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        <div className="mb-6 rounded-2xl border border-line bg-card p-4">
          {!feedUrl ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-ink-soft">See your sessions in Google Calendar, Apple Calendar or Outlook.</p>
              <button onClick={getFeed} disabled={feedBusy} className={`${btn} disabled:opacity-60`}>
                {feedBusy ? 'Creating…' : 'Sync to my calendar app'}
              </button>
            </div>
          ) : (
            <div>
              <p className="mb-3 text-sm text-ink">Add your sessions to your calendar. It stays up to date on its own.</p>
              <div className="flex flex-wrap gap-2">
                <a href={feedUrl.replace(/^https?:/, 'webcal:')} className={btn}>Apple Calendar</a>
                <a href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(feedUrl.replace(/^https?:/, 'webcal:'))}`} target="_blank" rel="noreferrer" className={btn}>Google Calendar</a>
                <a href={`https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(feedUrl)}&name=Camrhia`} target="_blank" rel="noreferrer" className={btn}>Outlook</a>
                <button onClick={copyFeed} className={btn}>{feedCopied ? 'Link copied!' : 'Copy link'}</button>
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-ink-soft hover:text-ink">Show link</summary>
                <input readOnly value={feedUrl} onFocus={(e) => e.currentTarget.select()} className="mt-2 w-full rounded-xl border border-line bg-paper px-3 py-2 text-xs text-ink" />
              </details>
              <p className="mt-3 text-xs text-ink-soft">This link is private. Anyone who has it can see your session names and places, so only share it with your own calendar apps.</p>
            </div>
          )}
        </div>

        {rows === null ? (
          <p className="text-sm text-ink-soft">Loading…</p>
        ) : (
          <>
            <div className="overflow-hidden rounded-2xl border border-line bg-card">
              <div className="grid grid-cols-7 border-b border-line bg-paper-deep text-center text-[11px] uppercase tracking-wider text-ink-soft">
                {DOW.map((d) => <div key={d} className="py-2">{d}</div>)}
              </div>
              <div className="grid grid-cols-7">
                {cells.map((d, i) => {
                  const k = d ? key(y, m, d) : ''
                  const list = d ? byDate[k] ?? [] : []
                  const isToday = k === todayKey
                  return (
                    <div key={i} className={`min-h-[64px] border-b border-r border-line p-1.5 sm:min-h-[96px] ${d ? '' : 'bg-paper-deep/50'}`}>
                      {d && (
                        <>
                          <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${isToday ? 'bg-twilight text-white' : 'text-ink-soft'}`}>{d}</span>
                          <div className="mt-1 space-y-1">
                            {list.slice(0, 2).map((r) => (
                              <Link
                                key={r.id}
                                href={`/sessions/${r.id}`}
                                className="block truncate rounded bg-twilight/10 px-1.5 py-0.5 text-[11px] text-twilight hover:bg-twilight/20"
                              >
                                <span className="hidden sm:inline">{r.names || pretty(r.session_type)}</span>
                                <span className="sm:hidden">●</span>
                              </Link>
                            ))}
                            {list.length > 2 && <p className="px-1 text-[11px] text-ink-soft">+{list.length - 2} more</p>}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <h2 className="mb-3 mt-8 font-fraunces text-xl font-semibold text-ink">This month</h2>
            {monthList.length === 0 ? (
              <p className="text-sm text-ink-soft">Nothing scheduled in {monthLabel}.</p>
            ) : (
              <ul className="space-y-2">
                {monthList.map(({ d, r }) => (
                  <li key={r.id}>
                    <Link
                      href={`/sessions/${r.id}`}
                      className="flex items-center gap-4 rounded-2xl border border-line bg-card px-4 py-3 transition hover:border-twilight"
                    >
                      <div className="w-12 shrink-0 text-center">
                        <p className="text-[11px] uppercase text-ink-soft">{DOW[new Date(y, m, d).getDay()]}</p>
                        <p className="font-fraunces text-xl font-semibold text-ink">{d}</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{r.names || 'Untitled session'}</p>
                        <p className="text-xs text-ink-soft">{pretty(r.session_type)}{r.status ? ` · ${r.status}` : ''}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>
    </div>
  )
}
