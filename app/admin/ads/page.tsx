'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const RATES = [1.5, 3, 5, 10, 20, 30]

function usd(n: number): string {
  const r = Math.round(n * 100) / 100
  return '$' + r.toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(r) ? 0 : 2, maximumFractionDigits: 2 })
}

function Field({ label, value, onChange, hint }: { label: string; value: number; onChange: (v: number) => void; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-2 block font-mono text-xs uppercase tracking-widest text-ink-soft/60">{label}</span>
      <input
        type="number"
        min={0}
        step="any"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-full rounded-xl border border-line bg-card px-3 py-2 text-ink"
      />
      {hint && <span className="mt-1 block text-xs text-ink-soft">{hint}</span>}
    </label>
  )
}

export default function AdminAdsPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [spend, setSpend] = useState(72)
  const [visits, setVisits] = useState(100)
  const [net, setNet] = useState(51)
  const [months, setMonths] = useState(6)

  useEffect(() => {
    async function check() {
      if (!supabase) { setReady(true); return }
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/admin/login'); return }
      setReady(true)
    }
    check()
  }, [router])

  if (!ready) return null

  const th = 'px-4 py-3 text-left font-mono text-xs font-normal uppercase tracking-widest text-ink-soft/60'
  const td = 'px-4 py-3 text-ink'

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-fraunces text-3xl font-semibold text-ink">Ad math</h1>
      <p className="mt-2 text-sm text-ink-soft">
        What an ad is worth at different visit-to-paid rates. Change the numbers and the table updates.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Ad spend ($)" value={spend} onChange={setSpend} />
        <Field label="Visits" value={visits} onChange={setVisits} hint="Visits to the site or App Store page that the spend buys" />
        <Field label="Net per subscriber / month ($)" value={net} onChange={setNet} hint="Solo $59.99 minus Apple's 15% is about $51" />
        <Field label="Months of revenue" value={months} onChange={setMonths} hint="Assumes nobody cancels" />
      </div>

      <div className="mt-8 overflow-x-auto rounded-2xl border border-line bg-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className={th}>Visit to paid</th>
              <th className={th}>Paying subs</th>
              <th className={th}>Cost per paying sub</th>
              <th className={th}>Revenue, 1 month</th>
              <th className={th}>Revenue, {months} months</th>
              <th className={th}>Return on {usd(spend)}</th>
            </tr>
          </thead>
          <tbody>
            {RATES.map((rate) => {
              const subs = (visits * rate) / 100
              const perSub = subs > 0 ? spend / subs : 0
              const rev1 = subs * net
              const revN = rev1 * months
              const ratio = spend > 0 ? revN / spend : 0
              return (
                <tr key={rate} className="border-b border-line last:border-0">
                  <td className={`${td} font-medium`}>{rate}%</td>
                  <td className={td}>{Number(subs.toFixed(2))}</td>
                  <td className={td}>{subs > 0 ? usd(perSub) : '-'}</td>
                  <td className={td}>{usd(Math.round(rev1))}</td>
                  <td className={td}>{usd(Math.round(revN))}</td>
                  <td className={`${td} font-medium`}>{spend > 0 ? `about ${ratio >= 2 ? Math.round(ratio) : ratio.toFixed(1)}x` : '-'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-8 rounded-2xl border border-line bg-card p-6">
        <h2 className="font-fraunces text-xl font-semibold text-ink">Can you hit 20% or higher?</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          It is possible, but not from cold ad traffic. Rough ranges:
        </p>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink">
          <li><span className="font-medium">Cold ads</span> (strangers on Instagram): usually under 1% to 3% visit to paid. 5% would be excellent.</li>
          <li><span className="font-medium">Warm traffic</span> (your email list, referrals, photographers who already know you): 10% to 30% or more is realistic, because they already trust you.</li>
          <li><span className="font-medium">Direct outreach</span> to photographers with a personal message: can go higher still.</li>
        </ul>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          To get the big numbers, send warm audiences to the site instead of only buying cold clicks. Your AI NicheNews newsletter and your photographer network are the places to try that.
        </p>
      </div>
    </main>
  )
}
