'use client'

import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabaseAffiliate as defaultClient } from '@/lib/supabaseAffiliate'
import HubFeed from './HubFeed'
import HubAnnouncements from './HubAnnouncements'
import HubBoard from './HubBoard'
import HubTop from './HubTop'

export default function HubHome({ client }: { client?: SupabaseClient | null }) {
  const supabase = client ?? defaultClient
  const [uid, setUid] = useState<string | null>(null)
  const [ok, setOk] = useState<boolean | null>(null)
  const [admin, setAdmin] = useState(false)

  useEffect(() => {
    ;(async () => {
      if (!supabase) return
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setOk(false); return }
      setUid(session.user.id)
      const [m, a] = await Promise.all([supabase.rpc('hub_is_member'), supabase.rpc('hub_is_admin')])
      setAdmin(a.data === true)
      setOk(m.data === true || a.data === true)
    })()
  }, [supabase])

  if (ok === null) return <p className="text-sm text-ink-soft">Loading…</p>
  if (!ok || !uid) return <HubFeed client={client} />

  return (
    <div className="space-y-10">
      <HubAnnouncements client={supabase} uid={uid} admin={admin} />
      <HubTop client={supabase} />
      <section>
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-4 font-fraunces text-2xl font-semibold text-ink">Message board</h2>
        </div>
        <HubBoard client={supabase} uid={uid} admin={admin} />
      </section>
      <section>
        <h2 className="mb-4 font-fraunces text-2xl font-semibold text-ink">Posts</h2>
        <HubFeed client={client} />
      </section>
    </div>
  )
}
