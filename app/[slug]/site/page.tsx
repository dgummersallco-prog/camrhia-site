import { notFound } from "next/navigation"
import { supabase } from "@/lib/supabase"
import SitePage from "../../site/[token]/page"

export const dynamic = "force-dynamic"

export default async function VanitySitePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!supabase) notFound()
  const { data: token } = await supabase.rpc("get_token_by_slug", { p_slug: slug })
  if (!token || typeof token !== "string") notFound()
  return SitePage({ params: Promise.resolve({ token }) })
}
