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

// ── Profanity blocklist (first-pass; substring match) ─────────────────────────

const PROFANITY = [
  'fuck', 'shit', 'cunt', 'cock', 'dick', 'ass', 'bitch', 'bastard',
  'piss', 'slut', 'whore', 'nigger', 'nigga', 'faggot', 'fag',
  'retard', 'porn', 'rape', 'nazi',
]

// ── Pitch templates ───────────────────────────────────────────────────────────

const PITCHES: { label: string; body: (link: string) => string }[] = [
  {
    label: 'The Pain Point',
    body: (link) =>
      `Not gonna lie — the thing that finally got me off email and group texts for weddings was almost losing a booking because a couple's retainer got "sent" three weeks ago and just... never showed up in my inbox. Found out four days before the wedding.

Camrhia tracks all of that automatically now — who's paid, what's due, the whole timeline, built together with the couple instead of chased over text. $59/mo and it already paid for itself in stress alone.

${link}`,
  },
  {
    label: 'The Peer Recommendation',
    body: (link) =>
      `A few of us have started using this app called Camrhia for our wedding bookings — it's basically the "shared" version of HoneyBook, where the couple can actually see and help build the timeline with you instead of it living in your head.

Figured I'd pass it along since you're always juggling ten things at once too. Free to try for two weeks: ${link}`,
  },
  {
    label: 'The ROI / Math',
    body: (link) =>
      `Quick math: Camrhia is $59/month. That's less than what most of us lose on ONE couple who ghosts a payment reminder sent over text, or one Saturday morning spent re-explaining a timeline that got lost in a group chat.

It auto-builds your payment schedule, sends the reminders, and keeps the whole day's timeline in one shared place with the couple. Worth a look: ${link}`,
  },
  {
    label: 'The Time Back',
    body: (link) =>
      `How many hours a week do you spend re-typing the same wedding details into three different places — email, a contract template, a spreadsheet? Camrhia auto-fills all of it the second you book someone.

I got probably 2-3 hours back a week just from not re-entering the same info five times. Free 14-day trial, no card needed to start: ${link}`,
  },
  {
    label: 'The Craft / Identity',
    body: (link) =>
      `You put so much care into how you shoot a wedding — the way you read the light, the way you catch the moment nobody else sees. Feels weird that the business side of it is stuck in group texts and half-updated spreadsheets, right?

Camrhia is built the same way you shoot — considered, not chaotic. One shared place for the timeline, the contract, the payments, the whole thing, built together with the couple. Feels like it matches the actual work: ${link}`,
  },
]

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
  const [copiedPitch, setCopiedPitch] = useState<number | null>(null)

  // Referral code editor
  const [codeInput, setCodeInput] = useState('')
  type CodeStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'
  const [codeStatus, setCodeStatus] = useState<CodeStatus>('idle')
  const [codeError, setCodeError] = useState<string | null>(null)
  const [codeSaving, setCodeSaving] = useState(false)
  const [codeSaved, setCodeSaved] = useState(false)

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
      setCodeInput(affiliateData.referral_code)
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

  async function copyPitch(index: number, text: string) {
    await navigator.clipboard.writeText(text)
    setCopiedPitch(index)
    setTimeout(() => setCopiedPitch(null), 2000)
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

  // Validate and check availability whenever codeInput changes
  useEffect(() => {
    if (!affiliate) return

    // No change from current code — nothing to do
    if (codeInput === affiliate.referral_code) {
      setCodeStatus('idle')
      setCodeError(null)
      return
    }

    // Synchronous validation (length, profanity)
    if (codeInput.length < 3 || codeInput.length > 30) {
      setCodeStatus('invalid')
      setCodeError(codeInput.length < 3 ? 'At least 3 characters required.' : 'Maximum 30 characters.')
      return
    }
    if (PROFANITY.some((w) => codeInput.includes(w))) {
      setCodeStatus('invalid')
      setCodeError('That code isn\'t available.')
      return
    }

    // Debounced availability check
    setCodeStatus('checking')
    setCodeError(null)
    const t = setTimeout(async () => {
      if (!supabase) return
      const { data } = await supabase
        .from('affiliates')
        .select('id')
        .eq('referral_code', codeInput)
        .neq('id', affiliate.id)
        .maybeSingle()
      setCodeStatus(data ? 'taken' : 'available')
    }, 400)
    return () => clearTimeout(t)
  }, [codeInput, affiliate])

  async function saveCode() {
    if (!supabase || !affiliate || codeStatus !== 'available') return
    setCodeSaving(true)
    try {
      const { error } = await supabase
        .from('affiliates')
        .update({ referral_code: codeInput })
        .eq('id', affiliate.id)
      if (error) throw error
      // Update affiliate state everywhere — referral card + pitch kit re-render instantly
      setAffiliate({ ...affiliate, referral_code: codeInput })
      setCodeStatus('idle')
      setCodeSaved(true)
      setTimeout(() => setCodeSaved(false), 2500)
    } catch (err: unknown) {
      setCodeError(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setCodeSaving(false)
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

        {/* Customize referral link */}
        <section className="rounded-2xl border border-line bg-card p-6">
          <h2 className="font-fraunces text-xl font-semibold text-ink mb-1">Customize your link</h2>
          <p className="font-mono text-sm text-ink-soft mb-5">
            camrhia.com/r/
            <span className={`font-medium ${codeInput ? 'text-ink' : 'text-ink-soft/40'}`}>
              {codeInput || '…'}
            </span>
          </p>

          {/* Break-old-links warning — always visible */}
          <div className="flex gap-2.5 rounded-xl bg-brass/8 border border-brass/20 px-4 py-3 mb-5">
            <svg viewBox="0 0 16 16" className="w-4 h-4 text-brass shrink-0 mt-0.5" fill="none">
              <path d="M8 2L14.5 13H1.5L8 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
              <path d="M8 6v3.5M8 11v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <p className="text-xs text-ink-soft leading-relaxed">
              Changing your link will break any links you&apos;ve already shared using your current code:{' '}
              <span className="font-mono font-medium text-ink">camrhia.com/r/{affiliate.referral_code}</span>
            </p>
          </div>

          {/* Input row */}
          <div className="flex items-stretch gap-2 mb-3">
            <input
              type="text"
              value={codeInput}
              onChange={(e) =>
                setCodeInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
              }
              maxLength={30}
              spellCheck={false}
              placeholder={affiliate.referral_code}
              className="flex-1 rounded-xl border border-line bg-paper px-4 py-2.5 text-sm font-mono text-ink placeholder:text-ink-soft/40 focus:outline-none focus:ring-2 focus:ring-twilight/25 focus:border-twilight transition"
            />
            <button
              onClick={saveCode}
              disabled={codeStatus !== 'available' || codeSaving || codeInput === affiliate.referral_code}
              className="rounded-xl bg-twilight px-5 py-2.5 text-sm font-semibold text-white hover:bg-twilight/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
              style={{ backgroundColor: '#3A4A6B', color: '#ffffff' }}
            >
              {codeSaving ? 'Saving…' : 'Save'}
            </button>
          </div>

          {/* Inline feedback */}
          <div className="min-h-[1.25rem]">
            {codeStatus === 'checking' && (
              <p className="text-xs text-ink-soft/60 animate-pulse">Checking availability…</p>
            )}
            {codeStatus === 'available' && (
              <p className="text-xs text-sage font-medium">✓ Available</p>
            )}
            {codeStatus === 'taken' && (
              <p className="text-xs text-red-500 font-medium">✗ Already taken</p>
            )}
            {codeStatus === 'invalid' && codeError && (
              <p className="text-xs text-red-500">{codeError}</p>
            )}
            {codeSaved && (
              <p className="text-xs text-sage font-medium">Link updated.</p>
            )}
          </div>
        </section>

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

        {/* Commission tier */}
        {(() => {
          // Count referrals that have been or are paying — determines next position
          const completedCount = referrals.filter(
            (r) => r.status === 'active' || r.status === 'churned'
          ).length
          const nextPosition = completedCount + 1
          const nextRate =
            nextPosition <= 10 ? 0.20 :
            nextPosition <= 25 ? 0.30 :
            0.40

          // Progress toward the next tier threshold
          type TierInfo =
            | { atMax: false; currentPct: number; nextPct: number; label: string; toNext: number; barFill: number }
            | { atMax: true }

          const tierInfo: TierInfo =
            completedCount < 10
              ? { atMax: false, currentPct: 20, nextPct: 30, label: 'Tier 1', toNext: 10 - completedCount, barFill: completedCount / 10 }
              : completedCount < 25
              ? { atMax: false, currentPct: 30, nextPct: 40, label: 'Tier 2', toNext: 25 - completedCount, barFill: (completedCount - 10) / 15 }
              : { atMax: true }

          return (
            <section className="rounded-2xl border border-line bg-card p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
                <div>
                  <p className="font-mono text-xs tracking-widest uppercase text-ink-soft/60 mb-1">
                    Commission tier
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="font-fraunces text-4xl font-semibold text-twilight leading-none" style={{ color: '#3A4A6B' }}>
                      {Math.round(nextRate * 100)}%
                    </span>
                    <span className="text-sm text-ink-soft">per referral</span>
                  </div>
                </div>
                {!tierInfo.atMax && (
                  <span className="inline-flex items-center rounded-full bg-paper-deep border border-line px-3 py-1 text-xs font-medium text-ink-soft">
                    {tierInfo.label}
                  </span>
                )}
              </div>

              {tierInfo.atMax ? (
                <div>
                  <div className="h-1.5 w-full rounded-full bg-twilight/20 mb-2">
                    <div className="h-1.5 rounded-full bg-twilight w-full" style={{ backgroundColor: '#3A4A6B' }} />
                  </div>
                  <p className="text-xs text-ink-soft">
                    Maximum tier — 40% on every referral, for life.
                  </p>
                </div>
              ) : (
                <div>
                  <div className="h-1.5 w-full rounded-full bg-line mb-2 overflow-hidden">
                    <div
                      className="h-1.5 rounded-full bg-twilight transition-all duration-300"
                      style={{ width: `${Math.min(tierInfo.barFill * 100, 100)}%`, backgroundColor: '#3A4A6B' }}
                    />
                  </div>
                  <p className="text-xs text-ink-soft">
                    {completedCount} paid referral{completedCount !== 1 ? 's' : ''} so far —{' '}
                    <span className="font-medium text-ink">
                      {tierInfo.toNext} more to unlock {tierInfo.nextPct}%
                    </span>
                  </p>
                </div>
              )}
            </section>
          )
        })()}

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

        {/* Pitch Kit */}
        <section>
          <div className="mb-5">
            <h2 className="font-fraunces text-xl font-semibold text-ink">Pitch kit</h2>
            <p className="text-sm text-ink-soft mt-0.5">
              Ready-to-send messages — your referral link is already in each one.
            </p>
          </div>
          <div className="space-y-4">
            {PITCHES.map((pitch, i) => {
              const referralLink = `https://camrhia.com/r/${affiliate.referral_code}`
              const text = pitch.body(referralLink)
              const isCopied = copiedPitch === i
              return (
                <div key={i} className="rounded-2xl border border-line bg-card p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <p className="font-mono text-xs tracking-widest uppercase text-ink-soft/60">
                      {pitch.label}
                    </p>
                    <button
                      onClick={() => copyPitch(i, text)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors shrink-0 ${
                        isCopied
                          ? 'border-sage/40 bg-sage/10 text-sage'
                          : 'border-line text-ink-soft hover:text-ink hover:border-ink/30'
                      }`}
                    >
                      {isCopied ? (
                        <>
                          <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Copied!
                        </>
                      ) : (
                        <>
                          <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none">
                            <rect x="1" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                            <path d="M3 3V2.5A1.5 1.5 0 0 1 4.5 1h5A1.5 1.5 0 0 1 11 2.5v5A1.5 1.5 0 0 1 9.5 9H9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                          </svg>
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{text}</p>
                </div>
              )
            })}
          </div>
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
