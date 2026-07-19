'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

type State = 'idle' | 'loading' | 'success' | 'error'

export default function ContactForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [state, setState] = useState<State>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) {
      setState('error')
      setErrorMsg('Contact form is temporarily unavailable. Email us directly at hello@camrhia.com.')
      return
    }
    setState('loading')
    setErrorMsg(null)
    try {
      console.log('[diag] key ending in:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(-8))
      console.log('[diag] url:', process.env.NEXT_PUBLIC_SUPABASE_URL)
      const { error } = await supabase.from('support_messages').insert({
        kind: 'support',
        source: 'website',
        name,
        email,
        body: message,
        status: 'new',
      })
      console.log('[support] insert error:', JSON.stringify({ message: error?.message, details: error?.details, hint: error?.hint, code: error?.code }))
      if (error) throw error
      setState('success')
    } catch (err: unknown) {
      setState('error')
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again or email hello@camrhia.com.'
      )
    }
  }

  if (state === 'success') {
    return (
      <div className="rounded-2xl bg-card border border-line px-8 py-10 text-center">
        <div className="w-10 h-10 rounded-full bg-sage/15 flex items-center justify-center mx-auto mb-4">
          <svg viewBox="0 0 16 16" className="w-5 h-5 text-sage" fill="none">
            <path
              d="M3 8l4 4 6-6"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <p className="font-fraunces text-xl font-semibold text-ink mb-1">Message sent.</p>
        <p className="text-sm text-ink-soft">Thanks — we&apos;ll get back to you soon.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Jane Smith"
            className="w-full rounded-xl border border-line bg-card px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 focus:outline-none focus:ring-2 focus:ring-twilight/25 focus:border-twilight transition"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="jane@example.com"
            className="w-full rounded-xl border border-line bg-card px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 focus:outline-none focus:ring-2 focus:ring-twilight/25 focus:border-twilight transition"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-ink mb-1.5">Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          rows={5}
          placeholder="What can we help you with?"
          className="w-full rounded-xl border border-line bg-card px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 focus:outline-none focus:ring-2 focus:ring-twilight/25 focus:border-twilight transition resize-none"
        />
      </div>

      {state === 'error' && errorMsg && (
        <p className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </p>
      )}

      <button
        type="submit"
        disabled={state === 'loading'}
        className="rounded-full bg-twilight px-6 py-3 text-sm font-semibold text-white hover:bg-twilight/90 disabled:opacity-50 transition-colors"
      >
        {state === 'loading' ? 'Sending…' : 'Send message'}
      </button>
    </form>
  )
}
