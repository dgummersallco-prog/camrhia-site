'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin'

type Aff = { name: string; ok: boolean; note: string }
type Gates = { aff: Aff[]; target: string }
type Bill = { id: string; name: string; amount: string }
type MonthData = Record<string, string>
type Months = Record<string, MonthData>
type Live = { trials: number; cancelled: number }

const DEFAULT_GATES: Gates = { aff: [{ name: '', ok: false, note: '' }, { name: '', ok: false, note: '' }, { name: '', ok: false, note: '' }], target: '25' }

const num = (v: string | undefined) => { const n = parseFloat((v ?? '').replace(/[$,%\s]/g, '')); return Number.isFinite(n) ? n : null }
const money = (n: number | null) => (n === null ? '—' : (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 2 }))
const pct = (n: number | null) => (n === null ? '—' : n.toFixed(1) + '%')
const monthKey = (d: Date) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
const monthLabel = (k: string) => new Date(k + '-01T12:00:00').toLocaleString('en-US', { month: 'short' })

export default function ScoreboardPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [gates, setGates] = useState<Gates>(DEFAULT_GATES)
  const [bills, setBills] = useState<Bill[]>([])
  const [months, setMonths] = useState<Months>({})
  const [live, setLive] = useState<Record<string, Live>>({})
  const [liveNow, setLiveNow] = useState({ active: 0, mrr: 0, comm: 0 })

  const keys = useMemo(() => {
    const out: string[] = []
    const d = new Date(); d.setDate(1)
    for (let i = 3; i >= 0; i--) { const x = new Date(d.getFullYear(), d.getMonth() - i, 1); out.push(monthKey(x)) }
    return out
  }, [])
  const cur = keys[keys.length - 1]

  useEffect(() => {
    (async () => {
      if (!supabase) { setErr('Supabase is not configured.'); return }
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/admin/login'); return }
      try {
        const kv = await supabase.from('admin_kv').select('key, value')
        if (kv.error) setErr('Run the Supabase SQL for the scoreboard first (' + kv.error.message + ')')
        for (const r of (kv.data ?? []) as { key: string; value: unknown }[]) {
          if (r.key === 'gates') setGates({ ...DEFAULT_GATES, ...(r.value as Gates) })
          if (r.key === 'bills') setBills(r.value as Bill[])
          if (r.key === 'months') setMonths(r.value as Months)
        }
        const lv: Record<string, Live> = {}
        for (const k of keys) {
          const start = new Date(k + '-01T00:00:00')
          const end = new Date(start.getFullYear(), start.getMonth() + 1, 1)
          const [t, c] = await Promise.all([
            supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('account_type', 'photographer').gte('created_at', start.toISOString()).lt('created_at', end.toISOString()),
            supabase.from('churn_log').select('*', { count: 'exact', head: true }).gte('canceled_at', start.toISOString()).lt('canceled_at', end.toISOString()),
          ])
          lv[k] = { trials: t.count ?? 0, cancelled: c.count ?? 0 }
        }
        setLive(lv)
        const [mo, an, rf] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('subscription_status', 'active').eq('billing_interval', 'monthly'),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('subscription_status', 'active').eq('billing_interval', 'annual'),
          supabase.from('referrals').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        ])
        const m = mo.count ?? 0, a = an.count ?? 0
        setLiveNow({ active: m + a, mrr: Math.round(m * 8.99 + a * (89.99 / 12)), comm: Math.round((rf.count ?? 0) * 11.8 * 100) / 100 })
      } catch (e) { setErr(e instanceof Error ? e.message : 'Failed to load') }
      setReady(true)
    })()
  }, [router, keys])

  async function save(key: string, value: unknown) {
    if (!supabase) return
    const { error } = await supabase.from('admin_kv').upsert({ key, value, updated_at: new Date().toISOString() })
    setErr(error ? error.message : null)
  }

  function autoVal(k: string, f: string): number | null {
    if (f === 'trials') return live[k]?.trials ?? null
    if (f === 'cancelled') return live[k]?.cancelled ?? null
    if (k === cur && f === 'totalSubs') return liveNow.active
    if (k === cur && f === 'mrr') return liveNow.mrr
    if (k === cur && f === 'comm') return liveNow.comm
    return null
  }
  function val(k: string, f: string): number | null {
    const t = num(months[k]?.[f])
    return t !== null ? t : autoVal(k, f)
  }

  const billsTotal = bills.reduce((s, b) => s + (num(b.amount) ?? 0), 0)

  function calc(k: string) {
    const ad = val(k, 'ad'), trials = val(k, 'trials'), newS = val(k, 'newSubs'), canc = val(k, 'cancelled')
    const tot = val(k, 'totalSubs'), mrr = val(k, 'mrr'), comm = val(k, 'comm') ?? 0
    const cac = ad !== null && newS ? ad / newS : null
    const cpt = ad !== null && trials ? ad / trials : null
    const conv = newS !== null && trials ? (newS / trials) * 100 : null
    const base = tot !== null && canc !== null ? tot + canc - (newS ?? 0) : null
    const churn = base && canc !== null ? (canc / base) * 100 : null
    const totalCost = (ad ?? 0) + billsTotal + comm
    const perPhoto = tot ? totalCost / tot : null
    const gm = mrr ? ((mrr - comm) / mrr) * 100 : null
    const arpu = mrr !== null && tot ? mrr / tot : null
    const ltv = arpu !== null && churn ? arpu / (churn / 100) : null
    const ltvcac = ltv !== null && cac ? ltv / cac : null
    const profit = mrr !== null ? mrr - totalCost : null
    return { cac, cpt, conv, churn, fixed: billsTotal, totalCost, perPhoto, gm, ltvcac, profit }
  }

  const adSpendTotal = keys.reduce((s, k) => s + (val(k, 'ad') ?? 0), 0)
  const affDone = gates.aff.filter((a) => a.ok).length
  const target = num(gates.target) ?? 0
  const g1 = affDone >= 3
  const g2 = target > 0 && liveNow.active >= target

  function setGate(next: Gates, persist = true) { setGates(next); if (persist) save('gates', next) }
  function setBillList(next: Bill[], persist = true) { setBills(next); if (persist) save('bills', next) }
  function setCell(k: string, f: string, v: string) { setMonths((m) => ({ ...m, [k]: { ...(m[k] ?? {}), [f]: v } })) }

  if (!ready) return <div className="min-h-screen flex items-center justify-center"><p className="text-ink-soft text-sm animate-pulse">Loading…</p></div>

  const card = 'rounded-2xl bg-card border border-line p-6'
  const inp = 'w-full rounded-lg border border-line bg-white/70 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-twilight'
  const head = 'font-mono text-xs tracking-widest uppercase text-ink-soft/60'

  const Gate = ({ n, title, done, locked, children }: { n: number; title: string; done: boolean; locked?: boolean; children?: React.ReactNode }) => (
    <div className={card + (locked ? ' opacity-60' : '')}>
      <div className="flex items-center gap-3 mb-4">
        <span className={'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ' + (done ? 'bg-twilight text-white' : 'border border-line text-ink-soft')}>{done ? '✓' : n}</span>
        <p className="font-fraunces text-lg font-semibold text-ink">{title}</p>
      </div>
      {children}
    </div>
  )

  const rows: { label: string; f?: string; get?: (c: ReturnType<typeof calc>) => string }[] = [
    { label: 'Marketing spend', f: 'ad' },
    { label: 'Free trials', f: 'trials' },
    { label: 'New subscribers', f: 'newSubs' },
    { label: 'Cancelled subscribers', f: 'cancelled' },
    { label: 'Total subscribers', f: 'totalSubs' },
    { label: 'MRR', f: 'mrr' },
    { label: 'Affiliate commissions', f: 'comm' },
    { label: 'CAC', get: (c) => money(c.cac) },
    { label: 'Cost per trial', get: (c) => money(c.cpt) },
    { label: 'Trial conversion %', get: (c) => pct(c.conv) },
    { label: 'Monthly churn %', get: (c) => pct(c.churn) },
    { label: 'Fixed operating costs', get: (c) => money(c.fixed) },
    { label: 'Total cost to serve', get: (c) => money(c.totalCost) },
    { label: 'Cost per photographer', get: (c) => money(c.perPhoto) },
    { label: 'Gross margin %', get: (c) => pct(c.gm) },
    { label: 'LTV : CAC', get: (c) => (c.ltvcac === null ? '—' : c.ltvcac.toFixed(1) + ' : 1') },
    { label: 'Pre-tax profit', get: (c) => money(c.profit) },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 mx-auto w-full max-w-6xl px-6 py-8">
        <h1 className="font-fraunces text-2xl font-semibold text-ink">Scoreboard</h1>
        <p className="text-sm text-ink-soft mt-0.5 mb-8">Three gates before you scale, your bills, and the monthly numbers.</p>
        {err && <p className="mb-4 rounded-xl border border-line bg-card px-4 py-3 text-sm text-ink-soft">{err}</p>}

        <p className={head + ' mb-4'}>The plan</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <Gate n={1} title="Affiliates say it's better" done={g1}>
            <p className="text-xs text-ink-soft mb-3">{affDone} of 3 said yes, this beats the software they had and gives them everything.</p>
            <div className="space-y-3">
              {gates.aff.map((a, i) => (
                <div key={i} className="rounded-xl border border-line p-3">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={a.ok} onChange={(e) => setGate({ ...gates, aff: gates.aff.map((x, j) => (j === i ? { ...x, ok: e.target.checked } : x)) })} />
                    <input className={inp} placeholder={'Affiliate ' + (i + 1)} value={a.name} onChange={(e) => setGate({ ...gates, aff: gates.aff.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) }, false)} onBlur={() => save('gates', gates)} />
                  </div>
                  <input className={inp + ' mt-2'} placeholder="What they said / what's missing" value={a.note} onChange={(e) => setGate({ ...gates, aff: gates.aff.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)) }, false)} onBlur={() => save('gates', gates)} />
                </div>
              ))}
            </div>
          </Gate>
          <Gate n={2} title="Real paying subscribers" done={g2}>
            <p className="text-xs text-ink-soft mb-3">Bootstrap ads until paying subscribers prove it.</p>
            <p className="font-fraunces text-3xl font-semibold text-ink">{liveNow.active}<span className="text-lg text-ink-soft"> / {target || '—'}</span></p>
            <div className="mt-3 h-2 rounded-full bg-line overflow-hidden"><div className="h-full bg-twilight" style={{ width: Math.min(100, target ? (liveNow.active / target) * 100 : 0) + '%' }} /></div>
            <label className="mt-4 block text-xs text-ink-soft">Paying subscribers target
              <input className={inp + ' mt-1'} value={gates.target} onChange={(e) => setGate({ ...gates, target: e.target.value }, false)} onBlur={() => save('gates', gates)} />
            </label>
            <p className="mt-3 text-xs text-ink-soft">Ad spend logged so far: {money(adSpendTotal)}</p>
          </Gate>
          <Gate n={3} title="Scale" done={g1 && g2} locked={!(g1 && g2)}>
            <p className="text-sm text-ink-soft">{g1 && g2 ? 'Both gates are cleared. Time to go big.' : 'Unlocks when gates 1 and 2 are cleared.'}</p>
          </Gate>
        </div>

        <p className={head + ' mb-4'}>Monthly bills</p>
        <div className={card + ' mb-10'}>
          <div className="space-y-2">
            {bills.map((b) => (
              <div key={b.id} className="flex gap-2">
                <input className={inp} placeholder="Bill (Supabase, Netlify, domain…)" value={b.name} onChange={(e) => setBillList(bills.map((x) => (x.id === b.id ? { ...x, name: e.target.value } : x)), false)} onBlur={() => save('bills', bills)} />
                <input className={inp + ' max-w-[130px]'} placeholder="$ / month" value={b.amount} onChange={(e) => setBillList(bills.map((x) => (x.id === b.id ? { ...x, amount: e.target.value } : x)), false)} onBlur={() => save('bills', bills)} />
                <button className="px-2 text-ink-soft hover:text-ink" onClick={() => setBillList(bills.filter((x) => x.id !== b.id))} aria-label="Remove bill">✕</button>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between">
            <button className="rounded-full border border-line px-4 py-1.5 text-sm text-ink hover:bg-white/70" onClick={() => setBillList([...bills, { id: Math.random().toString(36).slice(2), name: '', amount: '' }])}>+ Add a bill</button>
            <p className="text-sm text-ink">Fixed costs per month: <span className="font-semibold">{money(billsTotal)}</span></p>
          </div>
        </div>

        <p className={head + ' mb-4'}>Monthly performance</p>
        <div className={card + ' overflow-x-auto'}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink">
                <th className="py-2 pr-4 font-semibold">Metric</th>
                {keys.map((k) => <th key={k} className="py-2 px-2 font-semibold min-w-[110px]">{monthLabel(k)}{k === cur ? ' (now)' : ''}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-t border-line">
                  <td className="py-2 pr-4 text-ink">{r.label}</td>
                  {keys.map((k) => (
                    <td key={k} className="py-1.5 px-2">
                      {r.f ? (
                        <input className={inp} inputMode="decimal" placeholder={autoVal(k, r.f) !== null ? String(autoVal(k, r.f)) : '—'} value={months[k]?.[r.f] ?? ''} onChange={(e) => setCell(k, r.f!, e.target.value)} onBlur={() => save('months', months)} />
                      ) : (
                        <span className="text-ink-soft">{r.get!(calc(k))}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-xs text-ink-soft">Gray placeholders come from your database (trials, cancellations, and this month&apos;s subscribers, MRR and commissions). Type over one to set your own. Everything below the inputs calculates itself.</p>
        </div>
      </main>
    </div>
  )
}
