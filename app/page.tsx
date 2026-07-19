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
      <div className="mx-auto max-w-6xl px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <span className="font-fraunces text-lg font-semibold text-ink">
          {BRAND_NAME}
        </span>

        <nav className="flex flex-wrap justify-center gap-5 text-sm text-ink-soft">
          <Link href="/privacy" className="hover:text-ink transition-colors">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-ink transition-colors">
            Terms
          </Link>
          <Link href="/support" className="hover:text-ink transition-colors">
            Support
          </Link>
          <a
            href="mailto:hello@camrhia.com"
            className="hover:text-ink transition-colors"
          >
            Contact
          </a>
          <Link href="/affiliate/signup" className="hover:text-ink transition-colors">
            Become an affiliate
          </Link>
          <Link href="/affiliate/login" className="hover:text-ink transition-colors">
            Affiliate login
          </Link>
        </nav>

        <p className="text-xs text-ink-soft">
          © {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.
        </p>
      </div>
    </footer>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-paper">
      <Nav />

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-6 pt-20 pb-16 text-center">
          <p className="font-mono text-xs tracking-widest uppercase text-brass mb-5">
            Now in early access
          </p>

          <h1 className="font-fraunces text-5xl md:text-6xl lg:text-7xl font-semibold text-ink leading-tight tracking-tight mb-6">
            The wedding day,{" "}
            <em className="not-italic italic text-twilight">
              planned together.
            </em>
          </h1>

          <p className="text-base md:text-lg text-ink-soft max-w-2xl mx-auto leading-relaxed mb-10">
            One shared app for the photographer and the couple — a real-time
            timeline you build together, a contract that signs itself into
            place, and a gallery waiting at the end of it all.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="mailto:hello@camrhia.com?subject=Early access"
              className="inline-flex items-center rounded-full bg-twilight px-6 py-3 text-sm font-semibold text-white hover:bg-twilight/90 transition-colors"
            >
              Get early access →
            </a>
            <a
              href="mailto:hello@camrhia.com?subject=Photographer early access"
              className="inline-flex items-center rounded-full border border-twilight px-6 py-3 text-sm font-semibold text-twilight hover:bg-twilight/5 transition-colors"
            >
              I&apos;m a photographer
            </a>
          </div>
        </section>

        {/* Timeline card — centerpiece */}
        <section className="mx-auto max-w-6xl px-6 pb-20">
          <TimelineCard />
        </section>

        {/* For photographers / For couples */}
        <section
          id="photographers"
          className="mx-auto max-w-6xl px-6 pb-20"
        >
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
                    <li
                      key={f}
                      className="flex items-start gap-3 text-sm text-ink"
                    >
                      <span className="mt-0.5 w-4 h-4 rounded-full bg-twilight/10 flex items-center justify-center shrink-0">
                        <svg
                          viewBox="0 0 12 12"
                          className="w-2.5 h-2.5 text-twilight"
                          fill="none"
                        >
                          <path
                            d="M2 6l3 3 5-5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
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
                    <li
                      key={f}
                      className="flex items-start gap-3 text-sm text-ink"
                    >
                      <span className="mt-0.5 w-4 h-4 rounded-full bg-brass/10 flex items-center justify-center shrink-0">
                        <svg
                          viewBox="0 0 12 12"
                          className="w-2.5 h-2.5 text-brass"
                          fill="none"
                        >
                          <path
                            d="M2 6l3 3 5-5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
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

        {/* Affiliate promo */}
        <section className="mx-auto max-w-6xl px-6 pb-20">
          <div className="rounded-2xl bg-paper-deep border border-line px-8 py-12 md:px-14 md:py-14 flex flex-col md:flex-row md:items-center gap-8">
            <div className="flex-1">
              <p className="font-mono text-xs tracking-widest uppercase text-brass mb-3">
                Earn with Camrhia
              </p>
              <h2 className="font-fraunces text-2xl md:text-3xl font-semibold text-ink leading-snug mb-4">
                Know a photographer who&apos;d love this?{" "}
                <em className="not-italic italic text-twilight">
                  Earn 20% for as long as they stay.
                </em>
              </h2>
              <p className="text-sm md:text-base text-ink-soft leading-relaxed max-w-lg">
                Anyone can become a Camrhia affiliate — no photography business
                required. Share your link, and earn a recurring 20% of every
                referral&apos;s subscription.
              </p>
            </div>
            <div className="shrink-0">
              <Link
                href="/affiliate/signup"
                className="inline-flex items-center rounded-full bg-twilight px-6 py-3 text-sm font-semibold text-white hover:bg-twilight/90 transition-colors"
              >
                Become an affiliate →
              </Link>
            </div>
          </div>
        </section>

        {/* Stats strip */}
        <section className="bg-ink">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 text-center">
              {[
                {
                  stat: "1 shared timeline",
                  sub: "both sides always in sync",
                },
                {
                  stat: "0 spreadsheets",
                  sub: "required",
                },
                {
                  stat: "2 people",
                  sub: "planning one day, together",
                },
              ].map(({ stat, sub }) => (
                <div key={stat}>
                  <p className="font-fraunces text-3xl font-semibold text-white mb-1">
                    {stat}
                  </p>
                  <p className="text-sm text-white/50">{sub}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="mx-auto max-w-6xl px-6 py-24 text-center">
          <blockquote className="font-fraunces text-3xl md:text-4xl italic font-medium text-ink max-w-2xl mx-auto mb-10 leading-snug">
            "For the day you&apos;ll never forget — and everything it takes to
            get there."
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
