'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ClientHeader } from '@/app/components/ClientHeader'

type Gallery = { token: string; title: string | null; has_pin: boolean }
type Portal = {
  wedding_id: string; session_type: string; names: string | null; wedding_date: string | null
  venue: string | null; city: string | null; state: string | null
  studio_name: string | null; display_name: string | null; galleries: Gallery[] | null
}
type Mine = {
  wedding_id: string; share_token: string | null; gallery_password: string | null
  contract_status: string | null; has_contract: boolean; has_questionnaire: boolean; has_timeline: boolean; has_photographer: boolean
  questionnaire_answered: number; questionnaire_total: number
  timeline_approved: boolean | null; timeline_shared_at: string | null
}
type Detail = {
  package_name: string | null; coverage: string | null; deliverables: string | null; guests: number | null
  session_start_time: string | null; session_length_hours: number | null
  total_price: number | null; timeline_approved_at: string | null
  partner1_name: string | null; partner1_role: string | null; partner2_name: string | null; partner2_role: string | null
  last_name: string | null; venue: string | null; wedding_date: string | null
}
type Pay = { id: string; label: string | null; amount: number; due_date: string | null; status: string | null; paid_at: string | null; method: string | null; sent_by_couple: boolean | null }
type Shot = { id: string; label: string; done: boolean }
type Contact = { id: string; name: string; role: string | null; phone: string | null }

const TYPE_LABELS: Record<string, string> = {
  wedding: 'Wedding', engagement: 'Engagement', proposal: 'Proposal', maternity: 'Maternity', newborn: 'Newborn',
  family: 'Family', senior: 'Senior', headshots: 'Headshots', branding: 'Branding', graduation: 'Graduation',
  sports: 'Sports', team: 'Team', boudoir: 'Boudoir',
}
const label = (t: string) => TYPE_LABELS[t] ?? t.charAt(0).toUpperCase() + t.slice(1).replace(/_/g, ' ')
const day = (d: string | null) => (d ? new Date(d + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'Date to be set')
const short = (d: string | null) => (d ? new Date(d + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '')
const money = (n: number) => '$' + Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
const ROLES = ['Bride', 'Groom', 'Partner']
const METHODS = ['Venmo', 'Zelle', 'Cash', 'Check', 'Card', 'Other']
const card = 'rounded-2xl border border-line bg-card p-5'
const btn = 'inline-block rounded-full border border-line px-5 py-2 text-sm font-semibold text-ink transition hover:border-twilight'
const btnPrimary = 'inline-block rounded-full bg-twilight px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50'

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  if (v === null || v === undefined || v === '') return null
  return (
    <div className="flex justify-between gap-4 py-2.5 text-sm">
      <span className="text-ink-soft">{k}</span>
      <span className="text-right text-ink">{v}</span>
    </div>
  )
}

export default function ClientSessionPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params.id
  const [row, setRow] = useState<Portal | null>(null)
  const [mine, setMine] = useState<Mine | null>(null)
  const [d, setD] = useState<Detail | null>(null)
  const [pays, setPays] = useState<Pay[]>([])
  const [shots, setShots] = useState<Shot[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [missing, setMissing] = useState(false)
  const [reporting, setReporting] = useState<string | null>(null)
  const [howPaid, setHowPaid] = useState('')
  const [payNote, setPayNote] = useState('')
  const [editInfo, setEditInfo] = useState(false)
  const [f, setF] = useState({ p1: '', p1r: 'Partner', p2: '', p2r: 'Partner', last: '', date: '', venue: '' })
  const [editGuests, setEditGuests] = useState(false)
  const [guestsVal, setGuestsVal] = useState('')

  const load = useCallback(async () => {
    const sb = supabase
    if (!sb) return
    const { data: sess } = await sb.auth.getSession()
    if (!sess.session) { router.replace(`/login?next=/my/session/${id}`); return }
    const [a, b] = await Promise.all([sb.rpc('client_portal_sessions'), sb.rpc('get_my_wedding')])
    const r = ((a.data ?? []) as Portal[]).find((x) => x.wedding_id === id) ?? null
    const m = ((b.data ?? []) as Mine[]).find((x) => x.wedding_id === id) ?? null
    if (!r) { setMissing(true); setReady(true); return }
    setRow(r)
    setMine(m)
    const [w, p, s, c] = await Promise.all([
      sb.from('weddings').select('package_name, coverage, deliverables, guests, session_start_time, session_length_hours, total_price, timeline_approved_at, partner1_name, partner1_role, partner2_name, partner2_role, last_name, venue, wedding_date').eq('id', id).maybeSingle(),
      sb.from('payment_schedule').select('id, label, amount, due_date, status, paid_at, method, sent_by_couple').eq('wedding_id', id).order('sort_order', { ascending: true }),
      sb.from('shot_list').select('id, label, done').eq('wedding_id', id).order('sort_order', { ascending: true }),
      sb.from('wedding_contacts').select('id, name, role, phone').eq('wedding_id', id).order('sort_order', { ascending: true }),
    ])
    setD((w.data ?? null) as Detail | null)
    setPays((p.data ?? []) as Pay[])
    setShots((s.data ?? []) as Shot[])
    setContacts((c.data ?? []) as Contact[])
    setReady(true)
  }, [id, router])

  useEffect(() => { load() }, [load])

  async function approve() {
    const sb = supabase
    if (!sb || !mine?.share_token) return
    setBusy(true)
    setError(null)
    const { error: e } = await sb.rpc('approve_timeline', { p_token: mine.share_token })
    setBusy(false)
    if (e) { setError(e.message); return }
    load()
  }

  async function reportPayment(lineId: string) {
    const sb = supabase
    if (!sb) return
    if (!howPaid) { setError('Choose how you sent the payment first.'); return }
    setBusy(true)
    setError(null)
    const { error: e } = await sb.rpc('report_payment', { p_line_id: lineId, p_method: howPaid, p_note: payNote.trim() || null })
    setBusy(false)
    if (e) { setError(e.message); return }
    setReporting(null)
    load()
  }

  function startEditInfo() {
    setF({
      p1: d?.partner1_name ?? '', p1r: d?.partner1_role ?? 'Partner',
      p2: d?.partner2_name ?? '', p2r: d?.partner2_role ?? 'Partner',
      last: d?.last_name ?? '', date: d?.wedding_date ?? row?.wedding_date ?? '', venue: d?.venue ?? row?.venue ?? '',
    })
    setEditInfo(true)
  }

  async function saveInfo() {
    const sb = supabase
    if (!sb || !row) return
    const couple = row.session_type === 'wedding' || row.session_type === 'engagement'
    if (!f.p1.trim() && !f.p2.trim()) { setError('Add at least one name.'); return }
    const canDate = !mine?.has_photographer || !row.wedding_date
    const canVenue = !mine?.has_photographer || !row.venue
    const base = [f.p1.trim(), f.p2.trim()].filter(Boolean).join(' & ')
    const names = f.last.trim() ? `${base} ${f.last.trim()}` : base
    const patch: Record<string, unknown> = couple
      ? {
          partner1_name: f.p1.trim() || null, partner1_role: f.p1r,
          partner2_name: f.p2.trim() || null, partner2_role: f.p2r,
          last_name: f.last.trim() || null, names,
        }
      : { partner1_name: f.p1.trim() || null, names: f.p1.trim() }
    if (canDate) patch.wedding_date = f.date.trim() || null
    if (canVenue) patch.venue = f.venue.trim() || null
    setBusy(true)
    setError(null)
    const { error: e } = await sb.from('weddings').update(patch).eq('id', id)
    setBusy(false)
    if (e) { setError(e.code === '42501' ? 'You do not have permission to change that.' : e.message); return }
    setEditInfo(false)
    load()
  }

  async function saveGuests() {
    const sb = supabase
    if (!sb) return
    const n = parseInt(guestsVal, 10)
    if (!Number.isFinite(n) || n < 0) { setError('Enter a guest count.'); return }
    setBusy(true)
    setError(null)
    const { error: e } = await sb.from('weddings').update({ guests: n }).eq('id', id)
    setBusy(false)
    if (e) { setError(e.message); return }
    setEditGuests(false)
    load()
  }

  const studio = row ? (row.studio_name || row.display_name || 'Your photographer') : ''
  const place = row ? [row.venue, [row.city, row.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ') : ''
  const paidTotal = pays.filter((x) => x.status === 'paid').reduce((n, x) => n + Number(x.amount), 0)
  const remaining = pays.filter((x) => x.status !== 'paid').reduce((n, x) => n + Number(x.amount), 0)
  const timelineShared = !!mine?.timeline_shared_at
  const approved = !!mine?.timeline_approved

  return (
    <div className="min-h-screen bg-paper lg:pl-60">
      <ClientHeader active="sessions" />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <Link href="/my" className="text-sm text-ink-soft hover:text-ink">← Home</Link>
        {!ready ? (
          <p className="mt-6 text-sm text-ink-soft">Loading…</p>
        ) : missing || !row ? (
          <p className={`${card} mt-6 text-ink-soft`}>We could not find that session.</p>
        ) : (
          <>
            <div className="mb-8 mt-4">
              <p className="font-mono text-xs uppercase tracking-widest text-brass">{label(row.session_type)}</p>
              <h1 className="mt-1 font-fraunces text-3xl font-semibold text-ink md:text-4xl">{studio}</h1>
              <p className="mt-1 text-ink-soft">{day(row.wedding_date)}{place ? ` · ${place}` : ''}</p>
            </div>
            {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

            <div className="mb-6 flex flex-wrap gap-2">
              {mine?.has_contract && (mine.contract_status === 'sent' || mine.contract_status === 'signed') && (
                <Link href={`/my/contract/${id}`} className={mine.contract_status === 'sent' ? btnPrimary : btn}>
                  {mine.contract_status === 'signed' ? 'View signed contract' : 'Review and sign contract'}
                </Link>
              )}
              {mine?.has_questionnaire && mine.questionnaire_total > 0 && (
                <Link href={`/my/questionnaire/${id}`} className={btn}>
                  {mine.questionnaire_answered >= mine.questionnaire_total ? 'Review questionnaire' : `Questionnaire (${mine.questionnaire_answered}/${mine.questionnaire_total})`}
                </Link>
              )}
              {(row.galleries ?? []).map((g) => (
                <a key={g.token} href={`/g/${g.token}`} className={btnPrimary}>{g.title || 'View your photos'}</a>
              ))}
              <Link href={`/my/messages/${id}?s=${encodeURIComponent(studio)}`} className={btn}>Message {studio}</Link>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className={card}>
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-fraunces text-xl font-semibold text-ink">Session info</p>
                  {!editInfo && <button type="button" onClick={startEditInfo} className="text-sm text-twilight hover:underline">Edit</button>}
                </div>
                {!editInfo ? (
                  <div className="divide-y divide-line">
                    <Row k="Name" v={row.names} />
                    <Row k="Date" v={row.wedding_date ? day(row.wedding_date) : 'Not set'} />
                    <Row k="Location" v={place || 'Not set'} />
                  </div>
                ) : (
                  <div className="space-y-3 text-sm">
                    {(row.session_type === 'wedding' || row.session_type === 'engagement') ? (
                      <>
                        <div className="flex gap-2">
                          <input value={f.p1} onChange={(e) => setF({ ...f, p1: e.target.value })} placeholder="First name" className="min-w-0 flex-1 rounded-xl border border-line bg-paper px-3 py-2 text-ink focus:border-twilight focus:outline-none" />
                          <select value={f.p1r} onChange={(e) => setF({ ...f, p1r: e.target.value })} className="rounded-xl border border-line bg-paper px-2 py-2 text-ink">{ROLES.map((r) => <option key={r}>{r}</option>)}</select>
                        </div>
                        <div className="flex gap-2">
                          <input value={f.p2} onChange={(e) => setF({ ...f, p2: e.target.value })} placeholder="Second name" className="min-w-0 flex-1 rounded-xl border border-line bg-paper px-3 py-2 text-ink focus:border-twilight focus:outline-none" />
                          <select value={f.p2r} onChange={(e) => setF({ ...f, p2r: e.target.value })} className="rounded-xl border border-line bg-paper px-2 py-2 text-ink">{ROLES.map((r) => <option key={r}>{r}</option>)}</select>
                        </div>
                        <input value={f.last} onChange={(e) => setF({ ...f, last: e.target.value })} placeholder="Last name" className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-ink focus:border-twilight focus:outline-none" />
                      </>
                    ) : (
                      <input value={f.p1} onChange={(e) => setF({ ...f, p1: e.target.value })} placeholder="Name" className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-ink focus:border-twilight focus:outline-none" />
                    )}
                    {(!mine?.has_photographer || !row.wedding_date) && (
                      <div>
                        <p className="mb-1 text-xs uppercase tracking-wider text-ink-soft">Date</p>
                        <input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-ink focus:border-twilight focus:outline-none" />
                      </div>
                    )}
                    {(!mine?.has_photographer || !row.venue) && (
                      <div>
                        <p className="mb-1 text-xs uppercase tracking-wider text-ink-soft">Venue</p>
                        <input value={f.venue} onChange={(e) => setF({ ...f, venue: e.target.value })} placeholder="Venue or location" className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-ink focus:border-twilight focus:outline-none" />
                      </div>
                    )}
                    {mine?.has_photographer && row.wedding_date && row.venue && (
                      <p className="text-xs text-ink-soft">To change the date or venue, message your photographer.</p>
                    )}
                    <div className="flex gap-2">
                      <button type="button" disabled={busy} onClick={saveInfo} className={btnPrimary}>{busy ? 'Saving…' : 'Save'}</button>
                      <button type="button" onClick={() => setEditInfo(false)} className={btn}>Cancel</button>
                    </div>
                  </div>
                )}
              </section>

              <section className={card}>
                <p className="mb-2 font-fraunces text-xl font-semibold text-ink">Details</p>
                <div className="divide-y divide-line">
                  <Row k="Package" v={d?.package_name} />
                  <Row k="Coverage" v={d?.coverage} />
                  <Row k="Deliverables" v={d?.deliverables} />
                  <Row k="Start time" v={d?.session_start_time} />
                  <Row k="Length" v={d?.session_length_hours ? `${d.session_length_hours} hour${Number(d.session_length_hours) === 1 ? '' : 's'}` : null} />
                  <div className="flex items-center justify-between gap-4 py-2.5 text-sm">
                    <span className="text-ink-soft">Guests</span>
                    {editGuests ? (
                      <span className="flex items-center gap-2">
                        <input value={guestsVal} onChange={(e) => setGuestsVal(e.target.value)} inputMode="numeric"
                          className="w-20 rounded-lg border border-line bg-paper px-2 py-1 text-right text-sm text-ink focus:border-twilight focus:outline-none" />
                        <button type="button" disabled={busy} onClick={saveGuests} className="text-twilight hover:underline disabled:opacity-50">Save</button>
                        <button type="button" onClick={() => setEditGuests(false)} className="text-ink-soft hover:underline">Cancel</button>
                      </span>
                    ) : (
                      <span className="flex items-center gap-3">
                        <span className="text-ink">{d?.guests ?? 'Not set'}</span>
                        <button type="button" onClick={() => { setGuestsVal(d?.guests != null ? String(d.guests) : ''); setEditGuests(true) }} className="text-twilight hover:underline">Edit</button>
                      </span>
                    )}
                  </div>
                  <Row k="Total" v={d?.total_price ? money(d.total_price) : null} />
                </div>
                {!d?.package_name && !d?.session_start_time && !d?.total_price && (
                  <p className="text-sm text-ink-soft">Your photographer will add the details here.</p>
                )}
              </section>

              <section className={card}>
                <p className="mb-2 font-fraunces text-xl font-semibold text-ink">Payments</p>
                {pays.length === 0 ? (
                  <p className="text-sm text-ink-soft">No payment schedule yet.</p>
                ) : (
                  <>
                    <ul className="divide-y divide-line">
                      {pays.map((p) => (
                        <li key={p.id} className="py-2.5 text-sm">
                          <div className="flex items-center justify-between gap-3">
                          <span className="min-w-0">
                            <span className="block truncate text-ink">{p.label || 'Payment'}</span>
                            <span className="block text-xs text-ink-soft">
                              {p.status === 'paid'
                                ? `Paid${p.paid_at ? ' ' + new Date(p.paid_at).toLocaleDateString() : ''}${p.method ? ' · ' + p.method : ''}`
                                : p.sent_by_couple ? 'You marked this as sent'
                                : p.due_date ? `Due ${short(p.due_date)}` : 'Unpaid'}
                            </span>
                          </span>
                          <span className={p.status === 'paid' ? 'text-emerald-700' : 'text-ink'}>{money(p.amount)}</span>
                        </div>
                          {p.status !== 'paid' && !p.sent_by_couple && (
                            reporting === p.id ? (
                              <div className="mt-3 rounded-xl bg-paper p-3">
                                <p className="mb-2 text-xs text-ink-soft">How did you send it?</p>
                                <div className="mb-2 flex flex-wrap gap-2">
                                  {METHODS.map((m) => (
                                    <button key={m} type="button" onClick={() => setHowPaid(m)}
                                      className={`rounded-full border px-3 py-1 text-xs ${howPaid === m ? 'border-twilight bg-twilight text-white' : 'border-line text-ink'}`}>{m}</button>
                                  ))}
                                </div>
                                <input value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="Add a note (optional)"
                                  className="mb-2 w-full rounded-lg border border-line bg-card px-3 py-2 text-xs text-ink focus:border-twilight focus:outline-none" />
                                <div className="flex gap-2">
                                  <button type="button" disabled={busy} onClick={() => reportPayment(p.id)} className="rounded-full bg-twilight px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Let my photographer know</button>
                                  <button type="button" onClick={() => setReporting(null)} className="rounded-full border border-line px-4 py-1.5 text-xs text-ink">Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <button type="button" onClick={() => { setReporting(p.id); setHowPaid(''); setPayNote('') }} className="mt-2 text-xs font-semibold text-twilight hover:underline">I have sent this payment</button>
                            )
                          )}
                          </li>
                      ))}
                    </ul>
                    <div className="mt-3 flex justify-between border-t border-line pt-3 text-sm">
                      <span className="text-ink-soft">Paid {money(paidTotal)}</span>
                      <span className="font-semibold text-ink">{remaining > 0 ? `${money(remaining)} remaining` : 'Paid in full'}</span>
                    </div>
                  </>
                )}
              </section>

              {mine?.has_timeline && (
                <section className={card}>
                  <p className="mb-2 font-fraunces text-xl font-semibold text-ink">Timeline</p>
                  {!timelineShared ? (
                    <p className="text-sm text-ink-soft">Your photographer will share your session timeline here.</p>
                  ) : (
                    <>
                      <div className="divide-y divide-line">
                        <Row k="Start time" v={d?.session_start_time} />
                        <Row k="Length" v={d?.session_length_hours ? `${d.session_length_hours} hours` : null} />
                      </div>
                      {approved ? (
                        <p className="mt-3 text-sm text-emerald-700">
                          Approved{d?.timeline_approved_at ? ` on ${new Date(d.timeline_approved_at).toLocaleDateString()}` : ''}.
                        </p>
                      ) : (
                        <button type="button" disabled={busy} onClick={approve} className={`${btnPrimary} mt-4`}>{busy ? 'Approving…' : 'Approve timeline'}</button>
                      )}
                    </>
                  )}
                </section>
              )}

              {shots.length > 0 && (
                <section className={card}>
                  <p className="mb-2 font-fraunces text-xl font-semibold text-ink">Shot list</p>
                  <ul className="divide-y divide-line">
                    {shots.map((s) => (
                      <li key={s.id} className="flex items-center gap-3 py-2.5 text-sm">
                        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] ${s.done ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-line'}`}>{s.done ? '✓' : ''}</span>
                        <span className={s.done ? 'text-ink-soft line-through' : 'text-ink'}>{s.label}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {contacts.length > 0 && (
                <section className={card}>
                  <p className="mb-2 font-fraunces text-xl font-semibold text-ink">Key contacts</p>
                  <ul className="divide-y divide-line">
                    {contacts.map((c) => (
                      <li key={c.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                        <span>
                          <span className="block text-ink">{c.name}</span>
                          {c.role && <span className="block text-xs text-ink-soft">{c.role}</span>}
                        </span>
                        {c.phone && <a href={`tel:${c.phone}`} className="text-twilight hover:underline">{c.phone}</a>}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
