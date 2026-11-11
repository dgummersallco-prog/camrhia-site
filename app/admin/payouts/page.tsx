'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin'

type Led = { id: string; affiliate_id: string; amount: number | string; period: string | null; kind: string | null }
type Aff = { id: string; name: string | null; email: string | null; payout_method: string | null; payout_email: string | null }
type Group = {
  id: string
  name: string
  email: string | null
  method: string | null
  handle: string | null
  w9: 'verified' | 'uploaded' | 'none'
  total: number
  count: number
  first: string | null
  last: string | null
  ids: string[]
}

const usd = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

export default function AdminPayoutsPage() {
  const router = useRouter()
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!supabase) { router.replace('/admin/login'); return }
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/admin/login'); return }
    setLoading(true)
    setError(null)
    const [led, aff, dc] = await Promise.all([
      supabase.from('commission_ledger').select('id, affiliate_id, amount, period, kind').eq('paid_out', false),
      supabase.from('affiliates').select('id, name, email, payout_method, payout_email'),
      supabase.from('affiliate_tax_docs').select('affiliate_id, verified_at'),
    ])
    if (led.error) { setError(led.error.message); setLoading(false); return }
    const affMap = new Map<string, Aff>()
    for (const a of (aff.data ?? []) as Aff[]) affMap.set(a.id, a)
    const docMap = new Map<string, boolean>()
    for (const d of (dc.data ?? []) as { affiliate_id: string; verified_at: string | null }[]) docMap.set(d.affiliate_id, !!d.verified_at)
    const by = new Map<string, Group>()
    for (const r of (led.data ?? []) as Led[]) {
      const a = affMap.get(r.affiliate_id)
      let g = by.get(r.affiliate_id)
      if (!g) {
        g = {
          id: r.affiliate_id,
          name: a?.name || a?.email || 'Unknown',
          email: a?.email ?? null,
          method: a?.payout_method ?? null,
          handle: a?.payout_email ?? null,
          w9: docMap.has(r.affiliate_id) ? (docMap.get(r.affiliate_id) ? 'verified' : 'uploaded') : 'none',
          total: 0, count: 0, first: null, last: null, ids: [],
        }
        by.set(r.affiliate_id, g)
      }
      g.total += Number(r.amount)
      g.count += 1
      g.ids.push(r.id)
      if (r.period && (!g.first || r.period < g.first)) g.first = r.period
      if (r.period && (!g.last || r.period > g.last)) g.last = r.period
    }
    const list = Array.from(by.values()).map((g) => ({ ...g, total: Math.round(g.total * 100) / 100 }))
    list.sort((x, y) => y.total - x.total)
    setGroups(list)
    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])

  async function markPaid(g: Group) {
    if (!supabase) return
    const warn = g.w9 !== 'verified' ? '\n\nWarning: their W-9 is not verified yet.' : ''
    if (!window.confirm(`Mark ${usd(g.total)} as paid to ${g.name}?\n\nOnly do this after you have sent the money.${warn}`)) return
    setBusy(g.id)
    setError(null)
    const { data, error: e } = await supabase
      .from('commission_ledger')
      .update({ paid_out: true, paid_out_at: new Date().toISOString() })
      .in('id', g.ids)
      .select('id')
    setBusy(null)
    if (e) { setError(e.message); return }
    if ((data ?? []).length !== g.ids.length) { setError('Some rows were not updated. Check the update permission.') }
    await load()
  }

  const owed = Math.round(groups.reduce((s, g) => s + g.total, 0) * 100) / 100

  return (
    <div className="min-h-screen bg-paper">
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="font-fraunces text-3xl text-ink">Payouts</h1>
        <p className="mt-1 text-sm text-ink-soft">What you owe each affiliate. Pay them from your bank, then tap Mark paid.</p>

        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
        {loading ? <p className="mt-6 text-sm text-ink-soft animate-pulse">Loading…</p> : null}

        {!loading ? (
          <p className="mt-6 text-sm text-ink-soft">
            Total owed: <span className="font-fraunces text-2xl text-ink">{usd(owed)}</span>
          </p>
        ) : null}

        {!loading && groups.length === 0 ? <p className="mt-6 text-sm text-ink-soft">Nothing owed right now.</p> : null}

        <div className="mt-6 space-y-3">
          {groups.map((g) => (
            <div key={g.id} className="flex flex-col gap-4 rounded-2xl border border-line bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-ink">{g.name}</p>
                {g.email ? <p className="text-sm text-ink-soft">{g.email}</p> : null}
                <p className="mt-1 text-sm text-ink">
                  {g.method ? `Pay via ${g.method}${g.handle ? ' · ' + g.handle : ''}` : 'No payout method set'}
                </p>
                <p className="mt-1 text-xs text-ink-soft">
                  W-9: {g.w9 === 'verified' ? 'verified' : g.w9 === 'uploaded' ? 'uploaded, not verified' : 'not received'} · {g.count} commission{g.count === 1 ? '' : 's'}
                  {g.first ? ` · ${g.first}${g.last && g.last !== g.first ? ' to ' + g.last : ''}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <p className="font-fraunces text-3xl text-ink">{usd(g.total)}</p>
                <button
                  onClick={() => markPaid(g)}
                  disabled={busy === g.id}
                  className="rounded-full px-5 py-2 text-sm font-medium text-white disabled:opacity-60"
                  style={{ backgroundColor: '#8C6B3F' }}
                >
                  {busy === g.id ? 'Saving…' : 'Mark paid'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
