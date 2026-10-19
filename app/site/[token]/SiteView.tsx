'use client'

import React, { useEffect, useState } from 'react'
import { FaqAccordion } from '../../p/[token]/FaqAccordion'
import { DateCheckWidget } from '../../p/[token]/DateCheckWidget'
import { ContactButton } from '../../p/[token]/ContactButton'
import { PortfolioLightbox } from '../../p/[token]/PortfolioLightbox'

const STORAGE_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/portfolio/`
  : ''
function photoUrl(path: string | null | undefined): string | null {
  return path ? `${STORAGE_BASE}${path}` : null
}

const PAIRS: Record<string, { head: string; body: string; css: string }> = {
  serif: {
    head: "'Cormorant Garamond', Georgia, serif",
    body: "'Montserrat', system-ui, sans-serif",
    css: 'family=Cormorant+Garamond:wght@400;500;600&family=Montserrat:wght@300;400;500;600',
  },
  modern: {
    head: "'Josefin Sans', system-ui, sans-serif",
    body: "'Work Sans', system-ui, sans-serif",
    css: 'family=Josefin+Sans:wght@300;400;600&family=Work+Sans:wght@300;400;500',
  },
  romantic: {
    head: "'Playfair Display', Georgia, serif",
    body: "'Lora', Georgia, serif",
    css: 'family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Lora:wght@400;500',
  },
}
const TEMPLATES = ['editorial', 'split', 'minimal']

export function SiteView({ initial, token }: { initial: Record<string, any>; token: string }) {
  const [r, setR] = useState<Record<string, any>>(initial)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('preview') !== '1') return
    function onMsg(e: MessageEvent) {
      const d = e.data as { type?: string; patch?: Record<string, any> } | null
      if (d && d.type === 'camrhia-preview' && d.patch) setR((prev) => ({ ...prev, ...d.patch }))
    }
    window.addEventListener('message', onMsg)
    window.parent?.postMessage({ type: 'camrhia-preview-ready' }, '*')
    return () => window.removeEventListener('message', onMsg)
  }, [])

  const tpl = TEMPLATES.includes(r.site_template) ? (r.site_template as string) : 'editorial'
  const pair = PAIRS[r.site_font_pair as string] ?? PAIRS.serif
  const accent = /^#[0-9a-fA-F]{3,8}$/.test(String(r.site_accent ?? '')) ? (r.site_accent as string) : (r.accent_color ?? '#A9545F')
  const ink = '#2A1F24'
  const soft = '#6F5E64'
  const line = 'rgba(42,31,36,0.12)'
  const bg = tpl === 'minimal' ? '#FFFFFF' : tpl === 'split' ? '#F6F1EA' : '#FAF7F2'
  const alt = tpl === 'minimal' ? '#F7F5F2' : '#F0EAE1'

  const name: string = r.studio_name ?? r.display_name ?? 'Studio'
  const cityLine = [[r.service_city, r.service_state].filter(Boolean).join(', '), r.location_custom_text || null].filter(Boolean).join(' · ')
  const headline: string = (r.site_headline || '').trim() || (r.service_city ? `${r.service_city} Photographer` : 'Photographer')
  const subhead: string = (r.site_subhead || '').trim() || cityLine
  const heroUrl = photoUrl((Array.isArray(r.cover_paths) && r.cover_paths.length > 0 ? r.cover_paths[0] : r.cover_path) as string | null)
  const logo = photoUrl(r.logo_path)
  const aboutPhoto = photoUrl(r.about_photo_path ?? r.avatar_path)
  const st: Record<string, string> = r.section_titles ?? {}

  const galleries = ((r.site_galleries ?? []) as any[])
    .map((g) => ({
      id: g.id as string,
      title: (g.title ?? '') as string,
      cover_photo_id: (g.cover_photo_id ?? null) as string | null,
      photos: [...(g.photos ?? [])].sort((x: any, y: any) => (x.sort_order ?? 0) - (y.sort_order ?? 0)) as any[],
    }))
    .filter((g) => g.photos.length > 0)
  const packages = ((r.packages ?? []) as any[]).filter((p) => p.show_public !== false && !!p.page_id)
  const quotes: { text: string; who: string }[] = [
    ...((r.testimonials ?? []) as any[]).filter((t) => t.quote).map((t) => ({ text: t.quote as string, who: (t.client_name ?? '') as string })),
    ...((r.reviews ?? []) as any[]).filter((v) => v.body).map((v) => ({ text: v.body as string, who: (v.couple_names ?? '') as string })),
  ]
  const faq = (r.faq ?? []) as any[]

  const hasAbout = r.show_bio_public !== false && !!(r.bio || aboutPhoto)
  const hasPortfolio = r.show_portfolio_public !== false && galleries.length > 0
  const hasInvest = r.show_pricing_public !== false && packages.length > 0
  const hasQuotes = r.show_testimonials_public !== false && quotes.length > 0
  const hasFaq = r.show_faq_public !== false && faq.length > 0

  const navItems: { id: string; label: string }[] = [{ id: 'top', label: 'Home' }]
  if (hasAbout) navItems.push({ id: 'about', label: 'About' })
  if (hasPortfolio) navItems.push({ id: 'portfolio', label: 'Portfolio' })
  if (hasInvest) navItems.push({ id: 'investment', label: 'Investment' })
  navItems.push({ id: 'contact', label: 'Contact' })

  const headStyle: React.CSSProperties = { fontFamily: pair.head, fontWeight: 500, letterSpacing: '0.01em' }

  const cta = () => (
    <a href="#contact" className="inline-block px-8 py-3 text-[11px] uppercase tracking-[0.22em]" style={{ background: accent, color: '#fff', fontFamily: pair.body }}>
      Check availability
    </a>
  )

  const renderNav = (overlay: boolean, center: boolean) => {
    const brand = logo
      ? // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt={name} style={{ height: 34, objectFit: 'contain' }} />
      : <span style={{ ...headStyle, fontSize: 24 }}>{name}</span>
    return (
      <nav
        className={overlay ? 'absolute inset-x-0 top-0 z-20' : 'sticky top-0 z-20'}
        style={overlay ? { color: '#fff' } : { color: ink, background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(8px)', borderBottom: `1px solid ${line}` }}
      >
        <div className={center ? 'mx-auto flex max-w-6xl flex-col items-center gap-3 px-6 py-4' : 'mx-auto flex h-16 max-w-6xl items-center justify-between px-6'}>
          <a href="#top">{brand}</a>
          <ul className="hidden gap-8 md:flex">
            {navItems.map((n) => (
              <li key={n.id}>
                <a href={`#${n.id}`} className="text-[11px] uppercase tracking-[0.2em] opacity-90 hover:opacity-100" style={{ fontFamily: pair.body }}>{n.label}</a>
              </li>
            ))}
          </ul>
          <button className="absolute right-5 top-4 md:hidden" aria-label="Menu" onClick={() => setOpen(!open)} style={{ fontSize: 22, lineHeight: 1 }}>
            {open ? '✕' : '☰'}
          </button>
        </div>
        {open && (
          <ul className="flex flex-col gap-4 px-6 pb-5 md:hidden" style={{ background: overlay ? 'rgba(0,0,0,0.72)' : '#fff' }}>
            {navItems.map((n) => (
              <li key={n.id}>
                <a href={`#${n.id}`} onClick={() => setOpen(false)} className="text-[12px] uppercase tracking-[0.2em]" style={{ fontFamily: pair.body }}>{n.label}</a>
              </li>
            ))}
          </ul>
        )}
      </nav>
    )
  }

  const heroImg = (cls: string) =>
    heroUrl
      ? // eslint-disable-next-line @next/next/no-img-element
        <img src={heroUrl} alt={name} className={cls} style={{ objectFit: 'cover' }} />
      : <div className={cls} style={{ background: accent, opacity: 0.85 }} />

  const sec = (id: string, title: string | null, children: React.ReactNode, tint?: boolean) => (
    <section id={id} className="scroll-mt-16 px-6 py-20 md:py-28" style={tint ? { background: alt } : undefined}>
      <div className="mx-auto max-w-6xl">
        {title && <h2 className="mb-12 text-center text-4xl md:text-5xl" style={headStyle}>{title}</h2>}
        {children}
      </div>
    </section>
  )

  const blocks = [
    hasAbout && { href: '#about', t: 'About', s: 'Get to know me' },
    hasPortfolio && { href: '#portfolio', t: 'Portfolio', s: 'See my work' },
    hasInvest && { href: '#investment', t: 'Investment', s: 'What does it cost?' },
  ].filter(Boolean) as { href: string; t: string; s: string }[]

  const socials = [
    { label: 'Instagram', url: r.instagram_url },
    { label: 'Facebook', url: r.facebook_url },
    { label: 'Pinterest', url: r.pinterest_url },
    { label: 'TikTok', url: r.tiktok_url },
    { label: 'Website', url: r.website_url },
  ].filter((s) => !!s.url)

  return (
    <>
      <link rel="stylesheet" href={`https://fonts.googleapis.com/css2?${pair.css}&display=swap`} />
      <style>{`html{scroll-behavior:smooth}html,body{background:${bg}}`}</style>
      <PortfolioLightbox />
      <div style={{ background: bg, color: ink, fontFamily: pair.body }}>
        {/* ── Hero ── */}
        {tpl === 'editorial' && (
          <header id="top" className="relative flex min-h-[92vh] flex-col overflow-hidden">
            {heroImg('absolute inset-0 h-full w-full')}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(rgba(0,0,0,0.38), rgba(0,0,0,0.12) 40%, rgba(0,0,0,0.58))' }} />
            {renderNav(true, false)}
            <div className="relative mx-auto mt-auto max-w-3xl px-6 pb-20 text-center text-white md:pb-28">
              <h1 className="text-5xl leading-[1.05] md:text-7xl" style={headStyle}>{headline}</h1>
              {subhead && <p className="mt-4 text-[12px] uppercase tracking-[0.28em] opacity-90">{subhead}</p>}
              <div className="mt-8">{cta()}</div>
            </div>
          </header>
        )}
        {tpl === 'split' && (
          <header id="top">
            {renderNav(false, false)}
            <div className="grid min-h-[calc(100vh-4rem)] md:grid-cols-2">
              <div className="order-2 flex flex-col justify-center px-8 py-16 md:order-1 md:px-16">
                {subhead && <p className="mb-5 text-[11px] uppercase tracking-[0.28em]" style={{ color: accent }}>{subhead}</p>}
                <h1 className="text-5xl leading-[1.05] md:text-6xl" style={headStyle}>{headline}</h1>
                <p className="mt-6 max-w-md text-[15px] leading-relaxed" style={{ color: soft }}>
                  {(r.bio || '').toString().split(/\n+/)[0].slice(0, 220)}
                </p>
                <div className="mt-8">{cta()}</div>
              </div>
              <div className="relative order-1 min-h-[60vh] md:order-2">{heroImg('absolute inset-0 h-full w-full')}</div>
            </div>
          </header>
        )}
        {tpl === 'minimal' && (
          <header id="top">
            {renderNav(false, true)}
            <div className="mx-auto max-w-6xl px-6 pt-6">
              <div className="relative aspect-[16/10] overflow-hidden md:aspect-[21/9]">{heroImg('absolute inset-0 h-full w-full')}</div>
            </div>
            <div className="px-6 py-14 text-center">
              <h1 className="text-4xl md:text-6xl" style={headStyle}>{headline}</h1>
              {subhead && <p className="mt-4 text-[11px] uppercase tracking-[0.28em]" style={{ color: soft }}>{subhead}</p>}
              <div className="mt-8">{cta()}</div>
            </div>
          </header>
        )}

        {/* ── Three doors ── */}
        {blocks.length > 0 && (
          <div className="mx-auto grid max-w-6xl gap-0 px-6 py-16 md:grid-cols-3">
            {blocks.map((b, i) => (
              <a key={b.href} href={b.href} className="group block px-6 py-8 text-center" style={{ borderTop: `1px solid ${line}`, borderLeft: i > 0 ? `1px solid ${line}` : undefined }}>
                <p className="text-3xl" style={headStyle}>{b.t}</p>
                <p className="mt-2 text-[11px] uppercase tracking-[0.22em]" style={{ color: accent }}>{b.s} →</p>
              </a>
            ))}
          </div>
        )}

        {/* ── About ── */}
        {hasAbout && sec('about', st.about || 'About',
          <div className={`mx-auto grid max-w-5xl items-center gap-12 ${aboutPhoto ? 'md:grid-cols-2' : ''}`}>
            {aboutPhoto && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={aboutPhoto} alt={name} className="w-full" style={{ aspectRatio: '4/5', objectFit: 'cover' }} />
            )}
            <div>
              <p className="whitespace-pre-line text-[16px] leading-[1.85]" style={{ color: soft }}>{r.bio || ''}</p>
              <div className="mt-8">{cta()}</div>
            </div>
          </div>, true)}

        {/* ── Portfolio ── */}
        {hasPortfolio && sec('portfolio', 'Portfolio',
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {galleries.map((g) => {
              const cover = g.photos.find((p: any) => p.id === g.cover_photo_id) ?? g.photos[0]
              const u = photoUrl(cover?.storage_path)
              return (
                <a key={g.id} href={`/site/${token}/g/${g.id}`} className="group relative block overflow-hidden" style={{ aspectRatio: '4/5', background: '#E5E1DB' }}>
                  {u && <img src={u} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />}
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(transparent 55%, rgba(0,0,0,0.62))' }} />
                  <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                    <p className="text-3xl" style={headStyle}>{g.title}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.22em] opacity-90">{g.photos.length} photos →</p>
                  </div>
                </a>
              )
            })}
          </div>)}

        {/* ── Investment ── */}
        {hasInvest && sec('investment', st.pricing || 'Investment',
          <div className="mx-auto max-w-3xl">
            {packages.map((p, i) => {
              const desc = (p.description ?? p.details ?? p.blurb ?? '') as string
              return (
                <div key={p.id} className="flex items-start justify-between gap-6 py-6" style={{ borderTop: i > 0 ? `1px solid ${line}` : undefined }}>
                  <div>
                    <h3 className="text-2xl" style={headStyle}>{p.name}</h3>
                    {desc && <p className="mt-1 whitespace-pre-line text-sm leading-relaxed" style={{ color: soft }}>{desc}</p>}
                  </div>
                  {p.price && <span className="whitespace-nowrap text-lg" style={{ color: accent, fontFamily: pair.head }}>{p.price}</span>}
                </div>
              )
            })}
            <div className="mt-10 text-center">
              <a href={`/p/${token}/packages`} className="text-[11px] uppercase tracking-[0.22em]" style={{ color: accent }}>See full details →</a>
            </div>
          </div>, true)}

        {/* ── Kind words ── */}
        {hasQuotes && sec('words', st.testimonials || 'Kind words',
          <div className="grid gap-10 md:grid-cols-3">
            {quotes.slice(0, 6).map((q, i) => (
              <figure key={i} className="text-center">
                <blockquote className="text-xl italic leading-relaxed" style={{ fontFamily: pair.head }}>&ldquo;{q.text}&rdquo;</blockquote>
                {q.who && <figcaption className="mt-4 text-[11px] uppercase tracking-[0.22em]" style={{ color: soft }}>{q.who}</figcaption>}
              </figure>
            ))}
          </div>)}

        {/* ── FAQ ── */}
        {hasFaq && sec('faq', st.faq || 'FAQ',
          <div className="mx-auto max-w-2xl">
            <FaqAccordion
              items={faq}
              questionStyle={{ fontFamily: pair.head, fontSize: 20, color: ink }}
              answerStyle={{ fontFamily: pair.body, fontSize: 15, color: soft, lineHeight: 1.7 }}
            />
          </div>, true)}

        {/* ── Contact ── */}
        {sec('contact', "Let's connect",
          <div className="mx-auto max-w-xl text-center">
            <p className="mb-8 text-[15px] leading-relaxed" style={{ color: soft }}>
              Tell me about your day. Check a date below, or tap the message button to send me an inquiry.
            </p>
            {r.show_availability_public !== false && r.openings_display_mode !== 'badge' && (
              <div className="mb-10">
                <DateCheckWidget photographerId={r.photographer_id} accent={accent} fontFamily={pair.head} />
              </div>
            )}
            {socials.length > 0 && (
              <div className="flex flex-wrap justify-center gap-x-8 gap-y-3">
                {socials.map((s) => (
                  <a key={s.label} href={String(s.url).startsWith('http') ? s.url : `https://${s.url}`} target="_blank" rel="noopener noreferrer"
                    className="text-[11px] uppercase tracking-[0.22em]" style={{ color: accent }}>{s.label}</a>
                ))}
              </div>
            )}
          </div>)}

        <footer className="px-6 pb-28 pt-6 text-center text-[11px] uppercase tracking-[0.2em]" style={{ color: soft }}>
          © {new Date().getFullYear()} {name} · <a href="https://camrhia.com" style={{ color: accent }}>Powered by Camrhia</a>
        </footer>
      </div>

      <ContactButton
        photographerId={r.photographer_id}
        studioName={name}
        accent={accent}
        btn={{
          bg: accent,
          textColor: '#FFFFFF',
          fontFamily: pair.head,
          fontSize: 16,
          text: 'Inquire',
          showIcon: true,
          width: null,
          align: 'right',
        } as any}
      />
    </>
  )
}
