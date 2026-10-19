import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { SiteView } from "./SiteView"

export const dynamic = 'force-dynamic'

const STORAGE_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/portfolio/`
  : ''

function photoUrl(path: string | null | undefined): string | null {
  return path ? `${STORAGE_BASE}${path}` : null
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!supabase) return {}
  const { data } = await supabase.rpc('get_public_profile', { p_token: token })
  if (!data) return { title: 'Website not available' }
  const m = data as Record<string, any>
  const name = m.studio_name ?? m.display_name ?? 'Photographer'
  const place = [m.service_city, m.service_state].filter(Boolean).join(', ')
  const title = place ? `${name} · ${place}` : name
  const bio = typeof m.bio === 'string' ? m.bio.replace(/\s+/g, ' ').trim() : ''
  const description = bio ? (bio.length > 155 ? bio.slice(0, 152) + '...' : bio) : `${name} — photography.`
  const first = (Array.isArray(m.cover_paths) && m.cover_paths.length > 0 ? m.cover_paths[0] : m.cover_path) as string | null
  const image = photoUrl(first)
  return {
    title,
    description,
    openGraph: { title, description, type: 'website', ...(image ? { images: [{ url: image }] } : {}) },
    twitter: { card: image ? 'summary_large_image' : 'summary', title, description, ...(image ? { images: [image] } : {}) },
  }
}

export default async function SitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!supabase) return <div style={{ padding: 40 }}>Configuration error.</div>
  const { data: result, error } = await supabase.rpc('get_public_profile', { p_token: token })
  if (error || !result) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, fontFamily: 'system-ui', padding: 40, textAlign: 'center' }}>
        <h1 style={{ fontSize: 24, fontWeight: 600 }}>This website isn&apos;t available.</h1>
        <Link href="https://camrhia.com" style={{ color: '#5B6B8C', textDecoration: 'underline' }}>Explore Camrhia</Link>
      </div>
    )
  }
  return <SiteView initial={result as Record<string, any>} token={token} />
}
