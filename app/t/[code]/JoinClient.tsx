'use client'

import { useEffect, useState } from 'react'
import { supabaseAffiliate as supabase } from '@/lib/supabaseAffiliate'
import Wordmark from '@/app/components/Wordmark'

const ROSE = '#8C6B3F'
const inputCls =
  'w-full rounded-xl border border-line bg-card px-4 py-3 text-sm text-ink placeholder:text-ink-soft/50 focus:outline-none focus:ring-2 focus:ring-[#8C6B3F]/25 focus:border-[#8C6B3F] transition'

function baseCode(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16) || 'user'
}

async function uniqueReferralCode(name: string): Promise<string> {
  if (!supabase) return baseCode(name)
  const { data: cleanTaken } = await supabase.rpc('referral_code_taken', { p_code: baseCode(name) })
  if (cleanTaken === false) return baseCode(name)
  for (let i = 0; i < 5; i++) {
    const code = `${baseCode(name)}${Math.floor(100 + Math.random() * 900)}`
    if (!supabase) return code
    const { data: taken } = await supabase.rpc('referral_code_taken', { p_code: code })
    if (taken === false) return code
  }
  return `${baseCode(name)}${Date.now().toString().slice(-4)}`
}

export default function JoinClient({ code }: { code: string }) {
  const [loaded, setLoaded] = useState(false)
  const [inviter, setInviter] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [handle, setHandle] = useState('')
  const [followers, setFollowers] = useState('')
  const [reach, setReach] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!supabase) { setLoaded(true); return }
    supabase.rpc('team_invite_info', { p_code: code }).then(({ data }) => {
      const d = data as { name?: string; note?: string } | null
      setInviter(d && d.name ? d.name : null)
      setNote(d && d.note ? d.note : null)
      setLoaded(true)
    })
  }, [code])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) { setError('Service not configured.'); return }
    setBusy(true)
    setError(null)
    try {
      const referral_code = await uniqueReferralCode(name)
      const { error: appErr } = await supabase.rpc('submit_affiliate_application', {
        p_name: name.trim(),
        p_email: email.trim().toLowerCase(),
        p_phone: phone.trim(),
        p_handle: handle.trim(),
        p_followers: followers.trim(),
        p_reach: reach.trim(),
        p_recruit: code.trim().toLowerCase(),
        p_referral: referral_code,
      })
      if (appErr) throw appErr
      setDone(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-paper">
      <div className="px-6 py-8 text-center"><Wordmark className="text-4xl" /></div>
      <main className="px-6 pb-20">
        <div className="mx-auto max-w-xl">{children}</div>
      </main>
    </div>
  )

  if (!loaded) return shell(<p className="text-center text-sm text-ink-soft">Loading…</p>)

  if (!inviter) {
    return shell(
      <div className="text-center">
        <h1 className="font-fraunces text-3xl font-semibold text-ink">This invite link is not valid</h1>
        <p className="mt-3 text-sm text-ink-soft">Ask the person who sent it for a new link.</p>
      </div>,
    )
  }

  if (done) {
    return shell(
      <div className="text-center">
        <h1 className="font-fraunces text-4xl font-semibold text-ink">You are on the list.</h1>
        <p className="mt-4 text-base text-ink-soft">
          We will review your request and email you when you are in. That email has a link to set your password, and you will land on {inviter}&apos;s team.
        </p>
      </div>,
    )
  }

  return shell(
    <>
      <p className="text-center text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: ROSE }}>You are invited</p>
      <h1 className="mt-3 text-center font-fraunces text-4xl font-semibold leading-tight text-ink sm:text-5xl">Join {inviter}&apos;s team</h1>

      {note ? (
        <blockquote className="mt-8 rounded-2xl border border-line bg-card p-6 text-center">
          <p className="font-fraunces text-xl italic text-ink">&ldquo;{note}&rdquo;</p>
          <footer className="mt-3 text-sm text-ink-soft">{inviter}</footer>
        </blockquote>
      ) : null}

      <ul className="mt-8 space-y-3 text-base text-ink">
        <li className="flex gap-3"><span style={{ color: ROSE }}>&#10003;</span><span>Earn 30% every month, for as long as a photographer you refer stays subscribed.</span></li>
        <li className="flex gap-3"><span style={{ color: ROSE }}>&#10003;</span><span>Your own referral link, ready-made posts and an earnings dashboard.</span></li>
      </ul>

      <form onSubmit={submit} className="mt-10 space-y-4 rounded-[2rem] border border-line bg-card p-7 shadow-xl sm:p-9">
        <h2 className="font-fraunces text-2xl font-semibold text-ink">Tell us a little about you</h2>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Full name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Jane Smith" className={inputCls} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="jane@example.com" className={inputCls} />
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
        {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={busy} className="mt-2 w-full rounded-full py-4 text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: ROSE }}>
          {busy ? 'Sending…' : `Join ${inviter}'s team`}
        </button>
        <p className="text-center text-xs text-ink-soft">We review every request and email you when you are in.</p>
      </form>
    </>,
  )
}
