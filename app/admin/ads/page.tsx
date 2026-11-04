'use client'

import { useCallback, useEffect, useState } from 'react'
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

const PLANS = [
  { label: 'Solo monthly', net: '50.99' },
  { label: 'Solo yearly', net: '41.79' },
  { label: 'Studio monthly', net: '126.65' },
  { label: 'Studio yearly', net: '70.83' },
]

const LIFETIME_CAP_MONTHS = 24

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
        className={`${w} rounded-xl border border-line bg-paper py-2 pr-3 font-fraunces text-lg font-semibold text-ink outline-none focus:border-twilight ${prefix ? 'pl-7' : 'pl-3'}`}
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

function AdCard({ ad, net, onChange, onSave, onDelete }: { ad: Ad; net: number; onChange: (patch: Partial<Ad>) => void; onSave: () => void; onDelete: () => void }) {
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
    <section className="mt-6 rounded-2xl border border-line bg-card p-6">
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
        <button type="button" onClick={onDelete} className="text-xs text-ink-soft underline hover:text-red-700">Delete</button>
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
    </section>
  )
}

export default function AdminAdsPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [ads, setAds] = useState<Ad[]>([])
  const [error, setError] = useState<string | null>(null)
  const [netS, setNetS] = useState('51')
  const net = Number(netS) || 0

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

  async function addAd() {
    try {
      const { ad } = await call('save', { ad: { name: 'New ad', started_on: new Date().toISOString().slice(0, 10) } })
      setAds((prev) => [ad as Ad, ...prev])
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add the ad')
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this ad and its numbers?')) return
    try {
      await call('delete', { id })
      setAds((prev) => prev.filter((a) => a.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete')
    }
  }

  if (!ready) return null

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-fraunces text-3xl font-semibold text-ink">Ads</h1>
          <p className="mt-1 text-sm text-ink-soft">How each ad moves people from a click to a paying subscriber.</p>
        </div>
        <button type="button" onClick={addAd} className="rounded-full bg-twilight px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90">+ Add an ad</button>
      </div>

      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

      <div className="mt-6 rounded-2xl border border-line bg-card p-5">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-soft/60">What you keep per subscriber, per month</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            value={netS}
            onChange={(e) => setNetS(e.target.value)}
            className="w-28 rounded-xl border border-line bg-paper px-3 py-2 font-fraunces text-lg font-semibold text-ink outline-none focus:border-twilight"
          />
          {PLANS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setNetS(p.net)}
              className={`rounded-full border px-3 py-1 text-xs transition ${netS === p.net ? 'border-twilight bg-twilight/10 text-twilight' : 'border-line text-ink-soft hover:border-twilight'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-ink-soft">After Apple's 15%. This is used to work out what each subscriber is worth.</p>
      </div>

      {ads.length === 0 ? (
        <p className="mt-8 text-sm text-ink-soft">No ads yet. Press “Add an ad” and fill in the numbers as you get them.</p>
      ) : (
        ads.map((ad) => (
          <AdCard
            key={ad.id}
            ad={ad}
            net={net}
            onChange={(p) => patch(ad.id, p)}
            onSave={() => save(ad.id)}
            onDelete={() => remove(ad.id)}
          />
        ))
      )}
    </main>
  )
}
