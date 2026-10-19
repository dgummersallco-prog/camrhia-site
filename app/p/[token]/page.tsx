import { supabase } from "@/lib/supabase"
import { BRAND_NAME } from "@/lib/brand"
import Link from "next/link"
import React from "react"
import { PortfolioView } from "./PortfolioView"

export const dynamic = 'force-dynamic' // always fetch fresh — never cache a stale portfolio

const STORAGE_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/portfolio/`
  : ''

function photoUrl(path: string | null | undefined): string | null {
  return path ? `${STORAGE_BASE}${path}` : null
}

// Maps a title_font key (from titleFonts in theme/fonts.ts) to its Google
// Fonts family name + weight, so the web page loads the exact same font
// the app uses. Script fonts only ship one weight, matching the app's
// behavior where bold/italic have no effect on those.
export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!supabase) return {}
  const { data } = await supabase.rpc('get_public_profile', { p_token: token })
  if (!data) return { title: 'Portfolio not available' }
  const m = data as Record<string, any>
  const name = m.studio_name ?? m.display_name ?? 'Photographer'
  const place = [m.service_city, m.service_state].filter(Boolean).join(', ')
  const title = place ? `${name} · ${place}` : name
  const bio = typeof m.bio === 'string' ? m.bio.replace(/\s+/g, ' ').trim() : ''
  const description = bio ? (bio.length > 155 ? bio.slice(0, 152) + '...' : bio) : `View ${name}'s photography portfolio.`
  const first = (Array.isArray(m.cover_paths) && m.cover_paths.length > 0 ? m.cover_paths[0] : m.cover_path) as string | null
  const image = photoUrl(first)
  return {
    title,
    description,
    openGraph: { title, description, type: 'website', ...(image ? { images: [{ url: image }] } : {}) },
    twitter: { card: image ? 'summary_large_image' : 'summary', title, description, ...(image ? { images: [image] } : {}) },
  }
}

export default async function PublicPortfolioPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  if (!supabase) {
    return <div style={{ padding: 40 }}>Configuration error.</div>
  }

  const { data: result, error } = await supabase.rpc('get_public_profile', { p_token: token })

  if (error || !result) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, fontFamily: 'system-ui', padding: 40, textAlign: 'center' }}>
        <h1 style={{ fontSize: 24, fontWeight: 600 }}>This portfolio isn&apos;t available.</h1>
        <p style={{ color: '#666' }}>The link may be incorrect, or this portfolio may no longer be public.</p>
        <Link href="https://camrhia.com" style={{ color: '#5B6B8C', textDecoration: 'underline' }}>Explore {BRAND_NAME}</Link>
      </div>
    )
  }

  return <PortfolioView initial={result as Record<string, any>} token={token} />
}
