"use client"

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { DashboardHeader } from '@/app/components/DashboardHeader'

type St = { connected: boolean; ready: boolean; payoutsEnabled?: boolean; dashboardUrl?: string | null }

export default function PaymentsPage() {
  const [st, setSt] = useState<St | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const token = useCallback(async () => {
    if (!supabase) return null
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
  }, [])

  const load = useCallback(async () => {
    const t = await token()
    if (!t) { setErr('Please sign in again.'); return }
    const res = await fetch('/api/connect/status', { method: 'POST', headers: { Authorization: 'Bearer ' + t } })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) { setErr(j.error || 'Could not check your payment setup.'); return }
    setSt(j as St)
  }, [token])

  useEffect(() => { load() }, [load])

  async function start() {
    setBusy(true)
    setErr(null)
    const t = await token()
    if (!t) { setBusy(false); setErr('Please sign in again.'); return }
    const res = await fetch('/api/connect/onboard', { method: 'POST', headers: { Authorization: 'Bearer ' + t } })
    const j = await res.json().catch(() => ({}))
    if (!res.ok || !j.url) { setBusy(false); setErr(j.error || 'Could not start payment setup.'); return }
    window.location.href = j.url
  }

  return (
    <div className="min-h-screen bg-paper">
      <DashboardHeader active="billing" />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="font-fraunces text-3xl font-semibold text-ink">Card payments</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Let your clients pay your booking fee and balance by card. The money goes straight to your bank through Stripe. Camrhia never sees your bank details, and clients can still pay you outside the app if they prefer.
        </p>

        <section className="mt-6 rounded-2xl border border-line bg-card p-6">
          {!st && !err && <p className="text-sm text-ink-soft">Checking your setup...</p>}
          {st && st.ready && (
            <>
              <p className="text-sm font-semibold text-emerald-700">Card payments are on</p>
              <p className="mt-1 text-sm text-ink-soft">Clients now see a Pay by card button on their booking fee and balance. You will get a notification when someone pays.</p>
              {st.dashboardUrl && (
                <a href={st.dashboardUrl} target="_blank" rel="noreferrer" className="mt-4 inline-block rounded-full border border-line px-5 py-2 text-sm text-ink">Open my Stripe payouts</a>
              )}
              <p className="mt-4 text-xs text-ink-soft">Stripe takes its standard processing fee (2.9% + 30 cents) from each payment. Camrhia adds nothing on top.</p>
            </>
          )}
          {st && !st.ready && (
            <>
              <p className="text-sm font-semibold text-ink">{st.connected ? 'Finish setting up card payments' : 'Turn on card payments'}</p>
              <p className="mt-1 text-sm text-ink-soft">It takes about five minutes. Stripe will ask for your business details and the bank account to pay you into.</p>
              <button type="button" disabled={busy} onClick={start} className="mt-4 rounded-full bg-ink px-6 py-3 text-sm text-white disabled:opacity-50">
                {busy ? 'Opening Stripe...' : st.connected ? 'Continue setup' : 'Set up card payments'}
              </button>
            </>
          )}
          {err && <p className="mt-3 text-sm text-red-700">{err}</p>}
        </section>
      </main>
    </div>
  )
}
