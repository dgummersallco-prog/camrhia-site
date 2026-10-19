'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Wordmark from '@/app/components/Wordmark'
import { APP_STORE_URL } from '@/lib/appStore'
import { supabase } from '@/lib/supabase'

const LINKS = [
  { href: '/#how', label: 'How it works' },
  { href: '/#clients', label: 'For your clients' },
  { href: '/#pricing', label: 'Pricing' },
  { href: '/find', label: 'Find a photographer' },
]

export function Nav() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [who, setWho] = useState<'photographer' | 'client'>('photographer')
  const [signedIn, setSignedIn] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const loginRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setSignedIn(!!session))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!open && !loginOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); setLoginOpen(false) }
    }
    const onDown = (e: MouseEvent) => {
      if (loginOpen && loginRef.current && !loginRef.current.contains(e.target as Node)) setLoginOpen(false)
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [open, loginOpen])

  const close = () => setOpen(false)

  async function signIn(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) { setError('Service not configured.'); return }
    setBusy(true)
    setError(null)
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (authError) {
      setError('Email or password incorrect. Please try again.')
      return
    }
    setLoginOpen(false)
    setPassword('')
    router.push('/start')
  }

  const field =
    'w-full rounded-xl border border-line bg-card px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 focus:border-twilight focus:outline-none focus:ring-2 focus:ring-twilight/25'

  return (
    <nav className="sticky top-0 z-50 border-b border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-6">
        <Link href="/" aria-label="Camrhia home" onClick={close}>
          <span className="inline-flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/camrhia-logo.png" alt="" className="h-9 w-9 rounded-xl object-cover" />
            <Wordmark className="text-3xl" />
          </span>
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-7 text-sm font-medium text-ink-soft xl:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="transition-colors hover:text-ink">{l.label}</Link>
          ))}
        </div>
        <div className="hidden items-center gap-5 xl:flex">
          <Link href="/affiliate/signup" className="text-sm font-medium text-brass transition-colors hover:text-ink">
            Earn with Camrhia
          </Link>

          {signedIn ? (
            <Link href="/start" className="text-sm font-medium text-ink transition-colors hover:text-twilight">
              Dashboard
            </Link>
          ) : (
            <div className="relative" ref={loginRef}>
              <button
                type="button"
                onClick={() => setLoginOpen((o) => !o)}
                aria-expanded={loginOpen}
                className="text-sm font-medium text-ink-soft transition-colors hover:text-ink"
              >
                Log in
              </button>
              {loginOpen && (
                <div className="absolute right-0 top-full mt-5 w-80 rounded-2xl border border-line bg-paper p-5 shadow-xl">
                  <div className="mb-4 flex rounded-full border border-line bg-card p-1 text-xs font-semibold">
                    {(['photographer', 'client'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => { setWho(t); setError(null) }}
                        className={`flex-1 rounded-full px-3 py-1.5 capitalize transition ${who === t ? 'bg-twilight text-white' : 'text-ink-soft hover:text-ink'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <p className="mb-4 font-fraunces text-xl font-semibold text-ink">
                    {who === 'photographer' ? 'Photographer dashboard' : 'Your client page'}
                  </p>
                  <form onSubmit={signIn} className="space-y-3">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                      autoComplete="email"
                      placeholder="you@example.com"
                      className={field}
                    />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      placeholder="Your password"
                      className={field}
                    />
                    {error && <p className="text-xs text-red-600">{error}</p>}
                    <button
                      type="submit"
                      disabled={busy}
                      className="w-full rounded-xl bg-twilight px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                    >
                      {busy ? 'Logging in…' : 'Log in'}
                    </button>
                  </form>
                  <p className="mt-4 text-center text-xs text-ink-soft">
                    {who === 'photographer' ? 'New to Camrhia?' : 'New here?'}{' '}
                    <a href={APP_STORE_URL} className="underline hover:text-ink">Get the free app</a>
                    {who === 'client' ? ' and use the same login on your phone.' : ' to start your free trial.'}
                  </p>
                  <p className="mt-2 text-center text-xs text-ink-soft">
                    Affiliate?{' '}
                    <Link href="/affiliate/login" className="underline hover:text-ink" onClick={() => setLoginOpen(false)}>
                      Log in here
                    </Link>
                  </p>
                </div>
              )}
            </div>
          )}

          <a
            href={APP_STORE_URL}
            className="inline-flex items-center rounded-full bg-twilight px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-twilight/90"
          >
            Start free
          </a>
        </div>

        {/* Mobile / tablet */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-lg text-ink xl:hidden"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {open && (
        <div className="max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-line bg-paper px-6 pb-8 pt-2 xl:hidden">
          <ul className="divide-y divide-line">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={close} className="block py-4 text-lg font-medium text-ink">{l.label}</Link>
              </li>
            ))}
            <li>
              <Link href="/affiliate/signup" onClick={close} className="block py-4 text-lg font-medium text-brass">
                Earn with Camrhia
              </Link>
            </li>
            <li>
              <Link href={signedIn ? '/start' : '/login'} onClick={close} className="block py-4 text-lg font-medium text-ink">
                {signedIn ? 'Dashboard' : 'Log in'}
              </Link>
            </li>
          </ul>
          <a
            href={APP_STORE_URL}
            onClick={close}
            className="mt-6 flex w-full items-center justify-center rounded-full bg-twilight px-6 py-4 text-base font-semibold text-white"
          >
            Start your free 14 days
          </a>
        </div>
      )}
    </nav>
  )
}
