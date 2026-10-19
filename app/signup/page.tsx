'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import Wordmark from '@/app/components/Wordmark'
import { APP_STORE_URL } from '@/lib/appStore'
import { supabase } from '@/lib/supabase'

const field =
  'w-full rounded-xl border border-line bg-card px-4 py-3 text-sm text-ink placeholder:text-ink-soft/50 focus:border-twilight focus:outline-none focus:ring-2 focus:ring-twilight/25'

function SignupForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState((params.get('code') ?? '').toUpperCase())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const sb = supabase
    if (!sb) { setError('Service not configured.'); return }
    if (password.length < 8) { setError('Use a password with at least 8 characters.'); return }
    setBusy(true)
    setError(null)
    const meta: Record<string, string> = {
      account_type: 'couple',
      display_name: `${first.trim()} ${last.trim()}`.trim(),
      first_name: first.trim(),
      last_name: last.trim(),
    }
    if (code.trim()) meta.session_number = code.trim()
    const { data, error: e2 } = await sb.auth.signUp({
      email: email.trim(),
      password,
      options: { data: meta, emailRedirectTo: 'https://camrhia.com/confirm-email' },
    })
    setBusy(false)
    if (e2) { setError(e2.message); return }
    if (data.session) { router.replace('/start'); return }
    setSentTo(email.trim())
  }

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="border-b border-line bg-paper px-6 py-4">
        <Link href="/"><Wordmark className="text-3xl" /></Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          {sentTo ? (
            <div className="text-center">
              <span className="mb-6 inline-block rounded-full bg-sage/10 px-4 py-1.5 font-mono text-xs uppercase tracking-widest text-sage">Check your email</span>
              <h1 className="mb-3 font-fraunces text-3xl font-semibold text-ink">One more step</h1>
              <p className="text-ink-soft">We sent a confirmation link to <strong className="text-ink">{sentTo}</strong>. Open it on this device to finish setting up your account.</p>
            </div>
          ) : (
            <>
              <p className="mb-3 font-mono text-xs uppercase tracking-widest text-brass">Clients</p>
              <h1 className="mb-2 font-fraunces text-3xl font-semibold text-ink">Create your free account</h1>
              <p className="mb-8 text-sm text-ink-soft">See your sessions, sign contracts, pay, message your photographer and get your photos, all in one place. Photographers can <a href={APP_STORE_URL} className="underline hover:text-ink">start in the app</a>.</p>
              <form onSubmit={submit} className="space-y-3">
                <div className="flex gap-3">
                  <input value={first} onChange={(e) => setFirst(e.target.value)} required placeholder="First name" autoComplete="given-name" className={field} />
                  <input value={last} onChange={(e) => setLast(e.target.value)} required placeholder="Last name" autoComplete="family-name" className={field} />
                </div>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Email" autoComplete="email" className={field} />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Password (8+ characters)" autoComplete="new-password" className={field} />
                <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Session code from your photographer (optional)" className={`${field} font-mono`} />
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button type="submit" disabled={busy} className="w-full rounded-xl bg-twilight px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60">
                  {busy ? 'Creating account…' : 'Create account'}
                </button>
                <p className="text-center text-xs text-ink-soft">
                  By creating an account you agree to our <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy" className="underline">Privacy Policy</Link>.
                </p>
              </form>
              <p className="mt-8 text-center text-sm text-ink-soft">
                Already have an account? <Link href="/login" className="underline hover:text-ink">Log in</Link>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-paper" />}>
      <SignupForm />
    </Suspense>
  )
}
