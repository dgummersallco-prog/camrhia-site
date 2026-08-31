import { supabase } from "@/lib/supabase"
import Link from "next/link"

export const dynamic = 'force-dynamic'

const STORAGE_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/portfolio/`
  : ''

export default async function PackagesPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  if (!supabase) return <div style={{ padding: 40 }}>Configuration error.</div>

  const { data: result, error } = await supabase.rpc('get_public_profile', { p_token: token })
  if (error || !result) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>
        This portfolio isn&apos;t available.
      </div>
    )
  }

  const r = result as Record<string, any>
  const publicPackages = (r.packages ?? []).filter((p: any) => p.show_public !== false)
  const bgColor = r.portfolio_bg_color ?? '#FAF8F5'

  return (
    <div style={{ minHeight: '100vh', backgroundColor: bgColor }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 24px 60px' }}>
        <Link href={`/p/${token}`} style={{ display: 'inline-block', marginBottom: 24, fontFamily: 'system-ui, sans-serif', fontSize: 14, color: '#4A4A4A' }}>
          ← Back
        </Link>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 26, marginBottom: 20 }}>
          {r.section_titles?.pricing || 'Packages'}
        </h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {publicPackages.length === 0 && (
            <p style={{ fontFamily: 'system-ui, sans-serif', color: '#8A8A8A' }}>No packages available.</p>
          )}
          {publicPackages.map((pkg: any) => (
            <div key={pkg.id} style={{ backgroundColor: '#fff', borderRadius: 12, padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 17, margin: 0 }}>{pkg.name}</h3>
                {pkg.price && <span style={{ fontFamily: 'system-ui, sans-serif', fontWeight: 600, fontSize: 15 }}>{pkg.price}</span>}
              </div>
              {pkg.covers && <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: 13, color: '#8A8A8A', marginTop: 4 }}>{pkg.covers}</p>}
              {pkg.detail && <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: 14, color: '#4A4A4A', marginTop: 8, lineHeight: 1.5 }}>{pkg.detail}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
