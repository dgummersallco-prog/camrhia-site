'use client'

import { useSiteBase } from '@/app/site/useSiteBase'
import { AboutCanvas } from './AboutCanvas'
import { heroStarter } from '@/lib/aboutCanvas'
import { galleryStarter } from '@/lib/aboutCanvas'
import { installPreviewGlow } from '@/lib/previewGlow'
import { FONT_OPTIONS } from '@/lib/siteTheme'
import React, { useEffect, useState } from 'react'
import { FaqAccordion } from '../../p/[token]/FaqAccordion'
import { PortfolioLightbox } from '../../p/[token]/PortfolioLightbox'
import { resolveTheme, NAV_DEFAULTS } from '@/lib/siteTheme'

const STORAGE_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/portfolio/`
  : ''
function photoUrl(path: string | null | undefined): string | null {
  if (path && (path.startsWith('data:') || path.startsWith('http'))) return path
  return path ? `${STORAGE_BASE}${path}` : null
}

// Shown only inside the designer preview, so every section is visible while building.
const PH_SCENES = [1, 2, 3, 4, 5, 6].map((n) => 'https://picsum.photos/seed/camrhia' + n + '/800/1000')
const PH_AVATAR = 'https://i.pravatar.cc/200?img=47'
const PH_GALLERIES = ['Wedding day', 'Engagement', 'Family'].map((title, gi) => ({
  id: 'ph' + gi,
  title,
  cover_photo_id: null as string | null,
  photos: [0, 1, 2, 3].map((k) => ({ id: 'ph' + gi + '-' + k, storage_path: PH_SCENES[(gi * 4 + k) % 6], sort_order: k })) as any[],
}))
const PH_QUOTES = [
  { text: 'This is where your testimonials will show. Add one in the app and it replaces this.', who: 'Client name', img: PH_AVATAR as string | null },
  { text: 'A kind word from a happy client goes here.', who: 'Another client', img: 'https://i.pravatar.cc/200?img=12' as string | null },
  { text: 'Short and sweet works best.', who: 'Third client', img: 'https://i.pravatar.cc/200?img=32' as string | null },
]
const PH_PKGS = [
  { id: 'ph1', title: 'Package one', price: '$0000', description: 'What is included\nAnother thing included' },
  { id: 'ph2', title: 'Package two', price: '$0000', description: 'What is included\nAnother thing included' },
  { id: 'ph3', title: 'Package three', price: '$0000', description: 'What is included\nAnother thing included' },
]
const PH_FAQ = [
  { id: 'ph1', question: 'Your first question', answer: 'Your answer goes here.', q: 'Your first question', a: 'Your answer goes here.' },
  { id: 'ph2', question: 'Your second question', answer: 'Your answer goes here.', q: 'Your second question', a: 'Your answer goes here.' },
]

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
    }
    window.addEventListener('message', onMsg)
    window.parent?.postMessage({ type: 'camrhia-preview-ready', ...(() => { const seg = window.location.pathname.split('/').filter(Boolean); const base = seg[0] === 'site' ? 2 : 0; const rest = seg[base]; const page = rest === 'about' ? 'about' : rest === 'galleries' ? 'galleries' : rest === 'g' ? 'gallery' : rest === 'availability' ? 'availability' : !rest ? 'home' : null; return { page, gid: rest === 'g' ? seg[base + 1] ?? null : null } })() }, '*')
    return () => window.removeEventListener('message', onMsg)
  }, [])

  useEffect(() => installPreviewGlow(), [])

  const t = resolveTheme(r)
  const { tpl, accent, ink, soft, line, bg, tint } = t
  const qs = isPreview ? '?preview=1' : ''
  const base = useSiteBase(token)
  const homeHref = base || '/'
  const hrefs: Record<string, string> = {
    home: `${homeHref}${qs}`,
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
  const aboutPhoto = photoUrl(r.about_photo_path ?? r.avatar_path) ?? (isPreview ? PH_SCENES[1] : null)

  const coverFallback = ((Array.isArray(r.cover_paths) && r.cover_paths.length > 0 ? r.cover_paths[0] : r.cover_path) as string | null) ?? ''
  const allCovers: string[] = Array.isArray(r.cover_paths) ? (r.cover_paths as string[]).filter(Boolean) : []
  const heroPaths: string[] = t.hero.photos.length > 0 ? t.hero.photos : allCovers.length > 0 ? allCovers : [coverFallback].filter(Boolean)
  const heroUrlsReal = heroPaths.map((p) => photoUrl(p)).filter(Boolean) as string[]
  const heroUrls = isPreview && heroUrlsReal.length === 0 ? [PH_SCENES[0]] : heroUrlsReal
  const shownHero = t.hero.slideshow ? heroUrls : heroUrls.slice(0, 1)
  const heroFocus: Record<string, { x: number; y: number }> = (r.site_settings?.hero?.focus ?? {}) as Record<string, { x: number; y: number }>

  useEffect(() => {
    if (shownHero.length < 2) return
    if (!isPreview && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => setSlide((i) => i + 1), 5000)
    return () => clearInterval(id)
  }, [shownHero.length, isPreview])

  const realGalleries = ((r.site_galleries ?? []) as any[])
    .map((g) => ({
      id: g.id as string,
      title: (g.title ?? '') as string,
      cover_photo_id: (g.cover_photo_id ?? null) as string | null,
      photos: [...(g.photos ?? [])].sort((x: any, y: any) => (x.sort_order ?? 0) - (y.sort_order ?? 0)) as any[],
    }))
    .filter((g) => g.photos.length > 0)
  const galleries = isPreview && realGalleries.length === 0 ? (PH_GALLERIES as typeof realGalleries) : realGalleries
  const realPkgs = (r.site_packages ?? []) as { id: string; title: string; price: string | null; description: string | null; session_type?: string | null }[]
  const sitePkgs = isPreview && realPkgs.length === 0 ? PH_PKGS : realPkgs
  const quotes: { text: string; who: string; img: string | null }[] = [
    ...((r.testimonials ?? []) as any[]).filter((x) => x.quote).map((x) => ({ text: x.quote as string, who: (x.client_name ?? '') as string, img: photoUrl(x.storage_path) })),
    ...((r.reviews ?? []) as any[]).filter((v) => v.body).map((v) => ({ text: v.body as string, who: (v.couple_names ?? '') as string, img: null })),
  ]
  const realFaq = (r.faq ?? []) as any[]
  const faq = isPreview && realFaq.length === 0 ? (PH_FAQ as any[]) : realFaq
  const quotesShown = isPreview && quotes.length === 0 ? PH_QUOTES : quotes
  const galleryCovers = galleries
    .map((g) => photoUrl((g.photos.find((x: any) => x.id === g.cover_photo_id) ?? g.photos[0])?.storage_path))
    .filter(Boolean) as string[]
  const mosaicSrcs: string[] = (Array.from(new Set([...heroPaths, ...galleries.map((g: any) => (g.photos.find((x: any) => x.id === g.cover_photo_id) ?? g.photos[0])?.storage_path)].filter(Boolean))) as string[]).slice(0, 3)

  const on = (k: string) => r.site_sections?.[k] !== false
  const showMap: Record<string, boolean> = {
    about: on('about') && !!(t.text.about || r.bio || aboutPhoto),
    portfolio: page === 'galleries' ? galleries.length > 0 : false,
    investment: on('investment') && sitePkgs.length > 0,
    testimonials: on('testimonials') && quotesShown.length > 0,
    faq: on('faq') && faq.length > 0,
    contact: true,
    explore: true,
  }
  for (const c of t.customs) showMap[c.id] = on(c.id)
  const pageOrder: string[] = page === 'home' ? t.orderHome : page === 'about' ? t.orderAbout : t.orderGalleries
  const visible = pageOrder.filter((k) => showMap[k])

  const navItems = (['home', 'galleries', 'about', 'book'] as const)
    .filter((k) => !t.menu.hidden.includes(k) && !(k === 'galleries' && galleries.length === 0))
    .map((k) => ({ key: k, href: hrefs[k], label: t.menu.labels[k]?.trim() || NAV_DEFAULTS[k], active: k === page }))

  const ex = ((r as any).site_settings?.explore ?? {}) as { show?: boolean; layout?: string; heading?: string; lines?: Record<string, string>; titles?: Record<string, string> }
  const exLayout = ['lines', 'tiles', 'list', 'cards', 'stack', 'outline'].includes(String(ex.layout)) ? String(ex.layout) : 'lines'
  const doors = [
    ...(galleries.length > 0 ? [{ href: hrefs.galleries, t: ex.titles?.galleries?.trim() || t.menu.labels.galleries?.trim() || NAV_DEFAULTS.galleries, s: ex.lines?.galleries?.trim() || 'See my work' }] : []),
    { href: hrefs.about, t: ex.titles?.about?.trim() || t.menu.labels.about?.trim() || NAV_DEFAULTS.about, s: ex.lines?.about?.trim() || 'Get to know me' },
    { href: hrefs.book, t: ex.titles?.book?.trim() || t.menu.labels.book?.trim() || NAV_DEFAULTS.book, s: ex.lines?.book?.trim() || 'Check my dates' },
  ]

  const headStyle: React.CSSProperties = { fontFamily: t.head, fontWeight: t.headWeight ?? 500, letterSpacing: '0.01em' }

  // Per-section look: background, text color and fonts chosen in the designer.
  const secStyles = (((r as any).site_settings?.secStyle ?? {}) as Record<string, { bg?: string; text?: string; head?: string; body?: string; title?: string; titleFont?: string }>)
  const famOf = (k?: string) => (k && FONT_OPTIONS[k] ? FONT_OPTIONS[k].family : null)
  const hexOk = (v?: string) => (v && /^#[0-9a-fA-F]{3,8}$/.test(v) ? v : null)
  const secCss = Object.entries(secStyles).map(([id, v]) => {
    if (!v || !/^[A-Za-z0-9_-]+$/.test(id)) return ''
    const rules: string[] = []
    if (hexOk(v.bg) && id !== 'nav') rules.push('background:' + hexOk(v.bg) + ' !important')
    if (hexOk(v.text)) rules.push('color:' + hexOk(v.text) + ' !important')
    if (famOf(v.body)) rules.push('font-family:' + famOf(v.body) + ' !important')
    let css = rules.length ? '#' + id + ' {' + rules.join(';') + '}' : ''
    if (famOf(v.titleFont)) css += '#' + id + ' .cr-sech {font-family:' + famOf(v.titleFont) + ' !important}'
    if (hexOk(v.title)) css += '#' + id + ' .cr-sech {color:' + hexOk(v.title) + ' !important}'
    if (famOf(v.head)) css += '#' + id + ' [style*="letter-spacing: 0.01em"], #' + id + ' .cr-h {font-family:' + famOf(v.head) + ' !important}'
    return css
  }).join('\n')
  const extraFontKeys = Array.from(new Set(Object.values(secStyles).flatMap((v) => [v?.head, v?.body, v?.titleFont]).filter((k): k is string => !!k && !!FONT_OPTIONS[k])))
  const extraFontsHref = extraFontKeys.length ? 'https://fonts.googleapis.com/css2?' + extraFontKeys.map((k) => 'family=' + FONT_OPTIONS[k].gf).join('&') + '&display=swap' : null
  const btnStyle: React.CSSProperties = { background: accent, color: t.btnText, fontFamily: t.body, borderRadius: t.radius }

  const cta = (force?: boolean) =>
    t.hero.ctaShow || force ? (
      <a href={availHref} className="cr-btn inline-block px-8 py-3 text-[11px] uppercase tracking-[0.22em]" style={btnStyle}>{force ? t.hero.ctaText : t.hero.heroCtaText}</a>
    ) : null

  const burger = (r as any).site_settings?.menu?.icon === 'burger'
  const renderNav = (overlay: boolean, center: boolean) => {
    const brand = logo
      ? <img src={logo} alt={name} style={{ height: 'var(--logo)', objectFit: 'contain' }} />
      : <span style={{ ...headStyle, fontSize: 24 }}>{name}</span>
    return (
      <>
      <nav
        id="nav"
        className={overlay ? 'absolute inset-x-0 top-0 z-20' : t.menu.none ? 'relative z-20' : 'sticky top-0 z-20'}
        style={overlay ? { color: '#fff' } : t.menu.none ? { color: ink } : { color: ink, background: `color-mix(in srgb, ${t.menu.bg ?? bg} 94%, transparent)`, backdropFilter: 'blur(8px)', borderBottom: `1px solid ${line}` }}
      >
        <div className={(t.menu.logoPos ? t.menu.logoPos === 'center' : center) ? 'mx-auto flex max-w-6xl flex-col items-center gap-3 px-6 py-4' : 'mx-auto flex min-h-16 max-w-6xl items-center justify-between px-6 py-2' + (t.menu.logoPos === 'right' ? ' flex-row-reverse' : '')}>
          <a href={hrefs.home} style={{ display: 'inline-flex', transform: 'translate(var(--nudge, 0px), var(--nudgey, 0px))', transition: 'transform 0.12s ease-out' }}>{brand}</a>
          <ul className={burger ? 'hidden' : 'hidden gap-8 md:flex'} style={{ transform: 'translateY(var(--menuy, 0px))' }}>
            {navItems.map((n) => (
              <li key={n.key}>
                <a href={n.href} className="text-[11px] uppercase tracking-[0.2em]"
                  style={{ fontFamily: t.body, fontSize: 'var(--menu)', opacity: n.active ? 1 : 0.8, borderBottom: n.active ? '1px solid currentColor' : '1px solid transparent', paddingBottom: 3 }}>
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
          <button className={(burger ? 'absolute top-1/2 -translate-y-1/2 p-1 ' : 'absolute top-4 md:hidden ') + (t.menu.logoPos === 'right' ? 'left-5' : 'right-5')} aria-label="Menu" onClick={() => setOpen(!open)} style={{ fontSize: 22, lineHeight: 1 }}>
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

  const watchHero = (par: HTMLElement | null) => {
    if (!isPreview || !par || (par as any).__crObs || typeof ResizeObserver === 'undefined') return
    const post = () => window.parent?.postMessage({ type: 'camrhia-hero-box', w: par.clientWidth, h: par.clientHeight }, '*')
    const ro = new ResizeObserver(post)
    ;(par as any).__crObs = ro
    ro.observe(par)
    post()
  }

  const heroImg = (cls: string) =>
    shownHero.length === 0 ? (
      <div className={cls} style={{ background: accent, opacity: 0.85 }} />
    ) : (
      <>
        {shownHero.map((u, i) => (
          <img key={u} ref={(el) => { if (i === 0 && el) watchHero(el.parentElement) }} src={u} alt={i === 0 ? name : ''} className={cls}
            style={{ objectFit: 'cover', objectPosition: (heroFocus[heroPaths[i]]?.x ?? 50) + '% ' + (heroFocus[heroPaths[i]]?.y ?? 50) + '%', opacity: i === slide % shownHero.length ? 1 : 0, transition: 'opacity 1.2s ease-in-out' }} />
        ))}
      </>
    )

  const alignCls = t.hero.align === 'left' ? 'items-start text-left' : t.hero.align === 'right' ? 'items-end text-right' : 'items-center text-center'
  const vCls = t.hero.valign === 'top' ? 'pt-32' : t.hero.valign === 'center' ? 'my-auto py-20' : 'mt-auto pb-20 md:pb-28'
  const ov = t.hero.overlay
  const h1Big: React.CSSProperties = { ...headStyle, fontSize: 'var(--hl)', lineHeight: 1.05 }
  const h1Mid: React.CSSProperties = { ...headStyle, fontSize: 'calc(var(--hl) * 0.85)', lineHeight: 1.05 }
  const heroPara = (color?: string) =>
    t.hero.paraText ? (
      <p className="cr-hpara mt-5 max-w-xl whitespace-pre-line leading-relaxed" style={{ color, marginLeft: t.hero.align === 'left' ? 0 : 'auto', marginRight: t.hero.align === 'right' ? 0 : 'auto' }}>{t.hero.paraText}</p>
    ) : null

  const fsr = (v: string, rem: number) => `calc(${rem}rem * var(--${v}, 1))`
  const fsp = (v: string, px: number) => `calc(${px}px * var(--${v}, 1))`

  const sec = (id: string, title: string | null, children: React.ReactNode, tinted: boolean) => (
    <section id={id} className="scroll-mt-16 px-6" style={{ background: tinted ? tint : undefined, paddingTop: 'var(--space)', paddingBottom: 'var(--space)' }}>
      <div className="mx-auto max-w-6xl">
        {title && <h2 className="cr-sech mb-12 text-center" style={{ ...headStyle, fontSize: 'var(--sec-h)', lineHeight: 1.15 }}>{title}</h2>}
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
      case 'explore':
        return exploreEl
      case 'about': {
        const L = t.about.layout
        const aboutSet = (r as any).site_settings?.about
        if (aboutSet?.layout === 'canvas') {
          return sec('about', null,
            <AboutCanvas
              canvas={aboutSet?.canvas} photo2={aboutSet?.photo2} aboutPhoto={aboutPhoto} toUrl={(pth) => photoUrl(pth)} editing={isPreview}
              title={t.titles.about} bio={(t.text.about ?? r.bio ?? '').toString()} headStyle={headStyle} ink={ink} soft={soft} tint={tint}
              bodyFont={t.body} headWeight={t.headWeight} defaultButton={t.hero.ctaText}
              renderButton={(label) => (
                <a href={availHref} className="cr-btn inline-block px-8 py-3 text-[11px] uppercase tracking-[0.22em]" style={btnStyle}>{label}</a>
              )}
            />, false)
        }
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
                  <h2 className="cr-sech" style={{ ...headStyle, fontWeight: t.headWeight ?? 200, fontSize: 'clamp(2.2rem, 6vw, 4.5rem)', lineHeight: 1.05 }}>{t.titles.about}</h2>
                )}
                <p className="el-about_text mt-6 whitespace-pre-line text-justify leading-[1.9]" style={{ color: soft, fontWeight: 300, fontSize: fsp('fs-about', 16) }}>{t.text.about ?? r.bio ?? ''}</p>
                <div className="mt-8">{cta(true)}</div>
              </div>
              {photo2 && (
                <img src={photo2} alt="" loading="lazy" className="absolute bottom-0 right-0 z-0 w-[40%] object-cover md:w-[30%]" style={{ aspectRatio: '4/5', borderRadius: 28 }} />
              )}
            </div>, false)
        }
        const body = (
          <div className={L === 'stacked' ? 'mx-auto max-w-2xl text-center' : ''}>
            <p className="el-about_text whitespace-pre-line leading-[1.85]" style={{ color: soft, fontSize: fsp('fs-about', 16) }}>{t.text.about ?? r.bio ?? ''}</p>
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
        const L: string = page === 'galleries' ? (['checker', 'rows', 'custom'].includes(rawGal) ? rawGal : t.galindex.layout) : t.portfolio.layout
        const list = page === 'home' ? galleries.slice(0, 6) : galleries
        const card = (g: any, style: React.CSSProperties, cls = '', big = false) => {
          const cover = g.photos.find((p: any) => p.id === g.cover_photo_id) ?? g.photos[0]
          const u = photoUrl(cover?.storage_path)
          return (
            <a key={g.id} href={`${base}/g/${g.id}${qs}`} className={`group relative block overflow-hidden ${cls}`} style={{ background: '#E5E1DB', ...style }}>
              {u && <img src={u} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />}
              <div className="absolute inset-0" style={{ background: 'linear-gradient(transparent 55%, rgba(0,0,0,0.62))' }} />
              <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                <p className="el-gal_name" style={{ ...headStyle, fontSize: fsr('fs-cover', big ? 2.25 : 1.875), lineHeight: 1.15 }}>{g.title}</p>
                <p className="el-gal_count mt-1 text-[11px] uppercase tracking-[0.22em] opacity-90">{g.photos.length} photos →</p>
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
                    const href = `${base}/g/${g.id}${qs}`
                    const photoTile = (
                      <a key={g.id + 'p'} href={href} className="relative block aspect-square overflow-hidden" style={{ background: '#E5E1DB' }}>
                        {u && <img src={u} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-700 hover:scale-105" />}
                      </a>
                    )
                    const textTile = (
                      <a key={g.id + 't'} href={href} className="flex aspect-square items-center justify-center p-4 text-center" style={{ background: bg }}>
                        <span className="cr-h el-gal_name" style={{ ...headStyle, textTransform: 'uppercase', letterSpacing: '0.02em', lineHeight: 1, fontSize: 'calc(clamp(1.4rem, 4.2vw, 3.6rem) * var(--fs-cover, 1))' }}>{g.title}</span>
                      </a>
                    )
                    return i % 2 === 0 ? [photoTile, textTile] : [textTile, photoTile]
                  })}
                </div>
              </div>
            ) : L === 'rows' ? (
              <div className="mx-auto" style={{ maxWidth: 'min(64rem, var(--cover-w))' }}>
                {list.map((g, i) => {
                  const cover = g.photos.find((p: any) => p.id === g.cover_photo_id) ?? g.photos[0]
                  const u = photoUrl(cover?.storage_path)
                  const href = `${base}/g/${g.id}${qs}`
                  const odd = i % 2 === 1
                  return (
                    <div key={g.id} className="grid items-center md:grid-cols-2" style={{ marginTop: i > 0 ? 'calc(var(--gap) + 24px)' : 0 }}>
                      <a href={href} className={`group relative block overflow-hidden ${odd ? 'md:order-2' : ''}`} style={{ aspectRatio: '4/3', background: '#E5E1DB' }}>
                        {u && <img src={u} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />}
                      </a>
                      <div className={`flex flex-col items-center justify-center px-6 py-10 text-center ${odd ? 'md:order-1' : ''}`}>
                        <span className="text-sm tracking-[0.2em]" style={{ color: accent }}>{String(i + 1).padStart(2, '0')}</span>
                        <a href={href} className="el-gal_name mt-3" style={{ ...headStyle, fontSize: 'calc(clamp(2.25rem, 4vw, 3rem) * var(--fs-cover, 1))', lineHeight: 1.15 }}>{g.title}</a>
                        <p className="el-gal_count mt-3 text-[11px] uppercase tracking-[0.22em]" style={{ color: soft }}>{g.photos.length} photos</p>
                        <a href={href} className="mt-6 text-[11px] uppercase tracking-[0.22em]" style={{ color: accent }}>View gallery →</a>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : L === 'custom' ? (
              <AboutCanvas
                canvas={(r as any).site_settings?.galindex?.canvas} photo2={null} aboutPhoto={aboutPhoto} toUrl={(pth) => photoUrl(pth)} editing={isPreview}
                title={null} bio="" headStyle={headStyle} ink={ink} soft={soft} tint={tint}
                bodyFont={t.body} headWeight={t.headWeight} defaultButton={t.hero.ctaText} boardId="galleries"
                galleries={galleries.map((g) => ({ id: g.id, title: g.title, coverUrl: photoUrl((g.photos.find((x: any) => x.id === g.cover_photo_id) ?? g.photos[0])?.storage_path) }))}
                galleryHref={(id) => `${base}/g/${id}${qs}`}
                fallback={(dv) => galleryStarter(dv, galleries.map((g) => g.id))}
                renderButton={(label) => (
                  <a href={availHref} className="cr-btn inline-block px-8 py-3 text-[11px] uppercase tracking-[0.22em]" style={btnStyle}>{label}</a>
                )}
              />
            ) : L === 'banners' ? (
              <div className="flex flex-col" style={{ maxWidth: 'var(--cover-w)', marginLeft: 'auto', marginRight: 'auto', gap: 'calc(var(--gap) + 8px)' }}>
                {list.map((g) => card(g, { aspectRatio: '21/9', minHeight: 180 }))}
              </div>
            ) : L === 'feature' ? (
              <div className="grid md:grid-cols-3" style={{ maxWidth: 'var(--cover-w)', marginLeft: 'auto', marginRight: 'auto', gap: 'calc(var(--gap) + 8px)' }}>
                {list.map((g, i) => (i === 0 ? card(g, { aspectRatio: '16/10' }, 'md:col-span-2', true) : card(g, { aspectRatio: '4/5' })))}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3" style={{ maxWidth: 'var(--cover-w)', marginLeft: 'auto', marginRight: 'auto', gap: 'calc(var(--gap) + 8px)' }}>
                {list.map((g) => card(g, { aspectRatio: t.cardRatio }))}
              </div>
            )}
            {page === 'home' && galleries.length > 0 && (
              <div className="mt-10 text-center">
                <a href={hrefs.galleries} className="el-gal_link text-[11px] uppercase tracking-[0.22em]" style={{ color: accent }}>View all galleries →</a>
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
            <ul className="el-pr_list grid gap-2.5 text-center leading-snug" style={{ color: soft, fontSize: fsp('fs-plist', 14) }}>
              {feats(d).map((f, j) => <li key={j}>{f}</li>)}
            </ul>
          )
        const layoutBlocks = (pkgs: any[]) => (<>
            {L === 'cards' && (
              <div className="grid items-stretch" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 24 }}>
                {pkgs.map((p) => {
                  const hot = p.id === fid
                  return (
                    <div key={p.id} className="flex flex-col items-center px-8 py-10 text-center"
                      style={{ background: panel, border: `1px solid ${hot ? accent : line}`, boxShadow: hot ? '0 10px 30px rgba(0,0,0,0.08)' : undefined }}>
                      {tag(hot)}
                      <h3 className="el-pr_name" style={{ ...headStyle, fontSize: fsr('fs-pname', 1.5), lineHeight: 1.25 }}>{p.title}</h3>
                      {p.price && <p className="el-pr_price mt-3" style={{ ...headStyle, color: accent, fontSize: fsr('fs-pprice', 2.25), lineHeight: 1.15 }}>{p.price}</p>}
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
                {pkgs.map((p, i) => {
                  const hot = p.id === fid
                  return (
                    <div key={p.id} className="py-8" style={{ borderTop: i > 0 ? `1px solid ${line}` : undefined }}>
                      {hot && <p className="mb-2 text-[10px] uppercase tracking-[0.28em]" style={{ color: accent }}>Most popular</p>}
                      <div className="flex items-baseline gap-3">
                        <h3 className="el-pr_name" style={{ ...headStyle, color: hot ? accent : ink, fontSize: fsr('fs-pname', 1.5), lineHeight: 1.25 }}>{p.title}</h3>
                        <span className="flex-1" style={{ borderBottom: `1px dotted ${soft}`, opacity: 0.5, transform: 'translateY(-4px)' }} />
                        {p.price && <span className="el-pr_price" style={{ ...headStyle, color: accent, fontSize: fsr('fs-pprice', 1.5) }}>{p.price}</span>}
                      </div>
                      {feats(p.description).length > 0 && (
                        <p className="el-pr_list mt-3 leading-relaxed" style={{ color: soft, fontSize: fsp('fs-plist', 14) }}>{feats(p.description).join('   ·   ')}</p>
                      )}
                      {book(hot, 'mt-5')}
                    </div>
                  )
                })}
              </div>
            )}

            {L === 'columns' && (
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 1, background: line, border: `1px solid ${line}` }}>
                {pkgs.map((p) => {
                  const hot = p.id === fid
                  return (
                    <div key={p.id} className="flex flex-col items-center px-8 py-12 text-center" style={{ background: hot ? tint : bg }}>
                      {tag(hot)}
                      <h3 className="el-pr_name" style={{ ...headStyle, fontSize: fsr('fs-pname', 1.5), lineHeight: 1.25 }}>{p.title}</h3>
                      {p.price && <p className="el-pr_price mt-3" style={{ ...headStyle, color: accent, fontSize: fsr('fs-pprice', 1.875), lineHeight: 1.15 }}>{p.price}</p>}
                      <div className="my-6 h-px w-10" style={{ background: accent, opacity: 0.6 }} />
                      {list(p.description)}
                      <div className="mt-auto">{book(hot)}</div>
                    </div>
                  )
                })}
              </div>
            )}

            </>)
        const typeLabel = (k: string) => (k ? k.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()) : 'Other')
        const pkgGroups: { key: string; items: any[] }[] = []
        for (const pk of sitePkgs) {
          const k = String((pk as any).session_type ?? '')
          let g = pkgGroups.find((x) => x.key === k)
          if (!g) { g = { key: k, items: [] }; pkgGroups.push(g) }
          g.items.push(pk)
        }
        return sec('investment', t.titles.investment,
          <div className="mx-auto max-w-5xl">
            {t.pricing.intro && (
              <p className="el-pr_intro mx-auto mb-12 max-w-xl whitespace-pre-line text-center leading-relaxed" style={{ color: soft, fontSize: fsp('fs-plist', 15) }}>{t.pricing.intro}</p>
            )}

            {pkgGroups.length > 1 ? pkgGroups.map((gp) => (
              <div key={gp.key} className="mt-14 first:mt-0">
                <p className="el-pr_group mb-8 text-center uppercase tracking-[0.28em]" style={{ color: accent, fontSize: fsp('fs-plist', 12) }}>{typeLabel(gp.key)}</p>
                {layoutBlocks(gp.items)}
              </div>
            )) : layoutBlocks(sitePkgs)}
            {t.pricing.note && (
              <p className="el-pr_note mx-auto mt-10 max-w-xl whitespace-pre-line text-center italic leading-relaxed" style={{ color: soft, fontSize: fsp('fs-plist', 14) }}>{t.pricing.note}</p>
            )}
            {!t.pricing.button && <div className="mt-10 text-center">{cta(true)}</div>}
          </div>, tinted)
      }
      case 'testimonials': {
        const L: string = t.testi.layout
        const list = quotesShown.slice(0, 6)
        return sec('words', t.titles.testimonials,
          L === 'stacked' ? (
            <div className="mx-auto max-w-3xl">
              {list.map((q, i) => (
                <figure key={i} className="py-10 text-center" style={{ borderTop: i > 0 ? `1px solid ${line}` : undefined }}>
                  {q.img && <img src={q.img} alt="" loading="lazy" className="mx-auto mb-6 h-24 w-24 rounded-full object-cover" />}
                  <blockquote className="el-tes_quote italic leading-relaxed" style={{ fontFamily: t.head, fontSize: fsr('fs-testi', 1.5) }}>&ldquo;{q.text}&rdquo;</blockquote>
                  {q.who && <figcaption className="el-tes_name mt-4 text-[11px] uppercase tracking-[0.22em]" style={{ color: soft }}>{q.who}</figcaption>}
                </figure>
              ))}
            </div>
          ) : L === 'cards' ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {list.map((q, i) => (
                <figure key={i} className="flex flex-col p-8" style={{ background: `color-mix(in srgb, ${bg} 40%, #fff)`, border: `1px solid ${line}` }}>
                  <span style={{ ...headStyle, color: accent, fontSize: 48, lineHeight: 1 }}>&ldquo;</span>
                  <blockquote className="el-tes_quote mt-2 flex-1 leading-relaxed" style={{ fontSize: fsp('fs-testi', 15) }}>{q.text}</blockquote>
                  <figcaption className="mt-6 flex items-center gap-3">
                    {q.img && <img src={q.img} alt="" loading="lazy" className="h-10 w-10 rounded-full object-cover" />}
                    {q.who && <span className="el-tes_name text-[11px] uppercase tracking-[0.22em]" style={{ color: soft }}>{q.who}</span>}
                  </figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <div className="grid gap-10 md:grid-cols-3">
              {list.map((q, i) => (
                <figure key={i} className="text-center">
                  {q.img && <img src={q.img} alt="" loading="lazy" className="mx-auto mb-6 w-full object-cover" style={{ aspectRatio: '4/5' }} />}
                  <blockquote className="el-tes_quote italic leading-relaxed" style={{ fontFamily: t.head, fontSize: fsr('fs-testi', 1.25) }}>&ldquo;{q.text}&rdquo;</blockquote>
                  {q.who && <figcaption className="el-tes_name mt-4 text-[11px] uppercase tracking-[0.22em]" style={{ color: soft }}>{q.who}</figcaption>}
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
              questionClassName="el-faq_q"
              answerClassName="el-faq_a"
              questionStyle={{ fontFamily: t.head, fontSize: fsp('fs-faqq', 20), color: ink }}
              answerStyle={{ fontFamily: t.body, fontSize: fsp('fs-faqa', 15), color: soft, lineHeight: 1.7 }}
            />
          </div>, tinted)
      case 'contact':
        return sec('contact', t.titles.contact,
          <div className="mx-auto max-w-xl text-center">
            <p className="el-con_msg mb-8 whitespace-pre-line leading-relaxed" style={{ color: soft, fontSize: fsp('fs-contact', 15) }}>
              {t.text.contact ?? 'Tell me about your day. Check a date and send me a message.'}
            </p>
            <div className="mb-10"><a href={availHref} className="cr-btn ct-btn inline-block px-8 py-3 text-[11px] uppercase tracking-[0.22em]" style={btnStyle}>{t.text.contactBtn}</a></div>
            {socials.length > 0 && (
              <div className="flex flex-wrap justify-center gap-x-8 gap-y-3">
                {socials.map((s) => (
                  <a key={s.label} href={String(s.url).startsWith('http') ? s.url : `https://${s.url}`} target="_blank" rel="noopener noreferrer"
                    className="el-con_social uppercase tracking-[0.22em]" style={{ color: accent, fontSize: fsp('fs-social', 11) }}>{s.label}</a>
                ))}
              </div>
            )}
          </div>, tinted)
      default: {
        const cs = t.customs.find((x) => x.id === k)
        if (!cs) return null
        return sec(k, null,
          <AboutCanvas
            canvas={cs.canvas} photo2={null} aboutPhoto={aboutPhoto} toUrl={(pth) => photoUrl(pth)} editing={isPreview}
            title={null} bio="" headStyle={headStyle} ink={ink} soft={soft} tint={tint}
            bodyFont={t.body} headWeight={t.headWeight} defaultButton={t.hero.ctaText} boardId={cs.id}
            renderButton={(label) => (
              <a href={availHref} className="cr-btn inline-block px-8 py-3 text-[11px] uppercase tracking-[0.22em]" style={btnStyle}>{label}</a>
            )}
          />, false)
      }
    }
  }

  const exploreEl = page === 'home' && doors.length > 0 && ex.show !== false ? (
          <section id="explore" className="px-6 py-16">
          <div className="mx-auto max-w-6xl">
            {ex.heading?.trim() && (
              <p className="el-ex_label mb-8 text-center text-[11px] uppercase tracking-[0.3em]" style={{ color: soft }}>{ex.heading}</p>
            )}

            {exLayout === 'lines' && (
              <div className="grid gap-0" style={{ gridTemplateColumns: `repeat(${Math.min(3, doors.length)}, minmax(0, 1fr))` }}>
                {doors.map((b, i) => (
                  <a key={b.href} href={b.href} className="block px-3 py-8 text-center sm:px-6" style={{ borderTop: `1px solid ${line}`, borderLeft: i > 0 ? `1px solid ${line}` : undefined }}>
                    <p className="ex-t el-ex_title text-2xl sm:text-3xl" style={headStyle}>{b.t}</p>
                    <p className="ex-s el-ex_sub mt-2 text-[10px] uppercase tracking-[0.2em] sm:text-[11px] sm:tracking-[0.22em]" style={{ color: accent }}>{b.s} →</p>
                  </a>
                ))}
              </div>
            )}

            {exLayout === 'tiles' && (
              <div className="grid gap-4 sm:grid-cols-3">
                {doors.map((b, i) => (
                  <a key={b.href} href={b.href} className="ex-tile group flex min-h-[200px] flex-col justify-between p-7 transition hover:-translate-y-1" style={{ background: tint, border: `1px solid ${line}`, borderRadius: t.radius }}>
                    <span className="text-sm tracking-[0.2em]" style={{ color: accent }}>{String(i + 1).padStart(2, '0')}</span>
                    <div>
                      <p className="ex-t el-ex_title text-4xl" style={headStyle}>{b.t}</p>
                      <p className="ex-s el-ex_sub mt-3 text-[11px] uppercase tracking-[0.22em]" style={{ color: soft }}>{b.s} →</p>
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
                    <span className="ex-t el-ex_title flex-1 text-3xl sm:text-5xl" style={headStyle}>{b.t}</span>
                    <span className="ex-s el-ex_sub hidden text-[11px] uppercase tracking-[0.22em] sm:block" style={{ color: soft }}>{b.s}</span>
                    <span className="text-xl" style={{ color: accent }}>→</span>
                  </a>
                ))}
              </div>
            )}

            {exLayout === 'cards' && (
              <div className="grid gap-5 sm:grid-cols-3">
                {doors.map((b) => (
                  <a key={b.href} href={b.href} className="ex-tile block px-6 py-9 text-center transition hover:-translate-y-1" style={{ background: tint, borderTop: `3px solid ${accent}`, borderRadius: t.radius }}>
                    <p className="ex-t el-ex_title text-3xl" style={headStyle}>{b.t}</p>
                    <p className="ex-s el-ex_sub mx-auto mt-3 max-w-[16rem] text-sm" style={{ color: soft }}>{b.s}</p>
                    <p className="mt-5 text-[11px] uppercase tracking-[0.22em]" style={{ color: accent }}>Visit →</p>
                  </a>
                ))}
              </div>
            )}

            {exLayout === 'stack' && (
              <div className="space-y-2">
                {doors.map((b) => (
                  <a key={b.href} href={b.href} className="block py-6 text-center transition hover:opacity-70">
                    <p className="ex-t el-ex_title text-4xl sm:text-6xl" style={headStyle}>{b.t}</p>
                    <p className="ex-s el-ex_sub mt-3 text-[11px] uppercase tracking-[0.25em]" style={{ color: accent }}>{b.s}</p>
                  </a>
                ))}
              </div>
            )}

            {exLayout === 'outline' && (
              <div className="grid gap-4 sm:grid-cols-3">
                {doors.map((b) => (
                  <a key={b.href} href={b.href} className="ex-tile flex min-h-[180px] flex-col justify-between p-7 transition hover:-translate-y-1" style={{ border: `1px solid ${accent}`, borderRadius: t.radius }}>
                    <p className="ex-t el-ex_title text-3xl" style={headStyle}>{b.t}</p>
                    <div className="mt-6 flex items-end justify-between gap-3">
                      <p className="ex-s el-ex_sub text-[11px] uppercase tracking-[0.22em]" style={{ color: soft }}>{b.s}</p>
                      <span className="text-xl" style={{ color: accent }}>→</span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
          </section>
        ) : null

  return (
    <>
      <link rel="stylesheet" href={t.fontsHref} />
      {extraFontsHref && <link rel="stylesheet" href={extraFontsHref} />}
      {secCss && <style dangerouslySetInnerHTML={{ __html: secCss }} />}
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
                  {heroPara()}
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
                <p className="cr-hpara mt-6 max-w-md whitespace-pre-line text-[15px] leading-relaxed" style={{ color: soft }}>
                  {t.hero.paraText ?? (t.text.about ?? r.bio ?? '').toString().split(/\n+/)[0].slice(0, 220)}
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
              {heroPara(soft)}
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
                  {heroPara(soft)}
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
              {heroPara(soft)}
            </div>
            <div className="relative mt-10 w-full overflow-hidden" style={{ height: 'calc(var(--hero-h) * 0.8)' }}>
              {heroImg('absolute inset-0 h-full w-full')}
              <div className="absolute bottom-0 left-0 px-6 pb-6">{cta()}</div>
            </div>
          </header>
        )}
        {page === 'home' && tpl === 'mosaic' && (
          <header id="top">
            <div className="mx-auto max-w-6xl px-4 pb-4">
              <AboutCanvas
                canvas={(r as any).site_settings?.hero?.canvas} photo2={null} aboutPhoto={null} toUrl={(pth) => photoUrl(pth)} editing={isPreview}
                title={null} bio="" headStyle={headStyle} ink={ink} soft={soft} tint={tint}
                bodyFont={t.body} headWeight={t.headWeight} defaultButton={t.hero.ctaText} boardId="hero"
                fallback={(dev) => heroStarter(dev, mosaicSrcs.length > 0 ? mosaicSrcs : isPreview ? PH_SCENES.slice(0, 3) : [])}
                renderSpecial={(type, it, dev) => {
                  if (type === 'logo') {
                    return (
                      <a href={hrefs.home} style={{ display: 'inline-flex' }}>
                        {logo ? <img src={logo} alt={name} style={{ height: 'var(--logo)', objectFit: 'contain' }} /> : <span style={{ ...headStyle, fontSize: 24, color: 'inherit' }}>{name}</span>}
                      </a>
                    )
                  }
                  if (type === 'title') return <h1 style={{ ...h1Mid, margin: 0, color: 'inherit' }}>{headline}</h1>
                  if (type === 'subtitle') return subhead ? <p className="cr-sub text-[11px] uppercase tracking-[0.28em]" style={{ color: it.light ? '#fff' : accent, margin: 0 }}>{subhead}</p> : null
                  if (type === 'menu') {
                    if (dev === 'phone' || burger) {
                      return (
                        <button type="button" aria-label="Menu" onClick={() => setOpen(true)} style={{ lineHeight: 1 }}>
                          <svg width="30" height="22" viewBox="0 0 30 22" fill="none" stroke="currentColor" strokeWidth="3"><path d="M0 3h30M0 11h30M0 19h30" /></svg>
                        </button>
                      )
                    }
                    return (
                      <ul className="flex flex-wrap gap-x-8 gap-y-2">
                        {navItems.map((n) => (
                          <li key={n.key}>
                            <a href={n.href} className="text-[11px] uppercase tracking-[0.2em]" style={{ fontFamily: t.body, fontSize: 'var(--menu)', opacity: n.active ? 1 : 0.8, borderBottom: n.active ? '1px solid currentColor' : '1px solid transparent', paddingBottom: 3 }}>{n.label}</a>
                          </li>
                        ))}
                      </ul>
                    )
                  }
                  return null
                }}
                renderButton={(label) => (
                  <a href={availHref} className="cr-btn inline-block px-8 py-3 text-[11px] uppercase tracking-[0.22em]" style={btnStyle}>{label}</a>
                )}
              />
            </div>
            {open && (
              <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8" style={{ background: bg, color: ink }}>
                <button aria-label="Close menu" onClick={() => setOpen(false)} className="absolute right-6 top-5 text-3xl" style={{ lineHeight: 1 }}>✕</button>
                {navItems.map((n) => (
                  <a key={n.key} href={n.href} onClick={() => setOpen(false)} className="text-4xl md:text-5xl" style={{ ...headStyle, opacity: n.active ? 1 : 0.75 }}>{n.label}</a>
                ))}
              </div>
            )}
          </header>
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

        <footer id="footer" className="px-6 pb-12 pt-6 text-center uppercase tracking-[0.2em]" style={{ color: soft, fontSize: 'calc(11px * var(--fs-foot, 1))' }}>
          {t.text.footer && <p className="el-ft_line mb-3 whitespace-pre-line normal-case tracking-normal" style={{ fontSize: 'calc(13px * var(--fs-foot, 1))' }}>{t.text.footer}</p>}
          <span className="el-ft_copy">{t.text.copyright ? t.text.copyright.replace(/\{year\}/g, String(new Date().getFullYear())) : `© ${new Date().getFullYear()} ${name}`}</span> · <a href="https://camrhia.com" style={{ color: accent }}>Powered by Camrhia</a>
        </footer>
      </div>
    </>
  )
}
