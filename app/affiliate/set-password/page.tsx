'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabaseAffiliate as supabase } from '@/lib/supabaseAffiliate'
import Wordmark from '@/app/components/Wordmark'

const ROSE = '#8C6B3F'
const inputCls =
  'w-full rounded-xl border border-line bg-card px-4 py-3 text-sm text-ink placeholder:text-ink-soft/50 focus:outline-none focus:ring-2 focus:ring-twilight/25 focus:border-twilight transition'

export default function SetPasswordPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [checked, setChecked] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!supabase) { setChecked(true); return }
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) { setReady(true); setChecked(true) }
    })
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true)
      setChecked(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setLoading(true)
    setError(null)
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) { setError(err.message); return }
    router.push('/affiliate/dashboard')
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <Link href="/" aria-label="Camrhia home"><Wordmark className="text-3xl" /></Link>
      </header>
      <main className="mx-auto max-w-md px-6 py-16">
        <div className="rounded-[2rem] border border-line bg-card p-7 shadow-xl sm:p-9">
          <h1 className="font-fraunces text-3xl font-semibold text-ink">Create your password</h1>
          {!checked ? (
            <p className="mt-4 text-sm text-ink-soft">One moment…</p>
          ) : !ready ? (
            <p className="mt-4 text-sm text-ink-soft">This link has expired or was already used. Reply to the email we sent you and we will send a new one.</p>
          ) : (
            <>
              <p className="mt-1 text-sm text-ink-soft">You are approved. Pick a password to open your affiliate dashboard.</p>
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} placeholder="At least 8 characters" className={inputCls} />
                {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
                <button type="submit" disabled={loading} className="w-full rounded-full py-4 text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: ROSE }}>
                  {loading ? 'Saving…' : 'Create my password'}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
