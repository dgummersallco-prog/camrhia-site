'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { DashboardHeader } from '@/app/components/DashboardHeader'

type St = { connected: boolean; ready: boolean; enabled?: boolean; payoutsEnabled?: boolean; dashboardUrl?: string | null; bank?: { name: string | null; last4: string | null } | null }

function Card({ title, hint, badge, children }: { title: string; hint?: string; badge?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-card p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-fraunces text-lg font-semibold text-ink">{title}</h2>
          {hint && <p className="mt-1 text-sm text-ink-soft">{hint}</p>}
        </div>
        {badge && <span className="shrink-0 rounded-full bg-blush-wash px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-twilight">{badge}</span>}
      </div>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [email, setEmail] = useState('')
  const [st, setSt] = useState<St | null>(null)
  const [stErr, setStErr] = useState<string | null>(null)
  const [pw1, setPw1] = useState('')
  const [pw2, setPw2] = useState('')
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pwBusy, setPwBusy] = useState(false)
  const [uid, setUid] = useState('')
  const [reviewUrl, setReviewUrl] = useState('')
  const [autoPay, setAutoPay] = useState(true)
  const [autoReview, setAutoReview] = useState(true)
  const [autoMsg, setAutoMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [autoBusy, setAutoBusy] = useState(false)

  useEffect(() => {
    async function load() {
      if (!supabase) { router.push('/login'); return }
      const { data } = await supabase.auth.getSession()
      if (!data.session) { router.push('/login'); return }
      setEmail(data.session.user.email ?? '')
      setUid(data.session.user.id)
      const { data: prof } = await supabase.from('profiles').select('google_review_url, automation_settings, auto_payment_reminders').eq('id', data.session.user.id).maybeSingle()
      if (prof) {
        setReviewUrl(prof.google_review_url ?? '')
        const a = (prof.automation_settings ?? {}) as Record<string, boolean>
        setAutoPay((prof as any).auto_payment_reminders === true)
        setAutoReview(a.review_request !== false)
      }
      setReady(true)
      try {
        const res = await fetch('/api/connect/status', { method: 'POST', headers: { Authorization: 'Bearer ' + data.session.access_token } })
        const j = await res.json().catch(() => ({}))
        if (!res.ok) setStErr(j.error || 'Could not check your payout setup.')
        else setSt(j as St)
      } catch {
        setStErr('Could not check your payout setup.')
      }
    }
    load()
  }, [router])

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwMsg(null)
    if (pw1.length < 8) { setPwMsg({ ok: false, text: 'Use at least 8 characters.' }); return }
    if (pw1 !== pw2) { setPwMsg({ ok: false, text: 'The two passwords do not match.' }); return }
    if (!supabase) return
    setPwBusy(true)
    const { error } = await supabase.auth.updateUser({ password: pw1 })
    setPwBusy(false)
    if (error) { setPwMsg({ ok: false, text: error.message }); return }
    setPw1(''); setPw2('')
    setPwMsg({ ok: true, text: 'Password updated.' })
  }

  async function saveAutomation(e: React.FormEvent) {
    e.preventDefault()
    setAutoMsg(null)
    const url = reviewUrl.trim()
    if (url && !/^https?:\/\//i.test(url)) { setAutoMsg({ ok: false, text: 'The review link should start with https://' }); return }
    if (!supabase || !uid) return
    setAutoBusy(true)
    const { error } = await supabase.from('profiles').update({ google_review_url: url || null, auto_payment_reminders: autoPay, automation_settings: { review_request: autoReview } }).eq('id', uid)
    setAutoBusy(false)
    setAutoMsg(error ? { ok: false, text: 'Could not save. Please try again.' } : { ok: true, text: 'Saved.' })
  }

  const input = 'w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-twilight'
  const btn = 'rounded-xl bg-twilight px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50'
  const btnGhost = 'inline-block rounded-xl border border-line bg-white px-5 py-2.5 text-sm font-medium text-ink transition hover:border-ink'

  return (
    <div className="min-h-screen bg-paper xl:pl-60">
      <DashboardHeader active="settings" />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="font-fraunces text-3xl font-semibold text-ink">Settings</h1>
        {!ready ? (
          <p className="mt-8 text-sm text-ink-soft">Loading…</p>
        ) : (
          <div className="mt-8 space-y-6">
            <Card title="Account" hint="The email you sign in with.">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-ink">Email</label>
                <input className={input + ' bg-blush-wash/40'} value={email} readOnly />
              </div>
            </Card>

            <Card title="Password">
              <form onSubmit={changePassword} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-ink">New password</label>
                  <input className={input} type="password" autoComplete="new-password" value={pw1} onChange={(e) => setPw1(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-ink">Confirm new password</label>
                  <input className={input} type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
                </div>
                {pwMsg && <p className={'text-sm ' + (pwMsg.ok ? 'text-emerald-700' : 'text-red-700')}>{pwMsg.text}</p>}
                <button type="submit" className={btn} disabled={pwBusy || !pw1}>{pwBusy ? 'Saving…' : 'Update password'}</button>
              </form>
            </Card>

            <Card title="Automatic messages" hint="Camrhia sends these to your clients for you, as notifications in the app.">
              <form onSubmit={saveAutomation} className="space-y-4">
                <label className="flex items-start gap-3 text-sm text-ink">
                  <input type="checkbox" className="mt-0.5 h-4 w-4" checked={autoPay} onChange={(e) => setAutoPay(e.target.checked)} />
                  <span><span className="font-medium">Payment reminders</span><span className="block text-ink-soft">Sent once, when a payment is due within 3 days.</span></span>
                </label>
                <label className="flex items-start gap-3 text-sm text-ink">
                  <input type="checkbox" className="mt-0.5 h-4 w-4" checked={autoReview} onChange={(e) => setAutoReview(e.target.checked)} />
                  <span><span className="font-medium">Review request</span><span className="block text-ink-soft">Sent 3 days after you deliver a gallery.</span></span>
                </label>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-ink">Google review link</label>
                  <input className={input} placeholder="https://g.page/r/..." value={reviewUrl} onChange={(e) => setReviewUrl(e.target.value)} />
                </div>
                {autoMsg && <p className={'text-sm ' + (autoMsg.ok ? 'text-emerald-700' : 'text-red-700')}>{autoMsg.text}</p>}
                <button type="submit" disabled={autoBusy} className={btn}>{autoBusy ? 'Saving…' : 'Save'}</button>
              </form>
            </Card>

            <Card title="Payouts & tax" hint="Card payments from your clients go to your bank through Stripe.">
              {stErr ? (
                <p className="text-sm text-red-700">{stErr}</p>
              ) : !st ? (
                <p className="text-sm text-ink-soft">Checking your payout setup…</p>
              ) : st.ready ? (
                <>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Payouts connected</span>
                    {st.bank?.last4 && <span className="text-sm text-ink-soft">{st.bank.name ? st.bank.name + ' ' : ''}ending {st.bank.last4}</span>}
                  </div>
                  <p className="text-sm leading-relaxed text-ink-soft">Your tax details were collected securely by Stripe when you set up payouts. Camrhia never sees or stores your tax ID. Open your Stripe dashboard to review your details or find tax documents.</p>
                  {st.dashboardUrl && <a href={st.dashboardUrl} target="_blank" rel="noreferrer" className={btnGhost}>Open Stripe dashboard</a>}
                </>
              ) : (
                <>
                  <p className="text-sm leading-relaxed text-ink-soft">{st.connected ? 'Your payout setup is not finished yet.' : 'You have not set up payouts yet.'} Stripe collects your bank and tax details securely, and Camrhia never stores your tax ID.</p>
                  <Link href="/payments" className={btn + ' inline-block'}>{st.connected ? 'Finish setup' : 'Set up payouts'}</Link>
                </>
              )}
            </Card>

            <Card title="AI photo editing" hint="Edit, enhance and retouch your photos right inside your galleries." badge="Coming soon">
              <p className="text-sm text-ink-soft">We are building this now.</p>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
