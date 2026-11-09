'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AffiliateShell from '@/app/affiliate/components/AffiliateShell'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

type Row = {
  id: string
  name: string | null
  email: string | null
  approved: boolean
  is_master: boolean
  active_referrals: number
  total_referrals: number
  created_at: string
}

const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
const LINK = 'camrhia.com/affiliate/signup'

function HomeBody() {
  const [rows, setRows] = useState<Row[]>([])
  const [month, setMonth] = useState(0)
  const [lifetime, setLifetime] = useState(0)
  const [pending, setPending] = useState(0)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      if (!supabaseAdmin) return
      const { data: { session } } = await supabaseAdmin.auth.getSession()
      if (!session) return
      try {
        const res = await fetch('/api/admin/affiliates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ action: 'list' }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? 'Failed to load')
        setRows((json.rows ?? []) as Row[])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load')
      }
      const { data: led } = await supabaseAdmin.from('commission_ledger').select('amount, period, paid_out')
      const period = new Date().toISOString().slice(0, 7)
      let m = 0, l = 0, p = 0
      for (const r of (led ?? []) as { amount: number | string; period: string | null; paid_out: boolean }[]) {
        const amt = Number(r.amount)
        l += amt
        if (!r.paid_out) p += amt
        if (r.period && String(r.period).slice(0, 7) === period) m += amt
      }
      setMonth(m)
      setLifetime(l)
      setPending(p)
      setLoading(false)
    })()
  }, [])

  const active = rows.reduce((s, r) => s + (r.active_referrals ?? 0), 0)
  const total = rows.reduce((s, r) => s + (r.total_referrals ?? 0), 0)

  async function copyLink() {
    await navigator.clipboard.writeText(`https://${LINK}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Active referrals', value: String(active) },
          { label: "This month's commissions", value: fmt(month) },
          { label: 'Lifetime commissions', value: fmt(lifetime) },
          { label: 'Total referred', value: String(total) },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-line bg-card p-5">
            <p className="text-xs text-ink-soft">{s.label}</p>
            <p className="mt-1 font-fraunces text-3xl font-semibold text-ink">{loading ? '…' : s.value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl bg-ink p-6 sm:p-8">
        <p className="font-mono text-xs uppercase tracking-widest text-white/50">Affiliate signup link</p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <span className="min-w-0 flex-1 truncate rounded-xl bg-white/10 px-4 py-3 font-mono text-sm text-white">{LINK}</span>
          <button onClick={copyLink} className="shrink-0 rounded-full border border-white/25 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10">{copied ? 'Copied!' : 'Copy link'}</button>
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-fraunces text-xl font-semibold text-ink">Affiliates</h2>
        <div className="overflow-hidden rounded-2xl border border-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-paper-deep">
                <th className="px-5 py-3 text-left font-medium text-ink-soft">Affiliate</th>
                <th className="px-5 py-3 text-left font-medium text-ink-soft">Joined</th>
                <th className="px-5 py-3 text-left font-medium text-ink-soft">Status</th>
                <th className="px-5 py-3 text-right font-medium text-ink-soft">Active / total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-card">
              {rows.length === 0 ? (
                <tr><td colSpan={4} className="px-5 py-10 text-center text-ink-soft">No affiliates yet.</td></tr>
              ) : null}
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-5 py-3.5 font-medium text-ink">{r.name || r.email || 'Unnamed'}{r.is_master ? ' · Master' : ''}</td>
                  <td className="px-5 py-3.5 font-mono text-xs text-ink-soft">{fmtDate(r.created_at)}</td>
                  <td className="px-5 py-3.5 text-ink-soft">{r.approved ? 'Approved' : 'Pending'}</td>
                  <td className="px-5 py-3.5 text-right font-mono text-xs text-ink">{r.active_referrals} / {r.total_referrals}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="mb-1 font-fraunces text-xl font-semibold text-ink">Payouts</h2>
            <p className="mb-1 text-sm text-ink-soft">Total pending</p>
            <p className="font-fraunces text-2xl font-semibold text-ink">{fmt(pending)}</p>
          </div>
          <Link href="/admin/payouts" className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-paper-deep">Open payouts</Link>
        </div>
      </section>
    </div>
  )
}

export default function AdminHubHome() {
  return (
    <AffiliateShell title="Home">
      {() => <HomeBody />}
    </AffiliateShell>
  )
}
