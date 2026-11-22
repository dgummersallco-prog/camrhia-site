'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

type Saved = { path: string; name: string }

export function ContractFileCard({ children }: { children?: ReactNode }) {
  const [uid, setUid] = useState('')
  const [saved, setSaved] = useState<Saved | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      const sb = supabase
      if (!sb) return
      const { data: s } = await sb.auth.getSession()
      if (!s.session) return
      setUid(s.session.user.id)
      const { data } = await sb.from('profiles').select('contract_file_path, contract_file_name').eq('id', s.session.user.id).maybeSingle()
      const r = data as { contract_file_path: string | null; contract_file_name: string | null } | null
      if (r?.contract_file_path) setSaved({ path: r.contract_file_path, name: r.contract_file_name || 'Your contract.pdf' })
    }
    load()
  }, [])

  async function pick(f: File) {
    const sb = supabase
    if (!sb || !uid) return
    if (!/\.pdf$/i.test(f.name) && f.type !== 'application/pdf') { setMsg({ ok: false, text: 'Choose a PDF. In Word, use File, then Save as PDF.' }); return }
    if (f.size > 25 * 1024 * 1024) { setMsg({ ok: false, text: 'That file is over 25 MB.' }); return }
    setBusy(true)
    setMsg(null)
    try {
      const { data: s } = await sb.auth.getSession()
      const token = s.session?.access_token ?? ''
      const r = await fetch('/api/contract-file', { method: 'POST', headers: { Authorization: 'Bearer ' + token } })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j.path) throw new Error(j.error || 'Could not start the upload.')
      const up = await sb.storage.from('contract-files').uploadToSignedUrl(j.path, j.token, f, { contentType: 'application/pdf' })
      if (up.error) throw new Error('The upload did not finish. Try again.')
      const { error } = await sb.from('profiles').update({ contract_file_path: j.path, contract_file_name: f.name }).eq('id', uid)
      if (error) throw new Error(error.message)
      setSaved({ path: j.path, name: f.name })
      setMsg({ ok: true, text: 'Saved. New contracts you create will use this file.' })
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message })
    }
    setBusy(false)
  }

  async function view() {
    const sb = supabase
    if (!sb) return
    const tab = window.open('', '_blank')
    const { data: s } = await sb.auth.getSession()
    const r = await fetch('/api/contract-file?mine=1', { headers: { Authorization: 'Bearer ' + (s.session?.access_token ?? '') } })
    const j = await r.json().catch(() => ({}))
    if (!r.ok || !j.url) { tab?.close(); setMsg({ ok: false, text: j.error || 'Could not open the file.' }); return }
    if (tab) tab.location.href = j.url
    else window.location.href = j.url
  }

  async function remove() {
    const sb = supabase
    if (!sb || !uid) return
    if (!window.confirm('Stop using this file? Contracts already sent keep their copy.')) return
    setBusy(true)
    const { error } = await sb.from('profiles').update({ contract_file_path: null, contract_file_name: null }).eq('id', uid)
    setBusy(false)
    if (error) { setMsg({ ok: false, text: error.message }); return }
    setSaved(null)
    setMsg({ ok: true, text: 'Removed. New contracts will use the written template below.' })
  }

  const btn = 'rounded-xl bg-twilight px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40'
  const ghost = 'rounded-xl border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition hover:border-ink disabled:opacity-40'

  return (
    <section className="rounded-2xl border border-line bg-card p-6">
      <h2 className="font-fraunces text-lg font-semibold text-ink">Already have your own contract?</h2>
      <p className="mt-1 text-sm text-ink-soft">Add it here once and send it to any client from their session, without copying and pasting it again. Upload a PDF and your client reads your exact file and signs it in Camrhia.</p>
      <input ref={ref} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void pick(f) }} />
      {saved ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-white px-4 py-3">
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{saved.name}</span>
          <button type="button" className={ghost} onClick={view}>View</button>
          <button type="button" className={ghost} disabled={busy} onClick={() => ref.current?.click()}>{busy ? 'Uploading…' : 'Replace'}</button>
          <button type="button" className={ghost} disabled={busy} onClick={remove}>Remove</button>
        </div>
      ) : (
        <button type="button" className={btn + ' mt-4'} disabled={busy} onClick={() => ref.current?.click()}>{busy ? 'Uploading…' : 'Upload my contract (PDF)'}</button>
      )}
      {msg && <p className={'mt-3 text-sm ' + (msg.ok ? 'text-emerald-700' : 'text-red-600')}>{msg.text}</p>}
      {children && (
        <div className="mt-5 border-t border-line pt-4">
          <p className="text-sm text-ink-soft">Or use text. It is filled in for each client, and you edit it in the box below.</p>
          <div className="mt-3 flex flex-wrap gap-2">{children}</div>
        </div>
      )}
    </section>
  )
}
