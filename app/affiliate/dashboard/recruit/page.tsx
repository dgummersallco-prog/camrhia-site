'use client'

import { useState } from 'react'
import AffiliateShell, { type ShellAffiliate } from '../../components/AffiliateShell'

function RecruitBody({ a }: { a: ShellAffiliate }) {
  const [copied, setCopied] = useState(false)

  if (!a.is_master) {
    return <p className="text-sm text-ink-soft">Recruiting is for master partners.</p>
  }

  const code = a.team_code || a.referral_code
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://camrhia.com'
  const link = `${origin}/t/${code}`
  const message = `Join my team at Camrhia, the app photographers use to run their whole business. Tap here to join: ${link}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  // Opens the phone's share sheet (Messages, email, WhatsApp...). Falls back to the email app on desktop.
  async function send() {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({ text: message })
        return
      }
    } catch {
      return // person closed the share sheet
    }
    window.location.href = `mailto:?subject=${encodeURIComponent('Join my Camrhia team')}&body=${encodeURIComponent(message)}`
  }

  const btn = 'rounded-full px-5 py-2 text-sm font-medium'

  return (
    <section className="rounded-2xl border border-line bg-card p-6 sm:p-8">
      <h2 className="font-fraunces text-2xl font-semibold text-ink">Your invite link</h2>
      <p className="mt-2 text-sm text-ink-soft">
        Send it to anyone. They tap it, fill out one short form, and join your team.
      </p>
      <div className="mt-5 flex flex-col sm:flex-row gap-3">
        <input readOnly value={link} className="flex-1 rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink" />
        <button onClick={copy} className={`${btn} border border-line text-ink hover:bg-paper`}>
          {copied ? 'Copied' : 'Copy link'}
        </button>
        <button onClick={send} className={btn} style={{ backgroundColor: 'var(--aff-fill)', color: '#ffffff' }}>
          Send invite
        </button>
      </div>
    </section>
  )
}

export default function RecruitPage() {
  return (
    <AffiliateShell title="Recruit affiliates" subtitle="Build your team. You earn on everything they sell.">
      {(a) => <RecruitBody a={a} />}
    </AffiliateShell>
  )
}
