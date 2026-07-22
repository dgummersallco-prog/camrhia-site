'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { BRAND_NAME } from '@/lib/brand'

const SOLO_FEATURES = [
  'Shared wedding timeline — built with your couple',
  'Inquiry-to-booking messaging in one place',
  'Contracts that send and sign themselves',
  'Auto-built payment schedules',
  'One shared calendar per wedding',
  'Public photographer profile with verified reviews',
  'In-app gallery delivery',
]

const STUDIO_FEATURES = [
  'Everything in the photographer plan',
  'Add photographers and assistants to your team',
  'Assign specific weddings to specific team members',
  'Hourly or per-shoot pay, tracked automatically',
  'Payroll schedule and payout summaries',
  'Time-off requests with approval workflow',
  'Per-wedding profitability and labor cost tracking',
]

type PageState = 'loading' | 'ready' | 'unauthenticated'
type BillingInterval = 'monthly' | 'annual'
type PlanTier = 'solo' | 'studio'

export default function BillingPage() {
  const [pageState, setPageState] = useState<PageState>('loading')
  const [userId, setUserId] = useState<string | null>(null)
  const [subscriptionActive, setSubscriptionActive] = useState(false)
  const [planTier, setPlanTier] = useState<PlanTier>('solo')
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly')
  const [actionLoading, setActionLoading] = useState<PlanTier | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadProfile() {
      if (!supabase) {
        setPageState('unauthenticated')
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setPageState('unauthenticated')
        return
      }

      setUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status, plan_tier')
        .eq('id', user.id)
        .single()

      setSubscriptionActive(profile?.subscription_status === 'active')
      setPlanTier((profile?.plan_tier as PlanTier) ?? 'solo')
      setPageState('ready')
    }

    loadProfile()
  }, [])

  async function handleSubscribe(plan: PlanTier) {
    if (!supabase) { setError('Service not configured.'); return }
    setActionLoading(plan)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, userId: user.id, interval: billingInterval, plan }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Could not create checkout session.')
      window.location.href = data.url
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setActionLoading(null)
    }
  }

  async function handleManage() {
    if (!userId) return
    setActionLoading(planTier)
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
      setActionLoading(null)
    }
  }

  if (pageState === 'loading') {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <p className="text-ink-soft text-sm animate-pulse">Loading…</p>
      </div>
    )
  }

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

  function PlanCard({ plan }: { plan: PlanTier }) {
    const isStudio = plan === 'studio'
    const features = isStudio ? STUDIO_FEATURES : SOLO_FEATURES
    const monthlyPrice = isStudio ? '$149' : '$59'
    const annualPrice = isStudio ? '$1,490' : '$590'
    const isCurrentPlan = subscriptionActive && planTier === plan
    const isDowngradeTarget = subscriptionActive && planTier === 'studio' && plan === 'solo'
    const isUpgradeTarget = subscriptionActive && planTier === 'solo' && plan === 'studio'

    let buttonLabel: string
    let onButtonClick: () => void
    let buttonDisabled = false

    if (isCurrentPlan) {
      buttonLabel = 'Current plan'
      onButtonClick = () => {}
      buttonDisabled = true
    } else if (isUpgradeTarget) {
      buttonLabel = actionLoading === plan ? 'Opening portal…' : 'Upgrade →'
      onButtonClick = handleManage
    } else if (isDowngradeTarget) {
      buttonLabel = actionLoading === plan ? 'Opening portal…' : 'Downgrade →'
      onButtonClick = handleManage
    } else {
      buttonLabel = actionLoading === plan
        ? 'Redirecting to checkout…'
        : billingInterval === 'annual'
          ? `Subscribe — ${annualPrice}/year →`
          : `Subscribe — ${monthlyPrice}/month →`
      onButtonClick = () => handleSubscribe(plan)
    }

    return (
      <div className={`rounded-2xl bg-card border p-6 flex flex-col ${isCurrentPlan ? 'border-twilight' : 'border-line'}`}>
        <p className="font-mono text-xs tracking-widest uppercase text-brass mb-3">
          {isStudio ? 'Studio plan' : 'Photographer plan'}
        </p>
        <div className="flex items-end gap-1 mb-1">
          <span className="font-fraunces text-3xl font-semibold text-ink">
            {billingInterval === 'annual' ? annualPrice : monthlyPrice}
          </span>
          <span className="text-ink-soft text-sm mb-1">
            {billingInterval === 'annual' ? '/year' : '/month'}
          </span>
        </div>
        <p className="text-xs text-ink-soft mb-5">
          {billingInterval === 'annual' ? 'Billed annually. Cancel any time.' : 'Billed monthly. Cancel any time.'}
        </p>

        <ul className="space-y-2.5 mb-6 flex-1">
          {features.map((f) => (
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

        {isDowngradeTarget && (
          <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
            Downgrading removes team management, payroll, and time-off features for your studio.
          </p>
        )}

        <button
          onClick={onButtonClick}
          disabled={buttonDisabled || actionLoading !== null}
          className={`w-full rounded-full py-3 text-sm font-semibold transition-colors disabled:opacity-50 ${
            isCurrentPlan
              ? 'border border-twilight text-twilight cursor-default'
              : 'bg-twilight text-white hover:bg-twilight/90'
          }`}
          style={isCurrentPlan ? {} : { backgroundColor: '#3A4A6B', color: '#ffffff' }}
        >
          {buttonLabel}
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <header className="border-b border-line bg-paper px-6 py-4">
        <Link href="/" className="font-fraunces text-xl font-semibold text-ink hover:text-twilight transition-colors">
          {BRAND_NAME}
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center px-6 py-16">
        <div className="w-full max-w-3xl">
          <h1 className="font-fraunces text-4xl font-semibold text-ink mb-2 leading-tight text-center">
            {subscriptionActive ? 'Your plan' : `Subscribe to ${BRAND_NAME}`}
          </h1>
          <p className="text-ink-soft text-sm mb-8 text-center">
            {subscriptionActive
              ? 'Manage or change your subscription below.'
              : 'Choose the plan that fits how you work.'}
          </p>

          <div className="flex items-center justify-center gap-1 bg-paper-deep rounded-full px-1 py-1 mb-8 max-w-xs mx-auto">
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
                {opt === 'annual' && (
                  <span className="text-brass font-semibold">Save 2 months</span>
                )}
              </button>
            ))}
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-6 text-center">
              {error}
            </p>
          )}

          <div className="grid sm:grid-cols-2 gap-6">
            <PlanCard plan="solo" />
            <PlanCard plan="studio" />
          </div>

          <p className="mt-8 text-center text-xs text-ink-soft">
            Secure billing powered by Stripe.
          </p>
        </div>
      </main>
    </div>
  )
}
