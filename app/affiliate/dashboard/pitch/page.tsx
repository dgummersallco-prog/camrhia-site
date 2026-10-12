'use client'

import { useState } from 'react'
import AffiliateShell, { type ShellAffiliate } from '../../components/AffiliateShell'

type Script = { label: string; when: string; why: string; startHere?: boolean; body: (link: string) => string }

const MESSAGES: Script[] = [
  {
    label: 'Opener (no link yet)',
    when: 'Use this first. Send it as an Instagram DM, text or email. Don\'t add a link yet.',
    why: 'A specific compliment plus an easy question gets far more replies than a link. The question makes them picture a real, painful moment.',
    startHere: true,
    body: () =>
      `Hey [Name], [something specific about their work] is gorgeous.

Quick question: when a client says their payment "went through" and it never shows up, how long does it usually take you to catch it?`,
  },
  {
    label: 'After they reply',
    when: 'Use this when they answer your opener. This is the message with your link.',
    why: 'Repeating their answer builds trust. You describe the outcome, then ask for one small step (their next booking), and the free trial removes the risk.',
    body: (link) =>
      `Ha, that's exactly why I started using Camrhia. [Repeat their answer back in one sentence.]

Now the contract, the payment schedule and the timeline all live in one shared place with the client. The Saturday before a shoot, I open one screen and I know who's paid, who's signed, and what's left to do.

It's free for 14 days. Try it on just your next booking and see how it feels: ${link}`,
  },
  {
    label: 'For a friend or someone you know',
    when: 'Use this instead of the opener if you already know them.',
    why: 'Asking permission feels respectful and lowers resistance. "Two minutes" shrinks the effort, and a personal recommendation is the strongest proof there is.',
    body: (link) =>
      `Hey [Name]! Random thought. I've been using something that's saved me a ton of back-and-forth with clients about payments, contracts and timelines. Want me to send it over? Takes two minutes to look at, and it's free for 14 days: ${link}

No pressure at all. I just know how much you've got going on.`,
  },
  {
    label: 'Follow-up (no reply yet)',
    when: 'Use this once, 3 to 5 days after your last message. Then let it go.',
    why: 'It reminds them of a real moment that slipped, and "the only thing you can lose is the chasing" removes the risk. The easy out keeps it friendly.',
    body: (link) =>
      `Hey [Name], I don't want this to get buried. Think about the last time a payment or a timeline detail slipped through a text thread. That's exactly the thing Camrhia fixes.

It's free for 14 days, so the only thing you can lose is the chasing: ${link}

Totally fine if it's not for you.`,
  },
  {
    label: 'They said "I already use something else"',
    when: 'Use this when they mention HoneyBook, a spreadsheet, or "my system works fine".',
    why: 'You never argue with their current setup. You shrink the switching cost to one session and point to the one real difference: the client works in it too.',
    body: (link) =>
      `Totally fair. If it's working, I wouldn't change it either. You don't have to switch anything, though. Run just your next session through Camrhia during the free 14 days and compare.

The thing you'll notice is that your client sees the timeline and their payments themselves, so you're not relaying everything over text: ${link}`,
  },
  {
    label: 'They asked about price',
    when: 'Use this when they ask what it costs.',
    why: 'Frames $59.99 as about $2 a day and sets it next to the cost of the problem, not next to other software. The trial still lets them decide with no risk.',
    body: (link) =>
      `Solo is $59.99/month, which works out to about $2 a day. Compare that to what one late or missed payment costs you in time and stress.

You get 14 days free first, so you can see whether it's worth it on a real booking before paying anything: ${link}`,
  },
]

const CALL_STEPS: { title: string; say: string; why: string }[] = [
  {
    title: 'Open',
    say: `"Hi [Name], this is [your name]. I love your work, especially [something specific]. Did I catch you at an okay time? I'll be quick."`,
    why: 'Asking permission lowers defensiveness and makes them more likely to listen.',
  },
  {
    title: 'Ask, then listen',
    say: `"When a client says they've sent a payment and it hasn't shown up, how do you usually find out?"

Then ask: "What's the most annoying part of keeping contracts, payments and timelines straight?"

Stop talking and let them answer. Repeat back what you heard.`,
    why: 'People believe their own words more than yours. Their stated pain becomes the reason for the next step.',
  },
  {
    title: 'Describe the outcome',
    say: `"What I use is Camrhia. The contract, the payment schedule with reminders and the session timeline are all in one shared place with the client. So the Saturday before a shoot, you open one screen and you know who's paid, who's signed, and what's left. You're not chasing anyone."`,
    why: 'Sell the feeling of the outcome, not the feature list.',
  },
  {
    title: 'Ask for one small thing',
    say: `"It's free for 14 days. What's your next booking? Run just that one through it and see how it feels. Can I text you the link right now?"

Send the link while you're still on the phone.`,
    why: 'A small, specific next step ("your next booking") beats "sign up". Sending the link during the call means they can\'t forget.',
  },
]

const OBJECTIONS: { title: string; say: string }[] = [
  {
    title: 'They say: "I already have a system"',
    say: `"Makes sense, I wouldn't change something that works. You don't have to. Try it on one session during the free 14 days and compare. The difference you'll notice is your client is in it with you."`,
  },
  {
    title: 'They say: "It\'s too expensive"',
    say: `"I hear you. It's about $2 a day, and the first 14 days are free. Think about what one late payment costs you in time and stress. You'll know within two weeks if it pays off."`,
  },
  {
    title: 'They say: "Just send me info"',
    say: `"Happy to. I'll text you the link now. When you've had a look, can I check in on [day] to see what you thought?"`,
  },
]

const VOICEMAIL = (link: string) =>
  `"Hi [Name], it's [your name]. I love your work, especially [something specific]. I use an app called Camrhia that keeps contracts, payments and timelines in one shared place with clients, and I thought of you. It's free for 14 days. I'm texting you the link now. Have a great day!"

Follow-up text: Hi [Name], here's the link I mentioned. It's free for 14 days, so try it on your next booking: ${link}`

// Highlights anything still in [brackets] so it's obvious what to personalize.
function Highlight({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\])/g)
  return (
    <>
      {parts.map((part, i) =>
        /^\[[^\]]+\]$/.test(part) ? (
          <span key={i} className="rounded bg-brass/20 px-1 text-brass font-medium">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

function CopyButton({ text, id, copied, setCopied }: { text: string; id: string; copied: string | null; setCopied: (v: string | null) => void }) {
  const isCopied = copied === id
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text)
        setCopied(id)
        setTimeout(() => setCopied(null), 2500)
      }}
      className={`rounded-full px-5 py-2 text-sm font-medium transition-colors shrink-0 ${
        isCopied ? 'bg-sage text-white' : 'bg-ink text-white hover:bg-ink/90'
      }`}
    >
      {isCopied ? 'Copied \u2713' : 'Copy message'}
    </button>
  )
}

function Why({ text }: { text: string }) {
  return (
    <details className="mt-3 text-xs text-ink-soft">
      <summary className="cursor-pointer select-none text-sage font-medium">Why this works</summary>
      <p className="mt-1.5 leading-relaxed">{text}</p>
    </details>
  )
}

function PitchBody({ a }: { a: ShellAffiliate }) {
  const [copied, setCopied] = useState<string | null>(null)
  const [theirName, setTheirName] = useState('')
  const [myName, setMyName] = useState((a.name ?? '').split(' ')[0] || '')
  const link = `https://camrhia.com/r/${a.referral_code}`

  const fill = (t: string) => {
    let out = t
    if (theirName.trim()) out = out.replace(/\[Name\]/g, theirName.trim())
    if (myName.trim()) out = out.replace(/\[your name\]/g, myName.trim())
    return out
  }

  const inputCls = 'w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink'

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-line bg-card p-6">
        <h2 className="font-fraunces text-xl font-semibold text-ink">Pitch kit: what to say to photographers</h2>
        <p className="mt-1 text-sm text-ink-soft max-w-2xl">
          Ready-made messages and call scripts. Your referral link is already built in, so when a photographer signs up, you get credit.
        </p>

        <ol className="mt-5 space-y-3 text-sm text-ink">
          <li className="flex gap-3"><span className="font-semibold text-twilight">1.</span><span>Type the photographer&apos;s first name and your name below. We fill them in for you.</span></li>
          <li className="flex gap-3"><span className="font-semibold text-twilight">2.</span><span>Pick a message (or a call script), and tap <span className="font-medium">Copy message</span>.</span></li>
          <li className="flex gap-3"><span className="font-semibold text-twilight">3.</span><span>Paste it where you&apos;re chatting. Change anything <span className="rounded bg-brass/20 px-1 text-brass font-medium">[highlighted like this]</span>, then send.</span></li>
        </ol>

        <div className="mt-5 grid sm:grid-cols-2 gap-4">
          <label className="block text-sm text-ink">
            <span className="block font-medium mb-1.5">Their first name</span>
            <input className={inputCls} value={theirName} onChange={(e) => setTheirName(e.target.value)} placeholder="e.g. Sarah" />
          </label>
          <label className="block text-sm text-ink">
            <span className="block font-medium mb-1.5">Your name</span>
            <input className={inputCls} value={myName} onChange={(e) => setMyName(e.target.value)} placeholder="e.g. Derek" />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 text-sm">
          <a href="#messages" className="rounded-full border border-line px-4 py-1.5 text-ink-soft hover:text-ink">Messages (DM, text, email)</a>
          <a href="#call" className="rounded-full border border-line px-4 py-1.5 text-ink-soft hover:text-ink">Phone call script</a>
        </div>
        <p className="mt-4 text-xs text-ink-soft">
          Two good habits: tell people you&apos;re a Camrhia partner, and send one follow-up, not five.
        </p>
      </section>

      <section id="messages" className="space-y-4 scroll-mt-24">
        <div>
          <h2 className="font-fraunces text-xl font-semibold text-ink">Messages</h2>
          <p className="text-sm text-ink-soft mt-0.5">For Instagram DMs, texts or email. Not sure where to start? Use the first one.</p>
        </div>
        {MESSAGES.map((m, i) => {
          const text = fill(m.body(link))
          return (
            <div key={m.label} className="rounded-2xl border border-line bg-card p-6">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <p className="font-medium text-ink">{m.label}</p>
                {m.startHere ? <span className="rounded-full bg-sage/15 text-sage px-2.5 py-0.5 text-xs font-medium">Start here</span> : null}
              </div>
              <p className="text-sm text-ink-soft">{m.when}</p>
              <div className="mt-4 rounded-xl bg-paper border border-line p-4 text-sm text-ink leading-relaxed whitespace-pre-wrap">
                <Highlight text={text} />
              </div>
              <div className="mt-4">
                <CopyButton text={text} id={`m${i}`} copied={copied} setCopied={setCopied} />
              </div>
              <Why text={m.why} />
            </div>
          )
        })}
      </section>

      <section id="call" className="space-y-4 scroll-mt-24">
        <div>
          <h2 className="font-fraunces text-xl font-semibold text-ink">Phone call script</h2>
          <p className="text-sm text-ink-soft mt-0.5">Four steps, in order. Say it in your own words. Don&apos;t read it like a robot.</p>
        </div>

        {CALL_STEPS.map((s, i) => (
          <div key={s.title} className="rounded-2xl border border-line bg-card p-6">
            <p className="font-medium text-ink"><span className="text-twilight">Step {i + 1}.</span> {s.title}</p>
            <p className="mt-3 text-xs uppercase tracking-widest text-ink-soft">Say this</p>
            <div className="mt-1.5 rounded-xl bg-paper border border-line p-4 text-sm text-ink leading-relaxed whitespace-pre-wrap">
              <Highlight text={fill(s.say)} />
            </div>
            <Why text={s.why} />
          </div>
        ))}

        <div className="rounded-2xl border border-line bg-card p-6">
          <p className="font-medium text-ink">If they push back</p>
          <p className="text-sm text-ink-soft">Stay calm and friendly. Use the answer that matches what they said.</p>
          <div className="mt-4 space-y-4">
            {OBJECTIONS.map((o) => (
              <div key={o.title}>
                <p className="text-sm font-medium text-ink">{o.title}</p>
                <div className="mt-1.5 rounded-xl bg-paper border border-line p-4 text-sm text-ink leading-relaxed whitespace-pre-wrap">
                  <Highlight text={fill(o.say)} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-card p-6">
          <p className="font-medium text-ink">No answer? Leave a voicemail, then text</p>
          <div className="mt-3 rounded-xl bg-paper border border-line p-4 text-sm text-ink leading-relaxed whitespace-pre-wrap">
            <Highlight text={fill(VOICEMAIL(link))} />
          </div>
          <div className="mt-4">
            <CopyButton text={fill(VOICEMAIL(link))} id="vm" copied={copied} setCopied={setCopied} />
          </div>
        </div>
      </section>
    </div>
  )
}

export default function PitchPage() {
  return (
    <AffiliateShell title="Pitch kit" subtitle="Copy, paste, send. Everything you need to talk to photographers.">
      {(a) => <PitchBody a={a} />}
    </AffiliateShell>
  )
}
