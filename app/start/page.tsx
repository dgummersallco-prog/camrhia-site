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
      const { data: prof } = await sb.from('profiles').select('account_type').eq('id', sess.session.user.id).maybeSingle()
      router.replace((prof as { account_type?: string } | null)?.account_type === 'couple' ? '/my' : '/dashboard')
    }
    go()
  }, [router])
  return <div className="min-h-screen bg-paper" />
}
