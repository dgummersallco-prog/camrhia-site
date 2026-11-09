'use client'

import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabaseAffiliate as defaultClient } from '@/lib/supabaseAffiliate'
import HubFeed from './HubFeed'
import HubAnnouncements from './HubAnnouncements'
import HubBoard from './HubBoard'

const ROSE = '#A9545F'

export default function HubHome({ client }: { client?: SupabaseClient | null }) {
  const supabase = client ?? defaultClient
  const [uid, setUid] = useState<string | null>(null)
  const [ok, setOk] = useState<boolean | null>(null)
  const [admin, setAdmin] = useState(false)
  const [tab, setTab] = useState<'board' | 'posts'>('board')

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
    <div className="space-y-6">
      <HubAnnouncements client={supabase} uid={uid} admin={admin} />
      <div className="flex gap-2 text-sm">
        {([['board', 'Message board'], ['posts', 'Posts']] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-full border px-6 py-2.5 text-sm font-medium transition ${tab === k ? 'text-white' : 'border-[#EBD9D1] bg-white/60 text-ink hover:border-twilight'}`} style={tab === k ? { backgroundColor: ROSE, borderColor: ROSE } : undefined}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'board' ? <HubBoard client={supabase} uid={uid} admin={admin} /> : <HubFeed client={client} />}
    </div>
  )
}
