'use client'

import AffiliateShell from '@/app/affiliate/components/AffiliateShell'

import { Select } from '@/app/components/Select'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabaseAffiliate as supabase } from '@/lib/supabaseAffiliate'
import Wordmark from "@/app/components/Wordmark"

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
  masked?: string | null
  lifetime_value?: number | null
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

// ── Dashboard ─────────────────────────────────────────────────────────────────

import AffiliateTabs from '../components/AffiliateTabs'

export default function AffiliateDashboardPage() {
  const router = useRouter()

  const [affiliate, setAffiliate] = useState<Affiliate | null>(null)
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [ledger, setLedger] = useState<LedgerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [needsActivation, setNeedsActivation] = useState(false)
  const [pending, setPending] = useState(false)
  const [activating, setActivating] = useState(false)

  // Copy link state
  const [copied, setCopied] = useState(false)

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
        .select('id, name, email, referral_code, payout_email, payout_method, approved')
        .eq('id', userId)
        .single()

      if (affiliateError) {
        setNeedsActivation(true)
        return
      }
      if (!affiliateData.approved) { setPending(true); return }
      setAffiliate(affiliateData)
      setCodeInput(affiliateData.referral_code)
      setPayoutEmail(affiliateData.payout_email ?? '')
      setPayoutMethod(affiliateData.payout_method ?? '')

      // Referrals
      try {
        const { data: referralData } = await supabase.rpc('get_my_referrals')
        setReferrals(
          ((referralData ?? []) as any[]).map((r) => ({
            id: r.id,
            status: r.status,
            created_at: r.created_at,
            monthly_value: r.monthly_commission != null ? Number(r.monthly_commission) : null,
            masked: r.masked ?? null,
            lifetime_value: r.lifetime_commission != null ? Number(r.lifetime_commission) : 0,
          })),
        )
      } catch {
        setReferrals([])
      }

      // Commission ledger
      try {
        const { data: ledgerData } = await supabase
          .from('commission_ledger')
          .select('id, amount, period, paid_out')
          .eq('affiliate_id', userId)
        setLedger(
          (ledgerData ?? []).map((l: any) => ({
            id: l.id,
            amount: Number(l.amount),
            period: String(l.period).slice(0, 7),
            paid: !!l.paid_out,
          })),
        )
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

  async function activateAffiliate() {
    if (!supabase) return
    setActivating(true)
    setError(null)
    const { error: rpcError } = await supabase.rpc('become_affiliate')
    setActivating(false)
    if (rpcError) {
      setError(rpcError.message)
      return
    }
    setNeedsActivation(false)
    setLoading(true)
    loadData()
  }

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

  async function sendLink() {
    if (!affiliate) return
    const link = `https://camrhia.com/r/${affiliate.referral_code}`
    const text = `I use Camrhia to run my photography business. Try it free for 14 days: ${link}`
    try {
      if (typeof navigator !== 'undefined' && (navigator as any).share) {
        await (navigator as any).share({ title: 'Camrhia', text, url: link })
        return
      }
    } catch {
      return
    }
    window.location.href = `mailto:?subject=${encodeURIComponent('Camrhia for photographers')}&body=${encodeURIComponent(text)}`
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
      const { data: taken, error: checkErr } = await supabase.rpc('referral_code_taken', { p_code: codeInput })
      if (checkErr) {
        setCodeStatus('invalid')
        setCodeError('Could not check availability. Try again.')
        return
      }
      setCodeStatus(taken ? 'taken' : 'available')
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
      if (error) {
        if (error.code === '23505') {
          setCodeStatus('taken')
          return
        }
        throw new Error(error.message || 'Save failed.')
      }
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

  if (pending) return <AffiliateShell title="Home">{() => null}</AffiliateShell>

  if (needsActivation && !affiliate) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-ink font-fraunces text-2xl">Become a Camrhia affiliate</p>
        <p className="text-ink-soft text-sm max-w-sm">
          You&apos;re signed in, but this account isn&apos;t an affiliate yet. Activate it to get your referral link and earn commission on every photographer you refer.
        </p>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button
          onClick={activateAffiliate}
          disabled={activating}
          className="rounded-full px-6 py-3 text-sm font-medium text-white disabled:opacity-60"
          style={{ backgroundColor: '#A9545F' }}
        >
          {activating ? 'Activating…' : 'Activate affiliate account'}
        </button>
        <Link href="/affiliate/login" className="text-sm text-twilight hover:underline">
          Back to login
        </Link>
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
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="font-fraunces text-lg font-semibold text-ink hover:text-twilight transition-colors"
          >
            <Wordmark className="text-3xl" />{' '}
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

      <main className="flex-1 mx-auto w-full max-w-6xl px-6 py-8 lg:grid lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-10">
        <aside>
          <AffiliateTabs />
        </aside>
        <div className="min-w-0 space-y-6 pt-6 lg:pt-0">

        {/* Greeting */}
        <h1 className="font-fraunces text-3xl font-semibold text-ink">Welcome back, {(affiliate.name ?? '').split(' ')[0] || 'there'}</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: 'Active referrals', value: activeCount.toString() },
            { label: "This month's earnings", value: fmt(thisMonthEarnings) },
            { label: 'Lifetime earned', value: fmt(lifetimeEarnings) },
            { label: 'Total referred', value: totalCount.toString() },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-line bg-card p-5">
              <p className="text-xs text-ink-soft">{s.label}</p>
              <p className="mt-1 font-fraunces text-3xl font-semibold text-ink">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Referral link */}
        <section className="rounded-2xl bg-ink p-6 sm:p-8">
          <p className="font-mono text-xs uppercase tracking-widest text-white/50">Your referral link</p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            <span className="min-w-0 flex-1 truncate rounded-xl bg-white/10 px-4 py-3 font-mono text-sm text-white">camrhia.com/r/{affiliate.referral_code}</span>
            <div className="flex shrink-0 gap-2">
              <button onClick={copyLink} className="rounded-full border border-white/25 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10">{copied ? 'Copied!' : 'Copy link'}</button>
              <button onClick={sendLink} className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-white/90">Send link</button>
            </div>
          </div>
          <p className="mt-4 text-sm text-white/70">
            Share it with photographers. They start with a 14-day free trial. When one subscribes through your link, you earn 30% every month they stay, after Apple&apos;s fee.{' '}
            <Link href="/affiliate/dashboard/pay" className="text-white underline">See the breakdown</Link>
          </p>

          <details className="mt-5 border-t border-white/15 pt-4">
            <summary className="cursor-pointer text-sm text-white/80">Customize your link</summary>
            <p className="mt-3 text-xs text-white/60">
              Changing it breaks links you have already shared using <span className="font-mono text-white">camrhia.com/r/{affiliate.referral_code}</span>.
            </p>
            <div className="mt-3 flex items-stretch gap-2">
              <input
                type="text"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                maxLength={30}
                spellCheck={false}
                placeholder={affiliate.referral_code}
                className="flex-1 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 font-mono text-sm text-white placeholder:text-white/40 focus:border-white/50 focus:outline-none"
              />
              <button
                onClick={saveCode}
                disabled={codeStatus !== 'available' || codeSaving || codeInput === affiliate.referral_code}
                className="shrink-0 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                style={{ backgroundColor: '#A9545F', color: '#ffffff' }}
              >
                {codeSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
            <div className="mt-2 min-h-[1.25rem]">
              {codeStatus === 'checking' && <p className="animate-pulse text-xs text-white/60">Checking availability…</p>}
              {codeStatus === 'available' && <p className="text-xs font-medium text-green-300">✓ Available</p>}
              {codeStatus === 'taken' && <p className="text-xs font-medium text-red-300">✗ Already taken</p>}
              {codeStatus === 'invalid' && codeError && <p className="text-xs text-red-300">{codeError}</p>}
              {codeSaved && <p className="text-xs font-medium text-green-300">Link updated.</p>}
            </div>
          </details>
        </section>

        {/* Referrals table */}
        <section>
          <h2 className="font-fraunces text-xl font-semibold text-ink mb-4">
            Your referrals
          </h2>

            <div className="rounded-2xl border border-line overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-paper-deep">
                    <th className="text-left px-5 py-3 font-medium text-ink-soft">Referred</th>
                    <th className="text-left px-5 py-3 font-medium text-ink-soft">Joined</th>
                    <th className="text-left px-5 py-3 font-medium text-ink-soft">Status</th>
                    <th className="text-right px-5 py-3 font-medium text-ink-soft">Monthly value</th>
                    <th className="text-right px-5 py-3 font-medium text-ink-soft">Lifetime value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line bg-card">
                  {referrals.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center">
                        <p className="font-fraunces text-lg italic text-ink-soft">No referrals yet.</p>
                        <p className="mt-1 text-sm text-ink-soft">Share your link above to start earning.</p>
                      </td>
                    </tr>
                  ) : null}
                  {referrals.map((r, i) => (
                    <tr key={r.id} className="hover:bg-paper-deep/50 transition-colors">
                      <td className="px-5 py-3.5 text-ink font-medium">
                        {r.masked ?? `Photographer #${i + 1}`}
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
                      <td className="px-5 py-3.5 text-right font-mono text-xs text-ink">
                        {fmt(r.lifetime_value ?? 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                <Select
                  value={payoutMethod}
                  onChange={(e) => setPayoutMethod(e.target.value)}
                  className="rounded-xl border border-line bg-paper px-4 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-twilight/25 focus:border-twilight transition"
                >
                  <option value="">Select method</option>
                  <option value="paypal">PayPal</option>
                  <option value="venmo">Venmo</option>
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="zelle">Zelle</option>
                </Select>
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
        </div>
      </main>
    </div>
  )
}
