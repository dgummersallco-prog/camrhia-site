'use client'

import { Select } from '@/app/components/Select'
import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { DashboardHeader } from '@/app/components/DashboardHeader'
import { ContractPanel } from './ContractPanel'
import { PaymentsPanel } from './PaymentsPanel'
import { QuestionnairePanel } from './QuestionnairePanel'

type Wedding = Record<string, any>
type Ev = { id: string; title: string | null; event_date: string | null; event_time: string | null; location: string | null; type: string | null; notes: string | null }
type Contract = { id: string; status: string | null; sent_at: string | null; signed_at: string | null; signer_name: string | null }
type Msg = { id: string; sender: string | null; body: string | null; created_at: string }
type Gal = { id: string; title: string; status: 'draft' | 'published'; token: string; pin_hash: string | null; expires_at: string | null; gallery_photos: { count: number }[] }

function fmtDate(d: string | null): string {
  if (!d) return 'No date yet'
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, m - 1, day).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}
function prettyType(t: string | null): string {
  if (!t) return 'Session'
  return t.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
}

const card = 'rounded-2xl border border-line bg-card p-5'
const btn = 'rounded-xl bg-twilight px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50'
const btnGhost = 'rounded-xl border border-line px-4 py-2.5 text-sm text-ink transition hover:border-twilight disabled:opacity-50'

const EDIT_GROUPS: Record<string, string[]> = {
  header: ['names', 'wedding_date', 'city', 'state'],
}

const inCls = 'w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-soft/50 focus:border-twilight focus:outline-none focus:ring-2 focus:ring-twilight/25'
const lblCls = 'mb-1 block text-xs uppercase tracking-wider text-ink-soft'

// "4:00 PM" <-> "16:00" so a time picker can edit the same text the app saves.
function to24(t: string): string {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(t.trim())
  if (!m) return ''
  let h = parseInt(m[1], 10) % 12
  if (m[3].toUpperCase() === 'PM') h += 12
  return `${String(h).padStart(2, '0')}:${m[2]}`
}
function to12(t: string): string {
  const m = /^(\d{2}):(\d{2})$/.exec(t)
  if (!m) return ''
  let h = parseInt(m[1], 10)
  const ap = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${m[2]} ${ap}`
}

function Pen({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-soft transition hover:bg-blush-wash hover:text-twilight">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
    </button>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <span className="text-ink-soft">{label}</span>
      <span className="text-right text-ink">{value}</span>
    </div>
  )
}

export default function SessionDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [userId, setUserId] = useState<string | null>(null)
  const [w, setW] = useState<Wedding | null>(null)
  const [events, setEvents] = useState<Ev[]>([])
  const [contract, setContract] = useState<Contract | null>(null)
  const [editKey, setEditKey] = useState<string | null>(null)
  const [ef, setEf] = useState<Record<string, string>>({})
  const [df, setDf] = useState<Record<string, string>>({})
  const [savingEdit, setSavingEdit] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [gals, setGals] = useState<Gal[]>([])
  const [loose, setLoose] = useState<{ id: string; title: string }[]>([])
  const [pick, setPick] = useState('')
  const [busy, setBusy] = useState(false)
  const [paperOpen, setPaperOpen] = useState(false)
  const [canDelete, setCanDelete] = useState(false)

  useEffect(() => {
    const sb = supabase
    if (!sb || !id) return
    sb.rpc('wedding_can_delete', { p_wedding: id }).then(({ data }) => setCanDelete(data === true))
  }, [id])

  async function cancelSession() {
    if (!window.confirm('Cancel this session? It will be hidden from your lists. Any payments and the contract stay on record.')) return
    const sb = supabase
    if (!sb) return
    const { error: e } = await sb.from('weddings').update({ canceled_at: new Date().toISOString() }).eq('id', id)
    if (e) { setError(e.message); return }
    router.push('/sessions')
  }

  async function deletePermanently() {
    const t = window.prompt('This permanently deletes the session. Type DELETE to confirm.')
    if (t?.trim() !== 'DELETE') return
    const sb = supabase
    if (!sb) return
    const { error: e } = await sb.rpc('delete_wedding', { p_wedding_id: id })
    if (e) { setError(e.message); return }
    router.push('/sessions')
  }
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [sendFor, setSendFor] = useState<string | null>(null)
  const [sendPin, setSendPin] = useState('')
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [notes, setNotes] = useState('')

  const load = useCallback(async () => {
    const sb = supabase
    if (!sb) return
    const { data: sess } = await sb.auth.getSession()
    if (!sess.session) { router.replace(`/login?next=/sessions/${id}`); return }
    setUserId(sess.session.user.id)
    const [wr, ev, ct, ms, g, free] = await Promise.all([
      sb.from('weddings').select('*').eq('id', id).maybeSingle(),
      sb.from('events').select('id, title, event_date, event_time, location, type, notes').eq('wedding_id', id).order('event_date', { ascending: true }),
      sb.from('contracts').select('id, status, sent_at, signed_at, signer_name').eq('wedding_id', id).order('created_at', { ascending: false }).limit(1),
      sb.rpc('session_thread_messages', { p_wedding: id }),
      sb.from('galleries').select('id, title, status, token, pin_hash, expires_at, gallery_photos(count)').eq('session_id', id),
      sb.from('galleries').select('id, title').is('session_id', null),
    ])
    if (wr.error || !wr.data) { setError(wr.error?.message ?? 'Session not found.'); return }
    setW(wr.data as Wedding)
    const wd = wr.data as Wedding
    setDf({
      session_start_time: wd.session_start_time ?? '',
      session_length_hours: wd.session_length_hours != null ? String(wd.session_length_hours) : '',
      package_name: wd.package_name ?? '',
      total_price: wd.total_price != null ? String(wd.total_price) : '',
      venue: wd.venue ?? '',
      gallery_due_date: wd.gallery_due_date ?? '',
    })
    setNotes(((wr.data as Wedding).private_notes as string | null) ?? '')
    setEvents((ev.data ?? []) as Ev[])
    setContract(((ct.data ?? [])[0] as Contract | undefined) ?? null)
    setMsgs((ms.data ?? []) as Msg[])
    setGals((g.data ?? []) as unknown as Gal[])
    setLoose((free.data ?? []) as { id: string; title: string }[])
  }, [id, router])

  useEffect(() => { load() }, [load])

  // Pick up new client messages without a manual refresh.
  useEffect(() => {
    const sb = supabase
    if (!sb || !id) return
    const t = setInterval(async () => {
      if (document.hidden) return
      const { data } = await sb.rpc('session_thread_messages', { p_wedding: id })
      if (data) setMsgs(data as Msg[])
    }, 20000)
    return () => clearInterval(t)
  }, [id])

  async function createGallery() {
    const sb = supabase
    if (!sb || !userId || !w) return
    setBusy(true)
    const { data, error: e } = await sb
      .from('galleries')
      .insert({ owner_id: userId, title: w.names || 'Session gallery', session_id: id })
      .select('id')
      .single()
    setBusy(false)
    if (e || !data) { setError(e?.message ?? 'Could not create the gallery.'); return }
    router.push(`/galleries/${data.id}`)
  }

  async function attach() {
    const sb = supabase
    if (!sb || !pick) return
    setBusy(true)
    const { error: e } = await sb.from('galleries').update({ session_id: id }).eq('id', pick)
    setBusy(false)
    if (e) { setError(e.message); return }
    setPick('')
    load()
  }

  async function detach(gid: string) {
    const sb = supabase
    if (!sb) return
    const { error: e } = await sb.from('galleries').update({ session_id: null }).eq('id', gid)
    if (e) { setError(e.message); return }
    load()
  }

  function localDate(iso: string): string {
    const d = new Date(iso)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  const sentTo = (g: Gal): string =>
    w && w.gallery_url && w.gallery_url.includes(g.token) && w.gallery_sent_at
      ? (w.gallery_downloaded_all_at ? ' · Client downloaded everything. Safe to free up storage' : w.gallery_opened_at ? ' · Sent, client opened it' : ' · Sent to client')
      : ''

  async function deliver(g: Gal) {
    const sb = supabase
    if (!sb || !w) return
    if (g.status !== 'published') { setError('Publish this gallery before sending it to your client.'); return }
    const pin = sendPin.trim()
    if (g.pin_hash && !pin) { setError('Enter the PIN your client should use. This sets it so it matches.'); return }
    if (pin && pin.length < 4) { setError('Use a PIN of at least 4 characters.'); return }
    setBusy(true)
    setError(null)
    if (pin) {
      const { error: pe } = await sb.rpc('set_gallery_pin', { p_gallery_id: g.id, p_pin: pin })
      if (pe) { setBusy(false); setError(pe.message); return }
    }
    const alreadySent = sentTo(g) !== ''
    const now = new Date().toISOString()
    const { error: we } = await sb
      .from('weddings')
      .update({
        gallery_url: `${window.location.origin}/g/${g.token}`,
        gallery_source: 'link',
        gallery_password: pin || null,
        gallery_expires_at: g.expires_at ? localDate(g.expires_at) : null,
        delivered: true,
        gallery_delivered_at: now,
        gallery_sent_at: now,
      })
      .eq('id', id)
    setBusy(false)
    if (we) { setError(we.message); return }
    if (w.couple_user_id && !alreadySent) {
      await sb.from('notifications').insert({
        user_id: w.couple_user_id,
        type: 'gallery_ready',
        title: 'Your gallery is ready',
        body: 'Your photographer shared your gallery. Tap to view your photos.',
        wedding_id: id,
      })
    }
    setSendFor(null)
    setSendPin('')
    setNote('Sent. Your client can now see the gallery in their session.')
    setTimeout(() => setNote(null), 4000)
    load()
  }

  async function sendReply() {
    const sb = supabase
    const body = reply.trim()
    if (!sb || !body) return
    setSending(true)
    const { error: e } = await sb.from('messages').insert({ wedding_id: id, sender: 'photographer', body })
    setSending(false)
    if (e) { setError(e.message); return }
    setReply('')
    load()
  }

  function startEdit(key: string) {
    const x = (w ?? {}) as Record<string, any>
    setEf({
      names: x.names ?? '',
      wedding_date: x.wedding_date ?? '',
      session_start_time: x.session_start_time ?? '',
      session_length_hours: x.session_length_hours != null ? String(x.session_length_hours) : '',
      package_name: x.package_name ?? '',
      total_price: x.total_price != null ? String(x.total_price) : '',
      city: x.city ?? '',
      state: x.state ?? '',
      venue: x.venue ?? '',
      delivery_days: x.delivery_days != null ? String(x.delivery_days) : '',
      gallery_due_date: x.gallery_due_date ?? '',
    })
    setEditKey(key)
  }

  function dueFrom(ds: string, n: number): string {
    const d = new Date(`${ds}T00:00:00`)
    d.setDate(d.getDate() + n)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  function pickDays(n: number) {
    const due = w?.wedding_date ? dueFrom(w.wedding_date, n) : (df.gallery_due_date || null)
    setDf((f) => ({ ...f, gallery_due_date: due ?? '' }))
    saveDelivery(n, due)
  }

  async function saveEdit() {
    const sb = supabase
    if (!sb || !w) return
    const x = w as Record<string, any>
    const num = (v: string) => { const n = parseFloat(v); return Number.isFinite(n) ? n : null }
    const t = (v: string) => (v.trim() ? v.trim() : null)
    setSavingEdit(true)
    setError(null)
    const full: Record<string, any> = {
        names: ef.names.trim() || x.names,
        wedding_date: ef.wedding_date || null,
        session_start_time: t(ef.session_start_time),
        session_length_hours: num(ef.session_length_hours),
        package_name: t(ef.package_name),
        total_price: num(ef.total_price),
        city: t(ef.city),
        state: t(ef.state),
        venue: t(ef.venue),
        delivery_days: ef.delivery_days ? parseInt(ef.delivery_days, 10) : null,
        gallery_due_date: ef.gallery_due_date || null,
    }
    const keys = EDIT_GROUPS[editKey ?? ''] ?? []
    const patch = Object.fromEntries(Object.entries(full).filter(([k]) => keys.includes(k)))
    if (keys.length === 0) { setSavingEdit(false); return }
    const { error: e } = await sb.from('weddings').update(patch).eq('id', id)
    setSavingEdit(false)
    if (e) { setError(e.message); return }
    setEditKey(null)
    setNote('Saved.')
    setTimeout(() => setNote(null), 3000)
    load()
  }

  async function saveNotes() {
    const sb = supabase
    if (!sb || !w) return
    const next = notes.trim() || null
    if (next === ((w.private_notes as string | null) ?? null)) return
    const { error: e } = await sb.from('weddings').update({ private_notes: next }).eq('id', id)
    if (e) { setError(e.message); return }
    setW((prev) => (prev ? { ...prev, private_notes: next } : prev))
    setNote('Notes saved.')
    setTimeout(() => setNote(null), 2000)
  }

  const cityState = w ? [w.city, w.state].filter(Boolean).join(', ') : ''

  const field = (k: string, type = 'text', cls = '', ph = '', focus = false) => (
    <input
      autoFocus={focus}
      type={type}
      value={ef[k] ?? ''}
      placeholder={ph}
      onChange={(e) => { const v = e.target.value; setEf((f) => ({ ...f, [k]: v })) }}
      onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditKey(null) }}
      className={`rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-soft/50 focus:border-twilight focus:outline-none focus:ring-2 focus:ring-twilight/25 ${cls}`}
    />
  )

  async function saveDetail(k: string, kind: 'text' | 'num') {
    const sb = supabase
    if (!sb || !w) return
    const raw = (df[k] ?? '').trim()
    const cur = w[k] == null ? '' : String(w[k])
    if (raw === cur) return
    let val: string | number | null = raw === '' ? null : raw
    if (kind === 'num') { const n = parseFloat(raw); val = Number.isFinite(n) ? n : null }
    const { error: e } = await sb.from('weddings').update({ [k]: val }).eq('id', id)
    if (e) { setError(e.message); return }
    setW((prev) => (prev ? { ...prev, [k]: val } : prev))
    setNote('Saved.')
    setTimeout(() => setNote(null), 2000)
  }

  async function saveDelivery(days: number | null, due: string | null) {
    const sb = supabase
    if (!sb || !w) return
    const { error: e } = await sb.from('weddings').update({ delivery_days: days, gallery_due_date: due }).eq('id', id)
    if (e) { setError(e.message); return }
    setW((prev) => (prev ? { ...prev, delivery_days: days, gallery_due_date: due } : prev))
    setNote('Saved.')
    setTimeout(() => setNote(null), 2000)
  }

  function saveDue() {
    const v = (df.gallery_due_date ?? '').trim()
    if (v === (w?.gallery_due_date ?? '')) return
    let days: number | null = null
    if (v && w?.wedding_date) {
      const diff = Math.round((new Date(`${v}T00:00:00`).getTime() - new Date(`${w.wedding_date}T00:00:00`).getTime()) / 86400000)
      days = diff > 0 ? diff : null
    }
    saveDelivery(days, v || null)
  }

  return (
    <div className="min-h-screen bg-paper xl:pl-60">
      <DashboardHeader active="sessions" />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <Link href="/sessions" className="text-sm text-ink-soft hover:text-ink">← All sessions</Link>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        {note && <p className="mt-4 text-sm text-twilight">{note}</p>}
        {!w ? (
          !error && <p className="mt-6 text-sm text-ink-soft">Loading…</p>
        ) : (
          <>
            <div className="mb-8 mt-4">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-line px-3 py-1 text-ink-soft">{prettyType(w.session_type)}</span>
                {w.status && <span className="rounded-full bg-twilight/10 px-3 py-1 text-twilight">{w.status}</span>}
                {w.paid_in_full && <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">Paid in full</span>}
              </div>
              {editKey === 'header' ? (
                <div className="mt-3 rounded-2xl border border-line bg-card p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className={lblCls}>Name</label>
                      {field('names', 'text', 'w-full', '', true)}
                    </div>
                    <div>
                      <label className={lblCls}>Date</label>
                      {field('wedding_date', 'date', 'w-full')}
                    </div>
                    <div className="grid grid-cols-[1fr_90px] gap-2">
                      <div>
                        <label className={lblCls}>City</label>
                        {field('city', 'text', 'w-full')}
                      </div>
                      <div>
                        <label className={lblCls}>State</label>
                        {field('state', 'text', 'w-full')}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button type="button" disabled={savingEdit} onClick={saveEdit} className="rounded-lg bg-twilight px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{savingEdit ? 'Saving…' : 'Save'}</button>
                    <button type="button" onClick={() => setEditKey(null)} className="rounded-lg border border-line px-4 py-2 text-sm text-ink">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="mt-3 flex items-center gap-1 font-fraunces text-3xl font-semibold text-ink md:text-4xl">
                    {w.names || 'Untitled session'}
                    <Pen onClick={() => startEdit('header')} label="Edit name, date and location" />
                  </h1>
                  <p className="mt-1 text-ink-soft">{fmtDate(w.wedding_date)}{cityState ? ` · ${cityState}` : ''}</p>
                </>
              )}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Details */}
              <section className={card}>
                <p className="mb-3 font-fraunces text-xl font-semibold text-ink">Details</p>
                <div className="grid grid-cols-2 divide-x divide-line overflow-hidden rounded-xl border border-line bg-paper">
                  <div className="p-3">
                    <p className="text-[11px] uppercase tracking-wider text-ink-soft">Start time</p>
                    <input
                      type="time"
                      value={to24(df.session_start_time ?? '')}
                      onChange={(e) => { const v = to12(e.target.value); setDf((f) => ({ ...f, session_start_time: v })) }}
                      onBlur={() => saveDetail('session_start_time', 'text')}
                      className="mt-1 w-full bg-transparent font-fraunces text-2xl font-semibold text-ink focus:outline-none"
                    />
                  </div>
                  <div className="p-3">
                    <p className="text-[11px] uppercase tracking-wider text-ink-soft">Length</p>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={df.session_length_hours ?? ''}
                        onChange={(e) => { const v = e.target.value; setDf((f) => ({ ...f, session_length_hours: v })) }}
                        onBlur={() => saveDetail('session_length_hours', 'num')}
                        className="w-16 bg-transparent font-fraunces text-2xl font-semibold text-ink focus:outline-none"
                      />
                      <span className="text-sm text-ink-soft">hours</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-4">
                  <div>
                    <label className={lblCls}>Package</label>
                    <input className={inCls} value={df.package_name ?? ''} onChange={(e) => { const v = e.target.value; setDf((f) => ({ ...f, package_name: v })) }} onBlur={() => saveDetail('package_name', 'text')} />
                  </div>
                  <div>
                    <label className={lblCls}>Total</label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-soft">$</span>
                      <input type="number" className={`${inCls} pl-7`} value={df.total_price ?? ''} onChange={(e) => { const v = e.target.value; setDf((f) => ({ ...f, total_price: v })) }} onBlur={() => saveDetail('total_price', 'num')} />
                    </div>
                  </div>
                  <div>
                    <label className={lblCls}>Venue / location</label>
                    <input className={inCls} value={df.venue ?? ''} onChange={(e) => { const v = e.target.value; setDf((f) => ({ ...f, venue: v })) }} onBlur={() => saveDetail('venue', 'text')} />
                  </div>
                  <div>
                    <label className={lblCls}>Gallery due</label>
                    <div className="mb-2 flex flex-wrap gap-2">
                      {[7, 14, 21, 30, 45, 60].map((n) => (
                        <button key={n} type="button" onClick={() => pickDays(n)}
                          className={`rounded-full border px-3.5 py-1 text-sm transition ${Number(w.delivery_days) === n ? 'border-twilight bg-blush-wash text-twilight' : 'border-line text-ink hover:border-twilight'}`}>
                          {n} days
                        </button>
                      ))}
                    </div>
                    <input type="date" className={inCls} value={df.gallery_due_date ?? ''} onChange={(e) => { const v = e.target.value; setDf((f) => ({ ...f, gallery_due_date: v })) }} onBlur={saveDue} />
                    <p className="mt-1 text-xs text-ink-soft">Your client sees this date as their delivery date.</p>
                  </div>
                </div>

                <div className="mt-3 divide-y divide-line">
                  <Row label="Coverage" value={w.coverage} />
                  <Row label="Deliverables" value={w.deliverables} />
                  <Row label="Guests" value={w.guests} />
                  <Row label="Balance" value={w.balance} />
                </div>

                <div className="mt-4">
                  <p className="mb-1 text-xs uppercase tracking-wider text-ink-soft">Private notes (only you see these)</p>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    onBlur={saveNotes}
                    placeholder="Add notes about this client"
                    className="w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 focus:border-twilight focus:outline-none focus:ring-2 focus:ring-twilight/25"
                  />
                </div>
              </section>

              {/* Contract + timeline */}
              {(() => {
                const wr = w as unknown as Record<string, any>
                const done = !!wr.shoot_completed_at
                if (!done) {
                  return (
                    <div className="space-y-6">
                      <ContractPanel weddingId={id} w={wr} onChanged={load} />
                      <PaymentsPanel weddingId={id} w={wr} />
                      <QuestionnairePanel weddingId={id} />
                    </div>
                  )
                }
                return (
                  <div className="space-y-6">
                    {!wr.delivered && (
                      <section className={card}>
                        <p className="font-fraunces text-xl font-semibold text-ink">Shoot complete</p>
                        <p className="mt-1 text-sm text-ink-soft">Now it&apos;s editing time. Deliver the gallery when it&apos;s ready.</p>
                        <button
                          type="button"
                          className={`${btn} mt-4`}
                          onClick={() => document.getElementById('galleries')?.scrollIntoView({ behavior: 'smooth' })}
                        >
                          Deliver gallery
                        </button>
                      </section>
                    )}
                    <PaymentsPanel weddingId={id} w={wr} />
                    <button
                      type="button"
                      onClick={() => setPaperOpen((o) => !o)}
                      className={`${card} flex w-full items-center justify-between text-left`}
                    >
                      <span>
                        <span className="block font-fraunces text-xl font-semibold text-ink">Paperwork</span>
                        <span className="block text-sm text-ink-soft">{paperOpen ? 'Hide contract and questionnaire' : 'Contract and questionnaire'}</span>
                      </span>
                      <span className="text-ink-soft">{paperOpen ? '−' : '+'}</span>
                    </button>
                    {paperOpen && (
                      <>
                        <ContractPanel weddingId={id} w={wr} onChanged={load} />
                        <QuestionnairePanel weddingId={id} />
                      </>
                    )}
                  </div>
                )
              })()}
            </div>

            {/* Galleries */}
            <section id="galleries" className={`${card} mt-6`}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="font-fraunces text-xl font-semibold text-ink">Galleries</p>
                <div className="flex flex-wrap items-center gap-2">
                  {loose.length > 0 && (
                    <>
                      <Select
                        value={pick}
                        onChange={(e) => setPick(e.target.value)}
                        className="rounded-xl border border-line bg-paper px-3 py-2.5 text-sm text-ink"
                      >
                        <option value="">Attach an existing gallery…</option>
                        {loose.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
                      </Select>
                      <button className={btnGhost} disabled={!pick || busy} onClick={attach}>Attach</button>
                    </>
                  )}
                  <button className={btn} disabled={busy} onClick={createGallery}>New gallery for this session</button>
                </div>
              </div>
              {gals.length === 0 ? (
                <p className="text-sm text-ink-soft">No galleries attached to this session yet.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {gals.map((g) => (
                    <li key={g.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <Link href={`/galleries/${g.id}`} className="min-w-0 flex-1">
                        <p className="truncate font-medium text-ink">{g.title}</p>
                        <p className="text-xs text-ink-soft">
                          {g.gallery_photos?.[0]?.count ?? 0} photos · {g.status === 'published' ? 'Published' : 'Draft'}{sentTo(g)}
                        </p>
                      </Link>
                      <div className="flex items-center gap-3">
                        {g.status === 'published' && (
                          <button
                            onClick={() => { setSendFor(sendFor === g.id ? null : g.id); setSendPin(''); setError(null) }}
                            className="rounded-lg bg-twilight px-3 py-1.5 text-xs font-medium text-white"
                          >
                            {sentTo(g) ? 'Resend' : 'Send to client'}
                          </button>
                        )}
                        <button onClick={() => detach(g.id)} className="text-xs text-ink-soft underline hover:text-ink">Detach</button>
                      </div>
                      {sendFor === g.id && (
                        <div className="w-full basis-full rounded-xl bg-paper-deep p-4">
                          <p className="text-sm text-ink">This puts the gallery link in your client&apos;s session in the Camrhia app.</p>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <input
                              value={sendPin}
                              onChange={(e) => setSendPin(e.target.value)}
                              placeholder={g.pin_hash ? 'Enter the PIN to show your client' : 'Add a PIN (optional)'}
                              className="rounded-xl border border-line bg-paper px-4 py-2.5 text-sm text-ink focus:border-twilight focus:outline-none"
                            />
                            <button disabled={busy} onClick={() => deliver(g)} className="rounded-xl bg-twilight px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">
                              Send now
                            </button>
                          </div>
                          <p className="mt-2 text-xs text-ink-soft">
                            {g.pin_hash ? 'Entering a PIN here sets it, so what your client sees always matches.' : 'Your client sees the PIN in the app and needs it to open the gallery.'}
                          </p>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Messages */}
            <section className={`${card} mt-6`}>
              <p className="mb-3 font-fraunces text-xl font-semibold text-ink">Messages</p>
              {msgs.length === 0 ? (
                <p className="text-sm text-ink-soft">No messages yet.</p>
              ) : (
                <ul className="space-y-3">
                  {msgs.map((m) => (
                    <li key={m.id} className="rounded-xl bg-paper-deep px-4 py-3 text-sm">
                      <div className="mb-1 flex justify-between text-xs text-ink-soft">
                        <span className="capitalize">{m.sender === 'photographer' ? 'You' : (m.sender || 'Client')}</span>
                        <span>{new Date(m.created_at).toLocaleString()}</span>
                      </div>
                      <p className="whitespace-pre-wrap text-ink">{m.body}</p>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4 flex gap-2">
                <textarea
                  rows={2}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') sendReply() }}
                  placeholder="Write a reply"
                  className="w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 focus:border-twilight focus:outline-none focus:ring-2 focus:ring-twilight/25"
                />
                <button
                  disabled={sending || !reply.trim()}
                  onClick={sendReply}
                  className="self-end rounded-xl bg-twilight px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                >
                  {sending ? 'Sending…' : 'Send'}
                </button>
              </div>
            </section>

            <div className="mt-8 flex flex-wrap justify-end gap-3">
              <button type="button" onClick={cancelSession} className={btnGhost}>Cancel session</button>
              {canDelete && (
                <button type="button" onClick={deletePermanently} className={btnGhost}>Delete permanently</button>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
