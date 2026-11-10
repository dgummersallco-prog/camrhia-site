import type { Metadata } from "next"
import { Nav, Footer } from "@/app/components/SiteChrome"

export const metadata: Metadata = {
  title: "How it works | Camrhia",
  description: "Live in three steps. Make it yours, share one link, run it from your phone.",
}

const NAVY = "#A9545F"
const STEPS = [
  ["Make it yours", "Add your photos and packages. Your website goes live when you save."],
  ["Share one link", "Clients inquire, book and pay from it."],
  ["Run it from your phone", "Sessions, contracts, payments and delivery in one place."],
]

export default function HowItWorks() {
  return (
    <>
      <Nav />
      <main>
        <section className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <h1 className="font-fraunces text-4xl md:text-6xl font-medium text-ink leading-[1.08]">Live in three steps</h1>
          <div className="mt-14 grid md:grid-cols-3 gap-12 md:gap-10">
            {STEPS.map(([t, d], i) => (
              <div key={t}>
                <p className="font-fraunces text-7xl font-semibold leading-none mb-5" style={{ color: NAVY, opacity: 0.22 }}>{i + 1}</p>
                <p className="font-fraunces text-2xl font-semibold text-ink">{t}</p>
                <p className="mt-2 text-ink-soft leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
