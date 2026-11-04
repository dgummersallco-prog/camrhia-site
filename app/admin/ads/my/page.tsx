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
        <Link href="/admin/ads" className="rounded-full border px-4 py-1.5 text-sm transition border-line text-ink-soft hover:border-twilight">Summary</Link>
        <Link href="/admin/ads/my" className="rounded-full border px-4 py-1.5 text-sm transition border-twilight bg-twilight/10 text-twilight">My ads</Link>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-fraunces text-3xl font-semibold text-ink">My ads</h1>
          <p className="mt-1 text-sm text-ink-soft">Add an ad, then track how each one did.</p>
        </div>
        <button type="button" onClick={startNew} className="rounded-full bg-twilight px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90">+ Add an ad</button>
      </div>

      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

      {open === 'new' && (
        <AdCard
          ad={draft}
          net={net}
          onChange={(p) => setDraft((d) => ({ ...d, ...p }))}
          onSave={() => {}}
          footer={
            <div className="mt-4 flex items-center gap-3">
              <button type="button" onClick={submitDraft} className="rounded-full bg-twilight px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90">Submit ad</button>
              <button type="button" onClick={() => setOpen(null)} className="text-sm text-ink-soft underline">Cancel</button>
            </div>
          }
        />
      )}

      {open && open !== 'new' && ads.find((a) => a.id === open) && (
        <AdCard
          ad={ads.find((a) => a.id === open) as Ad}
          net={net}
          onChange={(p) => patch(open, p)}
          onSave={() => save(open)}
          onDelete={() => remove(open)}
          footer={
            <div className="mt-4">
              <button type="button" onClick={() => setOpen(null)} className="rounded-full border border-line px-5 py-2 text-sm text-ink transition hover:border-twilight">Close</button>
            </div>
          }
        />
      )}

      <section className="mt-8 rounded-2xl border border-line bg-card p-8">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-soft/60">Your ads</p>
        <p className="mt-2 text-sm text-ink-soft">{ads.length === 0 ? 'Placeholders for now. Each ad you submit fills in a row here.' : 'Click a row to open and edit that ad.'}</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[44rem] text-base">
            <thead>
              <tr className="border-b border-line text-left text-ink-soft">
                <th className="py-3 pr-5 font-medium">Ad</th>
                <th className="py-3 pr-5 text-right font-medium">Cost</th>
                <th className="py-3 pr-5 text-right font-medium">Visits</th>
                <th className="py-3 pr-5 text-right font-medium">Cost per visit</th>
                <th className="py-3 pr-5 text-right font-medium">Downloads</th>
                <th className="py-3 pr-5 text-right font-medium">Trials</th>
                <th className="py-3 pr-5 text-right font-medium">Paying</th>
                <th className="py-3 text-right font-medium">CAC</th>
                <th className="py-3 pl-4 text-center font-medium">Result</th>
              </tr>
            </thead>
            <tbody>
              {ads.length === 0
                ? [1, 2, 3].map((i) => (
                    <tr key={i} className="border-b border-line text-ink-soft/50 last:border-0">
                      <td className="py-4 pr-5 font-fraunces text-lg font-semibold">Ad {i}</td>
                      {[0, 1, 2, 3, 4, 5, 6, 7].map((k) => (
                        <td key={k} className="py-4 pr-5 text-right">—</td>
                      ))}
                    </tr>
                  ))
                : ads.map((ad) => {
                    const cac = ad.paying > 0 ? ad.cost_total / ad.paying : 0
                    const m = adMetrics(ad, net)
                    return (
                      <Fragment key={ad.id}>
                      <tr onClick={() => setOpen(ad.id)} className="cursor-pointer border-b border-line last:border-0 hover:bg-paper">
                        <td className="py-4 pr-5">
                          <span className="font-fraunces text-xl font-semibold text-ink">{ad.name}</span>
                          {ad.started_on ? <span className="ml-2 text-xs text-ink-soft">{ad.started_on}</span> : null}
                        </td>
                        <td className="py-4 pr-5 text-right text-ink">{usd(ad.cost_total)}</td>
                        <td className="py-4 pr-5 text-right text-ink">{ad.visits.toLocaleString('en-US')}</td>
                        <td className="py-4 pr-5 text-right text-ink">{ad.visits > 0 && ad.cost_total > 0 ? usd(ad.cost_total / ad.visits) : '—'}</td>
                        <td className="py-4 pr-5 text-right text-ink">{ad.downloads.toLocaleString('en-US')}</td>
                        <td className="py-4 pr-5 text-right text-ink">{ad.trials.toLocaleString('en-US')}</td>
                        <td className="py-4 pr-5 text-right text-ink">{ad.paying.toLocaleString('en-US')}</td>
                        <td className={`py-4 text-right font-medium ${cac === 0 ? 'text-ink-soft' : cac <= net ? 'text-sage' : 'text-red-700'}`}>{cac > 0 ? usd(Math.round(cac)) : '—'}</td>
                        <td className="py-4 pl-4 text-center">
                          {m.good || m.bad ? (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setVerdictId(verdictId === ad.id ? null : ad.id) }}
                              title="See the numbers"
                              className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold text-white transition hover:opacity-80 ${m.good ? 'bg-sage' : 'bg-red-700'}`}
                            >
                              {m.good ? '✓' : '✗'}
                            </button>
                          ) : (
                            <span className="text-ink-soft/50" title="Waiting on paying subscribers">—</span>
                          )}
                        </td>
                      </tr>
                      {verdictId === ad.id && (m.good || m.bad) && (
                        <tr className="border-b border-line bg-paper">
                          <td colSpan={9} className="px-5 py-5">
                            <p className={`font-fraunces text-xl font-semibold ${m.good ? 'text-sage' : 'text-red-700'}`}>
                              {m.good ? 'This ad worked.' : 'This ad has not paid off yet.'}
                            </p>
                            <p className="mt-1 text-sm text-ink-soft">
                              Each paying subscriber cost you {usd(Math.round(m.cac))}. Your break even is {usd(net)}, so you {m.good ? 'make' : 'lose'} {usd(Math.abs(Math.round(net - m.cac)))} on each one in the first month.
                            </p>
                            <div className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                              <div><p className="text-ink-soft">CAC</p><p className="font-fraunces text-xl font-semibold text-ink">{usd(Math.round(m.cac))}</p></div>
                              <div><p className="text-ink-soft">Cost per visit</p><p className="font-fraunces text-xl font-semibold text-ink">{m.cpv > 0 ? usd(m.cpv) : '—'}</p></div>
                              <div><p className="text-ink-soft">Visits that became paying</p><p className="font-fraunces text-xl font-semibold text-ink">{ad.visits > 0 ? pct(m.conv) : '—'}</p></div>
                              <div><p className="text-ink-soft">Lifetime value payback</p><p className="font-fraunces text-xl font-semibold text-ink">{m.back.toFixed(1)}x</p></div>
                            </div>
                            <p className="mt-3 text-xs text-ink-soft">
                              {m.churnKnown ? `Worth about ${usd(Math.round(m.ltv))} per subscriber, based on your first-month retention.` : `Worth ${usd(Math.round(m.ltv))} per subscriber in the worst case (everyone leaves after one month). Fill in "Still paying after 1 month" for a real number.`}
                            </p>
                          </td>
                        </tr>
                      )}
                      </Fragment>
                    )
                  })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
