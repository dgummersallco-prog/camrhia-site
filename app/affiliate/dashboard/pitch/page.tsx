'use client'

import { useState } from 'react'
import AffiliateShell, { type ShellAffiliate } from '../../components/AffiliateShell'

type Script = { label: string; when: string; why: string; body: (link: string) => string }

const MESSAGES: Script[] = [
  {
    label: '1. The opener (no link yet)',
    when: 'First contact on Instagram, Facebook or text. Do NOT include a link. Just start the conversation.',
    why: 'A specific compliment plus an easy question gets far more replies than a link. The question makes them picture a real, painful moment.',
    body: () =>
      `Hey [Name], [something specific about their work] is gorgeous.

Quick question, no pitch: when a client says their payment "went through" and it never shows up, how long does it usually take you to catch it?`,
  },
  {
    label: '2. After they reply',
    when: 'Send once they answer your opener. This is where the link goes.',
    why: 'Mirroring their answer builds trust. You sell the feeling of the outcome, then ask for one small step (their next booking), with a free trial that removes the risk.',
    body: (link) =>
      `Ha, that's exactly why I started using Camrhia. [Repeat their answer back in one sentence.]

Now the contract, the payment schedule and the timeline all live in one shared place with the client. The Saturday before a shoot, I open one screen and I know who's paid, who's signed, and what's left to do.

It's free for 14 days. Try it on just your next booking and see how it feels: ${link}`,
  },
  {
    label: 'Friend or someone you know',
    when: 'You already have a relationship. Keep it casual and ask permission.',
    why: 'Asking permission feels respectful and lowers resistance. "Two minutes" shrinks the effort, and a personal recommendation is the strongest proof there is.',
    body: (link) =>
      `Hey [Name]! Random thought. I've been using something that's saved me a ton of back-and-forth with clients about payments, contracts and timelines. Want me to send it over? Takes two minutes to look at, and it's free for 14 days: ${link}

No pressure at all. I just know how much you've got going on.`,
  },
  {
    label: 'Follow-up (no reply yet)',
    when: 'Send once, 3 to 5 days after your last message. Then let it go.',
    why: 'Loss framing ("the last time something slipped") plus risk reversal ("the only thing you can lose is the chasing"). Giving them an easy out keeps the tone friendly.',
    body: (link) =>
      `Hey [Name], I don't want this to get buried. Think about the last time a payment or a timeline detail slipped through a text thread. That's exactly the thing Camrhia fixes.

It's free for 14 days, so the only thing you can lose is the chasing: ${link}

Totally fine if it's not for you.`,
  },
  {
    label: '"I already use something else"',
    when: 'They mention HoneyBook, a spreadsheet, or "my system works fine".',
    why: 'You never argue with their current setup. You shrink the switching cost to one session and point to the one real difference: the client works in it too.',
    body: (link) =>
      `Totally fair. If it's working, I wouldn't change it either. You don't have to switch anything, though. Run just your next session through Camrhia during the free 14 days and compare.

The thing you'll notice is that your client sees the timeline and their payments themselves, so you're not relaying everything over text: ${link}`,
  },
  {
    label: 'They asked about price',
    when: 'They are interested and ask what it costs.',
    why: 'Frames $59.99 as about $2 a day and sets it next to the cost of the problem, not next to other software. The trial still lets them decide with no risk.',
    body: (link) =>
      `Solo is $59.99/month, which works out to about $2 a day. Compare that to what one late or missed payment costs you in time and stress.

You get 14 days free first, so you can see whether it's worth it on a real booking before paying anything: ${link}`,
  },
]

const CALL_STEPS: { title: string; say: string; why: string }[] = [
  {
    title: '1. Open with permission (10 seconds)',
    say: `"Hi [Name], this is [your name]. I love your work, especially [something specific]. Did I catch you at an okay time? I'll be quick."`,
    why: 'Asking permission lowers defensiveness and makes them more likely to listen.',
  },
  {
    title: '2. Ask, then stay quiet',
    say: `"When a client says they've sent a payment and it hasn't shown up, how do you usually find out?" Then follow with: "What's the most annoying part of keeping contracts, payments and timelines straight?" Let them talk. Repeat back what you heard.`,
    why: 'People believe their own words more than yours. Their stated pain becomes the reason for the next step.',
  },
  {
    title: '3. Paint the outcome (30 seconds)',
    say: `"What I use is Camrhia. The contract, the payment schedule with reminders and the session timeline are all in one shared place with the client. So the Saturday before a shoot, you open one screen and you know who's paid, who's signed, and what's left. You're not chasing anyone."`,
    why: 'Sell the feeling of the outcome, not the feature list.',
  },
  {
    title: '4. Make the ask tiny',
    say: `"It's free for 14 days. What's your next booking? Run just that one through it and see how it feels. Can I text you the link right now?"`,
    why: 'A small, specific next step ("your next booking") beats "sign up". Sending the link during the call removes the chance they forget.',
  },
  {
    title: 'If: "I already have a system"',
    say: `"Makes sense, I wouldn't change something that works. You don't have to. Try it on one session during the free 14 days and compare. The difference you'll notice is your client is in it with you."`,
    why: 'Lowers the cost of switching to one session and keeps you from arguing.',
  },
  {
    title: 'If: "It\'s too expensive"',
    say: `"I hear you. It's about $2 a day, and the first 14 days are free. Think about what one late payment costs you in time and stress. You'll know within two weeks if it pays off."`,
    why: 'Reframes price against the cost of the problem and keeps the free trial in front of them.',
  },
  {
    title: 'If: "Just send me info"',
    say: `"Happy to. I'll text you the link now. When you've had a look, can I check in on [day] to see what you thought?"`,
    why: 'Turns a polite brush-off into a scheduled follow-up they agreed to.',
  },
]

const VOICEMAIL = (link: string) =>
  `"Hi [Name], it's [your name]. I love your work, especially [something specific]. I use an app called Camrhia that keeps contracts, payments and timelines in one shared place with clients, and I thought of you. It's free for 14 days. I'm texting you the link now. Have a great day!"

Follow-up text: Hi [Name], here's the link I mentioned. It's free for 14 days, so try it on your next booking: ${link}`

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
          It&apos;s a set of ready-made things to say, so you never start from a blank screen. Pick a message to send or a call script to follow, change anything in <span className="font-mono">[brackets]</span> to make it yours, and your referral link is already in the messages that need it.
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
              <p className="text-xs text-ink-soft mb-1">{m.when}</p>
              <p className="text-xs text-sage mb-4"><span className="font-medium">Why it works:</span> {m.why}</p>
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
              <p className="mt-1 text-xs text-sage"><span className="font-medium">Why it works:</span> {s.why}</p>
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
