"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { BRAND_NAME } from "@/lib/brand"
import { supabase } from "@/lib/supabase"
import Wordmark from "@/app/components/Wordmark"

const APP_STORE_URL = "https://apps.apple.com/app/id6800011162"

// The email link lands here with a one-time sign-in code. We hand that code
// to the app through its own address (camrhia://) so it can log the person in
// without them typing their email and password again.
export default function ConfirmEmailPage() {
  const [openUrl, setOpenUrl] = useState("camrhia://confirm-email")

  useEffect(() => {
    // Website sign-ups arrive with sign-in tokens in the address; sign in here and continue.
    if (window.location.hash.includes("access_token") && supabase) {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) window.location.replace("/start")
      })
      return
    }
    const code = new URLSearchParams(window.location.search).get("code")
    if (!code) return
    const url = `camrhia://confirm-email?code=${encodeURIComponent(code)}`
    setOpenUrl(url)
    const t = setTimeout(() => {
      window.location.href = url
    }, 400)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <header className="border-b border-line bg-paper px-6 py-4">
        <Link href="/" className="font-fraunces text-xl font-semibold text-ink hover:text-twilight transition-colors">
          <Wordmark className="text-3xl" />
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="max-w-md w-full text-center">
          <span className="inline-block bg-sage/10 text-sage font-mono text-xs tracking-widest uppercase rounded-full px-4 py-1.5 mb-6">
            Email Confirmed
          </span>
          <h1 className="font-fraunces text-3xl font-semibold text-ink mb-3">
            You&apos;re all set!
          </h1>
          <p className="text-ink-soft leading-relaxed mb-8">
            Your email has been verified. Tap the button below to open {BRAND_NAME} and you&apos;ll be signed in automatically.
          </p>
          <a
            href={openUrl}
            className="inline-flex items-center justify-center rounded-2xl bg-ink text-white px-8 py-3.5 text-sm font-semibold hover:bg-ink/90 transition-colors"
          >
            Open {BRAND_NAME}
          </a>
          <p className="text-ink-soft text-sm mt-8">
            Don&apos;t have the app yet?{" "}
            <a href={APP_STORE_URL} className="underline text-ink">
              Download it on the App Store
            </a>
          </p>
        </div>
      </main>
    </div>
  )
}
