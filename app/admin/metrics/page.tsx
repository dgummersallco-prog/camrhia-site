'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { BRAND_NAME } from '@/lib/brand'

// ── Types ─────────────────────────────────────────────────────────────────────

type Metrics = {
  monthlySubscribers: number  // active + billing_interval = 'monthly'
  annualSubscribers: number   // active + billing_interval = 'annual'
  compedAccounts: number      // subscription_status = 'comped'
  trialUsers: number          // photographer, not active, not comped, trial active
  trialsWithEndDate: number   // photographer with trial_ends_at set, not comped (conversion denominator)
  newSignupsThisMonth: number
  waitlistCount: number
  totalAffiliates: number
  activeReferrals: number
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent = 'text-ink',
}: {
  label: string
  value: string
  sub?: string
  accent?: string
}) {
  return (
    <div className="rounded-2xl bg-card border border-line p-6">
      <p className="font-mono text-xs tracking-widest uppercase text-ink-soft/60 mb-3">{label}</p>
      <p className={`font-fraunces text-3xl font-semibold leading-none mb-1.5 ${accent}`}>{value}</p>
      {sub && <p className="text-xs text-ink-soft">{sub}</p>}
    </div>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-mono text-xs tracking-widest uppercase text-ink-soft/50 mb-4 mt-10 first:mt-0">
      {children}
    </h2>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AdminMetricsPage() {
  const router = useRouter()
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      if (!supabase) {
        setError('Supabase is not configured.')
        setLoading(false)
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/admin/login')
        return
      }

      try {
        const now = new Date().toISOString()
        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        startOfMonth.setHours(0, 0, 0, 0)

        const [
          monthlyResult,
          annualResult,
          compedResult,
          trialResult,
          trialsWithEndResult,
          newSignupsResult,
          waitlistResult,
          affiliatesResult,
          activeReferralsResult,
        ] = await Promise.all([
          // Active monthly subscribers
          supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('subscription_status', 'active')
            .eq('billing_interval', 'monthly'),

          // Active annual subscribers
          supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('subscription_status', 'active')
            .eq('billing_interval', 'annual'),

          // Comped accounts — counted separately, never in MRR
          supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('subscription_status', 'comped'),

          // Trial users: photographer, not paid, not comped, trial hasn't expired
          supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('account_type', 'photographer')
            .neq('subscription_status', 'active')
            .neq('subscription_status', 'comped')
            .gt('trial_ends_at', now),

          // Conversion denominator: photographers with a trial_ends_at, excluding comped
          supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('account_type', 'photographer')
            .neq('subscription_status', 'comped')
            .not('trial_ends_at', 'is', null),

          // New photographer signups this month
          supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('account_type', 'photographer')
            .gte('created_at', startOfMonth.toISOString()),

          // Waitlist (table may not exist yet — fails silently)
          supabase
            .from('waitlist_signups')
            .select('*', { count: 'exact', head: true }),

          // Total affiliates
          supabase
            .from('affiliates')
            .select('*', { count: 'exact', head: true }),

          // Active referrals
          supabase
            .from('referrals')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active'),
        ])

        setMetrics({
          monthlySubscribers:   monthlyResult.count ?? 0,
          annualSubscribers:    annualResult.count ?? 0,
          compedAccounts:       compedResult.count ?? 0,
          trialUsers:           trialResult.count ?? 0,
          trialsWithEndDate:    trialsWithEndResult.count ?? 0,
          newSignupsThisMonth:  newSignupsResult.count ?? 0,
          waitlistCount:        waitlistResult.count ?? 0,
          totalAffiliates:      affiliatesResult.count ?? 0,
          activeReferrals:      activeReferralsResult.count ?? 0,
        })
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load metrics.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [router])

  useEffect(() => {
    if (!supabase) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.replace('/admin/login')
    })
    return () => subscription.unsubscribe()
  }, [router])

  async function handleSignOut() {
    if (!supabase) return
    await supabase.auth.signOut()
    router.replace('/admin/login')
  }

  // ── Loading / error ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <p className="text-ink-soft text-sm animate-pulse">Loading…</p>
      </div>
    )
  }

  if (error || !metrics) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center gap-4 px-6">
        <p className="font-fraunces text-xl text-ink">Could not load metrics</p>
        <p className="text-sm text-ink-soft">{error}</p>
        <Link href="/admin/login" className="text-sm text-twilight hover:underline">Back to login</Link>
      </div>
    )
  }

  // ── Computed values ───────────────────────────────────────────────────────

  // MRR = paid subscribers only; comped accounts contribute $0.
  // Annual subscribers contribute 590/12 per month (their true monthly-equivalent value).
  const activeSubscribers = metrics.monthlySubscribers + metrics.annualSubscribers
  const mrr = Math.round(metrics.monthlySubscribers * 59 + metrics.annualSubscribers * (590 / 12))

  // Conversion rate excludes comped from both numerator and denominator
  const conversionRate =
    metrics.trialsWithEndDate > 0
      ? ((activeSubscribers / metrics.trialsWithEndDate) * 100).toFixed(1)
      : null

  const commissionsOwed = (metrics.activeReferrals * 11.8).toFixed(2)

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <Link href="/" className="font-fraunces text-lg font-semibold text-ink hover:text-twilight transition-colors">
              {BRAND_NAME}{' '}
              <span className="text-ink-soft font-normal">/ admin</span>
            </Link>
            <nav className="hidden sm:flex items-center gap-4 text-sm font-medium">
              <Link href="/admin/dashboard" className="text-ink-soft hover:text-ink transition-colors">Messages</Link>
              <Link href="/admin/metrics"   className="text-ink">Metrics</Link>
              <Link href="/admin/users"     className="text-ink-soft hover:text-ink transition-colors">Users</Link>
            </nav>
          </div>
          <button onClick={handleSignOut} className="text-sm text-ink-soft hover:text-ink transition-colors">
            Sign out
          </button>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-6xl px-6 py-8">
        <div className="mb-8">
          <h1 className="font-fraunces text-2xl font-semibold text-ink">Metrics</h1>
          <p className="text-sm text-ink-soft mt-0.5">Live numbers from the database.</p>
        </div>

        {/* Revenue */}
        <SectionHeading>Revenue</SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-2">
          <StatCard
            label="MRR"
            value={`$${mrr.toLocaleString()}`}
            sub={`${metrics.monthlySubscribers} monthly × $59 + ${metrics.annualSubscribers} annual × $49.17`}
            accent="text-twilight"
          />
          <StatCard
            label="Active subscribers"
            value={activeSubscribers.toString()}
            sub={`${metrics.monthlySubscribers} monthly · ${metrics.annualSubscribers} annual`}
          />
          <StatCard
            label="Comped accounts"
            value={metrics.compedAccounts.toString()}
            sub="free access granted — $0 MRR"
            accent={metrics.compedAccounts > 0 ? 'text-brass' : 'text-ink'}
          />
          <StatCard
            label="Trial users"
            value={metrics.trialUsers.toString()}
            sub="active trial, not yet paid, not comped"
          />
        </div>

        {/* Growth */}
        <SectionHeading>Growth</SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-2">
          <StatCard
            label="Trial → paid conversion"
            value={conversionRate !== null ? `${conversionRate}%` : '—'}
            sub={
              conversionRate !== null
                ? `${activeSubscribers} paid of ${metrics.trialsWithEndDate} trials (comped excluded)`
                : 'No trial data yet'
            }
          />
          <StatCard
            label="New signups this month"
            value={metrics.newSignupsThisMonth.toString()}
            sub="photographers created since the 1st"
          />
          <StatCard
            label="Waitlist signups"
            value={metrics.waitlistCount.toString()}
            sub="total emails collected"
          />
        </div>

        {/* Affiliates */}
        <SectionHeading>Affiliates</SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard
            label="Total affiliates"
            value={metrics.totalAffiliates.toString()}
            sub="rows in affiliates table"
          />
          <StatCard
            label="Active referrals"
            value={metrics.activeReferrals.toString()}
            sub="referrals with status = 'active'"
          />
          <StatCard
            label="Commissions owed this month"
            value={`$${commissionsOwed}`}
            sub={`${metrics.activeReferrals} active referral${metrics.activeReferrals !== 1 ? 's' : ''} × $11.80`}
            accent="text-brass"
          />
        </div>
      </main>
    </div>
  )
}
