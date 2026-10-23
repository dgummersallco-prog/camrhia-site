'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { BRAND_NAME } from '@/lib/brand'
import Wordmark from "@/app/components/Wordmark"
import { DashboardHeader } from '@/app/components/DashboardHeader'

const SOLO_FEATURES = [
  'Shared session timeline — built with your client',
  'Inquiry-to-booking messaging in one place',
  'Contracts that send and sign themselves',
  'Auto-built payment schedules',
  'One shared calendar per session',
  'Public photographer profile with verified reviews',
  'Client galleries with PIN, favorites and one-click zip download',
  'Portfolio website with a live editor',
  'Calendar feed for Google and Apple Calendar',
]

const STUDIO_FEATURES = [
  'Everything in the photographer plan',
  'Add photographers and assistants to your team',
  'Assign specific sessions to specific team members',
  'Hourly or per-shoot pay, tracked automatically',
  'Payroll schedule and payout summaries',
  'Time-off requests with approval workflow',
  'Per-session profitability and labor cost tracking',
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
  const [status, setStatus] = useState<string | null>(null)
  const [trialEnds, setTrialEnds] = useState<string | null>(null)

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
        .select('subscription_status, plan_tier, trial_ends_at')
        .eq('id', user.id)
        .single()

      setSubscriptionActive(['active', 'comped'].includes(profile?.subscription_status ?? ''))
      setPlanTier((profile?.plan_tier as PlanTier) ?? 'solo')
      setStatus((profile?.subscription_status as string | null) ?? null)
      setTrialEnds((profile?.trial_ends_at as string | null) ?? null)
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
      <div className="min-h-screen bg-paper xl:pl-60">
        <DashboardHeader active="billing" />
        <main className="mx-auto max-w-3xl px-6 py-10">
          <p className="text-ink-soft text-sm animate-pulse">Loading…</p>
        </main>
      </div>
    )
  }

  if (pageState === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-paper flex flex-col">
        <header className="border-b border-line bg-paper px-6 py-4">
          <Link href="/" className="font-fraunces text-xl font-semibold text-ink hover:text-twilight transition-colors">
            <Wordmark className="text-3xl" />
          </Link>
        </header>
        <main className="flex-1 flex items-center justify-center px-6 py-16 text-center">
          <div>
            <h1 className="font-fraunces text-3xl font-semibold text-ink mb-4">Sign in to continue</h1>
            <p className="text-ink-soft text-sm mb-8">You need to be logged in to manage your subscription.</p>
            <Link
              href="/login"
              className="inline-flex items-center rounded-full bg-twilight px-6 py-3 text-sm font-semibold text-white hover:bg-twilight/90 transition-colors"
              style={{ backgroundColor: '#A9545F', color: '#ffffff' }}
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
    const annualPrice = isStudio ? '$999.99' : '$590'
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
          style={isCurrentPlan ? {} : { backgroundColor: '#A9545F', color: '#ffffff' }}
        >
          {buttonLabel}
        </button>
      </div>
    )
  }

  const trialDaysLeft = trialEnds ? Math.ceil((new Date(trialEnds).getTime() - Date.now()) / 86400000) : null
  const bannerText =
    status === 'comped'
      ? 'Your account is complimentary. Nothing to pay.'
      : status === 'past_due'
        ? 'Your last payment did not go through. Update your payment method to keep your account active.'
        : status === 'active'
          ? `You are subscribed to the ${planTier === 'studio' ? 'Studio' : 'Photographer'} plan. Update your card, download invoices or cancel in the billing portal.`
          : trialDaysLeft !== null && trialDaysLeft > 0
            ? `Your free trial ends in ${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'}. Subscribe to keep your galleries and sessions.`
            : null

  if (status === 'comped') {
    return (
      <div className="min-h-screen bg-paper xl:pl-60">
        <DashboardHeader active="billing" />
        <main className="mx-auto max-w-3xl px-6 py-10">
          <p className="mb-2 font-mono text-xs uppercase tracking-widest text-brass">Billing</p>
          <h1 className="mb-6 font-fraunces text-3xl font-medium text-ink">A thank you from Camrhia</h1>
          <section className="rounded-2xl border border-line bg-card p-8 sm:p-12">
            <span className="mb-8 inline-block rounded-full bg-blush-wash px-4 py-1.5 font-mono text-xs uppercase tracking-widest text-twilight">
              Founding photographer · Complimentary for life
            </span>
            <div className="space-y-5 font-fraunces text-xl leading-relaxed text-ink sm:text-2xl">
              <p>Dear friend,</p>
              <p>
                You were here before anyone else. Before the reviews, before the rankings, before the first thousand
                photographers, you trusted Camrhia with your studio. That means more to me than I can say.
              </p>
              <p>
                Everything you use here exists because photographers told me what was missing, and what you ask for next
                will shape what we build. As a founding photographer, your voice will always carry extra weight.
              </p>
              <p>
                As a thank you, your account is complimentary for life. No subscription, no renewal and no catch, for as
                long as Camrhia exists.
              </p>
              <p>
                If something is broken, confusing or missing, tell me. You can reach us anytime at{' '}
                <a href="/support" className="text-twilight underline underline-offset-4 hover:text-ink">camrhia.com/support</a>.
              </p>
              <p className="pt-2">
                With gratitude,
                <br />
                Derek
                <br />
                <span className="text-lg text-ink-soft sm:text-xl">Founder, Camrhia</span>
              </p>
            </div>
          </section>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col xl:pl-60">
      <DashboardHeader active="billing" />
      <header className="hidden">
        <Link href="/" className="font-fraunces text-xl font-semibold text-ink hover:text-twilight transition-colors">
          <Wordmark className="text-3xl" />
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center px-6 py-10">
        <div className="w-full max-w-3xl">
          <p className="mb-2 font-mono text-xs uppercase tracking-widest text-brass">Billing</p>
          <h1 className="font-fraunces text-3xl font-medium text-ink mb-2 leading-tight">
            {subscriptionActive ? 'Your plan' : `Subscribe to ${BRAND_NAME}`}
          </h1>
          <p className="text-ink-soft text-sm mb-8">
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

          {bannerText && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-card px-5 py-4 text-sm">
              <p className="text-ink">{bannerText}</p>
              {(status === 'active' || status === 'past_due') && (
                <button
                  onClick={handleManage}
                  disabled={actionLoading !== null}
                  className="shrink-0 rounded-full border border-twilight px-4 py-2 text-xs font-semibold text-twilight transition hover:bg-twilight/5 disabled:opacity-50"
                >
                  {actionLoading !== null ? 'Opening…' : 'Manage billing'}
                </button>
              )}
            </div>
          )}

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
