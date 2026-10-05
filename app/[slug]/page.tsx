import { notFound } from "next/navigation"
import { supabase } from "@/lib/supabase"
import PublicPortfolioPage from "../p/[token]/page"

// Short vanity URL: camrhia.com/<studio-name> renders the same public
// portfolio as camrhia.com/p/<token>. Existing static routes (privacy,
// terms, p, s, etc.) always win over this catch-all, and those names are
// also reserved in the database so nobody can claim them.
export const dynamic = "force-dynamic"

export default async function VanityPortfolioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!supabase) notFound()

  const { data: token } = await supabase.rpc("get_token_by_slug", { p_slug: slug })
  if (!token || typeof token !== "string") notFound()

  return PublicPortfolioPage({ params: Promise.resolve({ token }) })
}
