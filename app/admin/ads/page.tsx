'use client'

import { Fragment, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Ad = {
  id: string
  name: string
  started_on: string | null
  cost_total: number
  visits: number
  downloads: number
  trials: number
  paying: number
  retained: number | null
  notes: string | null
}

const LIFETIME_CAP_MONTHS = 24
const SPENDS = [100, 200, 500, 1000]
const CPVS = [0.25, 0.5, 0.75, 1]
const LTV_MONTHS = [1, 3, 6, 12, 18, 24]
const LTV_CACS = [10, 25, 50, 75, 100]
const LTV_SUBS = [1, 10, 25, 50, 100, 500, 1000]
const CONVS = [0.5, 1, 1.5, 2, 3, 5, 7.5, 10]

function usd(n: number): string {
  const r = Math.round(Math.abs(n) * 100) / 100
  return (n < 0 && r > 0 ? '-' : '') + '$' + r.toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(r) ? 0 : 2, maximumFractionDigits: 2 })
}

function pct(n: number): string {
  return `${Number(n.toFixed(1))}%`
}

function ratio(a: number, b: number): number {
  return b > 0 ? a / b : 0
}

async function call(action: string, payload: Record<string, unknown> = {}) {
  const { data: { session } } = await supabase!.auth.getSession()
  const res = await fetch('/api/admin/ads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
    body: JSON.stringify({ action, ...payload }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Request failed')
  return json
}

function NumIn({ value, onChange, onBlur, prefix, w = 'w-28' }: { value: number | null; onChange: (v: number | null) => void; onBlur: () => void; prefix?: string; w?: string }) {
  return (
    <span className="relative inline-block">
      {prefix && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-soft">{prefix}</span>}
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step="any"
        placeholder="0"
        value={value === null || value === 0 ? '' : value}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        onBlur={onBlur}
        className={`${w} rounded-xl border border-line bg-paper py-3 pr-5 font-fraunces text-lg font-semibold text-ink outline-none focus:border-twilight ${prefix ? 'pl-7' : 'pl-3'}`}
      />
    </span>
  )
}

function Row({ n, title, input, result, control }: { n: number; title: string; input: React.ReactNode; result?: React.ReactNode; control: string }) {
  return (
    <div className="flex gap-4 border-t border-line py-4 first:border-0">
      <span className="mt-1.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-twilight text-xs font-medium text-white">{n}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="w-44 text-sm font-medium text-ink">{title}</p>
          {input}
          {result ? <p className="text-sm text-ink-soft">{result}</p> : null}
        </div>
        <p className="mt-1 text-xs italic text-ink-soft/80">You control: {control}</p>
      </div>
    </div>
  )
}

function AdCard({ ad, net, onChange, onSave, onDelete, footer }: { ad: Ad; net: number; onChange: (patch: Partial<Ad>) => void; onSave: () => void; onDelete?: () => void; footer?: React.ReactNode }) {
  const cost = ad.cost_total
  const cpv = ratio(cost, ad.visits)
  const cpd = ratio(cost, ad.downloads)
  const cpt = ratio(cost, ad.trials)
  const cac = ratio(cost, ad.paying)

  const churnKnown = ad.paying > 0 && ad.retained !== null
  const churn = churnKnown ? Math.min(1, Math.max(0, 1 - (ad.retained as number) / ad.paying)) : 1
  const months = churn > 0 ? Math.min(LIFETIME_CAP_MONTHS, 1 / churn) : LIFETIME_CAP_MONTHS
  const ltv = net * months
  const back = cac > 0 ? ltv / cac : 0
  const tone = back >= 3 ? 'text-twilight' : back >= 1 ? 'text-ink' : 'text-red-700'

  return (
    <section className="mt-8 rounded-2xl border border-line bg-card p-8">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={ad.name}
          onChange={(e) => onChange({ name: e.target.value })}
          onBlur={onSave}
          className="min-w-0 flex-1 rounded-xl border border-transparent bg-transparent px-2 py-1 font-fraunces text-xl font-semibold text-ink outline-none hover:border-line focus:border-twilight"
          aria-label="Ad name"
        />
        <input
          type="date"
          value={ad.started_on ?? ''}
          onChange={(e) => onChange({ started_on: e.target.value || null })}
          onBlur={onSave}
          className="rounded-xl border border-line bg-paper px-3 py-1.5 text-sm text-ink-soft outline-none focus:border-twilight"
          aria-label="Start date"
        />
        {onDelete && <button type="button" onClick={onDelete} className="text-xs text-ink-soft underline hover:text-red-700">Delete</button>}
      </div>

      <div className="mt-2">
        <Row
          n={1}
          title="Ad cost (with fees)"
          input={<NumIn value={ad.cost_total} onChange={(v) => onChange({ cost_total: v ?? 0 })} onBlur={onSave} prefix="$" />}
          control="the ad's picture and words, who sees it, and your budget."
        />
        <Row
          n={2}
          title="Visits to the site"
          input={<NumIn value={ad.visits} onChange={(v) => onChange({ visits: v ?? 0 })} onBlur={onSave} />}
          result={ad.visits > 0 && cost > 0 ? `${usd(cpv)} per visit` : undefined}
          control="how well the ad grabs the right people."
        />
        <Row
          n={3}
          title="App downloads"
          input={<NumIn value={ad.downloads} onChange={(v) => onChange({ downloads: v ?? 0 })} onBlur={onSave} />}
          result={ad.downloads > 0 && ad.visits > 0 ? `${pct(ratio(ad.downloads, ad.visits) * 100)} of visits downloaded · ${usd(cpd)} per download` : undefined}
          control="your site's first screen and your App Store page."
        />
        <Row
          n={4}
          title="Free trials started"
          input={<NumIn value={ad.trials} onChange={(v) => onChange({ trials: v ?? 0 })} onBlur={onSave} />}
          result={ad.trials > 0 && ad.downloads > 0 ? `${pct(ratio(ad.trials, ad.downloads) * 100)} of downloads started a trial · ${usd(cpt)} per trial` : undefined}
          control="sign-up and onboarding inside the app."
        />
        <Row
          n={5}
          title="Paying subscribers"
          input={<NumIn value={ad.paying} onChange={(v) => onChange({ paying: v ?? 0 })} onBlur={onSave} />}
          result={ad.paying > 0 && ad.trials > 0 ? `${pct(ratio(ad.paying, ad.trials) * 100)} of trials paid · ${usd(cac)} per paying subscriber` : ad.trials > 0 ? 'Trials turn paid after 14 days, so this fills in later.' : undefined}
          control="the product, the price, and trial reminders."
        />
        <Row
          n={6}
          title="Still paying after 1 month"
          input={<NumIn value={ad.retained} onChange={(v) => onChange({ retained: v })} onBlur={onSave} />}
          result={churnKnown ? `${pct(ratio(ad.retained as number, ad.paying) * 100)} stayed` : 'Leave empty until you know. The math assumes everyone leaves.'}
          control="how well the product keeps people: support, features, updates."
        />
      </div>

      <div className="mt-2 rounded-xl bg-paper p-4">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-soft/60">So, was this ad worth it?</p>
        {ad.paying > 0 && cost > 0 ? (
          <p className="mt-2 text-sm leading-relaxed text-ink">
            Each paying subscriber cost you <span className="font-medium">{usd(cac)}</span> and is worth about <span className="font-medium">{usd(ltv)}</span>{' '}
            ({churnKnown ? `based on ${pct(churn * 100)} leaving after the first month` : 'worst case, everyone leaves after one month'}).{' '}
            <span className={`font-fraunces text-xl font-semibold ${tone}`}>{back.toFixed(1)}x back</span>
            <span className="text-ink-soft"> (3x or more is healthy, under 1x loses money)</span>
          </p>
        ) : (
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            No paying subscribers yet.{cost > 0 && net > 0 ? ` You spent ${usd(cost)}, so ${Math.ceil(cost / net)} paying subscriber${Math.ceil(cost / net) === 1 ? '' : 's'} pay it back in the first month.` : ''}
          </p>
        )}
      </div>
      {footer}
    </section>
  )
}

function adMetrics(ad: Ad, net: number) {
  const cac = ad.paying > 0 ? ad.cost_total / ad.paying : 0
  const churnKnown = ad.paying > 0 && ad.retained !== null
  const churn = churnKnown ? Math.min(1, Math.max(0, 1 - (ad.retained as number) / ad.paying)) : 1
  const months = churn > 0 ? Math.min(LIFETIME_CAP_MONTHS, 1 / churn) : LIFETIME_CAP_MONTHS
  const ltv = net * months
  return {
    cac,
    good: ad.paying > 0 && cac <= net,
    bad: ad.paying > 0 && cac > net,
    churnKnown,
    months,
    ltv,
    back: cac > 0 ? ltv / cac : 0,
    cpv: ratio(ad.cost_total, ad.visits),
    conv: ratio(ad.paying, ad.visits) * 100,
  }
}

function newDraft(): Ad {
  return { id: '', name: 'New ad', started_on: new Date().toISOString().slice(0, 10), cost_total: 0, visits: 0, downloads: 0, trials: 0, paying: 0, retained: null, notes: null }
}

export default function AdminAdsPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [ads, setAds] = useState<Ad[]>([])
  const [error, setError] = useState<string | null>(null)
  const net = 51
  const [view, setView] = useState<'cac' | 'profit'>('cac')
  const [ltvView, setLtvView] = useState<'back' | 'total'>('back')
  const [open, setOpen] = useState<string | null>(null)
  const [verdictId, setVerdictId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Ad>(newDraft())

  const load = useCallback(async () => {
    try {
      const { ads: rows } = await call('list')
      setAds(rows as Ad[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load ads')
    }
  }, [])

  useEffect(() => {
    async function check() {
      if (!supabase) { setReady(true); return }
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/admin/login'); return }
      setReady(true)
      load()
    }
    check()
  }, [router, load])

  const patch = (id: string, p: Partial<Ad>) => setAds((prev) => prev.map((a) => (a.id === id ? { ...a, ...p } : a)))

  async function save(id: string) {
    const ad = ads.find((a) => a.id === id)
    if (!ad) return
    try {
      await call('save', { ad })
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save')
    }
  }

  function startNew() {
    setDraft(newDraft())
    setOpen('new')
  }

  async function submitDraft() {
    try {
      const { ad } = await call('save', { ad: draft })
      setAds((prev) => [ad as Ad, ...prev])
      setOpen(null)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit the ad')
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this ad and its numbers?')) return
    try {
      await call('delete', { id })
      setAds((prev) => prev.filter((a) => a.id !== id))
      setOpen(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete')
    }
  }

  if (!ready) return null

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">

      <div className="mb-6 flex gap-2">
        <Link href="/admin/ads" className="rounded-full border px-4 py-1.5 text-sm transition border-twilight bg-twilight/10 text-twilight">Summary</Link>
        <Link href="/admin/ads/my" className="rounded-full border px-4 py-1.5 text-sm transition border-line text-ink-soft hover:border-twilight">My ads</Link>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-fraunces text-3xl font-semibold text-ink">Ads</h1>
          <p className="mt-1 text-sm text-ink-soft">How each ad moves people from a click to a paying subscriber.</p>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

      <section className="mt-8 rounded-2xl border border-line bg-card p-8">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-soft/60">Before you spend: what it takes to break even</p>
        <p className="mt-2 text-sm text-ink-soft">Visits you get for each ad budget at each cost per visit. You keep {usd(net)} per subscriber.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[34rem] text-base">
            <thead>
              <tr className="border-b border-line text-left text-ink-soft">
                <th className="py-3 pr-5 font-medium">Ad spend</th>
                <th className="py-3 pr-5 font-medium">Paying subscribers needed</th>
                {CPVS.map((c) => (
                  <th key={c} className="py-3 pr-5 text-right font-medium">{usd(c)} per visit</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SPENDS.map((sp) => (
                <tr key={sp} className="border-b border-line">
                  <td className="py-4 pr-5 font-fraunces text-xl font-semibold text-ink">{usd(sp)}</td>
                  <td className="py-4 pr-5 text-ink">{Math.ceil(sp / net)}</td>
                  {CPVS.map((c) => (
                    <td key={c} className="py-4 pr-5 text-right text-ink">{Math.round(sp / c).toLocaleString('en-US')} visits</td>
                  ))}
                </tr>
              ))}
              <tr>
                <td className="py-4 pr-5 font-medium text-twilight" colSpan={2}>Visits that must become paying</td>
                {CPVS.map((c) => (
                  <td key={c} className="py-4 pr-5 text-right font-medium text-twilight">{pct((c / net) * 100)}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-ink-soft">The percentage at the bottom depends only on cost per visit. A bigger budget just means more visits and more subscribers needed.</p>
      </section>

      <section className="mt-8 rounded-2xl border border-line bg-card p-8">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setView('cac')} className={`rounded-full border px-4 py-1.5 text-sm transition ${view === 'cac' ? 'border-twilight bg-twilight/10 text-twilight' : 'border-line text-ink-soft hover:border-twilight'}`}>What a subscriber costs (CAC)</button>
          <button type="button" onClick={() => setView('profit')} className={`rounded-full border px-4 py-1.5 text-sm transition ${view === 'profit' ? 'border-twilight bg-twilight/10 text-twilight' : 'border-line text-ink-soft hover:border-twilight'}`}>Profit or loss on a subscriber</button>
        </div>
        <p className="mt-3 text-sm text-ink-soft">
          {view === 'cac'
            ? <>Find your cost per visit across the top and your conversion down the left. Green is {usd(net)} or less. Red is above {usd(net)}.</>
            : <>{usd(net)} kept minus the CAC, for the first month. Green is profit. Red is a loss.</>}
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[30rem] text-base">
            <thead>
              <tr className="text-left text-ink-soft">
                <th className="pb-1 pr-3" />
                <th className="pb-1 text-center font-mono text-xs uppercase tracking-widest" colSpan={CPVS.length}>Cost per visit</th>
              </tr>
              <tr className="border-b border-line text-left text-ink-soft">
                <th className="py-3 pr-5 font-medium">Conversion (visits that become paying)</th>
                {CPVS.map((c) => (
                  <th key={c} className="py-3 pr-5 text-right font-medium">{usd(c)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CONVS.map((v) => (
                <tr key={v} className="border-b border-line last:border-0">
                  <td className="py-4 pr-5 font-fraunces text-xl font-semibold text-ink">{pct(v)}</td>
                  {CPVS.map((c) => {
                    const cac = c / (v / 100)
                    return (
                      <td key={c} className={`py-4 pr-5 text-right font-medium ${cac <= net ? 'text-sage' : 'text-red-700'}`}>{view === 'cac' ? usd(Math.round(cac)) : (Math.round(net - cac) > 0 ? '+' : '') + usd(Math.round(net - cac))}</td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-ink-soft">CAC = cost per visit ÷ conversion. Example: $0.50 ÷ 1% = $50.</p>
      </section>

      <section className="mt-8 rounded-2xl border border-line bg-card p-8">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-soft/60">The one formula</p>
        <p className="mt-2 font-fraunces text-2xl font-semibold text-ink">CAC = cost per visit ÷ conversion rate of paying subscribers</p>
        <p className="mt-2 text-sm text-ink-soft">CAC is what one paying subscriber costs you.</p>

        <div className="mt-5 rounded-xl bg-paper p-4">
          <p className="font-fraunces text-xl font-semibold text-ink">CAC break even is {usd(net)}</p>
          <p className="mt-1 text-sm text-ink-soft">$59.99 Solo monthly minus Apple's 15% = about {usd(net)} kept. Pay less than {usd(net)} per subscriber and you are ahead after the first month.</p>
        </div>

        <p className="mt-5 font-mono text-xs uppercase tracking-widest text-ink-soft/60">Examples</p>
        <div className="mt-2 space-y-2 text-sm text-ink">
          <p>$0.55 per visit ÷ 1% = <span className="font-medium">$55 CAC</span> <span className="text-red-700">(-$4, a loss)</span></p>
          <p>$0.55 per visit ÷ 1.1% = <span className="font-medium">$50 CAC</span> <span className="text-sage">(about break even)</span></p>
          <p>$0.55 per visit ÷ 3% = <span className="font-medium">$18 CAC</span> <span className="text-sage">(+$33 profit)</span></p>
          <p>$0.25 per visit ÷ 10% = <span className="font-medium">$2.50 CAC</span> <span className="text-sage">(+$48 profit, the dream)</span></p>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-line bg-card p-8">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-soft/60">Lifetime value</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setLtvView('back')} className={`rounded-full border px-4 py-1.5 text-sm transition ${ltvView === 'back' ? 'border-twilight bg-twilight/10 text-twilight' : 'border-line text-ink-soft hover:border-twilight'}`}>Payback on my CAC</button>
          <button type="button" onClick={() => setLtvView('total')} className={`rounded-full border px-4 py-1.5 text-sm transition ${ltvView === 'total' ? 'border-twilight bg-twilight/10 text-twilight' : 'border-line text-ink-soft hover:border-twilight'}`}>Total from many subscribers</button>
        </div>
        <p className="mt-3 text-sm text-ink-soft">
          {ltvView === 'back'
            ? <>CAC is what you paid to get one subscriber. Each box is what that subscriber earns you over their stay, divided by their CAC. Green is 3x or more. Red is under 1x (you lose money).</>
            : <>What you keep in total from that many subscribers, if they each stay that long ({usd(net)} a month each).</>}
        </p>
        <div className="mt-4 overflow-x-auto">
          {ltvView === 'back' ? (
            <table className="w-full min-w-[36rem] text-base">
              <thead>
                <tr className="text-left text-ink-soft">
                  <th className="pb-1 pr-3" colSpan={2} />
                  <th className="pb-1 text-center font-mono text-xs uppercase tracking-widest" colSpan={LTV_CACS.length}>CAC: what you paid for one subscriber</th>
                </tr>
                <tr className="border-b border-line text-left text-ink-soft">
                  <th className="py-3 pr-5 font-medium">How long they stay</th>
                  <th className="py-3 pr-5 text-right font-medium">One subscriber is worth</th>
                  {LTV_CACS.map((c) => (
                    <th key={c} className="py-3 pr-5 text-right font-medium">{usd(c)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {LTV_MONTHS.map((mo) => {
                  const ltv = net * mo
                  return (
                    <tr key={mo} className="border-b border-line last:border-0">
                      <td className="py-4 pr-5">
                        <span className="font-fraunces text-xl font-semibold text-ink">{mo} {mo === 1 ? 'month' : 'months'}</span>
                        <span className="ml-2 text-xs text-ink-soft">{pct(100 / mo)} churn</span>
                      </td>
                      <td className="py-4 pr-5 text-right text-ink">{usd(Math.round(ltv))}</td>
                      {LTV_CACS.map((c) => {
                        const back = ltv / c
                        return (
                          <td key={c} className={`py-4 pr-5 text-right font-medium ${back >= 3 ? 'text-sage' : back >= 1 ? 'text-ink' : 'text-red-700'}`}>{Number(back.toFixed(1))}x</td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <table className="w-full min-w-[36rem] text-base">
              <thead>
                <tr className="text-left text-ink-soft">
                  <th className="pb-1 pr-3" />
                  <th className="pb-1 text-center font-mono text-xs uppercase tracking-widest" colSpan={LTV_SUBS.length}>Paying subscribers</th>
                </tr>
                <tr className="border-b border-line text-left text-ink-soft">
                  <th className="py-3 pr-5 font-medium">How long they stay</th>
                  {LTV_SUBS.map((n) => (
                    <th key={n} className="py-3 pr-5 text-right font-medium">{n.toLocaleString('en-US')}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {LTV_MONTHS.map((mo) => (
                  <tr key={mo} className="border-b border-line last:border-0">
                    <td className="py-4 pr-5">
                      <span className="font-fraunces text-xl font-semibold text-ink">{mo} {mo === 1 ? 'month' : 'months'}</span>
                      <span className="ml-2 text-xs text-ink-soft">{pct(100 / mo)} churn</span>
                    </td>
                    {LTV_SUBS.map((n) => (
                      <td key={n} className="py-4 pr-5 text-right font-medium text-ink">{usd(Math.round(net * mo * n))}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

    </main>
  )
}
