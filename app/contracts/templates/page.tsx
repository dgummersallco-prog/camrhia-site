'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { DashboardHeader } from '@/app/components/DashboardHeader'
import { SubTabs } from '@/app/components/SubTabs'
import { CONTRACT_TYPE_CONFIG, DEFAULT_CONTRACT_TEMPLATE, DEFAULT_CONTRACT_TEMPLATES, MASTER_CONTRACT_TEMPLATE, MASTER_KEY } from '@/lib/contractDefaults'

type Tpl = {
  session_type: string; template: string; updated_at: string | null
  review_token: string | null; reviewed_by: string | null; reviewed_at: string | null; reviewed_template: string | null
}

const SITE = 'https://camrhia.com'
const COLS = 'session_type, template, updated_at, review_token, reviewed_by, reviewed_at, reviewed_template'
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
const snapshot = (t: string) => t + '\n\n' + JSON.stringify(CONTRACT_TYPE_CONFIG)

export default function ContractPage() {
  const router = useRouter()
  const [uid, setUid] = useState('')
  const [ready, setReady] = useState(false)
  const [rows, setRows] = useState<Record<string, Tpl>>({})
  const [labels, setLabels] = useState<Record<string, string>>({})
  const [draft, setDraft] = useState<string | null>(null)
  const [who, setWho] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function load() {
      const sb = supabase
      if (!sb) { router.push('/login'); return }
      const { data: sess } = await sb.auth.getSession()
      if (!sess.session) { router.push('/login'); return }
      const me = sess.session.user.id
      setUid(me)
      const [tpl, st] = await Promise.all([
        sb.from('contract_templates').select(COLS).eq('owner_id', me),
        sb.from('session_types').select('key, label'),
      ])
      const map: Record<string, Tpl> = {}
      ;((tpl.data ?? []) as Tpl[]).forEach((r) => { map[r.session_type] = r })
      setRows(map)
      const lab: Record<string, string> = {}
      ;((st.data ?? []) as { key: string; label: string }[]).forEach((t) => { lab[t.key] = t.label })
      setLabels(lab)
      setReady(true)
    }
    load()
  }, [router])

  const master = rows[MASTER_KEY]
  const base = master?.template ?? MASTER_CONTRACT_TEMPLATE
  const current = draft ?? base
  const dirty = draft !== null && draft !== base
  const status = master?.reviewed_at
    ? master.reviewed_template === snapshot(master.template)
      ? 'Reviewed by ' + (master.reviewed_by || 'your attorney') + ' on ' + fmtDate(master.reviewed_at)
      : 'Changed since review'
    : null
  const customized = Object.values(rows).filter((r) => r.session_type !== MASTER_KEY && r.template !== DEFAULT_CONTRACT_TEMPLATES[r.session_type] && r.template !== DEFAULT_CONTRACT_TEMPLATE)

  async function write(patch: Record<string, unknown>, okText: string) {
    const sb = supabase
    if (!sb || !uid) return
    setBusy(true)
    setMsg(null)
    const { data, error } = await sb
      .from('contract_templates')
      .upsert({ owner_id: uid, session_type: MASTER_KEY, template: base, ...patch }, { onConflict: 'owner_id,session_type' })
      .select(COLS)
      .single()
    setBusy(false)
    if (error || !data) { setMsg({ ok: false, text: error?.message ?? 'Could not save. Please try again.' }); return }
    setRows((r) => ({ ...r, [MASTER_KEY]: data as Tpl }))
    setMsg({ ok: true, text: okText })
  }

  async function save() {
    await write({ template: current, updated_at: new Date().toISOString() }, 'Saved.')
    setDraft(null)
  }
  async function share() {
    if (master?.review_token) return
    await write({ review_token: crypto.randomUUID() }, 'Review link created.')
  }
  async function stopSharing() {
    await write({ review_token: null }, 'Sharing turned off.')
  }
  async function markReviewed() {
    if (!who.trim()) { setMsg({ ok: false, text: "Enter the attorney's name." }); return }
    await write({ reviewed_by: who.trim(), reviewed_at: new Date().toISOString(), reviewed_template: snapshot(base) }, 'Review recorded.')
    setWho('')
  }
  async function copy(token: string) {
    try { await navigator.clipboard.writeText(SITE + '/contract-review/' + token); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch {}
  }
  async function useMaster(k: string) {
    const sb = supabase
    if (!sb || !uid) return
    await sb.from('contract_templates').delete().eq('owner_id', uid).eq('session_type', k)
    setRows((r) => { const n = { ...r }; delete n[k]; return n })
  }

  const input = 'w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none focus:border-twilight'
  const btn = 'rounded-xl bg-twilight px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40'
  const ghost = 'rounded-xl border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition hover:border-ink disabled:opacity-40'
  const card = 'rounded-2xl border border-line bg-card p-6'

  return (
    <div className="min-h-screen bg-paper xl:pl-60">
      <DashboardHeader active="contracts" />
      <SubTabs group="contracts" active="templates" />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="font-fraunces text-3xl font-semibold text-ink">Your contract</h1>
        <p className="mt-2 text-sm text-ink-soft">One agreement for every session type. Camrhia provides a starting version, not legal advice, so have a licensed attorney in your state review it.</p>

        {!ready ? (
          <p className="mt-8 text-sm text-ink-soft">Loading…</p>
        ) : (
          <div className="mt-8 space-y-6">
            <section className={card}>
              <h2 className="font-fraunces text-lg font-semibold text-ink">How to get it reviewed</h2>
              <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-ink-soft">
                <li>Read the contract below and change anything you want. Save your changes.</li>
                <li>Create a review link and send it to your attorney yourself, by text, email or however you like.</li>
                <li>When your attorney is happy with it, enter their name under &quot;Record the review.&quot;</li>
              </ol>
            </section>

            <section className={card}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-fraunces text-lg font-semibold text-ink">Contract</h2>
                {status && <span className={'rounded-full px-3 py-1 text-[11px] font-semibold ' + (status.startsWith('Reviewed') ? 'bg-blush-wash text-twilight' : 'border border-line text-ink-soft')}>{status}</span>}
              </div>
              <textarea className={input + ' mt-4 min-h-[30rem] font-mono text-[13px] leading-relaxed'} value={current} onChange={(e) => setDraft(e.target.value)} />
              <p className="mt-2 text-xs text-ink-soft">Words in braces, like {'{client_names}'} or {'{total_price}'}, are filled in for each client. Words like {'{contract_title}'} and {'{cancellation_days}'} change with the session type, see the table below.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className={btn} disabled={!dirty || busy} onClick={save}>{busy ? 'Saving…' : 'Save changes'}</button>
                {dirty && <button type="button" className={ghost} onClick={() => setDraft(null)}>Discard</button>}
              </div>
            </section>

            <section className={card}>
              <h2 className="font-fraunces text-lg font-semibold text-ink">Send to your attorney</h2>
              <p className="mt-1 text-sm text-ink-soft">Your attorney sees the contract and the session-type table below on a private page, and can print it or save it as a PDF.</p>
              {master?.review_token ? (
                <div className="mt-4 space-y-2">
                  <input className={input} readOnly value={SITE + '/contract-review/' + master.review_token} onFocus={(e) => e.currentTarget.select()} />
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className={btn} onClick={() => copy(master.review_token as string)}>{copied ? 'Link copied' : 'Copy link'}</button>
                    <button type="button" className={ghost} disabled={busy} onClick={stopSharing}>Stop sharing</button>
                  </div>
                  <p className="text-xs text-ink-soft">The link always shows your latest saved contract.</p>
                </div>
              ) : (
                <button type="button" className={ghost + ' mt-4'} disabled={dirty || busy} onClick={share}>Create review link</button>
              )}
              {dirty && <p className="mt-2 text-xs text-ink-soft">Save your changes first.</p>}

              <div className="mt-6 border-t border-line pt-5">
                <p className="text-sm font-medium text-ink">Record the review</p>
                <p className="mt-1 text-xs text-ink-soft">This is your own record of who reviewed it. If the contract changes afterwards, it will say &quot;Changed since review.&quot;</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <input className={input + ' max-w-xs'} placeholder="Attorney's name" value={who} onChange={(e) => setWho(e.target.value)} />
                  <button type="button" className={btn} disabled={dirty || busy} onClick={markReviewed}>Mark as reviewed</button>
                </div>
              </div>
              {msg && <p className={'mt-3 text-sm ' + (msg.ok ? 'text-emerald-700' : 'text-red-700')}>{msg.text}</p>}
            </section>

            <section className={card}>
              <h2 className="font-fraunces text-lg font-semibold text-ink">What changes by session type</h2>
              <p className="mt-1 text-sm text-ink-soft">Only these values change. Everything else in the contract is identical for every session type.</p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[34rem] text-left text-sm">
                  <thead>
                    <tr className="border-b border-line text-[11px] uppercase tracking-[0.1em] text-ink-soft">
                      <th className="py-2 pr-3 font-medium">Session</th>
                      <th className="py-2 pr-3 font-medium">Agreement title</th>
                      <th className="py-2 pr-3 font-medium">Delivery</th>
                      <th className="py-2 font-medium">Cancel notice</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(CONTRACT_TYPE_CONFIG).map(([k, c]) => (
                      <tr key={k} className="border-b border-line/60 text-ink">
                        <td className="py-2 pr-3">{labels[k] ?? k}</td>
                        <td className="py-2 pr-3 text-xs">{c.title}</td>
                        <td className="py-2 pr-3">{c.deliveryWeeks} wk</td>
                        <td className="py-2">{c.cancellationDays} days</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {customized.length > 0 && (
              <section className={card}>
                <h2 className="font-fraunces text-lg font-semibold text-ink">Customized session types</h2>
                <p className="mt-1 text-sm text-ink-soft">These session types use their own wording instead of the contract above, so your review doesn&apos;t cover them.</p>
                <div className="mt-4 space-y-2">
                  {customized.map((r) => (
                    <div key={r.session_type} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3">
                      <span className="text-sm font-medium text-ink">{labels[r.session_type] ?? r.session_type}</span>
                      <button type="button" className={ghost} onClick={() => useMaster(r.session_type)}>Use the contract above</button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
