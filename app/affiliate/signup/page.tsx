'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabaseAffiliate as supabase } from '@/lib/supabaseAffiliate'
import Wordmark from '@/app/components/Wordmark'

const ROSE = '#8C6B3F'
const SEATS = 15
const SHOW_AFTER = 5
const inputCls =
  'w-full rounded-xl border border-line bg-card px-4 py-3 text-sm text-ink placeholder:text-ink-soft/50 focus:outline-none focus:ring-2 focus:ring-twilight/25 focus:border-twilight transition'

function baseCode(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16) || 'user'
}

async function uniqueReferralCode(name: string): Promise<string> {
  if (!supabase) return baseCode(name)
  const { data: cleanTaken } = await supabase.rpc('referral_code_taken', { p_code: baseCode(name) })
  if (cleanTaken === false) return baseCode(name)
  for (let i = 0; i < 5; i++) {
    const suffix = Math.floor(100 + Math.random() * 900)
    const code = `${baseCode(name)}${suffix}`
    if (!supabase) return code
    const { data: taken } = await supabase.rpc('referral_code_taken', { p_code: code })
    if (taken === false) return code
  }
  return `${baseCode(name)}${Date.now().toString().slice(-4)}`
}



export default function AffiliateSignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [handle, setHandle] = useState('')
  const [followers, setFollowers] = useState('')
  const [reach, setReach] = useState('')
  const [teamCode, setTeamCode] = useState('')
  const [inviter, setInviter] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [taken, setTaken] = useState<number | null>(null)

  useEffect(() => {
    try {
      const saved = new URLSearchParams(window.location.search).get('recruit') || window.localStorage.getItem('camrhia_recruit')
      if (saved) setTeamCode(saved)
    } catch {}
  }, [])

  useEffect(() => {
    if (!supabase) return
    supabase.rpc('founding_seats_taken').then(({ data }) => {
      if (typeof data === 'number') setTaken(data)
    })
  }, [])

  useEffect(() => {
    if (!supabase || !teamCode) { setInviter(null); return }
    supabase.rpc('team_inviter_name', { p_code: teamCode }).then(({ data }) => setInviter(typeof data === 'string' && data ? data : null))
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
      let code = teamCode.trim().toLowerCase()
      if (code) {
        const { data: validTeam } = await supabase.rpc('check_team_code', { p_code: code })
        if (!validTeam) code = ''
      }
      const referral_code = await uniqueReferralCode(name)
      const { error: appErr } = await supabase.rpc('submit_affiliate_application', {
        p_name: name.trim(),
        p_email: email.trim().toLowerCase(),
        p_phone: phone.trim(),
        p_handle: handle.trim(),
        p_followers: followers.trim(),
        p_reach: reach.trim(),
        p_recruit: code,
        p_referral: referral_code,
      })
      if (appErr) throw appErr

      setConfirmed(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const full = taken !== null && taken >= SEATS
  const counting = taken !== null && taken >= SHOW_AFTER && !full
  const left = taken === null ? SEATS : Math.max(SEATS - taken, 0)
  const kicker = full
    ? 'Founding seats are filled. Join the waitlist.'
    : counting
      ? `Only ${left} founding affiliate seats left. Then the offer closes.`
      : 'Only 15 founding affiliate seats. Then the offer closes.'
  const ctaTitle = full
    ? 'The Founding 15 is filled.'
    : counting
      ? `${left} seats left. When they are gone, they are gone.`
      : '15 seats. When they are gone, they are gone.'
  const claim = full ? 'Join the waitlist' : 'Claim my founding seat'

  const header = (
    <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
      <Link href="/" aria-label="Camrhia home"><Wordmark className="text-3xl" /></Link>
    </header>
  )

  if (confirmed) {
    return (
      <div className="min-h-screen bg-paper">
        {header}
        <main className="mx-auto max-w-xl px-6 py-20 text-center">
        {inviter ? <style>{'main > section:not(#apply){display:none}'}</style> : null}
        {inviter ? <div className="px-6 py-3 text-center text-sm font-semibold text-white" style={{ backgroundColor: ROSE }}>You are invited to join {inviter}&apos;s team at Camrhia. Fill this out and you are in.</div> : null}
          <h1 className="font-fraunces text-4xl font-semibold text-ink">Thank you for applying.</h1>
          <p className="mt-4 text-ink-soft">
            We got your application and will reach out within 48 hours at the number you gave us.
          </p>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper">
      {header}
      <main>
        <section className="px-6 pb-20 pt-6 text-center" style={{ backgroundColor: ROSE }}>
          <div className="mx-auto max-w-3xl pt-10 text-white">
            {full && <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">{kicker}</p>}

            <div className="mt-10 space-y-5 font-fraunces text-3xl leading-tight sm:text-4xl">
              <p className="text-5xl font-semibold sm:text-7xl">This is it.</p>
              <p>You wanted a chance to be part of something big.</p>
              <p className="font-semibold">Here it is.</p>
            </div>

            <div className="mx-auto mt-12 max-w-2xl space-y-4 text-xl leading-snug text-white/95 sm:text-2xl">
              <p>Photographers join Camrhia and stay for years.</p>
              <p>You tell them about it. They join. They pay every month.</p>
              <p className="font-semibold text-white">You get paid every month.</p>
            </div>

            <div className="mx-auto mt-10 max-w-2xl space-y-3 text-xl text-white/95 sm:text-2xl">
              <p>Sign one. Get paid every month.</p>
              <p>Sign ten. Get paid ten times. Every month.</p>
            </div>

            </div>
        </section>

        <section className="px-6 py-24 text-center text-white sm:py-32" style={{ background: 'linear-gradient(160deg, #2B2B2B 0%, #1C1C1C 100%)' }}>
          <div className="mx-auto max-w-3xl">
            <div className="mx-auto mb-8 h-px w-20" style={{ backgroundColor: '#E8A5AE' }} />
            <p className="font-fraunces text-6xl font-semibold leading-none tracking-tight sm:text-8xl">Here is the plan.</p>
            <p className="mt-10 text-xl text-white/80 sm:text-2xl">Camrhia&apos;s goal:</p>
            <p className="mt-2 font-fraunces text-4xl font-semibold leading-tight sm:text-6xl" style={{ color: '#F3C7CC' }}>7,500 photographers by the end of 2027.</p>
            <p className="mt-8 text-xl text-white/90 sm:text-2xl">Post by post, the founding 15 will drive them here.</p>
          </div>
        </section>

        <section className="px-6 pb-20 pt-6 text-center" style={{ backgroundColor: ROSE }}>
          <div className="mx-auto max-w-3xl text-white">

            <div className="mt-12">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/80">Your share</p>
              <p className="mt-2 font-fraunces text-6xl font-semibold leading-none sm:text-8xl">$7,600</p>
              <p className="mt-2 font-fraunces text-4xl font-semibold sm:text-6xl">A MONTH</p>
              <p className="mt-3 text-xl font-semibold sm:text-2xl">Every single month.</p>
              <p className="mt-4 text-sm text-white/80">That is the goal. It is not a promise.</p>
            </div>

            <div className="mt-14">
              <p className="text-xl text-white/95 sm:text-2xl">{full ? 'The Founding 15 is filled.' : counting ? `Only ${left} seats left.` : 'Only 15 people get in first.'}</p>
              <h1 className="mt-3 font-fraunces text-5xl font-semibold leading-[1.05] sm:text-7xl">Be one of the 15.</h1>
              <div className="mx-auto mt-6 max-w-xl space-y-1 text-lg text-white/90">
                <p className="font-semibold text-white">This is a full buy in.</p>
                <p>Trust in Camrhia. Help improve Camrhia. Grow with Camrhia.</p>
                <p>In 2028, the goals get bigger.</p>
              </div>
              <a href="#apply" className="mt-8 inline-block rounded-full bg-white px-9 py-4 text-base font-semibold" style={{ color: ROSE }}>
                {full ? 'Join the waitlist' : 'Claim a founding seat'}
              </a>
              
              
            </div>
          </div>
        </section>

        

        <section className="px-6 pb-4 pt-20">
          <div className="mx-auto max-w-4xl">
            <p className="text-center text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#E8A5AE' }}>The goal</p>
            <h2 className="mt-3 text-center font-fraunces text-3xl font-semibold text-ink sm:text-4xl">Get them in at $8.99. Then watch them grow.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-ink-soft">$8.99 a month is an easy yes. Every photographer you sign starts there. When they upgrade, they stay yours, and so does the extra money.</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-line bg-card p-6 text-center">
                <p className="text-sm text-ink-soft">1. They start</p>
                <p className="mt-1 font-fraunces text-4xl font-semibold text-ink">$8.99</p>
                <p className="mt-2 text-sm text-ink-soft">a month</p>
                <p className="mt-3 text-sm font-semibold text-ink">You earn $2.29 a month</p>
              </div>
              <div className="rounded-2xl border border-line bg-card p-6 text-center">
                <p className="text-sm text-ink-soft">2. They add a team</p>
                <p className="mt-1 font-fraunces text-4xl font-semibold text-ink">$15.99</p>
                <p className="mt-2 text-sm text-ink-soft">a month</p>
                <p className="mt-3 text-sm font-semibold text-ink">You earn $4.08 a month</p>
              </div>
              <div className="rounded-2xl p-6 text-center text-white" style={{ backgroundColor: ROSE }}>
                <p className="text-sm text-white/85">3. They keep upgrading</p>
                <p className="mt-1 font-fraunces text-4xl font-semibold">More</p>
                <p className="mt-2 text-sm text-white/85">bigger plans, bigger months</p>
                <p className="mt-3 text-sm font-semibold">Your 30% grows with them</p>
              </div>
            </div>
            <p className="mx-auto mt-4 max-w-2xl text-center text-xs text-ink-soft">Your 30% is paid on what Camrhia keeps after Apple&apos;s 15% fee. Upgrades stay with the person who brought the photographer in. Results vary.</p>
          </div>
        </section>

        <section className="px-6 pb-16 pt-20">
          <div className="mx-auto max-w-4xl overflow-hidden rounded-[2rem] border border-line p-8 sm:p-12" style={{ background: 'linear-gradient(160deg, #2B2B2B 0%, #1C1C1C 100%)' }}>
            <p className="mx-auto max-w-xl text-center text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#E8A5AE' }}>What founders get</p>
            <ol className="relative mx-auto mt-6 max-w-xl space-y-8">
              <span aria-hidden="true" className="absolute bottom-3 left-5 top-3 w-px" style={{ backgroundColor: ROSE, opacity: 0.35 }} />
              {[
                { t: 'Free Camrhia for life', d: 'Your own account, our gift to the people who build this with us.' },
                { t: 'A welcome call', d: 'We call you, get you set up, and map out your first month together.' },
                { t: 'Your content kit', d: 'Scripts, captions and post ideas you can use today.' },
                { t: 'Grow as a team', d: 'Share what is working, learn from the others, and keep climbing together.' },
              ].map((x, i) => (
                <li key={x.t} className="relative flex gap-5">
                  <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-fraunces text-lg font-semibold text-white" style={{ backgroundColor: ROSE }}>{i + 1}</span>
                  <div>
                    <p className="text-lg font-semibold text-white">{x.t}</p>
                    <p className="mt-1 text-sm text-white/70">{x.d}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mx-auto mt-8 max-w-xl text-center text-xs text-white/55">These numbers are a goal, not a promise. Results depend on your audience and your effort. No income is guaranteed.</p>
          </div>
        </section>

        <section className="px-6 pb-16">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-fraunces text-3xl font-semibold text-ink sm:text-4xl">We are looking for people who move.</h2>
            <p className="mt-4 text-lg text-ink-soft">Creators who post every week. Marketers who run ads. People who push, test and do not wait to be told. If you outwork the room, this is your seat.</p>
            
          </div>
        </section>

        <section className="px-6 pb-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-center font-fraunces text-3xl font-semibold text-ink">Most affiliate programs pay once. We pay every month.</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-line bg-card p-6 text-center">
                <p className="text-sm text-ink-soft">Typical affiliate program</p>
                <p className="mt-1 font-fraunces text-4xl font-semibold text-ink">5 to 15%</p>
                <p className="mt-2 text-sm text-ink-soft">on one sale. Paid once.</p>
              </div>
              <div className="rounded-2xl border border-line bg-card p-6 text-center">
                <p className="text-sm text-ink-soft">Photographer apps like HoneyBook and Dubsado</p>
                <p className="mt-1 font-fraunces text-4xl font-semibold text-ink">$35 to $50</p>
                <p className="mt-2 text-sm text-ink-soft">per referral. One and done.</p>
              </div>
              <div className="rounded-2xl p-6 text-center text-white" style={{ backgroundColor: ROSE }}>
                <p className="text-sm text-white/85">Camrhia</p>
                <p className="mt-1 font-fraunces text-4xl font-semibold">30%</p>
                <p className="mt-2 text-sm font-semibold">EVERY SINGLE MONTH. You join the team and keep earning for as long as your photographers stay.</p>
              </div>
            </div>
            <details className="mx-auto mt-4 max-w-2xl text-center text-xs text-ink-soft">
              <summary className="cursor-pointer">Based on published program terms. See sources</summary>
              <ul className="mt-3 space-y-1">
                <li><a className="underline" href="https://refgrow.com/blog/affiliate-program-benchmarks-2026" target="_blank" rel="noopener noreferrer">Refgrow, Affiliate Program Benchmarks 2026</a></li>
                <li><a className="underline" href="https://growsurf.com/statistics/affiliate-marketing-statistics/" target="_blank" rel="noopener noreferrer">GrowSurf, Affiliate Marketing Statistics</a></li>
                <li><a className="underline" href="https://honeybook.com/lp/affiliates" target="_blank" rel="noopener noreferrer">HoneyBook affiliates</a></li>
                <li><a className="underline" href="https://www.dubsado.com/affiliate-program" target="_blank" rel="noopener noreferrer">Dubsado affiliate program</a></li>
              </ul>
              <p className="mt-3">Typical online-store programs pay 5 to 15% on a single sale. Software programs often pay 20 to 30% recurring. Camrhia starts you at 30%. Programs change their terms.</p>
            </details>
          </div>
        </section>

        <section className="px-6 pb-12">
          <div className="mx-auto max-w-3xl rounded-3xl p-8 text-center text-white sm:p-10" style={{ backgroundColor: ROSE }}>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">The Founding 15</p>
            <h2 className="mt-3 font-fraunces text-3xl font-semibold leading-tight sm:text-4xl">{ctaTitle}</h2>
            <p className="mx-auto mt-4 max-w-xl text-white/90">
              We are capping the founding offer at 15 affiliates. Founders lock in 30% every single month and a free Camrhia account for life. Once the 15 seats are filled, the founding offer closes.
            </p>
            <a href="#apply" className="mt-6 inline-block rounded-full bg-white px-9 py-4 text-base font-semibold" style={{ color: ROSE }}>{claim}</a>
          </div>
        </section>

        <section id="apply" className="px-6 pb-20">
          <div className="mx-auto max-w-xl rounded-[2rem] border border-line bg-card p-7 shadow-xl sm:p-9">
            <h2 className="font-fraunces text-3xl font-semibold text-ink">{inviter ? 'Join ' + inviter + "'s team" : 'Apply in one minute'}</h2>
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

              {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

              <button type="submit" disabled={loading} className="mt-2 w-full rounded-full py-4 text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: ROSE }}>
                {loading ? 'Sending…' : inviter ? 'Join the team' : claim}
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  )
}
