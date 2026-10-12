'use client'

import { useState } from 'react'
import AffiliateShell, { type ShellAffiliate } from '../../components/AffiliateShell'

type Script = { label: string; when: string; body: (link: string) => string }

const MESSAGES: Script[] = [
  {
    label: 'First message (cold DM)',
    when: 'You found their work online and want to start a conversation. Short on purpose.',
    body: (link) =>
      `Hey [Name], love your work, especially [something specific you noticed]. Quick question: how do you keep track of contracts, payments and the day-of timeline with your clients right now?

I've been using an app called Camrhia that puts all of it in one shared place with the client. Happy to show you if you're curious. There's a free 14-day trial: ${link}`,
  },
  {
    label: 'Friend to friend',
    when: 'You already know them. Keep it casual and honest.',
    body: (link) =>
      `Hey [Name]! You're always juggling a ton of sessions, so I thought of you. I've been using Camrhia to keep the contract, payment schedule and session timeline in one shared spot with the client instead of scattered across texts and email.

It's free to try for 14 days if you want to poke around: ${link}`,
  },
  {
    label: 'Follow-up (no reply yet)',
    when: 'Send 3 to 5 days after your first message. Once is enough.',
    body: (link) =>
      `Hey [Name], no pressure at all. Just circling back in case my last message got buried. If keeping payments and timelines organized is ever a headache, Camrhia might help, and the first 14 days are free: ${link}

Either way, keep up the great work.`,
  },
  {
    label: '"I already use something else"',
    when: 'They said they have HoneyBook, a spreadsheet, or a system that works.',
    body: (link) =>
      `Totally fair, if it's working, don't change it. The one thing Camrhia does differently is that the client works in it with you. They can see the timeline and their payments instead of you relaying everything over text.

If that ever sounds useful, the trial is free for 14 days and it's easy to try alongside what you have now: ${link}`,
  },
  {
    label: 'Photographer who asked for details',
    when: 'They replied with interest and want to know more.',
    body: (link) =>
      `Glad you asked! Here's the short version: Camrhia is where you and your client handle the contract, the payment schedule (with reminders) and the session timeline together. You can see who's paid and what's coming up without chasing anyone over text.

It's $59.99/month for Solo, with a free 14-day trial first. Here's the link, and I'm happy to answer anything: ${link}`,
  },
]

const CALL_STEPS: { title: string; say: string }[] = [
  {
    title: '1. Open (10 seconds)',
    say: `"Hi [Name], this is [your name]. I'm a photographer-friendly partner with an app called Camrhia, and I saw your work on [Instagram / website]. Do you have two minutes, or is this a bad time?"`,
  },
  {
    title: '2. Ask first',
    say: `"How are you handling contracts, payment reminders and the session timeline with clients right now?" Then listen. Let them tell you what's annoying about it.`,
  },
  {
    title: '3. The pitch (30 seconds)',
    say: `"What I like about Camrhia is that you and the client work in one shared place. The contract, the payment schedule with reminders, and the timeline are all there, and they can see it too, so there's less chasing and re-explaining. It's $59.99 a month, and you get a free 14-day trial first."`,
  },
  {
    title: '4. If they say "I already have a system"',
    say: `"Makes sense. The difference here is that your client is in it with you, not just you tracking things on your end. It's free to try for 14 days, so you could run one upcoming session through it and see."`,
  },
  {
    title: '5. If they say "it\'s too expensive"',
    say: `"I get that. It's about two dollars a day, and the trial is free, so you'll know within two weeks whether it saves you enough time and chasing to be worth it."`,
  },
  {
    title: '6. Close',
    say: `"Want me to text you the link so you can try it on your next booking?" Send it right away, then follow up in 3 to 5 days.`,
  },
]

const VOICEMAIL = (link: string) =>
  `"Hi [Name], it's [your name]. I love your work, especially [something specific]. I use an app called Camrhia to keep contracts, payments and timelines in one shared place with clients, and thought it might help you too. There's a free 14-day trial. I'll text you the link. Have a great day!"

Text to follow up with: Hi [Name], here's that link I mentioned: ${link}`

function CopyButton({ text, id, copied, setCopied }: { text: string; id: string; copied: string | null; setCopied: (v: string | null) => void }) {
  const isCopied = copied === id
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text)
        setCopied(id)
        setTimeout(() => setCopied(null), 2000)
      }}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors shrink-0 ${
        isCopied ? 'border-sage/40 bg-sage/10 text-sage' : 'border-line text-ink-soft hover:text-ink hover:border-ink/30'
      }`}
    >
      {isCopied ? 'Copied!' : 'Copy'}
    </button>
  )
}

function PitchBody({ a }: { a: ShellAffiliate }) {
  const [copied, setCopied] = useState<string | null>(null)
  const link = `https://camrhia.com/r/${a.referral_code}`

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-line bg-card p-6">
        <h2 className="font-fraunces text-xl font-semibold text-ink">What is a pitch kit?</h2>
        <p className="mt-2 text-sm text-ink max-w-2xl leading-relaxed">
          It&apos;s a set of ready-made things to say, so you never start from a blank screen. Pick a message to send or a call script to follow, change anything in <span className="font-mono">[brackets]</span> to make it yours, and your referral link is already in each one.
        </p>
        <ul className="mt-4 space-y-1.5 text-sm text-ink-soft list-disc list-inside">
          <li>Personalize the first line. Mention something real about their work. It&apos;s what gets replies.</li>
          <li>Be upfront that you&apos;re a Camrhia partner. Honesty builds trust and it&apos;s the right thing to do.</li>
          <li>Send one follow-up, not five. Respect a no.</li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <a href="#messages" className="rounded-full border border-line px-4 py-1.5 text-ink-soft hover:text-ink">Send a message</a>
          <a href="#call" className="rounded-full border border-line px-4 py-1.5 text-ink-soft hover:text-ink">Make a call</a>
        </div>
      </section>

      <section id="messages" className="space-y-4">
        <div>
          <h2 className="font-fraunces text-xl font-semibold text-ink">Send a message</h2>
          <p className="text-sm text-ink-soft mt-0.5">For Instagram DMs, texts or email. Short, friendly, one clear next step.</p>
        </div>
        {MESSAGES.map((m, i) => {
          const text = m.body(link)
          return (
            <div key={m.label} className="rounded-2xl border border-line bg-card p-6">
              <div className="flex items-start justify-between gap-4 mb-1">
                <p className="font-mono text-xs tracking-widest uppercase text-ink-soft/60">{m.label}</p>
                <CopyButton text={text} id={`m${i}`} copied={copied} setCopied={setCopied} />
              </div>
              <p className="text-xs text-ink-soft mb-4">{m.when}</p>
              <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{text}</p>
            </div>
          )
        })}
      </section>

      <section id="call" className="space-y-4">
        <div>
          <h2 className="font-fraunces text-xl font-semibold text-ink">Make a call</h2>
          <p className="text-sm text-ink-soft mt-0.5">A simple flow for a phone call. Ask first, listen, then share. Don&apos;t read it word for word.</p>
        </div>
        <div className="rounded-2xl border border-line bg-card p-6 space-y-5">
          {CALL_STEPS.map((s) => (
            <div key={s.title}>
              <p className="text-sm font-medium text-ink">{s.title}</p>
              <p className="mt-1 text-sm text-ink-soft leading-relaxed whitespace-pre-wrap">{s.say}</p>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-line bg-card p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <p className="font-mono text-xs tracking-widest uppercase text-ink-soft/60">Voicemail + follow-up text</p>
            <CopyButton text={VOICEMAIL(link)} id="vm" copied={copied} setCopied={setCopied} />
          </div>
          <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{VOICEMAIL(link)}</p>
        </div>
      </section>
    </div>
  )
}

export default function PitchPage() {
  return (
    <AffiliateShell title="Pitch kit" subtitle="Ready-made messages and call scripts for reaching photographers.">
      {(a) => <PitchBody a={a} />}
    </AffiliateShell>
  )
}
