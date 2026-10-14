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

const NAVY = "#3A4A6B"
const PHONE =
  "rounded-[1.9rem] ring-1 ring-black/10 bg-card shadow-[0_30px_60px_-25px_rgba(30,40,70,0.55)]"

const PAINS = [
  "Your work is incredible, but Instagram is the only place anyone can find it",
  "A client reaches out and by the time you reply, they have booked someone else",
  "You spend more hours on emails, contracts and invoices than behind your camera",
  "Your best shoots sit on a hard drive while strangers hire someone else",
  "Every year you say this is the year you go all in, and every year it stays a maybe",
]

const OLD_TOOLS = [
  "A website builder",
  "A booking form",
  "Contract software",
  "An invoice app",
  "Email threads with clients",
  "A separate calendar",
  "Scattered notes and texts",
  "Gallery links lost in inboxes",
]

const NEW_STACK = [
  "A live portfolio website, at your own web address",
  "A marketplace where new clients find you",
  "Bookings and sessions, organized",
  "Contracts that fill themselves in",
  "Payments tracked and confirmed",
  "Client messaging, tied to each session",
  "Gallery links delivered right in the app",
  "Your calendar, always current",
]

const STEPS = [
  ["Download and make it yours", "Add your photos, packages and details. Your website is live the moment you save."],
  ["Share one link", "Put it in your bio, your emails, your business card. Clients inquire, book and pay."],
  ["Run everything from your phone", "Sessions, contracts, payments and delivery, handled where you already are."],
]

const FAQ = [
  ["Do I need a credit card to try it?", "Start free for 14 days. If it is not for you, you walk away. No awkward conversation."],
  ["I already have a website. Why Camrhia?", "Keep it if you love it. Camrhia replaces the pile of tools behind it: booking, contracts, payments, messaging and delivery, and gives you a portfolio that updates itself."],
  ["Is it hard to set up?", "If you can post to Instagram, you can set this up. Most photographers are live in an afternoon."],
  ["Will my clients have to figure out something new?", "They get one simple app with their session, payments, messages and photos. Fewer emails for you, less confusion for them."],
  ["Can I cancel anytime?", "Yes. Monthly plans cancel anytime through your Apple ID subscriptions."],
  ["Is it only for weddings?", "No. Weddings, portraits, newborns, families, events. Set up the session types you shoot."],
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

        {/* STACK */}
        <section id="how" className="bg-ink text-white">
          <div className="mx-auto max-w-6xl px-6 py-24 sm:py-28">
            <h2 className="mx-auto max-w-3xl text-center font-fraunces text-3xl md:text-5xl font-semibold leading-[1.1]">
              Stop paying for a pile of tools. Run your whole business from one app.
            </h2>
            <div className="mt-14 grid md:grid-cols-2 gap-6">
              <div className="rounded-3xl border border-white/15 p-8">
                <p className="text-sm text-white/55">What most photographers juggle</p>
                <ul className="mt-6 space-y-3">
                  {OLD_TOOLS.map((t) => (
                    <li key={t} className="text-lg text-white/50 line-through decoration-brass/70">{t}</li>
                  ))}
                </ul>
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
              </div>
            </div>
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

        {/* GET FOUND */}
        <section className="border-y border-line bg-paper-deep">
          <div className="mx-auto max-w-3xl px-6 py-24 sm:py-28 text-center">
            <h2 className="font-fraunces text-3xl md:text-5xl font-semibold text-ink leading-[1.1]">
              Get found by clients who are ready to book.
            </h2>
            <p className="mt-6 text-lg text-ink-soft leading-relaxed">
              Camrhia is also a marketplace. Couples browse the photographers in their area right
              inside the app, and it costs them nothing. They find your portfolio, then message you
              or send an inquiry. You show up where they are already looking, with your best work
              front and center.
            </p>
          </div>
        </section>

        {/* DELIVERY */}
        <section className="bg-twilight text-white">
          <div className="mx-auto max-w-3xl px-6 py-24 sm:py-28 text-center">
            <h2 className="font-fraunces text-3xl md:text-5xl font-semibold leading-[1.1]">
              Delivery day, without the scramble.
            </h2>
            <p className="mt-6 text-lg text-white/80 leading-relaxed">
              Keep hosting your gallery wherever you love, Pixieset, ShootProof, Google Drive,
              anywhere. Camrhia puts that link in your client&rsquo;s hands, inside the app with
              the rest of their session. No digging through email. No &ldquo;did you get my
              link?&rdquo; Just a clean, professional handoff every time.
            </p>
          </div>
        </section>

        {/* 3 STEPS */}
        <section className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
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
