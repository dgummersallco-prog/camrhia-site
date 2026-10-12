'use client'

import { useState } from 'react'
import AffiliateShell, { type ShellAffiliate } from '../../components/AffiliateShell'

// ── Pitch templates ───────────────────────────────────────────────────────────

const PITCHES: { label: string; body: (link: string) => string }[] = [
  {
    label: 'The Pain Point',
    body: (link) =>
      `Not gonna lie — the thing that finally got me off email and group texts for bookings was almost losing a session because a client's retainer got "sent" three weeks ago and just... never showed up in my inbox. Found out four days before the shoot.

Camrhia tracks all of that automatically now — who's paid, what's due, the whole timeline, built together with the client instead of chased over text. $59/mo and it already paid for itself in stress alone.

${link}`,
  },
  {
    label: 'The Peer Recommendation',
    body: (link) =>
      `A few of us have started using this app called Camrhia for our bookings — it's basically the "shared" version of HoneyBook, where the client can actually see and help build the timeline with you instead of it living in your head.

Figured I'd pass it along since you're always juggling ten things at once too. Free to try for two weeks: ${link}`,
  },
  {
    label: 'The ROI / Math',
    body: (link) =>
      `Quick math: Camrhia is $59/month. That's less than what most of us lose on ONE client who ghosts a payment reminder sent over text, or one Saturday morning spent re-explaining a timeline that got lost in a group chat.

It auto-builds your payment schedule, sends the reminders, and keeps the whole day's timeline in one shared place with the client. Worth a look: ${link}`,
  },
  {
    label: 'The Time Back',
    body: (link) =>
      `How many hours a week do you spend re-typing the same session details into three different places — email, a contract template, a spreadsheet? Camrhia auto-fills all of it the second you book someone.

I got probably 2-3 hours back a week just from not re-entering the same info five times. Free 14-day trial, no card needed to start: ${link}`,
  },
  {
    label: 'The Craft / Identity',
    body: (link) =>
      `You put so much care into how you shoot a session — the way you read the light, the way you catch the moment nobody else sees. Feels weird that the business side of it is stuck in group texts and half-updated spreadsheets, right?

Camrhia is built the same way you shoot — considered, not chaotic. One shared place for the timeline, the contract, the payments, the whole thing, built together with the client. Feels like it matches the actual work: ${link}`,
  },
]

function PitchBody({ a }: { a: ShellAffiliate }) {
  const [copiedPitch, setCopiedPitch] = useState<number | null>(null)

  async function copyPitch(index: number, text: string) {
    await navigator.clipboard.writeText(text)
    setCopiedPitch(index)
    setTimeout(() => setCopiedPitch(null), 2000)
  }

  return (
    <div className="space-y-6">
      <section>
          <div className="mb-5">
            <h2 className="font-fraunces text-xl font-semibold text-ink">Pitch kit</h2>
            <p className="text-sm text-ink-soft mt-0.5">
              Ready-to-send messages — your referral link is already in each one.
            </p>
          </div>
          <div className="space-y-4">
            {PITCHES.map((pitch, i) => {
              const referralLink = `https://camrhia.com/r/${a.referral_code}`
              const text = pitch.body(referralLink)
              const isCopied = copiedPitch === i
              return (
                <div key={i} className="rounded-2xl border border-line bg-card p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <p className="font-mono text-xs tracking-widest uppercase text-ink-soft/60">
                      {pitch.label}
                    </p>
                    <button
                      onClick={() => copyPitch(i, text)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors shrink-0 ${
                        isCopied
                          ? 'border-sage/40 bg-sage/10 text-sage'
                          : 'border-line text-ink-soft hover:text-ink hover:border-ink/30'
                      }`}
                    >
                      {isCopied ? (
                        <>
                          <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Copied!
                        </>
                      ) : (
                        <>
                          <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none">
                            <rect x="1" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                            <path d="M3 3V2.5A1.5 1.5 0 0 1 4.5 1h5A1.5 1.5 0 0 1 11 2.5v5A1.5 1.5 0 0 1 9.5 9H9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                          </svg>
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{text}</p>
                </div>
              )
            })}
          </div>
        </section>
    </div>
  )
}

export default function PitchPage() {
  return (
    <AffiliateShell title="Pitch kit" subtitle="Ready-to-send messages for photographers.">
      {(a) => <PitchBody a={a} />}
    </AffiliateShell>
  )
}
