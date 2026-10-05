import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { BRAND_NAME } from "@/lib/brand"

export const dynamic = "force-dynamic"

// Set NEXT_PUBLIC_APP_STORE_URL in Netlify once the App Store listing is live.
const APP_STORE_URL = process.env.NEXT_PUBLIC_APP_STORE_URL ?? ""

type InviteStatus = "open" | "claimed" | "invalid" | "unknown"

export default async function SessionInvitePage(props: { params: Promise<{ code: string }> }) {
  const { code } = await props.params
  const display = code.toUpperCase()

  // Narrow SECURITY DEFINER RPC: answers only open / claimed / invalid.
  // If the lookup itself fails, we stay "unknown" and still show the
  // download + code, so a real client is never dead-ended by an outage.
  let status: InviteStatus = "unknown"
  if (supabase) {
    try {
      const { data, error } = await supabase.rpc("session_invite_status", { p_number: code })
      if (!error && (data === "open" || data === "claimed" || data === "invalid")) {
        status = data
      } else if (error) {
        console.error("session_invite_status failed:", error.message)
      }
    } catch (e) {
      console.error("session_invite_status threw:", e)
    }
  } else {
    console.error("Supabase env vars missing on this deployment")
  }

  const buttonClass =
    "inline-flex items-center gap-2 rounded-2xl bg-ink text-white px-6 py-3.5 text-sm font-semibold hover:bg-ink/90 transition-colors mb-3"
  const appleIcon = (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden="true"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" /></svg>
  )

  const downloadButton = APP_STORE_URL ? (
    <a href={APP_STORE_URL} className={buttonClass} aria-label="Download on the App Store">
      {appleIcon}
      Download on the App Store
    </a>
  ) : (
    <span className={buttonClass + " opacity-80 cursor-default"}>
      {appleIcon}
      Coming soon to the App Store
    </span>
  )

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <header className="border-b border-line bg-paper px-6 py-4">
        <Link href="/" className="font-fraunces text-xl font-semibold text-ink hover:text-twilight transition-colors">
          {BRAND_NAME}
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-20">
        {status !== "invalid" ? (
          <div className="max-w-md w-full text-center">
            <span className="inline-block bg-brass/10 text-brass font-mono text-xs tracking-widest uppercase rounded-full px-4 py-1.5 mb-6">
              You&apos;re Invited
            </span>
            <h1 className="font-fraunces text-3xl font-semibold text-ink mb-3">
              Your photographer invited you to {BRAND_NAME}!
            </h1>
            <p className="text-ink-soft leading-relaxed mb-6">
              Download the app, create your account, and enter this code when asked. It connects you straight to your session.
            </p>

            <div className="rounded-2xl border border-line bg-paper-deep px-6 py-5 mb-8">
              <p className="text-xs uppercase tracking-widest text-ink-soft font-mono mb-2">Your session code</p>
              <p className="font-mono text-4xl font-semibold tracking-[0.25em] text-ink">{display}</p>
            </div>

            {downloadButton}
            <p className="text-xs text-ink-soft mb-6">Available on iOS. Android coming.</p>

            {status === "claimed" && (
              <p className="text-sm text-ink-soft">
                Already created your account with this code? Just open the app and sign in.
              </p>
            )}
          </div>
        ) : (
          <div className="max-w-md w-full text-center">
            <span className="inline-block bg-line text-ink-soft font-mono text-xs tracking-widest uppercase rounded-full px-4 py-1.5 mb-6">
              Link not found
            </span>
            <h1 className="font-fraunces text-3xl font-semibold text-ink mb-3">
              We couldn&apos;t find that invite.
            </h1>
            <p className="text-ink-soft leading-relaxed mb-8">
              Double-check the code with your photographer, or explore {BRAND_NAME}, the app built for photographers and clients to plan together.
            </p>
            <Link href="/" className="inline-flex items-center rounded-full bg-twilight px-6 py-3 text-sm font-semibold text-white hover:bg-twilight/90 transition-colors">
              Explore {BRAND_NAME} →
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
