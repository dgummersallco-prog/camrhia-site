'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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
  const r = Math.round(Math.abs(n) * 100) / 100
  return (n < 0 && r > 0 ? '-' : '') + '$' + r.toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(r) ? 0 : 2, maximumFractionDigits: 2 })
}

function pct(n: number): string {
  return `${Number(n.toFixed(2))}%`
}

function Field({ label, value, onChange, hint, children }: { label: string; value: string; onChange: (v: string) => void; hint: string; children?: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col rounded-xl bg-paper p-4">
      <label className="block">
        <span className="block min-h-[2rem] font-mono text-xs uppercase leading-4 tracking-widest text-ink-soft/60">{label}</span>
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-2 w-full rounded-xl border border-line bg-card px-3 py-2.5 font-fraunces text-2xl font-semibold text-ink outline-none focus:border-twilight"
        />
      </label>
      <p className="mt-3 min-h-[2.5rem] text-xs leading-relaxed text-ink-soft">{hint}</p>
      {children}
    </div>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 rounded-2xl border border-line bg-card p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-twilight text-sm font-medium text-white">{n}</span>
        <h2 className="font-fraunces text-xl font-semibold text-ink">{title}</h2>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function Dots({ lit, litClass }: { lit: number; litClass: string }) {
  const capped = Math.min(100, Math.max(0, lit))
  const whole = Math.floor(capped)
  const frac = capped - whole
  return (
    <div className="grid w-full max-w-[260px] grid-cols-10 gap-1.5" aria-hidden>
      {Array.from({ length: 100 }, (_, i) => {
        const on = i < whole
        const part = i === whole && frac > 0
        return (
          <span
            key={i}
            className={`aspect-square rounded-full ${on || part ? litClass : 'bg-line'}`}
            style={part ? { opacity: 0.35 + 0.65 * frac } : undefined}
          />
        )
      })}
    </div>
  )
}

export default function AdminAdsPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [fullS, setFullS] = useState('96')
  const [visitsS, setVisitsS] = useState('114')
  const [netS, setNetS] = useState('51')
  const [churnS, setChurnS] = useState('100')
  const [rate, setRate] = useState(3)

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

  const full = num(fullS)
  const visits = num(visitsS)
  const net = num(netS)
  const churn = Math.min(1, Math.max(0, num(churnS) / 100))

  const cpv = visits > 0 ? full / visits : 0
  const cost100 = cpv * 100
  const ltv = churn > 0 ? net / churn : 0
  const lifeMonths = churn > 0 ? 1 / churn : 0
  const be = ltv > 0 ? cost100 / ltv : 0

  const worth = rate * ltv
  const profit = worth - cost100
  const ahead = profit >= 0
  const maxv = Math.max(cost100, worth, 1)
  const cac = rate > 0 ? cost100 / rate : 0
  const ltvCac = cac > 0 && ltv > 0 ? ltv / cac : 0

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-fraunces text-3xl font-semibold text-ink">Ad math</h1>
      <p className="mt-2 text-sm text-ink-soft">One ad at a time. Fill in step 1 and 2, and the rest works itself out.</p>

      <Step n={1} title="What you pay per visit">
        <div className="grid items-stretch gap-4 sm:grid-cols-2">
          <Field label="Total ad cost with fees ($)" value={fullS} onChange={setFullS} hint="What you really pay in total, with Apple's fees added" />
          <Field label="Visits you got" value={visitsS} onChange={setVisitsS} hint="Visits or taps the ad dashboard shows. Use your expected total if the ad is still running." />
        </div>
        <p className="mt-4 text-sm text-ink-soft">
          <span className="font-fraunces text-3xl font-semibold text-ink">{cpv > 0 ? usd(cpv) : '-'}</span> per visit.
          {' '}So 100 visitors cost you <span className="font-medium text-ink">{usd(cost100)}</span>.
        </p>
      </Step>

      <Step n={2} title="What one subscriber is worth">
        <div className="grid items-stretch gap-4 sm:grid-cols-2">
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
          <Field label="Monthly churn (%)" value={churnS} onChange={setChurnS} hint="Share who cancel each month. 100 means they pay once and cancel, the worst case. Lower it as you learn." />
        </div>
        <p className="mt-4 text-sm text-ink-soft">
          One subscriber is worth <span className="font-fraunces text-3xl font-semibold text-ink">{ltv > 0 ? usd(ltv) : '-'}</span> to you
          {churn >= 1 ? ' (one month of payment).' : churn > 0 ? ` (about ${lifeMonths.toFixed(1)} months of payments).` : '.'}
        </p>
      </Step>

      <Step n={3} title="Your break-even">
        {ltv > 0 && cost100 > 0 ? (
          <>
            <p className="text-sm leading-relaxed text-ink-soft">
              Break-even means the subscribers pay back what you spent on the visitors.
            </p>
            <p className="mt-2 text-sm text-ink">
              {usd(cost100)} ÷ {usd(ltv)} = <span className="font-medium">{Number(be.toFixed(2))} subscribers</span> out of every 100 visitors.
            </p>
            <p className="mt-3 font-fraunces text-5xl font-semibold text-twilight">{pct(be)}</p>
            <p className="mt-1 text-sm text-ink-soft">That is your break-even conversion rate. Below it you lose money, above it you make money.</p>
            <div className="mt-4">
              <Dots lit={be} litClass="bg-twilight" />
              <p className="mt-2 text-xs text-ink-soft">100 visitors. The lit dots are the subscribers you need to break even.</p>
            </div>
          </>
        ) : (
          <p className="text-sm text-ink-soft">Fill in steps 1 and 2 to see your break-even.</p>
        )}
      </Step>

      <Step n={4} title="Try a conversion rate">
        <p className="text-sm text-ink-soft">Out of every 100 people who visit, how many become paying subscribers?</p>
        <p className="mt-2 font-fraunces text-5xl font-semibold text-twilight">{pct(rate)}</p>
        <input
          type="range"
          min={0}
          max={10}
          step={0.05}
          value={rate}
          onChange={(e) => setRate(Number(e.target.value))}
          className="mt-3 w-full accent-twilight"
          aria-label="Visit to paid conversion rate"
        />
        <div className="mt-1 flex justify-between text-xs text-ink-soft"><span>0%</span><span>5%</span><span>10%</span></div>

        <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-start">
          <Dots lit={rate} litClass={ahead ? 'bg-twilight' : 'bg-red-600'} />
          <div className="flex-1 space-y-4">
            <div>
              <div className="mb-1 flex justify-between text-sm"><span className="text-ink-soft">You paid</span><span className="font-medium text-ink">{usd(cost100)}</span></div>
              <div className="h-4 rounded-full bg-line"><div className="h-4 rounded-full bg-ink" style={{ width: `${(cost100 / maxv) * 100}%` }} /></div>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-sm"><span className="text-ink-soft">Subscribers are worth</span><span className={`font-medium ${ahead ? 'text-twilight' : 'text-red-700'}`}>{usd(worth)}</span></div>
              <div className="h-4 rounded-full bg-line"><div className={`h-4 rounded-full ${ahead ? 'bg-twilight' : 'bg-red-600'}`} style={{ width: `${(worth / maxv) * 100}%` }} /></div>
            </div>
          </div>
        </div>

        <p className="mt-5 text-sm leading-relaxed text-ink">
          At {pct(rate)}, about {Number(rate.toFixed(2))} out of 100 visitors subscribe. They are worth {usd(worth)}, and you paid {usd(cost100)}.{' '}
          <span className={`font-medium ${ahead ? 'text-twilight' : 'text-red-700'}`}>
            {ahead ? `You come out ${usd(profit)} ahead.` : `You are ${usd(-profit)} behind.`}
          </span>
        </p>
        <p className="mt-2 text-xs text-ink-soft">
          Each subscriber costs you {cac > 0 ? usd(cac) : '-'} to get{ltvCac > 0 ? `, and is worth ${ltvCac.toFixed(1)}x that (3x or more is healthy)` : ''}.
        </p>
      </Step>

      <div className="mt-8 rounded-2xl border border-line bg-card p-6">
        <h2 className="font-fraunces text-xl font-semibold text-ink">What conversion is realistic?</h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink">
          <li><span className="font-medium">Cold ads</span> (strangers on Instagram): usually under 1% to 3%. 5% would be excellent.</li>
          <li><span className="font-medium">Warm traffic</span> (your email list, referrals, photographers who know you): 10% to 30% or more, because they already trust you.</li>
          <li><span className="font-medium">Direct outreach</span> with a personal message: can go higher still.</li>
        </ul>
      </div>
    </main>
  )
}
