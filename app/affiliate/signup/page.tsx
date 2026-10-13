'use client'

import { useEffect, useState } from 'react'
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
  const net = 59.99 * 0.85 // Solo monthly, after Apple's 15% fee
  return tier1 * net * 0.20 + tier2 * net * 0.25 + tier3 * net * 0.30
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
    breakdownParts.push(`${t2} at 25%`)
  }
  if (count > 25) {
    const t3 = count - 25
    breakdownParts.push(`${t3} at 30%`)
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
  const [teamCode, setTeamCode] = useState('')

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('camrhia_recruit')
      if (saved) setTeamCode(saved)
    } catch {}
  }, [])

  const [teamInfo, setTeamInfo] = useState<{ valid: boolean; master_name?: string } | null>(null)

  useEffect(() => {
    const client = supabase
    const code = teamCode.trim()
    if (!code || !client) { setTeamInfo(null); return }
    const t = setTimeout(async () => {
      const { data } = await client.rpc('get_team_info', { p_code: code })
      setTeamInfo((data as { valid: boolean; master_name?: string } | null) ?? null)
    }, 350)
    return () => clearTimeout(t)
  }, [teamCode])

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
      const code = teamCode.trim().toLowerCase()
      if (code) {
        const { data: validTeam } = await supabase.rpc('check_team_code', { p_code: code })
        if (!validTeam) throw new Error("That team code wasn't found. Check it with whoever invited you, or leave it blank.")
        try { window.localStorage.setItem('camrhia_recruit', code) } catch {}
      }

      const referral_code = await uniqueReferralCode(name)

      const { data: signUpData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { account_kind: 'affiliate', name, referral_code, ...(code ? { recruit_code: code } : {}) },
        },
      })
      if (authError) throw authError

      // Supabase returns a fake success (no identities) when the email already has an account.
      if (signUpData?.user && (signUpData.user.identities?.length ?? 0) === 0) {
        throw new Error('That email already has a Camrhia account. Sign in on the affiliate login page with it, and you can activate your affiliate account there.')
      }

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
        <div className="mb-14">
          <p className="font-mono text-xs tracking-widest uppercase text-brass mb-4">
            Camrhia affiliate program
          </p>
          <h1 className="font-fraunces text-4xl sm:text-5xl font-semibold text-ink leading-tight mb-5">
            Get paid every month for telling photographers about the app that runs their business.
          </h1>
          <p className="text-ink-soft text-base leading-relaxed max-w-xl mb-7">
            Camrhia puts a photographer&apos;s contracts, payments, clients and session details in one place. Every photographer you send us earns you 20 to 30% for every month they stay. Free to join. No quota. No cap.
          </p>
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <a
              href="#signup"
              className="inline-flex items-center rounded-full px-7 py-3 text-sm font-semibold hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#3A4A6B', color: '#ffffff' }}
            >
              Become an affiliate
            </a>
            <a
              href="#earnings"
              className="inline-flex items-center rounded-full border border-line bg-card px-7 py-3 text-sm font-semibold text-ink hover:border-twilight transition-colors"
            >
              See what you could earn
            </a>
          </div>
          <p className="font-mono text-xs text-ink-soft/70">
            Free to join &nbsp;·&nbsp; 14-day free trial for every photographer you refer &nbsp;·&nbsp; You only earn on real charges
          </p>
        </div>

        {/* ── Team code ── */}
        <div className="mb-14 rounded-2xl border border-line bg-card p-5">
          <p className="text-sm font-semibold text-ink mb-1">Did someone invite you? Enter their team code.</p>
          <p className="text-sm text-ink-soft mb-4">
            If a master partner sent you here, type their code and you will join their team when you sign up.
          </p>
          <input
            type="text"
            value={teamCode}
            onChange={(e) => setTeamCode(e.target.value)}
            placeholder="Team code"
            autoCapitalize="none"
            className="w-full max-w-xs rounded-xl border border-line bg-paper px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 focus:outline-none focus:ring-2 focus:ring-twilight/25 focus:border-twilight transition"
          />
          {teamInfo?.valid && (
            <p className="mt-3 text-sm text-sage font-medium">
              You&apos;re joining {teamInfo.master_name || 'a master partner'}&apos;s team. Create your account below.
            </p>
          )}
          {teamCode.trim() && teamInfo && !teamInfo.valid && (
            <p className="mt-3 text-sm text-red-700">
              We couldn&apos;t find that code. Check it with whoever invited you.
            </p>
          )}
        </div>

        {/* ── Why join ── */}
        <div className="mb-14">
          <h2 className="font-fraunces text-2xl font-semibold text-ink mb-2">Why partner with Camrhia</h2>
          <p className="text-sm text-ink-soft mb-6">Six reasons this is worth your time.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { t: 'You get paid every month', d: 'Not a one-time bounty. As long as a photographer you referred stays subscribed, you keep earning on them.' },
              { t: 'Your rate climbs as you grow', d: 'Start at 20%, move to 25%, then 30%. Each referral locks in the rate it started at, and it never goes down.' },
              { t: 'An easy first sentence', d: 'Every photographer gets 14 days free. You are not asking anyone to buy. You are asking them to try it.' },
              { t: 'It solves a real headache', d: 'Most photographers juggle contracts, payments and client updates across a pile of apps. Camrhia puts it in one spot, so you are recommending something useful.' },
              { t: 'You never start from a blank message', d: 'Your dashboard comes with a pitch kit: ready-to-send DMs, a phone call script and answers to the usual objections.' },
              { t: 'No cost, no quota, no catch', d: 'Joining is free. There is nothing to buy, no minimum to hit, and you can see every referral and every dollar in your dashboard.' },
            ].map((item) => (
              <div key={item.t} className="rounded-2xl border border-line bg-card p-5">
                <p className="font-fraunces text-lg font-semibold text-ink mb-1.5">{item.t}</p>
                <p className="text-sm text-ink-soft leading-relaxed">{item.d}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Who we're looking for ── */}
        <div className="mb-14">
          <h2 className="font-fraunces text-2xl font-semibold text-ink mb-2">Who we&apos;re looking for</h2>
          <p className="text-sm text-ink-soft mb-6 max-w-xl">
            You do not need a big following. You need people who trust what you tell them.
          </p>
          <div className="space-y-3 mb-5">
            {[
              { t: 'Working photographers', d: 'You know second shooters, assistants and friends in your market who are tired of running their business out of texts and spreadsheets.' },
              { t: 'Photography educators and mentors', d: 'Your students are exactly who this is for. Recommending a tool that helps them get paid and stay organized is a natural fit.' },
              { t: 'Community and group admins', d: 'You run a photographer Facebook group, Discord, Slack or newsletter, and your members ask what software to use.' },
              { t: 'Wedding industry pros', d: 'Planners, venue coordinators, videographers and vendor communities who work next to photographers every weekend.' },
            ].map((item) => (
              <div key={item.t} className="flex gap-4 rounded-2xl border border-line bg-card p-5">
                <span className="mt-1 inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#3A4A6B' }} />
                <div>
                  <p className="text-sm font-semibold text-ink mb-1">{item.t}</p>
                  <p className="text-sm text-ink-soft leading-relaxed">{item.d}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-ink-soft leading-relaxed rounded-2xl bg-paper-deep border border-line p-5">
            <span className="font-medium text-ink">Not a fit?</span> If making a sale means spamming strangers or overpromising, skip this one. We want people who would recommend Camrhia to someone they respect.
          </p>
        </div>

        {/* ── How it works ── */}
        <div className="mb-14">
          <h2 className="font-fraunces text-2xl font-semibold text-ink mb-6">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { n: '1', t: 'Create your free account', d: 'Takes about two minutes. You get your own personal referral link right away.' },
              { n: '2', t: 'Share it your way', d: 'Send a DM, make a post, or pick up the phone. The pitch kit tells you exactly what to say.' },
              { n: '3', t: 'Earn every month', d: 'When a photographer you referred starts paying after their free trial, you earn on them every month they stay.' },
            ].map((step) => (
              <div key={step.n} className="rounded-2xl border border-line bg-card p-5">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full font-mono text-xs font-semibold mb-3" style={{ backgroundColor: '#3A4A6B', color: '#ffffff' }}>
                  {step.n}
                </span>
                <p className="text-sm font-semibold text-ink mb-1">{step.t}</p>
                <p className="text-sm text-ink-soft leading-relaxed">{step.d}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── See it inside ── */}
        <div className="mb-14">
          <h2 className="font-fraunces text-2xl font-semibold text-ink mb-2">See it inside</h2>
          <p className="text-sm text-ink-soft mb-8 max-w-xl">
            A look at the app photographers will be using every day.
          </p>

          <div className="grid grid-cols-2 gap-5 mb-10">
            {[
              { src: '/screens/1-sessions.png', alt: 'Camrhia session list for photographers', t: 'Every session in one place', d: 'Upcoming and past sessions at a glance.' },
              { src: '/screens/2-timeline.png', alt: 'Camrhia session timeline screen', t: 'A timeline for every session', d: 'Build the schedule for the day in one spot.' },
            ].map((shot) => (
              <div key={shot.src}>
                <img
                  src={shot.src}
                  alt={shot.alt}
                  loading="lazy"
                  className="w-full rounded-3xl border border-line shadow-sm mb-3"
                />
                <p className="text-sm font-semibold text-ink mb-0.5">{shot.t}</p>
                <p className="text-xs text-ink-soft leading-relaxed">{shot.d}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3 mb-3">
            {[1, 2, 3].map((n) => (
              <img
                key={n}
                src={`/screens/3-packages-${n}.png`}
                alt={`Camrhia packages screen ${n}`}
                loading="lazy"
                className="w-full rounded-2xl border border-line shadow-sm"
              />
            ))}
          </div>
          <p className="text-sm font-semibold text-ink mb-0.5">Packages, set up once</p>
          <p className="text-xs text-ink-soft leading-relaxed">Build your packages and use them on any session.</p>
        </div>

        {/* ── How the tiers work ── */}
        <div className="mb-12">
          <h2 className="font-fraunces text-xl font-semibold text-ink mb-5">How the tiers work</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            {[
              { n: '1', range: 'Referrals 1–10',  rate: '20%', desc: "of what's left after Apple's 15% fee, every month they stay." },
              { n: '2', range: 'Referrals 11–25', rate: '25%', desc: '— automatically, once you cross 10.' },
              { n: '3', range: 'Referrals 26+',   rate: '30%', desc: '— your permanent rate from here on.' },
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
        <div id="earnings" className="scroll-mt-6">
          <EarningsCalculator />
        </div>

        {/* ── FAQ ── */}
        <div className="mb-14">
          <h2 className="font-fraunces text-2xl font-semibold text-ink mb-5">Questions people ask</h2>
          <div className="space-y-3">
            {[
              { q: 'Does it cost anything to join?', a: 'No. Creating an affiliate account is free, and there is nothing to buy.' },
              { q: 'When do I actually earn?', a: 'When a photographer you referred starts paying after their 14-day free trial. The trial itself earns nothing, so you only get paid on real charges.' },
              { q: 'How long do I keep earning?', a: 'For as long as that photographer stays subscribed.' },
              { q: 'Do I need a big audience?', a: 'No. One good recommendation to the right photographer beats a hundred random posts.' },
              { q: 'Where do I see my referrals and earnings?', a: 'In your affiliate dashboard, which tracks every referral and what you have earned.' },
              { q: 'What about taxes?', a: 'You are responsible for your own taxes on what you earn as an affiliate.' },
            ].map((item) => (
              <details key={item.q} className="group rounded-2xl border border-line bg-card px-5 py-4">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-sm font-semibold text-ink">
                  {item.q}
                  <span className="text-ink-soft/60 group-open:rotate-45 transition-transform text-lg leading-none">+</span>
                </summary>
                <p className="text-sm text-ink-soft leading-relaxed mt-3">{item.a}</p>
              </details>
            ))}
          </div>
        </div>

        {/* ── Sign-up form ── */}
        <div id="signup" className="max-w-sm scroll-mt-6">
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

            {teamInfo?.valid && (
              <p className="rounded-xl bg-sage/10 border border-sage/30 px-4 py-3 text-sm text-ink">
                You&apos;re joining <span className="font-medium">{teamInfo.master_name || 'a master partner'}&apos;s team</span>. Your team code is filled in below.
              </p>
            )}

            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                Joining a team? <span className="text-ink-soft font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={teamCode}
                onChange={(e) => setTeamCode(e.target.value)}
                placeholder="Team code"
                autoCapitalize="none"
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
