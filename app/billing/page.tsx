'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { BRAND_NAME } from '@/lib/brand'

const FEATURES = [
  'Shared wedding timeline — built with your couple',
  'Inquiry-to-booking messaging in one place',
  'Contracts that send and sign themselves',
  'Auto-built payment schedules',
  'One shared calendar per wedding',
  'Public photographer profile with verified reviews',
  'In-app gallery delivery',
]

export default function BillingPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubscribe() {
    if (!supabase) {
      setError('Service not configured.')
      return
    }
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        window.location.href = '/affiliate/login'
        return
      }

      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, userId: user.id }),
      })

      const data = await res.json()

      if (!res.ok || !data.url) {
        throw new Error(data.error ?? 'Could not create checkout session.')
      }

      window.location.href = data.url
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <header className="border-b border-line bg-paper px-6 py-4">
        <Link
          href="/"
          className="font-fraunces text-xl font-semibold text-ink hover:text-twilight transition-colors"
        >
          {BRAND_NAME}
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <p className="font-mono text-xs tracking-widest uppercase text-brass mb-4">
            Photographer plan
          </p>
          <h1 className="font-fraunces text-4xl font-semibold text-ink mb-2 leading-tight">
            Subscribe to {BRAND_NAME}
          </h1>
          <p className="text-ink-soft text-sm mb-8">
            Everything you need to run your photography business.
          </p>

          <div className="rounded-2xl bg-card border border-line p-6 mb-6">
            <div className="flex items-end gap-1 mb-1">
              <span className="font-fraunces text-4xl font-semibold text-ink">$59</span>
              <span className="text-ink-soft text-sm mb-1.5">/month</span>
            </div>
            <p className="text-xs text-ink-soft mb-5">Billed monthly. Cancel any time.</p>

            <ul className="space-y-2.5">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-ink">
                  <span className="mt-1 w-4 h-4 rounded-full bg-twilight/10 flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-twilight" fill="none">
                      <path
                        d="M2 6l3 3 5-5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-4">
              {error}
            </p>
          )}

          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="w-full rounded-full bg-twilight py-3 text-sm font-semibold text-white hover:bg-twilight/90 disabled:opacity-50 transition-colors"
            style={{ backgroundColor: '#3A4A6B', color: '#ffffff' }}
          >
            {loading ? 'Redirecting to checkout…' : 'Subscribe — $59/month →'}
          </button>

          <p className="mt-4 text-center text-xs text-ink-soft">
            Secure checkout powered by Stripe.
          </p>
        </div>
      </main>
    </div>
  )
}
