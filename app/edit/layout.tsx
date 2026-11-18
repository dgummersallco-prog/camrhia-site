'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

export default function EditLayout({ children }: { children: ReactNode }) {
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    async function run() {
      const sb = supabase
      if (!sb) return
      const { data } = await sb.auth.getSession()
      if (!data.session) return
      const uid = data.session.user.id
      const [pr, mem] = await Promise.all([
        sb.from('profiles').select('account_type, subscription_status, trial_ends_at').eq('id', uid).maybeSingle(),
        sb.from('studio_members').select('studio_owner_id, status').eq('member_id', uid).limit(1),
      ])
      const p = pr.data as { account_type?: string | null; subscription_status?: string | null; trial_ends_at?: string | null } | null
      if (!p || p.account_type === 'couple') return
      const row = ((mem.data ?? []) as { studio_owner_id: string; status: string }[]).find((m) => m.status === 'active')
      let access: boolean
      if (row) {
        const { data: os } = await sb.rpc('get_studio_owner_status', { p_owner_id: row.studio_owner_id })
        access = os === 'active' || os === 'comped'
      } else {
        const trialActive = !!p.trial_ends_at && new Date(p.trial_ends_at) > new Date()
        access = p.subscription_status === 'active' || p.subscription_status === 'comped' || trialActive
        if (!access) {
          const { data: ents } = await sb.from('entitlements').select('status').eq('user_id', uid).in('product', ['retouch', 'cull'])
          access = ((ents ?? []) as { status: string }[]).some((x) => x.status === 'active' || x.status === 'trialing')
        }
      }
      setBlocked(!access)
    }
    run().catch(() => {})
  }, [])

  if (blocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper px-6">
        <div className="max-w-md rounded-2xl border border-white/70 bg-white/60 p-8 text-center">
          <h1 className="font-fraunces text-3xl text-ink">The editing room is locked</h1>
          <p className="mt-3 text-ink-soft">
            Your free 14 days are up. Choose Camri Cull or Retouch to keep editing, and everything here will be right where you left it.
          </p>
          <a href="/keep" className="mt-6 inline-block rounded-full bg-twilight px-6 py-3 text-sm font-medium text-white transition hover:opacity-90">Choose what to keep</a>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
