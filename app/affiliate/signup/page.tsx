'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const ROSE = '#A9545F'
const inputCls =
  'w-full rounded-xl border border-line bg-card px-4 py-3 text-sm text-ink placeholder:text-ink-soft/50 focus:outline-none focus:ring-2 focus:ring-twilight/25 focus:border-twilight transition'

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

const ROAD = [
  { n: 4, pay: '$60', line: 'Your own Camrhia is paid for.' },
  { n: 33, pay: '$500', line: 'A real side income.' },
  { n: 65, pay: '$1,000', line: 'Every single month.' },
  { n: 327, pay: '$5,000', line: 'Replace a full-time paycheck.' },
]

const STEPS = [
  { t: 'Make a post', d: 'Show Camrhia to your followers with your personal link.' },
  { t: 'A photographer subscribes', d: 'They sign up through your link and start paying.' },
  { t: 'You get paid 30%', d: 'Every month, for as long as they stay subscribed.' },
]

export default function AffiliateSignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [handle, setHandle] = useState('')
  const [followers, setFollowers] = useState('')
  const [reach, setReach] = useState('')
  const [teamCode, setTeamCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('camrhia_recruit')
      if (saved) setTeamCode(saved)
    } catch {}
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) {
      setError('Service not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const code = teamCode.trim().toLowerCase()
      if (code) {
        const { data: validTeam } = await supabase.rpc('check_team_code', { p_code: code })
        if (!validTeam) throw new Error('That team code was not found. Check it with whoever invited you, or clear it.')
        try { window.localStorage.setItem('camrhia_recruit', code) } catch {}
      }

      const referral_code = await uniqueReferralCode(name)

      const { data: signUpData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            account_kind: 'affiliate',
            name,
            referral_code,
            phone: phone.trim(),
            social_handle: handle.trim(),
            followers: followers.trim(),
            best_reach: reach.trim(),
            ...(code ? { recruit_code: code } : {}),
          },
        },
      })
      if (authError) throw authError

      if (signUpData?.user && (signUpData.user.identities?.length ?? 0) === 0) {
        throw new Error('That email already has a Camrhia account. Sign in on the affiliate login page with it, and you can activate your affiliate account there.')
      }

      setConfirmed(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const header = (
    <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
      <Link href="/" className="font-fraunces text-xl font-semibold text-ink transition-colors hover:text-twilight">Camrhia</Link>
      <Link href="/affiliate/login" className="text-sm text-ink-soft transition-colors hover:text-ink">Sign in</Link>
    </header>
  )

  if (confirmed) {
    return (
      <div className="min-h-screen bg-paper">
        {header}
        <main className="mx-auto max-w-xl px-6 py-20 text-center">
          <h1 className="font-fraunces text-4xl font-semibold text-ink">You are in. Now confirm your email.</h1>
          <p className="mt-4 text-ink-soft">
            We sent a confirmation link to <span className="font-medium text-ink">{email}</span>. Tap it, then sign in on the affiliate login page. We will also call you at the number you gave us to get you started.
          </p>
          <Link href="/affiliate/login" className="mt-8 inline-block rounded-full px-7 py-3.5 text-sm font-semibold text-white" style={{ backgroundColor: ROSE }}>
            Go to affiliate login
          </Link>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper">
      {header}
      <main>
        <section className="px-6 pb-16 pt-6 text-center" style={{ backgroundColor: ROSE }}>
          <div className="mx-auto max-w-3xl pt-10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">The Camrhia affiliate program</p>
            <h1 className="mt-4 font-fraunces text-5xl font-semibold leading-[1.05] text-white sm:text-6xl">
              Make a post. Sign a photographer. Get paid 30%.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-white/90">
              Every photographer you sign pays you 30% every single month, for as long as they stay. No cap. Sign 10, sign 100, sign 1,000. It all stacks.
            </p>
            <a href="#apply" className="mt-8 inline-block rounded-full bg-white px-9 py-4 text-base font-semibold" style={{ color: ROSE }}>
              Apply now
            </a>
            <p className="mt-5 inline-block rounded-full bg-white/15 px-5 py-2 text-sm font-semibold text-white">Free to join. Approved affiliates get Camrhia free for life, our gift to you.</p>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-center font-fraunces text-3xl font-semibold text-ink">Simple as 1, 2, 3</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.t} className="rounded-2xl border border-line bg-card p-6">
                <p className="font-fraunces text-4xl font-semibold" style={{ color: ROSE }}>{i + 1}</p>
                <p className="mt-2 text-lg font-semibold text-ink">{s.t}</p>
                <p className="mt-1 text-sm text-ink-soft">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="px-6 pb-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center font-fraunces text-3xl font-semibold text-ink">The road to $5,000 a month</h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-ink-soft">What you earn each month when you have this many photographers subscribed through you.</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {ROAD.map((r) => (
                <div key={r.n} className="rounded-2xl border border-line bg-card p-6 text-center">
                  <p className="text-sm text-ink-soft">{r.n} photographers</p>
                  <p className="mt-1 font-fraunces text-4xl font-semibold" style={{ color: ROSE }}>{r.pay}</p>
                  <p className="text-xs text-ink-soft">every month</p>
                  <p className="mt-3 text-sm font-medium text-ink">{r.line}</p>
                </div>
              ))}
            </div>
            <p className="mx-auto mt-4 max-w-2xl text-center text-xs text-ink-soft">
              Examples, not typical results. Based on 30% of the Solo monthly plan ($59.99) after Apple&apos;s 15% fee, about $15.30 per photographer per month. Your results depend on the photographers you sign.
            </p>
          </div>
        </section>

        <section className="px-6 pb-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center font-fraunces text-3xl font-semibold text-ink">30% is the top of the range</h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-ink-soft">Most recurring software affiliate programs pay 20 to 30%. We start you at the top, from your first referral.</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-line bg-card p-6 text-center">
                <p className="text-sm text-ink-soft">Typical software affiliate program</p>
                <p className="mt-1 font-fraunces text-4xl font-semibold text-ink">20 to 30%</p>
                <p className="mt-2 text-sm text-ink-soft">recurring, industry benchmark</p>
              </div>
              <div className="rounded-2xl p-6 text-center text-white" style={{ backgroundColor: ROSE }}>
                <p className="text-sm text-white/85">Camrhia</p>
                <p className="mt-1 font-fraunces text-4xl font-semibold">30%</p>
                <p className="mt-2 text-sm font-semibold">EVERY SINGLE MONTH. No cap. No ladder.</p>
              </div>
              <div className="rounded-2xl border border-line bg-card p-6 text-center">
                <p className="text-sm text-ink-soft">Dubsado, a photographer CRM (base tier)</p>
                <p className="mt-1 font-fraunces text-4xl font-semibold text-ink">$35 once</p>
                <p className="mt-2 text-sm text-ink-soft">one payment per referral, after 60 days</p>
              </div>
            </div>
            <p className="mx-auto mt-4 max-w-2xl text-center text-sm text-ink">
              On Camrhia, one Solo subscriber pays you about $15.30 a month. You pass that $35 in your third month, then keep getting paid.
            </p>
            <p className="mx-auto mt-3 max-w-2xl text-center text-xs text-ink-soft">
              Sources: <a className="underline" href="https://refgrow.com/blog/affiliate-program-benchmarks-2026" target="_blank" rel="noopener noreferrer">Refgrow, Affiliate Program Benchmarks 2026</a>, <a className="underline" href="https://www.track360.io/blog/saas-affiliate-commission-rates-benchmark-2026" target="_blank" rel="noopener noreferrer">Track360, SaaS Affiliate Commission Rates 2026</a>, <a className="underline" href="https://www.dubsado.com/affiliate-program" target="_blank" rel="noopener noreferrer">Dubsado affiliate program</a>. Industry ranges are published estimates and vary by program.
            </p>
          </div>
        </section>

        <section id="apply" className="px-6 pb-20">
          <div className="mx-auto max-w-xl rounded-[2rem] border border-line bg-card p-7 shadow-xl sm:p-9">
            <h2 className="font-fraunces text-3xl font-semibold text-ink">Apply in one minute</h2>
            <p className="mt-1 text-sm text-ink-soft">We will call you to get you started.</p>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink">Full name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Jane Smith" className={inputCls} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink">Phone number</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="(555) 123-4567" className={inputCls} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink">Social media handle</label>
                <input type="text" value={handle} onChange={(e) => setHandle(e.target.value)} required placeholder="@yourhandle (Instagram, TikTok or YouTube)" className={inputCls} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink">Followers</label>
                  <input type="text" inputMode="numeric" value={followers} onChange={(e) => setFollowers(e.target.value)} required placeholder="12,000" className={inputCls} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink">Best post reach</label>
                  <input type="text" inputMode="numeric" value={reach} onChange={(e) => setReach(e.target.value)} required placeholder="85,000" className={inputCls} />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="jane@example.com" className={inputCls} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} placeholder="At least 8 characters" className={inputCls} />
              </div>

              <details open={teamCode ? true : undefined} className="text-sm text-ink-soft">
                <summary className="cursor-pointer">Have a team code?</summary>
                <input type="text" value={teamCode} onChange={(e) => setTeamCode(e.target.value)} placeholder="Team code" autoCapitalize="none" className={`${inputCls} mt-2`} />
              </details>

              {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

              <button type="submit" disabled={loading} className="mt-2 w-full rounded-full py-4 text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: ROSE }}>
                {loading ? 'Sending…' : 'Apply to become an affiliate'}
              </button>
              <p className="text-center text-xs text-ink-soft">Already applied? <Link href="/affiliate/login" className="underline">Sign in</Link></p>
            </form>
          </div>
        </section>
      </main>
    </div>
  )
}
