import { supabase } from "@/lib/supabase"
import { BRAND_NAME } from "@/lib/brand"
import Link from "next/link"
import React from "react"
import { FaqAccordion } from "./FaqAccordion"

// Same shape geometry as the app's lib/customShapes.ts — kept in sync
// manually since this is a separate codebase from the mobile app.
function getShapePolygonPoints(type: string, w: number, h: number): string {
  switch (type) {
    case 'triangle': return `${w / 2},0 ${w},${h} 0,${h}`
    case 'diamond': return `${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}`
    case 'hexagon': return `${w * 0.25},0 ${w * 0.75},0 ${w},${h * 0.5} ${w * 0.75},${h} ${w * 0.25},${h} 0,${h * 0.5}`
    case 'octagon': return `${w * 0.3},0 ${w * 0.7},0 ${w},${h * 0.3} ${w},${h * 0.7} ${w * 0.7},${h} ${w * 0.3},${h} 0,${h * 0.7} 0,${h * 0.3}`
    case 'pentagon': return `${w * 0.5},0 ${w},${h * 0.38} ${w * 0.82},${h} ${w * 0.18},${h} 0,${h * 0.38}`
    case 'cross': {
      const a = w / 3, b = (w * 2) / 3, c = h / 3, d = (h * 2) / 3
      return `${a},0 ${b},0 ${b},${c} ${w},${c} ${w},${d} ${b},${d} ${b},${h} ${a},${h} ${a},${d} 0,${d} 0,${c} ${a},${c}`
    }
    case 'parallelogram': return `${w * 0.25},0 ${w},0 ${w * 0.75},${h} 0,${h}`
    case 'star': {
      const cx = w / 2, cy = h / 2
      const outerRx = w / 2, outerRy = h / 2
      const innerRx = outerRx * 0.38, innerRy = outerRy * 0.38
      const points: string[] = []
      for (let i = 0; i < 10; i++) {
        const angle = (Math.PI / 5) * i - Math.PI / 2
        const rx = i % 2 === 0 ? outerRx : innerRx
        const ry = i % 2 === 0 ? outerRy : innerRy
        points.push(`${(cx + rx * Math.cos(angle)).toFixed(1)},${(cy + ry * Math.sin(angle)).toFixed(1)}`)
      }
      return points.join(' ')
    }
    default: return `${w / 2},0 ${w},${h} 0,${h}`
  }
}
function getArchPath(w: number, h: number): string {
  const r = w / 2
  return `M0,${h} L0,${r} A${r},${r} 0 0 1 ${w},${r} L${w},${h} Z`
}
const HEART_PATH_D =
  'M12,21.35 L10.55,20.03 C5.4,15.36 2,12.28 2,8.5 C2,5.42 4.42,3 7.5,3 ' +
  'C9.24,3 10.91,3.81 12,5.09 C13.09,3.81 14.76,3 16.5,3 C19.58,3 22,5.42 22,8.5 ' +
  'C22,12.28 18.6,15.36 13.45,20.04 Z'
function getHeartTransform(w: number, h: number): string {
  return `scale(${(w / 24).toFixed(4)}, ${(h / 24).toFixed(4)})`
}

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
const FONT_MAP: Record<string, { family: string; weight: string }> = {
  playfair_display:   { family: 'Playfair+Display:wght@700', weight: '700' },
  cormorant_garamond:  { family: 'Cormorant+Garamond:wght@600', weight: '600' },
  libre_baskerville:  { family: 'Libre+Baskerville:wght@700', weight: '700' },
  eb_garamond:        { family: 'EB+Garamond:wght@600', weight: '600' },
  lora:               { family: 'Lora:wght@600', weight: '600' },
  crimson_pro:        { family: 'Crimson+Pro:wght@600', weight: '600' },
  bodoni_moda:        { family: 'Bodoni+Moda:wght@700', weight: '700' },
  dm_serif_display:   { family: 'DM+Serif+Display', weight: '400' },
  italiana:           { family: 'Italiana', weight: '400' },
  great_vibes:        { family: 'Great+Vibes', weight: '400' },
  parisienne:         { family: 'Parisienne', weight: '400' },
  sacramento:         { family: 'Sacramento', weight: '400' },
  allura:             { family: 'Allura', weight: '400' },
  pinyon_script:      { family: 'Pinyon+Script', weight: '400' },
  alex_brush:         { family: 'Alex+Brush', weight: '400' },
  montserrat:         { family: 'Montserrat:wght@700', weight: '700' },
  poppins:            { family: 'Poppins:wght@600', weight: '600' },
  josefin_sans:       { family: 'Josefin+Sans:wght@600', weight: '600' },
  raleway:            { family: 'Raleway:wght@700', weight: '700' },
  work_sans:          { family: 'Work+Sans:wght@600', weight: '600' },
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

function fontFamilyFor(key: string | null | undefined, fallback: string): string {
  if (!key) return fallback
  return FONT_CSS_NAME[key] ? `'${FONT_CSS_NAME[key]}', ${fallback}` : fallback
}

// Builds a style object for a titled text element from the granular
// font/size/color/bold/italic/align/shadow fields the app stores per section —
// same fields, same meaning, just expressed as CSS instead of RN StyleSheet.
function textStyle(opts: {
  font?: string | null; size?: number | null; color?: string | null;
  bold?: boolean | null; italic?: boolean | null; align?: string | null;
  shadow?: boolean | null; shadowColor?: string | null;
  shadowOffsetX?: number | null; shadowOffsetY?: number | null; shadowBlur?: number | null;
  fallbackFont: string; fallbackColor: string; fallbackSize: number;
}): React.CSSProperties {
  const style: React.CSSProperties = {
    fontFamily: fontFamilyFor(opts.font, opts.fallbackFont),
    fontSize: opts.size ?? opts.fallbackSize,
    color: opts.color ?? opts.fallbackColor,
    fontWeight: opts.bold ? 700 : undefined,
    fontStyle: opts.italic ? 'italic' : undefined,
    textAlign: (opts.align as React.CSSProperties['textAlign']) ?? undefined,
  }
  if (opts.shadow) {
    const ox = opts.shadowOffsetX ?? 1
    const oy = opts.shadowOffsetY ?? 1
    const blur = opts.shadowBlur ?? 2
    style.textShadow = `${ox}px ${oy}px ${blur}px ${opts.shadowColor ?? 'rgba(0,0,0,0.3)'}`
  }
  return style
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

  const r = result as Record<string, any>
  const studioName = r.studio_name ?? r.display_name ?? 'Studio'
  const cityLine = [
    [r.service_city, r.service_state].filter(Boolean).join(', '),
    r.location_custom_text || null,
  ].filter(Boolean).join(' · ')

  const bgColor = r.portfolio_bg_color ?? '#FAF8F5'
  const bgStyle: React.CSSProperties = r.portfolio_bg_gradient_enabled
    ? { background: `linear-gradient(${r.portfolio_bg_gradient_direction === 'horizontal' ? '90deg' : '180deg'}, ${r.portfolio_bg_gradient_start ?? bgColor}, ${r.portfolio_bg_gradient_end ?? bgColor})` }
    : { backgroundColor: bgColor }

  const sectionOrder: string[] = r.section_order?.length
    ? [...r.section_order, ...['featured_photos', 'about', 'testimonials', 'pricing', 'openings', 'faq', 'links'].filter((k: string) => !r.section_order.includes(k))]
    : ['featured_photos', 'about', 'testimonials', 'pricing', 'openings', 'faq', 'links']

  const sectionTitles: Record<string, string> = r.section_titles ?? {}
  const usedFontKeys = new Set<string>([r.title_font, r.location_font, r.paragraph_font, r.master_section_font].filter(Boolean))

  const titleStyle = textStyle({
    font: r.title_font, size: r.title_font_size, color: r.title_color,
    bold: r.title_bold, italic: r.title_italic, align: r.title_align ?? 'center',
    shadow: r.title_shadow, shadowColor: r.title_shadow_color,
    shadowOffsetX: r.title_shadow_offset_x, shadowOffsetY: r.title_shadow_offset_y, shadowBlur: r.title_shadow_blur,
    fallbackFont: "'Fraunces', serif", fallbackColor: '#2B2B2B', fallbackSize: 34,
  })
  const locationStyle = textStyle({
    font: r.location_font, size: r.location_font_size, color: r.location_color,
    bold: r.location_bold, italic: r.location_italic, align: r.location_align ?? 'center',
    shadow: r.location_shadow, shadowColor: r.location_shadow_color,
    shadowOffsetX: r.location_shadow_offset_x, shadowOffsetY: r.location_shadow_offset_y, shadowBlur: r.location_shadow_blur,
    fallbackFont: "system-ui, sans-serif", fallbackColor: '#6B6B6B', fallbackSize: 14,
  })
  function sectionTitleStyle(key: string): React.CSSProperties {
    const custom = r.section_styles?.[key]
    if (custom) {
      return textStyle({
        font: custom.font, size: custom.size, color: custom.color, bold: custom.bold, italic: custom.italic,
        align: custom.align, shadow: custom.shadow, shadowColor: custom.shadowColor,
        shadowOffsetX: custom.shadowOffsetX, shadowOffsetY: custom.shadowOffsetY, shadowBlur: custom.shadowBlur,
        fallbackFont: "system-ui, sans-serif", fallbackColor: '#2B2B2B', fallbackSize: 20,
      })
    }
    if (r.master_section_style_enabled) {
      return textStyle({
        font: r.master_section_font, size: r.master_section_size, color: r.master_section_color,
        bold: r.master_section_bold, italic: r.master_section_italic, align: r.master_section_align,
        shadow: r.master_section_shadow, shadowColor: r.master_section_shadow_color,
        shadowOffsetX: r.master_section_shadow_offset_x, shadowOffsetY: r.master_section_shadow_offset_y, shadowBlur: r.master_section_shadow_blur,
        fallbackFont: "system-ui, sans-serif", fallbackColor: '#2B2B2B', fallbackSize: 20,
      })
    }
    return { fontFamily: "system-ui, sans-serif", fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase', color: '#8A8A8A', textAlign: 'center' }
  }
  const paragraphStyle = textStyle({
    font: r.paragraph_font, size: r.paragraph_font_size, color: r.paragraph_color,
    bold: r.paragraph_bold, italic: r.paragraph_italic, align: r.paragraph_align ?? 'left',
    shadow: r.paragraph_shadow, shadowColor: r.paragraph_shadow_color,
    shadowOffsetX: r.paragraph_shadow_offset_x, shadowOffsetY: r.paragraph_shadow_offset_y, shadowBlur: r.paragraph_shadow_blur,
    fallbackFont: "system-ui, sans-serif", fallbackColor: '#4A4A4A', fallbackSize: 15,
  })

  const fontLinks = [...usedFontKeys].map(k => FONT_MAP[k]?.family).filter(Boolean)

  return (
    <>
      {fontLinks.length > 0 && (
        <link rel="stylesheet" href={`https://fonts.googleapis.com/css2?${fontLinks.map(f => `family=${f}`).join('&')}&display=swap`} />
      )}
      <div style={{ minHeight: '100vh', ...bgStyle }}>
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', overflow: 'hidden', backgroundColor: '#E5E1DB' }}>
          {photoUrl(r.cover_path) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl(r.cover_path)!} alt={studioName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          )}
        </div>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '28px 24px 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            {photoUrl(r.logo_path) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl(r.logo_path)!} alt={studioName} style={{ height: 40, objectFit: 'contain', marginBottom: 8 }} />
            ) : (
              <h1 style={titleStyle}>{studioName}</h1>
            )}
            {cityLine && <p style={locationStyle}>{cityLine}</p>}
          </div>
        </div>

        {/* ── Sections ─────────────────────────────────────────────────── */}
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 24px 60px' }}>
          {sectionOrder.map((key: string) => {
            const spacingStyle: React.CSSProperties = { paddingTop: r.portfolio_section_spacing ?? 14, paddingBottom: 10 }

            if (key === 'about' && r.show_bio_public !== false) {
              return (
                <div key="about" style={spacingStyle}>
                  <h2 style={{ ...sectionTitleStyle('about'), marginBottom: r.portfolio_title_spacing ?? 10 }}>
                    {sectionTitles.about || 'About'}
                  </h2>
                  <div style={{ backgroundColor: '#fff', borderRadius: 12, padding: 20 }}>
                    <p style={paragraphStyle}>{r.bio || ''}</p>
                  </div>
                </div>
              )
            }

            if (key === 'featured_photos' && r.show_portfolio_public !== false) {
              const weddings: any[] = r.featured_weddings ?? []
              if (weddings.length === 0) return null
              return (
                <div key="featured_photos" style={spacingStyle}>
                  <h2 style={{ ...sectionTitleStyle('featured_photos'), marginBottom: r.portfolio_title_spacing ?? 10 }}>
                    {sectionTitles.featured_photos || 'Featured photos'}
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
                    {weddings.map((w: any) => {
                      const photos = [...(w.photos ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order)
                      if (photos.length === 0) return null
                      const layoutKey = w.layout_key ?? 'hero_7'

                      // Custom layout — photographer-positioned shapes, each with its own
                      // size/position/shape-type, scaled to fit this page's content width.
                      if (layoutKey === 'custom') {
                        const CONTENT_W = 592 // 640 maxWidth minus 24px padding each side
                        const savedW = w.custom_card_width ?? CONTENT_W
                        const savedH = w.custom_card_height ?? CONTENT_W
                        const scale = CONTENT_W / savedW
                        const deepestBottom = photos.reduce((max: number, p: any) => Math.max(max, (p.pos_y ?? 0) + (p.shape_height ?? 100)), 0)
                        const canvasH = Math.floor(Math.max(savedH, deepestBottom) * scale)
                        return (
                          <div key={w.id}>
                            {w.title && <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, marginBottom: 10 }}>{w.title}</h3>}
                            <div style={{ position: 'relative', width: CONTENT_W, height: canvasH, margin: '0 auto' }}>
                              {photos.map((photo: any) => {
                                const shapeType = photo.shape_type ?? 'square'
                                const shapeW = Math.floor((photo.shape_width ?? 100) * scale)
                                const shapeH = Math.floor((photo.shape_height ?? 100) * scale)
                                const shapeX = Math.floor((photo.pos_x ?? 0) * scale)
                                const shapeY = Math.floor((photo.pos_y ?? 0) * scale)
                                const uri = photoUrl(photo.storage_path)
                                const isPolygon = ['triangle','diamond','hexagon','octagon','pentagon','star','cross','parallelogram'].includes(shapeType)
                                const isOval = shapeType === 'oval'
                                const isHeart = shapeType === 'heart'
                                const isArch = shapeType === 'arch'
                                const isRect = shapeType === 'square' || shapeType === 'rect_portrait' || shapeType === 'rect_landscape'
                                const isCircle = shapeType === 'circle'
                                const radius = photo.corner_radius ?? 10
                                const clipId = `clip-${photo.id}`
                                if (isRect || isCircle) {
                                  return (
                                    <div key={photo.id} style={{
                                      position: 'absolute', left: shapeX, top: shapeY, width: shapeW, height: shapeH,
                                      borderRadius: isCircle ? '50%' : radius, overflow: 'hidden',
                                      border: photo.border_width ? `${photo.border_width}px solid ${photo.border_color || 'transparent'}` : undefined,
                                    }}>
                                      {uri && <img src={uri} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                    </div>
                                  )
                                }
                                // Polygon / oval / heart / arch — SVG clip-path, same geometry the app uses.
                                let clipShape: React.ReactNode = null
                                if (isPolygon) {
                                  const pts = getShapePolygonPoints(shapeType, shapeW, shapeH)
                                  clipShape = <polygon points={pts} />
                                } else if (isOval) {
                                  clipShape = <ellipse cx={shapeW / 2} cy={shapeH / 2} rx={shapeW / 2} ry={shapeH / 2} />
                                } else if (isArch) {
                                  clipShape = <path d={getArchPath(shapeW, shapeH)} />
                                } else if (isHeart) {
                                  clipShape = <path d={HEART_PATH_D} transform={getHeartTransform(shapeW, shapeH)} />
                                }
                                return (
                                  <div key={photo.id} style={{ position: 'absolute', left: shapeX, top: shapeY, width: shapeW, height: shapeH }}>
                                    <svg width={shapeW} height={shapeH}>
                                      <defs><clipPath id={clipId}>{clipShape}</clipPath></defs>
                                      {uri && (
                                        <image href={uri} width={shapeW} height={shapeH} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clipId})`} />
                                      )}
                                      {photo.border_width > 0 && clipShape && React.cloneElement(clipShape as React.ReactElement, {
                                        fill: 'none', stroke: photo.border_color || 'transparent', strokeWidth: photo.border_width,
                                      } as any)}
                                    </svg>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      }

                      // Preset layouts — clean responsive grid (exact preset arrangement
                      // is app-only for now; this shows every photo attractively).
                      return (
                        <div key={w.id}>
                          {w.title && <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, marginBottom: 10 }}>{w.title}</h3>}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                            {photos.map((photo: any) => {
                              const uri = photoUrl(photo.storage_path)
                              return (
                                <div key={photo.id} style={{ aspectRatio: '1', borderRadius: 10, overflow: 'hidden', backgroundColor: '#E5E1DB' }}>
                                  {uri && <img src={uri} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            }

            if (key === 'pricing') {
              const hasCustomImages = r.pricing_display_mode === 'custom_image' && (r.pricing_custom_images?.length ?? 0) > 0
              const hasPackages = (r.packages ?? []).some((p: any) => p.show_public !== false && !!p.page_id)
              if (!(hasCustomImages || hasPackages) || r.show_pricing_public === false) return null
              const hasCoverPhoto = !!r.pricing_cover_image_path
              const publicPackages = (r.packages ?? []).filter((p: any) => p.show_public !== false)
              return (
                <div key="pricing" id="pricing-section" style={spacingStyle}>
                  <h2 style={{ ...sectionTitleStyle('pricing'), marginBottom: r.portfolio_title_spacing ?? 10 }}>
                    {sectionTitles.pricing || 'Packages'}
                  </h2>
                  <div style={{
                    position: 'relative', width: '100%', aspectRatio: '16/9', borderRadius: 12, overflow: 'hidden',
                    backgroundColor: r.portfolio_bg_color ?? '#fff', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', border: hasCoverPhoto ? undefined : '1px solid #eee',
                    marginBottom: 24,
                  }}>
                    {hasCoverPhoto && photoUrl(r.pricing_cover_image_path) && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photoUrl(r.pricing_cover_image_path)!} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                    {hasCoverPhoto && (
                      <div style={{ position: 'absolute', inset: 0, backgroundColor: `rgba(0,0,0,${r.pricing_cover_overlay_opacity ?? 0.35})` }} />
                    )}
                    <p style={{
                      position: 'relative', fontFamily: fontFamilyFor(r.pricing_cover_title_font, "'Fraunces', serif"),
                      fontSize: r.pricing_cover_title_size ?? 16,
                      color: r.pricing_cover_title_color ?? (hasCoverPhoto ? '#FFFFFF' : '#2B2B2B'),
                      textAlign: 'center', padding: '0 20px', margin: 0,
                    }}>{r.pricing_cover_title || 'View Packages'}</p>
                    <p style={{
                      position: 'relative', fontFamily: fontFamilyFor(r.pricing_cover_subtitle_font, "system-ui, sans-serif"),
                      fontSize: r.pricing_cover_subtitle_size ?? 12.5,
                      color: r.pricing_cover_subtitle_color ?? (hasCoverPhoto ? 'rgba(255,255,255,0.85)' : '#8A8A8A'),
                      textAlign: 'center', padding: '0 20px', marginTop: 4,
                    }}>{r.pricing_cover_subtitle || ''}</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {publicPackages.map((pkg: any) => (
                      <div key={pkg.id} style={{ backgroundColor: '#fff', borderRadius: 12, padding: 18 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 17, margin: 0 }}>{pkg.name}</h3>
                          {pkg.price && <span style={{ fontFamily: "system-ui, sans-serif", fontWeight: 600, fontSize: 15 }}>{pkg.price}</span>}
                        </div>
                        {pkg.covers && <p style={{ fontFamily: "system-ui, sans-serif", fontSize: 13, color: '#8A8A8A', marginTop: 4 }}>{pkg.covers}</p>}
                        {pkg.detail && <p style={{ fontFamily: "system-ui, sans-serif", fontSize: 14, color: '#4A4A4A', marginTop: 8, lineHeight: 1.5 }}>{pkg.detail}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )
            }

            if (key === 'testimonials' && (r.testimonials?.length ?? 0) > 0 && r.show_testimonials_public !== false) {
              return (
                <div key="testimonials" style={spacingStyle}>
                  <h2 style={{ ...sectionTitleStyle('testimonials'), marginBottom: r.portfolio_title_spacing ?? 10 }}>
                    {sectionTitles.testimonials || 'Testimonials'}
                  </h2>
                  <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 8 }}>
                    {r.testimonials.map((t: any) => (
                      <div key={t.id} style={{
                        minWidth: 260, flexShrink: 0, borderRadius: 12, overflow: 'hidden', position: 'relative',
                        backgroundColor: t.card_bg_color ?? '#fff', aspectRatio: '4/5',
                      }}>
                        {photoUrl(t.storage_path) && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={photoUrl(t.storage_path)!} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: t.photo_opacity ?? 1 }} />
                        )}
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 18, background: photoUrl(t.storage_path) ? 'linear-gradient(transparent 40%, rgba(0,0,0,0.6))' : undefined }}>
                          {t.quote && <p style={{ color: photoUrl(t.storage_path) ? '#fff' : '#2B2B2B', fontFamily: "'Fraunces', serif", fontStyle: 'italic', fontSize: 15, lineHeight: 1.4, margin: 0 }}>&ldquo;{t.quote}&rdquo;</p>}
                          {t.client_name && <p style={{ color: photoUrl(t.storage_path) ? 'rgba(255,255,255,0.85)' : '#8A8A8A', fontFamily: "system-ui, sans-serif", fontSize: 12, marginTop: 8 }}>{t.client_name}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            }

            if (key === 'faq' && r.show_faq_public !== false) {
              const faqItems = (r.faq?.length ?? 0) > 0 ? r.faq : [
                { question: 'When will we receive our photos?', answer: 'Sneak peeks are typically shared within 48 hours, with the full gallery delivered within 1–6 weeks depending on the session type.' },
                { question: "What's included in your packages, and can they be customized?", answer: 'Each package includes a set number of coverage hours and edited images — see the Pricing section for full details. Reach out to discuss custom add-ons.' },
                { question: 'Do you have a backup plan if something happens on the day of the session?', answer: 'Yes — we always have contingency plans in place, including backup equipment and a network of trusted second shooters, so your session is covered no matter what.' },
              ]
              return (
                <div key="faq" style={spacingStyle}>
                  <h2 style={{ ...sectionTitleStyle('faq'), marginBottom: r.portfolio_title_spacing ?? 10 }}>
                    {sectionTitles.faq || 'FAQ'}
                  </h2>
                  <FaqAccordion
                    items={faqItems}
                    questionStyle={{ fontFamily: "system-ui, sans-serif", fontWeight: 600, fontSize: 14.5, color: '#2B2B2B' }}
                    answerStyle={{ fontFamily: "system-ui, sans-serif", fontSize: 14, color: '#6B6B6B', lineHeight: 1.5 }}
                  />
                </div>
              )
            }

            if (key === 'links' && r.show_socials_public !== false) {
              const brandLinks = [
                { url: r.instagram_url, icon: 'instagram' },
                { url: r.facebook_url, icon: 'facebook' },
                { url: r.pinterest_url, icon: 'pinterest' },
                { url: r.tiktok_url, icon: 'tiktok' },
              ].filter((l: any) => !!l.url)
              const websiteUrl = r.website_url ?? null
              if (!websiteUrl && brandLinks.length === 0) return null
              const iconPaths: Record<string, string> = {
                instagram: 'M12 2.16c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.64.07-4.85.07s-3.58-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85C2.38 3.92 3.9 2.38 7.15 2.23 8.42 2.17 8.8 2.16 12 2.16zM12 0C8.74 0 8.33.01 7.05.07 2.7.27.27 2.69.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.2 4.36 2.62 6.78 6.98 6.98C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c4.35-.2 6.78-2.62 6.98-6.98.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.2-4.35-2.62-6.78-6.98-6.98C15.67.01 15.26 0 12 0zm0 5.84A6.16 6.16 0 1 0 12 18.16 6.16 6.16 0 0 0 12 5.84zm0 10.16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.4-10.4a1.44 1.44 0 1 1-2.88 0 1.44 1.44 0 0 1 2.88 0z',
                facebook: 'M22.68 0H1.32C.59 0 0 .59 0 1.32v21.36C0 23.41.59 24 1.32 24h11.5v-9.29H9.69v-3.62h3.13V8.41c0-3.1 1.89-4.79 4.66-4.79 1.32 0 2.46.1 2.79.14v3.24h-1.92c-1.5 0-1.8.72-1.8 1.77v2.31h3.59l-.47 3.62h-3.12V24h6.11c.73 0 1.32-.59 1.32-1.32V1.32C24 .59 23.41 0 22.68 0z',
                pinterest: 'M12 0C5.37 0 0 5.37 0 12c0 5.08 3.16 9.42 7.62 11.17-.1-.95-.2-2.4.04-3.44.22-.94 1.4-6 1.4-6s-.36-.72-.36-1.77c0-1.66.96-2.9 2.16-2.9 1.02 0 1.51.77 1.51 1.68 0 1.03-.65 2.56-.99 3.99-.28 1.19.6 2.17 1.78 2.17 2.13 0 3.77-2.25 3.77-5.49 0-2.87-2.06-4.88-5.01-4.88-3.41 0-5.42 2.56-5.42 5.2 0 1.03.4 2.13.89 2.73a.36.36 0 0 1 .08.34c-.09.38-.29 1.19-.33 1.35-.05.22-.17.26-.4.16-1.48-.69-2.4-2.85-2.4-4.59 0-3.74 2.72-7.17 7.83-7.17 4.11 0 7.31 2.93 7.31 6.84 0 4.08-2.57 7.36-6.14 7.36-1.2 0-2.33-.62-2.71-1.36l-.74 2.81c-.27 1.03-1 2.33-1.48 3.12A12 12 0 1 0 12 0z',
                tiktok: 'M16.6 5.82s.51.5 0 0A4.278 4.278 0 0 1 15.54 3h-3.09v12.4a2.592 2.592 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.31 1.38V7.3s-1.88.09-3.25-1.48z',
              }
              return (
                <div key="links" style={spacingStyle}>
                  <h2 style={{ ...sectionTitleStyle('links'), marginBottom: r.portfolio_title_spacing ?? 10 }}>
                    {sectionTitles.links || 'Links'}
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
                    {brandLinks.length > 0 && (
                      <div style={{ display: 'flex', gap: r.links_icon_spacing ?? 20 }}>
                        {brandLinks.map((l: any) => (
                          <a key={l.icon} href={l.url.startsWith('http') ? l.url : `https://${l.url}`} target="_blank" rel="noopener noreferrer">
                            <svg width={r.links_icon_size ?? 20} height={r.links_icon_size ?? 20} viewBox="0 0 24 24" fill={r.links_icon_color ?? '#6B6B6B'}>
                              <path d={iconPaths[l.icon]} />
                            </svg>
                          </a>
                        ))}
                      </div>
                    )}
                    {websiteUrl && (
                      <a href={websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "system-ui, sans-serif", fontSize: 14, color: '#4A4A4A' }}>
                        {websiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                      </a>
                    )}
                  </div>
                </div>
              )
            }

            return null
          })}

          {(r.reviews?.length ?? 0) > 0 && (
            <div style={{ paddingTop: r.portfolio_section_spacing ?? 14, paddingBottom: 10 }}>
              <h2 style={{ fontFamily: "system-ui, sans-serif", fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase', color: '#8A8A8A', textAlign: 'center', marginBottom: 14 }}>
                What couples say
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {r.reviews.map((rev: any, i: number) => (
                  <div key={i} style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16 }}>
                    <p style={{ fontFamily: "system-ui, sans-serif", fontSize: 14, color: '#4A4A4A', lineHeight: 1.5, margin: 0 }}>{rev.body}</p>
                    <p style={{ fontFamily: "system-ui, sans-serif", fontSize: 12, color: '#8A8A8A', marginTop: 8 }}>{rev.couple_names}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
