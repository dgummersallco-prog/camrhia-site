import Link from "next/link"
import { BRAND_NAME } from "@/lib/brand"
import ContactForm from "./ContactForm"

export const metadata = {
  title: `Support — ${BRAND_NAME}`,
  description: "Get help with Camrhia — browse frequently asked questions or reach out to our team directly.",
}

const faqs: { q: string; a: string }[] = []

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <header className="border-b border-line bg-paper px-6 py-4">
        <Link
          href="/"
          className="font-fraunces text-xl font-semibold text-ink hover:text-twilight transition-colors"
        >
          {BRAND_NAME}
        </Link>
      </header>

      <main className="flex-1 mx-auto max-w-2xl w-full px-6 py-20">
        <p className="font-mono text-xs tracking-widest uppercase text-brass mb-4">
          Help
        </p>
        <h1 className="font-fraunces text-4xl font-semibold text-ink mb-4">
          Support
        </h1>
        <p className="text-ink-soft leading-relaxed mb-10">
          Have a question or running into an issue? We&apos;re here to help.
        </p>

        <ContactForm />

        {/* FAQ section */}
        <div className="mt-20">
          <h2 className="font-fraunces text-2xl font-semibold text-ink mb-6">
            Frequently asked questions
          </h2>

          {faqs.length === 0 ? (
            <div className="rounded-2xl border border-line bg-card p-10 text-center">
              <p className="font-fraunces text-xl italic text-ink-soft mb-2">
                No questions yet.
              </p>
              <p className="text-sm text-ink-soft">
                Check back soon — we&apos;re adding answers as they come in.
              </p>
            </div>
          ) : (
            <ul className="space-y-4">
              {faqs.map(({ q, a }) => (
                <li key={q} className="rounded-xl border border-line bg-card p-6">
                  <p className="font-semibold text-ink mb-2">{q}</p>
                  <p className="text-sm text-ink-soft leading-relaxed">{a}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  )
}
