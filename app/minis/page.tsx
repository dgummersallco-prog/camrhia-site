'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { DashboardHeader } from '@/app/components/DashboardHeader'
import { SubTabs } from '@/app/components/SubTabs'

type Mini = { id: string; title: string; description: string | null; location: string | null; price: number; duration_min: number | null; tz: string; active: boolean }
type Slot = { id: string; mini_id: string; starts_at: string; status: 'open' | 'held' | 'booked'; hold_expires_at: string | null; client_name: string | null; client_email: string | null; client_phone: string | null }

const SITE = 'https://camrhia.com'
const money = (n: number) => '$' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmt = (iso: string, tz: string) => new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: tz }).format(new Date(iso))
const slotState = (s: Slot) => (s.status === 'booked' ? 'booked' : s.status === 'held' && s.hold_expires_at && new Date(s.hold_expires_at) > new Date() ? 'held' : 'open')

export default function MinisPage() {
  const router = useRouter()
  const [uid, setUid] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [minis, setMinis] = useState<Mini[]>([])
  const [slots, setSlots] = useState<Slot[]>([])
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [loc, setLoc] = useState('')
  const [price, setPrice] = useState('')
  const [dur, setDur] = useState('20')
  const [gap, setGap] = useState('0')
  const [count, setCount] = useState('6')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('10:00')
  const [busy, setBusy] = useState(false)
  const [formErr, setFormErr] = useState<string | null>(null)
  const [addAt, setAddAt] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!supabase) { router.push('/login'); return }
    const { data: sess } = await supabase.auth.getSession()
    if (!sess.session) { router.push('/login'); return }
    setUid(sess.session.user.id)
    const { data: m, error: e } = await supabase.from('mini_sessions').select('id, title, description, location, price, duration_min, tz, active').order('created_at', { ascending: false })
    if (e) { setError(e.message); setLoading(false); return }
    const list = (m ?? []) as Mini[]
    setMinis(list)
    if (list.length) {
      const { data: sl } = await supabase.from('mini_slots').select('id, mini_id, starts_at, status, hold_expires_at, client_name, client_email, client_phone').in('mini_id', list.map((x) => x.id)).order('starts_at')
      setSlots((sl ?? []) as Slot[])
    } else setSlots([])
    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setFormErr(null)
    const sb = supabase
    if (!sb || !uid) return
    const pr = parseFloat(price)
    const d = parseInt(dur, 10)
    const g = parseInt(gap, 10) || 0
    const n = parseInt(count, 10)
    if (!title.trim()) { setFormErr('Give it a name.'); return }
    if (!(pr >= 0.5)) { setFormErr('Enter a price of at least $0.50.'); return }
    if (!(d >= 5)) { setFormErr('Each time slot needs to be at least 5 minutes.'); return }
    if (!(n >= 1 && n <= 40)) { setFormErr('Choose between 1 and 40 time slots.'); return }
    if (!date || !time) { setFormErr('Pick the date and first start time.'); return }
    setBusy(true)
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Boise'
    const { data: mini, error: me } = await sb.from('mini_sessions').insert({ owner_id: uid, title: title.trim(), description: desc.trim() || null, location: loc.trim() || null, price: pr, duration_min: d, tz }).select('id').single()
    if (me || !mini) { setBusy(false); setFormErr(me?.message ?? 'Could not create it.'); return }
    const rows = Array.from({ length: n }, (_, i) => {
      const start = new Date(date + 'T' + time)
      start.setMinutes(start.getMinutes() + i * (d + g))
      return { mini_id: mini.id, owner_id: uid, starts_at: start.toISOString() }
    })
    const { error: se } = await sb.from('mini_slots').insert(rows)
    setBusy(false)
    if (se) { setFormErr(se.message); return }
    setTitle(''); setDesc(''); setLoc(''); setPrice(''); setShowForm(false)
    load()
  }

  async function toggleActive(m: Mini) {
    if (!supabase) return
    await supabase.from('mini_sessions').update({ active: !m.active }).eq('id', m.id)
    load()
  }
  async function removeMini(m: Mini) {
    if (!supabase) return
    if (!window.confirm('Delete "' + m.title + '" and its open times?')) return
    await supabase.from('mini_sessions').delete().eq('id', m.id)
    load()
  }
  async function removeSlot(id: string) {
    if (!supabase) return
    await supabase.from('mini_slots').delete().eq('id', id).eq('status', 'open')
    load()
  }
  async function addSlot(m: Mini) {
    const v = addAt[m.id]
    if (!supabase || !uid || !v) return
    await supabase.from('mini_slots').insert({ mini_id: m.id, owner_id: uid, starts_at: new Date(v).toISOString() })
    setAddAt((a) => ({ ...a, [m.id]: '' }))
    load()
  }
  async function copy(id: string) {
    try { await navigator.clipboard.writeText(SITE + '/mini/' + id); setCopied(id); setTimeout(() => setCopied(null), 1800) } catch {}
  }

  const input = 'w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none focus:border-twilight'
  const lab = 'mb-1.5 block text-xs font-medium text-ink'
  const ghost = 'rounded-xl border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition hover:border-ink'

  return (
    <div className="min-h-screen bg-paper xl:pl-60">
      <DashboardHeader active="minis" />
      <SubTabs group="packages" active="minis" />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-fraunces text-3xl font-semibold text-ink">Mini-sessions</h1>
            <p className="mt-1 text-sm text-ink-soft">Offer a set of short sessions. Clients pick a time and pay to reserve it.</p>
          </div>
          <button type="button" onClick={() => setShowForm((v) => !v)} className="rounded-xl bg-twilight px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90">{showForm ? 'Close' : '+ New mini-session'}</button>
        </div>

        {showForm && (
          <form onSubmit={create} className="mt-6 space-y-4 rounded-2xl border border-line bg-card p-6">
            <div><label className={lab}>Name</label><input className={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Fall Leaves Mini-Sessions" maxLength={100} /></div>
            <div><label className={lab}>Description</label><textarea className={input + ' min-h-[5rem]'} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What is included, what to wear, what to expect" /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className={lab}>Location</label><input className={input} value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="City Park, Pocatello" /></div>
              <div><label className={lab}>Price per session ($)</label><input className={input} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="150" /></div>
            </div>
            <p className="text-xs text-ink-soft">Camrhia will create the time slots for you. You can add or remove times afterwards.</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div><label className={lab}>Date</label><input type="date" className={input} value={date} onChange={(e) => setDate(e.target.value)} /></div>
              <div><label className={lab}>First start time</label><input type="time" className={input} value={time} onChange={(e) => setTime(e.target.value)} /></div>
              <div><label className={lab}>Number of slots</label><input className={input} inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} /></div>
              <div><label className={lab}>Minutes per session</label><input className={input} inputMode="numeric" value={dur} onChange={(e) => setDur(e.target.value)} /></div>
              <div><label className={lab}>Break between (min)</label><input className={input} inputMode="numeric" value={gap} onChange={(e) => setGap(e.target.value)} /></div>
            </div>
            {formErr && <p className="text-sm text-red-700">{formErr}</p>}
            <button type="submit" disabled={busy} className="rounded-xl bg-twilight px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50">{busy ? 'Creating…' : 'Create'}</button>
          </form>
        )}

        {error && <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {loading ? (
          <p className="mt-8 text-sm text-ink-soft">Loading…</p>
        ) : minis.length === 0 && !showForm ? (
          <section className="mt-8 rounded-2xl border border-line bg-card p-8 text-center">
            <p className="font-fraunces text-lg font-semibold text-ink">No mini-sessions yet</p>
            <p className="mt-2 text-sm text-ink-soft">Create one and share the link anywhere.</p>
          </section>
        ) : (
          <div className="mt-6 space-y-5">
            {minis.map((m) => {
              const mine = slots.filter((s) => s.mini_id === m.id)
              const booked = mine.filter((s) => s.status === 'booked')
              return (
                <section key={m.id} className="rounded-2xl border border-line bg-card p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="font-fraunces text-lg font-semibold text-ink">{m.title}</h2>
                      <p className="text-sm text-ink-soft">{money(m.price)}{m.duration_min ? ' · ' + m.duration_min + ' min' : ''}{m.location ? ' · ' + m.location : ''}</p>
                      <p className="mt-1 text-xs text-ink-soft">{booked.length} of {mine.length} booked · {money(booked.length * Number(m.price))} collected</p>
                    </div>
                    <span className={'rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ' + (m.active ? 'bg-blush-wash text-twilight' : 'border border-line text-ink-soft')}>{m.active ? 'Live' : 'Paused'}</span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" className={ghost} onClick={() => copy(m.id)}>{copied === m.id ? 'Link copied' : 'Copy booking link'}</button>
                    <button type="button" className={ghost} onClick={() => toggleActive(m)}>{m.active ? 'Pause' : 'Resume'}</button>
                    <button type="button" className={ghost + ' disabled:opacity-40'} disabled={booked.length > 0} title={booked.length > 0 ? 'Pause it instead, it has bookings' : ''} onClick={() => removeMini(m)}>Delete</button>
                  </div>

                  <div className="mt-5 space-y-2">
                    {mine.map((s) => {
                      const st = slotState(s)
                      return (
                        <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-ink">{fmt(s.starts_at, m.tz)}</p>
                            {st !== 'open' && <p className="truncate text-xs text-ink-soft">{s.client_name}{s.client_email ? ' · ' + s.client_email : ''}{s.client_phone ? ' · ' + s.client_phone : ''}</p>}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={'text-xs font-medium ' + (st === 'booked' ? 'text-twilight' : 'text-ink-soft')}>{st === 'booked' ? 'Booked' : st === 'held' ? 'Payment pending' : 'Open'}</span>
                            {st === 'open' && <button type="button" onClick={() => removeSlot(s.id)} className="text-xs text-ink-soft underline hover:text-ink">Remove</button>}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <input type="datetime-local" className={input + ' max-w-[15rem]'} value={addAt[m.id] ?? ''} onChange={(e) => setAddAt((a) => ({ ...a, [m.id]: e.target.value }))} />
                    <button type="button" className={ghost} onClick={() => addSlot(m)}>Add a time</button>
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
