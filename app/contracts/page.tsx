"use client"

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { DashboardHeader } from '@/app/components/DashboardHeader'

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
  const html = '<!doctype html><html><head><meta charset="utf-8"><title>Signed contract</title><link rel="stylesheet" href="' + FONT_HREF + '"><style>' + css + '</style></head><body><pre>' + escHtml(c.body ?? '') +
    '</pre><div class="sig"><div><div class="lbl">Photographer</div><div class="name" style="font-family:' + sigFamily(c.photographer_signature_style) + '">' + escHtml(c.photographer_signature_name ?? '') + '</div><div>' + escHtml(fmtLong(c.photographer_signed_at ?? c.sent_at)) +
    '</div></div><div><div class="lbl">Client</div><div class="name" style="font-family:' + sigFamily(c.signature_style) + '">' + escHtml(c.signer_name ?? '') + '</div><div>' + escHtml(fmtLong(c.signed_at)) +
    '</div></div></div><div class="stamp">Fully signed ' + escHtml(fmtLong(c.signed_at)) + '</div></body></html>'
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
    const rank = (r: Row) => (r.status === 'signed' ? 0 : r.status === 'sent' ? 1 : 2)
    return [...list].sort((a, b) => rank(a) - rank(b) || (b.signed_at ?? b.sent_at ?? '').localeCompare(a.signed_at ?? a.sent_at ?? ''))
  }, [rows, filter])

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
    <div className="min-h-screen bg-paper lg:pl-60">
      <DashboardHeader active="contracts" />
      <main className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="font-fraunces text-3xl font-semibold text-ink">Contracts</h1>
        <p className="mt-1 text-sm text-ink-soft">Every contract in one place. Signed copies include both signatures and the date.</p>

        <div className="mt-6 flex flex-wrap gap-2">
          {tab('all', 'All')}
          {tab('signed', 'Signed')}
          {tab('waiting', 'Waiting for signature')}
          {tab('draft', 'Drafts')}
        </div>

        {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

        {rows === null && !error ? (
          <p className="mt-8 text-sm text-ink-soft">Loading…</p>
        ) : shown.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-line bg-card p-6 text-ink-soft">No contracts here yet. Open a session and tap Create contract to start one.</p>
        ) : (
          <ul className="mt-6 space-y-3">
            {shown.map((c) => {
              const w = sessions[c.wedding_id]
              const signed = c.status === 'signed'
              const pill = signed ? 'bg-emerald-100 text-emerald-700' : c.status === 'sent' ? 'bg-twilight/10 text-twilight' : 'bg-line text-ink-soft'
              const line = signed ? 'Signed ' + fmtLong(c.signed_at) + (c.signer_name ? ' by ' + c.signer_name : '') : c.status === 'sent' ? 'Sent ' + fmtLong(c.sent_at) + ', waiting for signature' : 'Draft'
              return (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-card p-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-fraunces text-lg font-semibold text-ink">{w?.names || 'Session'}</p>
                      <span className={'rounded-full px-3 py-0.5 text-xs capitalize ' + pill}>{c.status ?? 'draft'}</span>
                    </div>
                    <p className="mt-1 text-sm text-ink-soft">{prettyType(w?.session_type ?? null)} · {line}</p>
                  </div>
                  <div className="flex gap-2">
                    <Link href={'/sessions/' + c.wedding_id} className="rounded-full border border-line px-4 py-1.5 text-sm text-ink transition hover:border-twilight">Open session</Link>
                    {signed && (
                      <button type="button" onClick={() => printSigned(c)} className="rounded-full bg-twilight px-4 py-1.5 text-sm font-medium text-white transition hover:opacity-90">Print signed copy</button>
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
