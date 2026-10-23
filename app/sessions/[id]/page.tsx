'use client'

import { Select } from '@/app/components/Select'
import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { DashboardHeader } from '@/app/components/DashboardHeader'
import { ContractPanel } from './ContractPanel'
import { PaymentsPanel } from './PaymentsPanel'

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
  names: ['names'],
  date: ['wedding_date'],
  place: ['city', 'state'],
  start: ['session_start_time'],
  length: ['session_length_hours'],
  package: ['package_name'],
  total: ['total_price'],
  venue: ['venue'],
  delivery: ['delivery_days', 'gallery_due_date'],
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
  const [savingEdit, setSavingEdit] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [gals, setGals] = useState<Gal[]>([])
  const [loose, setLoose] = useState<{ id: string; title: string }[]>([])
  const [pick, setPick] = useState('')
  const [busy, setBusy] = useState(false)
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
      sb.from('messages').select('id, sender, body, created_at').eq('wedding_id', id).order('created_at', { ascending: true }),
      sb.from('galleries').select('id, title, status, token, pin_hash, expires_at, gallery_photos(count)').eq('session_id', id),
      sb.from('galleries').select('id, title').is('session_id', null),
    ])
    if (wr.error || !wr.data) { setError(wr.error?.message ?? 'Session not found.'); return }
    setW(wr.data as Wedding)
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
      const { data } = await sb.from('messages').select('id, sender, body, created_at').eq('wedding_id', id).order('created_at', { ascending: true })
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
    setEf((f) => ({ ...f, delivery_days: String(n), gallery_due_date: f.wedding_date ? dueFrom(f.wedding_date, n) : f.gallery_due_date }))
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

  const field = (k: string, type = 'text', cls = '', ph = '') => (
    <input
      autoFocus
      type={type}
      value={ef[k] ?? ''}
      placeholder={ph}
      onChange={(e) => {
        const v = e.target.value
        setEf((f) => {
          const n = { ...f, [k]: v }
          if (k === 'gallery_due_date' && v && f.wedding_date) {
            const diff = Math.round((new Date(`${v}T00:00:00`).getTime() - new Date(`${f.wedding_date}T00:00:00`).getTime()) / 86400000)
            n.delivery_days = diff > 0 ? String(diff) : ''
          }
          return n
        })
      }}
      onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditKey(null) }}
      className={`rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-soft/50 focus:border-twilight focus:outline-none focus:ring-2 focus:ring-twilight/25 ${cls}`}
    />
  )

  const editBox = (children: React.ReactNode) => (
    <div className="flex flex-wrap items-center gap-2">
      {children}
      <button type="button" disabled={savingEdit} onClick={saveEdit} className="rounded-lg bg-twilight px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">{savingEdit ? 'Saving…' : 'Save'}</button>
      <button type="button" onClick={() => setEditKey(null)} className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink">Cancel</button>
    </div>
  )

  const dRow = (key: string, label: string, display: React.ReactNode, editor: React.ReactNode) => (
    <div key={key} className="py-2.5 text-sm">
      {editKey === key ? (
        <>
          <p className="mb-1.5 text-xs uppercase tracking-wider text-ink-soft">{label}</p>
          {editor}
        </>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <span className="text-ink-soft">{label}</span>
          <span className="flex items-center gap-1 text-right text-ink">
            {display || <span className="text-ink-soft/60">Not set</span>}
            <Pen onClick={() => startEdit(key)} label={`Edit ${label.toLowerCase()}`} />
          </span>
        </div>
      )}
    </div>
  )

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
              {editKey === 'names' ? (
                <div className="mt-3">{editBox(field('names', 'text', 'w-72 max-w-full'))}</div>
              ) : (
                <h1 className="mt-3 flex items-center gap-1 font-fraunces text-3xl font-semibold text-ink md:text-4xl">
                  {w.names || 'Untitled session'}
                  <Pen onClick={() => startEdit('names')} label="Edit name" />
                </h1>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-x-1 text-ink-soft">
                {editKey === 'date' ? editBox(field('wedding_date', 'date')) : (
                  <>
                    <span>{fmtDate(w.wedding_date)}</span>
                    <Pen onClick={() => startEdit('date')} label="Edit date" />
                  </>
                )}
                <span className="mx-1">·</span>
                {editKey === 'place' ? editBox(<>{field('city', 'text', 'w-40', 'City')}{field('state', 'text', 'w-20', 'State')}</>) : (
                  <>
                    <span>{cityState || 'Add city and state'}</span>
                    <Pen onClick={() => startEdit('place')} label="Edit city and state" />
                  </>
                )}
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Details */}
              <section className={card}>
                <p className="mb-1 font-fraunces text-xl font-semibold text-ink">Details</p>
                <div className="divide-y divide-line">
                  {dRow('start', 'Start time', w.session_start_time, editBox(field('session_start_time', 'text', 'w-40')))}
                  {dRow('length', 'Length', w.session_length_hours ? `${w.session_length_hours} hours` : '', editBox(<>{field('session_length_hours', 'number', 'w-28')}<span className="text-sm text-ink-soft">hours</span></>))}
                  {dRow('package', 'Package', w.package_name, editBox(field('package_name', 'text', 'w-64 max-w-full')))}
                  {dRow('total', 'Total', w.total_price ? `$${Number(w.total_price).toLocaleString()}` : '', editBox(field('total_price', 'number', 'w-36')))}
                  {dRow('venue', 'Venue', w.venue, editBox(field('venue', 'text', 'w-64 max-w-full')))}
                  {dRow(
                    'delivery',
                    'Gallery due',
                    (w as Record<string, any>).gallery_due_date
                      ? `${fmtDate((w as Record<string, any>).gallery_due_date)}${w.delivery_days ? ` (${w.delivery_days} days after)` : ''}`
                      : '',
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {[7, 14, 21, 30, 45, 60].map((n) => (
                          <button key={n} type="button" onClick={() => pickDays(n)}
                            className={`rounded-full border px-3.5 py-1 text-sm transition ${ef.delivery_days === String(n) ? 'border-twilight bg-blush-wash text-twilight' : 'border-line text-ink hover:border-twilight'}`}>
                            {n} days
                          </button>
                        ))}
                      </div>
                      {editBox(field('gallery_due_date', 'date'))}
                      <p className="text-xs text-ink-soft">Your client sees this date as their delivery date.</p>
                    </div>,
                  )}
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
              <div className="space-y-6">
                <ContractPanel weddingId={id} w={w as unknown as Record<string, any>} onChanged={load} />
                <PaymentsPanel weddingId={id} w={w as unknown as Record<string, any>} />

                <section className={card}>
                  <p className="mb-3 font-fraunces text-xl font-semibold text-ink">Timeline</p>
                  {events.length === 0 ? (
                    <p className="text-sm text-ink-soft">No timeline events yet.</p>
                  ) : (
                    <ul className="space-y-3">
                      {events.map((e) => (
                        <li key={e.id} className="flex gap-3 text-sm">
                          <span className="w-24 shrink-0 text-ink-soft">
                            {e.event_date ? new Date(`${e.event_date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
                            {e.event_time ? ` ${e.event_time}` : ''}
                          </span>
                          <span className="text-ink">
                            {e.title}
                            {e.location && <span className="block text-xs text-ink-soft">{e.location}</span>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            </div>

            {/* Galleries */}
            <section className={`${card} mt-6`}>
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
          </>
        )}
      </main>
    </div>
  )
}
