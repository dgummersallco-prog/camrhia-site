'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { BRAND_NAME } from '@/lib/brand'

// ── Types ─────────────────────────────────────────────────────────────────────

type Affiliate = {
  id: string
  name: string
  email: string
  referral_code: string
  payout_email: string | null
  payout_method: string | null
}

type Referral = {
  id: string
  status: 'active' | 'trial' | 'churned'
  created_at: string
  monthly_value: number | null
}

type LedgerEntry = {
  id: string
  amount: number
  period: string // YYYY-MM
  paid: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function currentPeriod() {
  return new Date().toISOString().slice(0, 7)
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-sage/15 text-sage',
  trial: 'bg-brass/15 text-brass',
  churned: 'bg-ink-soft/10 text-ink-soft',
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  trial: 'Trial',
  churned: 'Churned',
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function AffiliateDashboardPage() {
  const router = useRouter()

  const [affiliate, setAffiliate] = useState<Affiliate | null>(null)
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [ledger, setLedger] = useState<LedgerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Copy link state
  const [copied, setCopied] = useState(false)

  // Payout settings
  const [showPayout, setShowPayout] = useState(false)
  const [payoutEmail, setPayoutEmail] = useState('')
  const [payoutMethod, setPayoutMethod] = useState('')
  const [payoutSaving, setPayoutSaving] = useState(false)
  const [payoutSaved, setPayoutSaved] = useState(false)

  const loadData = useCallback(async () => {
    if (!supabase) {
      setError('Supabase is not configured.')
      setLoading(false)
      return
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.replace('/affiliate/login')
      return
    }

    const userId = session.user.id

    try {
      // Affiliate row
      const { data: affiliateData, error: affiliateError } = await supabase
        .from('affiliates')
        .select('id, name, email, referral_code, payout_email, payout_method')
        .eq('id', userId)
        .single()

      if (affiliateError) throw affiliateError
      setAffiliate(affiliateData)
      setPayoutEmail(affiliateData.payout_email ?? '')
      setPayoutMethod(affiliateData.payout_method ?? '')

      // Referrals
      try {
        const { data: referralData } = await supabase
          .from('referrals')
          .select('id, status, created_at, monthly_value')
          .eq('affiliate_id', userId)
          .order('created_at', { ascending: false })
        setReferrals(referralData ?? [])
      } catch {
        setReferrals([])
      }

      // Commission ledger
      try {
        const { data: ledgerData } = await supabase
          .from('commission_ledger')
          .select('id, amount, period, paid')
          .eq('affiliate_id', userId)
        setLedger(ledgerData ?? [])
      } catch {
        setLedger([])
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load data.')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Redirect out on sign-out
  useEffect(() => {
    if (!supabase) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.replace('/affiliate/login')
    })
    return () => subscription.unsubscribe()
  }, [router])

  async function handleSignOut() {
    if (!supabase) return
    await supabase.auth.signOut()
    router.replace('/affiliate/login')
  }

  async function copyLink() {
    if (!affiliate) return
    const link = `https://camrhia.com/r/${affiliate.referral_code}`
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function savePayout(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase || !affiliate) return
    setPayoutSaving(true)
    try {
      await supabase
        .from('affiliates')
        .update({ payout_email: payoutEmail || null, payout_method: payoutMethod || null })
        .eq('id', affiliate.id)
      setPayoutSaved(true)
      setTimeout(() => setPayoutSaved(false), 2500)
    } finally {
      setPayoutSaving(false)
    }
  }

  // ── Computed stats ───────────────────────────────────────────────────────

  const period = currentPeriod()
  const activeCount = referrals.filter((r) => r.status === 'active').length
  const totalCount = referrals.length
  const thisMonthEarnings = ledger
    .filter((l) => l.period === period)
    .reduce((s, l) => s + (l.amount ?? 0), 0)
  const lifetimeEarnings = ledger.reduce((s, l) => s + (l.amount ?? 0), 0)
  const totalPending = ledger
    .filter((l) => !l.paid)
    .reduce((s, l) => s + (l.amount ?? 0), 0)

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <p className="text-ink-soft text-sm animate-pulse">Loading…</p>
      </div>
    )
  }

  if (error || !affiliate) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-ink font-fraunces text-xl">Something went wrong</p>
        <p className="text-ink-soft text-sm">{error ?? 'Could not load your profile.'}</p>
        <Link href="/affiliate/login" className="text-sm text-twilight hover:underline">
          Back to login
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-6 h-14 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="font-fraunces text-lg font-semibold text-ink hover:text-twilight transition-colors"
          >
            {BRAND_NAME}{' '}
            <span className="text-ink-soft font-normal">/ affiliate</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden sm:block text-sm text-ink-soft">{affiliate.name}</span>
            <button
              onClick={handleSignOut}
              className="text-sm text-ink-soft hover:text-ink transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-5xl px-6 py-10 space-y-8">

        {/* Dark referral card */}
        <div className="rounded-2xl bg-ink p-8">
          <p className="font-mono text-xs tracking-widest uppercase text-white/40 mb-3">
            Your referral link
          </p>
          <p className="font-fraunces text-3xl font-semibold text-white mb-2 tracking-tight">
            {affiliate.referral_code}
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-4">
            <span className="font-mono text-sm text-white/60 bg-white/5 px-3 py-1.5 rounded-lg truncate">
              camrhia.com/r/{affiliate.referral_code}
            </span>
            <button
              onClick={copyLink}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-1.5 text-sm font-medium text-white hover:bg-white/10 transition-colors shrink-0"
            >
              {copied ? (
                <>
                  <svg viewBox="0 0 12 12" className="w-3.5 h-3.5" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg viewBox="0 0 12 12" className="w-3.5 h-3.5" fill="none">
                    <rect x="1" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M3 3V2.5A1.5 1.5 0 0 1 4.5 1h5A1.5 1.5 0 0 1 11 2.5v5A1.5 1.5 0 0 1 9.5 9H9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                  Copy link
                </>
              )}
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Active referrals', value: activeCount.toString() },
            { label: "This month's earnings", value: fmt(thisMonthEarnings) },
            { label: 'Lifetime earned', value: fmt(lifetimeEarnings) },
            { label: 'Total referred', value: totalCount.toString() },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl bg-card border border-line p-5">
              <p className="text-xs text-ink-soft mb-2">{label}</p>
              <p className="font-fraunces text-2xl font-semibold text-ink tracking-tight">
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* Referrals table */}
        <section>
          <h2 className="font-fraunces text-xl font-semibold text-ink mb-4">
            Your referrals
          </h2>

          {referrals.length === 0 ? (
            <div className="rounded-2xl border border-line bg-card p-10 text-center">
              <p className="font-fraunces text-lg italic text-ink-soft mb-1">
                No referrals yet.
              </p>
              <p className="text-sm text-ink-soft">
                Share your link above to start earning.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-line overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-paper-deep">
                    <th className="text-left px-5 py-3 font-medium text-ink-soft">Referred</th>
                    <th className="text-left px-5 py-3 font-medium text-ink-soft">Joined</th>
                    <th className="text-left px-5 py-3 font-medium text-ink-soft">Status</th>
                    <th className="text-right px-5 py-3 font-medium text-ink-soft">Monthly value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line bg-card">
                  {referrals.map((r, i) => (
                    <tr key={r.id} className="hover:bg-paper-deep/50 transition-colors">
                      <td className="px-5 py-3.5 text-ink font-medium">
                        Photographer #{i + 1}
                      </td>
                      <td className="px-5 py-3.5 text-ink-soft font-mono text-xs">
                        {fmtDate(r.created_at)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[r.status] ?? STATUS_STYLES.churned}`}
                        >
                          {STATUS_LABELS[r.status] ?? r.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-xs text-ink">
                        {r.monthly_value != null ? fmt(r.monthly_value) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Payouts */}
        <section className="rounded-2xl border border-line bg-card p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-fraunces text-xl font-semibold text-ink mb-1">
                Payouts
              </h2>
              <p className="text-sm text-ink-soft mb-1">Total pending</p>
              <p className="font-fraunces text-2xl font-semibold text-ink">
                {fmt(totalPending)}
              </p>
            </div>
            <button
              onClick={() => setShowPayout((v) => !v)}
              className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-paper-deep transition-colors"
            >
              {showPayout ? 'Cancel' : 'Payout settings'}
            </button>
          </div>

          {showPayout && (
            <form onSubmit={savePayout} className="mt-6 pt-6 border-t border-line space-y-4">
              <h3 className="font-fraunces text-base font-semibold text-ink">
                Payout settings
              </h3>

              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">
                  Payout email
                </label>
                <input
                  type="email"
                  value={payoutEmail}
                  onChange={(e) => setPayoutEmail(e.target.value)}
                  placeholder="paypal@example.com"
                  className="w-full max-w-sm rounded-xl border border-line bg-paper px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 focus:outline-none focus:ring-2 focus:ring-twilight/25 focus:border-twilight transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">
                  Payout method
                </label>
                <select
                  value={payoutMethod}
                  onChange={(e) => setPayoutMethod(e.target.value)}
                  className="rounded-xl border border-line bg-paper px-4 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-twilight/25 focus:border-twilight transition"
                >
                  <option value="">Select method</option>
                  <option value="paypal">PayPal</option>
                  <option value="venmo">Venmo</option>
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="zelle">Zelle</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={payoutSaving}
                  className="rounded-full bg-twilight px-5 py-2 text-sm font-semibold text-white hover:bg-twilight/90 disabled:opacity-50 transition-colors"
                >
                  {payoutSaving ? 'Saving…' : 'Save'}
                </button>
                {payoutSaved && (
                  <p className="text-sm text-sage">Settings saved.</p>
                )}
              </div>
            </form>
          )}
        </section>
      </main>
    </div>
  )
}
