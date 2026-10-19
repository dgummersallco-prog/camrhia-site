'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { DashboardHeader } from '@/app/components/DashboardHeader'
import { ContractPanel } from './ContractPanel'

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
  const [editing, setEditing] = useState(false)
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

  function startEdit() {
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
    setEditing(true)
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
    const { error: e } = await sb
      .from('weddings')
      .update({
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
      })
      .eq('id', id)
    setSavingEdit(false)
    if (e) { setError(e.message); return }
    setEditing(false)
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

  const place = w ? [w.venue, [w.city, w.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ') : ''

  return (
    <div className="min-h-screen bg-paper lg:pl-60">
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
              <h1 className="mt-3 font-fraunces text-3xl font-semibold text-ink md:text-4xl">{w.names || 'Untitled session'}</h1>
              <p className="mt-1 text-ink-soft">{fmtDate(w.wedding_date)}{place ? ` · ${place}` : ''}</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Details */}
              <section className={card}>
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-fraunces text-xl font-semibold text-ink">Details</p>
                  {!editing && <button type="button" onClick={startEdit} className="text-sm font-medium text-twilight hover:underline">Edit details</button>}
                </div>
                {editing ? (
                  <div className="space-y-3">
                    {([
                      ['names', 'Session name', 'text'],
                      ['wedding_date', 'Session date', 'date'],
                      ['session_start_time', 'Start time', 'text'],
                      ['session_length_hours', 'Length (hours)', 'number'],
                      ['package_name', 'Package', 'text'],
                      ['total_price', 'Total price ($)', 'number'],
                      ['city', 'City', 'text'],
                      ['state', 'State', 'text'],
                      ['venue', 'Venue', 'text'],
                    ] as const).map(([k, lab, type]) => (
                      <div key={k}>
                        <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">{lab}</label>
                        <input
                          type={type}
                          value={ef[k] ?? ''}
                          onChange={(e) => setEf((f) => ({ ...f, [k]: e.target.value }))}
                          className="w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm text-ink focus:border-twilight focus:outline-none focus:ring-2 focus:ring-twilight/25"
                        />
                      </div>
                    ))}
                    <div>
                      <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">Gallery delivery (days after the session)</label>
                      <div className="mb-2 flex flex-wrap gap-2">
                        {[7, 14, 21, 30, 45, 60].map((n) => (
                          <button key={n} type="button" onClick={() => pickDays(n)}
                            className={`rounded-full border px-3.5 py-1 text-sm transition ${ef.delivery_days === String(n) ? 'border-twilight bg-blush-wash text-twilight' : 'border-line text-ink hover:border-twilight'}`}>
                            {n} days
                          </button>
                        ))}
                      </div>
                      <input
                        inputMode="numeric"
                        value={ef.delivery_days ?? ''}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^0-9]/g, '')
                          setEf((f) => ({ ...f, delivery_days: v, gallery_due_date: v && f.wedding_date ? dueFrom(f.wedding_date, parseInt(v, 10)) : f.gallery_due_date }))
                        }}
                        placeholder="Custom number of days"
                        className="w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm text-ink focus:border-twilight focus:outline-none focus:ring-2 focus:ring-twilight/25"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">Gallery due date</label>
                      <input
                        type="date"
                        value={ef.gallery_due_date ?? ''}
                        onChange={(e) => setEf((f) => ({ ...f, gallery_due_date: e.target.value }))}
                        className="w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm text-ink focus:border-twilight focus:outline-none focus:ring-2 focus:ring-twilight/25"
                      />
                      <p className="mt-1 text-xs text-ink-soft">Your client sees this date as their delivery date.</p>
                    </div>
                    <div className="flex gap-3 pt-1">
                      <button type="button" disabled={savingEdit} onClick={saveEdit} className="rounded-xl bg-twilight px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
                        {savingEdit ? 'Saving…' : 'Save'}
                      </button>
                      <button type="button" onClick={() => setEditing(false)} className="rounded-xl border border-line px-5 py-2.5 text-sm text-ink hover:border-twilight">Cancel</button>
                    </div>
                  </div>
                ) : (
                <div className="divide-y divide-line">
                  <Row label="Package" value={w.package_name} />
                  <Row label="Coverage" value={w.coverage} />
                  <Row label="Deliverables" value={w.deliverables} />
                  <Row label="Start time" value={w.session_start_time} />
                  <Row label="Length" value={w.session_length_hours ? `${w.session_length_hours} hours` : null} />
                  <Row label="Guests" value={w.guests} />
                  <Row label="Total" value={w.total_price ? `$${Number(w.total_price).toLocaleString()}` : null} />
                  <Row label="Gallery due" value={(w as Record<string, any>).gallery_due_date ? fmtDate((w as Record<string, any>).gallery_due_date) : null} />
                  <Row label="Balance" value={w.balance} />
                </div>
                )}
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
                      <select
                        value={pick}
                        onChange={(e) => setPick(e.target.value)}
                        className="rounded-xl border border-line bg-paper px-3 py-2.5 text-sm text-ink"
                      >
                        <option value="">Attach an existing gallery…</option>
                        {loose.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
                      </select>
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
