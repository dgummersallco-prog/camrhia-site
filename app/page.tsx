import type { Metadata } from "next"
import { Nav, Footer, AppStoreButton } from "@/app/components/SiteChrome"
import Wordmark from "@/app/components/Wordmark"
import CamriAsk from "@/app/components/CamriAsk"

export const metadata: Metadata = {
  title: "Camrhia | Become the photographer everyone is looking for.",
  description:
    "Stop juggling seven tools. Camrhia gives photographers a website built with Camri, plus booking, contracts, payments and gallery delivery. Free for 14 days.",
  openGraph: {
    title: "Camrhia | Become the photographer everyone is looking for.",
    description:
      "A website built with Camri, bookings, contracts, payments and gallery delivery. Everything your clients need, in one app.",
    type: "website",
  },
}

const NAVY = "#8C6B3F"
const PHONE =
  "rounded-[1.9rem] ring-1 ring-black/10 bg-card shadow-[0_30px_60px_-25px_rgba(30,40,70,0.55)]"

const PAINS = [
  "Instagram is the only place anyone can find your work.",
  "Clients wait for your reply and book someone else.",
  "You spend more time on admin than behind your camera.",
]

const OLD_STACK = [
  { name: "A website builder", example: "Squarespace", price: "$16 to $36" },
  { name: "Booking, contracts and invoices", example: "HoneyBook", price: "$29 to $49" },
  { name: "Gallery hosting", example: "Pixieset", price: "$10 to $20" },
  { name: "AI culling and editing", example: "Aftershoot", price: "$40 to $55" },
]

const NEW_STACK = [
  "Your own website at your own web address",
  "Camri, your assistant for the business side",
  "Bookings, contracts and payments",
  "Client messaging and your calendar",
  "Galleries and client favorites",
  "Culling and editing built in",
]

const STEPS = [
  ["Build your site with Camri", "Add your photos and packages and Camri sets it up with you. Your website goes live when you save."],
  ["Share one link", "Clients inquire, book and pay from it."],
  ["Run it from your phone", "Sessions, contracts, payments and delivery in one place."],
]

const FAQ = [
  ["Do I need a credit card to try it?", "For Showcase and Retouch, yes. You add a card to start, you are not charged for 14 days, and you can cancel anytime in Settings before then and pay nothing. The Camrhia app is free for its first 14 days through the App Store."],
  ["I already have a website. Why Camrhia?", "Keep it if you love it. Camrhia replaces the tools behind it: booking, contracts, payments, messaging and delivery."],
  ["Is it hard to set up?", "If you can post to Instagram, you can set this up. Most are live in an afternoon."],
  ["Can I cancel anytime?", "Yes. Cancel anytime in your Apple ID subscriptions."],
  ["Is it only for weddings?", "No. Weddings, portraits, newborns, families and events."],
]

const CLIENT_PERKS = [
  ["One place for everything", "Contract, payments, messages and photos in one simple app."],
  ["Photos they love opening", "A PIN gallery with hearts and one-tap downloads."],
  ["Always know what is next", "Reminders for session day and for each payment."],
  ["Reviews and rebooking", "Camrhia asks for a review and brings past clients back."],
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
        {points.length > 0 && (
          <ul className="space-y-3">
            {points.map((p) => (
              <li key={p} className="flex gap-3 text-ink text-[0.95rem] leading-snug">
                <Check />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        )}
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
            <p className="text-base font-medium text-brass">Meet Camri, your business assistant</p>
            <h1 className="mt-4 font-fraunces text-[3rem] md:text-7xl font-medium text-ink leading-[1.05]">
              Stop paying for five tools.
            </h1>
            <p className="mt-6 text-lg text-ink-soft leading-relaxed max-w-xl">
              Camrhia gives you a website built with Camri, plus contracts, payments, client messaging,
              gallery delivery and photo editing. One login. One price.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-4">
              <a href="/upgrade/showcase" className="inline-flex items-center justify-center rounded-full bg-twilight px-8 py-4 text-base font-semibold text-white transition hover:opacity-90">Build my website with Camri</a>
              <AppStoreButton label="Get the app" />
            </div>
            <p className="mt-3 text-sm text-ink-soft">14 days free. Cancel anytime.</p>
          </div>
          <Panel tone="bg-brass/15">
            <div className="absolute left-[6%] top-[9%] w-[54%] z-10 -rotate-[2deg]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/shots/sessions.jpg" alt="The Camrhia dashboard with Camri" className={`${PHONE} phone-rise block w-full`} style={{ animationDelay: "0.15s" }} />
            </div>
            <div className="absolute right-[5%] top-[22%] w-[46%] rotate-[4deg]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/shots/payments.jpg" alt="Payments in the Camrhia app" className={`${PHONE} phone-rise block w-full`} style={{ animationDelay: "0.35s" }} />
            </div>
          </Panel>
        </section>

        {/* CAMRI */}
        <section className="mx-auto max-w-6xl px-6 pb-24 sm:pb-32">
          <Story
            flip
            title="Camri runs the business side with you."
            body="Ask Camri about your sessions, payments and clients. She sees what needs attention, helps you set up your website, and guides every edit."
            points={[
              "Ask what is next on your calendar or who still owes you",
              "Camri sets up your website with you, step by step",
              "Camri Retouch edits in your style and explains every change",
            ]}
            panel={
              <Panel tone="bg-brass/15">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/shots/sessions.jpg" alt="Camri on the Camrhia dashboard" loading="lazy" className={`${PHONE} absolute left-1/2 -translate-x-1/2 top-[7%] w-[62%]`} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/camri/14_peeking_sliders.png" alt="Camri" loading="lazy" className="absolute bottom-[3%] right-[4%] w-[30%]" />
              </Panel>
            }
          />
        </section>

        {/* DESKTOP */}
        <section className="mx-auto max-w-6xl px-6 pb-24 sm:pb-32">
          <div className="max-w-2xl">
            <p className="text-base font-medium text-brass">On your phone and on your computer</p>
            <h2 className="mt-3 font-fraunces text-4xl md:text-6xl font-medium text-ink leading-[1.08]">Your whole studio, on a big screen too.</h2>
            <p className="mt-5 text-lg text-ink-soft leading-relaxed">Sessions, clients, contracts, money, your website and your galleries all live in one place you can open anywhere.</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/shots/home.jpg" alt="The Camrhia home screen" loading="lazy" className="w-full rounded-2xl ring-1 ring-black/10 shadow-[0_30px_60px_-25px_rgba(30,40,70,0.45)]" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/shots/sessions-web.jpg" alt="Sessions in Camrhia, with every step tracked" loading="lazy" className="w-full rounded-2xl ring-1 ring-black/10 shadow-[0_30px_60px_-25px_rgba(30,40,70,0.45)]" />
          </div>
        </section>

        {/* SPECIALS */}
        <section className="mx-auto max-w-6xl px-6 pb-24 sm:pb-32">
          <div className="max-w-2xl">
            <p className="text-base font-medium text-brass">Specials</p>
            <h2 className="mt-3 font-fraunces text-4xl md:text-6xl font-medium text-ink leading-[1.08]">Fill your calendar with a Special.</h2>
            <p className="mt-5 text-lg text-ink-soft leading-relaxed">Run a mini session, a holiday offer or a limited-time deal. Build it as its own live website page, or make a Quick Special in a few taps.</p>
          </div>
          <div className="mt-12 grid items-center gap-10 md:grid-cols-2">
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/shots/specials.jpg" alt="Designing a Special in Camrhia" loading="lazy" className="w-full rounded-2xl ring-1 ring-black/10 shadow-[0_30px_60px_-25px_rgba(30,40,70,0.45)]" />
              <p className="mt-5 font-fraunces text-2xl font-semibold text-ink">A live website for every Special</p>
              <p className="mt-2 text-ink-soft leading-relaxed">Share one link. Clients see your offer, pick a time and inquire without leaving the page.</p>
            </div>
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/shots/quickspecials.jpg" alt="Quick Specials designs in Camrhia" loading="lazy" className="w-full rounded-2xl ring-1 ring-black/10 shadow-[0_30px_60px_-25px_rgba(30,40,70,0.45)]" />
              <p className="mt-5 font-fraunces text-2xl font-semibold text-ink">Quick Specials</p>
              <p className="mt-2 text-ink-soft leading-relaxed">Pick a design, add your details and share. Ready to post in minutes.</p>
            </div>
          </div>
        </section>

        {/* SOUND FAMILIAR */}
        <section className="bg-paper-deep border-y border-line">
          <div className="mx-auto max-w-3xl px-6 py-20 sm:py-24">
            <div className="flex items-center gap-6">
            <h2 className="font-fraunces text-4xl md:text-6xl font-medium text-ink leading-[1.08]">Talent is not what is holding you back</h2>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/camri/04_thinking.png" alt="" className="hidden h-32 w-auto shrink-0 sm:block" />
            </div>
            <ul className="mt-9 space-y-4">
              {PAINS.map((p) => (
                <li key={p} className="flex gap-3 text-lg text-ink">
                  <span className="text-brass mt-1">&#10005;</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
            <p className="mt-10 font-fraunces text-2xl text-twilight">
              What fills a calendar is being easy to find and easy to book. Camrhia fixes that.
            </p>
          </div>
        </section>

        {/* 3 STEPS */}
        <section id="how" className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <h2 className="font-fraunces text-4xl md:text-6xl font-medium text-ink leading-[1.08]">Live in three steps</h2>
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
            title="A website that sells for you."
            body="Camri builds it with you. Pick a look, arrange your sections, add your photos, and it goes live at your own web address. Clients inquire and book without leaving the page."
            points={[
              "Fonts, colors, layouts and photos are all yours",
              "The website is included in your price",
            ]}
            panel={
              <Panel tone="bg-twilight/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/shots/explore.jpg" alt="Arranging a website with Camri" loading="lazy" className="absolute left-[4%] right-[4%] top-1/2 -translate-y-1/2 w-[92%] rounded-2xl ring-1 ring-black/10 shadow-[0_30px_60px_-25px_rgba(30,40,70,0.55)]" />
              </Panel>
            }
          />
        </section>

        {/* MESSAGES + CALENDAR */}
        <section className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <Story
            title="Your whole business in one place."
            body="Message clients and check your calendar inside the app. Work stays out of your personal texts."
            points={[]}
            panel={
              <Panel tone="bg-sage/15">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/shots/messages.jpg" alt="Client messages in Camrhia" loading="lazy" className={`${PHONE} absolute left-[7%] top-[17%] w-[47%]`} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/shots/calendar.jpg" alt="The Camrhia calendar" loading="lazy" className={`${PHONE} absolute right-[7%] top-[5%] w-[47%] z-10`} />
              </Panel>
            }
          />
          <div className="mt-24 sm:mt-32">
            <Story
              flip
              title="Know who has paid, and what is next."
              body="See what you have collected, what is coming, and who is overdue. Every session shows its time, package, contract and questionnaire in one place."
              points={[]}
              panel={
                <Panel tone="bg-brass/15">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/shots/payments.jpg" alt="Payments in Camrhia" loading="lazy" className={`${PHONE} absolute left-[7%] top-[17%] w-[47%]`} />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/shots/session.jpg" alt="A session in Camrhia" loading="lazy" className={`${PHONE} absolute right-[7%] top-[5%] w-[47%] z-10`} />
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
              <h2 className="mt-3 font-fraunces text-4xl md:text-6xl font-medium text-ink leading-[1.08]">
                Be the photographer clients never have to chase.
              </h2>
              <p className="mt-5 text-lg text-ink-soft leading-relaxed">
                Every client gets one calm place for their session. Camrhia also brings them back for the next one.
              </p>
            </div>

            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {CLIENT_PERKS.map(([t, d]) => (
                <div key={t} className="rounded-3xl border border-line bg-card p-7">
                  <p className="font-fraunces text-xl font-semibold text-ink">{t}</p>
                  <p className="mt-2 leading-relaxed text-ink-soft">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* EDITING ROOM */}
        <section className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <div className="max-w-2xl">
            <p className="text-base font-medium text-brass">The Editing Room</p>
            <h2 className="mt-3 font-fraunces text-4xl md:text-6xl font-medium text-ink leading-[1.08]">From shoot to gallery, with Camri beside you.</h2>
            <p className="mt-5 text-lg text-ink-soft leading-relaxed">Cull, edit and deliver in one place. Camri does the slow parts and you make the final calls.</p>
          </div>
          <div className="mt-12 grid gap-10 md:grid-cols-2">
            <div className="rounded-3xl border border-line bg-card p-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/shots/edit-cull.jpg" alt="Camri ready to cull a shoot" loading="lazy" className="w-full rounded-2xl ring-1 ring-black/10" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/shots/edit-cull2.jpg" alt="Camri going through the photos" loading="lazy" className="mt-4 w-full rounded-2xl ring-1 ring-black/10" />
              <p className="mt-5 font-fraunces text-2xl font-semibold text-ink">Camri finds the keepers</p>
              <p className="mt-2 text-ink-soft leading-relaxed">She checks sharpness, exposure, black frames, faces and eyes, smiles, duplicates and people. Nothing is removed until you say so.</p>
            </div>
            <div className="rounded-3xl border border-line bg-card p-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/shots/edit-camri.jpg" alt="Asking Camri how to edit a photo" loading="lazy" className="mx-auto w-full max-w-xs rounded-2xl ring-1 ring-black/10" />
              <p className="mt-5 font-fraunces text-2xl font-semibold text-ink">Edit with a pro beside you</p>
              <p className="mt-2 text-ink-soft leading-relaxed">Ask how a pro would handle the light in this photo. Camri moves the sliders when you say yes, and you can undo any change.</p>
            </div>
            <div className="rounded-3xl border border-line bg-card p-6 md:col-span-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/shots/edit-gallery.jpg" alt="Styling a gallery with Camri" loading="lazy" className="w-full rounded-2xl ring-1 ring-black/10 shadow-[0_30px_60px_-25px_rgba(30,40,70,0.45)]" />
              <p className="mt-5 font-fraunces text-2xl font-semibold text-ink">Style the gallery your clients open</p>
              <p className="mt-2 max-w-2xl text-ink-soft leading-relaxed">Pick an opening photo and a photo layout, or ask Camri to restyle it. Then deliver it in one tap.</p>
            </div>
          </div>
        </section>

        {/* DELIVERY */}
        <section className="bg-gradient-to-br from-[#8C6B3F] to-[#A6824F] text-white">
          <div className="mx-auto max-w-3xl px-6 py-24 sm:py-28 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/camri/05_celebrating.png" alt="" className="mx-auto mb-6 h-32 w-auto" />
            <h2 className="font-fraunces text-4xl md:text-6xl font-medium leading-[1.1]">
              Delivery day, without the scramble.
            </h2>
            <p className="mt-6 text-lg text-white/80 leading-relaxed">
              Drag in your shoot and publish a PIN-protected gallery. Clients heart their favorites and download it all as one zip. No digging through email.
            </p>
          </div>
        </section>

        {/* STACK */}
        <section id="compare" className="bg-ink text-white">
          <div className="mx-auto max-w-6xl px-6 py-24 sm:py-28">
            <h2 className="mx-auto max-w-3xl text-center font-fraunces text-4xl md:text-6xl font-medium leading-[1.1]">
              Stop paying for a pile of tools.
            </h2>
            <div className="mt-14 grid md:grid-cols-2 gap-6">
              <div className="rounded-3xl border border-white/15 p-8">
                <p className="text-sm text-white/55">What you pay for now</p>
                <ul className="mt-6 space-y-3">
                  {OLD_STACK.map((t) => (
                    <li key={t.name} className="text-white/70">
                      <div className="flex items-baseline justify-between gap-4 text-lg">
                        <span>{t.name}{t.example ? <span className="text-sm text-white/40"> ({t.example})</span> : null}</span>
                        <span className="whitespace-nowrap text-white/90">{t.price}</span>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 flex items-baseline justify-between border-t border-white/15 pt-4">
                  <span className="text-white/70">Total</span>
                  <span className="font-fraunces text-2xl font-semibold">$95 to $160 a month</span>
                </div>
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
                <p className="mt-8 font-fraunces text-2xl font-semibold">One app. One login.</p>
                <p className="mt-1 text-sm text-ink-soft">Plans start at $8.99 a month. Your first 14 days are free.</p>
              </div>
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className="bg-paper-deep border-y border-line">
          <div className="mx-auto max-w-5xl px-6 py-24">
            <h2 className="font-fraunces text-4xl md:text-6xl font-medium text-ink text-center">
              Simple pricing. Try it free first.
            </h2>
            <p className="mt-4 text-center text-ink-soft">
              Start with the app, then add what your business needs. Showcase and Retouch include 14 free days.
            </p>
            <div className="mt-12 grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div className="rounded-3xl bg-card border-2 border-twilight p-8">
                <p className="font-fraunces text-2xl font-semibold text-ink">Solo</p>
                <p className="mt-1 text-sm text-ink-soft">For the photographer running their own show.</p>
                <p className="mt-6 font-fraunces text-5xl text-ink">$8.99<span className="text-base text-ink-soft"> /month</span></p>
                <p className="mt-1 text-sm text-ink-soft">or $89.99 /year</p>
              </div>
              <div className="rounded-3xl bg-card border border-line p-8">
                <p className="font-fraunces text-2xl font-semibold text-ink">Studio</p>
                <p className="mt-1 text-sm text-ink-soft">For studios with a team.</p>
                <p className="mt-6 font-fraunces text-5xl text-ink">$15.99<span className="text-base text-ink-soft"> /month</span></p>
                <p className="mt-1 text-sm text-ink-soft">or $159.99 /year</p>
              </div>
            </div>
            <div className="mt-10 text-center">
              <AppStoreButton />
            </div>

            <h3 className="mt-20 font-fraunces text-3xl md:text-4xl font-medium text-ink text-center">
              Then add what you need
            </h3>
            <p className="mt-3 text-center text-ink-soft">Subscribe on camrhia.com. Cancel anytime.</p>
            <div className="mt-10 grid md:grid-cols-3 gap-6">
              <div className="flex flex-col rounded-3xl bg-card border-2 border-twilight p-8">
                <div className="flex items-center justify-between gap-3"><p className="font-fraunces text-2xl font-semibold text-ink">Camrhia Showcase</p>{/* eslint-disable-next-line @next/next/no-img-element */}
<img src="/camri/03_working_laptop.png" alt="" className="h-14 w-auto" /></div>
                <p className="mt-1 text-sm text-ink-soft">Your website, ad specials, and gallery delivery.</p>
                <p className="mt-6 font-fraunces text-5xl text-ink">$33<span className="text-base text-ink-soft"> /month</span></p>
                <p className="mt-1 text-sm text-ink-soft">or $330 /year</p>
                <ul className="mt-6 space-y-2 text-sm text-ink">
                  <li>A professional website, set up with Camri</li>
                  <li>Ad specials that sell your sessions</li>
                  <li>Custom gallery delivery with no expiration</li>
                  <li>The Camrhia app included</li>
                </ul>
                <a href="/upgrade/showcase" className="mt-8 rounded-full bg-twilight px-6 py-3 text-center text-sm font-medium text-white transition hover:opacity-90">Start 14-day free trial</a>
              </div>
              <div className="flex flex-col rounded-3xl bg-card border border-line p-8">
                <div className="flex items-center justify-between gap-3"><p className="font-fraunces text-2xl font-semibold text-ink">Camri Retouch</p>{/* eslint-disable-next-line @next/next/no-img-element */}
<img src="/camri/10_holding_sliders.png" alt="" className="h-14 w-auto" /></div>
                <p className="mt-1 text-sm text-ink-soft">AI editing with Camri beside you.</p>
                <p className="mt-6 font-fraunces text-5xl text-ink">$22<span className="text-base text-ink-soft"> /month</span></p>
                <p className="mt-1 text-sm text-ink-soft">or $220 /year</p>
                <ul className="mt-6 space-y-2 text-sm text-ink">
                  <li>AI editing in your own style</li>
                  <li>Camri guides every step and gives advice</li>
                  <li>Simple settings applied in one click</li>
                  <li>Camri Cull included</li>
                </ul>
                <a href="/upgrade/retouch" className="mt-8 rounded-full bg-twilight px-6 py-3 text-center text-sm font-medium text-white transition hover:opacity-90">Start 14-day free trial</a>
              </div>
              <div className="flex flex-col rounded-3xl bg-card border border-line p-8">
                <div className="flex items-center justify-between gap-3"><p className="font-fraunces text-2xl font-semibold text-ink">Camri Cull</p>{/* eslint-disable-next-line @next/next/no-img-element */}
<img src="/camri/09_holding_photo.png" alt="" className="h-14 w-auto" /></div>
                <p className="mt-1 text-sm text-ink-soft">Your best shots, picked for you.</p>
                <p className="mt-6 font-fraunces text-5xl text-ink">$11<span className="text-base text-ink-soft"> /month</span></p>
                <p className="mt-1 text-sm text-ink-soft">or $110 /year</p>
                <ul className="mt-6 space-y-2 text-sm text-ink">
                  <li>AI culling for every session</li>
                  <li>Start editing faster</li>
                  <li>Already included with Camri Retouch</li>
                </ul>
                <a href="/upgrade/cull" className="mt-8 rounded-full border border-twilight px-6 py-3 text-center text-sm font-medium text-twilight transition hover:opacity-90">Get Camri Cull</a>
              </div>
            </div>
          </div>
        </section>

        {/* AFFILIATE */}
        <section className="bg-gradient-to-br from-[#8C6B3F] to-[#A6824F] text-white">
          <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-8 px-6 py-16 md:flex-row md:items-center">
            <div className="max-w-xl">
              <p className="text-sm font-medium text-brass">Camrhia affiliate program</p>
              <h2 className="mt-2 font-fraunces text-3xl font-semibold leading-[1.1] md:text-4xl">
                Know photographers who would love this? Get paid to share it.
              </h2>
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/camri/12_open_arms.png" alt="Camri" className="mx-auto mb-4 h-32 w-auto" />
            <Wordmark className="text-5xl" />
            <p className="mt-8 text-lg text-ink leading-relaxed">
              I built Camrhia so photographers can run their business with less stress. Try it for 14 days. If it
              gives you even one evening back, it was worth it.
            </p>
            <div className="mt-10">
              <AppStoreButton label="Start your free 14 days" />
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <CamriAsk />
    </>
  )
}
