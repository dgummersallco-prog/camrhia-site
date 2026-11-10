import type { Metadata } from "next"
import { Nav, Footer, AppStoreButton } from "@/app/components/SiteChrome"

export const metadata: Metadata = {
  title: "Pricing | Camrhia",
  description: "Simple pricing. Every plan starts with 14 free days.",
}

export default function Pricing() {
  return (
    <>
      <Nav />
      <main>
        <section className="bg-paper-deep">
          <div className="mx-auto max-w-4xl px-6 py-24">
            <h1 className="font-fraunces text-4xl md:text-6xl font-medium text-ink text-center">
              Simple pricing. Try it free first.
            </h1>
            <p className="mt-4 text-center text-ink-soft">
              Every plan starts with 14 free days.
            </p>
            <div className="mt-12 grid md:grid-cols-2 gap-6">
              <div className="rounded-3xl bg-card border-2 border-twilight p-8">
                <p className="font-fraunces text-2xl font-semibold text-ink">Solo</p>
                <p className="mt-1 text-sm text-ink-soft">For the photographer running their own show.</p>
                <p className="mt-6 font-fraunces text-5xl text-ink">$8.99<span className="text-base text-ink-soft"> /month</span></p>
                <p className="mt-1 text-sm text-ink-soft">or $89.99 /year</p>
              </div>
              <div className="rounded-3xl bg-card border border-line p-8">
                <p className="font-fraunces text-2xl font-semibold text-ink">Studio</p>
                <p className="mt-1 text-sm text-ink-soft">For studios with a team.</p>
                <p className="mt-6 font-fraunces text-5xl text-ink">$15.99<span className="text-base text-ink-soft"> /month</span></p>
                <p className="mt-1 text-sm text-ink-soft">or $159.99 /year</p>
              </div>
            </div>
            <div className="mt-10 text-center">
              <AppStoreButton />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
