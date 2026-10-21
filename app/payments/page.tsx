"use client"

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { DashboardHeader } from '@/app/components/DashboardHeader'

type St = { connected: boolean; ready: boolean; payoutsEnabled?: boolean; dashboardUrl?: string | null }

type Line = {
  id: string; wedding_id: string; label: string | null; amount: number
  due_date: string | null; status: string | null; paid_at: string | null
  method: string | null; sent_by_couple: boolean | null
}
const money = (n: number) => '$' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const dateOnly = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

export default function PaymentsPage() {
  const [st, setSt] = useState<St | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [lines, setLines] = useState<Line[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [filter, setFilter] = useState<'all' | 'unpaid' | 'paid'>('all')

  useEffect(() => {
    async function run() {
      const sb = supabase
      if (!sb) return
      const { data: sess } = await sb.auth.getSession()
      const uid = sess.session?.user.id
      if (!uid) return
      const { data } = await sb
        .from('payment_schedule')
        .select('id, wedding_id, label, amount, due_date, status, paid_at, method, sent_by_couple')
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

  const today = new Date().toISOString().slice(0, 10)
  const unpaid = lines.filter((l) => l.status !== 'paid')
  const collected = lines.filter((l) => l.status === 'paid').reduce((a, l) => a + Number(l.amount || 0), 0)
  const outstanding = unpaid.reduce((a, l) => a + Number(l.amount || 0), 0)
  const overdue = unpaid.filter((l) => l.due_date && l.due_date < today).reduce((a, l) => a + Number(l.amount || 0), 0)
  const shown = lines.filter((l) => filter === 'all' ? true : filter === 'paid' ? l.status === 'paid' : l.status !== 'paid')

  return (
    <div className="min-h-screen bg-paper">
      <DashboardHeader active="payments" />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="font-fraunces text-3xl font-semibold text-ink">Card payments</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Let your clients pay your booking fee and balance by card. The money goes straight to your bank through Stripe. Camrhia never sees your bank details, and clients can still pay you outside the app if they prefer.
        </p>

        <section className="mt-6 rounded-2xl border border-line bg-card p-6">
          {!st && !err && <p className="text-sm text-ink-soft">Checking your setup...</p>}
          {st && st.ready && (
            <>
              <p className="text-sm font-semibold text-emerald-700">Card payments are on</p>
              <p className="mt-1 text-sm text-ink-soft">Clients now see a Pay by card button on their booking fee and balance. You will get a notification when someone pays.</p>
              {st.dashboardUrl && (
                <a href={st.dashboardUrl} target="_blank" rel="noreferrer" className="mt-4 inline-block rounded-full border border-line px-5 py-2 text-sm text-ink">Open my Stripe payouts</a>
              )}
              <p className="mt-4 text-xs text-ink-soft">Stripe takes its standard processing fee (2.9% + 30 cents) from each payment. Camrhia adds nothing on top.</p>
            </>
          )}
          {st && !st.ready && (
            <>
              <p className="text-sm font-semibold text-ink">{st.connected ? 'Finish setting up card payments' : 'Turn on card payments'}</p>
              <p className="mt-1 text-sm text-ink-soft">It takes about five minutes. Stripe will ask for your business details and the bank account to pay you into.</p>
              <button type="button" disabled={busy} onClick={start} className="mt-4 rounded-full bg-ink px-6 py-3 text-sm text-white disabled:opacity-50">
                {busy ? 'Opening Stripe...' : st.connected ? 'Continue setup' : 'Set up card payments'}
              </button>
            </>
          )}
          {err && <p className="mt-3 text-sm text-red-700">{err}</p>}
        </section>

        <section className="mt-6 rounded-2xl border border-line bg-card p-6">
          <p className="font-fraunces text-xl font-semibold text-ink">All payments</p>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-paper p-3"><p className="text-xs text-ink-soft">Collected</p><p className="mt-1 text-lg font-semibold text-emerald-700">{money(collected)}</p></div>
            <div className="rounded-xl bg-paper p-3"><p className="text-xs text-ink-soft">Outstanding</p><p className="mt-1 text-lg font-semibold text-ink">{money(outstanding)}</p></div>
            <div className="rounded-xl bg-paper p-3"><p className="text-xs text-ink-soft">Overdue</p><p className="mt-1 text-lg font-semibold text-red-700">{money(overdue)}</p></div>
          </div>
          <div className="mt-5 flex gap-2">
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
                const isOver = l.status !== 'paid' && !!l.due_date && l.due_date < today
                const note = l.status === 'paid'
                  ? 'Paid' + (l.paid_at ? ' ' + new Date(l.paid_at).toLocaleDateString() : '') + (l.method ? ' · ' + l.method : '')
                  : l.sent_by_couple ? 'Client says they sent it. Confirm in the app.'
                  : isOver ? 'Overdue since ' + dateOnly(l.due_date as string)
                  : l.due_date ? 'Due ' + dateOnly(l.due_date) : 'Unpaid'
                return (
                  <li key={l.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <span className="min-w-0">
                      <Link href={'/sessions/' + l.wedding_id} className="block truncate text-ink hover:underline">{names[l.wedding_id] ?? 'Session'} · {l.label || 'Payment'}</Link>
                      <span className={'block text-xs ' + (isOver ? 'text-red-700' : 'text-ink-soft')}>{note}</span>
                    </span>
                    <span className={l.status === 'paid' ? 'text-emerald-700' : 'text-ink'}>{money(l.amount)}</span>
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
