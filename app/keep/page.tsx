'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Wordmark from '@/app/components/Wordmark'
import { APP_STORE_URL } from '@/lib/appStore'
import { supabase } from '@/lib/supabase'

const BTN = 'inline-flex items-center justify-center rounded-full bg-twilight px-6 py-3 text-sm font-medium text-white transition hover:opacity-90'
const BTN_LINE = 'inline-flex items-center justify-center rounded-full border border-twilight px-6 py-3 text-sm font-medium text-twilight transition hover:opacity-90'

export default function KeepPage() {
  const [left, setLeft] = useState<number | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const sb = supabase
    if (!sb) { setReady(true); return }
    sb.auth.getSession().then(async ({ data }) => {
      if (!data.session) { window.location.href = '/login?next=/keep'; return }
      const { data: p } = await sb.from('profiles').select('trial_ends_at').eq('id', data.session.user.id).maybeSingle()
      const te = (p as { trial_ends_at?: string | null } | null)?.trial_ends_at
      if (te) setLeft(Math.ceil((new Date(te).getTime() - Date.now()) / 86400000))
      setReady(true)
    }).catch(() => setReady(true))
  }, [])

  const msg =
    left === null ? 'Choose what you would like to keep.'
    : left > 0 ? `You have ${left} ${left === 1 ? 'day' : 'days'} left. Choose what you would like to keep. Nothing is charged until you pick.`
    : 'Your free 14 days are up. Choose what you would like to keep and everything will be right where you left it.'

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="border-b border-line bg-paper px-6 py-4">
        <Link href="/dashboard"><Wordmark className="text-3xl" /></Link>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12 md:py-16">
        <h1 className="font-fraunces text-4xl font-semibold text-ink md:text-5xl">What would you like to keep?</h1>
        <p className="mt-4 text-lg text-ink-soft">{ready ? msg : ' '}</p>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <div className="flex flex-col rounded-3xl border border-line bg-card p-7">
            <p className="font-fraunces text-2xl font-semibold text-ink">Run your business</p>
            <p className="mt-1 text-sm text-ink-soft">The app and your dashboard: sessions, contracts, payments, messages and your calendar.</p>
            <p className="mt-5 font-fraunces text-4xl text-ink">$8.99<span className="text-base text-ink-soft"> /month</span></p>
            <p className="text-sm text-ink-soft">Subscribe in the App Store</p>
            <a href={APP_STORE_URL} className={`${BTN_LINE} mt-6`}>Get the app</a>
          </div>

          <div className="flex flex-col rounded-3xl border-2 border-twilight bg-card p-7">
            <p className="font-fraunces text-2xl font-semibold text-ink">Website, specials and galleries</p>
            <p className="mt-1 text-sm text-ink-soft">Your website, live specials and gallery delivery. The app and dashboard are included.</p>
            <p className="mt-5 font-fraunces text-4xl text-ink">$33<span className="text-base text-ink-soft"> /month</span></p>
            <p className="text-sm text-ink-soft">or $330 /year</p>
            <Link href="/upgrade/showcase" className={`${BTN} mt-6`}>Keep Showcase</Link>
          </div>

          <div className="flex flex-col rounded-3xl border border-line bg-card p-7">
            <p className="font-fraunces text-2xl font-semibold text-ink">Camri Cull</p>
            <p className="mt-1 text-sm text-ink-soft">AI culling that finds your best shots. Perfect if you love editing in Lightroom.</p>
            <p className="mt-5 font-fraunces text-4xl text-ink">$11<span className="text-base text-ink-soft"> /month</span></p>
            <p className="text-sm text-ink-soft">or $110 /year</p>
            <Link href="/upgrade/cull" className={`${BTN_LINE} mt-6`}>Keep Cull</Link>
          </div>

          <div className="flex flex-col rounded-3xl border border-line bg-card p-7">
            <p className="font-fraunces text-2xl font-semibold text-ink">Camri Retouch</p>
            <p className="mt-1 text-sm text-ink-soft">AI editing with Camri beside you. Cull is included.</p>
            <p className="mt-5 font-fraunces text-4xl text-ink">$22<span className="text-base text-ink-soft"> /month</span></p>
            <p className="text-sm text-ink-soft">or $220 /year</p>
            <Link href="/upgrade/retouch" className={`${BTN} mt-6`}>Keep Retouch</Link>
          </div>
        </div>

        <div className="mt-6 rounded-3xl bg-paper-deep p-7">
          <p className="font-fraunces text-2xl font-semibold text-ink">Keep it all for $55 a month</p>
          <p className="mt-2 text-ink-soft">Showcase plus Retouch gives you the business, the website, specials, galleries and all the editing. Start with Showcase, then add Retouch.</p>
          <Link href="/upgrade/showcase" className={`${BTN} mt-5`}>Start with Showcase</Link>
        </div>
      </main>
    </div>
  )
}
