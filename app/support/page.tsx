import Link from "next/link"
import { BRAND_NAME } from "@/lib/brand"
import Wordmark from "@/app/components/Wordmark"
import ContactForm from "./ContactForm"

export const metadata = {
  title: `Support — ${BRAND_NAME}`,
  description: "Get help with Camrhia — browse frequently asked questions or reach out to our team directly.",
}

const faqs: { q: string; a: string }[] = [
  { q: "How do I build my website?", a: "Open the online dashboard at camrhia.com, sign in with the same email and password as the app, and choose Website. Pick a look, then work down the steps. The preview updates as you go, and nothing is live until you press Save." },
  { q: "How do I change my web address?", a: "In the app, open the Studio tab and tap Change address. In the online dashboard, use Change name above the preview. Your old link stops working when you change it, so update it anywhere you shared it." },
  { q: "How do I share my portfolio with a client?", a: "Open the Portfolio tab and tap Share My Portfolio. It sends a text with a link. If your client has Camrhia, it opens your portfolio in the app. If not, they download the app, create a free account, and land on your portfolio." },
  { q: "How do I sign in to the online dashboard?", a: "Go to camrhia.com/login and use the same email and password as the app. It is the same account and the same data." },
  { q: "How do I cancel my subscription?", a: "Camrhia subscriptions run through your Apple ID. On your iPhone, open Settings, tap your name, tap Subscriptions, and choose Camrhia." },
]

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <header className="border-b border-line bg-paper px-6 py-4">
        <Link
          href="/"
          className="font-fraunces text-xl font-semibold text-ink hover:text-twilight transition-colors"
        >
          <Wordmark className="text-3xl" />
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
