"use client"

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { DashboardHeader } from '@/app/components/DashboardHeader'

type Rec = { type: string; name: string; value: string }
type Dom = { domain: string | null; status?: 'pending' | 'ssl' | 'active'; apex?: boolean; record?: Rec; configured?: boolean }

type Registrar = { id: string; name: string; steps: (r: Rec) => string[] }

const REGISTRARS: Registrar[] = [
  {
    id: 'godaddy',
    name: 'GoDaddy',
    steps: (r) => [
      'Sign in at godaddy.com and open My Products.',
      'Find your domain and click DNS next to it.',
      'Click Add New Record.',
      `Set Type to ${r.type}, Name to ${r.name}, and Value to ${r.value}. Leave TTL as it is.`,
      'Click Save. If you already see a record with the same Name and Type, edit that one or delete it first.',
    ],
  },
  {
    id: 'namecheap',
    name: 'Namecheap',
    steps: (r) => [
      'Sign in at namecheap.com and open Domain List.',
      'Click Manage next to your domain, then open the Advanced DNS tab.',
      'Click Add New Record.',
      `Choose ${r.type === 'A' ? 'A Record' : 'CNAME Record'}. Put ${r.name} in Host and ${r.value} in Value. Leave TTL on Automatic.`,
      'Click the green check mark to save. Delete any existing record with the same Host first, such as a URL Redirect or parking page record.',
    ],
  },
  {
    id: 'squarespace',
    name: 'Squarespace or Google Domains',
    steps: (r) => [
      'Sign in to your domains page (domains.squarespace.com, or domains.google.com which now redirects there).',
      'Click your domain, then DNS, then DNS Settings.',
      'Scroll to Custom records and click Add record.',
      `Set Host to ${r.name}, Type to ${r.type}, and Data to ${r.value}.`,
      'Click Save. Delete any existing record with the same Host first.',
    ],
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare',
    steps: (r) => [
      'Sign in at dash.cloudflare.com and click your domain.',
      'Open DNS, then Records, then Add record.',
      `Set Type to ${r.type}, Name to ${r.name}, and ${r.type === 'A' ? 'IPv4 address' : 'Target'} to ${r.value}.`,
      'Turn the orange cloud off so it says DNS only. This matters. With the cloud on, setup will not finish.',
      'Click Save. Delete any existing record with the same Name first.',
    ],
  },
  {
    id: 'wix',
    name: 'Wix',
    steps: (r) => [
      'Sign in to Wix and open Domains from your account.',
      'Click the three dots next to your domain and choose Manage DNS Records.',
      `Under ${r.type === 'A' ? 'A (Host)' : 'CNAME (Aliases)'}, click Add Record.`,
      `Put ${r.name} in Host Name and ${r.value} in ${r.type === 'A' ? 'Points to' : 'Value'}.`,
      'Click Save. Delete any existing record with the same host first.',
    ],
  },
  {
    id: 'other',
    name: 'Somewhere else',
    steps: (r) => [
      'Sign in where you bought your domain and find its DNS settings. They are sometimes called DNS Management, Name Servers, or Advanced DNS.',
      'Add a new record.',
      `Set Type to ${r.type}, Name (also called Host) to ${r.name}, and Value (also called Points to or Target) to ${r.value}.`,
      'Save it. If a record with the same name already exists, change or delete that one first.',
      'Stuck? Search "[your registrar name] add DNS record" and use the values above.',
    ],
  },
]

function looksLive(raw: string): boolean {
  const host = raw.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  if (!host.includes('.')) return false
  const parts = host.split('.')
  return parts.length === 2 || parts[0] === 'www'
}

const card = 'rounded-2xl border border-line bg-card p-6'
const btn = 'rounded-full bg-twilight px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50'
const btnGhost = 'rounded-full border border-line px-5 py-2.5 text-sm text-ink hover:bg-paper-deep'

export default function DomainPage() {
  const [dom, setDom] = useState<Dom | null>(null)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [reg, setReg] = useState<string | null>(null)

  const call = useCallback(async (path: string, body?: unknown) => {
    if (!supabase) return null
    const { data } = await supabase.auth.getSession()
    const t = data.session?.access_token
    if (!t) { setErr('Please sign in again.'); return null }
    const res = await fetch(path, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) { setErr(j.error || 'Something went wrong.'); return null }
    return j
  }, [])

  const check = useCallback(async () => {
    const j = await call('/api/domain/status')
    if (j) { setErr(null); setDom(j as Dom) }
  }, [call])

  useEffect(() => { check() }, [check])
  useEffect(() => {
    if (!dom?.domain || dom.status === 'active') return
    const id = setInterval(check, 20000)
    return () => clearInterval(id)
  }, [dom?.domain, dom?.status, check])

  async function connect() {
    setBusy(true); setErr(null)
    const j = await call('/api/domain/connect', { domain: input })
    setBusy(false)
    if (j) { setInput(''); check() }
  }
  async function remove() {
    setBusy(true); setErr(null)
    const j = await call('/api/domain/remove')
    setBusy(false); setConfirmRemove(false)
    if (j) setDom({ domain: null })
  }
  function copy(v: string) {
    navigator.clipboard?.writeText(v)
    setCopied(v)
    setTimeout(() => setCopied((c) => (c === v ? null : c)), 1500)
  }

  return (
    <div className="min-h-screen bg-paper xl:pl-60">
      <DashboardHeader active="website" />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <Link href="/website" className="text-sm text-ink-soft hover:text-ink">← Your website</Link>
        <p className="mb-2 mt-4 font-mono text-xs uppercase tracking-widest text-brass">Your website</p>
        <h1 className="font-fraunces text-3xl font-semibold text-ink md:text-4xl">Your professional web address</h1>
        <p className="mt-2 text-sm text-ink-soft">Look like the established studio you are. Connect your own domain and your website, galleries, booking page and client tools all live under your name, powered by Camrhia. Every inquiry, session and payment still flows straight into your Camrhia app.</p>

        {!dom && !err && <p className="mt-8 text-sm text-ink-soft">Loading…</p>}
        {err && <p className="mt-6 text-sm text-red-700">{err}</p>}

        {dom && !dom.domain && (
          <section className={`${card} mt-8`}>
            <p className="font-fraunces text-xl font-semibold text-ink">Step 1. Enter your professional domain</p>
            <p className="mt-1 text-sm text-ink-soft">Pick the address you want clients to remember, like <span className="font-medium text-ink">yourstudio.com</span> or <span className="font-medium text-ink">book.yourstudio.com</span>. Your clients see your name, and Camrhia runs everything behind it: inquiries, bookings, contracts, galleries and payments. Tip: an address that starts with <span className="font-medium text-ink">book.</span> or <span className="font-medium text-ink">www.</span> is the quickest to set up.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="book.yourstudio.com"
                className="min-w-0 flex-1 rounded-xl border border-line bg-paper px-3 py-2.5 text-sm text-ink focus:border-twilight focus:outline-none focus:ring-2 focus:ring-twilight/25" />
              <button type="button" className={btn} disabled={busy || !input.trim()} onClick={connect}>{busy ? 'Connecting…' : 'Connect domain'}</button>
            </div>
            {looksLive(input) && (
              <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Heads up. If you already have a website on this address, connecting it will replace that site with your Camrhia website. To keep your current site, use a separate address like <span className="font-medium">book.{input.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '')}</span> or <span className="font-medium">studio.</span> in front of your domain instead.
              </p>
            )}
          </section>
        )}

        {dom?.domain && dom.status !== 'active' && dom.record && (
          <section className={`${card} mt-8`}>
            <p className="font-fraunces text-xl font-semibold text-ink">Step 2. Add this record where you bought your domain</p>
            <p className="mt-1 text-sm text-ink-soft">Sign in to wherever you bought <span className="font-medium text-ink">{dom.domain}</span> (GoDaddy, Namecheap, Squarespace, Google and so on), open its DNS settings, and add this record.</p>
            <div className="mt-4 overflow-hidden rounded-xl border border-line">
              {([['Type', dom.record.type], ['Name', dom.record.name], ['Value', dom.record.value]] as [string, string][]).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-3 border-b border-line bg-paper px-4 py-3 last:border-b-0">
                  <span className="w-16 shrink-0 text-xs uppercase tracking-wider text-ink-soft">{k}</span>
                  <span className="min-w-0 flex-1 truncate font-mono text-sm text-ink">{v}</span>
                  <button type="button" onClick={() => copy(v)} className="shrink-0 text-xs text-twilight hover:underline">{copied === v ? 'Copied' : 'Copy'}</button>
                </div>
              ))}
            </div>
            <p className="mt-5 text-sm font-medium text-ink">Where did you buy your domain?</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {REGISTRARS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setReg(reg === r.id ? null : r.id)}
                  className={`rounded-full border px-4 py-2 text-sm transition ${reg === r.id ? 'border-twilight bg-twilight text-white' : 'border-line text-ink hover:border-twilight'}`}
                >
                  {r.name}
                </button>
              ))}
            </div>
            {reg && dom.record && (
              <ol className="mt-4 list-decimal space-y-2 rounded-xl border border-line bg-paper px-6 py-4 text-sm text-ink">
                {(REGISTRARS.find((r) => r.id === reg)?.steps(dom.record) ?? []).map((t, i) => <li key={i}>{t}</li>)}
              </ol>
            )}
            {(dom.apex || dom.domain.startsWith('www.')) && (
              <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                If {dom.domain} already shows a website, adding this record replaces it. Want to keep that site? Remove this domain below and connect an address like book.{dom.domain.replace(/^www\./, '')} instead.
              </p>
            )}
            <p className="mt-4 text-sm text-ink-soft">
              {dom.status === 'ssl'
                ? 'Step 3. We found your record and are securing your site with HTTPS. This usually takes a few minutes.'
                : 'Step 3. Come back here. We check every 20 seconds and finish setup by ourselves. It usually takes a few minutes, and can take up to a day.'}
            </p>
            <details className="mt-4 rounded-xl border border-line bg-paper px-4 py-3 text-sm text-ink-soft">
              <summary className="cursor-pointer font-medium text-ink">Not working yet?</summary>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                <li>Give it 10 to 30 minutes. Some registrars take up to a day to pass the change along.</li>
                <li>In Name (or Host), type only the first part, like <span className="font-mono text-ink">{dom.record.name}</span>, not the whole address, unless your registrar asks for the full name.</li>
                <li>Make sure there is no older record on the same name. Two records with the same name and type will clash, so delete the old one.</li>
                <li>On Cloudflare, the orange cloud must be off (DNS only).</li>
                <li>Check for typos in the Value. Use the Copy buttons above instead of typing it.</li>
                <li>Still stuck after an hour? Email hello@camrhia.com and send a screenshot of your DNS records page. We will sort it out with you.</li>
              </ul>
            </details>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button type="button" className={btn} onClick={check}>Check now</button>
              {!confirmRemove
                ? <button type="button" className={btnGhost} onClick={() => setConfirmRemove(true)}>Remove domain</button>
                : <button type="button" className={btnGhost} disabled={busy} onClick={remove}>Click again to remove {dom.domain}</button>}
            </div>
          </section>
        )}

        {dom?.domain && dom.status === 'active' && (
          <section className={`${card} mt-8`}>
            <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-600" /><p className="text-sm font-semibold text-emerald-700">Your professional address is live</p></div>
            <p className="mt-2 font-fraunces text-2xl font-semibold text-ink">{dom.domain}</p>
            <p className="mt-1 text-sm text-ink-soft">Clients now find you, book, message, sign and pay through your own name, powered by Camrhia.</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <a href={`https://${dom.domain}`} target="_blank" rel="noreferrer" className={btn}>Open {dom.domain}</a>
              {!confirmRemove
                ? <button type="button" className={btnGhost} onClick={() => setConfirmRemove(true)}>Remove domain</button>
                : <button type="button" className={btnGhost} disabled={busy} onClick={remove}>Click again to remove</button>}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
