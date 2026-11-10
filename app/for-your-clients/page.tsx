import type { Metadata } from "next"
import { Nav, Footer } from "@/app/components/SiteChrome"

export const metadata: Metadata = {
  title: "For your clients | Camrhia",
  description: "Be the photographer clients never have to chase. One calm place for every session.",
}

const CLIENT_PERKS = [
  ["One place for everything", "Contract, payments, messages and photos in one simple app."],
  ["Photos they love opening", "A PIN gallery with hearts and one-tap downloads."],
  ["Always know what is next", "Reminders for session day and for each payment."],
  ["Reviews and rebooking", "Camrhia asks for a review and brings past clients back."],
]

export default function ForYourClients() {
  return (
    <>
      <Nav />
      <main>
        <section className="bg-paper-deep">
          <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
            <div className="max-w-2xl">
              <p className="text-base font-medium text-brass">The part your clients will tell their friends about</p>
              <h1 className="mt-3 font-fraunces text-4xl md:text-6xl font-medium text-ink leading-[1.08]">
                Be the photographer clients never have to chase.
              </h1>
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
      </main>
      <Footer />
    </>
  )
}
