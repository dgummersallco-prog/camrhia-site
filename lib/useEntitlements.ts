'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type Entitlements = { showcase: boolean; retouch: boolean; cull: boolean; loading: boolean }

// What the signed-in user has paid for. Retouch includes Cull. Comped accounts are unlocked.
export function useEntitlements(): Entitlements {
  const [s, setS] = useState<Entitlements>({ showcase: false, retouch: false, cull: false, loading: true })
  useEffect(() => {
    let off = false
    async function run() {
      const sb = supabase
      if (!sb) { if (!off) setS((x) => ({ ...x, loading: false })); return }
      const { data } = await sb.auth.getSession()
      if (!data.session) { if (!off) setS((x) => ({ ...x, loading: false })); return }
      const uid = data.session.user.id
      const [ents, prof] = await Promise.all([
        sb.from('entitlements').select('product, status').eq('user_id', uid),
        sb.from('profiles').select('subscription_status').eq('id', uid).maybeSingle(),
      ])
      const comped = (prof.data as { subscription_status?: string | null } | null)?.subscription_status === 'comped'
      const ok = new Set(
        ((ents.data ?? []) as { product: string; status: string }[])
          .filter((r) => r.status === 'active' || r.status === 'trialing')
          .map((r) => r.product)
      )
      if (!off) setS({
        showcase: comped || ok.has('showcase'),
        retouch: comped || ok.has('retouch'),
        cull: comped || ok.has('cull') || ok.has('retouch'),
        loading: false,
      })
    }
    run().catch(() => { if (!off) setS((x) => ({ ...x, loading: false })) })
    return () => { off = true }
  }, [])
  return s
}
