import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { AvailabilityView } from "./AvailabilityView"

export const dynamic = 'force-dynamic'

async function loadProfile(token: string) {
  if (!supabase) return null
  const { data } = await supabase.rpc('get_public_profile', { p_token: token })
  return (data as Record<string, any> | null) ?? null
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const r = await loadProfile(token)
  if (!r) return { title: 'Not available' }
  const name = r.studio_name ?? r.display_name ?? 'Photographer'
  return { title: `Check availability · ${name}` }
}

export default async function AvailabilityPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const r = await loadProfile(token)
  if (!r) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, fontFamily: 'system-ui', padding: 40, textAlign: 'center' }}>
        <h1 style={{ fontSize: 24, fontWeight: 600 }}>This page isn&apos;t available.</h1>
        <Link href="https://camrhia.com" style={{ color: '#5B6B8C', textDecoration: 'underline' }}>Explore Camrhia</Link>
      </div>
    )
  }
  return <AvailabilityView initial={r} token={token} />
}
