'use client'

import { useState } from 'react'
import AffiliateShell, { type ShellAffiliate } from '../../components/AffiliateShell'

type Script = { label: string; when: string; why: string; startHere?: boolean; body: (link: string) => string }

const MESSAGES: Script[] = [
  {
    label: 'Opener (no link yet)',
    when: 'Use this first. Send it as an Instagram DM, text or email. Don\'t add a link yet.',
    why: 'A real compliment plus an easy question gets far more replies than a link. An open question lets them name their own biggest frustration, so it fits every photographer.',
    startHere: true,
    body: () =>
      `hey [Name]! came across your page and [something specific about their work] is so good.

random question, what's the most annoying part of the business side for you? contracts, getting paid, keeping clients in the loop, something else?`,
  },
  {
    label: 'After they reply',
    when: 'Use this when they answer your opener. This is the message with your link.',
    why: 'Repeating their answer shows you listened. You describe the fix in plain words, then ask for one small step (their next booking), and the free trial removes the risk.',
    body: (link) =>
      `ha yeah, same. [Repeat their answer back in one sentence.]

that's honestly why I started using Camrhia. the contract, payments and timeline are all in one spot and your client can see it too, so way less texting back and forth.

it's free for 14 days, try it on your next booking and see what you think: ${link}`,
  },
  {
    label: 'For a friend or someone you know',
    when: 'Use this instead of the opener if you already know them.',
    why: 'A personal recommendation from someone they know is the strongest proof there is. Keeping it short and low-pressure makes it easy to say yes.',
    body: (link) =>
      `hey [Name]! I've been using this app for contracts, payments and keeping clients updated and it's been a big help. thought of you. it's free for 14 days if you wanna check it out: ${link}

no pressure at all!`,
  },
  {
    label: 'Follow-up (no reply yet)',
    when: 'Use this once, 3 to 5 days after your last message. Then let it go.',
    why: 'Most people mean to reply and forget. A friendly nudge with an easy out gets answers without feeling pushy.',
    body: (link) =>
      `hey [Name], just bumping this in case it got buried. no worries at all if it's not your thing!

if keeping track of payments or paperwork ever gets annoying, here's the link. it's free for 14 days: ${link}`,
  },
  {
    label: 'They said "I already use something else"',
    when: 'Use this when they mention HoneyBook, a spreadsheet, or "my system works fine".',
    why: 'You never argue with what they already use. You make trying it feel small (one session) and point to the one real difference: the client can see everything too.',
    body: (link) =>
      `totally get it, if it works don't mess with it!

if you ever wanna compare, you could run just one session through Camrhia during the free 14 days. the main difference is your client can see everything too, so there's less back and forth: ${link}`,
  },
  {
    label: 'They asked about price',
    when: 'Use this when they ask what it costs.',
    why: 'Saying it as "about $2 a day" makes it feel small, and the free trial means they can decide with no risk.',
    body: (link) =>
      `it's $59.99 a month for Solo, so about $2 a day. you get 14 days free first, so you can try it on a real booking before you pay anything: ${link}`,
  },
]

const CALL_STEPS: { title: string; say: string; why: string }[] = [
  {
    title: 'Open',
    say: `"Hey [Name], it's [your name]. I really like your work, especially [something specific]. Got a minute?"`,
    why: 'Asking if they have a minute is polite and makes them more likely to stay on the line.',
  },
  {
    title: 'Ask, then listen',
    say: `"What's the most annoying part of the business side for you? Contracts, getting paid, keeping clients in the loop?"

Then ask: "Yeah, what happens when that goes wrong?"

Stop talking and let them answer.`,
    why: 'People believe their own words more than yours. What they tell you is the reason they will care about the next part.',
  },
  {
    title: 'Tell them what you use',
    say: `"So I use an app called Camrhia. The contract, payments and timeline are all in one spot, and your client can see it too. Way less chasing and texting back and forth."`,
    why: 'Short and plain. They only need to hear the benefit, not a list of features.',
  },
  {
    title: 'Ask for one small thing',
    say: `"It's free for 14 days. Want to try it on your next booking? I can text you the link right now."

Send the link while you're still on the phone.`,
    why: 'One small, specific step is easier to say yes to than "sign up". Sending the link during the call means they can\'t forget.',
  },
]

const OBJECTIONS: { title: string; say: string }[] = [
  {
    title: 'They say: "I already have a system"',
    say: `"Totally get it, if it works, don't change it. You could just try one session in it during the free 14 days and compare. The main thing is your client can see everything too."`,
  },
  {
    title: 'They say: "It\'s too expensive"',
    say: `"I hear you. It's about $2 a day, and the first 14 days are free, so you can see if it's worth it before you pay anything."`,
  },
  {
    title: 'They say: "Just send me info"',
    say: `"Sure thing, I'll text you the link now. Mind if I check in on [day] to see what you thought?"`,
  },
]

const VOICEMAIL = (link: string) =>
  `"Hey [Name], it's [your name]. I really like your work, especially [something specific]. I've been using an app called Camrhia for contracts, payments and client stuff and thought of you. It's free for 14 days, I'll text you the link. Talk soon!"

Follow-up text: hey [Name], here's that link I mentioned. it's free for 14 days: ${link}`

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
          Before you use these, try the free trial yourself so everything you say is true. Tell people you&apos;re a Camrhia partner, and send one follow-up, not five.
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
