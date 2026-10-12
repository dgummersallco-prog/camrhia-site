'use client'

import { useState } from 'react'
import AffiliateShell, { type ShellAffiliate } from '../../components/AffiliateShell'

// Apple's cut under the Small Business Program (30% if proceeds ever exceed $1M/yr).
const APPLE_RATE = 0.15

const PLANS = [
  { key: 'solo-m', label: 'Solo, monthly', price: 59.99 },
  { key: 'solo-y', label: 'Solo, yearly', price: 590 },
  { key: 'studio-m', label: 'Studio, monthly', price: 149 },
  { key: 'studio-y', label: 'Studio, yearly', price: 999.99 },
]

const usd = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
const r2 = (n: number) => Math.round(n * 100) / 100
const pct = (n: number) => `${Math.round(n * 100)}%`
const selectCls = 'rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink'

function Breakdown({ a }: { a: ShellAffiliate }) {
  const [planKey, setPlanKey] = useState('solo-m')
  const [channel, setChannel] = useState<'apple' | 'web'>('apple')
  const [rate, setRate] = useState(Number(a.commission_rate ?? 0.2))
  const [hasMaster, setHasMaster] = useState(!a.is_master && !!a.parent_affiliate_id)
  const [override, setOverride] = useState(Number(a.override_rate ?? 0.5))

  const rateOptions = Array.from(new Set([0.2, 0.25, 0.3, Number(a.commission_rate ?? 0.2)])).sort((x, y) => x - y)
  const overrideOptions = Array.from(new Set([0.3, 0.4, 0.5, Number(a.override_rate ?? 0.5)])).sort((x, y) => x - y)

  const plan = PLANS.find((p) => p.key === planKey) ?? PLANS[0]
  const price = plan.price
  const apple = channel === 'apple' ? r2(price * APPLE_RATE) : 0
  const base = r2(price - apple)
  const affiliate = r2(base * rate)
  const master = hasMaster ? r2((base - affiliate) * override) : 0
  const camrhia = r2(price - apple - affiliate - master)

  const rows = [
    { label: channel === 'apple' ? "Apple's cut" : 'Apple', value: apple, color: '#9AA0A6', show: channel === 'apple', note: `${pct(APPLE_RATE)} of the price` },
    { label: 'Affiliate commission', value: affiliate, color: '#3A4A6B', show: true, note: `${pct(rate)} of ${usd(base)}` },
    { label: 'Master partner bonus', value: master, color: '#A9853F', show: hasMaster, note: `${pct(override)} of what's left after the affiliate` },
    { label: 'Camrhia keeps', value: camrhia, color: '#6E7E60', show: true, note: 'before processing fees and taxes' },
  ].filter((r) => r.show)

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-line bg-card p-6 space-y-5">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <label className="text-sm text-ink space-y-1.5 block">
            <span className="block font-medium">Plan</span>
            <select className={`${selectCls} w-full`} value={planKey} onChange={(e) => setPlanKey(e.target.value)}>
              {PLANS.map((p) => <option key={p.key} value={p.key}>{p.label} ({usd(p.price)})</option>)}
            </select>
          </label>
          <label className="text-sm text-ink space-y-1.5 block">
            <span className="block font-medium">Where they subscribe</span>
            <select className={`${selectCls} w-full`} value={channel} onChange={(e) => setChannel(e.target.value as 'apple' | 'web')}>
              <option value="apple">In the app (Apple)</option>
              <option value="web">On the website (Stripe)</option>
            </select>
          </label>
          <label className="text-sm text-ink space-y-1.5 block">
            <span className="block font-medium">Affiliate rate</span>
            <select className={`${selectCls} w-full`} value={rate} onChange={(e) => setRate(Number(e.target.value))}>
              {rateOptions.map((r) => <option key={r} value={r}>{pct(r)}</option>)}
            </select>
          </label>
          <label className="text-sm text-ink space-y-1.5 block">
            <span className="block font-medium">On a master&apos;s team?</span>
            <select className={`${selectCls} w-full`} value={hasMaster ? 'yes' : 'no'} onChange={(e) => setHasMaster(e.target.value === 'yes')}>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </label>
        </div>
        {hasMaster ? (
          <label className="text-sm text-ink space-y-1.5 block max-w-xs">
            <span className="block font-medium">Master bonus rate</span>
            <select className={`${selectCls} w-full`} value={override} onChange={(e) => setOverride(Number(e.target.value))}>
              {overrideOptions.map((r) => <option key={r} value={r}>{pct(r)}</option>)}
            </select>
          </label>
        ) : null}
      </section>

      <section className="rounded-2xl border border-line bg-card p-6">
        <p className="text-sm text-ink-soft">One subscriber pays</p>
        <p className="font-fraunces text-4xl text-ink">{usd(price)}</p>

        <div className="mt-5 flex h-4 w-full overflow-hidden rounded-full bg-paper">
          {rows.map((r) => (
            <div key={r.label} style={{ width: `${(r.value / price) * 100}%`, backgroundColor: r.color }} />
          ))}
        </div>

        <ul className="mt-5 divide-y divide-line border-y border-line">
          {rows.map((r) => (
            <li key={r.label} className="py-3 flex items-center justify-between gap-4 text-sm">
              <div className="flex items-start gap-3">
                <span className="mt-1.5 inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: r.color }} />
                <div>
                  <p className="text-ink font-medium">{r.label}</p>
                  <p className="text-xs text-ink-soft">{r.note}</p>
                </div>
              </div>
              <p className="text-ink font-semibold">{usd(r.value)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-line bg-card p-6 text-sm text-ink-soft space-y-2">
        <p>Commissions are paid on each real charge. The 14-day free trial earns nothing; the first payment after it does.</p>
        <p>
          {channel === 'apple'
            ? 'For in-app subscriptions, Apple takes its cut first, and commissions are calculated on what is left.'
            : 'For website subscriptions there is no Apple cut. Commissions are calculated on the full price, and Stripe\u2019s processing fee (about 2.9% + 30\u00A2) comes out of Camrhia\u2019s share.'}
        </p>
        <p>Affiliates and master partners are independent partners and are responsible for their own taxes.</p>
      </section>
    </div>
  )
}

export default function PayPage() {
  return (
    <AffiliateShell title="Pay breakdown" subtitle="Exactly where each subscription dollar goes.">
      {(a) => <Breakdown a={a} />}
    </AffiliateShell>
  )
}
