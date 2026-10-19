'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { DashboardHeader } from '@/app/components/DashboardHeader'

type Row = { id: string; names: string | null; wedding_date: string | null; session_type: string | null; status: string | null; booked_start: string | null; booked_end: string | null }
type Block = { id: string; block_date: string; type: string; is_recurring: boolean }
const DEF_COLORS = { booked: '#A9545F', hold: '#D4A56A', blocked: '#9CA3AF' }

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
  const [uid, setUid] = useState<string | null>(null)
  const [blocks, setBlocks] = useState<Block[]>([])
  const [colors, setColors] = useState(DEF_COLORS)
  const [recurring, setRecurring] = useState<number[]>([])
  const [selDay, setSelDay] = useState<string | null>(null)
  const [dayBusy, setDayBusy] = useState(false)
  const [recSaving, setRecSaving] = useState(false)
  const [recMsg, setRecMsg] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const sb = supabase
      if (!sb) return
      const { data: sess } = await sb.auth.getSession()
      if (!sess.session) { router.replace('/login?next=/calendar'); return }
      const me = sess.session.user.id
      setUid(me)
      const [wed, bl, pr] = await Promise.all([
        sb.from('weddings').select('id, names, wedding_date, session_type, status, booked_start, booked_end').not('wedding_date', 'is', null),
        sb.from('availability_blocks').select('id, block_date, type, is_recurring').eq('owner_id', me),
        sb.from('profiles').select('cal_color_booked, cal_color_hold, cal_color_blocked, recurring_blocked_days').eq('id', me).maybeSingle(),
      ])
      if (wed.error) { setError(wed.error.message); return }
      setRows((wed.data ?? []) as Row[])
      setBlocks((bl.data ?? []) as Block[])
      const pd = pr.data as { cal_color_booked: string | null; cal_color_hold: string | null; cal_color_blocked: string | null; recurring_blocked_days: number[] | null } | null
      if (pd) {
        setColors({
          booked: pd.cal_color_booked ?? DEF_COLORS.booked,
          hold: pd.cal_color_hold ?? DEF_COLORS.hold,
          blocked: pd.cal_color_blocked ?? DEF_COLORS.blocked,
        })
        setRecurring(pd.recurring_blocked_days ?? [])
      }
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

  const blockByDate = useMemo(() => {
    const map: Record<string, Block> = {}
    blocks.forEach((b) => { map[b.block_date] = b })
    return map
  }, [blocks])

  const bookedByDate = useMemo(() => {
    const map: Record<string, Row> = {}
    ;(rows ?? []).forEach((r) => {
      const start = r.booked_start ?? r.wedding_date
      if (!start) return
      const end = r.booked_end ?? start
      const e = new Date(`${end}T00:00:00`)
      for (let d = new Date(`${start}T00:00:00`); d <= e; d.setDate(d.getDate() + 1)) {
        map[key(d.getFullYear(), d.getMonth(), d.getDate())] = r
      }
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

  const selBlk = selDay ? blockByDate[selDay] : undefined
  const selBooked = selDay ? bookedByDate[selDay] : undefined

  async function setDayType(date: string, type: 'blocked' | 'hold') {
    const sb = supabase
    if (!sb || !uid) return
    setDayBusy(true)
    setError(null)
    const ex = blockByDate[date]
    if (ex) {
      const { error: e } = await sb.from('availability_blocks').update({ type }).eq('id', ex.id)
      if (e) setError(e.message)
      else setBlocks((b) => b.map((x) => (x.id === ex.id ? { ...x, type } : x)))
    } else {
      const { data, error: e } = await sb.from('availability_blocks').insert({ owner_id: uid, block_date: date, type }).select('id, block_date, type, is_recurring').single()
      if (e) setError(e.message)
      else if (data) setBlocks((b) => [...b, data as Block])
    }
    setDayBusy(false)
  }

  async function clearDay(date: string) {
    const sb = supabase
    const ex = blockByDate[date]
    if (!sb || !ex) return
    setDayBusy(true)
    setError(null)
    const { error: e } = await sb.from('availability_blocks').delete().eq('id', ex.id)
    if (e) setError(e.message)
    else setBlocks((b) => b.filter((x) => x.id !== ex.id))
    setDayBusy(false)
  }

  async function saveColor(field: 'cal_color_booked' | 'cal_color_hold' | 'cal_color_blocked', hex: string) {
    const sb = supabase
    if (!sb || !uid) return
    await sb.from('profiles').update({ [field]: hex }).eq('id', uid)
  }

  function resetColors() {
    setColors(DEF_COLORS)
    const sb = supabase
    if (!sb || !uid) return
    sb.from('profiles').update({ cal_color_booked: DEF_COLORS.booked, cal_color_hold: DEF_COLORS.hold, cal_color_blocked: DEF_COLORS.blocked }).eq('id', uid).then(() => {})
  }

  async function saveRecurring() {
    const sb = supabase
    if (!sb || !uid) return
    setRecSaving(true)
    setError(null)
    try {
      await sb.from('profiles').update({ recurring_blocked_days: recurring }).eq('id', uid)
      await sb.from('availability_blocks').delete().eq('owner_id', uid).eq('is_recurring', true)
      if (recurring.length > 0) {
        const { data: ex } = await sb.from('availability_blocks').select('block_date').eq('owner_id', uid)
        const taken = new Set<string>()
        ;(ex ?? []).forEach((b: { block_date: string }) => taken.add(b.block_date))
        Object.keys(bookedByDate).forEach((k) => taken.add(k))
        const out: { owner_id: string; block_date: string; type: string; is_recurring: boolean }[] = []
        const t0 = new Date()
        const start = new Date(t0.getFullYear(), t0.getMonth(), t0.getDate())
        const end = new Date(start)
        end.setMonth(end.getMonth() + 18)
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          if (!recurring.includes(d.getDay())) continue
          const ds = key(d.getFullYear(), d.getMonth(), d.getDate())
          if (taken.has(ds)) continue
          out.push({ owner_id: uid, block_date: ds, type: 'blocked', is_recurring: true })
        }
        for (let i = 0; i < out.length; i += 500) {
          const { error: e } = await sb.from('availability_blocks').insert(out.slice(i, i + 500))
          if (e) throw e
        }
      }
      const { data: fresh } = await sb.from('availability_blocks').select('id, block_date, type, is_recurring').eq('owner_id', uid)
      setBlocks((fresh ?? []) as Block[])
      setRecMsg('Saved')
      setTimeout(() => setRecMsg(null), 1800)
    } catch (e) {
      setError((e as { message?: string }).message ?? 'Could not save recurring days')
    } finally {
      setRecSaving(false)
    }
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

        <details className="mb-4 rounded-2xl border border-line bg-card p-4">
          <summary className="cursor-pointer font-fraunces text-lg font-semibold text-ink">Calendar settings</summary>
          <div className="mt-4 space-y-6">
            <div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-ink">Colors</p>
                <button type="button" onClick={resetColors} className="text-xs text-ink-soft hover:text-ink">Reset</button>
              </div>
              <p className="mb-3 text-xs text-ink-soft">Open days never have a color. This only applies to Booked, Hold and Blocked.</p>
              <div className="flex flex-wrap gap-4">
                {([
                  ['Booked', 'booked', 'cal_color_booked'],
                  ['Hold', 'hold', 'cal_color_hold'],
                  ['Blocked', 'blocked', 'cal_color_blocked'],
                ] as const).map(([lab, k, col]) => (
                  <label key={k} className="flex items-center gap-2 text-sm text-ink">
                    <input
                      type="color"
                      value={colors[k]}
                      onChange={(e) => setColors((c) => ({ ...c, [k]: e.target.value }))}
                      onBlur={(e) => saveColor(col, e.target.value)}
                      className="h-8 w-8 cursor-pointer rounded border border-line bg-transparent p-0"
                    />
                    {lab}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-ink">Recurring blocked days</p>
              <p className="mb-3 text-xs text-ink-soft">Automatically block certain days of the week going forward. Great for weekends off or any standing commitment.</p>
              <div className="flex flex-wrap gap-2">
                {DOW.map((dname, i) => (
                  <button
                    key={dname}
                    type="button"
                    onClick={() => setRecurring((r) => (r.includes(i) ? r.filter((x) => x !== i) : [...r, i].sort()))}
                    className={`rounded-full border px-3.5 py-1.5 text-sm transition ${recurring.includes(i) ? 'border-twilight bg-blush-wash text-twilight' : 'border-line text-ink hover:border-twilight'}`}
                  >
                    {dname}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button type="button" className={btn} onClick={() => setRecurring([0, 6])}>Weekends</button>
                <button type="button" className={btn} onClick={() => setRecurring([])}>None</button>
                <button type="button" disabled={recSaving} onClick={saveRecurring} className="rounded-full bg-twilight px-5 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">
                  {recSaving ? 'Saving…' : 'Save recurring days'}
                </button>
                {recMsg && <span className="text-sm text-ink-soft">{recMsg}</span>}
              </div>
            </div>
          </div>
        </details>

        <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-ink-soft">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors.booked }} />Booked</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors.hold }} />Hold</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors.blocked }} />Blocked</span>
          <span>Click a day to block it or put a hold on it.</span>
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
                  const blk = d ? blockByDate[k] : undefined
                  const isBooked = d ? !!bookedByDate[k] : false
                  return (
                    <div
                      key={i}
                      onClick={() => { if (d) setSelDay(k) }}
                      style={blk && !isBooked ? { backgroundColor: `${blk.type === 'hold' ? colors.hold : colors.blocked}33` } : undefined}
                      className={`min-h-[64px] border-b border-r border-line p-1.5 sm:min-h-[96px] ${d ? 'cursor-pointer hover:bg-paper-deep/40' : 'bg-paper-deep/50'} ${d && selDay === k ? 'ring-2 ring-inset ring-twilight' : ''}`}
                    >
                      {d && (
                        <>
                          <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${isToday ? 'bg-twilight text-white' : 'text-ink-soft'}`}>{d}</span>
                          <div className="mt-1 space-y-1">
                            {isBooked && list.length === 0 && <p className="px-1 text-[11px]" style={{ color: colors.booked }}>Booked</p>}
                            {blk && !isBooked && <p className="px-1 text-[11px] text-ink-soft">{blk.type === 'hold' ? 'Hold' : 'Blocked'}</p>}
                            {list.slice(0, 2).map((r) => (
                              <Link
                                key={r.id}
                                href={`/sessions/${r.id}`}
                                style={{ backgroundColor: `${colors.booked}22`, color: colors.booked }}
                                className="block truncate rounded px-1.5 py-0.5 text-[11px] hover:opacity-80"
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

            {selDay && (
              <div className="mt-4 rounded-2xl border border-line bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-fraunces text-lg font-semibold text-ink">
                    {new Date(`${selDay}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                  <button type="button" onClick={() => setSelDay(null)} className="text-xs text-ink-soft hover:text-ink">Close</button>
                </div>
                {selBooked ? (
                  <p className="mt-2 text-sm text-ink">
                    Booked: <Link href={`/sessions/${selBooked.id}`} className="font-medium text-twilight hover:underline">{selBooked.names || pretty(selBooked.session_type)}</Link>
                  </p>
                ) : selBlk ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-sm text-ink-soft">This day is {selBlk.type === 'hold' ? 'on hold' : 'blocked'}{selBlk.is_recurring ? ' (recurring)' : ''}.</span>
                    <button type="button" disabled={dayBusy} onClick={() => clearDay(selDay)} className={btn}>Mark open</button>
                    <button type="button" disabled={dayBusy} onClick={() => setDayType(selDay, selBlk.type === 'hold' ? 'blocked' : 'hold')} className={btn}>
                      Change to {selBlk.type === 'hold' ? 'Blocked' : 'Hold'}
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-sm text-ink-soft">This day is open.</span>
                    <button type="button" disabled={dayBusy} onClick={() => setDayType(selDay, 'hold')} className={btn}>Put on hold</button>
                    <button type="button" disabled={dayBusy} onClick={() => setDayType(selDay, 'blocked')} className={btn}>Block day</button>
                  </div>
                )}
              </div>
            )}

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
