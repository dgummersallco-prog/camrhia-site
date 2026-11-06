'use client'

import { useEffect, useState } from 'react'
import AffiliateShell from '../../components/AffiliateShell'
import { AvatarPicker } from '../../components/Avatar'
import { supabaseAffiliate as supabase } from '@/lib/supabaseAffiliate'

function AccountBody({ name }: { name: string | null }) {
  const [uid, setUid] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      if (!supabase) return
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      setUid(session.user.id)
      setEmail(session.user.email ?? '')
      const { data } = await supabase.rpc('hub_avatars', { p_ids: [session.user.id] })
      setUrl((data as { user_id: string; avatar_url: string | null }[] | null)?.[0]?.avatar_url ?? null)
    })()
  }, [])

  return (
    <div className="max-w-xl space-y-5">
      <div className="rounded-2xl border border-line bg-card p-6">
        <p className="mb-4 font-fraunces text-xl font-semibold text-ink">Profile photo</p>
        {uid && <AvatarPicker client={supabase} uid={uid} url={url} name={name} size={80} onDone={setUrl} />}
        <p className="mt-3 text-sm text-ink-soft">This shows on your posts and comments in the Team Hub.</p>
      </div>
      <div className="rounded-2xl border border-line bg-card p-6">
        <p className="text-xs uppercase tracking-wider text-ink-soft">Name</p>
        <p className="mt-1 text-ink">{name ?? ''}</p>
        <p className="mt-4 text-xs uppercase tracking-wider text-ink-soft">Email</p>
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
