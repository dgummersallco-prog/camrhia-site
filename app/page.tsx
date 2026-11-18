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
  "rounded-[1.6rem] ring-1 ring-black/10 bg-card shadow-[0_24px_50px_-22px_rgba(30,40,70,0.5)]"
const SHOT =
  "w-full rounded-2xl ring-1 ring-black/10 shadow-[0_24px_50px_-22px_rgba(30,40,70,0.4)]"
const BTN =
  "inline-flex items-center justify-center rounded-full bg-twilight px-7 py-3.5 text-sm font-semibold text-white transition hover:opacity-90"

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

function Dot() {
  return <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brass" aria-hidden />
}

function SectionHead({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <p className="text-sm font-medium uppercase tracking-wider text-brass">{eyebrow}</p>
      <h2 className="mt-3 font-fraunces text-4xl md:text-5xl font-medium text-ink leading-[1.08]">{title}</h2>
      <p className="mt-5 text-lg text-ink-soft leading-relaxed">{body}</p>
    </div>
  )
}

function Split({
  flip, title, body, items, media, tone,
}: {
  flip?: boolean
  title: string
  body: string
  items?: string[]
  media: React.ReactNode
  tone?: string
}) {
  return (
    <div className="grid items-center gap-8 md:grid-cols-2 md:gap-14">
      <div className={flip ? "md:order-2" : ""}>
        <div className={`rounded-[2rem] p-4 sm:p-6 ${tone ?? "bg-brass/10"}`}>{media}</div>
      </div>
      <div className={flip ? "md:order-1" : ""}>
        <h3 className="font-fraunces text-3xl sm:text-4xl font-semibold text-ink leading-[1.1]">{title}</h3>
        <p className="mt-4 text-lg text-ink-soft leading-relaxed">{body}</p>
        {items && items.length > 0 && (
          <ul className="mt-6 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
            {items.map((p) => (
              <li key={p} className="flex gap-3 text-[0.95rem] leading-snug text-ink">
                <Dot />
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
        @keyframes rise { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: none; } }
        .rise { animation: rise 0.8s cubic-bezier(0.2, 0.7, 0.2, 1) both; }
        @media (prefers-reduced-motion: reduce) {
          html { scroll-behavior: auto; }
          .rise { animation: none; }
        }
      `}</style>
      <Nav />
      <main>
        {/* HERO */}
        <section className="mx-auto max-w-6xl px-6 pt-10 pb-12 sm:pt-14 sm:pb-16">
          <div className="grid items-center gap-10 md:grid-cols-2 md:gap-14">
            <div>
              <p className="text-base font-medium text-brass">Meet Camri, your business assistant</p>
              <h1 className="mt-4 font-fraunces text-[2.8rem] md:text-6xl font-medium text-ink leading-[1.05]">
                Everything a photographer needs, in one place.
              </h1>
              <p className="mt-6 text-lg text-ink-soft leading-relaxed max-w-xl">
                Tired of juggling three or four systems and chasing clients? Camrhia puts it all in one place, and Camri handles the busywork.
              </p>
              <div className="mt-8">
                <a href="/try" className={BTN}>Try free for 14 days</a>
              </div>
              <p className="mt-3 text-sm text-ink-soft">No card needed. Everything is on for 14 days.</p>
            </div>
            <div className="rise rounded-[2rem] bg-brass/10 p-4 sm:p-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/shots/home.jpg" alt="The Camrhia home screen" className={SHOT} />
            </div>
          </div>
        </section>

        {/* PROOF */}
        <section className="mx-auto max-w-5xl px-6 pb-12 sm:pb-16">
          <p className="text-center text-sm font-medium uppercase tracking-wider text-brass">What photographers say when they see it</p>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {[
              ["It will be so nice to have everything in one space and not have to pay for multiple subscriptions for different things.", "Olivia"],
              ["Right now I have 3-4 systems I have to use for my workflow so it would be great to have it all in one spot.", "Mariah"],
            ].map(([q, n]) => (
              <figure key={n} className="rounded-3xl border border-line bg-card p-7">
                <blockquote className="font-fraunces text-xl leading-snug text-ink">&ldquo;{q}&rdquo;</blockquote>
                <figcaption className="mt-4 text-sm text-ink-soft">{n}, photographer</figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* PAIN */}
        <section className="border-y border-line bg-paper-deep">
          <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16 text-center">
            <h2 className="font-fraunces text-4xl md:text-5xl font-medium text-ink leading-[1.08]">
              3 or 4 systems. Endless texts. Evenings gone.
            </h2>
            <p className="mt-5 font-fraunces text-2xl text-twilight leading-snug">
              Camrhia puts it all in one place, and Camri handles the busywork.
            </p>
          </div>
        </section>

        {/* 1. BUSINESS */}
        <section id="business" className="border-y border-line bg-paper-deep">
          <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
            <SectionHead
              eyebrow="Your business"
              title="You became a photographer to shoot, not to chase."
              body="Lost emails. Unsigned contracts. A client who still has not paid. Camrhia puts every session, contract, payment and message in one place, so nothing slips and you stop feeling behind."
            />
            <div className="mt-14">
              <Split
                title="Every shoot, in one place."
                body="The Camrhia app and your desktop dashboard keep everything about every client together, from first inquiry to final gallery."
                items={[
                  "All your sessions",
                  "Packages and pricing",
                  "Questionnaires",
                  "Contracts",
                  "Payments",
                  "Gallery links",
                  "Apple and Google calendar sync",
                  "Camri, who knows who owes you",
                ]}
                media={
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src="/shots/sessions-web.jpg" alt="Sessions in Camrhia, with every step tracked" loading="lazy" className={SHOT} />
                }
              />
            </div>
            <div className="mt-14 sm:mt-20">
              <Split
                flip
                tone="bg-sage/15"
                title="No more lost emails and dead-end DMs."
                body="Your clients are tired of the back and forth too. They see their session, sign, pay and message you in one calm shared space, and work texts stop mixing in with your real life."
                items={["Contracts and questionnaires", "Payments and reminders", "Messages in one thread", "Photos delivered in the same place"]}
                media={
                  <div className="relative mx-auto aspect-square w-full max-w-md">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/shots/session.jpg" alt="A session in the Camrhia app" loading="lazy" className={`${PHONE} absolute left-[1%] top-[12%] w-[42%] -rotate-[9deg]`} />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/shots/messages.jpg" alt="Client messages in the Camrhia app" loading="lazy" className={`${PHONE} absolute left-[29%] top-[3%] z-10 w-[42%]`} />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/shots/payments.jpg" alt="Payments in the Camrhia app" loading="lazy" className={`${PHONE} absolute left-[57%] top-[12%] w-[42%] rotate-[9deg]`} />
                  </div>
                }
              />
            </div>
          </div>
        </section>

        {/* 2. MARKETING */}
        <section id="website" className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
          <SectionHead
            eyebrow="Marketing"
            title="Marketing for photographers has never been easier."
            body="Posting and hoping is exhausting. Build a website that books clients for you, and run specials without ever touching it."
          />
          <div className="mt-14">
            <Split
              title="A website that books clients for you."
              body="Camri builds it with you in an afternoon, and it goes live at your own web address."
              items={["Pick a look and your fonts", "Arrange your sections", "Add your photos", "Your own web address"]}
              media={
                // eslint-disable-next-line @next/next/no-img-element
                <img src="/shots/explore.jpg" alt="Building a website with Camri" loading="lazy" className={SHOT} />
              }
            />
          </div>
          <div className="mt-14 sm:mt-20">
            <div className="grid items-center gap-8 md:grid-cols-2 md:gap-14">
              <div>
                <h3 className="font-fraunces text-3xl sm:text-4xl font-semibold text-ink leading-[1.1]">Need to fill your calendar this month?</h3>
                <p className="mt-4 text-lg text-ink-soft leading-relaxed">
                  Run a mini session or a holiday offer on its own quick sign-up page. Your beautiful website stays exactly as it is, and clients book in a tap.
                </p>
              </div>
              <div className="rounded-[2rem] bg-brass/10 p-4 sm:p-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/shots/quickspecials.jpg" alt="Ready-made Quick Specials designs in Camrhia" loading="lazy" className={`${SHOT} mx-auto max-w-sm`} />
              </div>
            </div>

            <div className="mt-10 grid items-center gap-8 md:grid-cols-2 md:gap-14">
              <div className="rounded-[2rem] bg-brass/10 p-4 sm:p-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/shots/specials.jpg" alt="Designing your own special in Camrhia" loading="lazy" className={`${SHOT} mx-auto max-w-sm`} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  "Its own sign-up page and link",
                  "Quick Specials made in minutes",
                  "Share anywhere",
                  "Your website stays untouched",
                ].map((p) => (
                  <div key={p} className="rounded-3xl border border-line bg-card p-6">
                    <span className="block h-1 w-8 rounded-full bg-brass" aria-hidden />
                    <p className="mt-4 font-fraunces text-2xl font-semibold text-ink leading-snug">{p}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 3. EDITING ROOM TO GALLERY DELIVERY */}
        <section id="editing" className="border-y border-line bg-paper-deep">
          <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
            <SectionHead
              eyebrow="The Editing Room"
              title="Hundreds of photos. Hours of culling. Evenings gone."
              body="Camri does the slow part for you. She picks your keepers, then edits beside you in your own style, and you make every final call."
            />
            <div className="mt-14">
              <Split
                title="Use one part, or all of it."
                body="Just want your keepers picked? Cull only. Want the whole thing? Add Retouch for the full Editing Room."
                items={["Cull only", "Cull and Retouch, the full Editing Room"]}
                media={
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src="/shots/edit-room.jpg" alt="The Camrhia Editing Room" loading="lazy" className={SHOT} />
                }
              />
            </div>
            <div className="mt-14 sm:mt-20">
              <Split
                flip
                title="Stop scrolling through duplicates."
                body="Camri finds your sharpest, best-exposed keepers in minutes. Love Lightroom? Cull here, edit there."
                items={["Sharpness and exposure", "Closed eyes and smiles", "Duplicates grouped", "Nothing removed until you say so"]}
                media={
                  <div className="space-y-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/shots/edit-cull.jpg" alt="Camri ready to cull a shoot" loading="lazy" className={SHOT} />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/shots/edit-cull2.jpg" alt="Camri going through the photos" loading="lazy" className={SHOT} />
                  </div>
                }
              />
            </div>
            <div className="mt-14 sm:mt-20">
              <Split
                title="Edit like a pro, in your style."
                body="Ask how a pro would handle the light, and Camri moves the sliders when you say yes."
                items={["Edits in your own style", "Camri explains every change", "Undo anything", "Cull included"]}
                media={
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src="/shots/edit-camri.jpg" alt="Asking Camri how to edit a photo" loading="lazy" className={`${SHOT} mx-auto max-w-xs`} />
                }
              />
            </div>
            <div className="mt-14 sm:mt-20">
              <Split
                flip
                title="Deliver a gallery your clients brag about."
                body="Choose a cover photo and a style, or ask Camri to restyle it. Clients open it, heart their favorites and download everything in one tap."
                items={["Pick a cover photo", "Choose a style", "PIN-protected", "One-tap zip download"]}
                media={
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src="/shots/edit-gallery.jpg" alt="Styling a gallery with a cover photo" loading="lazy" className={SHOT} />
                }
              />
            </div>
          </div>
        </section>

        {/* OFFER STACK */}
        <section id="pricing" className="bg-gradient-to-br from-[#8C6B3F] to-[#A6824F] text-white">
          <div className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
            <div className="text-center">
              <h2 className="font-fraunces text-4xl md:text-6xl font-medium leading-[1.1]">Go all in, or keep what you want.</h2>
              <p className="mx-auto mt-5 max-w-xl text-lg text-white/80 leading-relaxed">
                Start free for 14 days, no card, and feel the difference. Then choose what to keep.
              </p>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-2">
              <div className="rounded-3xl bg-card p-7 text-ink ring-4 ring-white/30">
                <p className="text-sm font-medium uppercase tracking-wider text-brass">Everything included</p>
                <p className="mt-2 font-fraunces text-3xl font-semibold">All in</p>
                <p className="mt-3 font-fraunces text-6xl">$55<span className="text-base text-ink-soft"> /month</span></p>
                <p className="mt-1 text-sm text-ink-soft">One subscription instead of paying for several.</p>
                <ul className="mt-6 space-y-3">
                  {[
                    "The business side: app and desktop dashboard",
                    "Website, specials and gallery delivery",
                    "The full Editing Room: Cull and Retouch",
                    "Camri on every part",
                  ].map((p) => (
                    <li key={p} className="flex gap-3 leading-snug"><Dot /><span>{p}</span></li>
                  ))}
                </ul>
              </div>

              <div className="rounded-3xl bg-card p-7 text-ink">
                <p className="text-sm font-medium uppercase tracking-wider text-brass">Pick only what you need</p>
                <p className="mt-2 font-fraunces text-3xl font-semibold">Keep what you want</p>
                <div className="mt-5 divide-y divide-line">
                  <div className="flex items-start justify-between gap-4 py-4">
                    <div>
                      <p className="font-semibold">The business side</p>
                      <p className="text-sm text-ink-soft">Stop chasing, start shooting. App and desktop dashboard.</p>
                    </div>
                    <p className="shrink-0 font-fraunces text-2xl">$8.99<span className="text-sm text-ink-soft"> /mo</span></p>
                  </div>
                  <div className="flex items-start justify-between gap-4 py-4">
                    <div>
                      <p className="font-semibold">Website, specials and gallery delivery</p>
                      <p className="text-sm text-ink-soft">Get found and fill your calendar.</p>
                    </div>
                    <p className="shrink-0 font-fraunces text-2xl">$33<span className="text-sm text-ink-soft"> /mo</span></p>
                  </div>
                  <div className="py-4">
                    <p className="font-semibold">The Editing Room</p>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-start justify-between gap-4">
                        <p className="text-sm text-ink-soft">Just cull. Camri finds your keepers.</p>
                        <p className="shrink-0 font-fraunces text-2xl">$11<span className="text-sm text-ink-soft"> /mo</span></p>
                      </div>
                      <div className="flex items-start justify-between gap-4">
                        <p className="text-sm text-ink-soft">Cull and Retouch. The full Editing Room.</p>
                        <p className="shrink-0 font-fraunces text-2xl">$22<span className="text-sm text-ink-soft"> /mo</span></p>
                      </div>
                    </div>
                  </div>
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
