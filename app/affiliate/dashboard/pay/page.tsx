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
const th = 'px-3 py-2 text-left text-xs uppercase tracking-widest text-ink-soft font-normal whitespace-nowrap'
const td = 'px-3 py-2.5 whitespace-nowrap'

function PayoutTable({ withMaster, override }: { withMaster: boolean; override: number }) {
  const plans = [
    { label: 'Solo', price: 59.99 },
    { label: 'Studio', price: 149 },
  ]
  const rates = [0.2, 0.25, 0.3]
  const rows = plans.flatMap((p) =>
    rates.map((rt) => {
      const apple = r2(p.price * APPLE_RATE)
      const base = r2(p.price - apple)
      const aff = r2(base * rt)
      const mas = withMaster ? r2((base - aff) * override) : 0
      return { plan: p.label, price: p.price, rt, apple, aff, mas, cam: r2(p.price - apple - aff - mas) }
    })
  )
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className={th}>Plan / month</th>
            <th className={th}>Affiliate rate</th>
            <th className={th}>Apple</th>
            <th className={th}>Affiliate gets</th>
            {withMaster ? <th className={th}>Master gets</th> : null}
            <th className={th}>Camrhia keeps</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line border-t border-line">
          {rows.map((r) => (
            <tr key={r.plan + r.rt}>
              <td className={td + ' text-ink font-medium'}>{r.plan} ({usd(r.price)})</td>
              <td className={td + ' text-ink'}>{pct(r.rt)}</td>
              <td className={td + ' text-ink-soft'}>{usd(r.apple)}</td>
              <td className={td + ' text-ink font-medium'}>{usd(r.aff)}</td>
              {withMaster ? <td className={td + ' text-ink font-medium'}>{usd(r.mas)}</td> : null}
              <td className={td + ' text-ink font-semibold'}>{usd(r.cam)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MasterBreakdown({ a }: { a: ShellAffiliate }) {
  const masterShare = Number(a.override_rate ?? 0.5)
  const [planKey, setPlanKey] = useState('solo-m')
  const [rate, setRate] = useState(Number(a.commission_rate ?? 0.2))
  const [hasMaster, setHasMaster] = useState(false)
  const [override, setOverride] = useState(masterShare)

  const rateOptions = Array.from(new Set([0.2, 0.25, 0.3, Number(a.commission_rate ?? 0.2)])).sort((x, y) => x - y)
  const overrideOptions = Array.from(new Set([0.3, 0.4, 0.5, masterShare])).sort((x, y) => x - y)

  const plan = PLANS.find((p) => p.key === planKey) ?? PLANS[0]
  const price = plan.price
  const apple = r2(price * APPLE_RATE)
  const base = r2(price - apple)
  const affiliate = r2(base * rate)
  const master = hasMaster ? r2((base - affiliate) * override) : 0
  const camrhia = r2(price - apple - affiliate - master)

  const rows = [
    { label: "Apple's cut", value: apple, color: '#9AA0A6', show: true, note: `${pct(APPLE_RATE)} of the price` },
    { label: 'Affiliate commission', value: affiliate, color: '#3A4A6B', show: true, note: `${pct(rate)} of ${usd(base)}` },
    { label: 'Master partner bonus', value: master, color: '#A9853F', show: hasMaster, note: `${pct(override)} of what's left after the affiliate` },
    { label: 'Camrhia keeps', value: camrhia, color: '#6E7E60', show: true, note: 'before processing fees and taxes' },
  ].filter((r) => r.show)

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-line bg-card p-6">
        <h2 className="font-fraunces text-xl font-semibold text-ink">How the money is split</h2>
        <ol className="mt-4 space-y-2 text-sm text-ink list-decimal list-inside">
          <li>Apple takes <span className="font-medium">15%</span> of the subscription price.</li>
          <li>
            The affiliate who referred the photographer gets <span className="font-medium">20%, 25% or 30%</span> of what&apos;s left,
            based on how many referrals they have (1&ndash;10: 20%, 11&ndash;25: 25%, 26+: 30%).
          </li>
          <li>
            If that affiliate is on a master&apos;s team, the master gets <span className="font-medium">a share of what&apos;s left after the affiliate is paid</span>.
            This never reduces the affiliate&apos;s share.
          </li>
          <li>Camrhia keeps the rest.</li>
        </ol>
        <p className="mt-4 text-sm text-ink-soft">Yearly plans use the same percentages on the yearly price, paid once a year.</p>
      </section>

      <section className="rounded-2xl border border-line bg-card p-6 space-y-5">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <label className="text-sm text-ink space-y-1.5 block">
            <span className="block font-medium">Plan</span>
            <select className={`${selectCls} w-full`} value={planKey} onChange={(e) => setPlanKey(e.target.value)}>
              {PLANS.map((p) => <option key={p.key} value={p.key}>{p.label} ({usd(p.price)})</option>)}
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

      <section className="rounded-2xl border border-line bg-card p-6">
        <h2 className="font-fraunces text-xl font-semibold text-ink">Every scenario, side by side</h2>
        <p className="mt-1 text-sm text-ink-soft">Per subscriber, per month, after Apple&apos;s 15%.</p>
        <p className="mt-5 text-sm font-medium text-ink">Sold by an affiliate with no master</p>
        <PayoutTable withMaster={false} override={masterShare} />
        <p className="mt-6 text-sm font-medium text-ink">Sold by an affiliate on a master&apos;s team ({pct(masterShare)} master share)</p>
        <PayoutTable withMaster={true} override={masterShare} />
      </section>

      <section className="rounded-2xl border border-line bg-card p-6 text-sm text-ink-soft space-y-2">
        <p>Commissions are paid on each real charge. The 14-day free trial earns nothing; the first payment after it does.</p>
        <p>Affiliates and master partners are independent partners and are responsible for their own taxes.</p>
      </section>
    </div>
  )
}

// Monthly earnings for n active subscribers on one plan. Each referral's rate is set by its
// position (1-10: 20%, 11-25: 25%, 26+: 30%), unless the affiliate has a custom flat rate.
function monthlyEarn(n: number, price: number, customRate: number | null) {
  const base = r2(price * (1 - APPLE_RATE))
  if (customRate != null) return r2(base * customRate * n)
  const t1 = Math.min(n, 10)
  const t2 = Math.max(0, Math.min(n, 25) - 10)
  const t3 = Math.max(0, n - 25)
  return r2(r2(base * 0.2) * t1 + r2(base * 0.25) * t2 + r2(base * 0.3) * t3)
}

function AffiliateBreakdown({ a }: { a: ShellAffiliate }) {
  const tiers = [
    { label: '1\u201310 referrals', rt: 0.2 },
    { label: '11\u201325 referrals', rt: 0.25 },
    { label: '26+ referrals', rt: 0.3 },
  ]
  const plans = [
    { label: 'Solo', price: 59.99 },
    { label: 'Studio', price: 149 },
  ]
  const custom = a.commission_rate != null && ![0.2, 0.25, 0.3].includes(Number(a.commission_rate))
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-line bg-card p-6">
        <h2 className="font-fraunces text-xl font-semibold text-ink">What you earn</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Per photographer, per month, for as long as they stay subscribed.{custom ? ` Your rate is ${pct(Number(a.commission_rate))}.` : ''}
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={th}>Plan</th>
                <th className={th}>Your referrals</th>
                <th className={th}>Rate</th>
                <th className={th}>You earn / month</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line border-t border-line">
              {plans.flatMap((p) =>
                tiers.map((t) => (
                  <tr key={p.label + t.rt}>
                    <td className={td + ' text-ink font-medium'}>{p.label} ({usd(p.price)})</td>
                    <td className={td + ' text-ink-soft'}>{t.label}</td>
                    <td className={td + ' text-ink'}>{pct(t.rt)}</td>
                    <td className={td + ' text-ink font-semibold'}>{usd(r2(r2(p.price * (1 - APPLE_RATE)) * t.rt))}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-ink-soft">Amounts are after the App Store fee. Yearly plans pay the same percentage once a year.</p>
      </section>

      <section className="rounded-2xl border border-line bg-card p-6">
        <h2 className="font-fraunces text-xl font-semibold text-ink">What it adds up to</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Your monthly earnings if this many photographers are subscribed at the same time.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={th}>Active photographers</th>
                <th className={th}>On Solo / month</th>
                <th className={th}>On Studio / month</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line border-t border-line">
              {[10, 20, 50, 100, 500].map((n) => (
                <tr key={n}>
                  <td className={td + ' text-ink font-medium'}>{n}</td>
                  <td className={td + ' text-ink font-semibold'}>{usd(monthlyEarn(n, 59.99, custom ? Number(a.commission_rate) : null))}</td>
                  <td className={td + ' text-ink font-semibold'}>{usd(monthlyEarn(n, 149, custom ? Number(a.commission_rate) : null))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-ink-soft">
          Your rate rises as you grow, so these totals include the step-ups at 11 and 26 referrals. Each total assumes everyone is on that one plan; a mix of plans lands in between.
        </p>
      </section>

      <section className="rounded-2xl border border-line bg-card p-6 text-sm text-ink-soft space-y-2">
        <p>Commissions are paid on each real charge. The 14-day free trial earns nothing; the first payment after it does.</p>
        <p>You are an independent partner and responsible for your own taxes.</p>
      </section>
    </div>
  )
}

export default function PayPage() {
  return (
    <AffiliateShell title="Pay breakdown" subtitle="Where the money goes.">
      {(a) => (a.is_master ? <MasterBreakdown a={a} /> : <AffiliateBreakdown a={a} />)}
    </AffiliateShell>
  )
}
