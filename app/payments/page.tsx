"use client"

import { Select } from '@/app/components/Select'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { DashboardHeader } from '@/app/components/DashboardHeader'
import Wordmark from '@/app/components/Wordmark'

type St = {
  connected: boolean; ready: boolean; enabled?: boolean; payoutsEnabled?: boolean
  dashboardUrl?: string | null; bank?: { name: string | null; last4: string | null } | null
}

type Line = {
  id: string; wedding_id: string; label: string | null; amount: number
  due_date: string | null; status: string | null; paid_at: string | null
  method: string | null; sent_by_couple: boolean | null
  stripe_session_id: string | null; receipt_url: string | null
}

const money = (n: number) => '$' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const dateOnly = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
const card = 'rounded-2xl border border-line bg-card p-5'
const COLORS = ['#5B6B8C', '#B08D57', '#7C8B6F', '#A9545F', '#8A5A83', '#2A1F24']
const isCard = (l: Line) => !!l.stripe_session_id || /card|stripe/i.test(l.method || '')
const methodOf = (l: Line) => {
  if (isCard(l)) return 'Card'
  const m = (l.method || '').trim().toLowerCase()
  return m ? m.charAt(0).toUpperCase() + m.slice(1) : 'Other'
}

type PayMethod = { type: string; handle: string; note: string }
const METHOD_TYPES = [
  { label: 'Venmo', ph: '@yourhandle' },
  { label: 'Zelle', ph: 'Email or phone number' },
  { label: 'Cash App', ph: '$cashtag' },
  { label: 'PayPal', ph: 'PayPal email or @username' },
  { label: 'Check', ph: 'Make checks payable to…' },
  { label: 'Cash', ph: 'Any cash instructions (optional)' },
  { label: 'Bank transfer', ph: 'Bank name, routing info, or instructions' },
  { label: 'Other', ph: 'Details or handle' },
]
const tidyBank = (n: string) => {
  const t = n === n.toUpperCase() ? n.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : n
  return t.replace(/\bJpmorgan\b/, 'JPMorgan').replace(/\bNa\b/, 'NA')
}

export default function PaymentsPage() {
  const [st, setSt] = useState<St | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [lines, setLines] = useState<Line[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [filter, setFilter] = useState<'all' | 'unpaid' | 'paid'>('all')
  const [q, setQ] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [payMethods, setPayMethods] = useState<PayMethod[]>([])
  const [mType, setMType] = useState('Venmo')
  const [mHandle, setMHandle] = useState('')
  const [mNote, setMNote] = useState('')
  const [mSaving, setMSaving] = useState(false)

  useEffect(() => {
    async function run() {
      const sb = supabase
      if (!sb) return
      const { data: sess } = await sb.auth.getSession()
      const uid = sess.session?.user.id
      if (!uid) return
      setUserId(uid)
      const { data: pr } = await sb.from('profiles').select('payment_methods').eq('id', uid).maybeSingle()
      const raw = (pr as any)?.payment_methods
      setPayMethods(Array.isArray(raw) ? raw : [])
      const { data } = await sb
        .from('payment_schedule')
        .select('id, wedding_id, label, amount, due_date, status, paid_at, method, sent_by_couple, stripe_session_id, receipt_url')
        .eq('owner_id', uid)
        .order('due_date', { ascending: true })
      const rows = (data ?? []) as Line[]
      setLines(rows)
      const ids = Array.from(new Set(rows.map((r) => r.wedding_id)))
      if (ids.length) {
        const { data: ws } = await sb.from('weddings').select('id, names').in('id', ids)
        const m: Record<string, string> = {}
        ;(ws ?? []).forEach((w: any) => { m[w.id] = w.names || 'Session' })
        setNames(m)
      }
    }
    run()
  }, [])

  const token = useCallback(async () => {
    if (!supabase) return null
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
  }, [])

  const load = useCallback(async () => {
    const t = await token()
    if (!t) { setErr('Please sign in again.'); return }
    const res = await fetch('/api/connect/status', { method: 'POST', headers: { Authorization: 'Bearer ' + t } })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) { setErr(j.error || 'Could not check your payment setup.'); return }
    setSt(j as St)
  }, [token])

  useEffect(() => { load() }, [load])

  async function start() {
    setBusy(true)
    setErr(null)
    const t = await token()
    if (!t) { setBusy(false); setErr('Please sign in again.'); return }
    const res = await fetch('/api/connect/onboard', { method: 'POST', headers: { Authorization: 'Bearer ' + t } })
    const j = await res.json().catch(() => ({}))
    if (!res.ok || !j.url) { setBusy(false); setErr(j.error || 'Could not start payment setup.'); return }
    window.location.href = j.url
  }

  async function saveMethods(next: PayMethod[]) {
    if (!supabase || !userId) return
    setMSaving(true)
    const { error } = await supabase.from('profiles').update({ payment_methods: next }).eq('id', userId)
    setMSaving(false)
    if (error) { setErr(error.message); return }
    setErr(null)
    setPayMethods(next)
  }
  function addMethod() {
    const h = mHandle.trim()
    if (!h && mType !== 'Cash') return
    saveMethods([...payMethods, { type: mType, handle: h, note: mNote.trim() }])
    setMHandle('')
    setMNote('')
  }

  const today = new Date().toISOString().slice(0, 10)
  const paidLines = lines.filter((l) => l.status === 'paid')
  const unpaid = lines.filter((l) => l.status !== 'paid')
  const collected = paidLines.reduce((a, l) => a + Number(l.amount || 0), 0)
  const outstanding = unpaid.reduce((a, l) => a + Number(l.amount || 0), 0)
  const overdue = unpaid.filter((l) => l.due_date && l.due_date < today).reduce((a, l) => a + Number(l.amount || 0), 0)
  const paidSessions = new Set(paidLines.map((l) => l.wedding_id)).size
  const avg = paidSessions > 0 ? collected / paidSessions : 0

  const byMethod = new Map<string, number>()
  paidLines.forEach((l) => { const k = methodOf(l); byMethod.set(k, (byMethod.get(k) ?? 0) + Number(l.amount || 0)) })
  const methods = Array.from(byMethod.entries()).sort((a, b) => b[1] - a[1])
  const cardLines = paidLines.filter(isCard)
  const cardTotal = cardLines.reduce((a, l) => a + Number(l.amount || 0), 0)
  const cardFees = cardLines.reduce((a, l) => a + Math.round((Number(l.amount || 0) * 0.029 + 0.3) * 100) / 100, 0)

  const needle = q.trim().toLowerCase()
  const ordered = [
    ...[...unpaid].sort((a, b) => (a.due_date ?? '9999') < (b.due_date ?? '9999') ? -1 : 1),
    ...[...paidLines].sort((a, b) => ((a.paid_at ?? '') < (b.paid_at ?? '') ? 1 : -1)),
  ]
  const shown = ordered.filter((l) => {
    if (filter === 'paid' && l.status !== 'paid') return false
    if (filter === 'unpaid' && l.status === 'paid') return false
    if (needle && !(`${names[l.wedding_id] ?? ''} ${l.label ?? ''}`.toLowerCase().includes(needle))) return false
    return true
  })

  const stat = (label: string, value: string, color?: string) => (
    <div className={card}>
      <p className="text-xs uppercase tracking-wider text-ink-soft">{label}</p>
      <p className={`mt-1 font-fraunces text-2xl font-semibold ${color ?? 'text-ink'}`}>{value}</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-paper xl:pl-60">
      <DashboardHeader active="payments" />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-brass">Payments</p>
        <h1 className="font-fraunces text-3xl font-semibold text-ink md:text-4xl">Payments</h1>
        <p className="mt-2 text-sm text-ink-soft">Everything your clients owe you and everything you have collected, in one place.</p>

        <section className={`${card} mt-8`}>
          <p className="font-fraunces text-xl font-semibold text-ink">How you get paid</p>
          {!st && !err && <p className="mt-3 text-sm text-ink-soft">Checking your setup...</p>}

          {st && st.ready && (
            <>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                  <span className="font-semibold text-emerald-700">Card payments on</span>
                </span>
                <span className="text-ink-soft">·</span>
                <span className="text-ink">
                  Camrhia <span className="text-ink-soft">→</span> Stripe <span className="text-ink-soft">→</span>{' '}
                  {st.bank?.name ? tidyBank(st.bank.name) : 'your bank'}{st.bank?.last4 ? ` ••${st.bank.last4}` : ''}
                </span>
                {st.dashboardUrl && (
                  <a href={st.dashboardUrl} target="_blank" rel="noreferrer" className="ml-auto rounded-full border border-line px-4 py-1.5 text-xs text-ink hover:bg-paper-deep">Open Stripe payouts</a>
                )}
              </div>
              <p className="mt-2 text-xs text-ink-soft">Clients pay by card on their booking fee and balance. Stripe takes 2.9% + 30 cents per card payment. Camrhia adds nothing on top.</p>
            </>
          )}

          {st && !st.ready && st.enabled === false && (
            <>
              <p className="mt-3 text-sm font-semibold text-ink">Card payments are being turned on soon</p>
              <p className="mt-1 text-sm text-ink-soft">You will be able to connect your bank here, and your clients will be able to pay you by card. Until then, clients can keep paying you directly.</p>
            </>
          )}

          {st && !st.ready && st.enabled !== false && (
            <>
              <p className="mt-3 text-sm font-semibold text-ink">{st.connected ? 'Finish setting up card payments' : 'Turn on card payments'}</p>
              <p className="mt-1 text-sm text-ink-soft">It takes about five minutes. Stripe will ask for your business details and the bank account to pay you into. The money goes straight to your bank through Stripe. Camrhia never sees your bank details, and clients can still pay you outside the app if they prefer.</p>
              <button type="button" disabled={busy} onClick={start} className="mt-4 rounded-full bg-twilight px-6 py-3 text-sm font-medium text-white disabled:opacity-50">
                {busy ? 'Opening Stripe...' : st.connected ? 'Continue setup' : 'Set up card payments'}
              </button>
            </>
          )}
          {err && <p className="mt-3 text-sm text-red-700">{err}</p>}

          <div className="mt-6 border-t border-line pt-6">
          <p className="font-fraunces text-lg font-semibold text-ink">Other ways to get paid</p>
          <p className="mt-1 text-sm text-ink-soft">Add Venmo, Zelle, PayPal and more. Your clients see these in the Camrhia app next to Pay by card.</p>
          {payMethods.length > 0 && (
            <ul className="mt-4 divide-y divide-line">
              {payMethods.map((m, i) => (
                <li key={i} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                  <span className="w-28 shrink-0 rounded-full bg-paper px-3 py-1 text-center text-xs font-medium text-ink">{m.type}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-ink">{m.handle || '—'}</span>
                    {m.note && <span className="block truncate text-xs text-ink-soft">{m.note}</span>}
                  </span>
                  <button type="button" disabled={mSaving} onClick={() => saveMethods(payMethods.filter((_, x) => x !== i))} className="shrink-0 text-xs text-ink-soft hover:text-red-700">Remove</button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 grid gap-2 sm:grid-cols-[150px_1fr_auto]">
            <Select value={mType} onChange={(e) => setMType(e.target.value)} className="rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink">
              {METHOD_TYPES.map((t) => <option key={t.label} value={t.label}>{t.label}</option>)}
            </Select>
            <input value={mHandle} onChange={(e) => setMHandle(e.target.value)} placeholder={METHOD_TYPES.find((t) => t.label === mType)?.ph}
              className="min-w-0 rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-twilight focus:outline-none focus:ring-2 focus:ring-twilight/25" />
            <button type="button" disabled={mSaving || (!mHandle.trim() && mType !== 'Cash')} onClick={addMethod} className="rounded-full bg-twilight px-5 py-2 text-sm font-medium text-white disabled:opacity-50">{mSaving ? 'Saving…' : 'Add'}</button>
          </div>
          <input value={mNote} onChange={(e) => setMNote(e.target.value)} placeholder="Note for clients (optional)"
            className="mt-2 w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-twilight focus:outline-none focus:ring-2 focus:ring-twilight/25" />
          </div>
        </section>

        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
          {stat('Collected', money(collected), 'text-emerald-700')}
          {stat('Outstanding', money(outstanding))}
          {stat('Overdue', money(overdue), overdue > 0 ? 'text-red-700' : undefined)}
          {stat('Paid sessions', String(paidSessions))}
          {stat('Average per session', paidSessions > 0 ? money(avg) : '—')}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          <section className={card}>
            <p className="font-fraunces text-xl font-semibold text-ink">How you were paid</p>
            {methods.length === 0 ? (
              <p className="mt-3 text-sm text-ink-soft">Nothing collected yet. Once a payment is marked paid, you will see how it came in.</p>
            ) : (
              <>
                <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-line">
                  {methods.map(([m, amt], i) => (
                    <div key={m} style={{ width: `${(amt / collected) * 100}%`, background: COLORS[i % COLORS.length] }} />
                  ))}
                </div>
                <ul className="mt-4 space-y-2">
                  {methods.map(([m, amt], i) => (
                    <li key={m} className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex items-center gap-2 text-ink">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                        {m}
                      </span>
                      <span className="text-ink-soft">{money(amt)} <span className="ml-1 text-xs">{Math.round((amt / collected) * 100)}%</span></span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <section className={card}>
            <p className="font-fraunces text-xl font-semibold text-ink">Card payments</p>
            {cardTotal === 0 ? (
              <p className="mt-3 text-sm text-ink-soft">No card payments yet.</p>
            ) : (
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-ink-soft">Paid by card</dt><dd className="text-ink">{money(cardTotal)}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-soft">Stripe fees (est.)</dt><dd className="text-ink">−{money(cardFees)}</dd></div>
                <div className="flex justify-between border-t border-line pt-2"><dt className="font-medium text-ink">To your bank (est.)</dt><dd className="font-medium text-emerald-700">{money(cardTotal - cardFees)}</dd></div>
                <p className="pt-1 text-xs text-ink-soft">Estimates based on Stripe&apos;s standard 2.9% + 30 cents. Your Stripe payouts show exact amounts.</p>
              </dl>
            )}
          </section>
        </div>

        <section className={`${card} mt-6`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-fraunces text-xl font-semibold text-ink">All payments</p>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by client or payment"
              className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-twilight focus:outline-none focus:ring-2 focus:ring-twilight/25 sm:w-64"
            />
          </div>
          <div className="mt-4 flex gap-2">
            {(['all', 'unpaid', 'paid'] as const).map((f) => (
              <button key={f} type="button" onClick={() => setFilter(f)}
                className={'rounded-full border px-4 py-1.5 text-xs ' + (filter === f ? 'border-twilight bg-twilight text-white' : 'border-line text-ink')}>
                {f === 'all' ? 'All' : f === 'unpaid' ? 'Unpaid' : 'Paid'}
              </button>
            ))}
          </div>
          {shown.length === 0 ? (
            <p className="mt-4 text-sm text-ink-soft">No payments here yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {shown.map((l) => {
                const paid = l.status === 'paid'
                const isOver = !paid && !!l.due_date && l.due_date < today
                const pill = paid
                  ? { t: 'Paid', c: 'bg-emerald-50 text-emerald-700' }
                  : l.sent_by_couple ? { t: 'Confirm in app', c: 'bg-amber-50 text-amber-700' }
                  : isOver ? { t: 'Overdue', c: 'bg-red-50 text-red-700' }
                  : { t: 'Due', c: 'bg-paper text-ink-soft' }
                const note = paid
                  ? (l.paid_at ? 'Paid ' + new Date(l.paid_at).toLocaleDateString() : 'Paid') + ' · ' + methodOf(l)
                  : l.sent_by_couple ? 'Client says they sent it'
                  : l.due_date ? (isOver ? 'Overdue since ' : 'Due ') + dateOnly(l.due_date) : 'No due date'
                return (
                  <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                    <span className="min-w-0 flex-1">
                      <Link href={'/sessions/' + l.wedding_id + '#payments'} className="block truncate text-ink hover:underline">{names[l.wedding_id] ?? 'Session'} · {l.label || 'Payment'}</Link>
                      <span className={'block text-xs ' + (isOver ? 'text-red-700' : 'text-ink-soft')}>{note}</span>
                    </span>
                    {paid && l.receipt_url && (
                      <a href={l.receipt_url} target="_blank" rel="noreferrer" className="shrink-0 text-xs text-twilight hover:underline">View receipt</a>
                    )}
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${pill.c}`}>{pill.t}</span>
                    <span className={'w-24 shrink-0 text-right ' + (paid ? 'text-emerald-700' : 'text-ink')}>{money(l.amount)}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}
