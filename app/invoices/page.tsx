'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { DashboardHeader } from '@/app/components/DashboardHeader'
import { SubTabs } from '@/app/components/SubTabs'

type Pay = { id: string; wedding_id: string; label: string | null; amount: number | null; due_date: string | null; status: string | null; paid_at: string | null; receipt_url: string | null }
type Filter = 'all' | 'outstanding' | 'overdue' | 'paid'

const money = (n: number) => '$' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const fmtDate = (d: string | null) => { if (!d) return 'No date'; const [y, m, day] = d.slice(0, 10).split('-').map(Number); return new Date(y, m - 1, day).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) }

export default function InvoicesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pays, setPays] = useState<Pay[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [filter, setFilter] = useState<Filter>('all')
  const [q, setQ] = useState('')

  useEffect(() => {
    async function load() {
      if (!supabase) { router.push('/login'); return }
      const { data: sess } = await supabase.auth.getSession()
      if (!sess.session) { router.push('/login'); return }
      const { data, error: e } = await supabase.from('weddings').select('id, names')
      if (e) { setError(e.message); setLoading(false); return }
      const nm: Record<string, string> = {}
      for (const r of (data ?? []) as { id: string; names: string | null }[]) nm[r.id] = (r.names ?? '').trim() || 'Unnamed client'
      setNames(nm)
      const ids = Object.keys(nm)
      const all: Pay[] = []
      for (let i = 0; i < ids.length; i += 100) {
        const { data: p } = await supabase.from('payment_schedule').select('id, wedding_id, label, amount, due_date, status, paid_at, receipt_url').in('wedding_id', ids.slice(i, i + 100))
        all.push(...((p ?? []) as Pay[]))
      }
      setPays(all)
      setLoading(false)
    }
    load()
  }, [router])

  const today = todayStr()
  const isPaid = (p: Pay) => p.status === 'paid'
  const isOverdue = (p: Pay) => !isPaid(p) && !!p.due_date && p.due_date.slice(0, 10) < today

  const totals = useMemo(() => {
    let outstanding = 0, overdue = 0, collected = 0, month = 0
    const ym = today.slice(0, 7)
    for (const p of pays) {
      const a = Number(p.amount || 0)
      if (p.status === 'paid') { collected += a; if ((p.paid_at ?? '').slice(0, 7) === ym) month += a }
      else { outstanding += a; if (p.due_date && p.due_date.slice(0, 10) < today) overdue += a }
    }
    return { outstanding, overdue, collected, month }
  }, [pays, today])

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase()
    const list = pays.filter((p) => {
      if (filter === 'outstanding' && isPaid(p)) return false
      if (filter === 'overdue' && !isOverdue(p)) return false
      if (filter === 'paid' && !isPaid(p)) return false
      if (term && !((names[p.wedding_id] ?? '') + ' ' + (p.label ?? '')).toLowerCase().includes(term)) return false
      return true
    })
    const unpaid = list.filter((p) => !isPaid(p)).sort((a, b) => (a.due_date ?? '9999') < (b.due_date ?? '9999') ? -1 : 1)
    const paid = list.filter(isPaid).sort((a, b) => (a.paid_at ?? '') < (b.paid_at ?? '') ? 1 : -1)
    return [...unpaid, ...paid]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pays, names, filter, q, today])

  const tile = 'rounded-2xl border border-line bg-card p-5'
  const label = 'text-[11px] uppercase tracking-[0.12em] text-ink-soft'
  const tabs: { k: Filter; t: string }[] = [{ k: 'all', t: 'All' }, { k: 'outstanding', t: 'Outstanding' }, { k: 'overdue', t: 'Overdue' }, { k: 'paid', t: 'Paid' }]

  return (
    <div className="min-h-screen bg-paper xl:pl-60">
      <DashboardHeader active="invoices" />
      <SubTabs group="money" active="invoices" />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="font-fraunces text-3xl font-semibold text-ink">Invoices</h1>
        <p className="mt-1 text-sm text-ink-soft">Every payment across your sessions in one place.</p>

        {error && <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {loading ? (
          <p className="mt-8 text-sm text-ink-soft">Loading…</p>
        ) : pays.length === 0 ? (
          <section className="mt-8 rounded-2xl border border-line bg-card p-8 text-center">
            <p className="font-fraunces text-lg font-semibold text-ink">No payments yet</p>
            <p className="mt-2 text-sm text-ink-soft">Payments appear here once a session has a payment schedule.</p>
          </section>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className={tile}><p className={label}>Outstanding</p><p className="mt-2 font-fraunces text-xl font-semibold text-ink">{money(totals.outstanding)}</p></div>
              <div className={tile}><p className={label}>Overdue</p><p className={'mt-2 font-fraunces text-xl font-semibold ' + (totals.overdue > 0 ? 'text-twilight' : 'text-ink')}>{money(totals.overdue)}</p></div>
              <div className={tile}><p className={label}>This month</p><p className="mt-2 font-fraunces text-xl font-semibold text-ink">{money(totals.month)}</p></div>
              <div className={tile}><p className={label}>Collected</p><p className="mt-2 font-fraunces text-xl font-semibold text-ink">{money(totals.collected)}</p></div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="flex rounded-xl border border-line bg-white p-1">
                {tabs.map((t) => (
                  <button key={t.k} type="button" onClick={() => setFilter(t.k)} className={'rounded-lg px-3 py-1.5 text-sm transition ' + (filter === t.k ? 'bg-twilight text-white' : 'text-ink-soft hover:text-ink')}>{t.t}</button>
                ))}
              </div>
              <input className="min-w-[12rem] flex-1 rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none focus:border-twilight" placeholder="Search by client or payment" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>

            <div className="mt-5 space-y-2">
              {shown.length === 0 && <p className="text-sm text-ink-soft">Nothing matches.</p>}
              {shown.map((p) => {
                const paid = isPaid(p)
                const late = isOverdue(p)
                return (
                  <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-card px-5 py-4">
                    <div className="min-w-0">
                      <Link href={`/sessions/${p.wedding_id}`} className="block truncate text-sm font-medium text-ink hover:underline">{names[p.wedding_id] ?? 'Client'}</Link>
                      <p className="text-xs text-ink-soft">{p.label || 'Payment'} · {paid ? 'Paid ' + fmtDate(p.paid_at) : 'Due ' + fmtDate(p.due_date)}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      {p.receipt_url && <a href={p.receipt_url} target="_blank" rel="noreferrer" className="text-xs text-ink-soft underline hover:text-ink">Receipt</a>}
                      <span className={'rounded-full px-2.5 py-1 text-[11px] font-medium ' + (paid ? 'bg-blush-wash text-ink' : late ? 'bg-twilight text-white' : 'border border-line text-ink-soft')}>{paid ? 'Paid' : late ? 'Overdue' : 'Upcoming'}</span>
                      <span className="w-24 text-right text-sm font-medium text-ink">{money(Number(p.amount || 0))}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
