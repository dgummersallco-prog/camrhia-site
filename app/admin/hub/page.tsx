'use client'

import { useEffect, useState } from 'react'
import HubHome from '@/app/affiliate/components/HubHome'
import { AvatarPicker } from '@/app/affiliate/components/Avatar'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export default function AdminHubPage() {
  const [uid, setUid] = useState<string | null>(null)
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      if (!supabaseAdmin) return
      const { data: { session } } = await supabaseAdmin.auth.getSession()
      if (!session) return
      setUid(session.user.id)
      const { data } = await supabaseAdmin.rpc('hub_avatars', { p_ids: [session.user.id] })
      setUrl((data as { user_id: string; avatar_url: string | null }[] | null)?.[0]?.avatar_url ?? null)
    })()
  }, [])

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 font-fraunces text-3xl font-semibold text-ink">Team Hub</h1>
      <div className="mb-8 max-w-xl rounded-2xl border border-line bg-card p-6">
        <p className="mb-4 font-fraunces text-xl font-semibold text-ink">Camrhia profile photo</p>
        {uid && <AvatarPicker client={supabaseAdmin} uid={uid} url={url} name="Camrhia" size={80} onDone={setUrl} />}
        <p className="mt-3 text-sm text-ink-soft">Your posts, pinned messages and announcements show as Camrhia with this photo.</p>
      </div>
      <HubHome client={supabaseAdmin} />
    </main>
  )
}
