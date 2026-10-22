'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ClientHeader } from '@/app/components/ClientHeader'

type Portal = { wedding_id: string; session_type: string; studio_name: string | null; display_name: string | null }
type Line = {
  id: string; wedding_id: string; label: string | null; amount: number | null
  due_date: string | null; status: string | null; paid_at: string | null
  method: string | null; receipt_url: string | null
}

const money = (n: number | null | undefined) => '$' + Number(n ?? 0).toFixed(2)
const day = (d: string | null) =>
  d ? new Date(d + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''
const stamp = (d: string | null) =>
  d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''
const typeLabel = (t: string) => t.charAt(0).toUpperCase() + t.slice(1).replace(/_/g, ' ')

export default function MyPaymentsPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [lines, setLines] = useState<Line[]>([])
  const [sessions, setSessions] = useState<Record<string, string>>({})

  useEffect(() => {
    async function load() {
      const sb = supabase
      if (!sb) return
      const { data: sess } = await sb.auth.getSession()
      if (!sess.session) { router.replace('/login?next=/my/payments'); return }
      const { data: list } = await sb.rpc('client_portal_sessions')
      const rows = (list ?? []) as Portal[]
      const names: Record<string, string> = {}
      rows.forEach((r) => {
        names[r.wedding_id] = (r.studio_name || r.display_name || 'Your photographer') + ' · ' + typeLabel(r.session_type)
      })
      setSessions(names)
      const ids = rows.map((r) => r.wedding_id)
      if (ids.length > 0) {
        const { data } = await sb
          .from('payment_schedule')
          .select('id, wedding_id, label, amount, due_date, status, paid_at, method, receipt_url')
          .in('wedding_id', ids)
        setLines(((data ?? []) as Line[]).filter((l) => Number(l.amount ?? 0) > 0))
      }
      setReady(true)
    }
    load()
  }, [router])

  const today = new Date().toISOString().slice(0, 10)
  const paid = lines.filter((l) => l.status === 'paid').sort((a, b) => (b.paid_at ?? '').localeCompare(a.paid_at ?? ''))
  const due = lines.filter((l) => l.status !== 'paid').sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'))
  const paidTotal = paid.reduce((t, l) => t + Number(l.amount ?? 0), 0)
  const dueTotal = due.reduce((t, l) => t + Number(l.amount ?? 0), 0)

  function Row({ l }: { l: Line }) {
    const isPaid = l.status === 'paid'
    const overdue = !isPaid && !!l.due_date && l.due_date < today
    return (
      <li className="flex items-start justify-between gap-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{l.label || 'Payment'}</p>
          <p className="truncate text-xs text-ink-soft">{sessions[l.wedding_id] ?? 'Your session'}</p>
          <p className={`text-xs ${overdue ? 'text-red-700' : 'text-ink-soft'}`}>
            {isPaid
              ? `Paid ${stamp(l.paid_at)}${l.method ? ' · ' + l.method : ''}`
              : `${overdue ? 'Overdue · was due ' : 'Due '}${day(l.due_date)}`}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className={`text-sm ${isPaid ? 'text-emerald-700' : 'text-ink'}`}>{money(l.amount)}</p>
          {isPaid && l.receipt_url ? (
            <a href={l.receipt_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-twilight hover:underline">Receipt</a>
          ) : null}
          {!isPaid ? (
            <Link href={`/my/session/${l.wedding_id}`} className="text-xs font-semibold text-twilight hover:underline">Open session</Link>
          ) : null}
        </div>
      </li>
    )
  }

  return (
    <div className="min-h-screen bg-paper lg:pl-60">
      <ClientHeader active="account" />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <Link href="/my/account" className="text-sm text-ink-soft hover:text-ink">← Account</Link>
        <h1 className="mt-3 font-fraunces text-3xl font-semibold text-ink md:text-4xl">Payments</h1>

        {!ready ? (
          <p className="mt-6 text-sm text-ink-soft">Loading…</p>
        ) : lines.length === 0 ? (
          <p className="mt-6 text-sm text-ink-soft">No payments yet. Once your photographer sets up a payment schedule, it will show up here.</p>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 gap-4 rounded-2xl border border-line bg-card p-5">
              <div>
                <p className="text-xs text-ink-soft">Paid</p>
                <p className="font-fraunces text-2xl font-semibold text-ink">{money(paidTotal)}</p>
              </div>
              <div>
                <p className="text-xs text-ink-soft">Still due</p>
                <p className="font-fraunces text-2xl font-semibold text-ink">{money(dueTotal)}</p>
              </div>
            </div>

            {due.length > 0 && (
              <section className="mt-6 rounded-2xl border border-line bg-card px-5 py-3">
                <p className="pt-2 text-xs uppercase tracking-wider text-ink-soft">Due</p>
                <ul className="divide-y divide-line">{due.map((l) => <Row key={l.id} l={l} />)}</ul>
              </section>
            )}

            {paid.length > 0 && (
              <section className="mt-6 rounded-2xl border border-line bg-card px-5 py-3">
                <p className="pt-2 text-xs uppercase tracking-wider text-ink-soft">Paid</p>
                <ul className="divide-y divide-line">{paid.map((l) => <Row key={l.id} l={l} />)}</ul>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}
