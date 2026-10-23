"use client"

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { DashboardHeader } from '@/app/components/DashboardHeader'

type Rec = { type: string; name: string; value: string }
type Dom = { domain: string | null; status?: 'pending' | 'ssl' | 'active'; apex?: boolean; record?: Rec; configured?: boolean }

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
        <h1 className="font-fraunces text-3xl font-semibold text-ink md:text-4xl">Your own web address</h1>
        <p className="mt-2 text-sm text-ink-soft">Put your studio&apos;s name on your website. Connect a domain you own, like yourstudio.com, and your website, galleries and booking page all live there, under your name.</p>

        {!dom && !err && <p className="mt-8 text-sm text-ink-soft">Loading…</p>}
        {err && <p className="mt-6 text-sm text-red-700">{err}</p>}

        {dom && !dom.domain && (
          <section className={`${card} mt-8`}>
            <p className="font-fraunces text-xl font-semibold text-ink">Step 1. Enter your domain</p>
            <p className="mt-1 text-sm text-ink-soft">Type the address you want clients to see, like <span className="font-medium text-ink">yourstudio.com</span> or <span className="font-medium text-ink">book.yourstudio.com</span>. Not sure which? An address that starts with <span className="font-medium text-ink">www.</span> or <span className="font-medium text-ink">book.</span> is the quickest to set up and works with every domain company.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="book.yourstudio.com"
                className="min-w-0 flex-1 rounded-xl border border-line bg-paper px-3 py-2.5 text-sm text-ink focus:border-twilight focus:outline-none focus:ring-2 focus:ring-twilight/25" />
              <button type="button" className={btn} disabled={busy || !input.trim()} onClick={connect}>{busy ? 'Connecting…' : 'Connect domain'}</button>
            </div>
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
            <p className="mt-4 text-sm text-ink-soft">
              {dom.status === 'ssl'
                ? 'Step 3. We found your record and are securing your site with HTTPS. This usually takes a few minutes.'
                : 'Step 3. Come back here. We check every 20 seconds and finish setup by ourselves. It usually takes a few minutes, and can take up to a day.'}
            </p>
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
            <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-600" /><p className="text-sm font-semibold text-emerald-700">Your domain is live</p></div>
            <p className="mt-2 font-fraunces text-2xl font-semibold text-ink">{dom.domain}</p>
            <p className="mt-1 text-sm text-ink-soft">Clients who visit this address see your website, your galleries and your booking page.</p>
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
