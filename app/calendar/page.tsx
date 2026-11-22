'use client'

import CamriTyping from '@/app/components/CamriTyping'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { DashboardHeader } from '@/app/components/DashboardHeader'

type Row = { id: string; names: string | null; wedding_date: string | null; session_type: string | null; status: string | null; booked_start: string | null; booked_end: string | null; couple_user_id?: string | null }
type Block = { id: string; block_date: string; type: string; is_recurring: boolean }
const DEF_COLORS = { booked: '#A9545F', hold: '#D4A56A', blocked: '#9CA3AF' }

const GLASS = {
  background: 'linear-gradient(160deg, rgba(255,255,255,0.62), rgba(255,255,255,0.34))',
  border: '1px solid rgba(255,255,255,0.75)',
  boxShadow: '0 18px 40px -22px rgba(90,50,60,0.45)',
} as const
const AVATAR_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}/storage/v1/object/public/portfolio/`

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
  type CalAct = { type: string; summary: string; dates?: string[]; state?: string; days?: number[]; colors?: Record<string, string> }
  const [cMsgs, setCMsgs] = useState<{ from: 'you' | 'cami'; text: string; facts?: string[] }[]>([])
  const [cInput, setCInput] = useState('')
  const [cBusy, setCBusy] = useState(false)
  const [cPending, setCPending] = useState<CalAct[] | null>(null)
  const [recurring, setRecurring] = useState<number[]>([])
  const [selDay, setSelDay] = useState<string | null>(null)
  const [dayBusy, setDayBusy] = useState(false)
  const [recSaving, setRecSaving] = useState(false)
  const [recMsg, setRecMsg] = useState<string | null>(null)
  const [avatarBy, setAvatarBy] = useState<Record<string, string>>({})

  useEffect(() => {
    async function load() {
      const sb = supabase
      if (!sb) return
      const { data: sess } = await sb.auth.getSession()
      if (!sess.session) { router.replace('/login?next=/calendar'); return }
      const me = sess.session.user.id
      setUid(me)
      const [wed, bl, pr] = await Promise.all([
        sb.from('weddings').select('id, names, wedding_date, session_type, status, booked_start, booked_end, couple_user_id').not('wedding_date', 'is', null),
        sb.from('availability_blocks').select('id, block_date, type, is_recurring').eq('owner_id', me),
        sb.from('profiles').select('cal_color_booked, cal_color_hold, cal_color_blocked, recurring_blocked_days').eq('id', me).maybeSingle(),
      ])
      if (wed.error) { setError(wed.error.message); return }
      setRows((wed.data ?? []) as Row[])
      try {
        const coupleOf: Record<string, string> = {}
        for (const r of (wed.data ?? []) as Row[]) if (r.couple_user_id) coupleOf[r.id] = r.couple_user_id
        const { data: iq } = await sb.from('inquiries').select('couple_id, converted_wedding_id').eq('photographer_id', me)
        for (const q of (iq ?? []) as { couple_id: string | null; converted_wedding_id: string | null }[]) if (q.couple_id && q.converted_wedding_id && !coupleOf[q.converted_wedding_id]) coupleOf[q.converted_wedding_id] = q.couple_id
        const pids = Array.from(new Set(Object.values(coupleOf)))
        if (pids.length) {
          const { data: pr2 } = await sb.from('profiles').select('id, avatar_path').in('id', pids)
          const pathOf: Record<string, string> = {}
          for (const p of (pr2 ?? []) as { id: string; avatar_path: string | null }[]) if (p.avatar_path) pathOf[p.id] = p.avatar_path
          const av: Record<string, string> = {}
          for (const wid of Object.keys(coupleOf)) if (pathOf[coupleOf[wid]]) av[wid] = pathOf[coupleOf[wid]]
          setAvatarBy(av)
        }
      } catch { /* photos are optional */ }
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
  type Cell = { d: number; k: string; cur: boolean }
  const cells: Cell[] = []
  const prevDays = new Date(y, m, 0).getDate()
  for (let i = first.getDay() - 1; i >= 0; i--) {
    const dd = prevDays - i
    const pm = new Date(y, m - 1, dd)
    cells.push({ d: dd, k: key(pm.getFullYear(), pm.getMonth(), dd), cur: false })
  }
  for (let i = 1; i <= daysInMonth; i++) cells.push({ d: i, k: key(y, m, i), cur: true })
  for (let nx = 1; cells.length % 7 !== 0; nx++) {
    const nm = new Date(y, m + 1, nx)
    cells.push({ d: nx, k: key(nm.getFullYear(), nm.getMonth(), nx), cur: false })
  }

  const todayKey = key(now.getFullYear(), now.getMonth(), now.getDate())
  const monthLabel = first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  const monthList = Array.from({ length: daysInMonth }, (_, i) => i + 1)
    .flatMap((d) => (byDate[key(y, m, d)] ?? []).map((r) => ({ d, r })))

  const blockedCount = Array.from({ length: daysInMonth }, (_, i) => key(y, m, i + 1)).filter((k) => blockByDate[k] && !bookedByDate[k] && blockByDate[k].type !== 'hold').length
  const holdCount = Array.from({ length: daysInMonth }, (_, i) => key(y, m, i + 1)).filter((k) => blockByDate[k] && !bookedByDate[k] && blockByDate[k].type === 'hold').length
  const summaryBits = [
    monthList.length > 0 ? `${monthList.length} session${monthList.length === 1 ? '' : 's'}` : '',
    blockedCount > 0 ? `${blockedCount} day${blockedCount === 1 ? '' : 's'} blocked` : '',
    holdCount > 0 ? `${holdCount} hold${holdCount === 1 ? '' : 's'}` : '',
  ].filter(Boolean)
  const summary = summaryBits.length ? summaryBits.join(' · ') : 'Nothing on the books yet'
  const todayCol = y === now.getFullYear() && m === now.getMonth() ? now.getDay() : -1
  const nRows = cells.length / 7

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

  async function calAsk(raw: string) {
    const t = raw.trim()
    if (!t || cBusy) return
    setCInput('')
    setCBusy(true)
    setCPending(null)
    setCMsgs((m) => [...m, { from: 'you', text: t }])
    try {
      const sess = (await supabase?.auth.getSession())?.data.session
      const now = new Date()
      const res = await fetch('/api/ai/camri-calendar', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sess?.access_token ?? ''}` }, body: JSON.stringify({ message: t, history: cMsgs.slice(-6).map((m) => ({ from: m.from, text: m.text })), today: key(now.getFullYear(), now.getMonth(), now.getDate()), booked: Object.entries(bookedByDate).map(([date, v]) => { const w: any = Array.isArray(v) ? v[0] : v; return { date, names: w?.names ?? 'a session' } }), blocks: blocks.map((b) => ({ date: b.block_date, type: b.type })), recurring, colors, feedReady: !!feedUrl }) })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error ?? 'Camri hit a snag.')
      setCMsgs((m) => [...m, { from: 'cami', text: j.reply, facts: j.facts }])
      if (j.actions?.length) setCPending(j.actions as CalAct[])
    } catch (e) {
      setCMsgs((m) => [...m, { from: 'cami', text: (e as Error).message }])
    } finally {
      setCBusy(false)
    }
  }

  async function calApply(actions: CalAct[]) {
    const sb = supabase
    if (!sb || !uid) return
    setCBusy(true)
    setCPending(null)
    try {
      for (const a of actions) {
        if (a.type === 'colors' && a.colors) {
          const c = a.colors
          setColors((prev) => ({ ...prev, ...c }))
          for (const k of ['booked', 'hold', 'blocked']) if (c[k]) await saveColor(('cal_color_' + k) as 'cal_color_booked' | 'cal_color_hold' | 'cal_color_blocked', c[k])
        } else if (a.type === 'recurring' && a.days) {
          setRecurring(a.days)
          await saveRecurring(a.days)
        } else if (a.type === 'set' && a.dates) {
          const dates = a.dates.filter((d) => !bookedByDate[d])
          const existing = dates.map((d) => blockByDate[d]).filter(Boolean)
          if (a.state === 'open') {
            if (existing.length) await sb.from('availability_blocks').delete().in('id', existing.map((x) => x.id))
          } else {
            const toUpdate = existing.filter((x) => x.type !== a.state)
            if (toUpdate.length) await sb.from('availability_blocks').update({ type: a.state }).in('id', toUpdate.map((x) => x.id))
            const ins = dates.filter((d) => !blockByDate[d]).map((d) => ({ owner_id: uid, block_date: d, type: a.state }))
            if (ins.length) await sb.from('availability_blocks').insert(ins)
          }
          const { data: fresh } = await sb.from('availability_blocks').select('id, block_date, type, is_recurring').eq('owner_id', uid)
          setBlocks((fresh ?? []) as Block[])
        }
      }
      setCMsgs((m) => [...m, { from: 'cami', text: 'Done! Your calendar is updated.' }])
    } catch (e) {
      setCMsgs((m) => [...m, { from: 'cami', text: (e as Error).message ?? 'Something went wrong.' }])
    } finally {
      setCBusy(false)
    }
  }

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

  async function saveRecurring(daysOverride?: number[]) {
    const days = daysOverride ?? recurring
    const sb = supabase
    if (!sb || !uid) return
    setRecSaving(true)
    setError(null)
    try {
      await sb.from('profiles').update({ recurring_blocked_days: days }).eq('id', uid)
      await sb.from('availability_blocks').delete().eq('owner_id', uid).eq('is_recurring', true)
      if (days.length > 0) {
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
          if (!days.includes(d.getDay())) continue
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
  const gbtn = 'rounded-full px-4 py-2 text-sm text-ink backdrop-blur-md transition hover:-translate-y-0.5'

  return (
    <div className="min-h-screen bg-paper xl:pl-60">
      <DashboardHeader active="calendar" />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-brass">Studio</p>
        <h1 className="mb-6 font-fraunces text-3xl font-semibold text-ink">Calendar</h1>

        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-fraunces text-5xl font-light tracking-tight text-ink">{monthLabel}</p>
            <p className="mt-1.5 text-sm text-ink-soft">{summary}</p>
            <p className="mt-0.5 text-xs text-ink-soft/80">Click a day to block it or put a hold on it.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-4 rounded-full px-4 py-2 text-xs text-ink backdrop-blur-md" style={GLASS}>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors.booked }} />Booked</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors.hold }} />Hold</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors.blocked }} />Blocked</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => shift(-1)} className={gbtn} style={GLASS} aria-label="Previous month">←</button>
              <button onClick={today} className={gbtn} style={GLASS}>Today</button>
              <button onClick={() => shift(1)} className={gbtn} style={GLASS} aria-label="Next month">→</button>
            </div>
          </div>
        </div>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {rows === null ? (
          <p className="text-sm text-ink-soft">Loading…</p>
        ) : (
          <>
            {selDay && <div className="fixed inset-0 z-20" onClick={() => setSelDay(null)} />}
            <div className="rounded-3xl p-3 backdrop-blur-md sm:p-4" style={GLASS}>
              <div className="grid grid-cols-7 gap-1.5 pb-2 text-center text-[11px] uppercase tracking-[0.18em] text-ink-soft">
                {DOW.map((d, di) => <div key={d} className={di === todayCol ? 'font-semibold text-twilight' : ''}>{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {cells.map((c, i) => {
                  const k = c.k
                  const d = c.d
                  const list = c.cur ? byDate[k] ?? [] : []
                  const isToday = c.cur && k === todayKey
                  const blk = c.cur ? blockByDate[k] : undefined
                  const isBooked = c.cur ? !!bookedByDate[k] : false
                  const hold = !!blk && !isBooked && blk.type === 'hold'
                  const blocked = !!blk && !isBooked && blk.type !== 'hold'
                  const n = isBooked ? Math.max(1, list.length) : 0
                  const col = i % 7
                  const row = Math.floor(i / 7)
                  const sel = c.cur && selDay === k
                  const heat = n >= 3 ? '38' : n === 2 ? '26' : '16'
                  const style: React.CSSProperties = hold
                    ? { backgroundImage: `repeating-linear-gradient(45deg, ${colors.hold}33, ${colors.hold}33 6px, ${colors.hold}14 6px, ${colors.hold}14 12px)` }
                    : blocked
                      ? { backgroundColor: `${colors.blocked}26` }
                      : n > 0
                        ? { backgroundColor: `${colors.booked}${heat}` }
                        : c.cur && col === todayCol
                          ? { backgroundColor: 'color-mix(in srgb, var(--color-twilight) 9%, transparent)' }
                          : {}
                  const pos = (col <= 1 ? 'left-0' : col >= 5 ? 'right-0' : 'left-1/2 -translate-x-1/2') + ' ' + (row >= nRows - 2 && nRows > 3 ? 'bottom-full mb-2' : 'top-full mt-2')
                  return (
                    <div
                      key={i}
                      onClick={() => { if (c.cur) setSelDay(k) }}
                      style={style}
                      className={`group relative min-h-[72px] rounded-xl border border-white/70 bg-white/35 p-2 transition duration-200 sm:min-h-[112px] ${c.cur ? 'cursor-pointer hover:-translate-y-0.5 hover:bg-white/60 hover:shadow-[0_10px_24px_-14px_rgba(90,50,60,0.5)]' : 'opacity-35'} ${sel ? 'z-30 ring-2 ring-twilight/70' : ''}`}
                    >
                      <div className="flex items-start justify-between">
                        <span className="relative inline-flex h-8 w-8 items-center justify-center">
                          {isToday && <span className="absolute inset-0 rounded-full bg-twilight/40 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" />}
                          <span className={`relative inline-flex h-8 w-8 items-center justify-center rounded-full font-fraunces text-xl ${isToday ? 'bg-twilight font-medium text-white shadow-[0_0_0_4px_rgba(255,255,255,0.55),0_6px_16px_-4px_var(--color-twilight)]' : 'font-light text-ink'}`}>{d}</span>
                        </span>
                        {hold && <span className="hidden rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink sm:inline" style={{ backgroundColor: `${colors.hold}55` }}>Hold</span>}
                        {blocked && <span className="hidden rounded-full border border-white/80 bg-white/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-soft sm:inline">Blocked</span>}
                      </div>
                      <div className="mt-1 space-y-1">
                        {isBooked && list.length === 0 && (
                          <p className="hidden items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-medium text-ink sm:flex" style={{ backgroundColor: `${colors.booked}22`, borderColor: `${colors.booked}55` }}><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: colors.booked }} />Booked</p>
                        )}
                        {list.slice(0, 2).map((r) => (
                          <Link
                            key={r.id}
                            href={`/sessions/${r.id}`}
                            onClick={(e) => e.stopPropagation()}
                            style={{ backgroundColor: `${colors.booked}22`, borderColor: `${colors.booked}55` }}
                            className="hidden items-center gap-1.5 rounded-full border py-0.5 pl-1 pr-2 text-xs font-medium text-ink transition hover:brightness-95 sm:flex"
                          >
                            {avatarBy[r.id]
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img src={AVATAR_BASE + avatarBy[r.id]} alt="" className="h-5 w-5 shrink-0 rounded-full object-cover" />
                              : <span className="ml-1 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: colors.booked }} />}
                            <span className="truncate">{r.names || pretty(r.session_type)}</span>
                          </Link>
                        ))}
                        {isBooked && <span className="block h-2.5 w-2.5 rounded-full sm:hidden" style={{ backgroundColor: colors.booked }} />}
                        {(hold || blocked) && <span className="block h-2.5 w-2.5 rounded-full sm:hidden" style={{ backgroundColor: hold ? colors.hold : colors.blocked }} />}
                        {list.length > 2 && <p className="hidden px-1 text-[11px] text-ink-soft sm:block">+{list.length - 2} more</p>}
                        {c.cur && !isBooked && !blk && <p className="hidden text-[11px] text-ink-soft opacity-0 transition group-hover:opacity-100 sm:block">+ Block or hold</p>}
                      </div>
                      {sel && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className={`absolute z-30 w-72 cursor-default rounded-2xl p-4 text-left backdrop-blur-xl ${pos}`}
                          style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(255,255,255,0.9)', boxShadow: '0 24px 50px -20px rgba(90,50,60,0.55)' }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-fraunces text-lg font-semibold leading-tight text-ink">
                              {new Date(`${selDay}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                            </p>
                            <button type="button" onClick={() => setSelDay(null)} className="text-xs text-ink-soft hover:text-ink">Close</button>
                          </div>
                          {selBooked ? (
                            <p className="mt-2 text-sm text-ink">
                              Booked: <Link href={`/sessions/${selBooked.id}`} className="font-medium text-twilight hover:underline">{selBooked.names || pretty(selBooked.session_type)}</Link>
                            </p>
                          ) : selBlk ? (
                            <div className="mt-3 space-y-2">
                              <p className="text-sm text-ink-soft">This day is {selBlk.type === 'hold' ? 'on hold' : 'blocked'}{selBlk.is_recurring ? ' (recurring)' : ''}.</p>
                              <div className="flex flex-wrap gap-2">
                                <button type="button" disabled={dayBusy} onClick={() => clearDay(selDay as string)} className={btn}>Mark open</button>
                                <button type="button" disabled={dayBusy} onClick={() => setDayType(selDay as string, selBlk.type === 'hold' ? 'blocked' : 'hold')} className={btn}>
                                  Change to {selBlk.type === 'hold' ? 'Blocked' : 'Hold'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-3 space-y-2">
                              <p className="text-sm text-ink-soft">This day is open.</p>
                              <div className="flex flex-wrap gap-2">
                                <button type="button" disabled={dayBusy} onClick={() => setDayType(selDay as string, 'hold')} className={btn}>Put on hold</button>
                                <button type="button" disabled={dayBusy} onClick={() => setDayType(selDay as string, 'blocked')} className={btn}>Block day</button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="mt-5 grid items-start gap-4 lg:grid-cols-[1.5fr_1fr]">
          <div className="relative rounded-3xl p-4 backdrop-blur-md" style={GLASS}>
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/camri/13_face_avatar.png" alt="" className="h-6 w-6 rounded-full" />
              <p className="font-fraunces text-base font-semibold text-ink">Ask Camri</p>
            </div>
            <div className="mt-2 space-y-2">
              {cMsgs.slice(-4).map((m, i) => (
                <div key={i} className={'max-w-[88%] rounded-2xl px-3 py-2 text-sm ' + (m.from === 'you' ? 'ml-auto bg-twilight text-white' : 'bg-[#EBDDCF] text-ink')}>
                  {m.text}
                  {m.facts && m.facts.length > 0 && <ul className="mt-1.5 space-y-0.5 font-medium">{m.facts.map((f, j) => <li key={j}>{f}</li>)}</ul>}
                </div>
              ))}
              {cBusy && (
                <div className="flex items-center gap-2 text-sm text-ink-soft">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/camri/04_thinking.png" alt="" className="h-10 w-auto" /> <CamriTyping />
                </div>
              )}
            </div>
            {cPending && (
              <div className="mt-3 rounded-xl border border-twilight/30 bg-blush-wash p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Camri wants to</p>
                <ul className="mt-1 space-y-0.5 text-sm text-ink">{cPending.map((a, i) => <li key={i}>{a.summary}</li>)}</ul>
                <div className="mt-2 flex gap-2">
                  <button type="button" disabled={cBusy} onClick={() => calApply(cPending)} className="rounded-full bg-twilight px-4 py-1.5 text-sm font-medium text-white disabled:opacity-60">Confirm</button>
                  <button type="button" onClick={() => { setCPending(null); setCMsgs((m) => [...m, { from: 'cami', text: 'No problem, I left everything as it was.' }]) }} className="rounded-full border border-line px-4 py-1.5 text-sm text-ink">Cancel</button>
                </div>
              </div>
            )}
            {cMsgs.length === 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {['Is November 27th open?', 'Block all Mondays', 'What calendar am I linked to?'].map((c) => (
                  <button key={c} type="button" onClick={() => calAsk(c)} className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs text-ink transition hover:border-twilight">{c}</button>
                ))}
              </div>
            )}
            <form onSubmit={(e) => { e.preventDefault(); calAsk(cInput) }} className="mt-2 flex gap-2">
              <input value={cInput} onChange={(e) => setCInput(e.target.value)} placeholder="Ask about any date, or tell me what to block, hold or recolor" className="min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-twilight" />
              <button type="submit" disabled={cBusy} className="rounded-xl bg-twilight px-4 py-2 text-sm font-medium text-white disabled:opacity-60">Send</button>
            </form>
          </div>
          <div className="rounded-3xl p-4 backdrop-blur-md" style={GLASS}>
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
            </div>

        <details className="mb-6 mt-4 rounded-3xl px-5 py-3 backdrop-blur-md" style={GLASS}>
          <summary className="cursor-pointer text-sm font-medium text-ink">Calendar settings</summary>
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
                <button type="button" disabled={recSaving} onClick={() => saveRecurring()} className="rounded-full bg-twilight px-5 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">
                  {recSaving ? 'Saving…' : 'Save recurring days'}
                </button>
                {recMsg && <span className="text-sm text-ink-soft">{recMsg}</span>}
              </div>
            </div>
          </div>
        </details>

            <h2 className="mb-3 mt-8 font-fraunces text-xl font-semibold text-ink">This month</h2>
            {monthList.length === 0 ? (
              <p className="text-sm text-ink-soft">Nothing scheduled in {monthLabel}.</p>
            ) : (
              <ul className="space-y-2">
                {monthList.map(({ d, r }) => (
                  <li key={r.id}>
                    <Link
                      href={`/sessions/${r.id}`}
                      className="flex items-center gap-4 rounded-2xl border border-white/70 bg-white/45 px-4 py-3 backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/65"
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
