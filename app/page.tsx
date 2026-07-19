import Link from "next/link"
import { BRAND_NAME } from "@/lib/brand"

// ── Nav ──────────────────────────────────────────────────────────────────────

function Nav() {
  return (
    <nav className="sticky top-0 z-50 bg-paper border-b border-line">
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between gap-6">
        <span className="font-fraunces text-xl font-semibold text-ink tracking-tight">
          {BRAND_NAME}
        </span>

        <div className="hidden md:flex items-center gap-7 text-sm font-medium text-ink-soft">
          <Link href="#photographers" className="hover:text-ink transition-colors">
            For photographers
          </Link>
          <Link href="#couples" className="hover:text-ink transition-colors">
            For couples
          </Link>
          <Link href="/support" className="hover:text-ink transition-colors">
            Support
          </Link>
          <Link href="/login" className="hover:text-ink transition-colors">
            Log in
          </Link>
        </div>

        <a
          href="mailto:hello@camrhia.com?subject=Early access"
          className="inline-flex items-center rounded-full bg-twilight px-4 py-2 text-sm font-semibold text-white hover:bg-twilight/90 transition-colors"
        >
          Get early access
        </a>
      </div>
    </nav>
  )
}

// ── Timeline SVG ──────────────────────────────────────────────────────────────

function TimelineCard() {
  return (
    <div className="w-full max-w-3xl mx-auto rounded-2xl bg-card border border-line shadow-sm overflow-hidden">
      <div className="px-8 pt-8 pb-2">
        <p className="font-mono text-xs tracking-widest uppercase text-ink-soft mb-1">
          Your shared timeline
        </p>
        <p className="font-fraunces text-lg text-ink">
          Built together, visible to both.
        </p>
      </div>

      <div className="px-4 pb-2">
        <svg
          viewBox="0 0 700 240"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full"
          aria-label="Wedding day timeline arc with four key moments"
        >
          {/* Arc path */}
          <path
            d="M 70 155 C 200 80 450 80 630 155"
            stroke="#DAD2C2"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Dot 1 – Prep / Getting ready – 9:30am – twilight */}
          <circle cx="70" cy="155" r="6" fill="#3A4A6B" />
          <text
            x="70"
            y="178"
            textAnchor="middle"
            style={{ fontFamily: "var(--ff-fraunces), serif", fontSize: 13, fontStyle: "italic", fill: "#3A4A6B" }}
          >
            Prep
          </text>
          <text
            x="70"
            y="194"
            textAnchor="middle"
            style={{ fontFamily: "var(--ff-instrument-sans), sans-serif", fontSize: 10.5, fill: "#6B7280" }}
          >
            Getting ready
          </text>
          <text
            x="70"
            y="208"
            textAnchor="middle"
            style={{ fontFamily: "var(--ff-jetbrains-mono), monospace", fontSize: 10, fill: "#A9853F" }}
          >
            9:30am
          </text>

          {/* Dot 2 – Ceremony / First look – 1:00pm – twilight */}
          <circle cx="198" cy="111" r="6" fill="#3A4A6B" />
          <text
            x="198"
            y="97"
            textAnchor="middle"
            style={{ fontFamily: "var(--ff-fraunces), serif", fontSize: 13, fontStyle: "italic", fill: "#3A4A6B" }}
          >
            Ceremony
          </text>
          <text
            x="198"
            y="81"
            textAnchor="middle"
            style={{ fontFamily: "var(--ff-instrument-sans), sans-serif", fontSize: 10.5, fill: "#6B7280" }}
          >
            First look
          </text>
          <text
            x="198"
            y="67"
            textAnchor="middle"
            style={{ fontFamily: "var(--ff-jetbrains-mono), monospace", fontSize: 10, fill: "#A9853F" }}
          >
            1:00pm
          </text>

          {/* Dot 3 – Peak / Golden hour – 6:45pm – brass (highlighted) */}
          <circle cx="460" cy="109" r="18" fill="#A9853F" fillOpacity="0.1" />
          <circle cx="460" cy="109" r="10" fill="#A9853F" />
          <circle cx="460" cy="109" r="5" fill="#C9A55F" />
          <text
            x="460"
            y="90"
            textAnchor="middle"
            style={{ fontFamily: "var(--ff-fraunces), serif", fontSize: 14, fontStyle: "italic", fontWeight: 500, fill: "#A9853F" }}
          >
            Peak
          </text>
          <text
            x="460"
            y="74"
            textAnchor="middle"
            style={{ fontFamily: "var(--ff-instrument-sans), sans-serif", fontSize: 10.5, fill: "#A9853F" }}
          >
            Golden hour
          </text>
          <text
            x="460"
            y="60"
            textAnchor="middle"
            style={{ fontFamily: "var(--ff-jetbrains-mono), monospace", fontSize: 10, fill: "#A9853F" }}
          >
            6:45pm
          </text>

          {/* Dot 4 – Send-off / Last dance – 10:30pm – twilight */}
          <circle cx="630" cy="155" r="6" fill="#3A4A6B" />
          <text
            x="630"
            y="178"
            textAnchor="middle"
            style={{ fontFamily: "var(--ff-fraunces), serif", fontSize: 13, fontStyle: "italic", fill: "#3A4A6B" }}
          >
            Send-off
          </text>
          <text
            x="630"
            y="194"
            textAnchor="middle"
            style={{ fontFamily: "var(--ff-instrument-sans), sans-serif", fontSize: 10.5, fill: "#6B7280" }}
          >
            Last dance
          </text>
          <text
            x="630"
            y="208"
            textAnchor="middle"
            style={{ fontFamily: "var(--ff-jetbrains-mono), monospace", fontSize: 10, fill: "#A9853F" }}
          >
            10:30pm
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 px-8 pb-7">
        <div className="flex items-center gap-2 text-xs text-ink-soft">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-twilight shrink-0" />
          Edited by the photographer
        </div>
        <div className="flex items-center gap-2 text-xs text-ink-soft">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-brass shrink-0" />
          Edited by the couple
        </div>
      </div>
    </div>
  )
}

// ── Feature lists ─────────────────────────────────────────────────────────────

const photographerFeatures = [
  "Inquiry-to-booking messaging in one place",
  "Contracts that send and sign themselves",
  "Auto-built payment schedules — no chasing",
  "One shared calendar for every event",
  "A public profile with reviews from past couples",
]

const coupleFeatures = [
  "A shared timeline you build with your photographer",
  "Clear payment status — always know what's due",
  "Sign contracts and fill questionnaires from your phone",
  "Direct messaging with your photographer",
  "Your gallery delivered in-app when it's ready",
]

// ── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="bg-paper-deep border-t border-line">
      {/* Main footer row */}
      <div className="mx-auto max-w-6xl px-6 pt-10 pb-6 flex flex-col md:flex-row md:items-start justify-between gap-10">
        <span className="font-fraunces text-lg font-semibold text-ink shrink-0">
          {BRAND_NAME}
        </span>

        <nav className="flex flex-wrap gap-x-12 gap-y-6 text-sm">
          {/* Legal */}
          <div>
            <p className="font-mono text-xs tracking-widest uppercase text-ink-soft/50 mb-2.5">
              Legal
            </p>
            <ul className="space-y-2">
              <li><Link href="/privacy" className="text-ink-soft hover:text-ink transition-colors">Privacy</Link></li>
              <li><Link href="/terms" className="text-ink-soft hover:text-ink transition-colors">Terms</Link></li>
            </ul>
          </div>

          {/* Help */}
          <div>
            <p className="font-mono text-xs tracking-widest uppercase text-ink-soft/50 mb-2.5">
              Help
            </p>
            <ul className="space-y-2">
              <li><Link href="/support" className="text-ink-soft hover:text-ink transition-colors">Support</Link></li>
              <li><a href="mailto:hello@camrhia.com" className="text-ink-soft hover:text-ink transition-colors">Contact</a></li>
            </ul>
          </div>

          {/* Partners */}
          <div>
            <p className="font-mono text-xs tracking-widest uppercase text-ink-soft/50 mb-2.5">
              Partners
            </p>
            <ul className="space-y-2">
              <li><Link href="/affiliate/signup" className="text-ink-soft hover:text-ink transition-colors">Become an affiliate</Link></li>
              <li><Link href="/affiliate/login" className="text-ink-soft hover:text-ink transition-colors">Affiliate login</Link></li>
            </ul>
          </div>
        </nav>
      </div>

      {/* Bottom bar */}
      <div className="mx-auto max-w-6xl px-6 pb-8 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-line pt-4">
        <p className="text-xs text-ink-soft">
          © {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.
        </p>
        <Link
          href="/admin/login"
          className="text-xs text-ink-soft/30 hover:text-ink-soft transition-colors"
        >
          Admin
        </Link>
      </div>
    </footer>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

const steps = [
  {
    n: "1",
    title: "Book the wedding",
    body: "Message, send your packages, confirm the booking. Their details carry over automatically — nothing typed twice.",
  },
  {
    n: "2",
    title: "Build the day, together",
    body: "One shared timeline. Either of you can edit it; both of you approve it before it's final.",
  },
  {
    n: "3",
    title: "Get paid. Get reviewed. Get referred.",
    body: "Payment reminders send themselves. A finished wedding becomes a five-star review — and your next booking.",
  },
]

const painPoints = [
  "The couple doesn't know if their retainer actually went through.",
  "The timeline lives in three different text threads — and none of them agree.",
  "The contract's signed... somewhere. Nobody's totally sure where.",
]

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-paper">
      <Nav />

      <main>

        {/* ── 1. Hero ───────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-6 pt-20 pb-16 text-center">
          <p className="font-mono text-xs tracking-widest uppercase text-brass mb-5">
            Now in early access
          </p>
          <h1 className="font-fraunces text-5xl md:text-6xl lg:text-7xl font-semibold text-ink leading-tight tracking-tight mb-6">
            The wedding day,{" "}
            <em className="not-italic italic text-twilight">planned together.</em>
          </h1>
          <p className="text-base md:text-lg text-ink-soft max-w-2xl mx-auto leading-relaxed mb-10">
            Wedding photographers juggle five apps to run one wedding. Couples
            are stuck guessing what&apos;s actually been done. Camrhia is the one
            place you both actually open.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="mailto:hello@camrhia.com?subject=Early access"
              className="inline-flex items-center rounded-full bg-twilight px-6 py-3 text-sm font-semibold text-white hover:bg-twilight/90 transition-colors"
            >
              Get early access →
            </a>
            <Link
              href="/login"
              className="inline-flex items-center rounded-full border border-twilight px-6 py-3 text-sm font-semibold text-twilight hover:bg-twilight/5 transition-colors"
            >
              I&apos;m a photographer
            </Link>
          </div>
        </section>

        {/* ── 2. The problem ────────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-6 pb-20">
          <div className="text-center mb-10">
            <p className="font-mono text-xs tracking-widest uppercase text-brass mb-4">
              Sound familiar?
            </p>
            <h2 className="font-fraunces text-3xl md:text-4xl font-semibold text-ink max-w-2xl mx-auto leading-snug">
              Somewhere between the inquiry and the wedding day, everyone loses
              the thread.
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {painPoints.map((pain) => (
              <div key={pain} className="rounded-2xl bg-card border border-line p-6">
                <p className="text-ink leading-relaxed">{pain}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 3. Shared timeline ────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-6 pb-20">
          <TimelineCard />
        </section>

        {/* ── 4. The reframe ────────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-6 pb-20 text-center">
          <p className="font-mono text-xs tracking-widest uppercase text-brass mb-4">
            Why Camrhia is different
          </p>
          <h2 className="font-fraunces text-3xl md:text-5xl font-semibold text-ink max-w-3xl mx-auto leading-snug mb-6">
            Every other tool is built for the photographer. Camrhia is built for
            the relationship.
          </h2>
          <p className="text-base md:text-lg text-ink-soft max-w-2xl mx-auto leading-relaxed">
            That&apos;s the part nobody else gets right — a wedding isn&apos;t one
            person&apos;s to-do list. It&apos;s two people planning one day, together,
            and the tools should reflect that.
          </p>
        </section>

        {/* ── 5. The plan ───────────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-6 pb-20">
          <div className="text-center mb-10">
            <p className="font-mono text-xs tracking-widest uppercase text-brass mb-4">
              How it works
            </p>
            <h2 className="font-fraunces text-3xl md:text-4xl font-semibold text-ink">
              Three steps. That&apos;s it.
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {steps.map(({ n, title, body }) => (
              <div key={n} className="rounded-2xl bg-card border border-line p-6">
                <div className="w-8 h-8 rounded-full bg-twilight/10 flex items-center justify-center mb-4">
                  <span className="font-mono text-xs font-semibold text-twilight">{n}</span>
                </div>
                <h3 className="font-fraunces text-lg font-semibold text-ink mb-2">{title}</h3>
                <p className="text-sm text-ink-soft leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 6. For photographers / For couples ────────────────────────── */}
        <section className="mx-auto max-w-6xl px-6 pb-20">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Photographers */}
            <div
              id="photographers"
              className="rounded-2xl bg-card border border-line overflow-hidden"
            >
              <div className="h-1 bg-twilight" />
              <div className="p-8">
                <p className="font-mono text-xs tracking-widest uppercase text-twilight mb-3">
                  For photographers
                </p>
                <h2 className="font-fraunces text-2xl font-semibold text-ink mb-1">
                  Run your business, not paperwork.
                </h2>
                <p className="text-sm text-ink-soft mb-6">
                  Everything from the first inquiry to the final delivery — in
                  one place.
                </p>
                <ul className="space-y-3">
                  {photographerFeatures.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-ink">
                      <span className="mt-0.5 w-4 h-4 rounded-full bg-twilight/10 flex items-center justify-center shrink-0">
                        <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-twilight" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Couples */}
            <div
              id="couples"
              className="rounded-2xl bg-card border border-line overflow-hidden"
            >
              <div className="h-1 bg-brass" />
              <div className="p-8">
                <p className="font-mono text-xs tracking-widest uppercase text-brass mb-3">
                  For couples
                </p>
                <h2 className="font-fraunces text-2xl font-semibold text-ink mb-1">
                  Your day, in your hands.
                </h2>
                <p className="text-sm text-ink-soft mb-6">
                  Stay connected with your photographer from the first hello to
                  the last photo.
                </p>
                <ul className="space-y-3">
                  {coupleFeatures.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-ink">
                      <span className="mt-0.5 w-4 h-4 rounded-full bg-brass/10 flex items-center justify-center shrink-0">
                        <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-brass" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── 7. Real stories (honest placeholder) ──────────────────────── */}
        <section className="mx-auto max-w-6xl px-6 pb-20">
          <div className="rounded-2xl border border-line bg-card px-8 py-14 md:px-14 text-center">
            <p className="font-mono text-xs tracking-widest uppercase text-brass mb-4">
              From real weddings
            </p>
            <h2 className="font-fraunces text-3xl font-semibold text-ink mb-4">
              The stories are still being written.
            </h2>
            <p className="text-ink-soft leading-relaxed max-w-lg mx-auto mb-8">
              Camrhia is in early access — the first reviews from real couples
              and photographers will show up here soon. Want to be one of the
              first?
            </p>
            <a
              href="mailto:hello@camrhia.com?subject=Early access"
              className="inline-flex items-center rounded-full bg-twilight px-6 py-3 text-sm font-semibold text-white hover:bg-twilight/90 transition-colors"
            >
              Get early access →
            </a>
          </div>
        </section>

        {/* ── 8. Stats strip ────────────────────────────────────────────── */}
        <section className="bg-ink">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 text-center">
              {[
                { stat: "1 shared timeline", sub: "both sides always in sync" },
                { stat: "0 spreadsheets",    sub: "required" },
                { stat: "2 people",          sub: "planning one day, together" },
              ].map(({ stat, sub }) => (
                <div key={stat}>
                  <p className="font-fraunces text-3xl font-semibold text-white mb-1">{stat}</p>
                  <p className="text-sm text-white/50">{sub}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 9. Closing CTA ────────────────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-6 py-24 text-center">
          <blockquote className="font-fraunces text-3xl md:text-4xl italic font-medium text-ink max-w-2xl mx-auto mb-10 leading-snug">
            &ldquo;For the day you&apos;ll never forget — and everything it takes to
            get there.&rdquo;
          </blockquote>
          <a
            href="mailto:hello@camrhia.com?subject=Early access"
            className="inline-flex items-center rounded-full bg-twilight px-8 py-3.5 text-base font-semibold text-white hover:bg-twilight/90 transition-colors"
          >
            Get early access →
          </a>
        </section>

      </main>

      <Footer />
    </div>
  )
}
