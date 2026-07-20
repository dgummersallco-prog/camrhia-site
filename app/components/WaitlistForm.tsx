'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function WaitlistForm() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) {
      setErrorMsg('Service not configured.')
      setState('error')
      return
    }
    setState('loading')
    setErrorMsg(null)
    const { error } = await supabase.from('waitlist_signups').insert({ email })
    if (error) {
      setErrorMsg(error.message)
      setState('error')
    } else {
      setState('success')
    }
  }

  if (state === 'success') {
    return (
      <p className="inline-flex items-center gap-2 rounded-full bg-sage/10 border border-sage/20 px-6 py-3 text-sm font-medium text-sage">
        <svg viewBox="0 0 12 12" className="w-3.5 h-3.5 shrink-0" fill="none">
          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        You&apos;re on the list — we&apos;ll be in touch soon.
      </p>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-stretch gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="your@email.com"
          className="flex-1 rounded-full border border-line bg-card px-5 py-3 text-sm text-ink placeholder:text-ink-soft/50 focus:outline-none focus:ring-2 focus:ring-twilight/25 focus:border-twilight transition min-w-0"
        />
        <button
          type="submit"
          disabled={state === 'loading'}
          className="rounded-full bg-twilight px-6 py-3 text-sm font-semibold text-white hover:bg-twilight/90 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
          style={{ backgroundColor: '#3A4A6B', color: '#ffffff' }}
        >
          {state === 'loading' ? 'Joining…' : 'Get early access →'}
        </button>
      </form>
      {state === 'error' && errorMsg && (
        <p className="mt-2 text-center text-xs text-red-600">{errorMsg}</p>
      )}
    </div>
  )
}
