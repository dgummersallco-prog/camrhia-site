'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { BRAND_NAME } from '@/lib/brand'

// ── Referral code generation ───────────────────────────────────────────────────

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

// ── Tiered earnings calculator ─────────────────────────────────────────────────

function calcMonthlyEarnings(n: number): number {
  const tier1 = Math.min(n, 10)
  const tier2 = Math.max(0, Math.min(n, 25) - 10)
  const tier3 = Math.max(0, n - 25)
  return tier1 * 59 * 0.20 + tier2 * 59 * 0.30 + tier3 * 59 * 0.40
}

function EarningsCalculator() {
  const [count, setCount] = useState(5)

  const monthly = calcMonthlyEarnings(count)
  const yearly  = monthly * 12

  function fmt(n: number) {
    return n.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: n % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    })
  }

  // Breakdown lines — only when count spans more than one tier
  const breakdownParts: string[] = []
  if (count > 0) {
    const t1 = Math.min(count, 10)
    breakdownParts.push(`${t1} at 20%`)
  }
  if (count > 10) {
    const t2 = Math.min(count, 25) - 10
    breakdownParts.push(`${t2} at 30%`)
  }
  if (count > 25) {
    const t3 = count - 25
    breakdownParts.push(`${t3} at 40%`)
  }
  const showBreakdown = count > 10

  return (
    <div className="rounded-2xl bg-card border border-line p-6 mb-8">
      <p className="font-mono text-xs tracking-widest uppercase text-ink-soft/60 mb-5">
        Earnings calculator
      </p>

      {/* Slider */}
      <div className="mb-6">
        <div className="flex items-baseline justify-between mb-2">
          <label className="text-sm font-medium text-ink">
            Photographers you could refer
          </label>
          <span className="font-fraunces text-2xl font-semibold text-ink leading-none">{count}</span>
        </div>
        <input
          type="range"
          min={1}
          max={50}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-line accent-twilight"
        />
        <div className="flex justify-between mt-1.5">
          <span className="font-mono text-xs text-ink-soft/50">1</span>
          <span className="font-mono text-xs text-ink-soft/50">50</span>
        </div>
      </div>

      {/* Earnings — the visual centrepiece */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-xl bg-paper border border-line px-4 py-4">
          <p className="text-xs text-ink-soft mb-1.5">Monthly</p>
          <p className="font-fraunces text-3xl font-semibold leading-none" style={{ color: '#3A4A6B' }}>
            {fmt(monthly)}
          </p>
        </div>
        <div className="rounded-xl bg-paper border border-line px-4 py-4">
          <p className="text-xs text-ink-soft mb-1.5">Yearly</p>
          <p className="font-fraunces text-3xl font-semibold leading-none" style={{ color: '#3A4A6B' }}>
            {fmt(yearly)}
          </p>
        </div>
      </div>

      {/* Tiered breakdown — visible when spanning more than one tier */}
      {showBreakdown ? (
        <p className="text-xs text-ink-soft/70 leading-relaxed">
          {breakdownParts.join(', ')} — {fmt(monthly)}/mo — for as long as they stay subscribed.
        </p>
      ) : (
        <p className="text-xs text-ink-soft/70 leading-relaxed">
          {count} referral{count !== 1 ? 's' : ''} at 20% — {fmt(monthly)}/mo — for as long as they stay subscribed.
        </p>
      )}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AffiliateSignupPage() {
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)
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

  // ── Email confirmation screen ──────────────────────────────────────────────

  if (confirmed) {
    return (
      <div className="min-h-screen bg-paper flex flex-col">
        <header className="border-b border-line bg-paper px-6 py-4">
          <Link href="/" className="font-fraunces text-xl font-semibold text-ink hover:text-twilight transition-colors">
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
            <h1 className="font-fraunces text-3xl font-semibold text-ink mb-3">Check your email</h1>
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

  // ── Main page ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <header className="border-b border-line bg-paper px-6 py-4">
        <Link href="/" className="font-fraunces text-xl font-semibold text-ink hover:text-twilight transition-colors">
          {BRAND_NAME}{' '}
          <span className="text-ink-soft font-normal text-lg">/ affiliate</span>
        </Link>
      </header>

      <main className="flex-1 mx-auto w-full max-w-2xl px-6 py-16">

        {/* ── Hero ── */}
        <div className="mb-12">
          <p className="font-mono text-xs tracking-widest uppercase text-brass mb-4">
            Earn with Camrhia
          </p>
          <h1 className="font-fraunces text-4xl font-semibold text-ink leading-tight mb-4">
            Most affiliate programs cap your best work. Ours rewards it.
          </h1>
          <p className="text-ink-soft text-base leading-relaxed max-w-xl">
            Refer a few photographers and you&apos;ll earn like everyone else. Refer a lot, and your rate climbs — permanently, on every referral after that point. No cap on how many people you can refer. No cap on how long you earn.
          </p>
        </div>

        {/* ── How the tiers work ── */}
        <div className="mb-12">
          <h2 className="font-fraunces text-xl font-semibold text-ink mb-5">How the tiers work</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            {[
              { n: '1', range: 'Referrals 1–10',  rate: '20%', desc: 'of their subscription, every month they stay.' },
              { n: '2', range: 'Referrals 11–25', rate: '30%', desc: '— automatically, once you cross 10.' },
              { n: '3', range: 'Referrals 26+',   rate: '40%', desc: '— your permanent rate from here on.' },
            ].map((tier) => (
              <div key={tier.n} className="rounded-2xl border border-line bg-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-twilight/10 font-mono text-xs font-semibold text-twilight" style={{ color: '#3A4A6B' }}>
                    {tier.n}
                  </span>
                  <span className="font-mono text-xs tracking-wide text-ink-soft">{tier.range}</span>
                </div>
                <p className="font-fraunces text-3xl font-semibold text-ink leading-none mb-2" style={{ color: '#3A4A6B' }}>
                  {tier.rate}
                </p>
                <p className="text-sm text-ink-soft leading-snug">{tier.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-ink-soft/70 leading-relaxed">
            Your rate locks in the moment each referral becomes a paying subscriber — it never goes down, even if a later referral falls into a different tier.
          </p>
        </div>

        {/* ── Why we built it this way ── */}
        <div className="rounded-2xl bg-paper-deep border border-line p-6 mb-12">
          <h2 className="font-fraunces text-lg font-semibold text-ink mb-3">
            Most programs are built to protect the company. This one&apos;s built to reward the person doing the work.
          </h2>
          <p className="text-sm text-ink-soft leading-relaxed">
            A flat rate forever means your 50th referral is worth exactly as much to you as your 1st — even though by then, you&apos;ve become one of our best partners. That never made sense to us. So the more photographers you bring in, the more every future referral is worth.
          </p>
        </div>

        {/* ── Calculator ── */}
        <EarningsCalculator />

        {/* ── Sign-up form ── */}
        <div className="max-w-sm">
          <p className="font-fraunces text-xl font-semibold text-ink mb-5">
            Create your account
          </p>
          <p className="text-sm text-ink-soft mb-6">
            Already have one?{' '}
            <Link href="/affiliate/login" className="text-twilight hover:underline">
              Sign in
            </Link>
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Full name</label>
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

            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Password</label>
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
              style={{ backgroundColor: '#3A4A6B', color: '#ffffff' }}
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>

      </main>
    </div>
  )
}
