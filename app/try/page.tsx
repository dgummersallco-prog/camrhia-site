'use client'
import { useState } from 'react'
import Link from 'next/link'
import Wordmark from '@/app/components/Wordmark'
import { supabase } from '@/lib/supabase'

const field =
  'w-full rounded-xl border border-line bg-card px-4 py-3 text-sm text-ink placeholder:text-ink-soft/50 focus:border-twilight focus:outline-none focus:ring-2 focus:ring-twilight/25'

export default function TryPage() {
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [exists, setExists] = useState(false)

  async function go(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErr('')
    setExists(false)
    try {
      const sb = supabase
      if (!sb) { setErr('Service not configured.'); setBusy(false); return }
      if (!first.trim() || !email.trim()) { setErr('Add your name and email.'); setBusy(false); return }
      if (password.length < 8) { setErr('Use a password with at least 8 characters.'); setBusy(false); return }
      const r = await fetch('/api/billing/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first, last, email, password }),
      })
      const j = await r.json().catch(() => ({}))
      if (r.status === 409) { setExists(true); setBusy(false); return }
      if (!r.ok) { setErr(j.error || 'Could not create your account.'); setBusy(false); return }
      const { error: se } = await sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
      if (se) { setErr(se.message); setBusy(false); return }
      window.location.href = '/dashboard'
      return
    } catch {
      setErr('Something went wrong. Please try again.')
    }
    setBusy(false)
  }

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="border-b border-line bg-paper px-6 py-4">
        <Link href="/"><Wordmark className="text-3xl" /></Link>
      </header>
      <main className="mx-auto w-full max-w-md flex-1 px-6 py-12 md:py-20">
        <p className="mb-3 font-mono text-xs uppercase tracking-widest text-brass">Photographers</p>
        <h1 className="font-fraunces text-4xl font-semibold text-ink">Try everything free for 14 days.</h1>
        <p className="mt-4 text-ink-soft">
          Your business, your website, specials, gallery delivery and the Editing Room are all on. No card needed.
          When the 14 days are up, you choose what to keep.
        </p>
        <form onSubmit={go} className="mt-8 space-y-3 rounded-3xl border border-line bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input value={first} onChange={(e) => setFirst(e.target.value)} placeholder="First name" autoComplete="given-name" className={field} />
            <input value={last} onChange={(e) => setLast(e.target.value)} placeholder="Last name" autoComplete="family-name" className={field} />
          </div>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" className={field} />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (8+ characters)" autoComplete="new-password" className={field} />
          <button type="submit" disabled={busy} className="w-full rounded-full bg-twilight px-6 py-3.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60">
            {busy ? 'One moment...' : 'Start my 14 free days'}
          </button>
          {exists && (
            <p className="text-sm text-ink">
              You already have an account with that email.{' '}
              <Link href="/login?next=/dashboard" className="font-medium text-twilight underline">Sign in</Link>
            </p>
          )}
          {err && <p className="text-sm text-red-700">{err}</p>}
        </form>
        <p className="mt-5 text-center text-sm text-ink-soft">
          Already have an account? <Link href="/login?next=/dashboard" className="font-medium text-twilight underline">Sign in</Link>
        </p>
      </main>
    </div>
  )
}
