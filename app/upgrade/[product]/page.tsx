'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import Wordmark from '@/app/components/Wordmark'
import { supabase } from '@/lib/supabase'

const COPY: Record<string, { title: string; blurb: string; includes: string[]; month: number; year: number; trial: boolean }> = {
  showcase: {
    title: 'Camrhia Showcase',
    blurb: 'Launch your professional website and publish your ad specials.',
    includes: [
      'Your website live on your own domain',
      'Ad specials published and ready to share',
      'The Camrhia app included',
    ],
    month: 33,
    year: 330,
    trial: true,
  },
  retouch: {
    title: 'Camri Retouch',
    blurb: 'AI editing with Camri guiding every step: saving your style, giving advice, and applying settings in one click.',
    includes: ['AI editing in your style', 'Camri guidance on every step', 'One-click settings', 'Camri Cull included'],
    month: 22,
    year: 220,
    trial: true,
  },
  cull: {
    title: 'Camri Cull',
    blurb: 'AI culling that picks your best shots from every session, so you start editing faster.',
    includes: ['AI culling for every session', 'Best shots picked for you', 'Already included with Camri Retouch'],
    month: 11,
    year: 110,
    trial: false,
  },
}

const field =
  'w-full rounded-xl border border-line bg-card px-4 py-3 text-sm text-ink placeholder:text-ink-soft/50 focus:border-twilight focus:outline-none focus:ring-2 focus:ring-twilight/25'

export default function UpgradePage() {
  const params = useParams<{ product: string }>()
  const product = String(params?.product || '')
  const c = COPY[product]
  const [interval, setInterval] = useState<'month' | 'year'>('month')
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [exists, setExists] = useState(false)

  useEffect(() => {
    const sb = supabase
    if (!sb) { setSignedIn(false); return }
    sb.auth.getSession().then(({ data }) => setSignedIn(!!data.session)).catch(() => setSignedIn(false))
  }, [])

  if (!c) return <div className="p-12 text-ink">That plan does not exist.</div>

  async function go() {
    setBusy(true)
    setErr('')
    setExists(false)
    try {
      const sb = supabase
      if (!sb) { setErr('Service not configured.'); setBusy(false); return }
      let { data } = await sb.auth.getSession()

      if (!data.session) {
        if (!first.trim() || !email.trim()) { setErr('Add your name and email.'); setBusy(false); return }
        if (password.length < 8) { setErr('Use a password with at least 8 characters.'); setBusy(false); return }
        const r = await fetch('/api/billing/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ first, last, email, password }),
        })
        const j = await r.json().catch(() => ({}))
        if (r.status === 409) { setExists(true); setBusy(false); return }
        if (!r.ok) { setErr(j.error || 'Could not create your account.'); setBusy(false); return }
        const { error: se } = await sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
        if (se) { setErr(se.message); setBusy(false); return }
        data = (await sb.auth.getSession()).data
      }

      const token = data.session?.access_token
      if (!token) { setErr('Something went wrong. Please try again.'); setBusy(false); return }
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ product, interval }),
      })
      const j = await res.json()
      if (j.url) { window.location.href = j.url; return }
      setErr(j.error || 'Something went wrong. Please try again.')
    } catch {
      setErr('Something went wrong. Please try again.')
    }
    setBusy(false)
  }

  const price = interval === 'month' ? c.month : c.year

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="border-b border-line bg-paper px-6 py-4">
        <Link href="/"><Wordmark className="text-3xl" /></Link>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 md:py-20">
        <div className="grid gap-10 md:grid-cols-2 md:gap-16">
          <div>
            <p className="mb-4 font-mono text-xs uppercase tracking-widest text-brass">Camrhia</p>
            <h1 className="font-fraunces text-4xl font-semibold text-ink md:text-5xl">{c.title}</h1>
            <p className="mt-5 text-lg text-ink-soft">{c.blurb}</p>
            <ul className="mt-8 space-y-3">
              {c.includes.map((t) => (
                <li key={t} className="flex gap-3 text-ink">
                  <span className="mt-0.5 text-twilight">✓</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="h-fit rounded-3xl border border-line bg-card p-5 shadow-sm sm:p-8">
            <div className="flex rounded-full bg-paper-deep p-1">
              {(['month', 'year'] as const).map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setInterval(i)}
                  className={'flex-1 rounded-full px-4 py-2 text-sm transition ' + (interval === i ? 'bg-card font-medium text-ink shadow-sm' : 'text-ink-soft')}
                >
                  {i === 'month' ? 'Monthly' : 'Yearly · 2 months free'}
                </button>
              ))}
            </div>

            <p className="mt-6 font-fraunces text-5xl text-ink">
              ${price}<span className="text-base text-ink-soft"> /{interval === 'month' ? 'month' : 'year'}</span>
            </p>
            <p className="mt-1 text-sm text-ink-soft">Still in your 14 free days? You are not charged until they end. Cancel anytime in Settings.</p>

            {signedIn === false && (
              <div className="mt-6 space-y-3">
                <p className="font-mono text-xs uppercase tracking-widest text-brass">Create your account</p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input value={first} onChange={(e) => setFirst(e.target.value)} placeholder="First name" autoComplete="given-name" className={field} />
                  <input value={last} onChange={(e) => setLast(e.target.value)} placeholder="Last name" autoComplete="family-name" className={field} />
                </div>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" className={field} />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (8+ characters)" autoComplete="new-password" className={field} />
              </div>
            )}

            <button
              type="button"
              onClick={go}
              disabled={busy || signedIn === null}
              className="mt-6 w-full rounded-full bg-twilight px-6 py-3.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {busy
                ? 'One moment...'
                : signedIn === false
                  ? (c.trial ? 'Create account and start free trial' : 'Create account and subscribe')
                  : (c.trial ? 'Start 14-day free trial' : 'Subscribe')}
            </button>

            {exists && (
              <p className="mt-3 text-sm text-ink">
                You already have an account with that email.{' '}
                <Link href={`/login?next=/upgrade/${product}`} className="font-medium text-twilight underline">Sign in</Link> to continue.
              </p>
            )}
            {err && <p className="mt-3 text-sm text-red-700">{err}</p>}

            {signedIn === false && !exists && (
              <p className="mt-5 text-center text-sm text-ink-soft">
                Already have an account?{' '}
                <Link href={`/login?next=/upgrade/${product}`} className="font-medium text-twilight underline">Sign in</Link>
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
