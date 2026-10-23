import { notFound } from "next/navigation"
import { supabase } from "@/lib/supabase"
import Page from "../../../site/[token]/g/[gid]/page"

export const dynamic = "force-dynamic"

export default async function VanityGalleryPage(props: { params: Promise<{ slug: string; gid: string }>; searchParams: Promise<any> }) {
  const { slug, gid } = await props.params
  if (!supabase) notFound()
  const { data: token } = await supabase.rpc("get_token_by_slug", { p_slug: slug })
  if (!token || typeof token !== "string") notFound()
  return (Page as any)({ params: Promise.resolve({ token, gid }), searchParams: props.searchParams })
}
