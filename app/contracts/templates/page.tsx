'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { DashboardHeader } from '@/app/components/DashboardHeader'
import { SubTabs } from '@/app/components/SubTabs'
import { DEFAULT_CONTRACT_TEMPLATE, DEFAULT_CONTRACT_TEMPLATES } from '@/lib/contractDefaults'

type Type = { key: string; label: string }
type Tpl = {
  session_type: string; template: string; updated_at: string | null
  review_token: string | null; reviewed_by: string | null; reviewed_at: string | null; reviewed_template: string | null
}

const SITE = 'https://camrhia.com'
const COLS = 'session_type, template, updated_at, review_token, reviewed_by, reviewed_at, reviewed_template'
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

export default function ContractTemplatesPage() {
  const router = useRouter()
  const [uid, setUid] = useState('')
  const [types, setTypes] = useState<Type[] | null>(null)
  const [rows, setRows] = useState<Record<string, Tpl>>({})
  const [open, setOpen] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [names, setNames] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ key: string; ok: boolean; text: string } | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const sb = supabase
      if (!sb) { router.push('/login'); return }
      const { data: sess } = await sb.auth.getSession()
      if (!sess.session) { router.push('/login'); return }
      const me = sess.session.user.id
      setUid(me)
      const [st, prof, tpl] = await Promise.all([
        sb.from('session_types').select('key, label').eq('has_contract', true).order('sort_order', { ascending: true }),
        sb.from('profiles').select('enabled_session_types').eq('id', me).maybeSingle(),
        sb.from('contract_templates').select(COLS).eq('owner_id', me),
      ])
      const enabled = (prof.data as { enabled_session_types?: string[] | null } | null)?.enabled_session_types
      const all = (st.data ?? []) as Type[]
      setTypes(Array.isArray(enabled) ? all.filter((t) => enabled.includes(t.key)) : all)
      const map: Record<string, Tpl> = {}
      ;((tpl.data ?? []) as Tpl[]).forEach((r) => { map[r.session_type] = r })
      setRows(map)
    }
    load()
  }, [router])

  const baseText = (k: string) => rows[k]?.template ?? DEFAULT_CONTRACT_TEMPLATES[k] ?? DEFAULT_CONTRACT_TEMPLATE
  const current = (k: string) => drafts[k] ?? baseText(k)
  const dirty = (k: string) => drafts[k] !== undefined && drafts[k] !== baseText(k)

  function status(k: string): string | null {
    const r = rows[k]
    if (!r || !r.reviewed_at) return null
    return r.reviewed_template === r.template ? 'Reviewed by ' + (r.reviewed_by || 'your attorney') + ' on ' + fmtDate(r.reviewed_at) : 'Edited since review'
  }

  async function write(k: string, patch: Record<string, unknown>, ok: boolean) {
    const sb = supabase
    if (!sb || !uid) return
    setBusy(k)
    setMsg(null)
    const { data, error } = await sb
      .from('contract_templates')
      .upsert({ owner_id: uid, session_type: k, template: baseText(k), ...patch }, { onConflict: 'owner_id,session_type' })
      .select(COLS)
      .single()
    setBusy(null)
    if (error || !data) { setMsg({ key: k, ok: false, text: error?.message ?? 'Could not save. Please try again.' }); return }
    setRows((r) => ({ ...r, [k]: data as Tpl }))
    setMsg({ key: k, ok, text: ok ? 'Saved.' : '' })
  }

  async function save(k: string) {
    await write(k, { template: current(k), updated_at: new Date().toISOString() }, true)
    setDrafts((d) => { const n = { ...d }; delete n[k]; return n })
  }
  async function share(k: string) {
    if (rows[k]?.review_token) return
    await write(k, { review_token: crypto.randomUUID() }, true)
  }
  async function stopSharing(k: string) {
    await write(k, { review_token: null }, true)
  }
  async function markReviewed(k: string) {
    const who = (names[k] ?? '').trim()
    if (!who) { setMsg({ key: k, ok: false, text: 'Enter the attorney\'s name.' }); return }
    await write(k, { reviewed_by: who, reviewed_at: new Date().toISOString(), reviewed_template: baseText(k) }, true)
    setNames((n) => ({ ...n, [k]: '' }))
  }
  async function copy(k: string, token: string) {
    try { await navigator.clipboard.writeText(SITE + '/contract-review/' + token); setCopied(k); setTimeout(() => setCopied(null), 1800) } catch {}
  }

  const input = 'w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none focus:border-twilight'
  const btn = 'rounded-xl bg-twilight px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40'
  const ghost = 'rounded-xl border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition hover:border-ink disabled:opacity-40'

  return (
    <div className="min-h-screen bg-paper xl:pl-60">
      <DashboardHeader active="contracts" />
      <SubTabs group="contracts" active="templates" />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="font-fraunces text-3xl font-semibold text-ink">Contract templates</h1>
        <p className="mt-2 text-sm text-ink-soft">This is the wording every new contract starts from. Camrhia provides starting templates, not legal advice, so have a licensed attorney in your state review yours.</p>

        {types === null ? (
          <p className="mt-8 text-sm text-ink-soft">Loading…</p>
        ) : types.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-line bg-card p-6 text-sm text-ink-soft">No session types with a contract yet.</p>
        ) : (
          <div className="mt-8 space-y-3">
            {types.map((t) => {
              const r = rows[t.key]
              const st = status(t.key)
              const isOpen = open === t.key
              const d = dirty(t.key)
              return (
                <section key={t.key} className="rounded-2xl border border-line bg-card">
                  <button type="button" onClick={() => setOpen(isOpen ? null : t.key)} className="flex w-full flex-wrap items-center justify-between gap-2 px-5 py-4 text-left">
                    <span>
                      <span className="block font-fraunces text-lg font-semibold text-ink">{t.label}</span>
                      <span className="block text-xs text-ink-soft">{r ? 'Your version' : 'Camrhia\'s starting template'}</span>
                    </span>
                    {st && <span className={'rounded-full px-3 py-1 text-[11px] font-semibold ' + (st.startsWith('Reviewed') ? 'bg-blush-wash text-twilight' : 'border border-line text-ink-soft')}>{st}</span>}
                  </button>

                  {isOpen && (
                    <div className="space-y-5 border-t border-line px-5 py-5">
                      <div>
                        <textarea className={input + ' min-h-[24rem] font-mono text-[13px] leading-relaxed'} value={current(t.key)} onChange={(e) => setDrafts((x) => ({ ...x, [t.key]: e.target.value }))} />
                        <p className="mt-2 text-xs text-ink-soft">Words in braces, like {'{couple_names}'} or {'{total_price}'}, are filled in automatically for each client.</p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <button type="button" className={btn} disabled={!d || busy === t.key} onClick={() => save(t.key)}>{busy === t.key ? 'Saving…' : 'Save changes'}</button>
                          {d && <button type="button" className={ghost} onClick={() => setDrafts((x) => { const n = { ...x }; delete n[t.key]; return n })}>Discard</button>}
                        </div>
                      </div>

                      <div className="rounded-xl border border-line bg-white p-4">
                        <p className="text-sm font-medium text-ink">Send to your attorney</p>
                        <p className="mt-1 text-xs text-ink-soft">Create a private link to this wording. Send it to your attorney yourself, by text, email or any way you like. They can read it and print or save it as a PDF.</p>
                        {r?.review_token ? (
                          <div className="mt-3 space-y-2">
                            <input className={input} readOnly value={SITE + '/contract-review/' + r.review_token} onFocus={(e) => e.currentTarget.select()} />
                            <div className="flex flex-wrap gap-2">
                              <button type="button" className={btn} onClick={() => copy(t.key, r.review_token as string)}>{copied === t.key ? 'Link copied' : 'Copy link'}</button>
                              <button type="button" className={ghost} onClick={() => stopSharing(t.key)}>Stop sharing</button>
                            </div>
                            <p className="text-xs text-ink-soft">The link always shows your latest saved wording.</p>
                          </div>
                        ) : (
                          <button type="button" className={ghost + ' mt-3'} disabled={d || busy === t.key} onClick={() => share(t.key)}>Create review link</button>
                        )}
                        {d && <p className="mt-2 text-xs text-ink-soft">Save your changes first.</p>}
                      </div>

                      <div className="rounded-xl border border-line bg-white p-4">
                        <p className="text-sm font-medium text-ink">Record the review</p>
                        <p className="mt-1 text-xs text-ink-soft">When your attorney is happy with this wording, note who reviewed it. This is your own record. If you edit the contract afterwards, it will say &quot;Edited since review.&quot;</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <input className={input + ' max-w-xs'} placeholder="Attorney's name" value={names[t.key] ?? ''} onChange={(e) => setNames((n) => ({ ...n, [t.key]: e.target.value }))} />
                          <button type="button" className={btn} disabled={d || busy === t.key} onClick={() => markReviewed(t.key)}>Mark as reviewed</button>
                        </div>
                      </div>

                      {msg && msg.key === t.key && msg.text && <p className={'text-sm ' + (msg.ok ? 'text-emerald-700' : 'text-red-700')}>{msg.text}</p>}
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
