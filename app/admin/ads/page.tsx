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
  const r = Math.round(n * 100) / 100
  return '$' + r.toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(r) ? 0 : 2, maximumFractionDigits: 2 })
}

function pct(n: number): string {
  return `${Number(n.toFixed(2))}%`
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

function Stat({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <p className="font-mono text-xs uppercase tracking-widest text-ink-soft/60">{label}</p>
      <p className={`mt-2 font-fraunces text-3xl font-semibold leading-none ${tone ?? 'text-ink'}`}>{value}</p>
      <p className="mt-2 text-xs leading-relaxed text-ink-soft">{sub}</p>
    </div>
  )
}

const XMAX = 10

export default function AdminAdsPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [rate, setRate] = useState(3)
  const [cpvS, setCpvS] = useState('0.84')
  const [netS, setNetS] = useState('51')
  const [churnS, setChurnS] = useState('100')

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

  const cpv = num(cpvS)
  const net = num(netS)
  const churn = Math.min(1, Math.max(0, num(churnS) / 100))
  const ltv = churn > 0 ? net / churn : 0
  const cost100 = cpv * 100
  const profitAt = (r: number) => r * ltv - cost100
  const be = ltv > 0 ? cost100 / ltv : 0

  const subs = rate
  const worth = subs * ltv
  const profit = profitAt(rate)
  const ahead = profit >= 0
  const cac = subs > 0 ? cost100 / subs : 0
  const ltvCac = cac > 0 && ltv > 0 ? ltv / cac : 0

  // chart
  const W = 640, H = 270, L = 64, R = 16, T = 16, B = 38
  const p0 = profitAt(0)
  const pMax = profitAt(XMAX)
  const yMin = Math.min(p0, 0) * 1.1 - 1
  const yMax = Math.max(pMax, cost100 * 0.5, 1)
  const sx = (x: number) => L + (x / XMAX) * (W - L - R)
  const sy = (y: number) => T + ((yMax - y) / (yMax - yMin)) * (H - T - B)
  const beIn = be > 0 && be < XMAX
  const dotY = sy(profit)

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-fraunces text-3xl font-semibold text-ink">Ad math</h1>
      <p className="mt-2 text-sm text-ink-soft">One number to move. Everything else follows.</p>

      <div className="mt-6 rounded-2xl border border-twilight/30 bg-twilight/5 p-6">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-soft/60">Move this number</p>
        <p className="mt-1 text-sm text-ink-soft">Out of every 100 people who visit, how many become paying subscribers?</p>
        <p className="mt-3 font-fraunces text-5xl font-semibold text-twilight">{pct(rate)}</p>
        <input
          type="range"
          min={0}
          max={XMAX}
          step={0.05}
          value={rate}
          onChange={(e) => setRate(Number(e.target.value))}
          className="mt-4 w-full accent-twilight"
          aria-label="Visit to paid conversion rate"
        />
        <div className="mt-1 flex justify-between text-xs text-ink-soft"><span>0%</span><span>5%</span><span>10%</span></div>
        <p className="mt-4 text-sm leading-relaxed text-ink">
          At {pct(rate)}, about {Number(subs.toFixed(2))} out of every 100 visitors subscribe. They are worth {usd(worth)} to you. You paid {usd(cost100)} for those 100 visitors.{' '}
          <span className={`font-medium ${ahead ? 'text-twilight' : 'text-red-700'}`}>
            {ahead ? `You come out ${usd(profit)} ahead.` : `You are ${usd(-profit)} behind.`}
          </span>
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-line bg-card p-5">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-soft/60">Profit or loss on every 100 visitors</p>
        <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label="Profit against conversion rate">
          {/* zero line */}
          <line x1={L} x2={W - R} y1={sy(0)} y2={sy(0)} stroke="currentColor" strokeOpacity="0.25" strokeDasharray="4 4" className="text-ink" />
          <text x={L - 8} y={sy(0) + 4} textAnchor="end" className="fill-ink-soft" fontSize="11">$0</text>
          <text x={L - 8} y={sy(yMax) + 12} textAnchor="end" className="fill-ink-soft" fontSize="11">{usd(yMax)}</text>
          <text x={L - 8} y={sy(p0) + 4} textAnchor="end" className="fill-ink-soft" fontSize="11">{usd(p0)}</text>
          {/* losing part */}
          <line x1={sx(0)} y1={sy(p0)} x2={sx(beIn ? be : XMAX)} y2={sy(beIn ? 0 : pMax)} stroke="#B83232" strokeWidth="3" strokeLinecap="round" />
          {/* winning part */}
          {beIn && <line x1={sx(be)} y1={sy(0)} x2={sx(XMAX)} y2={sy(pMax)} stroke="var(--color-twilight)" strokeWidth="3" strokeLinecap="round" />}
          {/* break-even marker */}
          {beIn && (
            <>
              <line x1={sx(be)} x2={sx(be)} y1={sy(0)} y2={H - B} stroke="currentColor" strokeOpacity="0.3" strokeDasharray="3 3" className="text-ink" />
              <circle cx={sx(be)} cy={sy(0)} r="5" fill="white" stroke="currentColor" strokeWidth="2" className="text-ink" />
              <text x={sx(be)} y={H - B + 28} textAnchor="middle" className="fill-ink" fontSize="12" fontWeight="600">Break-even {pct(be)}</text>
            </>
          )}
          {/* your dot */}
          <circle cx={sx(rate)} cy={dotY} r="7" fill={ahead ? 'var(--color-twilight)' : '#B83232'} stroke="white" strokeWidth="2" />
          {/* x axis labels */}
          {[0, 5, 10].map((t) => (
            <text key={t} x={sx(t)} y={H - B + 14} textAnchor={t === 0 ? 'start' : t === 10 ? 'end' : 'middle'} className="fill-ink-soft" fontSize="11">{t}%</text>
          ))}
        </svg>
        <p className="mt-2 text-xs leading-relaxed text-ink-soft">
          Left of the break-even point you lose money (red). Right of it you make money. The dot is the number you picked above.
        </p>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="You pay" value={usd(cost100)} sub="For 100 visitors" />
        <Stat label="Subscribers" value={String(Number(subs.toFixed(2)))} sub="Out of those 100 visitors" />
        <Stat label="They are worth" value={usd(worth)} sub={churn >= 1 ? 'One month each, since everyone cancels' : `About ${(churn > 0 ? 1 / churn : 0).toFixed(1)} months each`} />
        <Stat label={ahead ? 'You make' : 'You lose'} value={usd(Math.abs(profit))} sub="Worth minus what you paid" tone={ahead ? 'text-twilight' : 'text-red-700'} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Stat label="Break-even conversion" value={be > 0 ? pct(be) : '-'} sub="Cost of 100 visitors ÷ what one subscriber is worth" />
        <Stat label="Cost per subscriber (CAC)" value={cac > 0 ? usd(cac) : '-'} sub="What you pay for each one at this rate" />
        <Stat
          label="LTV : CAC"
          value={ltvCac > 0 ? `${ltvCac.toFixed(1)}x` : '-'}
          tone={ltvCac >= 3 ? 'text-twilight' : ltvCac >= 1 ? 'text-ink' : ltvCac > 0 ? 'text-red-700' : 'text-ink'}
          sub="3x or more is healthy. Under 1x loses money."
        />
      </div>

      <h2 className="mt-10 font-mono text-xs uppercase tracking-widest text-ink-soft/50">Your numbers</h2>
      <div className="mt-3 grid items-stretch gap-4 sm:grid-cols-3">
        <Field label="Cost per visit ($)" value={cpvS} onChange={setCpvS} hint="Total you pay, with Apple's fees, ÷ visits you get. Your ad: $96 ÷ 114 visits is about $0.84." />
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
        <Field label="Monthly churn (%)" value={churnS} onChange={setChurnS} hint="Share who cancel each month. 100 means one and done, the worst case. Lower it as you learn." />
      </div>

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
