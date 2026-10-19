'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { DEFAULT_CONTRACT_TEMPLATE, DEFAULT_CONTRACT_TEMPLATES, fillContractTemplate } from '@/lib/contractDefaults'

type CRow = {
  id: string
  body: string | null
  status: string | null
  sent_at: string | null
  signed_at: string | null
  signer_name: string | null
  reminder_sent_at: string | null
  manually_edited: boolean
  template_source: string | null
}
type Prof = {
  studio_name: string | null
  display_name: string | null
  payout_business_name: string | null
  business_state: string | null
  business_county: string | null
  contract_template: string | null
  signature_name: string | null
}

const card = 'rounded-2xl border border-line bg-card p-5'
const btn = 'rounded-full border border-line px-4 py-1.5 text-sm text-ink transition hover:border-twilight disabled:opacity-50'
const btnPrimary = 'rounded-full bg-twilight px-5 py-1.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50'

function sameDay(iso: string | null): boolean {
  if (!iso) return false
  const a = new Date(iso)
  const b = new Date()
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function ContractPanel({ weddingId, w, onChanged }: { weddingId: string; w: Record<string, any>; onChanged?: () => void }) {
  const [uid, setUid] = useState<string | null>(null)
  const [prof, setProf] = useState<Prof | null>(null)
  const [c, setC] = useState<CRow | null>(null)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [sigAsk, setSigAsk] = useState(false)
  const [sigName, setSigName] = useState('')

  const sessionType: string = w.session_type ?? 'wedding'

  const fill = useCallback((template: string, p: Prof) => {
    return fillContractTemplate(
      template,
      {
        names: w.names ?? '',
        wedding_date: w.wedding_date ?? null,
        venue: w.venue ?? null,
        package_name: w.package_name ?? null,
        coverage: w.coverage ?? null,
        deliverables: w.deliverables ?? null,
        delivery_days: w.delivery_days ?? null,
        total_price: w.total_price != null && w.total_price !== '' ? Number(w.total_price) : null,
      },
      {
        studio_name: p.studio_name,
        display_name: p.display_name,
        contract_template: p.contract_template,
        payout_business_name: p.payout_business_name,
        business_state: p.business_state,
        business_county: p.business_county,
      },
    )
  }, [w])

  const templateFor = useCallback(async (me: string, p: Prof): Promise<string> => {
    const sb = supabase
    if (!sb) return DEFAULT_CONTRACT_TEMPLATE
    const { data } = await sb.from('contract_templates').select('template').eq('owner_id', me).eq('session_type', sessionType).maybeSingle()
    return (data as { template?: string } | null)?.template || DEFAULT_CONTRACT_TEMPLATES[sessionType] || p.contract_template || DEFAULT_CONTRACT_TEMPLATE
  }, [sessionType])

  const load = useCallback(async () => {
    const sb = supabase
    if (!sb) return
    const { data: sess } = await sb.auth.getSession()
    if (!sess.session) return
    const me = sess.session.user.id
    setUid(me)
    const { data: pr } = await sb
      .from('profiles')
      .select('studio_name, display_name, payout_business_name, business_state, business_county, contract_template, signature_name')
      .eq('id', me)
      .maybeSingle()
    const p = (pr ?? { studio_name: null, display_name: null, payout_business_name: null, business_state: null, business_county: null, contract_template: null, signature_name: null }) as Prof
    setProf(p)
    const { data: ex } = await sb.from('contracts').select('*').eq('wedding_id', weddingId).maybeSingle()
    let row = (ex ?? null) as CRow | null
    if (row && row.status === 'draft' && !row.manually_edited) {
      const src = await templateFor(me, p)
      const refilled = fill(src, p)
      if (refilled !== row.body || row.template_source !== src) {
        await sb.from('contracts').update({ body: refilled, template_source: src }).eq('id', row.id)
        row = { ...row, body: refilled, template_source: src }
      }
    }
    setC(row)
    setReady(true)
  }, [weddingId, fill, templateFor])

  useEffect(() => { load() }, [load])

  async function createContract() {
    const sb = supabase
    if (!sb || !uid || !prof) return
    setBusy(true)
    setErr(null)
    const src = await templateFor(uid, prof)
    const body = fill(src, prof)
    const { data, error } = await sb
      .from('contracts')
      .insert({ wedding_id: weddingId, owner_id: uid, body, status: 'draft', template_source: src })
      .select('*')
      .single()
    setBusy(false)
    if (error || !data) { setErr(error?.message ?? 'Could not create the contract.'); return }
    setC(data as CRow)
    onChanged?.()
  }

  async function saveEdit() {
    const sb = supabase
    if (!sb || !c) return
    setBusy(true)
    await sb.from('contracts').update({ body: draft, manually_edited: true }).eq('id', c.id)
    setC({ ...c, body: draft, manually_edited: true })
    setEditing(false)
    setBusy(false)
  }

  async function resetToTemplate() {
    const sb = supabase
    if (!sb || !c || !uid || !prof) return
    if (!window.confirm('Replace your edits with your current template? This cannot be undone.')) return
    setBusy(true)
    const src = await templateFor(uid, prof)
    const body = fill(src, prof)
    await sb.from('contracts').update({ body, template_source: src, manually_edited: false }).eq('id', c.id)
    setC({ ...c, body, template_source: src, manually_edited: false })
    setEditing(false)
    setBusy(false)
  }

  async function doSend() {
    const sb = supabase
    if (!sb || !c) return
    if (!window.confirm('This will share the contract with your client for signing. Continue?')) return
    setBusy(true)
    setErr(null)
    const sentAt = new Date().toISOString()
    const { error } = await sb.from('contracts').update({ status: 'sent', sent_at: sentAt }).eq('id', c.id)
    setBusy(false)
    if (error) { setErr(error.message); return }
    setC({ ...c, status: 'sent', sent_at: sentAt })
    onChanged?.()
  }

  async function sendClick() {
    if (!prof?.signature_name) { setSigAsk(true); return }
    await doSend()
  }

  async function saveSignatureAndSend() {
    const sb = supabase
    const name = sigName.trim()
    if (!sb || !uid || !name) return
    setBusy(true)
    const { error } = await sb.from('profiles').update({ signature_name: name }).eq('id', uid)
    setBusy(false)
    if (error) { setErr(error.message); return }
    setProf((p) => (p ? { ...p, signature_name: name } : p))
    setSigAsk(false)
    await doSend()
  }

  async function remind() {
    const sb = supabase
    if (!sb || !c || sameDay(c.reminder_sent_at)) return
    setBusy(true)
    const now = new Date().toISOString()
    await sb.from('contracts').update({ reminder_sent_at: now }).eq('id', c.id)
    if (w.couple_user_id) {
      await sb.from('notifications').insert({
        user_id: w.couple_user_id,
        type: 'contract',
        title: 'Contract reminder',
        body: 'Your photographer is waiting for you to sign the contract.',
        wedding_id: weddingId,
      })
    }
    setC({ ...c, reminder_sent_at: now })
    setBusy(false)
  }

  const status = c?.status ?? null
  const pill =
    status === 'signed' ? 'bg-emerald-100 text-emerald-700'
    : status === 'sent' ? 'bg-twilight/10 text-twilight'
    : 'bg-line text-ink-soft'

  return (
    <section className={card}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="font-fraunces text-xl font-semibold text-ink">Contract</p>
        {status && <span className={`rounded-full px-3 py-1 text-xs capitalize ${pill}`}>{status}</span>}
      </div>
      {err && <p className="mb-3 text-sm text-red-600">{err}</p>}

      {!ready ? (
        <p className="text-sm text-ink-soft">Loading…</p>
      ) : !c ? (
        <div>
          <p className="mb-3 text-sm text-ink-soft">No contract yet. It is built from your template for this session type and filled in with the details of this session.</p>
          <button type="button" disabled={busy} onClick={createContract} className={btnPrimary}>{busy ? 'Creating…' : 'Create contract'}</button>
        </div>
      ) : (
        <div className="space-y-3">
          {status === 'sent' && c.sent_at && <p className="text-sm text-ink-soft">Sent {new Date(c.sent_at).toLocaleDateString()}. Waiting for your client to sign.</p>}
          {status === 'signed' && c.signed_at && (
            <p className="text-sm text-ink-soft">Signed {new Date(c.signed_at).toLocaleDateString()}{c.signer_name ? ` by ${c.signer_name}` : ''}.</p>
          )}

          {editing ? (
            <textarea
              rows={20}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full rounded-xl border border-line bg-paper px-4 py-3 font-mono text-xs text-ink focus:border-twilight focus:outline-none focus:ring-2 focus:ring-twilight/25"
            />
          ) : (
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-paper p-4 text-xs leading-relaxed text-ink">{c.body}</pre>
          )}

          {status === 'draft' && (
            <>
              {c.manually_edited && !editing && (
                <p className="text-xs text-ink-soft">You edited this contract, so it no longer updates when the session changes.</p>
              )}
              {sigAsk && (
                <div className="rounded-xl border border-line bg-paper p-3">
                  <p className="mb-2 text-sm text-ink">Type your name as it should appear as the photographer signature.</p>
                  <div className="flex flex-wrap gap-2">
                    <input
                      value={sigName}
                      onChange={(e) => setSigName(e.target.value)}
                      placeholder="Your full name"
                      className="min-w-0 flex-1 rounded-xl border border-line bg-card px-3 py-2 text-sm text-ink focus:border-twilight focus:outline-none"
                    />
                    <button type="button" disabled={busy || !sigName.trim()} onClick={saveSignatureAndSend} className={btnPrimary}>Save and send</button>
                    <button type="button" onClick={() => setSigAsk(false)} className={btn}>Cancel</button>
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {editing ? (
                  <>
                    <button type="button" disabled={busy} onClick={saveEdit} className={btnPrimary}>Save edits</button>
                    <button type="button" onClick={() => setEditing(false)} className={btn}>Cancel</button>
                  </>
                ) : (
                  <>
                    <button type="button" disabled={busy} onClick={sendClick} className={btnPrimary}>Send to client</button>
                    <button type="button" onClick={() => { setDraft(c.body ?? ''); setEditing(true) }} className={btn}>Edit text</button>
                    {c.manually_edited && <button type="button" disabled={busy} onClick={resetToTemplate} className={btn}>Reset to template</button>}
                  </>
                )}
              </div>
            </>
          )}

          {status === 'sent' && (
            <button type="button" disabled={busy || sameDay(c.reminder_sent_at)} onClick={remind} className={btn}>
              {sameDay(c.reminder_sent_at) ? 'Reminder sent today' : 'Send reminder'}
            </button>
          )}
        </div>
      )}
    </section>
  )
}
