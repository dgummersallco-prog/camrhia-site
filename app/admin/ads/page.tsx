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

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <p className="font-mono text-xs uppercase tracking-widest text-ink-soft/60">{label}</p>
      <p className="mt-2 font-fraunces text-3xl font-semibold leading-none text-ink">{value}</p>
      <p className="mt-2 text-xs leading-relaxed text-ink-soft">{sub}</p>
    </div>
  )
}

export default function AdminAdsPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [budgetS, setBudgetS] = useState('66')
  const [fullS, setFullS] = useState('96')
  const [spentS, setSpentS] = useState('13.37')
  const [visitsS, setVisitsS] = useState('23')
  const [netS, setNetS] = useState('51')
  const [trialsS, setTrialsS] = useState('0')
  const [payingS, setPayingS] = useState('0')
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

  const budget = num(budgetS)
  const full = num(fullS)
  const spent = num(spentS)
  const visitsSoFar = num(visitsS)
  const net = num(netS)
  const trials = num(trialsS)
  const paying = num(payingS)
  const months = num(monthsS)

  const cpv = visitsSoFar > 0 ? spent / visitsSoFar : 0
  const projVisits = cpv > 0 ? budget / cpv : 0
  const goal = net > 0 ? Math.ceil(full / net) : 0
  const beRate = projVisits > 0 ? (goal / projVisits) * 100 : 0
  const brokeEven = goal > 0 && paying >= goal
  const need = Math.max(0, goal - paying)

  const thBase = 'px-4 py-3 font-mono text-xs font-normal uppercase tracking-widest text-ink-soft/60'
  const th = `${thBase} text-right`
  const td = 'px-4 py-3.5 text-right tabular-nums text-ink'

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-fraunces text-3xl font-semibold text-ink">Ad math</h1>
      <p className="mt-2 text-sm text-ink-soft">Enter what you have so far. Everything else works itself out.</p>

      <div className={`mt-6 rounded-2xl border p-6 ${brokeEven ? 'border-emerald-300 bg-emerald-50' : 'border-twilight/30 bg-twilight/5'}`}>
        <p className="font-mono text-xs uppercase tracking-widest text-ink-soft/60">Your goal</p>
        <p className="mt-1 font-fraunces text-4xl font-semibold text-twilight">
          {goal} paying subscriber{goal === 1 ? '' : 's'}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          You spend {usd(full)} in total and keep about {usd(net)} a month from each subscriber, so {goal} paying subscriber{goal === 1 ? '' : 's'} pay the ad back in the first month. Everything after that is profit.
        </p>
        <p className="mt-3 text-sm font-medium text-ink">
          {brokeEven
            ? `You have ${paying} paying. You have broken even.`
            : `${paying} of ${goal} paying so far. You need ${need} more.${trials > 0 ? ` ${trials} free trial${trials === 1 ? '' : 's'} started, and trials turn paid after 14 days.` : ''}`}
        </p>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Cost per visit so far" value={cpv > 0 ? usd(cpv) : '-'} sub={`${usd(spent)} spent for ${visitsSoFar} visits`} />
        <Stat label="Visits at this pace" value={projVisits > 0 ? String(Math.round(projVisits)) : '-'} sub={`What your ${usd(budget)} budget should buy`} />
        <Stat label="Break-even rate" value={beRate > 0 ? `${beRate.toFixed(1)}%` : '-'} sub={`${goal} subscribers out of about ${Math.round(projVisits)} visits`} />
        <Stat label="Subscribers vs goal" value={`${paying} / ${goal}`} sub={`${trials} free trial${trials === 1 ? '' : 's'} started`} />
      </div>

      <h2 className="mt-10 font-mono text-xs uppercase tracking-widest text-ink-soft/50">The ad</h2>
      <div className="mt-3 grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Ad budget ($)" value={budgetS} onChange={setBudgetS} hint="The budget you set for the ad" />
        <Field label="Full cost with fees ($)" value={fullS} onChange={setFullS} hint="What you will really pay in total, with Apple's fees added" />
        <Field label="Spent so far ($)" value={spentS} onChange={setSpentS} hint="What the ad dashboard shows today" />
        <Field label="Visits so far" value={visitsS} onChange={setVisitsS} hint="Visits or taps the ad dashboard shows today" />
      </div>

      <h2 className="mt-8 font-mono text-xs uppercase tracking-widest text-ink-soft/50">The results</h2>
      <div className="mt-3 grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Net per subscriber / month ($)" value={netS} onChange={setNetS} hint="What you keep each month after Apple's 15%. Type a number or tap a plan.">
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
        <Field label="Free trials started" value={trialsS} onChange={setTrialsS} hint="New photographers who started a trial from the ad" />
        <Field label="Paying subscribers" value={payingS} onChange={setPayingS} hint="Trials that turned into paid, about 14 days after they start" />
        <Field label="Months to count" value={monthsS} onChange={setMonthsS} hint="Used in the table below. Assumes nobody cancels" />
      </div>

      <h2 className="mt-10 font-mono text-xs uppercase tracking-widest text-ink-soft/50">What if more visitors subscribed?</h2>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-line bg-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-line bg-paper">
              <th className={`${thBase} text-left`}>Visit to paid</th>
              <th className={th}>Paying subs</th>
              <th className={th}>Cost per paying sub</th>
              <th className={th}>Revenue, 1 month</th>
              <th className={th}>Revenue, {months} months</th>
              <th className={th}>Return on {usd(full)}</th>
            </tr>
          </thead>
          <tbody>
            {RATES.map((rate) => {
              const subs = (projVisits * rate) / 100
              const perSub = subs > 0 ? full / subs : 0
              const rev1 = subs * net
              const revN = rev1 * months
              const ratio = full > 0 ? revN / full : 0
              const red = full > 0 && rev1 < full
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
                    {full > 0 ? `about ${ratio >= 2 ? Math.round(ratio) : ratio.toFixed(1)}x` : '-'}
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
