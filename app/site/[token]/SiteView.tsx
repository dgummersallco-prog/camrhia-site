'use client'

import { TestimonialCarousel } from './TestimonialCarousel'
import React, { useEffect, useState } from 'react'
import { FaqAccordion } from '../../p/[token]/FaqAccordion'
import { PortfolioLightbox } from '../../p/[token]/PortfolioLightbox'
import { resolveTheme, NAV_DEFAULTS } from '@/lib/siteTheme'

const STORAGE_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/portfolio/`
  : ''
function photoUrl(path: string | null | undefined): string | null {
  return path ? `${STORAGE_BASE}${path}` : null
}

type PageKey = 'home' | 'about' | 'galleries'

export function SiteView({ initial, token, page = 'home' }: { initial: Record<string, any>; token: string; page?: PageKey }) {
  const [r, setR] = useState<Record<string, any>>(initial)
  const [open, setOpen] = useState(false)
  const [slide, setSlide] = useState(0)
  const [isPreview, setIsPreview] = useState(false)

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('preview') !== '1') return
    setIsPreview(true)
    function onMsg(e: MessageEvent) {
      const d = e.data as { type?: string; patch?: Record<string, any>; id?: string } | null
      if (d && d.type === 'camrhia-preview' && d.patch) setR((prev) => ({ ...prev, ...d.patch }))
      if (d && d.type === 'camrhia-scroll' && d.id) {
        const el = document.getElementById(d.id)
        if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 64, behavior: 'smooth' })
      }
      if (d && d.type === 'camrhia-outline') {
        document.querySelectorAll('[data-cr-outline]').forEach((n) => { (n as HTMLElement).style.outline = ''; n.removeAttribute('data-cr-outline') })
        const el = d.id ? document.getElementById(d.id) : null
        if (el) { el.style.outline = '2px dashed #B08D57'; el.style.outlineOffset = '-6px'; el.setAttribute('data-cr-outline', '1') }
      }
    }
    window.addEventListener('message', onMsg)
    window.parent?.postMessage({ type: 'camrhia-preview-ready' }, '*')
    return () => window.removeEventListener('message', onMsg)
  }, [])

  const t = resolveTheme(r)
  const { tpl, accent, ink, soft, line, bg, tint } = t
  const qs = isPreview ? '?preview=1' : ''
  const base = `/site/${token}`
  const hrefs: Record<string, string> = {
    home: `${base}${qs}`,
    galleries: `${base}/galleries${qs}`,
    about: `${base}/about${qs}`,
    book: `${base}/availability${qs}`,
  }
  const availHref = hrefs.book

  const name: string = r.studio_name ?? r.display_name ?? 'Studio'
  const cityLine = [[r.service_city, r.service_state].filter(Boolean).join(', '), r.location_custom_text || null].filter(Boolean).join(' · ')
  const headline: string = (r.site_headline || '').trim() || (r.service_city ? `${r.service_city} Photographer` : 'Photographer')
  const subhead: string = (r.site_subhead || '').trim() || cityLine
  const logo = photoUrl(r.logo_path)
  const aboutPhoto = photoUrl(r.about_photo_path ?? r.avatar_path)

  const coverFallback = ((Array.isArray(r.cover_paths) && r.cover_paths.length > 0 ? r.cover_paths[0] : r.cover_path) as string | null) ?? ''
  const heroPaths: string[] = t.hero.photos.length > 0 ? t.hero.photos : [coverFallback].filter(Boolean)
  const heroUrls = heroPaths.map((p) => photoUrl(p)).filter(Boolean) as string[]
  const shownHero = t.hero.slideshow ? heroUrls : heroUrls.slice(0, 1)

  useEffect(() => {
    if (shownHero.length < 2) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => setSlide((i) => i + 1), 5000)
    return () => clearInterval(id)
  }, [shownHero.length])

  const galleries = ((r.site_galleries ?? []) as any[])
    .map((g) => ({
      id: g.id as string,
      title: (g.title ?? '') as string,
      cover_photo_id: (g.cover_photo_id ?? null) as string | null,
      photos: [...(g.photos ?? [])].sort((x: any, y: any) => (x.sort_order ?? 0) - (y.sort_order ?? 0)) as any[],
    }))
    .filter((g) => g.photos.length > 0)
  const sitePkgs = (r.site_packages ?? []) as { id: string; title: string; price: string | null; description: string | null }[]
  const quotes: { text: string; who: string; img: string | null }[] = [
    ...((r.testimonials ?? []) as any[]).filter((x) => x.quote).map((x) => ({ text: x.quote as string, who: (x.client_name ?? '') as string, img: photoUrl(x.storage_path) })),
    ...((r.reviews ?? []) as any[]).filter((v) => v.body).map((v) => ({ text: v.body as string, who: (v.couple_names ?? '') as string, img: null })),
  ]
  const faq = (r.faq ?? []) as any[]
  const galleryCovers = galleries
    .map((g) => photoUrl((g.photos.find((x: any) => x.id === g.cover_photo_id) ?? g.photos[0])?.storage_path))
    .filter(Boolean) as string[]
  const mosaicUrls = Array.from(new Set([...heroUrls, ...galleryCovers])).slice(0, 3)

  const on = (k: string) => r.site_sections?.[k] !== false
  const showMap: Record<string, boolean> = {
    about: on('about') && !!(t.text.about || r.bio || aboutPhoto),
    portfolio: page === 'galleries' ? galleries.length > 0 : on('portfolio') && galleries.length > 0,
    investment: on('investment') && sitePkgs.length > 0,
    testimonials: on('testimonials') && quotes.length > 0,
    faq: on('faq') && faq.length > 0,
    contact: true,
  }
  const pageOrder: string[] = page === 'home' ? t.orderHome : page === 'about' ? t.orderAbout : ['portfolio']
  const visible = pageOrder.filter((k) => showMap[k])

  const navItems = (['home', 'galleries', 'about', 'book'] as const)
    .filter((k) => !t.menu.hidden.includes(k) && !(k === 'galleries' && galleries.length === 0))
    .map((k) => ({ key: k, href: hrefs[k], label: t.menu.labels[k]?.trim() || NAV_DEFAULTS[k], active: k === page }))

  const ex = ((r as any).site_settings?.explore ?? {}) as { show?: boolean; layout?: string; heading?: string; lines?: Record<string, string> }
  const exLayout = ['lines', 'tiles', 'list', 'cards'].includes(ex.layout ?? '') ? (ex.layout as string) : 'lines'
  const doors = [
    ...(galleries.length > 0 ? [{ href: hrefs.galleries, t: t.menu.labels.galleries?.trim() || NAV_DEFAULTS.galleries, s: ex.lines?.galleries?.trim() || 'See my work' }] : []),
    { href: hrefs.about, t: t.menu.labels.about?.trim() || NAV_DEFAULTS.about, s: ex.lines?.about?.trim() || 'Get to know me' },
    { href: hrefs.book, t: t.menu.labels.book?.trim() || NAV_DEFAULTS.book, s: ex.lines?.book?.trim() || 'Check my dates' },
  ]

  const headStyle: React.CSSProperties = { fontFamily: t.head, fontWeight: t.headWeight ?? 500, letterSpacing: '0.01em' }
  const btnStyle: React.CSSProperties = { background: accent, color: t.btnText, fontFamily: t.body, borderRadius: t.radius }

  const cta = (force?: boolean) =>
    t.hero.ctaShow || force ? (
      <a href={availHref} className="cr-btn inline-block px-8 py-3 text-[11px] uppercase tracking-[0.22em]" style={btnStyle}>{t.hero.ctaText}</a>
    ) : null

  const burger = (r as any).site_settings?.menu?.icon === 'burger'
  const renderNav = (overlay: boolean, center: boolean) => {
    const brand = logo
      ? <img src={logo} alt={name} style={{ height: 'var(--logo)', objectFit: 'contain' }} />
      : <span style={{ ...headStyle, fontSize: 24 }}>{name}</span>
    return (
      <>
      <nav
        className={overlay ? 'absolute inset-x-0 top-0 z-20' : 'sticky top-0 z-20'}
        style={overlay ? { color: '#fff' } : { color: ink, background: `color-mix(in srgb, ${bg} 94%, transparent)`, backdropFilter: 'blur(8px)', borderBottom: `1px solid ${line}` }}
      >
        <div className={center ? 'mx-auto flex max-w-6xl flex-col items-center gap-3 px-6 py-4' : 'mx-auto flex min-h-16 max-w-6xl items-center justify-between px-6 py-2'}>
          <a href={hrefs.home}>{brand}</a>
          <ul className={burger ? 'hidden' : 'hidden gap-8 md:flex'}>
            {navItems.map((n) => (
              <li key={n.key}>
                <a href={n.href} className="text-[11px] uppercase tracking-[0.2em]"
                  style={{ fontFamily: t.body, fontSize: 'var(--menu)', opacity: n.active ? 1 : 0.8, borderBottom: n.active ? '1px solid currentColor' : '1px solid transparent', paddingBottom: 3 }}>
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
          <button className={burger ? 'absolute right-5 top-1/2 -translate-y-1/2 p-1' : 'absolute right-5 top-4 md:hidden'} aria-label="Menu" onClick={() => setOpen(!open)} style={{ fontSize: 22, lineHeight: 1 }}>
            {burger ? (
              <svg width="30" height="22" viewBox="0 0 30 22" fill="none" stroke="currentColor" strokeWidth="3"><path d="M0 3h30M0 11h30M0 19h30" /></svg>
            ) : open ? '✕' : '☰'}
          </button>
        </div>
        {open && !burger && (
          <ul className="flex flex-col gap-4 px-6 pb-5 md:hidden" style={{ background: overlay ? 'rgba(0,0,0,0.72)' : bg }}>
            {navItems.map((n) => (
              <li key={n.key}>
                <a href={n.href} onClick={() => setOpen(false)} className="text-[12px] uppercase tracking-[0.2em]" style={{ fontFamily: t.body, fontSize: 'var(--menu)' }}>{n.label}</a>
              </li>
            ))}
          </ul>
        )}
      </nav>
      {open && burger && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8" style={{ background: bg, color: ink }}>
          <button aria-label="Close menu" onClick={() => setOpen(false)} className="absolute right-6 top-5 text-3xl" style={{ lineHeight: 1 }}>✕</button>
          {navItems.map((n) => (
            <a key={n.key} href={n.href} onClick={() => setOpen(false)} className="text-4xl md:text-5xl" style={{ ...headStyle, opacity: n.active ? 1 : 0.75 }}>{n.label}</a>
          ))}
        </div>
      )}
      </>
    )
  }

  const heroImg = (cls: string) =>
    shownHero.length === 0 ? (
      <div className={cls} style={{ background: accent, opacity: 0.85 }} />
    ) : (
      <>
        {shownHero.map((u, i) => (
          <img key={u} src={u} alt={i === 0 ? name : ''} className={cls}
            style={{ objectFit: 'cover', opacity: i === slide % shownHero.length ? 1 : 0, transition: 'opacity 1.2s ease-in-out' }} />
        ))}
      </>
    )

  const alignCls = t.hero.align === 'left' ? 'items-start text-left' : t.hero.align === 'right' ? 'items-end text-right' : 'items-center text-center'
  const vCls = t.hero.valign === 'top' ? 'pt-32' : t.hero.valign === 'center' ? 'my-auto py-20' : 'mt-auto pb-20 md:pb-28'
  const ov = t.hero.overlay
  const h1Big: React.CSSProperties = { ...headStyle, fontSize: 'var(--hl)', lineHeight: 1.05 }
  const h1Mid: React.CSSProperties = { ...headStyle, fontSize: 'calc(var(--hl) * 0.85)', lineHeight: 1.05 }

  const sec = (id: string, title: string | null, children: React.ReactNode, tinted: boolean) => (
    <section id={id} className="scroll-mt-16 px-6" style={{ background: tinted ? tint : undefined, paddingTop: 'var(--space)', paddingBottom: 'var(--space)' }}>
      <div className="mx-auto max-w-6xl">
        {title && <h2 className="mb-12 text-center text-4xl md:text-5xl" style={headStyle}>{title}</h2>}
        {children}
      </div>
    </section>
  )

  const socials = [
    { label: 'Instagram', url: r.instagram_url },
    { label: 'Facebook', url: r.facebook_url },
    { label: 'Pinterest', url: r.pinterest_url },
    { label: 'TikTok', url: r.tiktok_url },
    { label: 'Website', url: r.website_url },
  ].filter((s) => !!s.url)

  const renderSection = (k: string, tinted: boolean): React.ReactNode => {
    switch (k) {
      case 'about': {
        const L = t.about.layout
        const aboutSet = (r as any).site_settings?.about
        if (aboutSet?.layout === 'collage') {
          const photo2 = photoUrl(aboutSet?.photo2)
          const cardBg = tint
          return sec('about', null,
            <div className="relative mx-auto max-w-5xl pb-20 md:pb-32">
              <div className="relative z-0 w-[68%] overflow-hidden md:w-[52%]" style={{ borderRadius: '0 0 56px 56px', aspectRatio: '3/4', background: tint }}>
                {aboutPhoto && <img src={aboutPhoto} alt={name} className="h-full w-full object-cover" />}
              </div>
              <div className="relative z-10 -mt-28 ml-[10%] w-[90%] p-7 md:-mt-44 md:ml-[34%] md:w-[62%] md:p-12" style={{ background: cardBg, borderRadius: 28, boxShadow: '0 20px 50px rgba(0,0,0,0.07)' }}>
                {t.titles.about && (
                  <h2 style={{ ...headStyle, fontWeight: t.headWeight ?? 200, fontSize: 'clamp(2.2rem, 6vw, 4.5rem)', lineHeight: 1.05 }}>{t.titles.about}</h2>
                )}
                <p className="mt-6 whitespace-pre-line text-justify text-[15px] leading-[1.9] md:text-[16px]" style={{ color: soft, fontWeight: 300 }}>{t.text.about ?? r.bio ?? ''}</p>
                <div className="mt-8">{cta(true)}</div>
              </div>
              {photo2 && (
                <img src={photo2} alt="" loading="lazy" className="absolute bottom-0 right-0 z-0 w-[40%] object-cover md:w-[30%]" style={{ aspectRatio: '4/5', borderRadius: 28 }} />
              )}
            </div>, false)
        }
        const body = (
          <div className={L === 'stacked' ? 'mx-auto max-w-2xl text-center' : ''}>
            <p className="whitespace-pre-line text-[16px] leading-[1.85]" style={{ color: soft }}>{t.text.about ?? r.bio ?? ''}</p>
            <div className="mt-8">{cta(true)}</div>
          </div>
        )
        const photo = aboutPhoto ? (
          <img src={aboutPhoto} alt={name} className="w-full object-cover" style={{ aspectRatio: L === 'stacked' ? '16/9' : '4/5' }} />
        ) : null
        return sec('about', t.titles.about,
          L === 'stacked' ? (
            <div className="mx-auto max-w-4xl">
              {photo && <div className="mb-10">{photo}</div>}
              {body}
            </div>
          ) : (
            <div className={`mx-auto grid max-w-5xl items-center gap-12 ${photo ? 'md:grid-cols-2' : ''}`}>
              {L === 'right' ? <>{body}{photo}</> : <>{photo}{body}</>}
            </div>
          ), tinted)
      }
      case 'portfolio': {
        const rawGal = (r as any).site_settings?.galindex?.layout
        const L: string = page === 'galleries' ? (rawGal === 'checker' ? 'checker' : t.galindex.layout) : t.portfolio.layout
        const list = page === 'home' ? galleries.slice(0, 6) : galleries
        const card = (g: any, style: React.CSSProperties, cls = '', big = false) => {
          const cover = g.photos.find((p: any) => p.id === g.cover_photo_id) ?? g.photos[0]
          const u = photoUrl(cover?.storage_path)
          return (
            <a key={g.id} href={`/site/${token}/g/${g.id}${qs}`} className={`group relative block overflow-hidden ${cls}`} style={{ background: '#E5E1DB', ...style }}>
              {u && <img src={u} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />}
              <div className="absolute inset-0" style={{ background: 'linear-gradient(transparent 55%, rgba(0,0,0,0.62))' }} />
              <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                <p className={big ? 'text-4xl' : 'text-3xl'} style={headStyle}>{g.title}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.22em] opacity-90">{g.photos.length} photos →</p>
              </div>
            </a>
          )
        }
        return sec('portfolio', L === 'checker' ? null : t.titles.portfolio,
          <>
            {L === 'checker' ? (
              <div>
                <div className="mb-10 text-center">
                  <h1 className="text-[13px] uppercase tracking-[0.35em]" style={{ fontFamily: t.body }}>{t.titles.portfolio}</h1>
                  <div className="mx-auto mt-4 h-[2px] w-12" style={{ background: line }} />
                </div>
                <div className="grid grid-cols-2">
                  {list.map((g, i) => {
                    const cover = g.photos.find((p: any) => p.id === g.cover_photo_id) ?? g.photos[0]
                    const u = photoUrl(cover?.storage_path)
                    const href = `/site/${token}/g/${g.id}${qs}`
                    const photoTile = (
                      <a key={g.id + 'p'} href={href} className="relative block aspect-square overflow-hidden" style={{ background: '#E5E1DB' }}>
                        {u && <img src={u} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-700 hover:scale-105" />}
                      </a>
                    )
                    const textTile = (
                      <a key={g.id + 't'} href={href} className="flex aspect-square items-center justify-center p-4 text-center" style={{ background: bg }}>
                        <span style={{ ...headStyle, fontFamily: t.galFamily ?? t.head, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em', lineHeight: 1, fontSize: 'clamp(1.4rem, 4.2vw, 3.6rem)' }}>{g.title}</span>
                      </a>
                    )
                    return i % 2 === 0 ? [photoTile, textTile] : [textTile, photoTile]
                  })}
                </div>
              </div>
            ) : L === 'banners' ? (
              <div className="flex flex-col" style={{ gap: 'calc(var(--gap) + 8px)' }}>
                {list.map((g) => card(g, { aspectRatio: '21/9', minHeight: 180 }))}
              </div>
            ) : L === 'feature' ? (
              <div className="grid md:grid-cols-3" style={{ gap: 'calc(var(--gap) + 8px)' }}>
                {list.map((g, i) => (i === 0 ? card(g, { aspectRatio: '16/10' }, 'md:col-span-2', true) : card(g, { aspectRatio: '4/5' })))}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3" style={{ gap: 'calc(var(--gap) + 8px)' }}>
                {list.map((g) => card(g, { aspectRatio: t.cardRatio }))}
              </div>
            )}
            {page === 'home' && galleries.length > 0 && (
              <div className="mt-10 text-center">
                <a href={hrefs.galleries} className="text-[11px] uppercase tracking-[0.22em]" style={{ color: accent }}>View all galleries →</a>
              </div>
            )}
          </>, tinted)
      }
      case 'investment': {
        const feats = (d: string | null) => (d ?? '').split('\n').map((x) => x.trim()).filter(Boolean)
        const L = t.pricing.layout
        const fid = t.pricing.featured
        const anyHot = sitePkgs.some((p) => p.id === fid)
        const panel = `color-mix(in srgb, ${bg} 40%, #fff)`
        const book = (hot: boolean, mt = 'mt-8') =>
          t.pricing.button ? (
            <a href={availHref} className={`cr-btn ${mt} inline-block px-7 py-3 text-[11px] uppercase tracking-[0.22em]`}
              style={{ borderRadius: t.radius, fontFamily: t.body, background: hot ? accent : 'transparent', color: hot ? t.btnText : accent, border: `1px solid ${accent}` }}>
              {t.hero.ctaText}
            </a>
          ) : null
        const tag = (hot: boolean) =>
          hot ? (
            <p className="mb-3 text-[10px] uppercase tracking-[0.28em]" style={{ color: accent }}>Most popular</p>
          ) : anyHot ? (
            <p className="mb-3 text-[10px]">&nbsp;</p>
          ) : null
        const list = (d: string | null) =>
          feats(d).length > 0 && (
            <ul className="grid gap-2.5 text-center text-[14px] leading-snug" style={{ color: soft }}>
              {feats(d).map((f, j) => <li key={j}>{f}</li>)}
            </ul>
          )
        return sec('investment', t.titles.investment,
          <div className="mx-auto max-w-5xl">
            {t.pricing.intro && (
              <p className="mx-auto mb-12 max-w-xl whitespace-pre-line text-center text-[15px] leading-relaxed" style={{ color: soft }}>{t.pricing.intro}</p>
            )}

            {L === 'cards' && (
              <div className="grid items-stretch" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 24 }}>
                {sitePkgs.map((p) => {
                  const hot = p.id === fid
                  return (
                    <div key={p.id} className="flex flex-col items-center px-8 py-10 text-center"
                      style={{ background: panel, border: `1px solid ${hot ? accent : line}`, boxShadow: hot ? '0 10px 30px rgba(0,0,0,0.08)' : undefined }}>
                      {tag(hot)}
                      <h3 className="text-2xl" style={headStyle}>{p.title}</h3>
                      {p.price && <p className="mt-3 text-4xl" style={{ ...headStyle, color: accent }}>{p.price}</p>}
                      <div className="my-6 h-px w-10" style={{ background: line }} />
                      {list(p.description)}
                      <div className="mt-auto">{book(hot)}</div>
                    </div>
                  )
                })}
              </div>
            )}

            {L === 'menu' && (
              <div className="mx-auto max-w-3xl">
                {sitePkgs.map((p, i) => {
                  const hot = p.id === fid
                  return (
                    <div key={p.id} className="py-8" style={{ borderTop: i > 0 ? `1px solid ${line}` : undefined }}>
                      {hot && <p className="mb-2 text-[10px] uppercase tracking-[0.28em]" style={{ color: accent }}>Most popular</p>}
                      <div className="flex items-baseline gap-3">
                        <h3 className="text-2xl" style={{ ...headStyle, color: hot ? accent : ink }}>{p.title}</h3>
                        <span className="flex-1" style={{ borderBottom: `1px dotted ${soft}`, opacity: 0.5, transform: 'translateY(-4px)' }} />
                        {p.price && <span className="text-2xl" style={{ ...headStyle, color: accent }}>{p.price}</span>}
                      </div>
                      {feats(p.description).length > 0 && (
                        <p className="mt-3 text-[14px] leading-relaxed" style={{ color: soft }}>{feats(p.description).join('   ·   ')}</p>
                      )}
                      {book(hot, 'mt-5')}
                    </div>
                  )
                })}
              </div>
            )}

            {L === 'columns' && (
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 1, background: line, border: `1px solid ${line}` }}>
                {sitePkgs.map((p) => {
                  const hot = p.id === fid
                  return (
                    <div key={p.id} className="flex flex-col items-center px-8 py-12 text-center" style={{ background: hot ? tint : bg }}>
                      {tag(hot)}
                      <h3 className="text-2xl" style={headStyle}>{p.title}</h3>
                      {p.price && <p className="mt-3 text-3xl" style={{ ...headStyle, color: accent }}>{p.price}</p>}
                      <div className="my-6 h-px w-10" style={{ background: accent, opacity: 0.6 }} />
                      {list(p.description)}
                      <div className="mt-auto">{book(hot)}</div>
                    </div>
                  )
                })}
              </div>
            )}

            {t.pricing.note && (
              <p className="mx-auto mt-10 max-w-xl whitespace-pre-line text-center text-[14px] italic leading-relaxed" style={{ color: soft }}>{t.pricing.note}</p>
            )}
            {!t.pricing.button && <div className="mt-10 text-center">{cta(true)}</div>}
          </div>, tinted)
      }
      case 'testimonials': {
        const rawT = (r as any).site_settings?.testimonials?.layout
        const L: string = rawT === 'carousel' ? 'carousel' : t.testi.layout
        const list = quotes.slice(0, 6)
        return sec('words', L === 'carousel' ? null : t.titles.testimonials,
          L === 'carousel' ? (
            <TestimonialCarousel list={list} heading={t.titles.testimonials ?? ''} headStyle={headStyle} bodyFont={t.body} ink={ink} soft={soft} bg={bg} tint={tint} />
          ) : L === 'stacked' ? (
            <div className="mx-auto max-w-3xl">
              {list.map((q, i) => (
                <figure key={i} className="py-10 text-center" style={{ borderTop: i > 0 ? `1px solid ${line}` : undefined }}>
                  {q.img && <img src={q.img} alt="" loading="lazy" className="mx-auto mb-6 h-24 w-24 rounded-full object-cover" />}
                  <blockquote className="text-2xl italic leading-relaxed" style={{ fontFamily: t.head }}>&ldquo;{q.text}&rdquo;</blockquote>
                  {q.who && <figcaption className="mt-4 text-[11px] uppercase tracking-[0.22em]" style={{ color: soft }}>{q.who}</figcaption>}
                </figure>
              ))}
            </div>
          ) : L === 'cards' ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {list.map((q, i) => (
                <figure key={i} className="flex flex-col p-8" style={{ background: `color-mix(in srgb, ${bg} 40%, #fff)`, border: `1px solid ${line}` }}>
                  <span style={{ ...headStyle, color: accent, fontSize: 48, lineHeight: 1 }}>&ldquo;</span>
                  <blockquote className="mt-2 flex-1 text-[15px] leading-relaxed">{q.text}</blockquote>
                  <figcaption className="mt-6 flex items-center gap-3">
                    {q.img && <img src={q.img} alt="" loading="lazy" className="h-10 w-10 rounded-full object-cover" />}
                    {q.who && <span className="text-[11px] uppercase tracking-[0.22em]" style={{ color: soft }}>{q.who}</span>}
                  </figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <div className="grid gap-10 md:grid-cols-3">
              {list.map((q, i) => (
                <figure key={i} className="text-center">
                  {q.img && <img src={q.img} alt="" loading="lazy" className="mx-auto mb-6 w-full object-cover" style={{ aspectRatio: '4/5' }} />}
                  <blockquote className="text-xl italic leading-relaxed" style={{ fontFamily: t.head }}>&ldquo;{q.text}&rdquo;</blockquote>
                  {q.who && <figcaption className="mt-4 text-[11px] uppercase tracking-[0.22em]" style={{ color: soft }}>{q.who}</figcaption>}
                </figure>
              ))}
            </div>
          ), tinted)
      }
      case 'faq':
        return sec('faq', t.titles.faq,
          <div className="mx-auto max-w-2xl">
            <FaqAccordion
              items={faq}
              questionStyle={{ fontFamily: t.head, fontSize: 20, color: ink }}
              answerStyle={{ fontFamily: t.body, fontSize: 15, color: soft, lineHeight: 1.7 }}
            />
          </div>, tinted)
      case 'contact':
        return sec('contact', t.titles.contact,
          <div className="mx-auto max-w-xl text-center">
            <p className="mb-8 whitespace-pre-line text-[15px] leading-relaxed" style={{ color: soft }}>
              {t.text.contact ?? 'Tell me about your day. Check a date and send me a message.'}
            </p>
            <div className="mb-10">{cta(true)}</div>
            {socials.length > 0 && (
              <div className="flex flex-wrap justify-center gap-x-8 gap-y-3">
                {socials.map((s) => (
                  <a key={s.label} href={String(s.url).startsWith('http') ? s.url : `https://${s.url}`} target="_blank" rel="noopener noreferrer"
                    className="text-[11px] uppercase tracking-[0.22em]" style={{ color: accent }}>{s.label}</a>
                ))}
              </div>
            )}
          </div>, tinted)
      default:
        return null
    }
  }

  return (
    <>
      <link rel="stylesheet" href={t.fontsHref} />
      <style>{`${t.cssVars}html{scroll-behavior:smooth;font-size:var(--text)}.cr-sub{font-size:var(--sub)!important}html,body{background:${bg}}`}</style>
      <PortfolioLightbox />
      <div style={{ background: bg, color: ink, fontFamily: t.body }}>
        {page !== 'home' && renderNav(false, false)}

        {page === 'home' && tpl === 'editorial' && (
          <>
            {t.menu.solid && renderNav(false, false)}
            <header id="top" className="relative flex flex-col overflow-hidden" style={{ minHeight: t.menu.solid ? 'calc(var(--hero-h) - 4rem)' : 'var(--hero-h)' }}>
              {heroImg('absolute inset-0 h-full w-full')}
              <div className="absolute inset-0" style={{ background: `linear-gradient(rgba(0,0,0,${ov}), rgba(0,0,0,${(ov * 0.35).toFixed(2)}) 40%, rgba(0,0,0,${Math.min(0.85, ov * 1.6).toFixed(2)}))` }} />
              {!t.menu.solid && renderNav(true, false)}
              <div className={`relative mx-auto flex w-full max-w-5xl flex-col px-6 text-white ${alignCls} ${vCls}`}>
                <div className="max-w-3xl">
                  <h1 style={h1Big}>{headline}</h1>
                  {subhead && <p className="cr-sub mt-4 text-[12px] uppercase tracking-[0.28em] opacity-90">{subhead}</p>}
                  <div className="mt-8">{cta()}</div>
                </div>
              </div>
            </header>
          </>
        )}
        {page === 'home' && tpl === 'split' && (
          <header id="top">
            {renderNav(false, false)}
            <div className="grid md:grid-cols-2" style={{ minHeight: 'calc(var(--hero-h) - 4rem)' }}>
              <div className={`order-2 flex flex-col justify-center px-8 py-16 md:order-1 md:px-16 ${t.hero.align === 'center' ? 'items-center text-center' : t.hero.align === 'right' ? 'items-end text-right' : 'items-start text-left'}`}>
                {subhead && <p className="cr-sub mb-5 text-[11px] uppercase tracking-[0.28em]" style={{ color: accent }}>{subhead}</p>}
                <h1 style={h1Mid}>{headline}</h1>
                <p className="mt-6 max-w-md text-[15px] leading-relaxed" style={{ color: soft }}>
                  {(t.text.about ?? r.bio ?? '').toString().split(/\n+/)[0].slice(0, 220)}
                </p>
                <div className="mt-8">{cta()}</div>
              </div>
              <div className="relative order-1 min-h-[60vh] md:order-2">{heroImg('absolute inset-0 h-full w-full')}</div>
            </div>
          </header>
        )}
        {page === 'home' && tpl === 'minimal' && (
          <header id="top">
            {renderNav(false, true)}
            <div className="mx-auto max-w-6xl px-6 pt-6">
              <div className="relative aspect-[16/10] overflow-hidden md:aspect-[21/9]">{heroImg('absolute inset-0 h-full w-full')}</div>
            </div>
            <div className={`mx-auto flex max-w-3xl flex-col px-6 py-14 ${alignCls}`}>
              <h1 style={h1Mid}>{headline}</h1>
              {subhead && <p className="cr-sub mt-4 text-[11px] uppercase tracking-[0.28em]" style={{ color: soft }}>{subhead}</p>}
              <div className="mt-8">{cta()}</div>
            </div>
          </header>
        )}
        {page === 'home' && tpl === 'framed' && (
          <header id="top" className="relative flex flex-col overflow-hidden" style={{ minHeight: 'var(--hero-h)' }}>
            {heroImg('absolute inset-0 h-full w-full')}
            <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${(ov * 0.6).toFixed(2)})` }} />
            {renderNav(true, false)}
            <div className="relative mx-auto my-auto w-full max-w-xl px-6 py-28">
              <div className="p-3" style={{ background: bg, color: ink }}>
                <div className="px-8 py-12 text-center" style={{ border: `1px solid ${line}` }}>
                  {subhead && <p className="cr-sub mb-4 text-[11px] uppercase tracking-[0.28em]" style={{ color: accent }}>{subhead}</p>}
                  <h1 style={h1Mid}>{headline}</h1>
                  <div className="mt-8">{cta()}</div>
                </div>
              </div>
            </div>
          </header>
        )}
        {page === 'home' && tpl === 'magazine' && (
          <header id="top">
            {renderNav(false, false)}
            <div className="mx-auto max-w-6xl px-6 pt-14" style={{ textAlign: t.hero.align }}>
              {subhead && <p className="cr-sub mb-5 text-[11px] uppercase tracking-[0.28em]" style={{ color: accent }}>{subhead}</p>}
              <h1 style={{ ...headStyle, fontSize: 'calc(var(--hl) * 1.5)', lineHeight: 0.98 }}>{headline}</h1>
            </div>
            <div className="relative mt-10 w-full overflow-hidden" style={{ height: 'calc(var(--hero-h) * 0.8)' }}>
              {heroImg('absolute inset-0 h-full w-full')}
              <div className="absolute bottom-0 left-0 px-6 pb-6">{cta()}</div>
            </div>
          </header>
        )}
        {page === 'home' && tpl === 'mosaic' && (
          <header id="top">
            {renderNav(false, true)}
            <div className="mx-auto max-w-3xl px-6 pb-10 pt-12 text-center">
              {subhead && <p className="cr-sub mb-4 text-[11px] uppercase tracking-[0.28em]" style={{ color: accent }}>{subhead}</p>}
              <h1 style={h1Mid}>{headline}</h1>
              <div className="mt-7">{cta()}</div>
            </div>
            <div className="mx-auto max-w-6xl px-6 pb-4">
              <div className="grid" style={{ height: 'calc(var(--hero-h) * 0.75)', gap: 'var(--gap)', gridTemplateColumns: mosaicUrls.length > 1 ? '1.4fr 1fr' : '1fr', gridTemplateRows: mosaicUrls.length > 2 ? '1fr 1fr' : '1fr' }}>
                {mosaicUrls.length === 0 && <div style={{ background: accent, opacity: 0.85 }} />}
                {mosaicUrls.map((u, i) => (
                  <img key={u} src={u} alt="" className="h-full w-full object-cover" style={{ minHeight: 0, gridRow: i === 0 && mosaicUrls.length > 2 ? 'span 2' : undefined }} />
                ))}
              </div>
            </div>
          </header>
        )}

        {page === 'home' && doors.length > 0 && ex.show !== false && (
          <div id="explore" className="mx-auto max-w-6xl px-6 py-16">
            {ex.heading?.trim() && (
              <p className="mb-8 text-center text-[11px] uppercase tracking-[0.3em]" style={{ color: soft }}>{ex.heading}</p>
            )}

            {exLayout === 'lines' && (
              <div className="grid gap-0" style={{ gridTemplateColumns: `repeat(${Math.min(3, doors.length)}, minmax(0, 1fr))` }}>
                {doors.map((b, i) => (
                  <a key={b.href} href={b.href} className="block px-3 py-8 text-center sm:px-6" style={{ borderTop: `1px solid ${line}`, borderLeft: i > 0 ? `1px solid ${line}` : undefined }}>
                    <p className="text-2xl sm:text-3xl" style={headStyle}>{b.t}</p>
                    <p className="mt-2 text-[10px] uppercase tracking-[0.2em] sm:text-[11px] sm:tracking-[0.22em]" style={{ color: accent }}>{b.s} →</p>
                  </a>
                ))}
              </div>
            )}

            {exLayout === 'tiles' && (
              <div className="grid gap-4 sm:grid-cols-3">
                {doors.map((b, i) => (
                  <a key={b.href} href={b.href} className="group flex min-h-[200px] flex-col justify-between p-7 transition hover:-translate-y-1" style={{ background: tint, border: `1px solid ${line}`, borderRadius: t.radius }}>
                    <span className="text-sm tracking-[0.2em]" style={{ color: accent }}>{String(i + 1).padStart(2, '0')}</span>
                    <div>
                      <p className="text-4xl" style={headStyle}>{b.t}</p>
                      <p className="mt-3 text-[11px] uppercase tracking-[0.22em]" style={{ color: soft }}>{b.s} →</p>
                    </div>
                  </a>
                ))}
              </div>
            )}

            {exLayout === 'list' && (
              <div style={{ borderTop: `1px solid ${line}` }}>
                {doors.map((b, i) => (
                  <a key={b.href} href={b.href} className="flex items-baseline gap-5 py-7 transition hover:opacity-70" style={{ borderBottom: `1px solid ${line}` }}>
                    <span className="w-8 text-sm tracking-[0.2em]" style={{ color: accent }}>{String(i + 1).padStart(2, '0')}</span>
                    <span className="flex-1 text-3xl sm:text-5xl" style={headStyle}>{b.t}</span>
                    <span className="hidden text-[11px] uppercase tracking-[0.22em] sm:block" style={{ color: soft }}>{b.s}</span>
                    <span className="text-xl" style={{ color: accent }}>→</span>
                  </a>
                ))}
              </div>
            )}

            {exLayout === 'cards' && (
              <div className="grid gap-5 sm:grid-cols-3">
                {doors.map((b) => (
                  <a key={b.href} href={b.href} className="block px-6 py-9 text-center transition hover:-translate-y-1" style={{ background: tint, borderTop: `3px solid ${accent}`, borderRadius: t.radius }}>
                    <p className="text-3xl" style={headStyle}>{b.t}</p>
                    <p className="mx-auto mt-3 max-w-[16rem] text-sm" style={{ color: soft }}>{b.s}</p>
                    <p className="mt-5 text-[11px] uppercase tracking-[0.22em]" style={{ color: accent }}>Visit →</p>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {page !== 'home' && visible.length === 0 && (
          <p className="px-6 py-32 text-center text-sm" style={{ color: soft }}>Nothing here yet.</p>
        )}

        {visible.map((k, i) => (
          <React.Fragment key={k}>{renderSection(k, i % 2 === 1)}</React.Fragment>
        ))}

        {page !== 'home' && visible.length > 0 && (
          <div className="px-6 pb-12 pt-4 text-center">{cta(true)}</div>
        )}

        <footer id="footer" className="px-6 pb-12 pt-6 text-center text-[11px] uppercase tracking-[0.2em]" style={{ color: soft }}>
          {t.text.footer && <p className="mb-3 whitespace-pre-line normal-case tracking-normal" style={{ fontSize: 13 }}>{t.text.footer}</p>}
          © {new Date().getFullYear()} {name} · <a href="https://camrhia.com" style={{ color: accent }}>Powered by Camrhia</a>
        </footer>
      </div>
    </>
  )
}
