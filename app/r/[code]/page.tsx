import Link from "next/link"
import type { Metadata } from "next"
import { supabase } from "@/lib/supabase"
import { BRAND_NAME } from "@/lib/brand"
import CopyRefOnClick from "./CopyRefOnClick"

const APP_STORE_URL = "https://apps.apple.com/app/id6800011162"

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
      <header className="border-b border-line bg-paper px-6 py-4">
        <Link href="/" className="font-fraunces text-xl font-semibold text-ink hover:text-twilight transition-colors">
          {BRAND_NAME}
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-20">
        {referred ? (
          <div className="max-w-md w-full text-center">
            <span className="inline-block bg-brass/10 text-brass font-mono text-xs tracking-widest uppercase rounded-full px-4 py-1.5 mb-6">
              You&apos;re invited
            </span>
            <h1 className="font-fraunces text-3xl font-semibold text-ink mb-3">
              Run your whole photography business from one app.
            </h1>
            <p className="text-ink-soft leading-relaxed mb-8">
              Bookings, contracts, payments, timelines and client messaging in one place, with your own portfolio website.
              Try it free for 14 days. Your referral is already saved: just tap below, install the app, and create your account.
            </p>

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
        ) : (
          <div className="max-w-md w-full text-center">
            <span className="inline-block bg-line text-ink-soft font-mono text-xs tracking-widest uppercase rounded-full px-4 py-1.5 mb-6">
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
        )}
      </main>
    </div>
  )
}
