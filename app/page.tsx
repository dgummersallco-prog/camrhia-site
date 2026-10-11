import type { Metadata } from "next"
import { Nav, Footer, AppStoreButton } from "@/app/components/SiteChrome"
import Wordmark from "@/app/components/Wordmark"

export const metadata: Metadata = {
  title: "Camrhia | Become the photographer everyone is looking for.",
  description:
    "Stop juggling six tools. Camrhia gives photographers a live portfolio website, a place to get found, booking, contracts, payments and photo delivery. Free for 14 days.",
  openGraph: {
    title: "Camrhia | Become the photographer everyone is looking for.",
    description:
      "A live portfolio website, bookings, contracts, payments and photo delivery. Everything your clients need, in one app.",
    type: "website",
  },
}

const PAINS = [
  "Your work is incredible, but Instagram is the only place anyone can find it",
  "A client reaches out and by the time you reply, they have booked someone else",
  "You spend more hours on emails, contracts and invoices than behind your camera",
  "Your best shoots sit on a hard drive while strangers hire someone else",
  "Every year you say this is the year you go all in, and every year it stays a maybe",
]

const STACK = [
  ["Your own website", "A live portfolio at camrhia.com/yourstudio. Link it in your Instagram bio and you are done."],
  ["Get found", "Clients browse photographers on Camrhia and reach out to you, no ads required."],
  ["Bookings and sessions", "Packages, dates, questionnaires and every session detail in one place."],
  ["Contracts that fill themselves", "Names, dates and locations drop in automatically. Send, sign, done."],
  ["Payments you can see", "Track every payment. Clients tell you when they have paid, you confirm with one tap."],
  ["Photo delivery", "Clients get their photos right in the app. No more links that expire."],
  ["Client messaging", "Every conversation lives with the session it belongs to."],
  ["Fully yours", "Your colors, your packages, your questions, your session types."],
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

function Shot({ src, alt, width = 270 }: { src: string; alt: string; width?: number }) {
  return (
    <div className="mx-auto rounded-[2.5rem] border-[10px] border-ink bg-card shadow-2xl overflow-hidden" style={{ width }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="block w-full h-auto" />
    </div>
  )
}

function PhoneMock() {
  return <Shot src="/app/portfolio.jpg" alt="A photographer's live portfolio website on Camrhia" />
}

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        {/* HERO */}
        <section className="mx-auto max-w-6xl px-6 pt-16 pb-20 grid md:grid-cols-2 gap-14 items-center">
          <div>
            <p className="text-sm font-semibold tracking-wide text-brass uppercase">Your camera could be your whole career</p>
            <h1 className="mt-4 font-fraunces text-4xl md:text-6xl font-semibold text-ink leading-[1.08]">
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
          <PhoneMock />
        </section>

        {/* SOUND FAMILIAR */}
        <section className="bg-paper-deep border-y border-line">
          <div className="mx-auto max-w-3xl px-6 py-20">
            <h2 className="font-fraunces text-3xl md:text-4xl font-semibold text-ink">Talent is not what is holding you back</h2>
            <ul className="mt-8 space-y-4">
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
        <section className="mx-auto max-w-6xl px-6 py-24 grid md:grid-cols-2 gap-14 items-center">
          <div>
            <h2 className="font-fraunces text-3xl md:text-5xl font-semibold text-ink leading-tight">
              Your portfolio is your website.
            </h2>
            <p className="mt-6 text-lg text-ink-soft leading-relaxed">
              Upload your work once and it is live at your own web address. Put the link in your
              Instagram bio, your TikTok, your email signature. Clients tap it, fall in love,
              and inquire without leaving the page.
            </p>
            <p className="mt-4 text-lg text-ink-soft leading-relaxed">
              No developer. No monthly hosting bill for a site you never touch. Update a photo
              on your phone and your website updates with it.
            </p>
          </div>
          <div className="rounded-3xl bg-card border border-line p-8 shadow-sm">
            <p className="text-xs uppercase tracking-widest text-ink-soft">Your link</p>
            <p className="mt-2 font-fraunces text-2xl text-ink">camrhia.com/<span className="text-twilight">yourstudio</span></p>
            <div className="mt-6 flex flex-wrap gap-2 text-sm">
              {["Instagram bio", "TikTok", "Email signature", "Business card", "Facebook"].map((t) => (
                <span key={t} className="rounded-full border border-line bg-paper px-3 py-1.5 text-ink-soft">{t}</span>
              ))}
            </div>
          </div>
        </section>

        {/* STACK */}
        <section id="how" className="bg-paper-deep border-y border-line">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <h2 className="font-fraunces text-3xl md:text-5xl font-semibold text-ink max-w-3xl leading-tight">
              Everything you are paying for separately, now in one app.
            </h2>
            <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {STACK.map(([t, d]) => (
                <div key={t} className="rounded-2xl bg-card border border-line p-6">
                  <p className="font-fraunces text-xl font-semibold text-ink">{t}</p>
                  <p className="mt-2 text-sm text-ink-soft leading-relaxed">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SEE IT IN ACTION */}
        <section className="mx-auto max-w-6xl px-6 py-24">
          <h2 className="font-fraunces text-3xl md:text-5xl font-semibold text-ink text-center leading-tight">
            See it in action
          </h2>
          <p className="mt-4 text-center text-ink-soft max-w-2xl mx-auto">
            This is the real app, not a mockup. Every session, date and setting, right where you need it.
          </p>
          <div className="mt-14 grid md:grid-cols-3 gap-12">
            {[
              ["/app/sessions.jpg", "Every session, one list", "Weddings, portraits, families and more. See who is booked and where each one stands."],
              ["/app/calendar.jpg", "Your calendar, sorted", "Shoots, deadlines and deliveries on one calendar, so nothing slips."],
              ["/app/settings.jpg", "Make it yours", "Your studio name, your packages, your look. Set it once and it runs."],
            ].map(([src, title, desc]) => (
              <div key={title} className="text-center">
                <Shot src={src} alt={title} width={240} />
                <p className="mt-6 font-fraunces text-xl font-semibold text-ink">{title}</p>
                <p className="mt-2 text-sm text-ink-soft leading-relaxed max-w-xs mx-auto">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* GET FOUND */}
        <section className="mx-auto max-w-4xl px-6 py-24 text-center">
          <h2 className="font-fraunces text-3xl md:text-5xl font-semibold text-ink leading-tight">
            Get found by clients who are ready to book.
          </h2>
          <p className="mt-6 text-lg text-ink-soft leading-relaxed">
            Camrhia is also a marketplace. People looking for a photographer browse portfolios
            right inside the app, then message you or send an inquiry. You show up where
            they are already looking, with your best work front and center.
          </p>
        </section>

        {/* DELIVERY */}
        <section className="bg-twilight text-white">
          <div className="mx-auto max-w-4xl px-6 py-24 text-center">
            <h2 className="font-fraunces text-3xl md:text-5xl font-semibold leading-tight">
              Delivery day, done beautifully.
            </h2>
            <p className="mt-6 text-lg text-white/80 leading-relaxed">
              Your clients get their photos in the app they have been using the whole time.
              No expired links, no zip files, no &ldquo;can you resend that?&rdquo; They open the
              app and their memories are there.
            </p>
          </div>
        </section>

        {/* 3 STEPS */}
        <section className="mx-auto max-w-5xl px-6 py-24">
          <h2 className="font-fraunces text-3xl md:text-5xl font-semibold text-ink text-center">Live in three steps</h2>
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {STEPS.map(([t, d], i) => (
              <div key={t} className="rounded-2xl bg-card border border-line p-7">
                <p className="font-fraunces text-4xl text-brass">{i + 1}</p>
                <p className="mt-3 font-fraunces text-xl font-semibold text-ink">{t}</p>
                <p className="mt-2 text-sm text-ink-soft leading-relaxed">{d}</p>
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
