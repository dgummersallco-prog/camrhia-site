import type { Metadata } from 'next'
import Link from 'next/link'
import { BRAND_NAME } from '@/lib/brand'

export const metadata: Metadata = {
  title: `FAQ — ${BRAND_NAME}`,
  description: 'Answers to common questions about Camrhia for photographers, couples, and affiliates.',
}

// ── Content ───────────────────────────────────────────────────────────────────
// Single source of truth — used for both the visible accordion and JSON-LD,
// so the structured data always matches exactly what's displayed on the page.

const FAQ_SECTIONS = [
  {
    id: 'photographers',
    title: 'For Photographers',
    items: [
      {
        q: 'How much does Camrhia cost?',
        a: '$59/month, or $590/year (2 months free). Every photographer gets a free 14-day trial first — no credit card required to start.',
      },
      {
        q: 'Is there a free trial?',
        a: 'Yes — 14 days, full access, no credit card required.',
      },
      {
        q: 'Can I cancel anytime?',
        a: 'Yes. Manage or cancel your subscription anytime from your account — no phone calls, no emails required.',
      },
      {
        q: 'Do couples pay anything?',
        a: 'No. Camrhia is completely free for couples. Only photographers have a subscription.',
      },
      {
        q: 'How does the timeline actually work between me and my couple?',
        a: "You build it together. Either side can edit it, and both approve changes before they're locked in — so you're always looking at the same plan.",
      },
      {
        q: 'Does Camrhia process payments between me and my couple?',
        a: 'Not yet — Camrhia tracks your payment schedule and sends reminders, but you collect payment however you already do (Venmo, Zelle, bank transfer, etc.).',
      },
    ],
  },
  {
    id: 'couples',
    title: 'For Couples',
    items: [
      {
        q: 'Is Camrhia free for us?',
        a: 'Yes, completely free — your photographer covers the subscription.',
      },
      {
        q: 'Do we need to download anything separate from our photographer?',
        a: "No, you use the same Camrhia app your photographer uses — you're just connected to their account for your specific wedding.",
      },
      {
        q: 'Can we edit the timeline ourselves?',
        a: "Yes — you can add, edit, and suggest changes. Your photographer approves them, and vice versa, so you're always in sync.",
      },
      {
        q: "What if we haven't booked a photographer yet?",
        a: "You can start planning your wedding in Camrhia before you've booked anyone, and browse/message photographers directly in the app.",
      },
    ],
  },
  {
    id: 'affiliates',
    title: 'For Affiliates',
    items: [
      {
        q: 'How much can I earn?',
        a: '20% recurring commission to start, climbing to 30% after 10 referrals and 40% after 25 — for as long as your referrals stay subscribed, with no cap.',
      },
      {
        q: 'Do I need to be a photographer to join?',
        a: 'No — anyone can become a Camrhia affiliate.',
      },
    ],
  },
]

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ_SECTIONS.flatMap((section) =>
    section.items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    }))
  ),
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-paper border-b border-line">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between gap-6">
          <Link
            href="/"
            className="font-fraunces text-xl font-semibold text-ink hover:text-twilight transition-colors tracking-tight"
          >
            {BRAND_NAME}
          </Link>
          <div className="hidden md:flex items-center gap-7 text-sm font-medium text-ink-soft">
            <Link href="/blog" className="hover:text-ink transition-colors">Blog</Link>
            <Link href="/faq" className="text-ink transition-colors">FAQ</Link>
            <Link href="/support" className="hover:text-ink transition-colors">Support</Link>
            <Link href="/login" className="hover:text-ink transition-colors">Log in</Link>
          </div>
          <Link
            href="/"
            className="inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#3A4A6B' }}
          >
            Get early access
          </Link>
        </div>
      </nav>

      <main className="flex-1">
        {/* Header */}
        <section className="mx-auto max-w-3xl px-6 pt-16 pb-10">
          <p className="font-mono text-xs tracking-widest uppercase text-brass mb-4">FAQ</p>
          <h1 className="font-fraunces text-4xl md:text-5xl font-semibold text-ink leading-tight mb-3">
            Common questions
          </h1>
          <p className="text-base text-ink-soft leading-relaxed">
            Questions about Camrhia for photographers, couples, and affiliates.
            Something missing?{' '}
            <Link href="/support" className="text-twilight hover:underline" style={{ color: '#3A4A6B' }}>
              Ask us directly.
            </Link>
          </p>
        </section>

        {/* FAQ sections */}
        <section className="mx-auto max-w-3xl px-6 pb-24">
          {FAQ_SECTIONS.map((section, si) => (
            <div key={section.id} className={si > 0 ? 'mt-14' : ''}>
              <h2 className="font-fraunces text-2xl font-semibold text-ink mb-1">
                {section.title}
              </h2>
              <div className="mt-5 border-t border-line">
                {section.items.map((item) => (
                  <details key={item.q} className="faq-item group border-b border-line">
                    <summary className="faq-summary flex cursor-pointer select-none items-start justify-between gap-6 py-5">
                      <span className="faq-question-text text-sm font-medium text-ink leading-snug">
                        {item.q}
                      </span>
                      <svg
                        className="faq-chevron mt-0.5 h-4 w-4 shrink-0 text-ink-soft"
                        viewBox="0 0 16 16"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M4 6l4 4 4-4"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </summary>
                    <div className="pb-5 pr-10 text-sm text-ink-soft leading-relaxed">
                      {item.a}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-line bg-paper-deep">
        <div className="mx-auto max-w-3xl px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-ink-soft">
            © {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.
          </p>
          <div className="flex items-center gap-5 text-xs text-ink-soft">
            <Link href="/privacy" className="hover:text-ink transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-ink transition-colors">Terms</Link>
            <Link href="/support" className="hover:text-ink transition-colors">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
