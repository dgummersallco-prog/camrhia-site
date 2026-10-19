'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function StartPage() {
  const router = useRouter()
  useEffect(() => {
    async function go() {
      const sb = supabase
      if (!sb) return
      const { data: sess } = await sb.auth.getSession()
      if (!sess.session) { router.replace('/login'); return }
      const user = sess.session.user
      let accountType = ((await sb.from('profiles').select('account_type').eq('id', user.id).maybeSingle()).data as { account_type?: string } | null)?.account_type
      if (!accountType) {
        // First sign-in after a website sign-up: create the profile from the sign-up details.
        const m = (user.user_metadata ?? {}) as Record<string, string>
        if (m.account_type === 'couple') {
          await sb.from('profiles').upsert(
            { id: user.id, account_type: 'couple', display_name: m.display_name || null, first_name: m.first_name || null, last_name: m.last_name || null },
            { onConflict: 'id' },
          )
          if (m.session_number) await sb.rpc('link_session_by_number', { p_number: String(m.session_number) })
          accountType = 'couple'
        }
      }
      router.replace(accountType === 'couple' ? '/my' : '/dashboard')
    }
    go()
  }, [router])
  return <div className="min-h-screen bg-paper" />
}
