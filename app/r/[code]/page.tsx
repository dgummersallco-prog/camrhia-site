import Link from "next/link"
import type { Metadata } from "next"
import { supabase } from "@/lib/supabase"
import { BRAND_NAME } from "@/lib/brand"
import Wordmark from "@/app/components/Wordmark"
import CopyRefOnClick from "./CopyRefOnClick"

const APP_STORE_URL = "https://apps.apple.com/app/id6800011162"
const PHONE =
  "rounded-[1.9rem] ring-1 ring-black/10 bg-card shadow-[0_30px_60px_-25px_rgba(30,40,70,0.55)]"

export async function generateMetadata(props: PageProps<"/r/[code]">): Promise<Metadata> {
  const { code } = await props.params
  return {
    title: `You've been invited to ${BRAND_NAME}`,
    robots: { index: false },
    other: {
      "apple-itunes-app": `app-id=6800011162, app-argument=https://camrhia.com/r/${encodeURIComponent(code)}`,
    },
  }
}

function Check() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4 mt-1 shrink-0 text-sage" fill="none" aria-hidden>
      <path d="M3 10.5l4.5 4.5L17 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default async function ReferralPage(props: PageProps<"/r/[code]">) {
  const { code } = await props.params

  let referred = false

  if (supabase) {
    try {
      const { data, error } = await supabase.rpc("check_referral_code", { p_code: code })
      if (!error && data === true) {
        referred = true
      }
    } catch {
      // treat as not found
    }
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <style>{`
        @keyframes phoneRise { from { opacity: 0; transform: translateY(36px); } to { opacity: 1; transform: none; } }
        .phone-rise { animation: phoneRise 0.9s cubic-bezier(0.2, 0.7, 0.2, 1) both; }
        @media (prefers-reduced-motion: reduce) { .phone-rise { animation: none; } }
      `}</style>

      <header className="border-b border-line bg-paper px-6 py-4">
        <div className="mx-auto max-w-6xl">
          <Link href="/" className="font-fraunces text-xl font-semibold text-ink hover:text-twilight transition-colors">
            <Wordmark className="text-3xl" />
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {referred ? (
          <section className="mx-auto max-w-6xl px-6 py-14 sm:py-20 grid md:grid-cols-2 gap-14 md:gap-16 items-center">
            <div>
              <span className="inline-block bg-brass/10 text-brass text-sm font-medium rounded-full px-4 py-1.5 mb-6">
                You&apos;re invited
              </span>
              <h1 className="font-fraunces text-4xl sm:text-5xl font-semibold text-ink leading-[1.08] mb-5">
                Run your whole photography business from one app.
              </h1>
              <p className="text-lg text-ink-soft leading-relaxed mb-7 max-w-lg">
                Try it free for 14 days. Your referral is already saved: just tap below, install the app, and create your account.
              </p>

              <ul className="space-y-3 mb-9">
                {[
                  "Your own website, included in your subscription",
                  "Clients browse photographers in their area, so they can find you",
                  "Bookings, contracts, payments, timelines and messaging in one place",
                ].map((t) => (
                  <li key={t} className="flex gap-3 text-ink leading-snug">
                    <Check />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>

              <CopyRefOnClick code={code}>
                <a
                  href={APP_STORE_URL}
                  className="inline-flex items-center gap-2 rounded-2xl bg-ink text-white px-6 py-3.5 text-sm font-semibold hover:bg-ink/90 transition-colors mb-4"
                  aria-label="Get Camrhia on the App Store"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden="true">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </svg>
                  Get Camrhia on the App Store
                </a>
              </CopyRefOnClick>

              <p className="text-xs text-ink-soft">
                Referral code:{" "}
                <span className="font-mono font-semibold text-ink bg-paper-deep px-2 py-0.5 rounded">{code}</span>
                <br />
                If it isn&apos;t filled in automatically, enter it when you create your account.
              </p>
            </div>

            <div className="relative overflow-hidden rounded-[2.5rem] aspect-[4/5] w-full max-w-md mx-auto bg-brass/15">
              <div className="absolute left-[6%] top-[9%] w-[54%] z-10 -rotate-[2deg]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/screens/live-portfolio.png" alt="A photographer's live portfolio website on Camrhia" className={`${PHONE} phone-rise block w-full`} style={{ animationDelay: "0.15s" }} />
              </div>
              <div className="absolute right-[5%] top-[22%] w-[46%] rotate-[4deg]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/screens/1-sessions.png" alt="The Camrhia session list" className={`${PHONE} phone-rise block w-full`} style={{ animationDelay: "0.35s" }} />
              </div>
            </div>
          </section>
        ) : (
          <div className="flex items-center justify-center px-6 py-24">
            <div className="max-w-md w-full text-center">
              <span className="inline-block bg-line text-ink-soft text-sm font-medium rounded-full px-4 py-1.5 mb-6">
                Link not found
              </span>
              <h1 className="font-fraunces text-3xl font-semibold text-ink mb-3">This link isn&apos;t valid.</h1>
              <p className="text-ink-soft leading-relaxed mb-8">
                Check with the person who sent it, or head to the home page to learn about {BRAND_NAME}.
              </p>
              <Link
                href="/"
                className="inline-flex items-center rounded-full bg-ink text-white px-6 py-3 text-sm font-semibold hover:bg-ink/90 transition-colors"
              >
                Go to {BRAND_NAME}
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
