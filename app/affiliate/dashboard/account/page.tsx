'use client'

import { useEffect, useState } from 'react'
import AffiliateShell from '../../components/AffiliateShell'
import { AvatarPicker } from '../../components/Avatar'
import { supabaseAffiliate as supabase } from '@/lib/supabaseAffiliate'

function AccountBody({ name }: { name: string | null }) {
  const [uid, setUid] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [url, setUrl] = useState<string | null>(null)
  const [nameInput, setNameInput] = useState(name ?? '')
  const [saved, setSaved] = useState(name ?? '')
  const [busy, setBusy] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      if (!supabase) return
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      setUid(session.user.id)
      setEmail(session.user.email ?? '')
      const { data: adm } = await supabase.rpc('hub_is_admin')
      setIsAdmin(adm === true)
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

  return (
    <div className="max-w-xl space-y-5">
      <div className="rounded-2xl border border-line bg-card p-6">
        <p className="mb-4 font-fraunces text-xl font-semibold text-ink">Profile photo</p>
        {uid && <AvatarPicker client={supabase} uid={uid} url={url} name={saved} size={80} onDone={setUrl} />}
        <p className="mt-3 text-sm text-ink-soft">This shows on your posts and comments in the Team Hub.</p>
      </div>
      <div className="rounded-2xl border border-line bg-card p-6">
        <p className="mb-4 font-fraunces text-xl font-semibold text-ink">Name</p>
        <input
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          maxLength={60}
          disabled={isAdmin}
          className="w-full rounded-xl border border-line bg-white px-4 py-3 text-ink outline-none focus:border-[#3A4A6B]"
        />
        {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
        {msg && <p className="mt-2 text-sm text-ink-soft">{msg}</p>}
        {isAdmin && <p className="mt-2 text-sm text-ink-soft">Admin posts always show as Camrhia.</p>}
        <button
          onClick={saveName}
          disabled={isAdmin || busy || !nameInput.trim() || nameInput.trim() === saved}
          className="mt-4 rounded-full px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: '#3A4A6B' }}
        >
          {busy ? 'Saving…' : 'Save name'}
        </button>
        <p className="mt-5 text-xs uppercase tracking-wider text-ink-soft">Email</p>
        <p className="mt-1 text-ink">{email}</p>
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
