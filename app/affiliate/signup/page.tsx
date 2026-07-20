'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { BRAND_NAME } from '@/lib/brand'

function baseCode(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10) || 'user'
}

async function uniqueReferralCode(name: string): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const suffix = Math.floor(100 + Math.random() * 900)
    const code = `${baseCode(name)}${suffix}`
    if (!supabase) return code
    const { data } = await supabase
      .from('affiliates')
      .select('referral_code')
      .eq('referral_code', code)
      .maybeSingle()
    if (!data) return code
  }
  return `${baseCode(name)}${Date.now().toString().slice(-4)}`
}

export default function AffiliateSignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) {
      setError('Service not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      // Generate referral code before signUp so it can be stored in user metadata.
      // The DB trigger reads it from raw_user_meta_data and inserts the affiliates row —
      // no client-side insert needed, so no session is required at this point.
      const referral_code = await uniqueReferralCode(name)

      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { account_kind: 'affiliate', name, referral_code },
        },
      })
      if (authError) throw authError

      // Email confirmation is enabled — there's no session yet.
      // Show the confirmation screen; the trigger will have already created the affiliates row.
      setConfirmed(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  if (confirmed) {
    return (
      <div className="min-h-screen bg-paper flex flex-col">
        <header className="border-b border-line bg-paper px-6 py-4">
          <Link
            href="/"
            className="font-fraunces text-xl font-semibold text-ink hover:text-twilight transition-colors"
          >
            {BRAND_NAME}{' '}
            <span className="text-ink-soft font-normal text-lg">/ affiliate</span>
          </Link>
        </header>
        <main className="flex-1 flex items-center justify-center px-6 py-16 text-center">
          <div className="w-full max-w-sm">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-sage/15 mb-6">
              <svg viewBox="0 0 20 20" className="w-5 h-5 text-sage" fill="none">
                <path d="M2.5 10.5l5 5 10-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="font-fraunces text-3xl font-semibold text-ink mb-3">
              Check your email
            </h1>
            <p className="text-sm text-ink-soft mb-2">
              We sent a confirmation link to <span className="font-medium text-ink">{email}</span>.
            </p>
            <p className="text-sm text-ink-soft mb-8">
              Click it to confirm your account, then come back and log in.
            </p>
            <Link
              href="/affiliate/login"
              className="inline-flex items-center rounded-full border border-twilight px-6 py-2.5 text-sm font-semibold text-twilight hover:bg-twilight/5 transition-colors"
            >
              Go to login →
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <header className="border-b border-line bg-paper px-6 py-4">
        <Link
          href="/"
          className="font-fraunces text-xl font-semibold text-ink hover:text-twilight transition-colors"
        >
          {BRAND_NAME}{' '}
          <span className="text-ink-soft font-normal text-lg">/ affiliate</span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <p className="font-mono text-xs tracking-widest uppercase text-brass mb-4">
            Affiliate program
          </p>
          <h1 className="font-fraunces text-3xl font-semibold text-ink mb-2">
            Create your account
          </h1>
          <p className="text-sm text-ink-soft mb-8">
            Already have one?{' '}
            <Link href="/affiliate/login" className="text-twilight hover:underline">
              Sign in
            </Link>
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                Full name
              </label>
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
              <label className="block text-sm font-medium text-ink mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="jane@example.com"
                className="w-full rounded-xl border border-line bg-card px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 focus:outline-none focus:ring-2 focus:ring-twilight/25 focus:border-twilight transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="At least 8 characters"
                className="w-full rounded-xl border border-line bg-card px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 focus:outline-none focus:ring-2 focus:ring-twilight/25 focus:border-twilight transition"
              />
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-twilight py-3 text-sm font-semibold text-white hover:bg-twilight/90 disabled:opacity-50 transition-colors mt-2"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
