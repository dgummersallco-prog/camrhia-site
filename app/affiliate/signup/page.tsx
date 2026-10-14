'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Wordmark from "@/app/components/Wordmark"

const NAVY = '#3A4A6B'
const PHONE =
  'absolute rounded-[1.9rem] ring-1 ring-black/10 bg-card shadow-[0_30px_60px_-25px_rgba(30,40,70,0.55)]'

// ── Referral code generation ───────────────────────────────────────────────────

function baseCode(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10) || 'user'
}

async function uniqueReferralCode(name: string): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const suffix = Math.floor(100 + Math.random() * 900)
    const code = `${baseCode(name)}${suffix}`
    if (!supabase) return code
    const { data: taken } = await supabase.rpc('referral_code_taken', { p_code: code })
    if (taken === false) return code
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

// Slider stops: easy to hit at the low end, bigger jumps as it climbs to 1,000.
const STOPS: number[] = [
  ...Array.from({ length: 25 }, (_, i) => i + 1),      // 1 to 25, one at a time
  ...Array.from({ length: 15 }, (_, i) => 30 + i * 5),  // 30 to 100, by 5
  ...Array.from({ length: 15 }, (_, i) => 110 + i * 10), // 110 to 250, by 10
  ...Array.from({ length: 15 }, (_, i) => 300 + i * 50), // 300 to 1,000, by 50
]

function EarningsCalculator() {
  const [idx, setIdx] = useState(4)
  const count = STOPS[idx]

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

  const parts: string[] = []
  if (count > 0) parts.push(`${Math.min(count, 10)} at 20%`)
  if (count > 10) parts.push(`${Math.min(count, 25) - 10} at 25%`)
  if (count > 25) parts.push(`${count - 25} at 30%`)

  return (
    <div className="rounded-[2rem] bg-card border border-line p-7 sm:p-10 shadow-sm">
      <p className="font-fraunces text-xl font-semibold text-ink mb-7">What could you earn?</p>

      <div className="mb-8">
        <div className="flex items-baseline justify-between mb-3">
          <label className="text-sm font-medium text-ink">Photographers you refer</label>
          <span className="font-fraunces text-4xl font-semibold text-ink leading-none">{count.toLocaleString('en-US')}</span>
        </div>
        <input
          type="range"
          min={0}
          max={STOPS.length - 1}
          value={idx}
          onChange={(e) => setIdx(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-line accent-twilight"
        />
        <div className="flex justify-between mt-1.5 text-xs text-ink-soft/50">
          <span>1</span>
          <span>1,000</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="rounded-2xl bg-paper border border-line px-5 py-5">
          <p className="text-xs text-ink-soft mb-2">Per month</p>
          <p className="font-fraunces text-3xl sm:text-4xl font-semibold leading-none" style={{ color: NAVY }}>
            {fmt(monthly)}
          </p>
        </div>
        <div className="rounded-2xl bg-paper border border-line px-5 py-5">
          <p className="text-xs text-ink-soft mb-2">Per year</p>
          <p className="font-fraunces text-3xl sm:text-4xl font-semibold leading-none" style={{ color: NAVY }}>
            {fmt(yearly)}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-ink leading-relaxed">
          How it adds up: {parts.join(', ')}.
        </p>
        <p className="text-xs text-ink-soft leading-relaxed">
          This is an example, not a promise. It assumes every photographer you refer stays subscribed on the Solo plan, and it counts what is left after Apple takes its 15%. What you actually earn depends on how many people you refer and how long they stay.
        </p>
      </div>
    </div>
  )
}

// ── Layout helpers ─────────────────────────────────────────────────────────────

function Check() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4 mt-1 shrink-0 text-sage" fill="none" aria-hidden>
      <path d="M3 10.5l4.5 4.5L17 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Panel({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <div className={`relative overflow-hidden rounded-[2.5rem] aspect-[4/5] w-full max-w-md mx-auto ${tone}`}>
      {children}
    </div>
  )
}

function Story({
  flip, title, body, points, panel,
}: {
  flip?: boolean
  title: string
  body: string
  points: string[]
  panel: React.ReactNode
}) {
  return (
    <div className="grid md:grid-cols-2 gap-10 md:gap-20 items-center">
      <div className={flip ? 'md:order-2' : ''}>{panel}</div>
      <div className={flip ? 'md:order-1' : ''}>
        <h3 className="font-fraunces text-3xl sm:text-[2.6rem] font-semibold text-ink leading-[1.1] mb-5">{title}</h3>
        <p className="text-lg text-ink-soft leading-relaxed mb-6 max-w-md">{body}</p>
        <ul className="space-y-3">
          {points.map((p) => (
            <li key={p} className="flex gap-3 text-ink text-[0.95rem] leading-snug">
              <Check />
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// ── Content ────────────────────────────────────────────────────────────────────

const WHY = [
  { t: 'You get paid every month', d: 'Not a one-time bounty. As long as a photographer you referred stays subscribed, you keep earning on them.' },
  { t: 'Your rate climbs as you grow', d: 'Start at 20%, move to 25%, then 30%. Each referral locks in the rate it started at, and it never goes down.' },
  { t: 'An easy first sentence', d: 'Every photographer gets 14 days free. You are not asking anyone to buy. You are asking them to try it.' },
  { t: 'It fixes a real headache', d: 'Photographers juggle contracts, payments and client updates across a pile of apps. Camrhia puts it in one place.' },
  { t: 'You never start from a blank message', d: 'Your dashboard has a pitch kit with ready-to-send DMs, a phone call script and answers to the usual objections.' },
  { t: 'No cost, no quota', d: 'Joining is free. There is nothing to buy and no minimum to hit, and every referral and dollar shows in your dashboard.' },
]

const WHO = [
  { t: 'Working photographers', d: 'You know second shooters, assistants and friends in your market who are tired of running their business out of texts and spreadsheets.' },
  { t: 'Educators and mentors', d: 'Your students are exactly who this is for. Recommending a tool that helps them get paid and stay organized is a natural fit.' },
  { t: 'Community and group admins', d: 'You run a photographer Facebook group, Discord, Slack or newsletter, and your members ask what software to use.' },
  { t: 'Wedding industry pros', d: 'Planners, venue coordinators, videographers and vendor communities who work next to photographers every weekend.' },
]

const STEPS = [
  { n: '1', t: 'Create your free account', d: 'It takes about two minutes. Your personal referral link is ready right away.' },
  { n: '2', t: 'Share it your way', d: 'Send a DM, make a post, or pick up the phone. The pitch kit tells you what to say.' },
  { n: '3', t: 'Earn every month', d: 'When a photographer you referred starts paying after their free trial, you earn every month they stay.' },
]

const FAQ = [
  { q: 'Does it cost anything to join?', a: 'No. Creating an affiliate account is free, and there is nothing to buy.' },
  { q: 'When do I actually earn?', a: 'When a photographer you referred starts paying after their 14-day free trial. The trial itself earns nothing, so you only get paid on real charges.' },
  { q: 'How long do I keep earning?', a: 'For as long as that photographer stays subscribed.' },
  { q: 'How and when do I get paid?', a: 'Earnings are paid out monthly.' },
  { q: 'Do I need a big audience?', a: 'No. One good recommendation to the right photographer beats a hundred random posts.' },
  { q: 'Where do I see my referrals and earnings?', a: 'In your affiliate dashboard, which tracks every referral and what you have earned.' },
  { q: 'What about taxes?', a: 'You are responsible for your own taxes on what you earn as an affiliate.' },
]

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
            <Wordmark className="text-3xl" />{' '}
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
              Go to login
            </Link>
          </div>
        </main>
      </div>
    )
  }

  // ── Main page ──────────────────────────────────────────────────────────────

  const inputCls =
    'w-full rounded-xl border border-line bg-paper px-4 py-3 text-sm text-ink placeholder:text-ink-soft/50 focus:outline-none focus:ring-2 focus:ring-twilight/25 focus:border-twilight transition'

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <style>{`
        html { scroll-behavior: smooth; }
        @keyframes phoneRise { from { opacity: 0; transform: translateY(36px); } to { opacity: 1; transform: none; } }
        .phone-rise { animation: phoneRise 0.9s cubic-bezier(0.2, 0.7, 0.2, 1) both; }
        @media (prefers-reduced-motion: reduce) {
          html { scroll-behavior: auto; }
          .phone-rise { animation: none; }
        }
      `}</style>

      <header className="border-b border-line bg-paper px-6 py-4">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <Link href="/" className="font-fraunces text-xl font-semibold text-ink hover:text-twilight transition-colors">
            <Wordmark className="text-3xl" />{' '}
            <span className="text-ink-soft font-normal text-lg">/ affiliate</span>
          </Link>
          <div className="flex items-center gap-5 text-sm">
            <Link href="/affiliate/login" className="text-ink-soft hover:text-ink transition-colors">Sign in</Link>
            <a href="#signup" className="rounded-full px-5 py-2 font-semibold hover:opacity-90 transition-opacity" style={{ backgroundColor: NAVY, color: '#ffffff' }}>
              Join free
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1">

        {/* ── Hero ── */}
        <section className="mx-auto max-w-6xl px-6 pt-14 pb-24 sm:pt-20 sm:pb-32 grid md:grid-cols-2 gap-14 md:gap-16 items-center">
          <div>
            <h1 className="font-fraunces text-[2.6rem] sm:text-6xl font-semibold text-ink leading-[1.04] mb-6">
              Recommend Camrhia. Get paid every month they stay.
            </h1>
            <p className="text-ink-soft text-lg sm:text-xl leading-relaxed mb-9 max-w-lg">
              Camrhia runs a photographer&apos;s portfolio, clients, contracts and payments in one app. Send us a photographer and you earn 20 to 30% of their subscription for as long as they stay.
            </p>
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <a
                href="#signup"
                className="inline-flex items-center rounded-full px-8 py-3.5 text-sm font-semibold hover:opacity-90 transition-opacity"
                style={{ backgroundColor: NAVY, color: '#ffffff' }}
              >
                Become an affiliate
              </a>
              <a
                href="#earnings"
                className="inline-flex items-center rounded-full border border-line bg-card px-8 py-3.5 text-sm font-semibold text-ink hover:border-twilight transition-colors"
              >
                See what you could earn
              </a>
            </div>
            <p className="text-sm text-ink-soft max-w-md leading-relaxed">
              Free to join. Every photographer you refer gets 14 days free, and you only earn on real charges.
            </p>
          </div>

          <Panel tone="bg-brass/15">
            <div className="absolute left-[6%] top-[9%] w-[54%] z-10 -rotate-[2deg]">
              <img src="/screens/portfolio.png" alt="Camrhia portfolio editor" className={`${PHONE} phone-rise relative w-full`} style={{ animationDelay: '0.15s', position: 'relative' }} />
            </div>
            <div className="absolute right-[5%] top-[22%] w-[46%] rotate-[4deg]">
              <img src="/screens/2-timeline.png" alt="Camrhia session timeline" className={`${PHONE} phone-rise relative w-full`} style={{ animationDelay: '0.35s', position: 'relative' }} />
            </div>
          </Panel>
        </section>

        {/* ── What you'd be recommending ── */}
        <section className="pb-24 sm:pb-32">
          <div className="mx-auto max-w-6xl px-6">
            <div className="max-w-2xl mb-20 sm:mb-28">
              <h2 className="font-fraunces text-4xl sm:text-5xl font-semibold text-ink leading-[1.08] mb-5">
                What you&apos;d be recommending.
              </h2>
              <p className="text-lg text-ink-soft leading-relaxed">
                A photographer&apos;s whole business in one app, from the portfolio clients find to the session they show up to.
              </p>
            </div>

            <div className="space-y-24 sm:space-y-36">
              <Story
                title="A portfolio that looks like your studio, not a template."
                body="Build your portfolio in the app with your own fonts, color scheme and style. It becomes a live website, included in your Camrhia subscription. Clients can browse every photographer in their area in the app, and it costs them nothing."
                points={['Your fonts, your colors, your style', 'A live website, included in your subscription', 'Clients browse photographers in their area for free']}
                panel={
                  <Panel tone="bg-twilight/10">
                    <img src="/screens/portfolio.png" alt="Camrhia portfolio editor" loading="lazy" className={`${PHONE} left-[7%] top-[17%] w-[47%]`} />
                    <img src="/screens/live-portfolio.png" alt="A live Camrhia portfolio website" loading="lazy" className={`${PHONE} right-[7%] top-[5%] w-[47%] z-10`} />
                  </Panel>
                }
              />

              <Story
                flip
                title="Your whole business in one place, away from your personal life."
                body="Message your clients and check your calendar inside the app, so work stays together and out of your personal texts."
                points={['Message clients right in the app', 'Your calendar next to your conversations', 'Keep work out of your personal inbox']}
                panel={
                  <Panel tone="bg-sage/15">
                    <img src="/screens/messages.png" alt="Camrhia messages tab" loading="lazy" className={`${PHONE} left-[7%] top-[17%] w-[47%]`} />
                    <img src="/screens/calendar.png" alt="Camrhia calendar" loading="lazy" className={`${PHONE} right-[7%] top-[5%] w-[47%] z-10`} />
                  </Panel>
                }
              />

              <Story
                title="Set your studio up once."
                body="Manage your packages and pricing, your questionnaires and how your studio runs, all from one dashboard."
                points={['Packages and pricing', 'Questionnaires for your clients', 'Your studio setup']}
                panel={
                  <Panel tone="bg-brass/15">
                    <img src="/screens/3-packages-1.png" alt="Camrhia packages" loading="lazy" className={`${PHONE} left-[2%] top-[28%] w-[38%]`} />
                    <img src="/screens/3-packages-2.png" alt="Camrhia package details" loading="lazy" className={`${PHONE} right-[2%] top-[28%] w-[38%]`} />
                    <img src="/screens/studio.png" alt="Camrhia studio settings" loading="lazy" className={`${PHONE} left-1/2 -translate-x-1/2 top-[8%] w-[50%] z-10`} />
                  </Panel>
                }
              />

              <Story
                flip
                title="Every session, and the plan for the day."
                body="See all your sessions at a glance, and build a timeline for each one so the details of the day do not live in a text thread."
                points={['Upcoming and past sessions together', 'A schedule for every session']}
                panel={
                  <Panel tone="bg-twilight/10">
                    <img src="/screens/1-sessions.png" alt="Camrhia session list" loading="lazy" className={`${PHONE} left-[7%] top-[17%] w-[47%]`} />
                    <img src="/screens/2-timeline.png" alt="Camrhia session timeline" loading="lazy" className={`${PHONE} right-[7%] top-[5%] w-[47%] z-10`} />
                  </Panel>
                }
              />
            </div>
          </div>
        </section>

        {/* ── Why join (dark band) ── */}
        <section style={{ backgroundColor: NAVY }}>
          <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32 grid lg:grid-cols-5 gap-14">
            <div className="lg:col-span-2">
              <h2 className="font-fraunces text-4xl sm:text-5xl font-semibold leading-[1.08] lg:sticky lg:top-12" style={{ color: '#ffffff' }}>
                An easy thing to recommend that pays you back every month.
              </h2>
            </div>
            <div className="lg:col-span-3">
              {WHY.map((w, i) => (
                <div key={w.t} className="py-7" style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.18)' }}>
                  <p className="font-fraunces text-2xl font-semibold mb-2" style={{ color: '#ffffff' }}>{w.t}</p>
                  <p className="leading-relaxed" style={{ color: 'rgba(255,255,255,0.72)' }}>{w.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How you earn ── */}
        <section className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <div className="max-w-2xl mb-16">
            <h2 className="font-fraunces text-4xl sm:text-5xl font-semibold text-ink leading-[1.08] mb-5">
              The more you refer, the more every referral is worth.
            </h2>
            <p className="text-lg text-ink-soft leading-relaxed">
              Most programs pay one flat rate forever, so your 50th referral earns what your first did. Ours goes up as you do.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-10 sm:gap-8 mb-8">
            {[
              { rate: '20%', range: 'Referrals 1 to 10', desc: "of what's left after Apple's 15% fee, every month they stay." },
              { rate: '25%', range: 'Referrals 11 to 25', desc: 'starts automatically once you cross 10.' },
              { rate: '30%', range: 'Referrals 26 and up', desc: 'your top rate from there on.' },
            ].map((t) => (
              <div key={t.rate} className="border-t-2 pt-6" style={{ borderColor: NAVY }}>
                <p className="font-fraunces text-7xl font-semibold leading-none mb-4" style={{ color: NAVY }}>{t.rate}</p>
                <p className="text-sm font-semibold text-ink mb-1.5">{t.range}</p>
                <p className="text-sm text-ink-soft leading-relaxed">{t.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-ink-soft/80 leading-relaxed mb-20 max-w-2xl">
            Your rate locks in the moment each referral becomes a paying subscriber. It never goes down, even if a later referral lands in a different tier.
          </p>

          <div id="earnings" className="scroll-mt-6 max-w-xl mx-auto">
            <EarningsCalculator />
          </div>
        </section>

        {/* ── Who we're looking for ── */}
        <section className="border-y border-line bg-paper-deep">
          <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32 grid lg:grid-cols-5 gap-14">
            <div className="lg:col-span-2">
              <h2 className="font-fraunces text-4xl sm:text-5xl font-semibold text-ink leading-[1.08] mb-6">
                We want people photographers already trust.
              </h2>
              <p className="text-lg text-ink-soft leading-relaxed mb-8">
                You do not need a big following. You need people who listen when you say something is worth using.
              </p>
              <p className="text-sm text-ink-soft leading-relaxed border-l-2 pl-4" style={{ borderColor: NAVY }}>
                <span className="font-semibold text-ink">Not a fit?</span> If making a sale means spamming strangers or overpromising, skip this one. We want people who would recommend Camrhia to someone they respect.
              </p>
            </div>
            <div className="lg:col-span-3 divide-y divide-line border-y border-line">
              {WHO.map((w) => (
                <div key={w.t} className="py-8">
                  <p className="font-fraunces text-2xl font-semibold text-ink mb-2">{w.t}</p>
                  <p className="text-ink-soft leading-relaxed">{w.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <h2 className="font-fraunces text-4xl sm:text-5xl font-semibold text-ink leading-[1.08] mb-14">How it works</h2>
          <div className="grid sm:grid-cols-3 gap-12 sm:gap-10">
            {STEPS.map((s) => (
              <div key={s.n}>
                <p className="font-fraunces text-7xl font-semibold leading-none mb-5" style={{ color: NAVY, opacity: 0.22 }}>{s.n}</p>
                <p className="font-fraunces text-2xl font-semibold text-ink mb-2">{s.t}</p>
                <p className="text-ink-soft leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="mx-auto max-w-2xl px-6 pb-24 sm:pb-32">
          <h2 className="font-fraunces text-3xl sm:text-4xl font-semibold text-ink mb-8">Questions people ask</h2>
          <div className="divide-y divide-line border-y border-line">
            {FAQ.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-base font-medium text-ink">
                  {f.q}
                  <span className="text-ink-soft/60 group-open:rotate-45 transition-transform text-2xl leading-none">+</span>
                </summary>
                <p className="text-sm text-ink-soft leading-relaxed mt-3 pr-8">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ── Sign-up (dark band) ── */}
        <section id="signup" style={{ backgroundColor: NAVY }}>
          <div className="mx-auto max-w-6xl px-6 pt-24 sm:pt-28 pb-24 sm:pb-28 grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">
            <div>
              <h2 className="font-fraunces text-4xl sm:text-5xl font-semibold leading-[1.08] mb-5" style={{ color: '#ffffff' }}>
                Ready? It takes two minutes.
              </h2>
              <p className="text-lg leading-relaxed mb-4 max-w-md" style={{ color: 'rgba(255,255,255,0.78)' }}>
                Create your free affiliate account and your personal link is ready right away. No cost, no quota.
              </p>
              <p className="text-sm mb-10" style={{ color: 'rgba(255,255,255,0.65)' }}>
                Already have an account?{' '}
                <Link href="/affiliate/login" className="underline" style={{ color: '#ffffff' }}>Sign in</Link>
              </p>
              <div className="relative hidden lg:block h-64 overflow-hidden rounded-t-[2rem] max-w-xs" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                <img src="/screens/3-packages-3.png" alt="Camrhia packages" loading="lazy" className={`${PHONE} left-1/2 -translate-x-1/2 top-8 w-44`} />
              </div>
            </div>

            <div className="rounded-[2rem] bg-card p-7 sm:p-9 shadow-xl">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="rounded-2xl bg-paper border border-line p-4">
                  <label className="block text-sm font-medium text-ink mb-1">Invited by a master partner?</label>
                  <p className="text-xs text-ink-soft mb-3">Enter their team code to join their team. Skip it if you do not have one.</p>
                  <input
                    type="text"
                    value={teamCode}
                    onChange={(e) => setTeamCode(e.target.value)}
                    placeholder="Team code (optional)"
                    autoCapitalize="none"
                    className="w-full rounded-xl border border-line bg-card px-4 py-3 text-sm text-ink placeholder:text-ink-soft/50 focus:outline-none focus:ring-2 focus:ring-twilight/25 focus:border-twilight transition"
                  />
                  {teamInfo?.valid && (
                    <p className="mt-2 text-sm font-medium text-sage">
                      You&apos;re joining {teamInfo.master_name || 'a master partner'}&apos;s team.
                    </p>
                  )}
                  {teamCode.trim() && teamInfo && !teamInfo.valid && (
                    <p className="mt-2 text-sm text-red-700">
                      We couldn&apos;t find that code. Check it with whoever invited you.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">Full name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Jane Smith" className={inputCls} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="jane@example.com" className={inputCls} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">Password</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} placeholder="At least 8 characters" className={inputCls} />
                </div>

                {error && (
                  <p className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full py-3.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity mt-2"
                  style={{ backgroundColor: NAVY, color: '#ffffff' }}
                >
                  {loading ? 'Creating account…' : 'Create my free account'}
                </button>
              </form>
            </div>
          </div>
        </section>

      </main>
    </div>
  )
}
