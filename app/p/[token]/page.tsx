import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { BRAND_NAME } from "@/lib/brand"
import Wordmark from "@/app/components/Wordmark"
import GetTheApp from "./GetTheApp"
import { PortfolioView } from "./PortfolioView"

export const dynamic = "force-dynamic"

const APP_STORE_URL = process.env.NEXT_PUBLIC_APP_STORE_URL || "https://apps.apple.com/app/id6800011162"

export default async function PortfolioInvitePage(props: { params: Promise<{ token: string }>; searchParams: Promise<{ preview?: string }> }) {
  const { token } = await props.params
  const sp = await props.searchParams

  let name: string | null = null
  let result: Record<string, any> | null = null
  if (supabase) {
    try {
      const { data } = await supabase.rpc("get_public_profile", { p_token: token })
      const r: any = data
      if (r) result = r
      name = r?.studio_name ?? r?.profile?.studio_name ?? r?.display_name ?? null
    } catch (e) {
      console.error("get_public_profile failed:", e)
    }
  }

  if (sp?.preview === "1" && result) {
    return <PortfolioView initial={result} token={token} />
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <header className="border-b border-line bg-paper px-6 py-4">
        <Link href="/" className="font-fraunces text-xl font-semibold text-ink hover:text-twilight transition-colors">
          <Wordmark className="text-3xl" />
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="max-w-md w-full text-center">
          <span className="inline-block bg-brass/10 text-brass font-mono text-xs tracking-widest uppercase rounded-full px-4 py-1.5 mb-6">
            Portfolio
          </span>
          <h1 className="font-fraunces text-3xl font-semibold text-ink mb-3">
            {name ? name + " shared their portfolio with you" : "A photographer shared their portfolio with you"}
          </h1>
          <p className="text-ink-soft leading-relaxed">
            See their work, check their dates and message them, all inside the {BRAND_NAME} app.
          </p>
          <GetTheApp token={token} appStoreUrl={APP_STORE_URL} />
        </div>
      </main>
    </div>
  )
}
