import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { GalleryView } from "./GalleryView"

export const dynamic = 'force-dynamic'

const STORAGE_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/portfolio/`
  : ''
function photoUrl(path: string | null | undefined): string | null {
  return path ? `${STORAGE_BASE}${path}` : null
}

async function loadProfile(token: string) {
  if (!supabase) return null
  const { data } = await supabase.rpc('get_public_profile', { p_token: token })
  return (data as Record<string, any> | null) ?? null
}

export async function generateMetadata({ params }: { params: Promise<{ token: string; gid: string }> }) {
  const { token, gid } = await params
  const r = await loadProfile(token)
  if (!r) return { title: 'Gallery not available' }
  const gal = ((r.site_galleries ?? []) as any[]).find((g) => g.id === gid)
  const name = r.studio_name ?? r.display_name ?? 'Photographer'
  if (!gal) return { title: name }
  const first = gal.photos?.[0]?.storage_path as string | undefined
  const image = photoUrl(first)
  const title = `${gal.title} · ${name}`
  return { title, openGraph: { title, type: 'website', ...(image ? { images: [{ url: image }] } : {}) } }
}

export default async function SiteGalleryPage({ params }: { params: Promise<{ token: string; gid: string }> }) {
  const { token, gid } = await params
  const r = await loadProfile(token)
  if (!r) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, fontFamily: 'system-ui', padding: 40, textAlign: 'center' }}>
        <h1 style={{ fontSize: 24, fontWeight: 600 }}>This gallery isn&apos;t available.</h1>
        <Link href={`/site/${token}`} style={{ color: '#5B6B8C', textDecoration: 'underline' }}>Back to the website</Link>
      </div>
    )
  }
  return <GalleryView initial={r} token={token} gid={gid} />
}
