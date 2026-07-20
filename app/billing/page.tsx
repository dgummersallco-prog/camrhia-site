'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { BRAND_NAME } from '@/lib/brand'

const FEATURES = [
  'Shared wedding timeline — built with your couple',
  'Inquiry-to-booking messaging in one place',
  'Contracts that send and sign themselves',
  'Auto-built payment schedules',
  'One shared calendar per wedding',
  'Public photographer profile with verified reviews',
  'In-app gallery delivery',
]

type PageState = 'loading' | 'active' | 'inactive' | 'unauthenticated'
type BillingInterval = 'monthly' | 'annual'

export default function BillingPage() {
  const [pageState, setPageState] = useState<PageState>('loading')
  const [userId, setUserId] = useState<string | null>(null)
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly')
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch the logged-in user's profile on mount to determine subscription state
  useEffect(() => {
    async function loadProfile() {
      if (!supabase) {
        setPageState('inactive')
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setPageState('unauthenticated')
        return
      }

      setUserId(user.id)

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('subscription_status')
        .eq('id', user.id)
        .single()

      console.log('[diag] logged in as user id:', user.id, 'email:', user.email)
      console.log('[diag] profile fetch result:', JSON.stringify(profile), 'error:', JSON.stringify({ message: profileError?.message, code: profileError?.code }))

      setPageState(profile?.subscription_status === 'active' ? 'active' : 'inactive')
    }

    loadProfile()
  }, [])

  async function handleSubscribe() {
    if (!supabase) { setError('Service not configured.'); return }
    setActionLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, userId: user.id, interval: billingInterval }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Could not create checkout session.')
      window.location.href = data.url
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setActionLoading(false)
    }
  }

  async function handleManage() {
    if (!userId) return
    setActionLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Could not open billing portal.')
      window.location.href = data.url
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setActionLoading(false)
    }
  }

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <p className="text-ink-soft text-sm animate-pulse">Loading…</p>
      </div>
    )
  }

  // ── Not logged in ───────────────────────────────────────────────────────────
  if (pageState === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-paper flex flex-col">
        <header className="border-b border-line bg-paper px-6 py-4">
          <Link href="/" className="font-fraunces text-xl font-semibold text-ink hover:text-twilight transition-colors">
            {BRAND_NAME}
          </Link>
        </header>
        <main className="flex-1 flex items-center justify-center px-6 py-16 text-center">
          <div>
            <h1 className="font-fraunces text-3xl font-semibold text-ink mb-4">Sign in to continue</h1>
            <p className="text-ink-soft text-sm mb-8">You need to be logged in to manage your subscription.</p>
            <Link
              href="/login"
              className="inline-flex items-center rounded-full bg-twilight px-6 py-3 text-sm font-semibold text-white hover:bg-twilight/90 transition-colors"
              style={{ backgroundColor: '#3A4A6B', color: '#ffffff' }}
            >
              Sign in →
            </Link>
          </div>
        </main>
      </div>
    )
  }

  // ── Shared page shell ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <header className="border-b border-line bg-paper px-6 py-4">
        <Link href="/" className="font-fraunces text-xl font-semibold text-ink hover:text-twilight transition-colors">
          {BRAND_NAME}
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <p className="font-mono text-xs tracking-widest uppercase text-brass mb-4">
            Photographer plan
          </p>

          {/* ── Active subscription ── */}
          {pageState === 'active' ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <h1 className="font-fraunces text-4xl font-semibold text-ink leading-tight">
                  You&apos;re subscribed
                </h1>
                <span className="mt-1 inline-flex items-center justify-center w-7 h-7 rounded-full bg-sage/15">
                  <svg viewBox="0 0 12 12" className="w-3.5 h-3.5 text-sage" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </div>
              <p className="text-ink-soft text-sm mb-8">
                Your {BRAND_NAME} photographer subscription is active.
              </p>

              <div className="rounded-2xl bg-card border border-line p-6 mb-6">
                <ul className="space-y-2.5">
                  {FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-ink">
                      <span className="mt-1 w-4 h-4 rounded-full bg-sage/10 flex items-center justify-center shrink-0">
                        <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-sage" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {error && (
                <p className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-4">
                  {error}
                </p>
              )}

              <button
                onClick={handleManage}
                disabled={actionLoading}
                className="w-full rounded-full border border-twilight py-3 text-sm font-semibold text-twilight hover:bg-twilight/5 disabled:opacity-50 transition-colors"
              >
                {actionLoading ? 'Opening portal…' : 'Manage subscription →'}
              </button>
              <p className="mt-4 text-center text-xs text-ink-soft">
                Update your card, view invoices, or cancel — powered by Stripe.
              </p>
            </>
          ) : (
            /* ── Inactive / not subscribed ── */
            <>
              <h1 className="font-fraunces text-4xl font-semibold text-ink mb-2 leading-tight">
                Subscribe to {BRAND_NAME}
              </h1>
              <p className="text-ink-soft text-sm mb-6">
                Everything you need to run your photography business.
              </p>

              {/* Billing interval toggle */}
              <div className="flex items-center gap-1 bg-paper-deep rounded-full px-1 py-1 mb-6">
                {(['monthly', 'annual'] as BillingInterval[]).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setBillingInterval(opt)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      billingInterval === opt
                        ? 'bg-ink text-white shadow-sm'
                        : 'text-ink-soft hover:text-ink'
                    }`}
                  >
                    {opt === 'monthly' ? 'Monthly' : 'Annual'}
                    {opt === 'annual' && billingInterval !== 'annual' && (
                      <span className="text-brass font-semibold">Save $118</span>
                    )}
                  </button>
                ))}
              </div>

              <div className="rounded-2xl bg-card border border-line p-6 mb-6">
                {billingInterval === 'monthly' ? (
                  <>
                    <div className="flex items-end gap-1 mb-1">
                      <span className="font-fraunces text-4xl font-semibold text-ink">$59</span>
                      <span className="text-ink-soft text-sm mb-1.5">/month</span>
                    </div>
                    <p className="text-xs text-ink-soft mb-5">Billed monthly. Cancel any time.</p>
                  </>
                ) : (
                  <>
                    <div className="flex items-end gap-2 mb-1">
                      <span className="font-fraunces text-4xl font-semibold text-ink">$590</span>
                      <span className="text-ink-soft text-sm mb-1.5">/year</span>
                      <span className="mb-1.5 inline-flex items-center rounded-full bg-brass/15 px-2 py-0.5 text-xs font-semibold text-brass">
                        2 months free
                      </span>
                    </div>
                    <p className="text-xs text-ink-soft mb-5">Billed annually — save $118/year. Cancel any time.</p>
                  </>
                )}
                <ul className="space-y-2.5">
                  {FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-ink">
                      <span className="mt-1 w-4 h-4 rounded-full bg-twilight/10 flex items-center justify-center shrink-0">
                        <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-twilight" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {error && (
                <p className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-4">
                  {error}
                </p>
              )}

              <button
                onClick={handleSubscribe}
                disabled={actionLoading}
                className="w-full rounded-full bg-twilight py-3 text-sm font-semibold text-white hover:bg-twilight/90 disabled:opacity-50 transition-colors"
                style={{ backgroundColor: '#3A4A6B', color: '#ffffff' }}
              >
                {actionLoading
                  ? 'Redirecting to checkout…'
                  : billingInterval === 'annual'
                    ? 'Subscribe — $590/year →'
                    : 'Subscribe — $59/month →'}
              </button>
              <p className="mt-4 text-center text-xs text-ink-soft">
                Secure checkout powered by Stripe.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
