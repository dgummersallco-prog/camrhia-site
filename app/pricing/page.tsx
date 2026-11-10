import type { Metadata } from "next"
import { Nav, Footer, AppStoreButton } from "@/app/components/SiteChrome"

export const metadata: Metadata = {
  title: "Pricing | Camrhia",
  description: "Start with the booking and payments app. Add a website, ad pages, gallery delivery and the Editing Room when you are ready.",
}

function Soon() {
  return (
    <span className="inline-block rounded-full border border-line bg-paper px-3 py-1 text-xs font-semibold text-ink-soft">Coming soon</span>
  )
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
              Start with the app. Your first 14 days are free.
            </p>
            <div className="mt-12 grid md:grid-cols-2 gap-6">
              <div className="rounded-3xl bg-card border-2 border-twilight p-8">
                <p className="font-fraunces text-2xl font-semibold text-ink">Solo</p>
                <p className="mt-1 text-sm text-ink-soft">Your booking, payments and management tool.</p>
                <p className="mt-6 font-fraunces text-5xl text-ink">$8.99<span className="text-base text-ink-soft"> /month</span></p>
                <p className="mt-1 text-sm text-ink-soft">or $89.99 /year</p>
              </div>
              <div className="rounded-3xl bg-card border border-line p-8">
                <p className="font-fraunces text-2xl font-semibold text-ink">Studio</p>
                <p className="mt-1 text-sm text-ink-soft">The same tool, for a team. Manage your assistants and your photographers.</p>
                <p className="mt-6 font-fraunces text-5xl text-ink">$15.99<span className="text-base text-ink-soft"> /month</span></p>
                <p className="mt-1 text-sm text-ink-soft">or $159.99 /year</p>
              </div>
            </div>
            <div className="mt-10 text-center">
              <AppStoreButton />
            </div>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-4xl px-6 py-24">
            <h2 className="font-fraunces text-3xl md:text-5xl font-medium text-ink text-center">
              Then grow with a website.
            </h2>
            <div className="mx-auto mt-12 max-w-xl rounded-3xl bg-card border border-line p-8">
              <p className="font-fraunces text-2xl font-semibold text-ink">Website, ad pages and gallery delivery</p>
              <p className="mt-1 text-sm text-ink-soft">Everything in Solo, plus your website, ad pages for your specials, and gallery delivery to your clients.</p>
              <p className="mt-6 font-fraunces text-5xl text-ink">$36<span className="text-base text-ink-soft"> /month</span></p>
              <div className="mt-5"><Soon /></div>
            </div>
          </div>
        </section>

        <section className="bg-paper-deep border-y border-line">
          <div className="mx-auto max-w-4xl px-6 py-24">
            <h2 className="font-fraunces text-3xl md:text-5xl font-medium text-ink text-center">
              The Editing Room.
            </h2>
            <p className="mt-4 text-center text-ink-soft">Pick the part you need.</p>
            <div className="mt-12 grid md:grid-cols-2 gap-6">
              <div className="rounded-3xl bg-card border border-line p-8">
                <p className="font-fraunces text-2xl font-semibold text-ink">Culling</p>
                <p className="mt-1 text-sm text-ink-soft">Find your best photos fast.</p>
                <p className="mt-6 font-fraunces text-5xl text-ink">$11<span className="text-base text-ink-soft"> /month</span></p>
                <div className="mt-5"><Soon /></div>
              </div>
              <div className="rounded-3xl bg-card border border-line p-8">
                <p className="font-fraunces text-2xl font-semibold text-ink">Full editing</p>
                <p className="mt-1 text-sm text-ink-soft">Cull, edit and get your photos ready to send.</p>
                <p className="mt-6 font-fraunces text-5xl text-ink">$22<span className="text-base text-ink-soft"> /month</span></p>
                <div className="mt-5"><Soon /></div>
              </div>
            </div>
            <p className="mt-10 text-center text-ink-soft">Pick what you need. Each one works on its own.</p>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-4xl px-6 py-24">
            <div className="mx-auto max-w-xl rounded-3xl border-2 border-twilight bg-card p-8 text-center">
              <p className="font-fraunces text-2xl font-semibold text-ink">All-in</p>
              <p className="mt-1 text-sm text-ink-soft">Everything in one plan. The app, your website, ad pages, gallery delivery and the Editing Room.</p>
              <p className="mt-6 font-fraunces text-5xl text-ink">$59<span className="text-base text-ink-soft"> /month</span></p>
              <div className="mt-5"><Soon /></div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
