'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const RATES = [1.5, 3, 5, 10, 20, 30]

const PLANS = [
  { label: 'Solo monthly', net: '50.99' },
  { label: 'Solo yearly', net: '41.79' },
  { label: 'Studio monthly', net: '126.65' },
  { label: 'Studio yearly', net: '70.83' },
]

function num(s: string): number {
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

function usd(n: number): string {
  const r = Math.round(n * 100) / 100
  return '$' + r.toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(r) ? 0 : 2, maximumFractionDigits: 2 })
}

function Field({ label, value, onChange, hint, children }: { label: string; value: string; onChange: (v: string) => void; hint: string; children?: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-line bg-card p-5">
      <label className="block">
        <span className="block min-h-[2rem] font-mono text-xs uppercase leading-4 tracking-widest text-ink-soft/60">{label}</span>
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-2 w-full rounded-xl border border-line bg-paper px-3 py-2.5 font-fraunces text-2xl font-semibold text-ink outline-none focus:border-twilight"
        />
      </label>
      <p className="mt-3 min-h-[2.5rem] text-xs leading-relaxed text-ink-soft">{hint}</p>
      {children}
    </div>
  )
}

export default function AdminAdsPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [spendS, setSpendS] = useState('96')
  const [cpvS, setCpvS] = useState('0.72')
  const [netS, setNetS] = useState('51')
  const [monthsS, setMonthsS] = useState('6')

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

  const spend = num(spendS)
  const cpv = num(cpvS)
  const visits = cpv > 0 ? spend / cpv : 0
  const net = num(netS)
  const months = num(monthsS)
  const be1 = net > 0 ? (cpv / net) * 100 : 0
  const beN = months > 0 ? be1 / months : 0

  const thBase = 'px-4 py-3 font-mono text-xs font-normal uppercase tracking-widest text-ink-soft/60'
  const th = `${thBase} text-right`
  const td = 'px-4 py-3.5 text-right tabular-nums text-ink'

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-fraunces text-3xl font-semibold text-ink">Ad math</h1>
      <p className="mt-2 text-sm text-ink-soft">
        What an ad is worth at different visit-to-paid rates. Change the numbers and the table updates.
      </p>

      <div className="mt-6 grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Ad spend ($)" value={spendS} onChange={setSpendS} hint="What the ad cost you" />
        <Field label="Cost per visit ($)" value={cpvS} onChange={setCpvS} hint={`${Math.round(visits)} visits for ${usd(spend)}. Use your real ad spend ÷ visits you got.`} />
        <Field label="Net per subscriber / month ($)" value={netS} onChange={setNetS} hint="What you keep per month after Apple's 15%. Type any number or tap a plan.">
          <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
            {PLANS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setNetS(p.net)}
                className={`rounded-full border px-2.5 py-1 text-xs transition ${netS === p.net ? 'border-twilight bg-twilight/10 text-twilight' : 'border-line text-ink-soft hover:border-twilight'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Months of revenue" value={monthsS} onChange={setMonthsS} hint="Assumes nobody cancels" />
      </div>

      <div className="mt-6 rounded-2xl border border-twilight/30 bg-twilight/5 p-5">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-soft/60">Break-even visit-to-paid</p>
        <p className="mt-1 font-fraunces text-3xl font-semibold text-twilight">{be1.toFixed(2)}%</p>
        <p className="mt-1 text-sm text-ink-soft">
          That share of visitors must become paying subscribers for the ad to earn back its {usd(spend)} in the first month.
          {months > 0 ? ` Counting ${months} months of revenue, ${beN.toFixed(2)}% is enough.` : ''}
        </p>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-line bg-paper">
              <th className={`${thBase} text-left`}>Visit to paid</th>
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
              const red = spend > 0 && rev1 < spend
              return (
                <tr key={rate} className={`border-b border-line last:border-0 ${red ? 'bg-red-50' : 'transition hover:bg-paper'}`}>
                  <td className="px-4 py-3.5 text-left">
                    <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${red ? 'bg-red-100 text-red-700' : 'bg-twilight/10 text-twilight'}`}>{rate}%</span>
                  </td>
                  <td className={td}>{Number(subs.toFixed(2))}</td>
                  <td className={`${td} ${red ? 'text-red-700' : ''}`}>{subs > 0 ? usd(perSub) : '-'}</td>
                  <td className={`${td} ${red ? 'text-red-700' : ''}`}>{usd(Math.round(rev1))}</td>
                  <td className={td}>{usd(Math.round(revN))}</td>
                  <td className={`${td} font-fraunces text-lg font-semibold ${red ? 'text-red-700' : 'text-twilight'}`}>
                    {spend > 0 ? `about ${ratio >= 2 ? Math.round(ratio) : ratio.toFixed(1)}x` : '-'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 flex items-center gap-2 text-xs text-ink-soft">
        <span className="inline-block h-3 w-3 rounded-sm bg-red-100 ring-1 ring-red-300" />
        Red means the ad does not earn back its cost in the first month, so it is not safe to scale.
      </p>

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
