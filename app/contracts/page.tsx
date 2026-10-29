"use client"

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { DashboardHeader } from '@/app/components/DashboardHeader'
import { SubTabs } from '@/app/components/SubTabs'
import { signedHtml } from '@/lib/contractSign'

type Row = {
  id: string
  wedding_id: string
  status: string | null
  sent_at: string | null
  signed_at: string | null
  signer_name: string | null
  signature_style: string | null
  photographer_signature_name: string | null
  photographer_signature_style: string | null
  photographer_signed_at: string | null
  body: string | null
}
type Sess = { id: string; names: string | null; session_type: string | null; wedding_date: string | null }

const SIG_FAMILIES: Record<string, string> = {
  DancingScript: "'Dancing Script', cursive",
  GreatVibes: "'Great Vibes', cursive",
  Sacramento: "'Sacramento', cursive",
  AlexBrush: "'Alex Brush', cursive",
}
const FONT_HREF = 'https://fonts.googleapis.com/css2?family=Alex+Brush&family=Dancing+Script&family=Great+Vibes&family=Sacramento&display=swap'
const sigFamily = (k: string | null) => SIG_FAMILIES[k ?? ''] ?? SIG_FAMILIES.DancingScript
const fmtLong = (d: string | null) => (d ? new Date(d).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : '')
const escHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const prettyType = (t: string | null) => (t ? t.replace(/_/g, ' ').replace(/^\w/, (x) => x.toUpperCase()) : 'Session')

function printSigned(c: Row) {
  const w2 = window.open('', '_blank')
  if (!w2) { window.alert('Allow pop-ups to print the contract.'); return }
  const css = 'body{font-family:Georgia,serif;color:#222;max-width:720px;margin:40px auto;padding:0 24px;line-height:1.6;font-size:13px}pre{white-space:pre-wrap;font-family:inherit}.sig{display:flex;gap:48px;margin-top:40px;page-break-inside:avoid}.sig div{flex:1}.name{font-size:34px;margin:4px 0}.lbl{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#777}.stamp{margin-top:28px;border:2px solid #a8803f;color:#a8803f;display:inline-block;padding:6px 14px;font-size:12px;letter-spacing:.14em;text-transform:uppercase}'
  const html = '<!doctype html><html><head><meta charset="utf-8"><title>Signed contract</title><link rel="stylesheet" href="' + FONT_HREF + '"><style>' + css + '</style></head><body><pre>' + signedHtml(c.body ?? '', { name: c.photographer_signature_name ?? '', style: c.photographer_signature_style, date: fmtLong(c.photographer_signed_at ?? c.sent_at) }, { name: c.signer_name ?? '', style: c.signature_style, date: fmtLong(c.signed_at) }, escHtml) + '</pre><div class="stamp">Fully signed ' + escHtml(fmtLong(c.signed_at)) + '</div></body></html>'

  w2.document.write(html)
  w2.document.close()
  setTimeout(() => { w2.focus(); w2.print() }, 900)
}

export default function ContractsPage() {
  const router = useRouter()
  const [rows, setRows] = useState<Row[] | null>(null)
  const [sessions, setSessions] = useState<Record<string, Sess>>({})
  const [filter, setFilter] = useState<'all' | 'signed' | 'waiting' | 'draft'>('all')
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    async function load() {
      const sb = supabase
      if (!sb) return
      const { data: sess } = await sb.auth.getSession()
      if (!sess.session) { router.replace('/login?next=/contracts'); return }
      const uid = sess.session.user.id
      const { data, error: e } = await sb
        .from('contracts')
        .select('id, wedding_id, status, sent_at, signed_at, signer_name, signature_style, photographer_signature_name, photographer_signature_style, photographer_signed_at, body')
        .eq('owner_id', uid)
      if (e) { setError(e.message); return }
      const list = (data ?? []) as Row[]
      setRows(list)
      const ids = Array.from(new Set(list.map((r) => r.wedding_id)))
      if (ids.length > 0) {
        const { data: ws } = await sb.from('weddings').select('id, names, session_type, wedding_date').in('id', ids)
        const map: Record<string, Sess> = {}
        for (const w of (ws ?? []) as Sess[]) map[w.id] = w
        setSessions(map)
      }
    }
    load()
  }, [router])

  const shown = useMemo(() => {
    if (!rows) return []
    const list = rows.filter((r) => {
      if (filter === 'signed') return r.status === 'signed'
      if (filter === 'waiting') return r.status === 'sent'
      if (filter === 'draft') return r.status !== 'signed' && r.status !== 'sent'
      return true
    })
    const rank = (r: Row) => (r.status === 'sent' ? 0 : r.status === 'signed' ? 2 : 1)
    const needle = q.trim().toLowerCase()
    const found = needle ? list.filter((r) => (sessions[r.wedding_id]?.names ?? '').toLowerCase().includes(needle)) : list
    return [...found].sort((a, b) => rank(a) - rank(b) || (b.signed_at ?? b.sent_at ?? '').localeCompare(a.signed_at ?? a.sent_at ?? ''))
  }, [rows, filter, q, sessions])

  const all = rows ?? []
  const nSigned = all.filter((r) => r.status === 'signed').length
  const nWaiting = all.filter((r) => r.status === 'sent').length
  const nDraft = all.length - nSigned - nWaiting
  const waitingDays = all.filter((r) => r.status === 'sent' && r.sent_at).map((r) => Math.floor((Date.now() - new Date(r.sent_at as string).getTime()) / 86400000))
  const longest = waitingDays.length > 0 ? Math.max(...waitingDays) : 0

  const tab = (key: typeof filter, label: string) => (
    <button
      key={key}
      type="button"
      onClick={() => setFilter(key)}
      className={'rounded-full border px-4 py-1.5 text-sm transition ' + (filter === key ? 'border-twilight bg-twilight/5 text-twilight' : 'border-line text-ink-soft hover:border-twilight')}
    >
      {label}
    </button>
  )

  return (
    <div className="min-h-screen bg-paper xl:pl-60">
      <DashboardHeader active="contracts" />
      <SubTabs group="contracts" active="contracts" />
      <main className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="font-fraunces text-3xl font-semibold text-ink">Contracts</h1>
        <p className="mt-1 text-sm text-ink-soft">Every contract in one place. Signed copies include both signatures and the date.</p>

        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-line bg-card p-5">
            <p className="text-xs uppercase tracking-wider text-ink-soft">Signed</p>
            <p className="mt-1 font-fraunces text-3xl font-semibold text-emerald-700">{nSigned}</p>
          </div>
          <div className="rounded-2xl border border-line bg-card p-5">
            <p className="text-xs uppercase tracking-wider text-ink-soft">Waiting for signature</p>
            <p className={'mt-1 font-fraunces text-3xl font-semibold ' + (nWaiting > 0 ? 'text-brass' : 'text-ink')}>{nWaiting}</p>
          </div>
          <div className="rounded-2xl border border-line bg-card p-5">
            <p className="text-xs uppercase tracking-wider text-ink-soft">Drafts</p>
            <p className="mt-1 font-fraunces text-3xl font-semibold text-ink">{nDraft}</p>
          </div>
          <div className="rounded-2xl border border-line bg-card p-5">
            <p className="text-xs uppercase tracking-wider text-ink-soft">Longest waiting</p>
            <p className="mt-1 font-fraunces text-3xl font-semibold text-ink">{nWaiting > 0 ? longest + (longest === 1 ? ' day' : ' days') : '—'}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {tab('all', 'All')}
          {tab('signed', 'Signed')}
          {tab('waiting', 'Waiting for signature')}
          {tab('draft', 'Drafts')}
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by client"
            className="ml-auto w-full rounded-xl border border-line bg-card px-3 py-2 text-sm text-ink focus:border-twilight focus:outline-none focus:ring-2 focus:ring-twilight/25 sm:w-56"
          />
        </div>

        {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

        {rows === null && !error ? (
          <p className="mt-8 text-sm text-ink-soft">Loading…</p>
        ) : shown.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-line bg-card p-6 text-ink-soft">{q.trim() ? 'No contracts match that search.' : filter === 'waiting' ? 'No contracts waiting. Everyone has signed.' : filter === 'signed' ? 'No signed contracts yet.' : filter === 'draft' ? 'No drafts.' : 'No contracts here yet. Open a session and tap Create contract to start one.'}</p>
        ) : (
          <ul className="mt-6 space-y-3">
            {shown.map((c) => {
              const w = sessions[c.wedding_id]
              const signed = c.status === 'signed'
              const waiting = c.status === 'sent'
              const days = waiting && c.sent_at ? Math.floor((Date.now() - new Date(c.sent_at).getTime()) / 86400000) : 0
              const pill = signed ? 'bg-emerald-50 text-emerald-700' : waiting ? 'bg-amber-50 text-amber-700' : 'bg-paper text-ink-soft'
              const label = signed ? 'Signed' : waiting ? 'Waiting' : 'Draft'
              const line = signed
                ? 'Signed ' + fmtLong(c.signed_at) + (c.signer_name ? ' by ' + c.signer_name : '')
                : waiting
                  ? 'Sent ' + fmtLong(c.sent_at) + (days > 0 ? ' · waiting ' + days + ' day' + (days === 1 ? '' : 's') : ' · waiting for signature')
                  : 'Not sent yet'
              return (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-card p-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-fraunces text-lg font-semibold text-ink">{w?.names || 'Session'}</p>
                      <span className={'rounded-full px-3 py-0.5 text-xs font-medium ' + pill}>{label}</span>
                    </div>
                    <p className="mt-1 text-sm text-ink-soft">{prettyType(w?.session_type ?? null)}{w?.wedding_date ? ' · ' + fmtLong(w.wedding_date + 'T00:00:00') : ''}</p>
                    <p className="text-xs text-ink-soft">{line}</p>
                  </div>
                  <div className="flex gap-2">
                    {signed ? (
                      <>
                        <Link href={'/sessions/' + c.wedding_id} className="rounded-full border border-line px-4 py-1.5 text-sm text-ink transition hover:border-twilight">Open session</Link>
                        <button type="button" onClick={() => printSigned(c)} className="rounded-full bg-twilight px-4 py-1.5 text-sm font-medium text-white transition hover:opacity-90">Print signed copy</button>
                      </>
                    ) : waiting ? (
                      <Link href={'/sessions/' + c.wedding_id} className="rounded-full border border-line px-4 py-1.5 text-sm text-ink transition hover:border-twilight">Open session</Link>
                    ) : (
                      <Link href={'/sessions/' + c.wedding_id} className="rounded-full bg-twilight px-4 py-1.5 text-sm font-medium text-white transition hover:opacity-90">Review and send</Link>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </div>
  )
}
