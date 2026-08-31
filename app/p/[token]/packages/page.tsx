import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { PackageCard } from "./PackageCard"

export const dynamic = 'force-dynamic'

const STORAGE_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/portfolio/`
  : ''
function photoUrl(path: string | null | undefined): string | null {
  return path ? `${STORAGE_BASE}${path}` : null
}

const FONT_CSS_NAME: Record<string, string> = {
  playfair_display: 'Playfair Display', cormorant_garamond: 'Cormorant Garamond',
  libre_baskerville: 'Libre Baskerville', eb_garamond: 'EB Garamond', lora: 'Lora',
  crimson_pro: 'Crimson Pro', bodoni_moda: 'Bodoni Moda', dm_serif_display: 'DM Serif Display',
  italiana: 'Italiana', great_vibes: 'Great Vibes', parisienne: 'Parisienne',
  sacramento: 'Sacramento', allura: 'Allura', pinyon_script: 'Pinyon Script',
  alex_brush: 'Alex Brush', montserrat: 'Montserrat', poppins: 'Poppins',
  josefin_sans: 'Josefin Sans', raleway: 'Raleway', work_sans: 'Work Sans',
}
const FONT_MAP: Record<string, string> = {
  playfair_display: 'Playfair+Display:wght@700', cormorant_garamond: 'Cormorant+Garamond:wght@600',
  libre_baskerville: 'Libre+Baskerville:wght@700', eb_garamond: 'EB+Garamond:wght@600', lora: 'Lora:wght@600',
  crimson_pro: 'Crimson+Pro:wght@600', bodoni_moda: 'Bodoni+Moda:wght@700', dm_serif_display: 'DM+Serif+Display',
  italiana: 'Italiana', great_vibes: 'Great+Vibes', parisienne: 'Parisienne', sacramento: 'Sacramento',
  allura: 'Allura', pinyon_script: 'Pinyon+Script', alex_brush: 'Alex+Brush', montserrat: 'Montserrat:wght@700',
  poppins: 'Poppins:wght@600', josefin_sans: 'Josefin+Sans:wght@600', raleway: 'Raleway:wght@700', work_sans: 'Work+Sans:wght@600',
}
function fontFamilyFor(key: string | null | undefined, fallback: string): string {
  if (!key) return fallback
  return FONT_CSS_NAME[key] ? `'${FONT_CSS_NAME[key]}', ${fallback}` : fallback
}

export default async function PackagesPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  if (!supabase) return <div style={{ padding: 40 }}>Configuration error.</div>

  const [{ data: result, error }, { data: sessionTypesRaw }] = await Promise.all([
    supabase.rpc('get_public_profile', { p_token: token }),
    supabase.from('session_types').select('key, label'),
  ])
  if (error || !result) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>
        This portfolio isn&apos;t available.
      </div>
    )
  }

  const r = result as Record<string, any>
  const sessionTypes: { key: string; label: string }[] = sessionTypesRaw ?? []
  const bgColor = r.portfolio_bg_color ?? '#FAF8F5'
  const isPamphlet = r.pricing_display_mode === 'pamphlet'
  const accent = r.accent_color ?? '#5B6B8C'

  const fontLinks = [r.pricing_pamphlet_font, r.pricing_list_font].filter(Boolean).map(k => FONT_MAP[k]).filter(Boolean)

  const pages: any[] = r.pricing_pages ?? []
  const packages: any[] = (r.packages ?? []).filter((p: any) => p.show_public !== false)
  const visiblePages = pages
    .map(page => ({ page, pkgs: packages.filter((p: any) => p.page_id === page.id) }))
    .filter(g => g.pkgs.length > 0)

  function groupBySessionType(pkgs: any[]) {
    const groups = new Map<string, { label: string; order: number; items: any[] }>()
    pkgs.forEach(pkg => {
      const idx = sessionTypes.findIndex(t => t.key === pkg.session_type)
      const key = idx >= 0 ? sessionTypes[idx].key : '__other'
      const label = idx >= 0 ? sessionTypes[idx].label : 'Other'
      const order = idx >= 0 ? idx : 99
      if (!groups.has(key)) groups.set(key, { label, order, items: [] })
      groups.get(key)!.items.push(pkg)
    })
    const sorted = [...groups.values()].sort((a, b) => a.order - b.order)
    return sorted.length > 1 ? sorted : [{ label: '', order: 0, items: pkgs }]
  }

  const pamphletRowStyle: React.CSSProperties = {
    fontFamily: fontFamilyFor(r.pricing_pamphlet_font, 'system-ui, sans-serif'),
    fontSize: r.pricing_pamphlet_size ?? 15,
    color: r.pricing_pamphlet_color ?? '#2B2B2B',
    fontWeight: r.pricing_pamphlet_bold ? 700 : undefined,
    fontStyle: r.pricing_pamphlet_italic ? 'italic' : undefined,
  }
  const pamphletAccent = r.pricing_pamphlet_accent_color ?? accent
  const listNameStyle: React.CSSProperties = {
    fontFamily: fontFamilyFor(r.pricing_list_font, "'Fraunces', serif"),
    fontSize: r.pricing_list_size ?? 18,
    color: r.pricing_list_color ?? '#2B2B2B',
    fontWeight: r.pricing_list_bold ? 700 : undefined,
    fontStyle: r.pricing_list_italic ? 'italic' : undefined,
  }
  const listPriceColor = r.pricing_list_accent_color ?? accent

  return (
    <>
      {fontLinks.length > 0 && (
        <link rel="stylesheet" href={`https://fonts.googleapis.com/css2?${fontLinks.map(f => `family=${f}`).join('&')}&display=swap`} />
      )}
      <div style={{ minHeight: '100vh', backgroundColor: bgColor }}>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 24px 60px' }}>
          <Link href={`/p/${token}`} style={{ display: 'inline-block', marginBottom: 24, fontFamily: 'system-ui, sans-serif', fontSize: 14, color: '#4A4A4A' }}>
            ← Back
          </Link>
          {visiblePages.length === 0 && (
            <p style={{ fontFamily: 'system-ui, sans-serif', color: '#8A8A8A' }}>No packages available.</p>
          )}
          {visiblePages.map(({ page, pkgs }, pi) => (
            <div key={page.id} style={{ marginTop: pi > 0 && !isPamphlet ? 36 : pi > 0 ? 24 : 0 }}>
              {page.title && (
                <p style={{
                  ...(isPamphlet ? pamphletRowStyle : { fontFamily: "'Fraunces', serif", color: '#2B2B2B' }),
                  fontSize: (isPamphlet ? pamphletRowStyle.fontSize as number : 18) * 1.25,
                  textAlign: 'center', marginBottom: 14,
                }}>{page.title}</p>
              )}
              {groupBySessionType(pkgs).map((group, gi) => (
                <div key={group.label || gi} style={{ marginTop: gi > 0 ? 20 : 0 }}>
                  {group.label && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <span style={{ ...pamphletRowStyle, fontSize: (pamphletRowStyle.fontSize as number) * 1.1, opacity: 0.75 }}>{group.label}</span>
                      {isPamphlet && <div style={{ flex: 1, height: 1, backgroundColor: pamphletAccent, opacity: 0.5 }} />}
                    </div>
                  )}
                  {isPamphlet ? (
                    <div>
                      {group.items.map((pkg: any) => (
                        <div key={pkg.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0 10px 14px' }}>
                          <span style={{ ...pamphletRowStyle, flex: 1 }}>{pkg.name}</span>
                          {pkg.price && <span style={{ ...pamphletRowStyle, color: pamphletAccent, paddingRight: 20 }}>{pkg.price}</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {group.items.map((pkg: any) => (
                        <PackageCard key={pkg.id} pkg={pkg} nameStyle={listNameStyle} priceColor={listPriceColor} accent={accent} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
