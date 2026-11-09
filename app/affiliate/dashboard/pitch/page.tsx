'use client'

import { useState } from 'react'
import AffiliateShell, { type ShellAffiliate } from '../../components/AffiliateShell'

type Msg = { label: string; when: string; why: string; body: (link: string) => string }
type Group = { title: string; sub: string; tags: string[]; msgs: Msg[] }

// ── Photographers ────────────────────────────────────────────────────────────

const PHOTOG_GROUPS: Group[] = [
  {
    title: "Someone you don't know yet",
    sub: "Send these in order, like a real conversation. Wait for them to reply before you send the next one.",
    tags: ["Step 1", "Step 2", "Step 3 (only if they go quiet)"],
    msgs: [
      {
        label: "The opener (no link yet)",
        when: "Send this first as an Instagram DM, text or email. Don't add a link yet.",
        why: "A real compliment plus an easy question gets far more replies than a link. An open question lets them name their own biggest frustration, so it fits every photographer.",
        body: () =>
          `hey [Name]! came across your page and [something specific about their work] is so good.

random question, what's the most annoying part of the business side for you? contracts, getting paid, keeping clients in the loop, something else?`,
      },
      {
        label: "When they reply, send this",
        when: "Send this once they answer your opener. This is the message with your link.",
        why: "Repeating their answer shows you listened. You describe the fix in plain words, then ask for one small step (their next booking), and the free trial removes the risk.",
        body: (link) =>
          `ha yeah, same. [Repeat their answer back in one sentence.]

that's honestly why I started using Camrhia. the contract, payments and timeline are all in one spot and your client can see it too, so way less texting back and forth.

it's free for 14 days, try it on your next booking and see what you think: ${link}`,
      },
      {
        label: "If they go quiet",
        when: "Send this once, 3 to 5 days after your last message. Then let it go.",
        why: "Most people mean to reply and forget. A friendly nudge with an easy out gets answers without feeling pushy.",
        body: (link) =>
          `hey [Name], just bumping this in case it got buried. no worries at all if it's not your thing!

if keeping track of payments or paperwork ever gets annoying, here's the link. it's free for 14 days: ${link}`,
      },
    ],
  },
  {
    title: "Someone you already know",
    sub: "Skip the steps above. Send this one friendly message instead.",
    tags: ["One message"],
    msgs: [
      {
        label: "For a friend or someone you know",
        when: "Use this if you already have a relationship with them.",
        why: "A personal recommendation from someone they know is the strongest proof there is. Keeping it short and low-pressure makes it easy to say yes.",
        body: (link) =>
          `hey [Name]! I've been using this app for contracts, payments and keeping clients updated and it's been a big help. thought of you. it's free for 14 days if you wanna check it out: ${link}

no pressure at all!`,
      },
    ],
  },
  {
    title: "When they say something back",
    sub: "Use the one that matches what they said. You can send these at any point in the conversation.",
    tags: ["If they say this", "If they say this"],
    msgs: [
      {
        label: "They say: \"I already use something else\"",
        when: "They mention HoneyBook, a spreadsheet, or \"my system works fine\".",
        why: "You never argue with what they already use. You make trying it feel small (one session) and point to the one real difference: the client can see everything too.",
        body: (link) =>
          `totally get it, if it works don't mess with it!

if you ever wanna compare, you could run just one session through Camrhia during the free 14 days. the main difference is your client can see everything too, so there's less back and forth: ${link}`,
      },
      {
        label: "They ask: \"How much is it?\"",
        when: "They ask what it costs.",
        why: "Saying it as \"about $2 a day\" makes it feel small, and the free trial means they can decide with no risk.",
        body: (link) =>
          `it's $59.99 a month for Solo, so about $2 a day. you get 14 days free first, so you can try it on a real booking before you pay anything: ${link}`,
      },
    ],
  },
]

const CALL_STEPS: { title: string; say: string; why: string }[] = [
  {
    title: "Open",
    say: `"Hey [Name], it's [your name]. I really like your work, especially [something specific]. Got a minute?"`,
    why: "Asking if they have a minute is polite and makes them more likely to stay on the line.",
  },
  {
    title: "Ask, then listen",
    say: `"What's the most annoying part of the business side for you? Contracts, getting paid, keeping clients in the loop?"

Then ask: "Yeah, what happens when that goes wrong?"

Stop talking and let them answer.`,
    why: "People believe their own words more than yours. What they tell you is the reason they will care about the next part.",
  },
  {
    title: "Tell them what you use",
    say: `"So I use an app called Camrhia. The contract, payments and timeline are all in one spot, and your client can see it too. Way less chasing and texting back and forth."`,
    why: "Short and plain. They only need to hear the benefit, not a list of features.",
  },
  {
    title: "Ask for one small thing",
    say: `"It's free for 14 days. Want to try it on your next booking? I can text you the link right now."

Send the link while you're still on the phone.`,
    why: "One small, specific step is easier to say yes to than \"sign up\". Sending the link during the call means they can't forget.",
  },
]

const OBJECTIONS: { title: string; say: string }[] = [
  {
    title: "They say: \"I already have a system\"",
    say: `"Totally get it, if it works, don't change it. You could just try one session in it during the free 14 days and compare. The main thing is your client can see everything too."`,
  },
  {
    title: "They say: \"It's too expensive\"",
    say: `"I hear you. It's about $2 a day, and the first 14 days are free, so you can see if it's worth it before you pay anything."`,
  },
  {
    title: "They say: \"Just send me info\"",
    say: `"Sure thing, I'll text you the link now. Mind if I check in on [day] to see what you thought?"`,
  },
]

const VOICEMAIL = (link: string) =>
  `"Hey [Name], it's [your name]. I really like your work, especially [something specific]. I've been using an app called Camrhia for contracts, payments and client stuff and thought of you. It's free for 14 days, I'll text you the link. Talk soon!"

Follow-up text: hey [Name], here's that link I mentioned. it's free for 14 days: ${link}`

// ── Recruiting affiliates (masters only) ─────────────────────────────────────

const RECRUIT_GROUPS: Group[] = [
  {
    title: "Someone you don't know yet",
    sub: "Send these in order, like a real conversation. Wait for them to reply before you send the next one.",
    tags: ["Step 1", "Step 2", "Step 3 (only if they go quiet)"],
    msgs: [
      {
        label: "The opener (no link yet)",
        when: "Send this first as a DM, text or email. Don't add a link yet.",
        why: "It asks a simple question instead of pitching. People reply to questions much more often than they click links.",
        body: () =>
          `hey [Name]! quick question, do you know a lot of other photographers?

I'm putting together a small team of people who recommend Camrhia (the app I use for my photography business) and I think you'd be great at it.`,
      },
      {
        label: "When they reply, send this",
        when: "Send this once they answer and seem interested. This is the message with your link.",
        why: "It explains the deal in plain words, shows a real number, and makes joining feel small: no cost, and the team code is filled in for them.",
        body: (link) =>
          `awesome. here's how it works: you get your own link, and when a photographer signs up through it and subscribes, you get paid every month they stay.

it's 30% from your very first referral, with no cap. that's about $15 a month for each photographer on the Solo plan. there's no cost to join.

if you wanna join my team, sign up here and my team code gets filled in for you: ${link}`,
      },
      {
        label: "If they go quiet",
        when: "Send this once, 3 to 5 days after your last message. Then let it go.",
        why: "Most people mean to reply and forget. A friendly nudge with an easy out gets answers without feeling pushy.",
        body: (link) =>
          `hey [Name], just bumping this in case it got buried. no worries at all if it's not for you!

if you do wanna check it out, it's free to join: ${link}`,
      },
    ],
  },
  {
    title: "Someone you already know",
    sub: "Skip the steps above. Send this one friendly message instead.",
    tags: ["One message"],
    msgs: [
      {
        label: "For a friend or someone you know",
        when: "Use this if you already know them well.",
        why: "A personal ask from someone they trust is the easiest way to get a yes. Keeping it low-pressure makes it feel safe.",
        body: (link) =>
          `hey [Name]! I'm building a little team of people who recommend Camrhia to other photographers and you came to mind. you get paid every month for anyone you refer, and it's free to join. wanna take a look? ${link}

no pressure at all!`,
      },
    ],
  },
  {
    title: "When they say something back",
    sub: "Use the one that matches what they said. You can send these at any point in the conversation.",
    tags: ["If they say this", "If they say this"],
    msgs: [
      {
        label: "They ask: \"Is this a scam / MLM?\"",
        when: "They seem unsure or ask if it's legit. Stay calm and honest.",
        why: "Answering directly builds trust. You state the facts that matter: no fee, nothing to buy, no quotas, and they only earn when a referred photographer pays.",
        body: (link) =>
          `fair question. there's no fee to join, nothing to buy, and no quotas. you only get paid when a photographer you referred pays for Camrhia. that's it.

here are the details if you wanna look first: ${link}`,
      },
      {
        label: "They ask: \"How much can I make?\"",
        when: "They ask about money. Don't promise anything. Be straight.",
        why: "Honest, simple math is more believable than big promises, and it protects you from setting expectations that don't come true.",
        body: (link) =>
          `depends on how many photographers you refer. at the start it's about $10 a month for each photographer on the Solo plan, and it repeats every month they stay subscribed. so 10 photographers is around $100 a month. the rate goes up as you grow.

I can't promise how fast it'll go, that's up to you. but there's no cost to try: ${link}`,
      },
    ],
  },
]

const RECRUIT_CALL: { title: string; say: string; why: string }[] = [
  {
    title: "Open",
    say: `"Hey [Name], it's [your name]. I really like your work. Got a minute?"`,
    why: "Asking if they have a minute is polite and makes them more likely to stay on the line.",
  },
  {
    title: "Ask, then listen",
    say: `"Quick question, do you know a lot of other photographers? Are you in any groups or follow a lot of local people?"

Then ask: "Do you ever recommend tools or apps to them?"

Stop talking and let them answer.`,
    why: "You learn whether they have the reach and the interest, and their answers help you explain the opportunity in their terms.",
  },
  {
    title: "Explain it simply",
    say: `"I'm building a small team of people who recommend Camrhia. You get your own link, and when a photographer you refer subscribes, you get paid every month they stay. It's 30% from your first referral, with no cap. That's about $15 a month for each photographer on Solo. It's free to join."`,
    why: "Short and plain, with one real number. No hype.",
  },
  {
    title: "Ask for one small thing",
    say: `"Can I text you the link? When you sign up, my team code gets filled in for you. It takes about two minutes."

Send the link while you're still on the phone.`,
    why: "One small, specific step is easier to say yes to than a big decision. Sending the link during the call means they can't forget.",
  },
]

const RECRUIT_OBJECTIONS: { title: string; say: string }[] = [
  {
    title: "They say: \"Is this an MLM?\"",
    say: `"Fair question. There's no fee to join, nothing to buy, and no quotas. You only get paid when a photographer you referred pays for Camrhia."`,
  },
  {
    title: "They say: \"I don't think I'd sell anything\"",
    say: `"That's okay. It's free, so there's nothing to lose. You'd just have the link ready if it ever comes up with another photographer. No pressure."`,
  },
  {
    title: "They say: \"How much will I make?\"",
    say: `"It depends on how many photographers you refer. About $10 a month for each one on Solo, every month they stay. I can't promise how fast it grows, but there's no cost to try."`,
  },
]

// ── Shared pieces ────────────────────────────────────────────────────────────

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

type Common = {
  link: string
  fill: (t: string) => string
  copied: string | null
  setCopied: (v: string | null) => void
}

function MessageGroups({ groups, prefix, link, fill, copied, setCopied }: Common & { groups: Group[]; prefix: string }) {
  return (
    <div className="space-y-8">
      {groups.map((g, gi) => (
        <div key={g.title} className="space-y-4">
          <div>
            <h3 className="font-fraunces text-lg font-semibold text-ink">{g.title}</h3>
            <p className="text-sm text-ink-soft mt-0.5">{g.sub}</p>
          </div>
          {g.msgs.map((m, mi) => {
            const text = fill(m.body(link))
            return (
              <div key={m.label} className="rounded-2xl border border-line bg-card p-6">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="rounded-full bg-[#3A4A6B]/10 text-[#3A4A6B] px-2.5 py-0.5 text-xs font-medium">{g.tags[mi]}</span>
                  {gi === 0 && mi === 0 ? <span className="rounded-full bg-sage/15 text-sage px-2.5 py-0.5 text-xs font-medium">Start here</span> : null}
                </div>
                <p className="font-medium text-ink">{m.label}</p>
                <p className="text-sm text-ink-soft">{m.when}</p>
                <div className="mt-4 rounded-xl bg-paper border border-line p-4 text-sm text-ink leading-relaxed whitespace-pre-wrap">
                  <Highlight text={text} />
                </div>
                <div className="mt-4">
                  <CopyButton text={text} id={`${prefix}${gi}-${mi}`} copied={copied} setCopied={setCopied} />
                </div>
                <Why text={m.why} />
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function CallScript({
  steps,
  objections,
  fill,
  voicemail,
  copied,
  setCopied,
  prefix,
}: {
  steps: { title: string; say: string; why: string }[]
  objections: { title: string; say: string }[]
  fill: (t: string) => string
  voicemail?: string
  copied: string | null
  setCopied: (v: string | null) => void
  prefix: string
}) {
  return (
    <div className="space-y-4">
      {steps.map((s, i) => (
        <div key={s.title} className="rounded-2xl border border-line bg-card p-6">
          <p className="font-medium text-ink"><span className="text-[#3A4A6B]">Step {i + 1}.</span> {s.title}</p>
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
          {objections.map((o) => (
            <div key={o.title}>
              <p className="text-sm font-medium text-ink">{o.title}</p>
              <div className="mt-1.5 rounded-xl bg-paper border border-line p-4 text-sm text-ink leading-relaxed whitespace-pre-wrap">
                <Highlight text={fill(o.say)} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {voicemail ? (
        <div className="rounded-2xl border border-line bg-card p-6">
          <p className="font-medium text-ink">No answer? Leave a voicemail, then text</p>
          <div className="mt-3 rounded-xl bg-paper border border-line p-4 text-sm text-ink leading-relaxed whitespace-pre-wrap">
            <Highlight text={voicemail} />
          </div>
          <div className="mt-4">
            <CopyButton text={voicemail} id={`${prefix}vm`} copied={copied} setCopied={setCopied} />
          </div>
        </div>
      ) : null}
    </div>
  )
}

type Idea = { hook: string; value: string; end: string }
type IdeaSet = { title: string; why: string; ideas: Idea[] }

const IDEA_SETS: IdeaSet[] = [
  {
    title: "Loss Aversion",
    why: "People hate losing more than they like winning. Show what photographers are losing right now.",
    ideas: [
      { hook: "Every weekend you spend chasing a late payment is a weekend you didn't spend shooting.", value: "I stopped chasing. Camrhia keeps the contract, payments and timeline in one spot, so clients pay on time and stop texting me.", end: "Try it free for 14 days. Link in bio." },
      { hook: "A client finds you, opens a half-finished website, and leaves. You never even know.", value: "Camrhia builds a clean site from your portfolio in minutes, so your first impression works for you.", end: "Don't lose the next one. Link in bio." },
      { hook: "Your best photos are sitting on your phone doing nothing for your business.", value: "Camrhia turns them into a portfolio and site people can find you through.", end: "Put your work to work. Free for 14 days, link in bio." },
    ],
  },
  {
    title: "Social Proof",
    why: "People follow the crowd. Use real names and real results, never made-up ones.",
    ideas: [
      { hook: "[Number] photographers I know have moved their business into one app.", value: "[Name] told me she got her weekends back after putting her contracts and payments in Camrhia.", end: "See why. Free for 14 days, link in bio." },
      { hook: "I just got my first Camrhia payout.", value: "[Show a screenshot.] All I did was share a link to an app I actually use.", end: "Want to try it? Link in bio." },
      { hook: "What [Name] said after her first week on Camrhia:", value: "[Paste her real message, with her OK.]", end: "Try it free for 14 days. Link in bio." },
    ],
  },
  {
    title: "Authority",
    why: "People listen to experts. You are one, so say it up front.",
    ideas: [
      { hook: "I've shot [number] [weddings / sessions]. This is the one tool I wouldn't run my business without.", value: "Camrhia holds my contract, payments and timeline in one place.", end: "Free for 14 days. Link in bio." },
      { hook: "Here's what I tell every new photographer I mentor.", value: "[Your best tip.] And get your paperwork out of your DMs. I use Camrhia for that.", end: "Try it free. Link in bio." },
      { hook: "After [number] years of photography, this is what I'd set up first.", value: "A clean website, and contracts and payments in one app. Camrhia does both.", end: "Start free for 14 days. Link in bio." },
    ],
  },
  {
    title: "Scarcity",
    why: "Real scarcity only: a photographer's time and weekends are limited, and that is true.",
    ideas: [
      { hook: "You only get so many weekends a year.", value: "Spend them shooting, not chasing paperwork. Camrhia handles contracts, payments and client updates.", end: "Take your weekends back. Free for 14 days." },
      { hook: "Your calendar fills up. Your system shouldn't fall behind.", value: "Set up Camrhia before your busy season hits, not in the middle of it.", end: "Start your free trial today. Link in bio." },
      { hook: "Your next booking depends on how easy you are to book.", value: "A clean site and a simple contract make saying yes easy.", end: "Set it up this week. Free for 14 days." },
    ],
  },
  {
    title: "Identity",
    why: "People act like the person they see themselves as. Speak to the pro they want to be.",
    ideas: [
      { hook: "Professional photographers don't run their business out of their DMs.", value: "They have a site, a contract and a clear payment trail. Camrhia gives you all three.", end: "Run it like a pro. Link in bio." },
      { hook: "You're not a hobbyist anymore. Your business shouldn't look like one.", value: "Camrhia gives your business a real home: your site, your contracts, your payments.", end: "Free for 14 days. Link in bio." },
      { hook: "The photographers who stay booked are the organised ones.", value: "Everything for each client lives in one place, so nothing slips.", end: "Be that photographer. Try Camrhia free." },
    ],
  },
  {
    title: "Reciprocity",
    why: "Give something useful for free first. People want to give back.",
    ideas: [
      { hook: "Free tip: send your client the timeline before the day, not the morning of.", value: "I keep mine in Camrhia, so my client can check it any time.", end: "Try it free for 14 days. Link in bio." },
      { hook: "Here's my free [checklist / tip] for your next session.", value: "[Share one real tip.] I run my business on Camrhia and I'm happy to show you how.", end: "Comment 'info' and I'll send you the link." },
      { hook: "I'll help you set up your first booking, for free.", value: "Camrhia is free for 14 days, so you have nothing to lose.", end: "DM me 'setup' and we'll do it together." },
    ],
  },
  {
    title: "Framing",
    why: "The same price lands differently depending on how you say it.",
    ideas: [
      { hook: "Camrhia costs less than [one hour of your session rate].", value: "And it holds your contracts, payments and website in one place.", end: "Free for 14 days first. Link in bio." },
      { hook: "$59.99 a month is about $2 a day.", value: "For your website, contracts and payments, all in one app.", end: "Try it free for 14 days. Link in bio." },
      { hook: "It's not another app to manage.", value: "It's where your contracts, payments, timeline and website live.", end: "See it for yourself. Free for 14 days." },
    ],
  },
  {
    title: "Commitment",
    why: "A small yes comes first. Make the first step tiny and risk free.",
    ideas: [
      { hook: "Don't switch your whole business. Just try it on one booking.", value: "Run your next client through Camrhia and see the difference.", end: "Free for 14 days. Link in bio." },
      { hook: "Step one is a free 14-day trial. That's it.", value: "No big decision today. Just see if it makes your life easier.", end: "Start free. Link in bio." },
      { hook: "Want the link? Just comment 'yes'.", value: "I'll DM it to you. No pressure, and it's free for 14 days.", end: "Comment 'yes' below." },
    ],
  },
]

function IdeaBank() {
  const [copied, setCopied] = useState<string | null>(null)
  return (
    <div className="space-y-12">
      <p className="text-sm text-ink-soft max-w-2xl">
        Each card is a post you can make today. The hook is your first line, the value is the middle, the ending tells people what to do. Fill in anything{' '}
        <span className="rounded bg-brass/20 px-1 text-brass font-medium">[in brackets]</span> with something real, and only post what is true.
      </p>
      {IDEA_SETS.map((set, si) => (
        <section key={set.title} className="space-y-4">
          <div>
            <h2 className="font-fraunces text-3xl font-semibold text-ink">{set.title}</h2>
            <p className="mt-1 text-sm text-ink-soft">{set.why}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {set.ideas.map((idea, i) => {
              const id = `idea-${si}-${i}`
              const text = `${idea.hook}\n\n${idea.value}\n\n${idea.end}`
              const parts: [string, string][] = [['Hook', idea.hook], ['Value', idea.value], ['Ending', idea.end]]
              return (
                <div key={id} className="flex flex-col rounded-2xl border border-line bg-card p-5">
                  <div className="space-y-4">
                    {parts.map(([label, t]) => (
                      <div key={label}>
                        <p className="font-mono text-[10px] tracking-widest uppercase text-[#3A4A6B]">{label}</p>
                        <p className="mt-1 text-sm text-ink leading-relaxed"><Highlight text={t} /></p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-auto pt-5">
                    <CopyButton text={text} id={id} copied={copied} setCopied={setCopied} />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

function PitchBody({ a }: { a: ShellAffiliate }) {
  const [copied, setCopied] = useState<string | null>(null)
  const [theirName, setTheirName] = useState('')
  const [myName, setMyName] = useState((a.name ?? '').split(' ')[0] || '')
  const link = `https://camrhia.com/r/${a.referral_code}`
  const teamLink = `https://camrhia.com/t/${a.team_code || a.referral_code}`

  const fill = (t: string) => {
    let out = t
    if (theirName.trim()) out = out.replace(/\[Name\]/g, theirName.trim())
    if (myName.trim()) out = out.replace(/\[your name\]/g, myName.trim())
    return out
  }

  const inputCls = 'w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink'

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-line bg-card p-6">
        <h2 className="font-fraunces text-xl font-semibold text-ink">Pitch kit: what to say to photographers</h2>
        <p className="mt-1 text-sm text-ink-soft max-w-2xl">
          Ready-made messages and call scripts. Your referral link is already built in, so when a photographer signs up, you get credit.
        </p>

        <ol className="mt-5 space-y-3 text-sm text-ink">
          <li className="flex gap-3"><span className="font-semibold text-[#3A4A6B]">1.</span><span>Type the photographer&apos;s first name and your name below. We fill them in for you.</span></li>
          <li className="flex gap-3"><span className="font-semibold text-[#3A4A6B]">2.</span><span>Pick a message (or a call script), and tap <span className="font-medium">Copy message</span>.</span></li>
          <li className="flex gap-3"><span className="font-semibold text-[#3A4A6B]">3.</span><span>Paste it where you&apos;re chatting. Change anything <span className="rounded bg-brass/20 px-1 text-brass font-medium">[highlighted like this]</span>, then send.</span></li>
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
          {a.is_master ? (
            <a href="#recruit" className="rounded-full border border-brass/40 px-4 py-1.5 text-brass hover:text-ink">Recruiting affiliates</a>
          ) : null}
        </div>
        <p className="mt-4 text-xs text-ink-soft">
          Before you use these, try the free trial yourself so everything you say is true. Tell people you&apos;re a Camrhia partner, and send one follow-up, not five.
        </p>
      </section>

      <section id="messages" className="space-y-5 scroll-mt-24">
        <div>
          <h2 className="font-fraunces text-xl font-semibold text-ink">Messages</h2>
          <p className="text-sm text-ink-soft mt-0.5">For Instagram DMs, texts or email. Not sure where to start? Use Step 1 under &ldquo;Someone you don&apos;t know yet.&rdquo;</p>
        </div>
        <MessageGroups groups={PHOTOG_GROUPS} prefix="p" link={link} fill={fill} copied={copied} setCopied={setCopied} />
      </section>

      <section id="call" className="space-y-5 scroll-mt-24">
        <div>
          <h2 className="font-fraunces text-xl font-semibold text-ink">Phone call script</h2>
          <p className="text-sm text-ink-soft mt-0.5">Four steps, in order. Say it in your own words. Don&apos;t read it like a robot.</p>
        </div>
        <CallScript steps={CALL_STEPS} objections={OBJECTIONS} fill={fill} voicemail={fill(VOICEMAIL(link))} copied={copied} setCopied={setCopied} prefix="p" />
      </section>

      {a.is_master ? (
        <section id="recruit" className="space-y-6 scroll-mt-24">
          <div className="rounded-2xl border border-brass/40 bg-brass/5 p-6">
            <span className="rounded-full bg-brass/15 text-brass px-3 py-1 text-xs font-medium">Master partners only</span>
            <h2 className="mt-3 font-fraunces text-xl font-semibold text-ink">Recruiting affiliates for your team</h2>
            <p className="mt-1 text-sm text-ink-soft max-w-2xl">
              Use these to invite people to join your team. Your team link is already in them, so your team code is filled in when they sign up. The name boxes at the top work here too.
            </p>
          </div>

          <div className="space-y-5">
            <h3 className="font-fraunces text-xl font-semibold text-ink">Messages</h3>
            <MessageGroups groups={RECRUIT_GROUPS} prefix="r" link={teamLink} fill={fill} copied={copied} setCopied={setCopied} />
          </div>

          <div className="space-y-5">
            <h3 className="font-fraunces text-xl font-semibold text-ink">Phone call script</h3>
            <CallScript steps={RECRUIT_CALL} objections={RECRUIT_OBJECTIONS} fill={fill} copied={copied} setCopied={setCopied} prefix="r" />
          </div>
        </section>
      ) : null}
    </div>
  )
}

function ScriptSet({
  msgs, steps, objections, voicemail, link, fill, copied, setCopied, prefix,
}: {
  msgs: Msg[]
  steps: { title: string; say: string }[]
  objections: { title: string; say: string }[]
  voicemail?: string
  link: string
  fill: (t: string) => string
  copied: string | null
  setCopied: (v: string | null) => void
  prefix: string
}) {
  const box = 'rounded-2xl border border-line bg-card'
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {msgs.map((m, i) => {
          const text = fill(m.body(link))
          return (
            <div key={prefix + i} className={`${box} p-5 flex flex-col`}>
              <p className="font-mono text-[10px] tracking-widest uppercase text-[#3A4A6B]">{m.label}</p>
              <p className="mt-2 text-sm text-ink leading-relaxed whitespace-pre-wrap"><Highlight text={text} /></p>
              <div className="mt-auto pt-4">
                <CopyButton text={text} id={`${prefix}m${i}`} copied={copied} setCopied={setCopied} />
              </div>
            </div>
          )
        })}
      </div>
      <details className={`${box} p-5`}>
        <summary className="cursor-pointer font-medium text-ink">Phone call script</summary>
        <ol className="mt-4 space-y-3 text-sm">
          {steps.map((st, i) => (
            <li key={st.title} className="flex gap-3">
              <span className="font-semibold text-[#3A4A6B]">{i + 1}.</span>
              <span className="text-ink"><span className="font-medium">{st.title}:</span> <Highlight text={fill(st.say)} /></span>
            </li>
          ))}
        </ol>
        {voicemail ? (
          <div className="mt-4 rounded-xl bg-paper border border-line p-4 text-sm text-ink leading-relaxed whitespace-pre-wrap">
            <p className="font-mono text-[10px] tracking-widest uppercase text-[#3A4A6B] mb-1">No answer? Voicemail</p>
            <Highlight text={voicemail} />
            <div className="mt-3"><CopyButton text={voicemail} id={`${prefix}vm`} copied={copied} setCopied={setCopied} /></div>
          </div>
        ) : null}
      </details>
      <details className={`${box} p-5`}>
        <summary className="cursor-pointer font-medium text-ink">When they push back</summary>
        <div className="mt-4 grid gap-3 md:grid-cols-3 text-sm">
          {objections.map((o) => (
            <div key={o.title} className="rounded-xl bg-paper border border-line p-4">
              <p className="font-medium text-ink">{o.title}</p>
              <p className="mt-1 text-ink-soft leading-relaxed"><Highlight text={fill(o.say)} /></p>
            </div>
          ))}
        </div>
      </details>
    </div>
  )
}

function ScriptsCompact({ a }: { a: ShellAffiliate }) {
  const [copied, setCopied] = useState<string | null>(null)
  const [theirName, setTheirName] = useState('')
  const [myName, setMyName] = useState((a.name ?? '').split(' ')[0] || '')
  const link = `https://camrhia.com/r/${a.referral_code}`
  const teamLink = `https://camrhia.com/t/${a.team_code || a.referral_code}`
  const fill = (t: string) => {
    let out = t
    if (theirName.trim()) out = out.replace(/\[Name\]/g, theirName.trim())
    if (myName.trim()) out = out.replace(/\[your name\]/g, myName.trim())
    return out
  }
  const inputCls = 'w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink'
  return (
    <div className="space-y-10">
      <div className="grid sm:grid-cols-2 gap-3 max-w-xl">
        <input className={inputCls} value={theirName} onChange={(e) => setTheirName(e.target.value)} placeholder="Their first name" />
        <input className={inputCls} value={myName} onChange={(e) => setMyName(e.target.value)} placeholder="Your name" />
      </div>
      <ScriptSet
        msgs={PHOTOG_GROUPS.flatMap((g) => g.msgs)}
        steps={CALL_STEPS}
        objections={OBJECTIONS}
        voicemail={fill(VOICEMAIL(link))}
        link={link}
        fill={fill}
        copied={copied}
        setCopied={setCopied}
        prefix="p"
      />
      {a.is_master ? (
        <div className="space-y-4">
          <h2 className="font-fraunces text-2xl font-semibold text-ink">Recruiting affiliates</h2>
          <ScriptSet
            msgs={RECRUIT_GROUPS.flatMap((g) => g.msgs)}
            steps={RECRUIT_CALL}
            objections={RECRUIT_OBJECTIONS}
            link={teamLink}
            fill={fill}
            copied={copied}
            setCopied={setCopied}
            prefix="r"
          />
        </div>
      ) : null}
    </div>
  )
}

const AUTHORITY_HOOKS: string[] = [
  "I've shot [number] [weddings / sessions]. Here's the one thing I'd never run my business without again.",
  "After [number] years behind the camera, this is the part of the business nobody warns you about.",
  "Here's what I tell every photographer who asks how I stay organized.",
  "I lost [number] hours chasing payments. Here's how I stopped.",
  "The biggest mistake I made in my first year of photography:",
  "If I started my photography business over today, I'd set this up first.",
  "Most photographers I know are great at shooting and stuck on the paperwork. Here's the fix.",
  "I've worked with [number] clients. This is the question I ask every one of them before the shoot.",
  "Still running contracts through DMs? Here's the tool I'd recommend instead.",
  "After [number] bookings, here's what I've learned about getting clients to pay on time.",
  "Here's the 3-minute setup that took the stress out of my client onboarding.",
  "Every photographer has heard this one: \"Wait, what time is the shoot again?\" Here's how I stopped hearing it.",
  "I've been a photographer for [number] years. Here's why I finally stopped using spreadsheets.",
  "Nobody taught me the business side of photography. Here's what I wish I knew.",
  "This is what a professional client experience looks like, from the first message to the final gallery.",
  "Here's how I handle contracts so I never have an awkward conversation about money.",
  "Three things every photographer should have in place before their next booking.",
  "I get asked about my workflow every week. Here's the real answer.",
  "What [number] [weddings / sessions] taught me about running a calm business.",
  "If you've booked [number]+ clients, you've felt this problem.",
  "The difference between a hobby and a business isn't your camera. It's this.",
  "Here's what I check before I say yes to any new booking.",
  "I used to dread sending invoices. Here's what changed.",
  "Quick lesson from a [number]-year photographer: your website is your first impression.",
  "How you handle the first reply decides whether they book. Here's what I do.",
  "I'm [your name], a [type] photographer, and this is the system I trust with my business.",
  "The advice I give every photographer who's thinking about going full-time.",
  "Why clients trust me before we ever meet. (It's not my portfolio.)",
  "What I'd tell my younger self about contracts.",
  "I've seen what happens when photographers skip the timeline. Here's how I avoid it.",
  "A client told me \"[what they actually said].\" Here's what I do differently.",
  "Here's a behind-the-scenes look at how I run my photography business.",
  "I keep every client in the loop without a single long text thread. Here's how.",
  "What nobody tells you about busy season, and how I prepare for it.",
  "If I had to delete every app except one, this is the one I'd keep.",
  "I moved [number] things into one place. Here's what happened to my stress.",
  "The most underrated skill in photography isn't editing.",
  "Your clients judge your business in the first five minutes. Here's what they see.",
  "Photographers ask me how I stay booked. This is part of the answer.",
  "After [number] seasons, these are the habits that actually kept me sane.",
  "This is how I make sure every client knows exactly what happens next.",
  "Here's what almost burned me out, and what actually helped.",
  "If your business lives in your inbox, read this.",
  "My exact checklist from \"yes, I'll book you\" to \"here's your gallery.\"",
  "What I learned from my hardest client experience, and the system I built after.",
  "The photographers I respect most all do this one thing.",
  "Here's why I recommend Camrhia, and who it's not for.",
  "Three questions to ask yourself before your next busy season.",
  "I'm not a business guru. I'm a photographer who found a better way to run things.",
  "I've tried a lot of tools. Here's the one I actually kept using.",
]

function HookBank() {
  const [copied, setCopied] = useState<string | null>(null)
  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <div>
          <h2 className="font-fraunces text-3xl font-semibold text-ink">Authority</h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-soft">
            People listen to people who have done the thing. When your first line says what you have done or learned, they trust the rest before you say it. Fill in anything{' '}
            <span className="rounded bg-brass/20 px-1 text-brass font-medium">[in brackets]</span> with something real, and only claim experience you actually have.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {AUTHORITY_HOOKS.map((h, i) => {
            const id = `hook-${i}`
            return (
              <div key={id} className="flex flex-col rounded-2xl border border-line bg-card p-5">
                <p className="font-mono text-[10px] tracking-widest uppercase text-[#3A4A6B]">Hook {i + 1}</p>
                <p className="mt-2 text-sm leading-relaxed text-ink"><Highlight text={h} /></p>
                <div className="mt-auto pt-5">
                  <CopyButton text={h} id={id} copied={copied} setCopied={setCopied} />
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

export default function PitchPage() {
  const [view, setView] = useState<'hooks' | 'ideas' | 'scripts'>('hooks')
  const tabs: { key: 'hooks' | 'ideas' | 'scripts'; title: string; sub: string }[] = [
    { key: 'hooks', title: 'Hooks', sub: '50 first lines that make people stop and read.' },
    { key: 'ideas', title: 'Post ideas', sub: 'Full posts you can make today.' },
    { key: 'scripts', title: 'DM and call scripts', sub: 'What to say when they reply or pick up.' },
  ]
  return (
    <AffiliateShell title="Marketing HQ" subtitle="Post ideas and scripts to help you sign photographers.">
      {(a) => (
        <div className="space-y-8">
          <div className="grid gap-4 md:grid-cols-3">
            {tabs.map((t) => {
              const on = view === t.key
              return (
                <button
                  key={t.key}
                  onClick={() => setView(t.key)}
                  className={`rounded-2xl border p-7 text-left transition ${on ? 'border-[#3A4A6B] shadow-lg' : 'border-line bg-card hover:border-[#3A4A6B]'}`}
                  style={on ? { backgroundColor: '#3A4A6B', color: '#ffffff' } : undefined}
                >
                  <p className="font-fraunces text-2xl font-semibold">{t.title}</p>
                  <p className={`mt-2 text-sm ${on ? 'text-white/80' : 'text-ink-soft'}`}>{t.sub}</p>
                </button>
              )
            })}
          </div>
          {view === 'hooks' ? <HookBank /> : view === 'ideas' ? <IdeaBank /> : <ScriptsCompact a={a} />}
        </div>
      )}
    </AffiliateShell>
  )
}
