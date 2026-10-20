import { notFound, redirect } from "next/navigation"
import { supabase } from "@/lib/supabase"

// Short vanity URL: camrhia.com/<studio-name> opens the photographer's website
// (camrhia.com/<studio-name>/site). The portfolio itself lives only in the app;
// shared portfolio links use camrhia.com/p/<token>, which is an app landing page.
export const dynamic = "force-dynamic"

export default async function VanityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!supabase) notFound()

  const { data: token } = await supabase.rpc("get_token_by_slug", { p_slug: slug })
  if (!token || typeof token !== "string") notFound()

  redirect("/" + slug + "/site")
}
