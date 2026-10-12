'use client'

import { useState } from 'react'
import AffiliateShell, { type ShellAffiliate } from '../../components/AffiliateShell'

function RecruitBody({ a }: { a: ShellAffiliate }) {
  const [copied, setCopied] = useState<string | null>(null)

  if (!a.is_master) {
    return <p className="text-sm text-ink-soft">Recruiting is for master partners.</p>
  }

  const code = a.referral_code
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://camrhia.com'
  const link = `${origin}/affiliate/signup?recruit=${code}`
  const message =
    `Hey! I'm a partner with Camrhia, an app that gives photographers their own portfolio website plus bookings, contracts, payments and client messaging in one place. ` +
    `You earn recurring commission for every photographer you refer. Sign up at ${origin}/affiliate/signup and enter my team code when it asks "Joining a team?": ${code}`

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    } catch {}
  }

  const btn = 'rounded-full px-5 py-2 text-sm font-medium'

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-ink p-8">
        <p className="font-mono text-xs tracking-widest uppercase text-white/40 mb-3">Your team code</p>
        <p className="font-fraunces text-4xl text-white tracking-wide break-all">{code}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button onClick={() => copy(code, 'code')} className={btn} style={{ backgroundColor: '#ffffff', color: '#191E29' }}>
            {copied === 'code' ? 'Copied' : 'Copy code'}
          </button>
          <button onClick={() => copy(message, 'msg')} className={`${btn} border border-white/30 text-white`}>
            {copied === 'msg' ? 'Copied' : 'Copy ready-made message'}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-card p-6">
        <h2 className="font-fraunces text-xl font-semibold text-ink">How to add someone to your team</h2>
        <ol className="mt-4 space-y-3 text-sm text-ink list-decimal list-inside">
          <li>Send them your team code (or the ready-made message above).</li>
          <li>They go to <span className="font-medium">camrhia.com/affiliate/signup</span> and fill out the form.</li>
          <li>In the <span className="font-medium">Joining a team?</span> box, they type your code.</li>
          <li>They confirm their email and log in. They show up under your Team tab.</li>
        </ol>
        <p className="mt-4 text-sm text-ink-soft">
          From then on you earn a bonus on every sale they make. It never reduces their commission.
        </p>
      </section>

      <section className="rounded-2xl border border-line bg-card p-6">
        <p className="text-sm font-medium text-ink">Prefer a link?</p>
        <div className="mt-2 flex flex-col sm:flex-row gap-3">
          <input readOnly value={link} className="flex-1 rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink" />
          <button onClick={() => copy(link, 'link')} className={`${btn} border border-line text-ink hover:bg-paper`}>
            {copied === 'link' ? 'Copied' : 'Copy link'}
          </button>
        </div>
      </section>
    </div>
  )
}

export default function RecruitPage() {
  return (
    <AffiliateShell title="Recruit affiliates" subtitle="Build your team. You earn on everything they sell.">
      {(a) => <RecruitBody a={a} />}
    </AffiliateShell>
  )
}
