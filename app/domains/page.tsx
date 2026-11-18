"use client"

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { DashboardHeader } from '@/app/components/DashboardHeader'

type Dom = { domain: string | null; status?: 'pending' | 'ssl' | 'active' }
type Row = { id: string; slug: string; name: string; published: boolean }

const card = 'rounded-2xl border border-line bg-card p-6'
const ghost = 'rounded-full border border-line px-4 py-2 text-sm text-ink transition hover:border-twilight'
const HOST = 'camrhia.com'

export default function DomainsPage() {
  const [dom, setDom] = useState<Dom | null>(null)
  const [rows, setRows] = useState<Row[] | null>(null)
  const [edit, setEdit] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const load = useCallback(async () => {
    const sb = supabase
    if (!sb) return
    const { data: sess } = await sb.auth.getSession()
    const token = sess.session?.access_token
    const uid = sess.session?.user.id
    if (!token || !uid) { setMsg('Please sign in again.'); return }
    const res = await fetch('/api/domain/status', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: '{}' })
    const j = await res.json().catch(() => ({}))
    setDom(res.ok ? (j as Dom) : { domain: null })
    const { data } = await sb.from('funnel_pages').select('id, slug, name, published').eq('owner_id', uid).eq('style', 'special').order('created_at', { ascending: false })
    setRows((data ?? []) as Row[])
  }, [])

  useEffect(() => { load() }, [load])

  const clean = (v: string) => v.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-{2,}/g, '-').slice(0, 40)

  async function saveSlug(r: Row) {
    const sb = supabase
    const next = (edit[r.id] ?? r.slug).replace(/^-+|-+$/g, '')
    if (!sb) return
    if (next.length < 3) { setMsg('A link needs at least 3 letters or numbers.'); return }
    setBusy(r.id); setMsg(null)
    const { error } = await sb.from('funnel_pages').update({ slug: next, updated_at: new Date().toISOString() }).eq('id', r.id)
    setBusy(null)
    if (error) { setMsg(error.code === '23505' ? 'That link name is taken. Try another one.' : error.message); return }
    setEdit((e) => { const n = { ...e }; delete n[r.id]; return n })
    setRows((rs) => (rs ?? []).map((x) => (x.id === r.id ? { ...x, slug: next } : x)))
    setMsg('Saved')
  }

  function copy(slug: string) {
    navigator.clipboard?.writeText('https://' + HOST + '/go/' + slug)
    setCopied(slug)
    setTimeout(() => setCopied((c) => (c === slug ? null : c)), 1500)
  }

  return (
    <div className="min-h-screen bg-paper xl:pl-60">
      <DashboardHeader active="domains" />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-brass">Your brand</p>
        <h1 className="font-fraunces text-3xl font-semibold text-ink md:text-4xl">Domains and links</h1>
        <p className="mt-2 text-sm text-ink-soft">Your website address and every special link, all in one place.</p>

        <section className={card + ' mt-8'}>
          <p className="font-fraunces text-xl font-semibold text-ink">Your website address</p>
          {!dom && <p className="mt-2 text-sm text-ink-soft">Loading...</p>}
          {dom && !dom.domain && <p className="mt-2 text-sm text-ink-soft">No domain connected yet. Connect your own, like yourstudio.com, so clients find you under your name.</p>}
          {dom?.domain && (
            <div className="mt-2 flex items-center gap-2">
              <span className={'h-2.5 w-2.5 rounded-full ' + (dom.status === 'active' ? 'bg-emerald-600' : 'bg-amber-500')} />
              <p className="text-ink"><span className="font-medium">{dom.domain}</span> <span className="text-sm text-ink-soft">{dom.status === 'active' ? 'is live' : 'is being set up'}</span></p>
            </div>
          )}
          <div className="mt-4">
            <Link href="/website/domain" className={ghost}>{dom?.domain ? 'Manage domain' : 'Connect a domain'}</Link>
          </div>
        </section>

        <section className={card + ' mt-6'}>
          <div className="flex items-center justify-between gap-3">
            <p className="font-fraunces text-xl font-semibold text-ink">Your special links</p>
            <Link href="/specials" className={ghost}>Open Specials</Link>
          </div>
          <p className="mt-1 text-sm text-ink-soft">Rename a link, copy it, and see which specials are live. Renaming a published special stops its old link from working.</p>
          {msg && <p className="mt-3 text-sm text-ink-soft">{msg}</p>}
          {rows === null && <p className="mt-4 text-sm text-ink-soft">Loading...</p>}
          {rows && rows.length === 0 && <p className="mt-4 text-sm text-ink-soft">No specials yet. Make one in Specials and it shows up here.</p>}
          <ul className="mt-4 divide-y divide-line">
            {(rows ?? []).map((r) => {
              const val = edit[r.id] ?? r.slug
              const dirty = val !== r.slug
              return (
                <li key={r.id} className="py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-ink">{r.name}</p>
                    <span className={'rounded-full px-3 py-1 text-xs font-medium ' + (r.published ? 'bg-sage/15 text-sage' : 'bg-line text-ink-soft')}>{r.published ? 'Published' : 'Draft'}</span>
                  </div>
                  <div className="mt-2 flex items-center overflow-hidden rounded-xl bg-paper px-4 py-2.5 text-sm font-medium text-ink">
                    <span className="shrink-0 text-ink-soft">{HOST + '/go/'}</span>
                    <input value={val} onChange={(e) => setEdit((x) => ({ ...x, [r.id]: clean(e.target.value) }))} aria-label="Link name" className="min-w-0 flex-1 bg-transparent outline-none" />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {dirty && <button type="button" disabled={busy === r.id} onClick={() => saveSlug(r)} className="rounded-full bg-twilight px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{busy === r.id ? 'Saving...' : 'Save link'}</button>}
                    <button type="button" onClick={() => copy(r.slug)} className={ghost}>{copied === r.slug ? 'Copied' : 'Copy link'}</button>
                    <a href={'/go/' + r.slug} target="_blank" rel="noreferrer" className={ghost}>Open</a>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      </main>
    </div>
  )
}
