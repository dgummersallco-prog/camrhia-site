'use client'

import { useEffect, useState } from 'react'
import AffiliateShell from '../../components/AffiliateShell'
import { AvatarPicker } from '../../components/Avatar'
import { supabaseAffiliate } from '@/lib/supabaseAffiliate'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { usePathname } from 'next/navigation'

function AccountBody({ name }: { name: string | null }) {
  const isAdmin = (usePathname() ?? '').startsWith('/admin')
  const supabase = isAdmin ? supabaseAdmin : supabaseAffiliate
  const [uid, setUid] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [url, setUrl] = useState<string | null>(null)
  const [nameInput, setNameInput] = useState(name ?? '')
  const [saved, setSaved] = useState(name ?? '')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [doc, setDoc] = useState<{ file_path: string; uploaded_at: string; verified_at: string | null } | null>(null)
  const [w9Busy, setW9Busy] = useState(false)
  const [w9Err, setW9Err] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      if (!supabase) return
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      setUid(session.user.id)
      setEmail(session.user.email ?? '')
      const { data: d } = await supabase.from('affiliate_tax_docs').select('file_path, uploaded_at, verified_at').eq('affiliate_id', session.user.id).maybeSingle()
      setDoc((d as { file_path: string; uploaded_at: string; verified_at: string | null } | null) ?? null)
      const { data } = await supabase.rpc('hub_avatars', { p_ids: [session.user.id] })
      setUrl((data as { user_id: string; avatar_url: string | null }[] | null)?.[0]?.avatar_url ?? null)
    })()
  }, [])

  async function saveName() {
    const clean = nameInput.trim()
    if (!supabase || !uid || !clean) return
    setBusy(true)
    setErr(null)
    setMsg(null)
    const { error } = await supabase.from('affiliates').update({ name: clean }).eq('id', uid)
    setBusy(false)
    if (error) { setErr(error.message); return }
    setSaved(clean)
    setNameInput(clean)
    setMsg('Saved. Your new name shows on new posts and comments.')
  }

  async function uploadW9(file: File | undefined) {
    if (!file || !supabase || !uid) return
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) { setW9Err('Upload a PDF, JPG or PNG.'); return }
    if (file.size > 10 * 1024 * 1024) { setW9Err('That file is over 10 MB.'); return }
    setW9Busy(true)
    setW9Err(null)
    const ext = (file.name.split('.').pop() || 'pdf').toLowerCase().replace(/[^a-z0-9]/g, '') || 'pdf'
    const path = `${uid}/w9-${Date.now()}.${ext}`
    const up = await supabase.storage.from('affiliate-tax').upload(path, file, { contentType: file.type })
    if (up.error) { setW9Busy(false); setW9Err(up.error.message); return }
    const now = new Date().toISOString()
    const { error } = await supabase.from('affiliate_tax_docs').upsert({ affiliate_id: uid, file_path: path, uploaded_at: now, verified_at: null }, { onConflict: 'affiliate_id' })
    setW9Busy(false)
    if (error) { setW9Err(error.message); return }
    setDoc({ file_path: path, uploaded_at: now, verified_at: null })
  }

  if (isAdmin) {
    return (
      <div className="max-w-xl space-y-5">
        <div className="rounded-2xl border border-line bg-card p-6">
          <p className="mb-4 font-fraunces text-xl font-semibold text-ink">Camrhia profile photo</p>
          {uid && <AvatarPicker client={supabase} uid={uid} url={url} name="Camrhia" size={80} onDone={setUrl} />}
          <p className="mt-3 text-sm text-ink-soft">Your posts, pinned messages and announcements show as Camrhia with this photo.</p>
        </div>
        <div className="rounded-2xl border border-line bg-card p-6">
          <p className="text-xs uppercase tracking-wider text-ink-soft">Name</p>
          <p className="mt-1 text-ink">Camrhia</p>
          <p className="mt-4 text-xs uppercase tracking-wider text-ink-soft">Email</p>
          <p className="mt-1 text-ink">{email}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-xl space-y-5">
      <div className="rounded-2xl border border-line bg-card p-6">
        <p className="mb-4 font-fraunces text-xl font-semibold text-ink">Profile photo</p>
        {uid && <AvatarPicker client={supabase} uid={uid} url={url} name={saved} size={80} onDone={setUrl} />}
        <p className="mt-3 text-sm text-ink-soft">This shows on your posts and comments in the Community.</p>
      </div>
      <div className="rounded-2xl border border-line bg-card p-6">
        <p className="mb-4 font-fraunces text-xl font-semibold text-ink">Name</p>
        <input
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          maxLength={60}
          className="w-full rounded-xl border border-line bg-white px-4 py-3 text-ink outline-none focus:border-[var(--aff-fill)]"
        />
        {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
        {msg && <p className="mt-2 text-sm text-ink-soft">{msg}</p>}
        <button
          onClick={saveName}
          disabled={busy || !nameInput.trim() || nameInput.trim() === saved}
          className="mt-4 rounded-full px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: 'var(--aff-fill)' }}
        >
          {busy ? 'Saving…' : 'Save name'}
        </button>
        <p className="mt-5 text-xs uppercase tracking-wider text-ink-soft">Email</p>
        <p className="mt-1 text-ink">{email}</p>
      </div>
      <div className="rounded-2xl border border-line bg-card p-6">
        <p className="mb-2 font-fraunces text-xl font-semibold text-ink">Tax form (W-9)</p>
        <p className="text-sm text-ink-soft">
          Camrhia needs a signed W-9 on file to pay you.{' '}
          <a href="https://www.irs.gov/pub/irs-pdf/fw9.pdf" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--aff-ink)' }}>Download the IRS Form W-9</a>, fill it in, sign it and upload it here. Only you and Camrhia can open it.
        </p>
        <p className="mt-3 text-sm font-medium text-ink">
          {!doc ? 'Not uploaded yet' : doc.verified_at ? 'Verified' : 'Uploaded, waiting for review'}
        </p>
        {!(doc && doc.verified_at) && (
          <label className="mt-3 inline-block cursor-pointer rounded-full px-6 py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: 'var(--aff-fill)' }}>
            {w9Busy ? 'Uploading…' : doc ? 'Replace file' : 'Upload W-9'}
            <input type="file" accept="application/pdf,image/jpeg,image/png" className="hidden" disabled={w9Busy} onChange={(e) => uploadW9(e.target.files?.[0])} />
          </label>
        )}
        {w9Err && <p className="mt-2 text-sm text-red-700">{w9Err}</p>}
      </div>
    </div>
  )
}

export default function AccountPage() {
  return (
    <AffiliateShell title="Account" subtitle="Your profile.">
      {(a) => <AccountBody name={a.name} />}
    </AffiliateShell>
  )
}
