'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { DashboardHeader } from '@/app/components/DashboardHeader'
import { SubTabs } from '@/app/components/SubTabs'

type S = { id: string; names: string | null; session_type: string | null }
type Pay = { wedding_id: string; amount: number | null; status: string | null; paid_at: string | null }

const money = (n: number) => '$' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const moneyShort = (n: number) => '$' + Math.round(n).toLocaleString()
const typeLabel = (t: string | null) => (t ? t.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()) : 'Session')

export default function InsightsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sessions, setSessions] = useState<S[]>([])
  const [pays, setPays] = useState<Pay[]>([])

  useEffect(() => {
    async function load() {
      if (!supabase) { router.push('/login'); return }
      const { data: sess } = await supabase.auth.getSession()
      if (!sess.session) { router.push('/login'); return }
      const { data, error: e } = await supabase.from('weddings').select('id, names, session_type')
      if (e) { setError(e.message); setLoading(false); return }
      const rows = (data ?? []) as S[]
      setSessions(rows)
      const ids = rows.map((r) => r.id)
      const all: Pay[] = []
      for (let i = 0; i < ids.length; i += 100) {
        const { data: p } = await supabase.from('payment_schedule').select('wedding_id, amount, status, paid_at').in('wedding_id', ids.slice(i, i + 100))
        all.push(...((p ?? []) as Pay[]))
      }
      setPays(all)
      setLoading(false)
    }
    load()
  }, [router])

  const stats = useMemo(() => {
    const now = new Date()
    const months: { key: string; label: string; total: number }[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleDateString(undefined, { month: 'short' }), total: 0 })
    }
    let collected = 0, outstanding = 0
    const paidBySession: Record<string, number> = {}
    for (const p of pays) {
      const a = Number(p.amount || 0)
      if (p.status === 'paid') {
        collected += a
        paidBySession[p.wedding_id] = (paidBySession[p.wedding_id] ?? 0) + a
        const m = months.find((x) => x.key === (p.paid_at ?? '').slice(0, 7))
        if (m) m.total += a
      } else outstanding += a
    }
    const types: Record<string, number> = {}
    const clients: Record<string, { name: string; paid: number }> = {}
    for (const s of sessions) {
      const t = typeLabel(s.session_type)
      types[t] = (types[t] ?? 0) + 1
      const name = (s.names ?? '').trim() || 'Unnamed client'
      const key = name.toLowerCase()
      const c = (clients[key] ??= { name, paid: 0 })
      c.paid += paidBySession[s.id] ?? 0
    }
    const paidSessions = Object.keys(paidBySession).length
    return {
      months,
      collected,
      outstanding,
      avg: paidSessions ? collected / paidSessions : 0,
      last12: months.reduce((t, m) => t + m.total, 0),
      types: Object.entries(types).sort((a, b) => b[1] - a[1]),
      top: Object.values(clients).filter((c) => c.paid > 0).sort((a, b) => b.paid - a.paid).slice(0, 5),
    }
  }, [sessions, pays])

  const max = Math.max(1, ...stats.months.map((m) => m.total))
  const maxType = Math.max(1, ...stats.types.map((t) => t[1]))
  const tile = 'rounded-2xl border border-line bg-card p-5'
  const label = 'text-[11px] uppercase tracking-[0.12em] text-ink-soft'

  return (
    <div className="min-h-screen bg-paper xl:pl-60">
      <DashboardHeader active="insights" />
      <SubTabs group="money" active="insights" />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="font-fraunces text-3xl font-semibold text-ink">Insights</h1>
        <p className="mt-1 text-sm text-ink-soft">How your business is doing.</p>

        {error && <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {loading ? (
          <p className="mt-8 text-sm text-ink-soft">Loading…</p>
        ) : sessions.length === 0 ? (
          <section className="mt-8 rounded-2xl border border-line bg-card p-8 text-center">
            <p className="font-fraunces text-lg font-semibold text-ink">Nothing to show yet</p>
            <p className="mt-2 text-sm text-ink-soft">Insights appear as you add sessions and collect payments.</p>
          </section>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className={tile}><p className={label}>Collected, 12 months</p><p className="mt-2 font-fraunces text-xl font-semibold text-ink">{money(stats.last12)}</p></div>
              <div className={tile}><p className={label}>Collected, all time</p><p className="mt-2 font-fraunces text-xl font-semibold text-ink">{money(stats.collected)}</p></div>
              <div className={tile}><p className={label}>Avg per session</p><p className="mt-2 font-fraunces text-xl font-semibold text-ink">{money(stats.avg)}</p></div>
              <div className={tile}><p className={label}>Outstanding</p><p className="mt-2 font-fraunces text-xl font-semibold text-ink">{money(stats.outstanding)}</p></div>
            </div>

            <section className="mt-6 rounded-2xl border border-line bg-card p-6">
              <h2 className="font-fraunces text-lg font-semibold text-ink">Money collected by month</h2>
              <div className="mt-6 flex h-48 items-end gap-2">
                {stats.months.map((m) => (
                  <div key={m.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={m.label + ': ' + money(m.total)}>
                    <span className="text-[10px] text-ink-soft">{m.total > 0 ? moneyShort(m.total) : ''}</span>
                    <div className="w-full rounded-t-md bg-twilight" style={{ height: Math.max(m.total > 0 ? 4 : 0, (m.total / max) * 100) + '%', opacity: m.total > 0 ? 1 : 0.15 }} />
                  </div>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                {stats.months.map((m) => <span key={m.key} className="flex-1 text-center text-[10px] text-ink-soft">{m.label}</span>)}
              </div>
            </section>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <section className="rounded-2xl border border-line bg-card p-6">
                <h2 className="font-fraunces text-lg font-semibold text-ink">Sessions by type</h2>
                <div className="mt-4 space-y-3">
                  {stats.types.map(([t, n]) => (
                    <div key={t}>
                      <div className="flex justify-between text-sm"><span className="text-ink">{t}</span><span className="text-ink-soft">{n}</span></div>
                      <div className="mt-1 h-2 rounded-full bg-blush-wash"><div className="h-2 rounded-full bg-twilight" style={{ width: (n / maxType) * 100 + '%' }} /></div>
                    </div>
                  ))}
                </div>
              </section>
              <section className="rounded-2xl border border-line bg-card p-6">
                <h2 className="font-fraunces text-lg font-semibold text-ink">Top clients</h2>
                {stats.top.length === 0 ? (
                  <p className="mt-4 text-sm text-ink-soft">Paid clients show up here.</p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {stats.top.map((c, i) => (
                      <div key={c.name + i} className="flex items-center justify-between gap-3 text-sm">
                        <span className="truncate text-ink">{i + 1}. {c.name}</span>
                        <span className="font-medium text-ink">{money(c.paid)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
