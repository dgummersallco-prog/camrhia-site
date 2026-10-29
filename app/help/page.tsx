'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { DashboardHeader } from '@/app/components/DashboardHeader'

const TOPICS: { q: string; a: string; href?: string; cta?: string }[] = [
  { q: 'How do I add a client?', a: 'Clients are created when you add a session. Start a new session with their name and details, and they appear on your Clients page with all of their sessions together.', href: '/sessions/new', cta: 'New session' },
  { q: 'Where do I see what a client owes?', a: 'The Clients page shows paid and owed totals for each client. The Payments page tracks every payment.', href: '/payments', cta: 'Open Payments' },
  { q: 'How do I get paid by my clients?', a: 'Connect your payout account from Payments. Client card payments go through Stripe straight to your bank account.', href: '/payments', cta: 'Open Payments' },
  { q: 'Where do I change my password or check my payout account?', a: 'Both are in Settings, along with your tax and payout details held by Stripe.', href: '/settings', cta: 'Open Settings' },
  { q: 'How do I add team members?', a: 'The Team page is for Studio plans. Share your studio code, approve requests, then set each member\'s role, title and pay.', href: '/team', cta: 'Open Team' },
  { q: 'How do I see how my business is doing?', a: 'Insights shows money collected by month, sessions by type and your top clients.', href: '/insights', cta: 'Open Insights' },
]

export default function HelpPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [name, setName] = useState<string | null>(null)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      if (!supabase) { router.push('/login'); return }
      const { data } = await supabase.auth.getSession()
      if (!data.session) { router.push('/login'); return }
      const u = data.session.user
      setUserId(u.id)
      setEmail(u.email ?? '')
      setName((u.user_metadata?.full_name as string | undefined) ?? (u.user_metadata?.name as string | undefined) ?? null)
    }
    load()
  }, [router])

  async function send() {
    if (!supabase || !body.trim()) return
    setSending(true)
    setError(null)
    const { error: e } = await supabase.from('support_messages').insert({
      user_id: userId,
      user_email: email || null,
      email: email || null,
      name,
      kind: 'support',
      source: 'dashboard',
      subject: subject.trim() || null,
      body: body.trim(),
      status: 'new',
    })
    setSending(false)
    if (e) { setError('Could not send your message. Please try again.'); return }
    setSent(true)
    setSubject('')
    setBody('')
  }

  const input = 'w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none focus:border-twilight'

  return (
    <div className="min-h-screen bg-paper xl:pl-60">
      <DashboardHeader active="help" />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="font-fraunces text-3xl font-semibold text-ink">Help</h1>
        <p className="mt-1 text-sm text-ink-soft">Quick answers, and a way to reach us.</p>

        <section className="mt-8 space-y-3">
          {TOPICS.map((t) => (
            <details key={t.q} className="group rounded-2xl border border-line bg-card px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-ink">
                {t.q}
                <span className="text-ink-soft transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">{t.a}</p>
              {t.href && <Link href={t.href} className="mt-3 inline-block text-sm font-medium text-ink underline">{t.cta}</Link>}
            </details>
          ))}
        </section>

        <section className="mt-8 rounded-2xl border border-line bg-card p-6">
          <h2 className="font-fraunces text-lg font-semibold text-ink">Message Camrhia</h2>
          {sent ? (
            <div className="mt-4">
              <p className="text-sm text-ink">Message sent. Thank you.</p>
              <button type="button" onClick={() => setSent(false)} className="mt-3 text-sm text-ink-soft underline hover:text-ink">Send another</button>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <input className={input} placeholder="Subject (optional)" value={subject} onChange={(e) => setSubject(e.target.value)} />
              <textarea className={input + ' min-h-[8rem]'} placeholder="How can we help?" value={body} onChange={(e) => setBody(e.target.value)} />
              {error && <p className="text-sm text-red-700">{error}</p>}
              <button type="button" disabled={sending || !body.trim()} onClick={send} className="rounded-xl bg-twilight px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40">{sending ? 'Sending…' : 'Send message'}</button>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
