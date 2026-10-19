import type { Metadata } from "next"
import { Nav, Footer, AppStoreButton } from "@/app/components/SiteChrome"
import Wordmark from "@/app/components/Wordmark"

export const metadata: Metadata = {
  title: "Camrhia | Become the photographer everyone is looking for.",
  description:
    "Stop juggling six tools. Camrhia gives photographers a live portfolio website, a place to get found, booking, contracts, payments and gallery delivery. Free for 14 days.",
  openGraph: {
    title: "Camrhia | Become the photographer everyone is looking for.",
    description:
      "A live portfolio website, bookings, contracts, payments and gallery delivery. Everything your clients need, in one app.",
    type: "website",
  },
}

const NAVY = "#A9545F"
const PHONE =
  "rounded-[1.9rem] ring-1 ring-black/10 bg-card shadow-[0_30px_60px_-25px_rgba(30,40,70,0.55)]"

const PAINS = [
  "Your work is incredible, but Instagram is the only place anyone can find it",
  "A client reaches out and by the time you reply, they have booked someone else",
  "You spend more hours on emails, contracts and invoices than behind your camera",
  "Your best shoots sit on a hard drive while strangers hire someone else",
  "Every year you say this is the year you go all in, and every year it stays a maybe",
]

const OLD_STACK = [
  { name: "A website builder", example: "Squarespace", price: "$16 to $36", free: false, pain: "Pretty, but it has no idea who is booked." },
  { name: "Booking, contracts and invoices", example: "HoneyBook", price: "$29 to $49", free: false, pain: "One more login for you. One more link for your client." },
  { name: "Gallery hosting", example: "Pixieset", price: "$10 to $20", free: false, pain: "Delivered by a link buried in a thread." },
  { name: "Email threads with clients", example: "", price: "Free, but buried", free: true, pain: "Was it the Tuesday email or the Thursday one?" },
  { name: "A separate calendar", example: "", price: "Free, but disconnected", free: true, pain: "Double-booked, because it never saw the contract." },
  { name: "Scattered notes and texts", example: "", price: "Free, but lost", free: true, pain: "The venue address is in a text from March." },
  { name: "Gallery links lost in inboxes", example: "", price: "Free, but forgotten", free: true, pain: "Hey, can you resend our gallery? Again." },
]

const NEW_STACK = [
  "A live portfolio website, at your own web address",
  "A marketplace where new clients find you",
  "Bookings and sessions, organized",
  "Contracts that fill themselves in",
  "Payments tracked and confirmed",
  "Client messaging, tied to each session",
  "Galleries hosted and delivered, with client favorites",
  "Your calendar, always current",
]

const STEPS = [
  ["Download and make it yours", "Add your photos, packages and details. Your website is live the moment you save."],
  ["Share one link", "Put it in your bio, your emails, your business card. Clients inquire, book and pay."],
  ["Run everything from your phone", "Sessions, contracts, payments and delivery, handled where you already are."],
]

const FAQ = [
  ["Do I need a credit card to try it?", "Start free for 14 days. If it is not for you, you walk away. No awkward conversation."],
  ["I already have a website. Why Camrhia?", "Keep it if you love it. Camrhia replaces the pile of tools behind it: booking, contracts, payment tracking, messaging and delivery, and gives you a portfolio that updates itself."],
  ["Is it hard to set up?", "If you can post to Instagram, you can set this up. Most photographers are live in an afternoon."],
  ["Will my clients have to figure out something new?", "They get one simple app with their session, payments, messages and photos. Fewer emails for you, less confusion for them."],
  ["Can I cancel anytime?", "Yes. Monthly plans cancel anytime through your Apple ID subscriptions."],
  ["Is it only for weddings?", "No. Weddings, portraits, newborns, families, events. Set up the session types you shoot."],
]

const CLIENT_PERKS = [
  ["One place for everything", "Their session timeline, contract, payments, messages and photos all live in one simple app. No more digging through email."],
  ["Photos they will love opening", "A beautiful gallery with a PIN. They tap a heart on their favorites, download in one tap, and send you their picks without a single email."],
  ["Always know what is next", "Reminders for session day, what to wear, where to arrive and when the next payment is due. Fewer questions for you, less stress for them."],
  ["Payments that feel easy", "A clear schedule of what is due and when, with a friendly reminder before each date. You stop being the one who has to ask."],
  ["Reminders that bring them back", "Time for this year of family photos. Holiday photos before the calendar fills. An anniversary note. Set it once and Camrhia keeps your past clients booking."],
  ["Reviews while the joy is fresh", "A gentle nudge to leave you a review right after delivery, when they are happiest with their photos."],
]

const YEAR = [
  ["Session day", "A reminder with what to wear, where to park and when to arrive"],
  ["A week later", "Their gallery is ready, with a PIN-protected link"],
  ["After delivery", "A friendly nudge to leave you a review"],
  ["September", "Holiday photos? A nudge to book before the calendar fills"],
  ["11 months later", "Time for this year of photos, one tap to book again"],
]

function Check() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4 mt-1 shrink-0 text-sage" fill="none" aria-hidden>
      <path d="M3 10.5l4.5 4.5L17 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Panel({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <div className={`relative overflow-hidden rounded-[2.5rem] aspect-[4/5] w-full max-w-md mx-auto ${tone}`}>
      {children}
    </div>
  )
}

function Story({
  flip, title, body, points, panel,
}: {
  flip?: boolean
  title: string
  body: string
  points: string[]
  panel: React.ReactNode
}) {
  return (
    <div className="grid md:grid-cols-2 gap-10 md:gap-20 items-center">
      <div className={flip ? "md:order-2" : ""}>{panel}</div>
      <div className={flip ? "md:order-1" : ""}>
        <h3 className="font-fraunces text-3xl sm:text-[2.6rem] font-semibold text-ink leading-[1.1] mb-5">{title}</h3>
        <p className="text-lg text-ink-soft leading-relaxed mb-6 max-w-md">{body}</p>
        <ul className="space-y-3">
          {points.map((p) => (
            <li key={p} className="flex gap-3 text-ink text-[0.95rem] leading-snug">
              <Check />
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <>
      <style>{`
        html { scroll-behavior: smooth; }
        @keyframes phoneRise { from { opacity: 0; transform: translateY(36px); } to { opacity: 1; transform: none; } }
        .phone-rise { animation: phoneRise 0.9s cubic-bezier(0.2, 0.7, 0.2, 1) both; }
        @media (prefers-reduced-motion: reduce) {
          html { scroll-behavior: auto; }
          .phone-rise { animation: none; }
        }
      `}</style>
      <Nav />
      <main>
        {/* HERO */}
        <section className="mx-auto max-w-6xl px-6 pt-14 pb-24 sm:pt-20 sm:pb-28 grid md:grid-cols-2 gap-14 md:gap-16 items-center">
          <div>
            <p className="text-base font-medium text-brass">Your camera could be your whole career</p>
            <h1 className="mt-4 font-fraunces text-[2.6rem] md:text-6xl font-semibold text-ink leading-[1.05]">
              Become the photographer everyone is looking for.
            </h1>
            <p className="mt-6 text-lg text-ink-soft leading-relaxed max-w-xl">
              Your work deserves more than a hidden Instagram grid and a stack of unanswered
              messages. Camrhia gives you a website that sells for you, puts you in front of
              clients searching for a photographer, and runs the entire business from first
              hello to final photos. This is how photography stops being a side hustle and
              becomes the life you pictured when you started.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-4">
              <AppStoreButton />
              <span className="text-sm text-ink-soft">14 days free. Cancel anytime.</span>
            </div>
          </div>

          <Panel tone="bg-brass/15">
            <div className="absolute left-[6%] top-[9%] w-[54%] z-10 -rotate-[2deg]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/screens/live-portfolio.png" alt="A photographer's live portfolio website on Camrhia" className={`${PHONE} phone-rise block w-full`} style={{ animationDelay: "0.15s" }} />
            </div>
            <div className="absolute right-[5%] top-[22%] w-[46%] rotate-[4deg]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/screens/portfolio.png" alt="Customizing a portfolio in the Camrhia app" className={`${PHONE} phone-rise block w-full`} style={{ animationDelay: "0.35s" }} />
            </div>
          </Panel>
        </section>

        {/* SOUND FAMILIAR */}
        <section className="bg-paper-deep border-y border-line">
          <div className="mx-auto max-w-3xl px-6 py-20 sm:py-24">
            <h2 className="font-fraunces text-3xl md:text-5xl font-semibold text-ink leading-[1.08]">Talent is not what is holding you back</h2>
            <ul className="mt-9 space-y-4">
              {PAINS.map((p) => (
                <li key={p} className="flex gap-3 text-lg text-ink">
                  <span className="text-brass mt-1">&#10005;</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
            <p className="mt-10 font-fraunces text-2xl text-twilight">
              Being easy to find and easy to book is. That is exactly what Camrhia fixes.
            </p>
          </div>
        </section>

        {/* 3 STEPS */}
        <section id="how" className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <h2 className="font-fraunces text-3xl md:text-5xl font-semibold text-ink leading-[1.08]">Live in three steps</h2>
          <div className="mt-14 grid md:grid-cols-3 gap-12 md:gap-10">
            {STEPS.map(([t, d], i) => (
              <div key={t}>
                <p className="font-fraunces text-7xl font-semibold leading-none mb-5" style={{ color: NAVY, opacity: 0.22 }}>{i + 1}</p>
                <p className="font-fraunces text-2xl font-semibold text-ink">{t}</p>
                <p className="mt-2 text-ink-soft leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* PORTFOLIO = WEBSITE */}
        <section className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <Story
            title="Your portfolio is your website."
            body="Upload your work once and it is live at your own web address, like camrhia.com/yourstudio. Put the link in your Instagram bio, your TikTok, your email signature. Clients tap it, fall in love, and inquire without leaving the page."
            points={[
              "Pick your own fonts, color scheme and style",
              "No developer, and the website is included in your subscription",
              "Update a photo on your phone and your website updates with it",
            ]}
            panel={
              <Panel tone="bg-twilight/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/screens/portfolio.png" alt="Customizing a portfolio in the Camrhia app" loading="lazy" className={`${PHONE} absolute left-[7%] top-[17%] w-[47%]`} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/screens/live-portfolio.png" alt="The live portfolio website" loading="lazy" className={`${PHONE} absolute right-[7%] top-[5%] w-[47%] z-10`} />
              </Panel>
            }
          />
        </section>

        {/* GET FOUND */}
        <section className="border-y border-line bg-paper-deep">
          <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
            <Story
              flip
              title="Get found by clients who are ready to book."
              body="Camrhia is also a marketplace. Clients browse the photographers in their area right inside the app, and it costs them nothing. They find your portfolio, then message you or send an inquiry."
              points={[
                "Clients browse photographers in their area",
                "Free for the clients looking",
                "Your best work front and center",
              ]}
              panel={
                <Panel tone="bg-brass/20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/screens/marketplace.png" alt="Clients browsing photographer studios in the Camrhia app" loading="lazy" className={`${PHONE} absolute left-1/2 -translate-x-1/2 top-[9%] w-[64%]`} />
                </Panel>
              }
            />
          </div>
        </section>

        {/* SEE IT IN ACTION */}
        <section className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <div className="max-w-2xl mb-20 sm:mb-28">
            <h2 className="font-fraunces text-4xl md:text-5xl font-semibold text-ink leading-[1.08] mb-5">
              See it in action
            </h2>
            <p className="text-lg text-ink-soft leading-relaxed">
              This is the real app, not a mockup. Every session, date and setting, right where you need it.
            </p>
          </div>

          <div className="space-y-24 sm:space-y-36">
            <Story
              title="Your whole business in one place, away from your personal life."
              body="Message your clients and check your calendar inside the app, so work stays together and out of your personal texts. Shoots, deadlines and deliveries sit on one calendar, so nothing slips."
              points={[
                "Client messaging, tied to each session",
                "Your calendar, always current",
                "Work stays out of your personal inbox",
              ]}
              panel={
                <Panel tone="bg-sage/15">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/screens/messages.png" alt="Client messages in Camrhia" loading="lazy" className={`${PHONE} absolute left-[7%] top-[17%] w-[47%]`} />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/screens/calendar.png" alt="The Camrhia calendar" loading="lazy" className={`${PHONE} absolute right-[7%] top-[5%] w-[47%] z-10`} />
                </Panel>
              }
            />

            <Story
              flip
              title="Set your studio up once."
              body="Your studio name, your packages and your look. Manage your packages and pricing, your questionnaires and how your studio runs from one dashboard, then let it run."
              points={["Packages and pricing", "Questionnaires for your clients", "Your studio setup"]}
              panel={
                <Panel tone="bg-brass/15">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/screens/3-packages-1.png" alt="Camrhia packages" loading="lazy" className={`${PHONE} absolute left-[2%] top-[28%] w-[38%]`} />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/screens/3-packages-2.png" alt="Camrhia package details" loading="lazy" className={`${PHONE} absolute right-[2%] top-[28%] w-[38%]`} />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/screens/studio.png" alt="Camrhia studio settings" loading="lazy" className={`${PHONE} absolute left-1/2 -translate-x-1/2 top-[8%] w-[50%] z-10`} />
                </Panel>
              }
            />

            <Story
              title="Every session, and the plan for the day."
              body="Weddings, portraits, families and more. See who is booked and where each one stands, with a timeline for every session so the details of the day do not live in a text thread."
              points={["Upcoming and past sessions together", "A schedule for every session"]}
              panel={
                <Panel tone="bg-twilight/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/screens/1-sessions.png" alt="The Camrhia session list" loading="lazy" className={`${PHONE} absolute left-[7%] top-[17%] w-[47%]`} />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/screens/2-timeline.png" alt="A session timeline in Camrhia" loading="lazy" className={`${PHONE} absolute right-[7%] top-[5%] w-[47%] z-10`} />
                </Panel>
              }
            />
          </div>
        </section>

        {/* CLIENT EXPERIENCE */}
        <section id="clients" className="border-y border-line bg-paper-deep">
          <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
            <div className="max-w-2xl">
              <p className="text-base font-medium text-brass">The part your clients will tell their friends about</p>
              <h2 className="mt-3 font-fraunces text-3xl md:text-5xl font-semibold text-ink leading-[1.08]">
                Be the photographer clients never have to chase.
              </h2>
              <p className="mt-5 text-lg text-ink-soft leading-relaxed">
                Most photographers lose repeat clients to a forgotten email. Camrhia gives every
                client one calm, beautiful place for their session, and quietly brings them back
                when it is time for the next one.
              </p>
            </div>

            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {CLIENT_PERKS.map(([t, d]) => (
                <div key={t} className="rounded-3xl border border-line bg-card p-7">
                  <p className="font-fraunces text-xl font-semibold text-ink">{t}</p>
                  <p className="mt-2 leading-relaxed text-ink-soft">{d}</p>
                </div>
              ))}
            </div>

            <div className="mt-20">
              <h3 className="font-fraunces text-2xl md:text-4xl font-semibold text-ink leading-[1.1]">
                One shoot. A whole year of staying in touch.
              </h3>
              <p className="mt-3 max-w-xl text-ink-soft">
                You do the shoot. Camrhia handles the follow-up, so one booking turns into a client for life.
              </p>
              <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
                {YEAR.map(([when, what], i) => (
                  <li key={when} className="relative rounded-2xl border border-line bg-card p-5">
                    <span className="font-fraunces text-4xl font-semibold leading-none" style={{ color: NAVY, opacity: 0.22 }}>{i + 1}</span>
                    <p className="mt-3 text-sm font-semibold uppercase tracking-wider text-brass">{when}</p>
                    <p className="mt-1 text-sm leading-snug text-ink">{what}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* DELIVERY */}
        <section className="bg-twilight text-white">
          <div className="mx-auto max-w-3xl px-6 py-24 sm:py-28 text-center">
            <h2 className="font-fraunces text-3xl md:text-5xl font-semibold leading-[1.1]">
              Delivery day, without the scramble.
            </h2>
            <p className="mt-6 text-lg text-white/80 leading-relaxed">
              Drag in your whole shoot and publish a PIN-protected gallery that opens with your
              cover photo. Your clients heart their favorites and download everything as one
              zip. It lands in the same app as their contract, questionnaire and messages, so
              there is no digging through email and no &ldquo;did you get my link?&rdquo; Prefer
              another gallery host? Paste its link into the session and deliver it the same way.
            </p>
          </div>
        </section>

        {/* STACK */}
        <section id="compare" className="bg-ink text-white">
          <div className="mx-auto max-w-6xl px-6 py-24 sm:py-28">
            <h2 className="mx-auto max-w-3xl text-center font-fraunces text-3xl md:text-5xl font-semibold leading-[1.1]">
              Stop paying for a pile of tools. Run your whole business from one app.
            </h2>
            <div className="mt-14 grid md:grid-cols-2 gap-6">
              <div className="rounded-3xl border border-white/15 p-8">
                <p className="text-sm text-white/55">Your business, spread across 7 places</p>
                <ul className="mt-6 space-y-3">
                  {OLD_STACK.map((t) => (
                    <li key={t.name} className="text-white/70">
                      <div className="flex items-baseline justify-between gap-4 text-lg">
                        <span>{t.name}{t.example ? <span className="text-sm text-white/40"> ({t.example})</span> : null}</span>
                        <span className={`whitespace-nowrap ${t.free ? "text-sm text-white/40" : "text-white/90"}`}>{t.price}</span>
                      </div>
                      <p className="mt-0.5 text-sm italic text-brass/80">{t.pain}</p>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 flex items-baseline justify-between border-t border-white/15 pt-4">
                  <span className="text-white/70">Total</span>
                  <span className="font-fraunces text-2xl font-semibold">$55 to $105 a month</span>
                </div>
                <p className="mt-3 text-base text-brass">Plus every hour you spend chasing it all down.</p>
                <p className="mt-2 text-xs text-white/45">Typical published plan prices. Check each company for current pricing.</p>
              </div>
              <div className="rounded-3xl bg-card text-ink p-8 border-2 border-brass">
                <p className="text-sm text-brass font-medium">With Camrhia</p>
                <ul className="mt-6 space-y-3">
                  {NEW_STACK.map((t) => (
                    <li key={t} className="flex gap-3 text-lg">
                      <span className="text-sage font-bold">&#10003;</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-8 font-fraunces text-2xl font-semibold">One app. One login. One price.</p>
                <p className="mt-1 text-sm text-ink-soft">Plans start at $59.99 a month. Your first 14 days are free.</p>
                <p className="mt-3 text-sm text-ink-soft">Galleries are included too. Upload your photos, share a PIN-protected link, and your clients can favorite and download. No separate gallery host to pay for.</p>
              </div>
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className="bg-paper-deep border-y border-line">
          <div className="mx-auto max-w-4xl px-6 py-24">
            <h2 className="font-fraunces text-3xl md:text-5xl font-semibold text-ink text-center">
              Simple pricing. Try it free first.
            </h2>
            <p className="mt-4 text-center text-ink-soft">
              Every plan starts with 14 free days. If it is not for you, you owe nothing.
            </p>
            <div className="mt-12 grid md:grid-cols-2 gap-6">
              <div className="rounded-3xl bg-card border border-line p-8">
                <p className="font-fraunces text-2xl font-semibold text-ink">Solo</p>
                <p className="mt-1 text-sm text-ink-soft">For the photographer running their own show.</p>
                <p className="mt-6 font-fraunces text-5xl text-ink">$59.99<span className="text-base text-ink-soft"> /month</span></p>
                <p className="mt-1 text-sm text-ink-soft">or $590 /year</p>
              </div>
              <div className="rounded-3xl bg-card border-2 border-twilight p-8">
                <p className="font-fraunces text-2xl font-semibold text-ink">Studio</p>
                <p className="mt-1 text-sm text-ink-soft">For studios with a team.</p>
                <p className="mt-6 font-fraunces text-5xl text-ink">$149<span className="text-base text-ink-soft"> /month</span></p>
                <p className="mt-1 text-sm text-ink-soft">or $999.99 /year</p>
              </div>
            </div>
            <div className="mt-10 text-center">
              <AppStoreButton />
            </div>
          </div>
        </section>

        {/* AFFILIATE */}
        <section className="bg-twilight text-white">
          <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-8 px-6 py-16 md:flex-row md:items-center">
            <div className="max-w-xl">
              <p className="text-sm font-medium text-brass">Camrhia affiliate program</p>
              <h2 className="mt-2 font-fraunces text-3xl font-semibold leading-[1.1] md:text-4xl">
                Know photographers who would love this? Get paid to share it.
              </h2>
              <p className="mt-3 text-white/80 leading-relaxed">
                Get your own link, share it anywhere, and track every signup from your affiliate dashboard.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center md:flex-col md:items-stretch">
              <a
                href="/affiliate/signup"
                className="inline-flex items-center justify-center rounded-full bg-white px-8 py-4 text-base font-semibold text-twilight transition-colors hover:bg-white/90"
              >
                Become an affiliate
              </a>
              <a href="/affiliate/login" className="text-center text-sm text-white/75 hover:text-white">
                Already an affiliate? Log in
              </a>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-6 py-24">
          <h2 className="font-fraunces text-3xl md:text-4xl font-semibold text-ink text-center">Questions, answered</h2>
          <div className="mt-10 divide-y divide-line border-y border-line">
            {FAQ.map(([q, a]) => (
              <details key={q} className="py-5">
                <summary className="faq-summary cursor-pointer flex items-center justify-between gap-4">
                  <span className="faq-question-text font-fraunces text-lg font-semibold text-ink">{q}</span>
                  <span className="faq-chevron text-ink-soft">&#9662;</span>
                </summary>
                <p className="mt-3 text-ink-soft leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* FOUNDER NOTE + FINAL CTA */}
        <section className="bg-paper-deep border-t border-line">
          <div className="mx-auto max-w-2xl px-6 py-24 text-center">
            <Wordmark className="text-5xl" />
            <p className="mt-8 text-lg text-ink leading-relaxed">
              I built Camrhia because photographers deserve a calmer way to run their business.
              One place for your work, your clients and your time. Try it for 14 days. If it
              gives you even one evening back, it was worth it.
            </p>
            <div className="mt-10">
              <AppStoreButton label="Start your free 14 days" />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
