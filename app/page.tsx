import type { Metadata } from "next"
import { Nav, Footer } from "@/app/components/SiteChrome"
import Wordmark from "@/app/components/Wordmark"
import CamriAsk from "@/app/components/CamriAsk"

export const metadata: Metadata = {
  title: "Camrhia | Everything a photographer needs, in one place.",
  description:
    "Run your business, put up a website and specials, and cull and edit with Camri. Start with everything free for 14 days, then keep what you need.",
  openGraph: {
    title: "Camrhia | Everything a photographer needs, in one place.",
    description:
      "Sessions, contracts, payments, a website, specials, gallery delivery and AI editing. Start with everything free for 14 days.",
    type: "website",
  },
}

const PHONE =
  "rounded-[1.9rem] ring-1 ring-black/10 bg-card shadow-[0_30px_60px_-25px_rgba(30,40,70,0.55)]"
const SHOT =
  "w-full rounded-2xl ring-1 ring-black/10 shadow-[0_30px_60px_-25px_rgba(30,40,70,0.45)]"
const BTN =
  "inline-flex items-center justify-center rounded-full bg-twilight px-7 py-3.5 text-sm font-semibold text-white transition hover:opacity-90"
const BTN_LINE =
  "inline-flex items-center justify-center rounded-full border border-twilight px-7 py-3.5 text-sm font-semibold text-twilight transition hover:opacity-90"

const FAQ = [
  ["Do I need a credit card to try it?", "No. Start your 14 days with just your name and email. Everything is on. When the 14 days are up, you choose what to keep and only pay for that."],
  ["What happens when the 14 days are up?", "You choose what to keep: the business side, the website, specials and gallery delivery, the editing, or all of it. Keep everything and it is $55 a month."],
  ["I already have a website. Why Camrhia?", "Keep it. Specials are their own live pages, so you never have to change the website you worked hard on. Camrhia runs the business behind it."],
  ["I love Lightroom. Can I still use Camrhia?", "Yes. Use Camri Cull to find your best shots, then edit wherever you like."],
  ["Is it hard to set up?", "If you can post to Instagram, you can set this up. Most are live in an afternoon."],
  ["Can I cancel anytime?", "Yes. Website and editing plans cancel in Settings. App plans cancel in your Apple ID subscriptions."],
  ["Is it only for weddings?", "No. Weddings, portraits, newborns, families and events."],
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
        <h3 className="font-fraunces text-3xl sm:text-[2.4rem] font-semibold text-ink leading-[1.1] mb-4">{title}</h3>
        <p className="text-lg text-ink-soft leading-relaxed mb-5 max-w-md">{body}</p>
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

function OfferHead({
  n, label, title, body, children,
}: {
  n: string
  label: string
  title: string
  body: string
  children?: React.ReactNode
}) {
  return (
    <div className="max-w-2xl">
      <p className="text-base font-medium text-brass">{n} &middot; {label}</p>
      <h2 className="mt-3 font-fraunces text-4xl md:text-5xl font-medium text-ink leading-[1.08]">{title}</h2>
      <p className="mt-5 text-lg text-ink-soft leading-relaxed">{body}</p>
      {children}
    </div>
  )
}

function Price({ amount, note }: { amount: string; note: string }) {
  return (
    <p className="font-fraunces text-3xl text-ink">
      {amount}
      <span className="ml-1 text-base text-ink-soft">{note}</span>
    </p>
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
        <section className="mx-auto max-w-6xl px-6 pt-10 pb-12 sm:pt-14 sm:pb-16">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-base font-medium text-brass">Meet Camri, your business assistant</p>
            <h1 className="mt-4 font-fraunces text-[3rem] md:text-7xl font-medium text-ink leading-[1.05]">
              Everything a photographer needs, in one place.
            </h1>
            <p className="mt-6 text-lg text-ink-soft leading-relaxed">
              Tired of juggling seven apps and chasing clients? Camrhia puts it all in one place, and Camri handles the busywork.
            </p>
            <div className="mt-8">
              <a href="/try" className={BTN}>Try free for 14 days</a>
            </div>
            <p className="mt-3 text-sm text-ink-soft">No card needed. Everything is on for 14 days.</p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/shots/home.jpg" alt="The Camrhia home screen" className={`${SHOT} phone-rise mt-12`} />
        </section>

        {/* 1. BUSINESS */}
        <section id="business" className="border-y border-line bg-paper-deep">
          <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
            <div className="max-w-3xl">
              <p className="text-base font-medium text-brass">Your business</p>
              <h2 className="mt-3 font-fraunces text-4xl md:text-6xl font-medium text-ink leading-[1.08]">You became a photographer to shoot, not to chase.</h2>
              <p className="mt-5 text-lg text-ink-soft leading-relaxed">
                Lost emails. Unsigned contracts. A client who still has not paid. Camrhia puts every session, contract, payment and message in one place, so nothing slips and you stop feeling behind.
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["Sessions", "Know what is booked, what is next and what needs you today."],
                ["Packages and pricing", "Set them once. Quote with confidence every time."],
                ["Questionnaires and contracts", "Sent, signed and filed before you pick up your camera."],
                ["Payments", "See who has paid and who needs a nudge. Remind everyone in one tap."],
                ["Gallery links", "Deliver from here, even if your photos live somewhere else."],
                ["Your calendar", "Every session on your calendar, synced with Apple and Google."],
              ].map(([t, d]) => (
                <div key={t} className="rounded-3xl border border-line bg-card p-6">
                  <p className="font-fraunces text-xl font-semibold text-ink">{t}</p>
                  <p className="mt-2 text-ink-soft leading-relaxed">{d}</p>
                </div>
              ))}
            </div>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/shots/sessions-web.jpg" alt="Sessions in Camrhia, with every step tracked" loading="lazy" className={`${SHOT} mt-12`} />
            <p className="mt-4 text-center text-ink-soft">Ask Camri who owes you money, what is next, or if it is time to charge more.</p>

            <div className="mt-16 grid gap-10 md:grid-cols-2 md:items-center">
              <div>
                <h3 className="font-fraunces text-3xl sm:text-[2.6rem] font-semibold text-ink leading-[1.1]">No more lost emails and dead-end DMs.</h3>
                <p className="mt-4 text-lg text-ink-soft leading-relaxed">
                  Your clients are tired of the back and forth too. They see their session, sign, pay and message you in one calm shared space, and work texts stop mixing in with your real life.
                </p>
              </div>
              <div className="relative mx-auto aspect-square w-full max-w-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/shots/session.jpg" alt="A session in the Camrhia app" loading="lazy" className={`${PHONE} absolute left-[1%] top-[12%] w-[42%] -rotate-[9deg]`} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/shots/messages.jpg" alt="Client messages in the Camrhia app" loading="lazy" className={`${PHONE} absolute left-[29%] top-[3%] z-10 w-[42%]`} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/shots/payments.jpg" alt="Payments in the Camrhia app" loading="lazy" className={`${PHONE} absolute left-[57%] top-[12%] w-[42%] rotate-[9deg]`} />
              </div>
            </div>
          </div>
        </section>

        {/* 2. MARKETING */}
        <section id="website" className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
          <div className="max-w-3xl">
            <p className="text-base font-medium text-brass">Marketing</p>
            <h2 className="mt-3 font-fraunces text-4xl md:text-6xl font-medium text-ink leading-[1.08]">Marketing for photographers has never been easier.</h2>
            <p className="mt-5 text-lg text-ink-soft leading-relaxed">
              Posting and hoping is exhausting. Build a website that books clients for you. Camri sets it up with you in an afternoon, and it goes live at your own web address.
            </p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/shots/explore.jpg" alt="Building a website with Camri" loading="lazy" className={`${SHOT} mt-10`} />

          <div className="mt-16 max-w-3xl">
            <h3 className="font-fraunces text-3xl sm:text-[2.6rem] font-semibold text-ink leading-[1.1]">Need to fill your calendar this month?</h3>
            <p className="mt-4 text-lg text-ink-soft leading-relaxed">
              Run a mini session or a holiday offer on its own quick sign-up page. Your beautiful website stays exactly as it is, and clients book in a tap.
            </p>
          </div>
          <div className="mt-10 grid items-start gap-10 md:grid-cols-2">
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/shots/specials.jpg" alt="Designing a Special in Camrhia" loading="lazy" className={SHOT} />
              <p className="mt-5 font-fraunces text-2xl font-semibold text-ink">A live page for every special</p>
              <p className="mt-2 text-ink-soft leading-relaxed">Share one link. Clients see your offer, pick a time and inquire without leaving the page.</p>
            </div>
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/shots/quickspecials.jpg" alt="Quick Specials designs in Camrhia" loading="lazy" className={SHOT} />
              <p className="mt-5 font-fraunces text-2xl font-semibold text-ink">Quick Specials</p>
              <p className="mt-2 text-ink-soft leading-relaxed">Pick a design, add your details and share. Ready to post in minutes.</p>
            </div>
          </div>
        </section>

        {/* 3. EDITING ROOM TO GALLERY DELIVERY */}
        <section id="editing" className="border-y border-line bg-paper-deep">
          <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
            <div className="max-w-3xl">
              <p className="text-base font-medium text-brass">The Editing Room</p>
              <h2 className="mt-3 font-fraunces text-4xl md:text-6xl font-medium text-ink leading-[1.08]">Hundreds of photos. Hours of culling. Evenings gone.</h2>
              <p className="mt-5 text-lg text-ink-soft leading-relaxed">
                Camri does the slow part for you. She picks your keepers, then edits beside you in your own style, and you make every final call.
              </p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/shots/edit-room.jpg" alt="The Camrhia Editing Room" loading="lazy" className={`${SHOT} mt-10`} />

            <p className="mt-14 font-fraunces text-3xl font-semibold text-ink">Use one part, or all of it.</p>
            <div className="mt-6 grid gap-8 md:grid-cols-2">
              <div className="rounded-3xl border border-line bg-card p-6">
                <p className="text-sm font-medium text-brass">Just cull</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/shots/edit-cull.jpg" alt="Camri ready to cull a shoot" loading="lazy" className="mt-3 w-full rounded-2xl ring-1 ring-black/10" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/shots/edit-cull2.jpg" alt="Camri going through the photos" loading="lazy" className="mt-4 w-full rounded-2xl ring-1 ring-black/10" />
                <p className="mt-5 font-fraunces text-2xl font-semibold text-ink">Stop scrolling through duplicates.</p>
                <p className="mt-2 text-ink-soft leading-relaxed">Camri finds your sharpest, best-exposed keepers and spots closed eyes and duplicates in minutes. Love Lightroom? Cull here, edit there. Nothing is removed until you say so.</p>
              </div>
              <div className="rounded-3xl border border-line bg-card p-6">
                <p className="text-sm font-medium text-brass">Cull and Retouch, the full Editing Room</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/shots/edit-camri.jpg" alt="Asking Camri how to edit a photo" loading="lazy" className="mx-auto mt-3 w-full max-w-xs rounded-2xl ring-1 ring-black/10" />
                <p className="mt-5 font-fraunces text-2xl font-semibold text-ink">Edit like a pro, in your style.</p>
                <p className="mt-2 text-ink-soft leading-relaxed">Edit in your own style. Ask how a pro would handle the light, and Camri moves the sliders when you say yes. Undo anything.</p>
              </div>
            </div>

            <div className="mt-16 max-w-3xl">
              <h3 className="font-fraunces text-3xl sm:text-[2.6rem] font-semibold text-ink leading-[1.1]">Deliver a gallery your clients brag about.</h3>
              <p className="mt-4 text-lg text-ink-soft leading-relaxed">
                Choose a cover photo and a style, or ask Camri to restyle it. Clients open a PIN-protected gallery, heart their favorites and download everything in one tap.
              </p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/shots/edit-gallery.jpg" alt="Styling a gallery with a cover photo" loading="lazy" className={`${SHOT} mt-10`} />
          </div>
        </section>

        {/* OFFER STACK */}
        <section id="pricing" className="bg-gradient-to-br from-[#8C6B3F] to-[#A6824F] text-white">
          <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
            <div className="text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/camri/05_celebrating.png" alt="" className="mx-auto mb-4 h-28 w-auto" />
              <h2 className="font-fraunces text-4xl md:text-6xl font-medium leading-[1.1]">Go all in, or keep what you want.</h2>
              <p className="mx-auto mt-5 max-w-xl text-lg text-white/80 leading-relaxed">
                Start free for 14 days, no card, and feel the difference. Then choose what to keep.
              </p>
            </div>

            <div className="mt-10 rounded-3xl bg-card p-6 text-ink sm:p-8">
              <div className="divide-y divide-line">
                <div className="flex items-start justify-between gap-6 py-5">
                  <div>
                    <p className="font-fraunces text-2xl font-semibold">1. The business side</p>
                    <p className="mt-1 text-ink-soft">Stop chasing, start shooting. The app and desktop dashboard with sessions, packages, questionnaires, contracts, payments, gallery links and a shared space with every client.</p>
                  </div>
                  <p className="shrink-0 font-fraunces text-3xl">$8.99<span className="text-sm text-ink-soft"> /mo</span></p>
                </div>
                <div className="flex items-start justify-between gap-6 py-5">
                  <div>
                    <p className="font-fraunces text-2xl font-semibold">2. Website, specials and gallery delivery</p>
                    <p className="mt-1 text-ink-soft">Get found and fill your calendar. Your website built with Camri, specials on their own sign-up pages, and galleries with cover photos and styles.</p>
                  </div>
                  <p className="shrink-0 font-fraunces text-3xl">$33<span className="text-sm text-ink-soft"> /mo</span></p>
                </div>
                <div className="py-5">
                  <p className="font-fraunces text-2xl font-semibold">3. The Editing Room</p>
                  <div className="mt-3 space-y-3">
                    <div className="flex items-start justify-between gap-6">
                      <p className="text-ink-soft"><span className="font-semibold text-ink">Just cull.</span> Camri finds your keepers.</p>
                      <p className="shrink-0 font-fraunces text-2xl">$11<span className="text-sm text-ink-soft"> /mo</span></p>
                    </div>
                    <div className="flex items-start justify-between gap-6">
                      <p className="text-ink-soft"><span className="font-semibold text-ink">Cull and Retouch.</span> The full Editing Room, from cull to final edit.</p>
                      <p className="shrink-0 font-fraunces text-2xl">$22<span className="text-sm text-ink-soft"> /mo</span></p>
                    </div>
                  </div>
                </div>
                <div className="flex items-start justify-between gap-6 rounded-2xl bg-paper-deep px-5 py-5 -mx-1">
                  <div>
                    <p className="font-fraunces text-2xl font-semibold">All in</p>
                    <p className="mt-1 text-ink-soft">Everything a photographer needs.</p>
                  </div>
                  <p className="shrink-0 font-fraunces text-4xl">$55<span className="text-sm text-ink-soft"> /mo</span></p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col items-center gap-3">
              <a href="/try" className="inline-flex items-center justify-center rounded-full bg-white px-9 py-4 text-base font-semibold text-twilight transition hover:bg-white/90">Try free for 14 days</a>
              <p className="text-sm text-white/70">No card needed. Cancel anytime.</p>
            </div>
          </div>
        </section>

        {/* AFFILIATE */}
        <section className="bg-paper-deep border-b border-line">
          <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-8 px-6 py-12 md:flex-row md:items-center">
            <div className="max-w-xl">
              <p className="text-sm font-medium text-brass">Camrhia affiliate program</p>
              <h2 className="mt-2 font-fraunces text-3xl font-semibold leading-[1.1] text-ink md:text-4xl">
                Know photographers who would love this? Get paid to share it.
              </h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center md:flex-col md:items-stretch">
              <a href="/affiliate/signup" className={BTN}>Become an affiliate</a>
              <a href="/affiliate/login" className="text-center text-sm text-ink-soft hover:text-ink">
                Already an affiliate? Log in
              </a>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-6 py-12">
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
          <div className="mx-auto max-w-2xl px-6 py-12 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/camri/12_open_arms.png" alt="Camri" className="mx-auto mb-4 h-32 w-auto" />
            <Wordmark className="text-5xl" />
            <p className="mt-8 text-lg text-ink leading-relaxed">
              I built Camrhia so photographers can run their business with less stress. Try it for 14 days. If it
              gives you even one evening back, it was worth it.
            </p>
            <div className="mt-10">
              <a href="/try" className={BTN}>Start free for 14 days</a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <CamriAsk />
    </>
  )
}
