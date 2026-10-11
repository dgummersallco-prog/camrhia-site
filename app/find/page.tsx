import type { Metadata } from "next"
import { Nav, Footer, AppStoreButton } from "@/app/components/SiteChrome"

export const metadata: Metadata = {
  title: "Find your photographer | Camrhia",
  description:
    "Browse local photographers, see their real work, and book, pay and receive your photos all in one app.",
}

const GET = [
  ["Browse real portfolios", "See each photographer's actual work and style before you ever send a message."],
  ["Reach out in seconds", "Send an inquiry or message right from their page. No hunting for an email address."],
  ["One place for everything", "Your session details, schedule, contract, payments and messages, all together."],
  ["Photos delivered to you", "When your photos are ready, they are waiting in the app. Nothing to download from a stale link."],
]

export default function Find() {
  return (
    <>
      <Nav />
      <main>
        <section className="mx-auto max-w-3xl px-6 pt-20 pb-16 text-center">
          <p className="text-sm font-semibold tracking-wide text-brass uppercase">For clients</p>
          <h1 className="mt-4 font-fraunces text-4xl md:text-6xl font-semibold text-ink leading-[1.08]">
            Find the photographer who feels like you.
          </h1>
          <p className="mt-6 text-lg text-ink-soft leading-relaxed">
            Browse local photographers, fall in love with their work, and book with confidence.
            After you book, everything stays in one calm, simple app.
          </p>
          <div className="mt-8">
            <AppStoreButton label="Download the app" />
          </div>
          <p className="mt-3 text-sm text-ink-soft">100% free for clients. Download it, browse, book and get your photos at no cost to you.</p>
        </section>

        <section className="bg-paper-deep border-y border-line">
          <div className="mx-auto max-w-5xl px-6 py-20 grid sm:grid-cols-2 gap-6">
            {GET.map(([t, d]) => (
              <div key={t} className="rounded-2xl bg-card border border-line p-7">
                <p className="font-fraunces text-xl font-semibold text-ink">{t}</p>
                <p className="mt-2 text-sm text-ink-soft leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-2xl px-6 py-20 text-center">
          <h2 className="font-fraunces text-3xl font-semibold text-ink">Already booked with a photographer?</h2>
          <p className="mt-4 text-ink-soft leading-relaxed">
            Download the app and enter the session code or invite link they sent you. Your
            session, schedule and photos will be right there.
          </p>
        </section>
      </main>
      <Footer />
    </>
  )
}
