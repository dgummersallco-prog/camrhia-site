'use client'
import CustomJs from '@/app/site/CustomJs'
import { sanitizeCss } from '@/lib/safeCss'

import { useSiteBase } from '@/app/site/useSiteBase'
import { AboutCanvas } from './AboutCanvas'
import { heroStarter } from '@/lib/aboutCanvas'
import { galleryStarter, exploreStarter } from '@/lib/aboutCanvas'
import { installPreviewGlow } from '@/lib/previewGlow'
import { installPreviewPick } from '@/lib/previewPick'
import { installPreviewSections } from '@/lib/previewSections'
import { FONT_OPTIONS } from '@/lib/siteTheme'
import React, { useEffect, useState } from 'react'
import { FaqAccordion } from '../../p/[token]/FaqAccordion'
import { TestiSlider } from './TestiSlider'
import { PricingDesign, PR_SEC, PR_PAGE } from './PricingDesigns'
import { PortfolioLightbox } from '../../p/[token]/PortfolioLightbox'
import { resolveTheme, NAV_DEFAULTS } from '@/lib/siteTheme'
import { blogPosts } from '@/lib/blog'
import { GalleriesSection, GALSEC, GALOWN } from './GalleriesSections'
import { SiteNav } from './SiteNav'

const STORAGE_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/portfolio/`
  : ''
function photoUrl(path: string | null | undefined): string | null {
  if (path && (path.startsWith('data:') || path.startsWith('http'))) return path
  return path ? (path.startsWith('/') ? path : `${STORAGE_BASE}${path}`) : null
}

// Shown only inside the designer preview, so every section is visible while building.
const PH_SCENES = [1, 2, 3, 4, 5, 6].map((n) => 'https://picsum.photos/seed/camrhia' + n + '/800/1000')
const PH_AVATAR = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="#E6E3DE"/><circle cx="100" cy="80" r="34" fill="#BDB8B0"/><path d="M32 200c0-42 30-68 68-68s68 26 68 68z" fill="#BDB8B0"/></svg>')
const PH_ABOUT = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000"><rect width="800" height="1000" fill="#EFECE7"/><g fill=\"none\" stroke=\"#BDB7AD\" stroke-width=\"14\" stroke-linejoin=\"round\" stroke-linecap=\"round\"><circle cx="560" cy="430" r="55"/><path d="M170 700 L340 500 L450 630 L520 550 L630 700 Z"/></g></svg>')
const PH_ABOUT_W = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900"><rect width="1600" height="900" fill="#EFECE7"/><g fill=\"none\" stroke=\"#BDB7AD\" stroke-width=\"14\" stroke-linejoin=\"round\" stroke-linecap=\"round\"><circle cx="930" cy="330" r="60"/><path d="M600 610 L780 400 L890 530 L960 450 L1080 610 Z"/></g></svg>')
const PH_GALLERIES = ['Wedding day', 'Engagement', 'Family'].map((title, gi) => ({
  id: 'ph' + gi,
  title,
  cover_photo_id: null as string | null,
  photos: [0, 1, 2, 3].map((k) => ({ id: 'ph' + gi + '-' + k, storage_path: PH_SCENES[(gi * 4 + k) % 6], sort_order: k })) as any[],
}))
const PH_QUOTES = [
  { text: 'This is where your testimonials will show. Add one in the app and it replaces this.', who: 'Client name', img: PH_AVATAR as string | null },
  { text: 'A kind word from a happy client goes here.', who: 'Another client', img: PH_AVATAR as string | null },
  { text: 'Short and sweet works best.', who: 'Third client', img: PH_AVATAR as string | null },
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

type PageKey = string

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
  useEffect(() => installPreviewPick(), [])
  useEffect(() => installPreviewSections(), [])

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
  const resolveLink = (val: any, dflt: string): string => {
    const x = String(val ?? '').trim()
    if (!x) return dflt
    if (hrefs[x]) return hrefs[x]
    if (x.startsWith('g:')) return `${base}/g/${x.slice(2)}${qs}`
    if (/^https?:\/\//i.test(x)) return x
    return dflt
  }

  const name: string = r.studio_name ?? r.display_name ?? 'Studio'
  const cityLine = [[r.service_city, r.service_state].filter(Boolean).join(', '), r.location_custom_text || null].filter(Boolean).join(' · ')
  const headline: string = (r.site_headline || '').trim() || (r.service_city ? `${r.service_city} Photographer` : 'Photographer')
  const subhead: string = (r.site_subhead || '').trim() || cityLine
  const logo = photoUrl(r.logo_path)
  const aboutPhoto = photoUrl((r as any).site_settings?.about?.photo ?? null) ?? (isPreview ? (['stacked', 'textfirst'].includes((r as any).site_settings?.about?.layout) ? PH_ABOUT_W : PH_ABOUT) : null)

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
      title: (t.galText[g.id]?.name?.trim() || g.title || '') as string,
      line: (t.galText[g.id]?.line ?? '').trim(),
      cover_photo_id: (g.cover_photo_id ?? null) as string | null,
      photos: [...(g.photos ?? [])].sort((x: any, y: any) => (x.sort_order ?? 0) - (y.sort_order ?? 0)) as any[],
    }))
    .filter((g) => g.photos.length > 0)
  const galleries = isPreview && realGalleries.length === 0 ? (PH_GALLERIES as typeof realGalleries) : realGalleries
  const realPkgs = ((r.site_packages ?? []) as { id: string; title: string; price: string | null; description: string | null; session_type?: string | null }[]).map((pk) => {
    const o = (r.site_settings?.pkgOver ?? {})[pk.id] ?? {}
    return { ...pk, ...(o.title !== undefined ? { title: o.title } : {}), ...(o.price !== undefined ? { price: o.price } : {}), ...(o.description !== undefined ? { description: o.description } : {}) }
  })
  const sitePkgs = isPreview && realPkgs.length === 0 ? PH_PKGS : realPkgs
  const quotes: { text: string; who: string; img: string | null }[] = [
    ...((r.testimonials ?? []) as any[]).filter((x) => x.quote).map((x) => ({ text: x.quote as string, who: (x.client_name ?? '') as string, img: photoUrl(x.storage_path) })),
    ...((r.reviews ?? []) as any[]).filter((v) => v.body).map((v) => ({ text: v.body as string, who: (v.couple_names ?? '') as string, img: null })),
  ]
  const siteFaq = (r as any).site_settings?.faq
  const realFaq = (Array.isArray(siteFaq) ? siteFaq : (r.faq ?? [])) as any[]
  const faq = isPreview && realFaq.length === 0 ? (PH_FAQ as any[]) : realFaq
  const quotesShown = quotes.length >= 3 ? quotes : [...quotes, ...PH_QUOTES.slice(quotes.length)]
  React.useEffect(() => {
    if (isPreview && typeof window !== 'undefined') window.parent?.postMessage({ type: 'camrhia-studio', name }, '*')
  }, [isPreview, name])
  const galleryCovers = galleries
    .map((g) => photoUrl((g.photos.find((x: any) => x.id === g.cover_photo_id) ?? g.photos[0])?.storage_path))
    .filter(Boolean) as string[]
  const mosaicSrcs: string[] = (Array.from(new Set([...heroPaths, ...galleries.map((g: any) => (g.photos.find((x: any) => x.id === g.cover_photo_id) ?? g.photos[0])?.storage_path)].filter(Boolean))) as string[]).slice(0, 3)

  const on = (k: string) => r.site_sections?.[k] !== false
  const showMap: Record<string, boolean> = {
    about: on('about') && !!(t.text.about || r.bio || aboutPhoto),
    portfolio: page === 'galleries' ? galleries.length > 0 : on('portfolio') && galleries.length > 0,
    galsec: on('galsec') && galleries.length > 0,
    pricesec: on('pricesec') && sitePkgs.length > 0,
    investment: on('investment') && sitePkgs.length > 0,
    testimonials: on('testimonials') && quotesShown.length > 0,
    faq: on('faq') && faq.length > 0,
    contact: true,
    explore: true,
    aboutcta: on('aboutcta'),
    social: ['instagram_url', 'facebook_url', 'pinterest_url', 'tiktok_url'].some((k) => !!(r as any)[k] && !t.socialHidden.includes(k)),
  }
  for (const c of t.customs) showMap[c.id] = on(c.id)
  const pageOrder: string[] = page === 'home' ? t.orderHome : page === 'about' ? t.orderAbout : page === 'galleries' ? t.orderGalleries : (t.extraPages.find((e) => e.id === page)?.sections ?? [])
  const visible = pageOrder.filter((k) => showMap[k])

  for (const e of t.extraPages) hrefs[e.id] = `${base}/p/${e.id}${qs}`
  hrefs.blog = `${base}/blog${qs}`
  const blogOn = blogPosts((r as any).site_settings).length > 0
  const navItems = ([...['home', 'galleries', 'about', 'book'], ...(blogOn ? ['blog'] : []), ...t.extraPages.map((e) => e.id)] as string[])
    .filter((k) => !(t.menu.hidden as string[]).includes(k) && !t.pagesOff.includes(k) && !(k === 'galleries' && galleries.length === 0))
    .map((k) => ({ key: k, href: hrefs[k], label: (t.menu.labels as Record<string, string | undefined>)[k]?.trim() || (NAV_DEFAULTS as Record<string, string>)[k] || t.extraPages.find((e) => e.id === k)?.label || k, active: k === page }))

  const ex = ((r as any).site_settings?.explore ?? {}) as { show?: boolean; layout?: string; heading?: string; lines?: Record<string, string>; titles?: Record<string, string> }
  const exLayout = ['lines', 'tiles', 'list', 'cards', 'stack', 'outline', 'free', 'birch', 'willow', 'aspen', 'alder', 'maple', 'elm', 'hawthorn', 'linden', 'rowan', 'beech', 'sorrel', 'tansy'].includes(String(ex.layout)) ? String(ex.layout) : 'lines'
  const doors = [
    ...(galleries.length > 0 ? [{ k: 'galleries', href: hrefs.galleries, t: ex.titles?.galleries?.trim() || t.menu.labels.galleries?.trim() || NAV_DEFAULTS.galleries, s: ex.lines?.galleries?.trim() || 'See my work' }] : []),
    { k: 'about', href: hrefs.about, t: ex.titles?.about?.trim() || t.menu.labels.about?.trim() || NAV_DEFAULTS.about, s: ex.lines?.about?.trim() || 'Get to know me' },
    { k: 'book', href: hrefs.book, t: ex.titles?.book?.trim() || t.menu.labels.book?.trim() || NAV_DEFAULTS.book, s: ex.lines?.book?.trim() || 'Check my dates' },
  ]

  const headStyle: React.CSSProperties = { fontFamily: t.head, fontWeight: t.headWeight ?? 500, letterSpacing: '0.01em' }

  // Per-section look: background, text color and fonts chosen in the designer.
  const secStyles = (((r as any).site_settings?.secStyle ?? {}) as Record<string, { bg?: string; text?: string; head?: string; body?: string; title?: string; titleFont?: string }>)
  const famOf = (k?: string) => (k && FONT_OPTIONS[k] ? FONT_OPTIONS[k].family : null)
  const hexOk = (v?: string) => (v && /^#[0-9a-fA-F]{3,8}$/.test(v) ? v : null)
  const pageBg = page === 'galleries' ? hexOk(secStyles.portfolio?.bg) : page === 'about' ? hexOk(secStyles.about?.bg) : null
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
  const pickPics = (n: number): string[] => {
    const a = [...galleryCovers, ...heroUrls].filter(Boolean)
    const src: string[] = a.length > 0 ? a : isPreview ? (PH_SCENES as string[]) : []
    return src.length === 0 ? [] : Array.from({ length: n }, (_, i) => src[i % src.length])
  }
  const aboutText = (n: number) => (t.text.about ?? r.bio ?? '').toString().slice(0, n)
  const galleryCover = (g: any) => photoUrl((g.photos.find((x: any) => x.id === g.cover_photo_id) ?? g.photos[0])?.storage_path)

  const cta = (force?: boolean) =>
    t.hero.ctaShow || force ? (
      <a data-name="Button" href={availHref} className="cr-btn inline-block px-8 py-3 text-[11px] uppercase tracking-[0.22em]" style={btnStyle} id="hero-btn">{force ? t.hero.ctaText : t.hero.heroCtaText}</a>
    ) : null

  const burger = (r as any).site_settings?.menu?.icon === 'burger'
  const renderNav = (overlay: boolean, center: boolean) => {
    const brand = logo && t.menu.show !== 'name'
      ? <img src={logo} alt={name} style={{ height: 'var(--logo)', objectFit: 'contain' }} />
      : <span className="el-menu_brand" style={{ ...headStyle, fontSize: 24 }}>{t.menu.brand ?? name}</span>
    return (
      <>
      <nav
        data-name="Menu bar"
        id="nav"
        className={overlay ? 'absolute inset-x-0 top-0 z-20' : t.menu.none ? 'relative z-20' : 'sticky top-0 z-20'}
        style={overlay ? { color: '#fff' } : t.menu.none ? { color: ink } : { color: ink, background: `color-mix(in srgb, ${t.menu.bg ?? bg} 94%, transparent)`, backdropFilter: 'blur(8px)', borderBottom: `1px solid ${line}` }}
      >
        <div className={(t.menu.logoPos ? t.menu.logoPos === 'center' : center) ? 'mx-auto flex max-w-6xl flex-col items-center gap-3 px-6 py-4' : 'mx-auto flex min-h-16 max-w-6xl items-center justify-between px-6 py-2' + (t.menu.logoPos === 'right' ? ' flex-row-reverse' : '')}>
          <a href={hrefs.home} style={{ display: 'inline-flex', transform: 'translate(var(--nudge, 0px), var(--nudgey, 0px))', transition: 'transform 0.12s ease-out' }}>{brand}</a>
          <ul className={burger ? 'hidden' : 'hidden gap-8 md:flex'} style={{ transform: 'translateY(var(--menuy, 0px))' }}>
            {navItems.map((n) => (
              <li key={n.key}>
                <a href={n.href} className="el-menu_links text-[11px] uppercase tracking-[0.2em]"
                  style={{ fontFamily: t.body, color: page === 'home' ? (t.menu.linkColor ?? undefined) : undefined, fontSize: 'var(--menu)', opacity: n.active ? 1 : 0.8, borderBottom: n.active ? '1px solid currentColor' : '1px solid transparent', paddingBottom: 3 }}>
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
                <a href={n.href} onClick={() => setOpen(false)} className="el-menu_links text-[12px] uppercase tracking-[0.2em]" style={{ fontFamily: t.body, color: page === 'home' ? (t.menu.linkColor ?? undefined) : undefined, fontSize: 'var(--menu)' }}>{n.label}</a>
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
      <div data-name="Cover image" className={cls} style={{ background: accent, opacity: 0.85 }} />
    ) : (
      <>
        {shownHero.map((u, i) => (
          <img key={u} ref={(el) => { if (i === 0 && el) watchHero(el.parentElement) }} src={u} alt={i === 0 ? name : ''} data-name="Cover image" className={cls}
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
      <p data-name="Hero paragraph" className="cr-hpara mt-5 max-w-xl whitespace-pre-line leading-relaxed" style={{ color, marginLeft: t.hero.align === 'left' ? 0 : 'auto', marginRight: t.hero.align === 'right' ? 0 : 'auto' }}>{t.hero.paraText}</p>
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
    { key: 'instagram_url', label: 'Instagram', url: r.instagram_url },
    { key: 'facebook_url', label: 'Facebook', url: r.facebook_url },
    { key: 'pinterest_url', label: 'Pinterest', url: r.pinterest_url },
    { key: 'tiktok_url', label: 'TikTok', url: r.tiktok_url },
  ].filter((s) => !!s.url && !t.socialHidden.includes(s.key)).map((s) => ({ ...s, url: /^https?:\/\//i.test(String(s.url).trim()) ? String(s.url).trim() : 'https://' + String(s.url).trim() }))

  const renderSection = (k: string, tinted: boolean): React.ReactNode => {
    switch (k) {
      case 'social': {
        const sd = String((r as any).site_settings?.socialDesign ?? '')
        const ig = String(socials.find((s) => s.key === 'instagram_url')?.url ?? '')
        const handle = ig ? '@' + (ig.replace(/\/+$/, '').split('/').pop() ?? '').split('?')[0] : ''
        const ab = (l: string) => (l === 'Instagram' ? 'IG' : l === 'Facebook' ? 'FB' : l === 'Pinterest' ? 'PI' : 'TT')
        if (socials.length > 0 && sd === 'coral') return (
          <section id="social" className="px-6 py-14 text-center">
            <p className="mb-5 text-[11px] uppercase tracking-[0.3em]" style={{ color: soft }}>Follow along</p>
            <div className="flex flex-wrap justify-center gap-4">
              {socials.map((s) => (
                <a key={s.key} href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.label} className="flex h-12 w-12 items-center justify-center rounded-full border text-xs" style={{ borderColor: accent, color: accent }}>{ab(s.label)}</a>
              ))}
            </div>
            {handle && <p className="mt-4 text-sm" style={{ color: soft }}>{handle}</p>}
          </section>
        )
        if (socials.length > 0 && sd === 'reef') return (
          <section id="social" className="px-6 py-14 text-center">
            <p className="mb-6 text-[11px] uppercase tracking-[0.3em]" style={{ color: soft }}>Follow along on Instagram</p>
            <div className="mx-auto grid max-w-5xl grid-cols-3 gap-2 sm:grid-cols-6">
              {pickPics(6).map((u, i) => (u ? <img key={i} src={u} alt="" className="aspect-square w-full object-cover" /> : null))}
            </div>
            <a href={ig ? socials.find((s) => s.key === 'instagram_url')?.url : socials[0].url} target="_blank" rel="noopener noreferrer" className="cr-btn mt-6 inline-block px-8 py-3 text-[11px] uppercase tracking-[0.22em]" style={btnStyle}>Follow {handle || 'us'}</a>
          </section>
        )
        if (socials.length > 0 && sd === 'ember') return (
          <section id="social" className="px-6 py-16">
            <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2">
              <div>
                <p style={{ ...headStyle, fontSize: 'clamp(2rem, 4vw, 3rem)', lineHeight: 1.05 }}>Find us on social</p>
                {handle && <p className="mt-3 text-sm" style={{ color: soft }}>{handle}</p>}
              </div>
              <div className="flex flex-col gap-3">
                {socials.map((s) => (
                  <a key={s.key} href={s.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-full border px-6 py-3 text-sm" style={{ borderColor: line, color: ink }}><span>{s.label}</span><span style={{ color: accent }}>→</span></a>
                ))}
              </div>
            </div>
          </section>
        )
        if (socials.length > 0 && sd === 'dune') return (
          <section id="social" className="px-6 py-14" style={{ background: '#2b1f17', color: '#f3ead8' }}>
            <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-6 md:flex-row">
              <p style={{ ...headStyle, fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', color: '#f3ead8' }}>Let&apos;s stay in touch</p>
              <div className="flex flex-wrap gap-3">
                {socials.map((s) => (
                  <a key={s.key} href={s.url} target="_blank" rel="noopener noreferrer" className="rounded-full border px-5 py-2 text-[11px] uppercase tracking-[0.2em]" style={{ borderColor: '#f3ead8', color: '#f3ead8' }}>{s.label}</a>
                ))}
              </div>
            </div>
          </section>
        )
        if (socials.length > 0 && sd === 'tide') {
          const pp = pickPics(4)
          return (
            <section id="social" className="px-6 py-14">
              <div className="mx-auto flex max-w-5xl flex-wrap justify-center gap-8">
                {socials.map((s, i) => (
                  <a key={s.key} href={s.url} target="_blank" rel="noopener noreferrer" className="block w-[44%] bg-white p-3 pb-4 shadow-lg sm:w-[22%]" style={{ transform: `rotate(${[-3, 2, -2, 3][i % 4]}deg)` }}>
                    {pp[i] && <img src={pp[i] as string} alt="" className="aspect-square w-full object-cover" />}
                    <p className="mt-3 text-center text-[11px] uppercase tracking-[0.2em] text-black">{s.label}</p>
                  </a>
                ))}
              </div>
            </section>
          )
        }
        return socials.length > 0 ? (
          <section id="social" className="px-6 py-12 text-center">
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              {socials.map((s) => (
                <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer" className="text-[11px] uppercase tracking-[0.22em]" style={{ fontFamily: t.body, color: accent }}>{s.label}</a>
              ))}
            </div>
          </section>
        ) : null
      }
      case 'explore':
        return exploreEl
      case 'about': {
        const L = t.about.layout
        const aboutSet = (r as any).site_settings?.about
        const aboutCrop = (key: 'side' | 'stacked' | 'collage'): React.CSSProperties => {
          const c = aboutSet?.crop?.[key]
          const x = typeof c?.x === 'number' ? c.x : 50
          const y = typeof c?.y === 'number' ? c.y : 50
          const z = typeof c?.z === 'number' ? c.z : 1
          return { objectPosition: `${x}% ${y}%`, transformOrigin: `${x}% ${y}%`, transform: z !== 1 ? `scale(${z})` : undefined }
        }
        const sectionMode = page !== 'about'
        const ad = String(sectionMode ? (aboutSet?.sectionDesign ?? '') : (aboutSet?.pageDesign ?? ''))
        const AP = ['lyra', 'vega', 'orion', 'cygnus', 'draco', 'aries', 'libra', 'pavo', 'lynx', 'hydra']
        const AS = ['saffron', 'cumin', 'clove', 'anise', 'fennel']
        if ((sectionMode ? AS : AP).includes(ad)) {
          const bio: string = String(t.text.about ?? r.bio ?? '')
          const paras: string[] = bio.split(/\n\s*\n/).map((x: string) => x.trim()).filter(Boolean)
          const p1 = paras[0] ?? bio
          const rest = paras.slice(1)
          const firstName = String((r as any).display_name ?? name).split(' ')[0]
          const heading = String(aboutSet?.heading ?? '').trim() || `Hi, I'm ${firstName}`
          const abSet = (r as any).site_settings?.aboutBtn ?? {}
          const btnText = String(abSet.text ?? '').trim() || (sectionMode ? 'Read more' : t.aboutBtnText)
          const btnHref = resolveLink(abSet.link, sectionMode ? hrefs.about : availHref)
          const btn = (dk = false) => (
            <a data-name="About button" href={btnHref} className="cr-btn inline-block px-8 py-3 text-[11px] uppercase tracking-[0.22em]" style={dk ? { border: '1px solid #f3ead8', color: '#f3ead8', borderRadius: t.radius } : btnStyle}>{btnText}</a>
          )
          const pp = pickPics(4)
          const main = aboutPhoto ?? pp[0] ?? null
          const img = () => (main ? <img src={main} alt={name} className="h-full w-full object-cover" style={aboutCrop('side')} /> : null)
          const small = (u: string | null | undefined, st: any = {}, cls = '') => (u ? <img src={u} alt="" className={'object-cover ' + cls} style={st} /> : null)
          const H = (st: any = {}) => <h2 className="el-about_title" style={{ ...headStyle, fontSize: 'clamp(1.9rem, 3.8vw, 3rem)', lineHeight: 1.08, ...st }}>{heading}</h2>
          const P = (list: string[], color: string = soft) => list.map((x, i) => <p key={i} className="el-about_text leading-[1.85]" style={{ color, fontSize: fsp('fs-about', 16) }}>{x}</p>)
          const dark = '#2b1f17'
          const out = (node: React.ReactNode) => sec('about', null, node, tinted)
          const loves: string[] = Array.isArray(aboutSet?.loves) ? aboutSet.loves.filter(Boolean).slice(0, 5) : []
          const facts: { q: string; a: string }[] = Array.isArray(aboutSet?.facts) ? aboutSet.facts.filter((f: any) => f?.q).slice(0, 8) : []
          const stats: { n: string; l: string }[] = Array.isArray(aboutSet?.stats) ? aboutSet.stats.filter((f: any) => f?.n).slice(0, 4) : []
          if (ad === 'lyra') return out(
            <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-2">
              <div className="overflow-hidden" style={{ aspectRatio: '4/5' }}>{img()}</div>
              <div className="space-y-5">{H()}{P(paras)}<div className="pt-2">{btn()}</div></div>
            </div>)
          if (ad === 'vega') return out(
            <div className="mx-auto max-w-3xl text-center">
              <div className="mx-auto h-56 w-56 overflow-hidden rounded-full">{img()}</div>
              <div className="mt-8">{H()}</div>
              <div className="mx-auto mt-6 max-w-2xl space-y-4">{P(paras)}</div>
              <div className="mt-10 grid grid-cols-3 gap-3">{pp.slice(0, 3).map((u, i) => <div key={i} className="overflow-hidden" style={{ aspectRatio: '4/3' }}>{small(u, {}, 'h-full w-full')}</div>)}</div>
              <div className="mt-10">{btn()}</div>
            </div>)
          if (ad === 'orion') {
            const half = Math.ceil(paras.length / 2)
            return out(
              <div className="mx-auto max-w-6xl">
                <div className="relative overflow-hidden" style={{ aspectRatio: '21/9' }}>
                  {img()}
                  <div className="absolute inset-0 bg-black/25" />
                  <p className="absolute bottom-6 left-8 text-white" style={{ ...headStyle, fontSize: 'clamp(2rem, 6vw, 4.5rem)', lineHeight: 1 }}>{name}</p>
                </div>
                <div className="mt-10 grid gap-10 md:grid-cols-2">
                  <div className="space-y-4">{P(paras.slice(0, half))}</div>
                  <div className="space-y-4">{P(paras.slice(half))}<div className="pt-2">{btn()}</div></div>
                </div>
              </div>)
          }
          if (ad === 'cygnus') return out(
            <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2">
              <div className="relative h-[420px] md:h-[520px]">
                <div className="absolute left-0 top-0 w-3/5 overflow-hidden shadow-lg" style={{ aspectRatio: '4/5', transform: 'rotate(-3deg)' }}>{img()}</div>
                {small(pp[1], { aspectRatio: '1/1', transform: 'rotate(3deg)' }, 'absolute right-0 top-10 w-1/2 shadow-lg')}
                {small(pp[2], { aspectRatio: '4/3', transform: 'rotate(-1deg)' }, 'absolute bottom-0 left-1/4 w-2/5 shadow-lg')}
              </div>
              <div className="space-y-5">{H()}{P(paras)}<div className="pt-2">{btn()}</div></div>
            </div>)
          if (ad === 'draco') return out(
            <div className="mx-auto max-w-6xl rounded-2xl p-8 md:p-14" style={{ background: dark, color: '#f3ead8' }}>
              <div className="grid items-center gap-10 md:grid-cols-2">
                <div className="space-y-5">
                  {H({ color: '#f3ead8' })}{P(paras, '#e6dccb')}
                  {loves.length > 0 && (<ol className="space-y-2 pt-2">{loves.map((x, i) => (<li key={i} className="flex gap-3"><span style={{ color: '#C9A24B' }}>{String(i + 1).padStart(2, '0')}</span><span>{x}</span></li>))}</ol>)}
                  <div className="pt-2">{btn(true)}</div>
                </div>
                <div className="overflow-hidden" style={{ aspectRatio: '4/5' }}>{img()}</div>
              </div>
            </div>)
          if (ad === 'aries') {
            const parts: [string, string][] = ([['My story', paras[0]], ['What I believe', paras[1]], ["Let's work together", paras[2]]] as [string, string | undefined][]).filter((x): x is [string, string] => !!x[1])
            const list: [string, string][] = parts.length ? parts : [['My story', p1]]
            return out(
              <div className="mx-auto max-w-6xl space-y-16">
                {list.map(([ttl, txt], i) => (
                  <div key={i} className="grid items-center gap-10 md:grid-cols-2">
                    <div className={i % 2 ? 'md:order-2' : ''}><h3 style={{ ...headStyle, fontSize: '1.8rem' }}>{ttl}</h3><p className="el-about_text mt-4 leading-[1.85]" style={{ color: soft, fontSize: fsp('fs-about', 16) }}>{txt}</p></div>
                    <div className={'overflow-hidden ' + (i % 2 ? 'md:order-1' : '')} style={{ aspectRatio: '4/3' }}>{i === 0 ? img() : small(pp[i], {}, 'h-full w-full')}</div>
                  </div>
                ))}
                <div className="text-center">{btn()}</div>
              </div>)
          }
          if (ad === 'libra') {
            const sentences: string[] = p1.match(/[^.!?]+[.!?]+\s*/g) ?? [p1]
            const quote = (sentences[0] ?? p1).trim()
            const remaining: string[] = [sentences.slice(1).join('').trim(), ...rest].filter(Boolean)
            return out(
              <div className="mx-auto max-w-5xl">
                <p className="text-center italic" style={{ ...headStyle, fontSize: 'clamp(1.6rem, 3.6vw, 2.8rem)', lineHeight: 1.2 }}>&ldquo;{quote}&rdquo;</p>
                <div className="mt-12 grid gap-10 md:grid-cols-[240px_1fr]">
                  <div className="overflow-hidden" style={{ aspectRatio: '3/4' }}>{img()}</div>
                  <div className="md:columns-2 md:gap-10">{remaining.map((x, i) => <p key={i} className="el-about_text mb-4 leading-[1.85]" style={{ color: soft, fontSize: fsp('fs-about', 16) }}>{x}</p>)}<div className="pt-2">{btn()}</div></div>
                </div>
              </div>)
          }
          if (ad === 'pavo') return out(
            <div className="mx-auto grid max-w-6xl items-start gap-10 md:grid-cols-2">
              <div className="overflow-hidden" style={{ aspectRatio: '3/4' }}>{img()}</div>
              <div className="space-y-5">
                {H()}{P([p1])}
                {facts.length > 0 && (<dl className="divide-y divide-black/10">{facts.map((f, i) => (<div key={i} className="flex justify-between gap-6 py-3 text-sm"><dt style={{ color: soft }}>{f.q}</dt><dd className="text-right" style={{ color: ink }}>{f.a}</dd></div>))}</dl>)}
                {P(rest)}<div className="pt-2">{btn()}</div>
              </div>
            </div>)
          if (ad === 'lynx') return out(
            <div className="mx-auto max-w-6xl">
              <div className="relative">
                <div className="overflow-hidden" style={{ aspectRatio: '16/8' }}>{img()}</div>
                <div className="relative max-w-md p-8 md:absolute md:bottom-0 md:left-8 md:translate-y-10" style={{ background: bg }}>
                  {H({ fontSize: '1.8rem' })}<p className="el-about_text mt-3 leading-[1.8]" style={{ color: soft }}>{p1}</p><div className="mt-5">{btn()}</div>
                </div>
              </div>
              <div className="mt-8 space-y-4 md:mt-24 md:columns-2 md:gap-10 md:space-y-0">{rest.map((x, i) => <p key={i} className="el-about_text mb-4 leading-[1.85]" style={{ color: soft, fontSize: fsp('fs-about', 16) }}>{x}</p>)}</div>
            </div>)
          if (ad === 'hydra') return out(
            <div className="mx-auto max-w-6xl">
              <div className="grid items-center gap-10 md:grid-cols-2">
                <div className="overflow-hidden" style={{ aspectRatio: '4/5' }}>{img()}</div>
                <div className="space-y-5">{H()}{P(paras)}<div className="pt-2">{btn()}</div></div>
              </div>
              {stats.length > 0 && (<div className="mt-14 grid gap-6 text-center" style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}>{stats.map((s, i) => (<div key={i}><p style={{ ...headStyle, color: accent, fontSize: 'clamp(2rem, 5vw, 3.5rem)', lineHeight: 1 }}>{s.n}</p><p className="mt-2 text-[11px] uppercase tracking-[0.2em]" style={{ color: soft }}>{s.l}</p></div>))}</div>)}
              <div className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-4">{pp.map((u, i) => <div key={i} className="overflow-hidden" style={{ aspectRatio: '1/1' }}>{small(u, {}, 'h-full w-full')}</div>)}</div>
            </div>)
          if (ad === 'saffron') return out(
            <div className="mx-auto grid max-w-6xl items-center gap-8 md:grid-cols-2">
              <div className="relative overflow-hidden" style={{ aspectRatio: '4/3' }}>{img()}<div className="pointer-events-none absolute inset-y-0 right-0 w-1/3" style={{ background: `linear-gradient(to right, transparent, ${bg})` }} /></div>
              <div className="space-y-4">{H({ fontSize: 'clamp(1.8rem, 3.4vw, 2.6rem)' })}{P([p1])}<div className="pt-2">{btn()}</div></div>
            </div>)
          if (ad === 'cumin') return out(
            <div className="mx-auto max-w-xl text-center">
              <div className="mx-auto h-28 w-28 overflow-hidden rounded-full">{img()}</div>
              <div className="mt-6">{H({ fontSize: 'clamp(1.7rem, 3vw, 2.4rem)' })}</div>
              <div className="mt-4 space-y-3">{P([p1])}</div>
              <div className="mt-6">{btn()}</div>
            </div>)
          if (ad === 'clove') return out(
            <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-2">
              <div className="space-y-5">{H({ fontSize: 'clamp(2.2rem, 5vw, 3.8rem)' })}{P([p1])}<div className="pt-2">{btn()}</div></div>
              <div className="relative mx-auto w-full max-w-sm md:ml-auto">
                <div className="absolute -bottom-4 -right-4 h-full w-4/5" style={{ background: tint }} />
                <div className="relative overflow-hidden" style={{ aspectRatio: '4/5' }}>{img()}</div>
              </div>
            </div>)
          if (ad === 'anise') return out(
            <div className="mx-auto max-w-6xl rounded-2xl p-8 md:p-12" style={{ background: dark, color: '#f3ead8' }}>
              <div className="grid items-center gap-8 md:grid-cols-[260px_1fr]">
                <div className="mx-auto w-full max-w-[260px] overflow-hidden" style={{ aspectRatio: '3/4', borderRadius: '9999px 9999px 0 0' }}>{img()}</div>
                <div className="space-y-4">{H({ color: '#f3ead8' })}{P([p1], '#e6dccb')}<div className="pt-2">{btn(true)}</div></div>
              </div>
            </div>)
          if (ad === 'fennel') return out(
            <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2">
              <div className="mx-auto w-64 bg-white p-3 pb-10 shadow-lg" style={{ transform: 'rotate(-3deg)' }}><div className="overflow-hidden" style={{ aspectRatio: '1/1' }}>{img()}</div></div>
              <div>
                <p className="el-about_text italic" style={{ ...headStyle, fontSize: 'clamp(1.4rem, 2.6vw, 2rem)', lineHeight: 1.4 }}>{p1}</p>
                <p className="mt-4" style={{ ...headStyle, color: accent, fontSize: '1.4rem' }}>&mdash; {firstName}</p>
                <div className="mt-5">{btn()}</div>
              </div>
            </div>)
        }
        if (aboutSet?.layout === 'canvas') {
          return sec('about', null,
            <AboutCanvas
              canvas={aboutSet?.canvas} photo2={aboutSet?.photo2} aboutPhoto={aboutPhoto} toUrl={(pth) => photoUrl(pth)} editing={isPreview}
              title={t.titles.about} bio={(t.text.about ?? r.bio ?? '').toString()} headStyle={headStyle} ink={ink} soft={soft} tint={tint}
              bodyFont={t.body} headWeight={t.headWeight} defaultButton={t.hero.ctaText}
              renderButton={(label) => (
                <a data-name="Button" href={availHref} className="cr-btn inline-block px-8 py-3 text-[11px] uppercase tracking-[0.22em]" style={btnStyle}>{label}</a>
              )}
            />, false)
        }
        if (aboutSet?.layout === 'collage') {
          const photo2 = photoUrl(aboutSet?.photo2)
          const cardBg = tint
          return sec('about', null,
            <div className="relative mx-auto max-w-5xl pb-20 md:pb-32">
              <div className="relative z-0 w-[68%] overflow-hidden md:w-[52%]" style={{ borderRadius: 28, aspectRatio: '3/4', background: tint }}>
                {aboutPhoto && <img src={aboutPhoto} alt={name} className="h-full w-full object-cover" style={aboutCrop('collage')} />}
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
          <div className={L === 'stacked' || L === 'textfirst' ? 'mx-auto max-w-2xl text-center' : ''}>
            <p className="el-about_text whitespace-pre-line leading-[1.85]" style={{ color: soft, fontSize: fsp('fs-about', 16) }}>{t.text.about ?? r.bio ?? ''}</p>
            <div className="mt-8">{cta(true)}</div>
          </div>
        )
        const photo = aboutPhoto ? (
          <div className="w-full overflow-hidden" style={{ aspectRatio: L === 'stacked' || L === 'textfirst' ? '16/9' : '4/5' }}><img src={aboutPhoto} alt={name} className="h-full w-full object-cover" style={aboutCrop(L === 'stacked' || L === 'textfirst' ? 'stacked' : 'side')} /></div>
        ) : null
        return sec('about', t.titles.about,
          L === 'stacked' ? (
            <div className="mx-auto max-w-4xl">
              {photo && <div className="mb-10">{photo}</div>}
              {body}
            </div>
          ) : L === 'textfirst' ? (
            <div className="mx-auto max-w-4xl">
              {body}
              {photo && <div className="mt-10">{photo}</div>}
            </div>
          ) : (
            <div className={`mx-auto grid max-w-5xl items-center gap-12 ${photo ? 'md:grid-cols-2' : ''}`}>
              {L === 'right' ? <>{body}{photo}</> : <>{photo}{body}</>}
            </div>
          ), tinted)
      }
      case 'galsec': {
        const gs0 = String((r as any).site_settings?.galSection ?? '')
        const gs2 = GALSEC.includes(gs0) ? gs0 : 'sahara'
        const items2 = galleries.slice(0, 6).map((g: any) => {
          const cover = g.photos.find((p: any) => p.id === g.cover_photo_id) ?? g.photos[0]
          return { id: String(g.id), title: String(g.title ?? ''), line: String(g.line ?? ''), u: (photoUrl(cover?.storage_path) as string | null) ?? null, href: `${base}/g/${g.id}${qs}` }
        })
        return sec('portfolio', GALOWN.includes(gs2) ? null : t.titles.portfolio, <GalleriesSection design={gs2} title={String(t.titles.portfolio ?? '')} items={items2} viewHref={hrefs.galleries} viewText="View all galleries" headStyle={headStyle} ink={ink} soft={soft} accent={accent} line={line} />, false)
      }
      case 'portfolio': {
        const rawGal = (r as any).site_settings?.galindex?.layout
        const L: string = page === 'galleries' ? (['checker', 'rows', 'custom', 'jade', 'jasper', 'amber', 'pearl', 'ruby', 'topaz', 'garnet', 'agate', 'quartz', 'moonstone'].includes(rawGal) ? rawGal : t.galindex.layout) : t.portfolio.layout
        const list = page === 'home' ? galleries.slice(0, 6) : galleries
        const gsd = String((r as any).site_settings?.galSection ?? '')
        if (page === 'home' && GALSEC.includes(gsd) && list.length > 0) {
          const items = list.map((g: any) => {
            const cover = g.photos.find((p: any) => p.id === g.cover_photo_id) ?? g.photos[0]
            return { id: String(g.id), title: String(g.title ?? ''), line: String(g.line ?? ''), u: (photoUrl(cover?.storage_path) as string | null) ?? null, href: `${base}/g/${g.id}${qs}` }
          })
          return sec('portfolio', GALOWN.includes(gsd) ? null : t.titles.portfolio, <GalleriesSection design={gsd} title={String(t.titles.portfolio ?? '')} items={items} viewHref={hrefs.galleries} viewText="View all galleries" headStyle={headStyle} ink={ink} soft={soft} accent={accent} line={line} />, false)
        }
        const rad = t.portfolio.radius === 'round' ? 28 : t.portfolio.radius === 'soft' ? 14 : 0
        const gapX = t.portfolio.spacing === 'tight' ? '6px' : t.portfolio.spacing === 'airy' ? 'calc(var(--gap) + 36px)' : 'calc(var(--gap) + 8px)'
        const shapeFor = (native: string, kind: 'grid' | 'banners' | 'feature' | 'rows'): string => {
          const sh = (t.portfolio as any)?.shape as string
          if (!sh || sh === 'auto') return native
          const M: Record<string, Record<string, string>> = {
            grid: { portrait: '4/5', landscape: '3/2', square: '1/1', tall: '2/3' },
            banners: { portrait: '3/2', landscape: '21/9', square: '16/9', tall: '4/3' },
            feature: { portrait: '4/5', landscape: '16/10', square: '1/1', tall: '2/3' },
            rows: { portrait: '4/5', landscape: '3/2', square: '1/1', tall: '2/3' },
          }
          return M[kind][sh] ?? native
        }
        const rowGap = t.portfolio.spacing === 'tight' ? '16px' : t.portfolio.spacing === 'airy' ? 'calc(var(--gap) + 56px)' : 'calc(var(--gap) + 24px)'
        const card = (g: any, style: React.CSSProperties, cls = '', big = false) => {
          const cover = g.photos.find((p: any) => p.id === g.cover_photo_id) ?? g.photos[0]
          const u = photoUrl(cover?.storage_path)
          const href = `${base}/g/${g.id}${qs}`
          const nm = t.portfolio.name
          const img = u ? <img src={u} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" /> : null
          if (nm === 'below') {
            const { aspectRatio, minHeight, ...rest } = style as any
            return (
              <a key={g.id} id={'fw-' + g.id} href={href} className={`group block ${cls}`} style={rest}>
                <div className="relative overflow-hidden" style={{ aspectRatio, minHeight, background: '#E5E1DB', borderRadius: rad }}>{img}</div>
                <div className="pt-4 text-center">
                  <p className="el-gal_name" style={{ ...headStyle, fontSize: fsr('fs-cover', big ? 2.25 : 1.5), lineHeight: 1.15 }}>{g.title}</p>
                  {g.line && <p className="el-gal_count mt-1 text-[11px] uppercase tracking-[0.22em]" style={{ color: soft }}>{g.line}</p>}
                </div>
              </a>
            )
          }
          const hov = nm === 'hover' ? ' opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100' : ''
          return (
            <a key={g.id} id={'fw-' + g.id} href={href} className={`group relative block overflow-hidden ${cls}`} style={{ background: '#E5E1DB', borderRadius: rad, ...style }}>
              {img}
              <div className={'absolute inset-0 transition duration-500' + hov} style={{ background: 'linear-gradient(transparent 55%, rgba(0,0,0,0.62))' }} />
              <div className={'absolute inset-x-0 bottom-0 p-6 text-white transition duration-500' + hov}>
                <p className="el-gal_name" style={{ ...headStyle, fontSize: fsr('fs-cover', big ? 2.25 : 1.875), lineHeight: 1.15 }}>{g.title}</p>
                {g.line && <p className="el-gal_count mt-1 text-[11px] uppercase tracking-[0.22em] opacity-90">{g.line}</p>}
              </div>
            </a>
          )
        }
        const GL = ['jade', 'jasper', 'amber', 'pearl', 'ruby', 'topaz', 'garnet', 'agate', 'quartz', 'moonstone']
        const gc = (g: any) => {
          const cover = g.photos.find((p: any) => p.id === g.cover_photo_id) ?? g.photos[0]
          return { u: photoUrl(cover?.storage_path) as string | null, href: `${base}/g/${g.id}${qs}` }
        }
        const gim = (u: string | null) => (u ? <img src={u} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" /> : null)
        const shade = <div className="absolute inset-0" style={{ background: 'linear-gradient(transparent 50%, rgba(0,0,0,0.6))' }} />
        return sec('portfolio', L === 'checker' || GL.includes(L) ? null : t.titles.portfolio,
          <>
            {GL.includes(L) ? (
              <div className="mx-auto" style={{ maxWidth: ['amber', 'garnet'].includes(L) ? 1280 : 1600 }}>
                {L !== 'jasper' && <h1 className="mb-10 text-center" style={{ ...headStyle, fontSize: 'clamp(2rem, 4vw, 3rem)' }}>{t.titles.portfolio}</h1>}
                {L === 'jade' && (
                  <div className="space-y-4">
                    {list[0] && (() => { const c = gc(list[0]); return (
                      <a href={c.href} className="group relative block overflow-hidden" style={{ aspectRatio: '21/9', background: '#E5E1DB' }}>{gim(c.u)}{shade}<p className="el-gal_name absolute bottom-5 left-6 text-white" style={{ ...headStyle, fontSize: '2rem' }}>{list[0].title}</p></a>
                    ) })()}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                      {list.slice(1).map((g) => { const c = gc(g); return (
                        <a key={g.id} href={c.href} className="group block"><div className="relative overflow-hidden" style={{ aspectRatio: '4/3', background: '#E5E1DB' }}>{gim(c.u)}</div><p className="el-gal_name mt-2 text-center" style={{ ...headStyle, fontSize: '1.25rem' }}>{g.title}</p></a>
                      ) })}
                    </div>
                  </div>
                )}
                {L === 'jasper' && (
                  <div className="px-5 py-12 sm:px-10" style={{ background: '#1a1613', width: '100vw', marginLeft: 'calc(50% - 50vw)' }}>
                    <h1 className="mb-10 text-center" style={{ ...headStyle, fontSize: 'clamp(2rem, 4vw, 3rem)', color: '#f3ead8' }}>{t.titles.portfolio}</h1>
                    <div className="mx-auto columns-1 gap-4 sm:columns-3 xl:columns-4 2xl:columns-5" style={{ maxWidth: 1800 }}>
                      {list.map((g, i) => { const c = gc(g); return (
                        <a key={g.id} href={c.href} className="group relative mb-4 block break-inside-avoid overflow-hidden" style={{ aspectRatio: ['4/5', '1/1', '3/4'][i % 3], background: '#2b241f' }}>{gim(c.u)}{shade}<p className="el-gal_name absolute bottom-4 left-4 text-white" style={{ ...headStyle, fontSize: '1.4rem' }}>{g.title}</p></a>
                      ) })}
                    </div>
                  </div>
                )}
                {L === 'amber' && (
                  <div className="space-y-12">
                    {list.map((g, i) => { const c = gc(g); return (
                      <div key={g.id} className="grid items-center gap-8 md:grid-cols-2">
                        <a href={c.href} className={'group relative block overflow-hidden ' + (i % 2 ? 'md:order-2' : '')} style={{ aspectRatio: '4/3', background: '#E5E1DB' }}>{gim(c.u)}</a>
                        <div className={i % 2 ? 'md:order-1 md:text-right' : ''}>
                          <p className="el-gal_name" style={{ ...headStyle, fontSize: '2rem' }}>{g.title}</p>
                          {g.line && <p className="el-gal_count mt-1 text-[11px] uppercase tracking-[0.22em]" style={{ color: soft }}>{g.line}</p>}
                          <a href={c.href} className="mt-4 inline-block border px-5 py-2 text-xs uppercase tracking-[0.2em]" style={{ borderColor: accent, color: accent }}>View</a>
                        </div>
                      </div>
                    ) })}
                  </div>
                )}
                {L === 'pearl' && (
                  <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
                    {list.map((g) => { const c = gc(g); return (
                      <a key={g.id} href={c.href} className="group block"><div className="relative aspect-square overflow-hidden" style={{ background: '#E5E1DB' }}>{gim(c.u)}</div><p className="el-gal_name mt-3 text-center text-xs uppercase tracking-[0.25em]" style={{ fontFamily: t.body }}>{g.title}</p></a>
                    ) })}
                  </div>
                )}
                {L === 'ruby' && (
                  <div className="space-y-1" style={{ width: '100vw', marginLeft: 'calc(50% - 50vw)' }}>
                    {list.map((g) => { const c = gc(g); return (
                      <a key={g.id} href={c.href} className="group relative flex items-center justify-center overflow-hidden" style={{ height: 'clamp(240px, 32vw, 520px)', background: '#E5E1DB' }}>{gim(c.u)}<div className="absolute inset-0 bg-black/30" /><p className="el-gal_name relative text-center text-white" style={{ ...headStyle, fontSize: 'clamp(2.2rem, 7vw, 5rem)', lineHeight: 1 }}>{g.title}</p></a>
                    ) })}
                  </div>
                )}
                {L === 'topaz' && (
                  <div className="flex flex-wrap justify-center gap-8">
                    {list.map((g, i) => { const c = gc(g); return (
                      <a key={g.id} href={c.href} className="group block w-[44%] bg-white p-3 pb-10 shadow-lg transition hover:rotate-0 sm:w-[30%] xl:w-[22%]" style={{ transform: `rotate(${[-3, 2, -1.5, 3][i % 4]}deg)` }}><div className="relative aspect-square overflow-hidden" style={{ background: '#E5E1DB' }}>{gim(c.u)}</div><p className="el-gal_name mt-3 text-center italic text-black" style={{ ...headStyle, fontSize: '1.25rem' }}>{g.title}</p></a>
                    ) })}
                  </div>
                )}
                {L === 'garnet' && (
                  <div className="grid items-start gap-10 md:grid-cols-2">
                    <div className="space-y-3">
                      {list.map((g, i) => (
                        <a key={g.id} href={gc(g).href} className="el-gal_name block" style={{ ...headStyle, fontSize: i === 0 ? '2.6rem' : '1.5rem', opacity: i === 0 ? 1 : 0.6 }}>{g.title}</a>
                      ))}
                    </div>
                    {list[0] && (() => { const c = gc(list[0]); return (
                      <a href={c.href} className="group relative block overflow-hidden" style={{ aspectRatio: '3/4', background: '#E5E1DB' }}>{gim(c.u)}</a>
                    ) })()}
                  </div>
                )}
                {L === 'agate' && (
                  <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
                    {list.map((g) => { const c = gc(g); return (
                      <a key={g.id} href={c.href} className="group block text-center"><div className="relative overflow-hidden" style={{ aspectRatio: '3/4', borderRadius: '9999px 9999px 0 0', background: '#E5E1DB' }}>{gim(c.u)}</div><p className="el-gal_name mt-3" style={{ ...headStyle, fontSize: '1.2rem', color: accent }}>{g.title}</p>{g.line && <p className="el-gal_count text-[10px] uppercase tracking-[0.2em]" style={{ color: soft }}>{g.line}</p>}</a>
                    ) })}
                  </div>
                )}
                {L === 'quartz' && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6">
                    {list.map((g) => { const c = gc(g); return (
                      <a key={g.id} href={c.href} className="group relative block aspect-square overflow-hidden" style={{ background: '#E5E1DB' }}>{gim(c.u)}<p className="el-gal_name absolute inset-x-0 bottom-0 bg-black/55 px-2 py-1.5 text-center text-[11px] uppercase tracking-[0.15em] text-white">{g.title}</p></a>
                    ) })}
                  </div>
                )}
                {L === 'moonstone' && (
                  <div className="grid gap-x-10 sm:grid-cols-3">
                    {[0, 1, 2].map((col) => (
                      <div key={col} className={'space-y-10 ' + (col === 1 ? 'sm:mt-20' : col === 2 ? 'sm:mt-10' : '')}>
                        {list.filter((_, i) => i % 3 === col).map((g, j) => { const c = gc(g); return (
                          <a key={g.id} href={c.href} className="group block"><div className="relative overflow-hidden" style={{ aspectRatio: j % 2 ? '1/1' : '4/5', background: '#E5E1DB' }}>{gim(c.u)}</div><p className="el-gal_name mt-3 italic" style={{ ...headStyle, fontSize: '1.2rem' }}>{g.title}</p></a>
                        ) })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : L === 'checker' ? (
              <div>
                <div className="mb-10 text-center">
                  <h1 className="text-[13px] uppercase tracking-[0.35em]" style={{ fontFamily: t.body }}>{t.titles.portfolio}</h1>
                  <div className="mx-auto mt-4 h-[2px] w-12" style={{ background: line }} />
                </div>
                <div className="mx-auto grid grid-cols-2" style={{ maxWidth: 'var(--cover-w)' }}>
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
                      <a key={g.id + 't'} href={href} className="flex aspect-square items-center justify-center p-4 text-center" style={{ background: (r as any).site_settings?.galindex?.tileBg ?? 'transparent' }}>
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
                    <div key={g.id} className="grid items-center md:grid-cols-2" style={{ marginTop: i > 0 ? rowGap : 0 }}>
                      <a href={href} id={'fw-' + g.id} className={`group relative block overflow-hidden ${odd ? 'md:order-2' : ''}`} style={{ aspectRatio: shapeFor('4/3', 'rows'), background: '#E5E1DB', borderRadius: rad }}>
                        {u && <img src={u} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />}
                      </a>
                      <div className={`flex flex-col items-center justify-center px-6 py-10 text-center ${odd ? 'md:order-1' : ''}`}>
                        <span className="text-sm tracking-[0.2em]" style={{ color: accent }}>{String(i + 1).padStart(2, '0')}</span>
                        <a href={href} className="el-gal_name mt-3" style={{ ...headStyle, fontSize: 'calc(clamp(2.25rem, 4vw, 3rem) * var(--fs-cover, 1))', lineHeight: 1.15 }}>{g.title}</a>
                        {g.line && <p className="el-gal_count mt-3 text-[11px] uppercase tracking-[0.22em]" style={{ color: soft }}>{g.line}</p>}
                        
                        <a href={href} className="mt-6 text-[11px] uppercase tracking-[0.22em]" style={{ color: accent }}>View gallery →</a>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : L === 'custom' ? (
              <AboutCanvas
                canvas={page === 'home' ? (r as any).site_settings?.portfolio?.canvas : (r as any).site_settings?.galindex?.canvas} photo2={null} aboutPhoto={aboutPhoto} toUrl={(pth) => photoUrl(pth)} editing={isPreview}
                title={null} bio="" headStyle={headStyle} ink={ink} soft={soft} tint={tint}
                bodyFont={t.body} headWeight={t.headWeight} defaultButton={t.hero.ctaText} boardId={page === 'home' ? 'featured' : 'galleries'}
                galleries={list.map((g) => ({ id: g.id, title: g.title, coverUrl: photoUrl((g.photos.find((x: any) => x.id === g.cover_photo_id) ?? g.photos[0])?.storage_path) }))}
                galleryHref={(id) => `${base}/g/${id}${qs}`}
                fallback={(dv) => galleryStarter(dv, list.map((g) => g.id))}
                renderButton={(label) => (
                  <a data-name="Button" href={availHref} className="cr-btn inline-block px-8 py-3 text-[11px] uppercase tracking-[0.22em]" style={btnStyle}>{label}</a>
                )}
              />
            ) : L === 'carousel' ? (
              <div className="-mx-6 flex snap-x snap-mandatory overflow-x-auto px-6 pb-4 [&>*:first-child]:ml-auto [&>*:last-child]:mr-auto" style={{ gap: gapX, scrollbarWidth: 'thin' }}>
                {list.map((g) => card(g, { aspectRatio: shapeFor('4/5', 'grid'), flex: '0 0 auto', width: 'calc(min(78vw, 340px) * var(--cover-n, 1))' }, 'snap-center'))}
              </div>
            ) : L === 'banners' ? (
              <div className="flex flex-col" style={{ maxWidth: 'var(--cover-w)', marginLeft: 'auto', marginRight: 'auto', gap: gapX }}>
                {list.map((g) => card(g, { aspectRatio: shapeFor('21/9', 'banners'), minHeight: 180 }))}
              </div>
            ) : L === 'feature' ? (
              <div className="grid md:grid-cols-3" style={{ maxWidth: 'var(--cover-w)', marginLeft: 'auto', marginRight: 'auto', gap: gapX }}>
                {list.map((g, i) => (i === 0 ? card(g, { minHeight: 300 }, 'md:col-span-2 md:row-span-2', true) : card(g, { aspectRatio: shapeFor('16/10', 'feature') })))}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3" style={{ maxWidth: 'var(--cover-w)', marginLeft: 'auto', marginRight: 'auto', gap: gapX }}>
                {list.map((g) => card(g, { aspectRatio: shapeFor(t.cardRatio, 'grid') }))}
              </div>
            )}
            {page === 'home' && galleries.length > 0 && (
              <div className="mt-10 text-center">
                <a href={hrefs.galleries} className="cr-btn pf-btn inline-block px-8 py-3 text-[11px] uppercase tracking-[0.22em]" style={btnStyle} id="featured-btn">{t.text.portfolioBtn}</a>
              </div>
            )}
          </>, tinted)
      }
      case 'pricesec':
      case 'investment': {
        const feats = (d: string | null) => (d ?? '').split('\n').map((x) => x.trim()).filter(Boolean)
        const L = t.pricing.layout
        const fid = t.pricing.featured
        const anyHot = sitePkgs.some((p) => p.id === fid)
        const panel = `color-mix(in srgb, ${bg} 40%, #fff)`
        const book = (_hot: boolean, _mt = 'mt-8'): React.ReactNode => null
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
        const pin = (p: any): React.ReactNode => t.pricing.pkgIntro[p.id] ? (
          <p className="el-pr_intro mt-2 max-w-xs whitespace-pre-line italic leading-relaxed" style={{ color: soft, fontSize: fsp('fs-plist', 15) }}>{t.pricing.pkgIntro[p.id]}</p>
        ) : null
        const layoutBlocks = (pkgs: any[]) => (<>
            {L === 'cards' && (
              <div className="grid items-stretch" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 24 }}>
                {pkgs.map((p) => {
                  const hot = p.id === fid
                  return (
                    <div key={p.id} id={'pk-' + p.id} className="flex flex-col items-center px-8 py-10 text-center"
                      style={{ background: panel, border: `1px solid ${hot ? accent : line}`, boxShadow: hot ? '0 10px 30px rgba(0,0,0,0.08)' : undefined }}>
                      {tag(hot)}
                      <h3 className="el-pr_name" style={{ ...headStyle, fontSize: fsr('fs-pname', 1.5), lineHeight: 1.25 }}>{p.title}</h3>
                      {pin(p)}
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
                    <div key={p.id} id={'pk-' + p.id} className="py-8" style={{ borderTop: i > 0 ? `1px solid ${line}` : undefined }}>
                      {hot && <p className="mb-2 text-[10px] uppercase tracking-[0.28em]" style={{ color: accent }}>Most popular</p>}
                      <div className="flex items-baseline gap-3">
                        <h3 className="el-pr_name" style={{ ...headStyle, color: hot ? accent : ink, fontSize: fsr('fs-pname', 1.5), lineHeight: 1.25 }}>{p.title}</h3>
                        <span className="flex-1" style={{ borderBottom: `1px dotted ${soft}`, opacity: 0.5, transform: 'translateY(-4px)' }} />
                        {p.price && <span className="el-pr_price" style={{ ...headStyle, color: accent, fontSize: fsr('fs-pprice', 1.5) }}>{p.price}</span>}
                      </div>
                      {pin(p)}
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
                    <div key={p.id} id={'pk-' + p.id} className="flex flex-col items-center px-8 py-12 text-center" style={{ background: hot ? tint : bg }}>
                      {tag(hot)}
                      <h3 className="el-pr_name" style={{ ...headStyle, fontSize: fsr('fs-pname', 1.5), lineHeight: 1.25 }}>{p.title}</h3>
                      {pin(p)}
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
        const prs: any = (r as any).site_settings?.pricing ?? {}
        const sectionMode = !['investment', 'pricing'].includes(String(page))
        const pd = String((sectionMode ? prs.sectionDesign : prs.pageDesign) ?? '')
        if ((sectionMode ? PR_SEC : PR_PAGE).includes(pd)) {
          return sec('investment', null,
            <PricingDesign design={pd} title={t.titles.investment} pkgs={sitePkgs as any} fid={fid ?? ''} intro={t.pricing.intro ?? ''} note={t.pricing.note ?? ''}
              pkgIntro={t.pricing.pkgIntro} headStyle={headStyle} ink={ink} soft={soft} accent={accent} line={line} bg={bg} tint={tint}
              pics={(pickPics(4) as any[]).filter(Boolean) as string[]} fsp={fsp as any} fsr={fsr as any} />, tinted)
        }
        return sec('investment', t.titles.investment,
          <div className="mx-auto max-w-5xl">

            {layoutBlocks(sitePkgs)}
          </div>, tinted)
      }
      case 'testimonials': {
        const L: string = t.testi.layout
        const list = quotesShown.slice(0, 6)
        const td = String((r as any).site_settings?.testiDesign ?? '')
        if (['linen', 'velvet', 'silk', 'satin', 'tweed', 'mohair', 'lace', 'wool', 'cotton', 'chiffon'].includes(td)) {
          const cardBg = `color-mix(in srgb, ${bg} 40%, #fff)`
          const pics = pickPics(3)
          const who = (w: string) => (w ? <p className="el-tes_name text-[11px] uppercase tracking-[0.22em]" style={{ color: soft }}>{w}</p> : null)
          const heading = <h2 style={{ ...headStyle, fontSize: 'clamp(2rem, 4vw, 3rem)', lineHeight: 1.05 }}>{t.titles.testimonials}</h2>
          const out = (node: React.ReactNode) => sec('words', null, node, tinted)
          const three = list.slice(0, 3)
          if (td === 'linen') return out(
            <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1fr_1.5fr]">
              <div>{heading}</div>
              <div>{three.map((q, i) => (
                <figure key={i} id={'tm-' + i} className="py-8" style={{ borderTop: i > 0 ? `1px solid ${line}` : undefined }}>
                  <blockquote className="el-tes_quote leading-[1.7]" style={{ fontFamily: t.head, fontWeight: 300, fontSize: fsp('fs-testi', 20) }}>{q.text}</blockquote>
                  <figcaption className="mt-4">{who(q.who)}</figcaption>
                </figure>
              ))}</div>
            </div>)
          if (td === 'velvet') return out(
            <div className="mx-auto max-w-6xl"><div className="mb-10 text-center">{heading}</div>
              <div className="grid gap-6 md:grid-cols-3">{three.map((q, i) => (
                <figure key={i} id={'tm-' + i} className="flex flex-col rounded-2xl p-8" style={{ background: cardBg }}>
                  {(q.img ?? pics[i]) && <img src={(q.img ?? pics[i]) as string} alt="" className="mb-5 h-16 w-16 rounded-full object-cover" />}
                  <blockquote className="el-tes_quote flex-1 leading-[1.8]" style={{ fontWeight: 300, fontSize: fsp('fs-testi', 15) }}>{q.text}</blockquote>
                  <figcaption className="mt-5">{who(q.who)}</figcaption>
                </figure>
              ))}</div></div>)
          if (td === 'silk') { const q = list[0]; const im = (q?.img ?? pics[0]) as string | null; return out(
            <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2">
              <div>
                <span style={{ ...headStyle, color: accent, fontSize: 90, lineHeight: 0.6, display: 'block' }}>&ldquo;</span>
                <blockquote className="el-tes_quote mt-4" style={{ ...headStyle, fontWeight: 300, fontSize: 'clamp(1.4rem, 2.8vw, 2.1rem)', lineHeight: 1.4 }}>{q?.text}</blockquote>
                <div className="mt-6">{who(q?.who ?? '')}</div>
              </div>
              {im && <div className="overflow-hidden" style={{ aspectRatio: '4/5' }}><img src={im} alt="" className="h-full w-full object-cover" /></div>}
            </div>) }
          if (td === 'satin') return out(
            <div className="mx-auto max-w-6xl"><div className="mb-10 text-center">{heading}</div>
              <TestiSlider mode="satin" list={quotesShown.slice(0, 8)} headStyle={headStyle} ink={ink} soft={soft} accent={accent} card={cardBg} /></div>)
          if (td === 'tweed') return out(
            <div className="mx-auto max-w-6xl"><div className="mb-10 text-center">{heading}</div>
              <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">{list.slice(0, 6).map((q, i) => (
                <figure key={i} id={'tm-' + i} className="mb-4 break-inside-avoid p-6" style={{ background: i % 2 ? tint : cardBg }}>
                  <blockquote className="el-tes_quote leading-[1.75]" style={{ fontWeight: 300, fontSize: fsp('fs-testi', 15) }}>{q.text}</blockquote>
                  <figcaption className="mt-4">{who(q.who)}</figcaption>
                </figure>
              ))}</div></div>)
          if (td === 'mohair') { const q = list[0]; return out(
            <div className="mx-auto max-w-6xl">
              <blockquote className="el-tes_quote" style={{ ...headStyle, fontWeight: 300, fontSize: 'clamp(2rem, 5vw, 4rem)', lineHeight: 1.15 }}>{q?.text}</blockquote>
              <div className="mt-8 flex items-center justify-end gap-4"><span className="h-px w-10" style={{ background: accent }} />{who(q?.who ?? '')}</div>
            </div>) }
          if (td === 'lace') return out(
            <div className="mx-auto max-w-6xl"><div className="mb-10 text-center">{heading}</div>
              <div className="grid gap-8 md:grid-cols-3">{three.map((q, i) => (
                <figure key={i} id={'tm-' + i}>
                  {(q.img ?? pics[i]) && <div className="mb-5 overflow-hidden" style={{ aspectRatio: '4/5' }}><img src={(q.img ?? pics[i]) as string} alt="" className="h-full w-full object-cover" /></div>}
                  <blockquote className="el-tes_quote italic leading-[1.7]" style={{ ...headStyle, fontWeight: 300, fontSize: fsp('fs-testi', 18) }}>{q.text}</blockquote>
                  <figcaption className="mt-3">{who(q.who)}</figcaption>
                </figure>
              ))}</div></div>)
          if (td === 'wool') return out(
            <div className="mx-auto max-w-6xl"><div className="mb-8">{heading}</div>
              <TestiSlider mode="wool" list={quotesShown.slice(0, 12)} headStyle={headStyle} ink={ink} soft={soft} accent={accent} card={cardBg} /></div>)
          if (td === 'cotton') return out(
            <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[140px_1fr]">
              <span style={{ ...headStyle, color: accent, opacity: 0.45, fontSize: 150, lineHeight: 0.8 }}>&ldquo;</span>
              <div className="grid gap-x-12 gap-y-10 sm:grid-cols-2">{list.slice(0, 4).map((q, i) => (
                <figure key={i} id={'tm-' + i}>
                  <blockquote className="el-tes_quote leading-[1.7]" style={{ ...headStyle, fontWeight: 300, fontSize: fsp('fs-testi', 18) }}>{q.text}</blockquote>
                  <figcaption className="mt-3">{who(q.who)}</figcaption>
                </figure>
              ))}</div>
            </div>)
          { const q = list[0]; const im = (q?.img ?? pics[0]) as string | null; return out(
            <div className="mx-auto grid max-w-5xl items-center gap-12 md:grid-cols-2">
              {im && <div className="mx-auto w-64 bg-white p-3 pb-10 shadow-lg" style={{ transform: 'rotate(-3deg)' }}><div className="overflow-hidden" style={{ aspectRatio: '1/1' }}><img src={im} alt="" className="h-full w-full object-cover" /></div></div>}
              <div>
                <blockquote className="el-tes_quote italic" style={{ ...headStyle, fontSize: 'clamp(1.4rem, 2.8vw, 2.1rem)', lineHeight: 1.45 }}>{q?.text}</blockquote>
                <p className="mt-5" style={{ ...headStyle, color: accent, fontSize: '1.3rem' }}>&mdash; {q?.who}</p>
              </div>
            </div>) }
        }
        return sec('words', t.titles.testimonials,
          L === 'stacked' ? (
            <div className="mx-auto max-w-2xl">
              {list.map((q, i) => (
                <figure key={i} id={'tm-' + i} className="py-12 text-center" style={{ borderTop: i > 0 ? `1px solid ${line}` : undefined }}>
                  <span style={{ ...headStyle, color: accent, fontSize: 44, lineHeight: 1, display: 'block' }}>&ldquo;</span>
                  <blockquote className="el-tes_quote mt-2 leading-[1.7]" style={{ fontFamily: t.head, fontWeight: 300, fontSize: fsr('fs-testi', 1.5) }}>{q.text}</blockquote>
                  <figcaption className="mt-8 flex flex-col items-center gap-3">
                    {q.img && <img src={q.img} alt="" loading="lazy" className="h-14 w-14 rounded-full object-cover" />}
                    {q.who && <span className="el-tes_name text-[11px] uppercase tracking-[0.22em]" style={{ color: soft }}>{q.who}</span>}
                  </figcaption>
                </figure>
              ))}
            </div>
          ) : L === 'cards' ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {list.map((q, i) => (
                <figure key={i} id={'tm-' + i} className="flex flex-col p-8 md:p-10" style={{ background: `color-mix(in srgb, ${bg} 40%, #fff)`, borderRadius: 28, boxShadow: '0 20px 50px rgba(0,0,0,0.07)' }}>
                  <span style={{ ...headStyle, color: accent, fontSize: 44, lineHeight: 1 }}>&ldquo;</span>
                  <blockquote className="el-tes_quote mt-2 flex-1 leading-[1.8]" style={{ fontWeight: 300, fontSize: fsp('fs-testi', 15) }}>{q.text}</blockquote>
                  <div className="mt-8 h-px w-8" style={{ background: accent }} />
                  <figcaption className="mt-5 flex items-center gap-3">
                    {q.img && <img src={q.img} alt="" loading="lazy" className="h-10 w-10 rounded-full object-cover" />}
                    {q.who && <span className="el-tes_name text-[11px] uppercase tracking-[0.22em]" style={{ color: soft }}>{q.who}</span>}
                  </figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <div className="grid gap-12 md:grid-cols-3">
              {list.map((q, i) => (
                <figure key={i} id={'tm-' + i} className="text-center">
                  {q.img && <img src={q.img} alt="" loading="lazy" className="mx-auto mb-8 w-full object-cover" style={{ aspectRatio: '4/5', borderRadius: 28 }} />}
                  <blockquote className="el-tes_quote leading-[1.75]" style={{ fontFamily: t.head, fontWeight: 300, fontSize: fsr('fs-testi', 1.25) }}>&ldquo;{q.text}&rdquo;</blockquote>
                  <div className="mx-auto mt-6 h-px w-8" style={{ background: accent }} />
                  {q.who && <figcaption className="el-tes_name mt-5 text-[11px] uppercase tracking-[0.22em]" style={{ color: soft }}>{q.who}</figcaption>}
                </figure>
              ))}
            </div>
          ), tinted)
      }
      case 'faq': {
        const fd = String((r as any).site_settings?.faqDesign ?? '')
        const qa = faq as any[]
        const qst: any = { fontFamily: t.head, fontSize: fsp('fs-faqq', 20), color: ink }
        const ast: any = { fontFamily: t.body, fontSize: fsp('fs-faqa', 15), color: soft, lineHeight: 1.7 }
        if (fd === 'basil') return sec('faq', t.titles.faq,
          <div className="mx-auto grid max-w-5xl gap-x-14 gap-y-10 md:grid-cols-2">
            {qa.map((f, i) => (<div key={i}><p className="el-faq_q" style={qst}>{f.question}</p><p className="el-faq_a mt-2" style={ast}>{f.answer}</p></div>))}
          </div>, tinted)
        if (fd === 'thyme') return sec('faq', t.titles.faq,
          <div className="mx-auto grid max-w-5xl items-start gap-10 md:grid-cols-2">
            {pickPics(1)[0] && <img src={pickPics(1)[0] as string} alt="" className="aspect-[4/5] w-full object-cover" />}
            <FaqAccordion items={faq} questionClassName="el-faq_q" answerClassName="el-faq_a" questionStyle={qst} answerStyle={ast} />
          </div>, tinted)
        if (fd === 'mint') return sec('faq', t.titles.faq,
          <div className="mx-auto max-w-3xl space-y-8">
            {qa.map((f, i) => (
              <div key={i} className="grid grid-cols-[3.5rem_1fr] gap-4">
                <span style={{ ...headStyle, color: accent, fontSize: '1.8rem', lineHeight: 1 }}>{String(i + 1).padStart(2, '0')}</span>
                <div><p className="el-faq_q" style={qst}>{f.question}</p><p className="el-faq_a mt-2" style={ast}>{f.answer}</p></div>
              </div>
            ))}
          </div>, tinted)
        if (fd === 'dill') return sec('faq', t.titles.faq,
          <div className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {qa.map((f, i) => (<div key={i} className="rounded-2xl p-6" style={{ background: tint }}><p className="el-faq_q" style={{ ...qst, fontWeight: 600 }}>{f.question}</p><p className="el-faq_a mt-2" style={ast}>{f.answer}</p></div>))}
          </div>, tinted)
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
      }
      case 'contact': {
        const cd = String((r as any).site_settings?.contactDesign ?? '')
        const msg = t.text.contact ?? 'Tell me about your day. Check a date and send me a message.'
        const btn = <a href={resolveLink((r as any).site_settings?.contactBtn?.link, availHref)} className="cr-btn ct-btn inline-block px-8 py-3 text-[11px] uppercase tracking-[0.22em]" style={btnStyle} id="closing-btn">{t.text.contactBtn}</a>
        const soc = socials.length > 0 ? (
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3">
            {socials.map((s) => (
              <a key={s.label} id={'soc-' + s.key} href={String(s.url).startsWith('http') ? s.url : `https://${s.url}`} target="_blank" rel="noopener noreferrer"
                className="el-con_social uppercase tracking-[0.22em]" style={{ color: accent, fontSize: fsp('fs-social', 11) }}>{s.label}</a>
            ))}
          </div>
        ) : null
        const big: any = { fontFamily: t.head, color: ink, fontSize: 'clamp(1.8rem, 3.6vw, 2.8rem)', lineHeight: 1.15 }
        const msgStyle: any = { color: soft, fontSize: fsp('fs-contact', 15) }
        if (cd === 'split') return sec('contact', null,
          <div className="mx-auto max-w-5xl">
            <div className="grid items-center gap-8 md:grid-cols-[1fr_auto]">
              <div><h3 style={big}>{t.titles.contact}</h3><p className="el-con_msg mt-3 max-w-xl whitespace-pre-line leading-relaxed" style={msgStyle}>{msg}</p></div>
              <div>{btn}</div>
            </div>
            {soc && <div className="mt-10">{soc}</div>}
          </div>, tinted)
        if (cd === 'bar') return sec('contact', null,
          <div className="mx-auto max-w-4xl text-center">
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-5">
              <p className="el-con_msg whitespace-pre-line leading-relaxed" style={{ ...msgStyle, fontFamily: t.head, fontSize: 'clamp(1.2rem, 2.2vw, 1.6rem)', color: ink }}>{msg}</p>
              {btn}
            </div>
            {soc && <div className="mt-8">{soc}</div>}
          </div>, tinted)
        if (cd === 'framed') return sec('contact', null,
          <div className="mx-auto max-w-2xl px-8 py-14 text-center" style={{ border: '1px solid ' + soft }}>
            <h3 style={big}>{t.titles.contact}</h3>
            <p className="el-con_msg mx-auto mb-8 mt-4 max-w-md whitespace-pre-line leading-relaxed" style={msgStyle}>{msg}</p>
            {btn}
            {soc && <div className="mt-8">{soc}</div>}
          </div>, tinted)
        if (cd === 'photo') {
          const pic = pickPics(1)[0]
          return sec('contact', null,
            <div className="relative mx-auto max-w-5xl overflow-hidden text-center">
              {pic && <img src={pic as string} alt="" className="absolute inset-0 h-full w-full object-cover" />}
              <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.45)' }} />
              <div className="relative px-6 py-20">
                <h3 style={{ ...big, color: '#fff' }}>{t.titles.contact}</h3>
                <p className="el-con_msg mx-auto mb-8 mt-4 max-w-md whitespace-pre-line leading-relaxed" style={{ ...msgStyle, color: 'rgba(255,255,255,0.9)' }}>{msg}</p>
                {btn}
                {soc && <div className="mt-8">{soc}</div>}
              </div>
            </div>, tinted)
        }
        if (cd === 'duo') {
          const pp = pickPics(2)
          return sec('contact', null,
            <div className="mx-auto max-w-5xl">
              <div className="grid items-center gap-6 md:grid-cols-[1fr_1.2fr_1fr]">
                {pp[0] ? <img src={pp[0] as string} alt="" className="aspect-[3/4] w-full object-cover" /> : <div />}
                <div className="text-center">
                  <h3 style={big}>{t.titles.contact}</h3>
                  <p className="el-con_msg mb-8 mt-4 whitespace-pre-line leading-relaxed" style={msgStyle}>{msg}</p>
                  {btn}
                </div>
                {pp[1] ? <img src={pp[1] as string} alt="" className="aspect-[3/4] w-full object-cover" /> : <div />}
              </div>
              {soc && <div className="mt-10">{soc}</div>}
            </div>, tinted)
        }
        return sec('contact', t.titles.contact,
          <div className="mx-auto max-w-xl text-center">
            <p className="el-con_msg mb-8 whitespace-pre-line leading-relaxed" style={msgStyle}>{msg}</p>
            <div className="mb-10">{btn}</div>
            {soc}
          </div>, tinted)
      }
      case 'aboutcta':
        return sec('aboutcta', null,
          <div className="text-center"><a href={resolveLink((r as any).site_settings?.aboutBtn?.link, availHref)} id="about-btn" className="cr-btn ab-btn inline-block px-8 py-3 text-[11px] uppercase tracking-[0.22em]" style={btnStyle}>{t.aboutBtnText}</a></div>, tinted)
      default: {
        const cs = t.customs.find((x) => x.id === k)
        if (!cs) return null
        return sec(k, null,
          <AboutCanvas
            canvas={cs.canvas} photo2={null} aboutPhoto={aboutPhoto} toUrl={(pth) => photoUrl(pth)} editing={isPreview}
            title={null} bio="" headStyle={headStyle} ink={ink} soft={soft} tint={tint}
            bodyFont={t.body} headWeight={t.headWeight} defaultButton={t.hero.ctaText} boardId={cs.id}
            renderButton={(label) => (
              <a data-name="Button" href={availHref} className="cr-btn inline-block px-8 py-3 text-[11px] uppercase tracking-[0.22em]" style={btnStyle}>{label}</a>
            )}
          />, false)
      }
    }
  }

  React.useEffect(() => {
    if (!isPreview) return
    const list = galleries.map((g: any) => {
      const c = g.photos.find((p: any) => p.id === g.cover_photo_id) ?? g.photos[0]
      return { id: g.id, title: g.title, cover: photoUrl(c?.storage_path) }
    })
    window.parent?.postMessage({ type: 'camrhia-featured', list }, '*')
  }, [isPreview, galleries])

  const doorPic = (k: string, i: number): string | null => {
    const own = k === 'galleries' ? (galleries[0] ? galleryCover(galleries[0] as any) : null) : k === 'about' ? ((aboutPhoto as any) || null) : null
    return (own as string | null) || pickPics(3)[i] || null
  }

  const exploreEl = doors.length > 0 && ex.show !== false ? (
          <section data-name="Explore section" id="explore" className="px-6 py-16">
          <div className="mx-auto max-w-6xl">
            {ex.heading?.trim() && (
              <p className="el-ex_label mb-8 text-center text-[11px] uppercase tracking-[0.3em]" style={{ color: soft }}>{ex.heading}</p>
            )}

            {exLayout === 'free' && (
              <AboutCanvas
                canvas={(ex as any).canvas} photo2={null} aboutPhoto={aboutPhoto} toUrl={(pth) => photoUrl(pth)} editing={isPreview}
                title={null} bio="" headStyle={headStyle} ink={ink} soft={soft} tint={tint}
                bodyFont={t.body} headWeight={t.headWeight} defaultButton={t.hero.ctaText} boardId="explore"
                fallback={(dv) => exploreStarter(dv)}
                renderButton={(label) => (
                  <a data-name="Button" href={availHref} className="cr-btn inline-block px-8 py-3 text-[11px] uppercase tracking-[0.22em]" style={btnStyle}>{label}</a>
                )}
                renderSpecial={(type, it) => {
                  if (type !== 'door') return null
                  const d = doors.find((x) => x.k === it.door)
                  if (!d) return null
                  return (
                    <a href={d.href} className="block">
                      <p className="ex-t el-ex_title" style={{ ...headStyle, fontSize: 'clamp(1.25rem, 3.2vw, 2.6rem)', lineHeight: 1.15 }}>{d.t}</p>
                      <p className="ex-s el-ex_sub mt-1 text-[10px] uppercase tracking-[0.22em]" style={{ color: accent }}>{d.s} &rarr;</p>
                    </a>
                  )
                }}
              />
            )}

            {exLayout === 'birch' && (
              <div className="grid gap-3 md:grid-cols-2 md:grid-rows-2 md:h-[560px]">
                {doors.map((b, i) => (
                  <a key={b.href} href={b.href} className={'relative block min-h-[240px] overflow-hidden ' + (i === 0 || doors.length === 2 ? 'md:row-span-2' : '')} style={{ background: tint, borderRadius: t.radius }}>
                    {doorPic(b.k, i) && <img src={doorPic(b.k, i) as string} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0) 55%)' }} />
                    <span className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm" style={{ color: '#2A1F24' }}>→</span>
                    <p className="ex-t el-ex_title absolute bottom-5 left-6 text-3xl text-white sm:text-4xl" style={headStyle}>{b.t}</p>
                  </a>
                ))}
              </div>
            )}

            {exLayout === 'willow' && (
              <div style={{ borderTop: `1px solid ${line}` }}>
                {doors.map((b, i) => {
                  const last = i === doors.length - 1
                  return (
                    <a key={b.href} href={b.href} className="flex items-center gap-5 px-2 py-6 transition hover:opacity-80 sm:px-6" style={{ borderBottom: `1px solid ${line}`, background: last ? accent : undefined, color: last ? '#fff' : undefined }}>
                      <span className="w-8 text-sm tracking-[0.2em]" style={{ color: last ? '#fff' : accent }}>{String(i + 1).padStart(2, '0')}</span>
                      <span className="ex-t el-ex_title flex-1 text-5xl sm:text-7xl" style={{ ...headStyle, fontWeight: 300, lineHeight: 1.05 }}>{b.t}</span>
                      {doorPic(b.k, i) && <img src={doorPic(b.k, i) as string} alt="" className="hidden h-[84px] w-[140px] object-cover sm:block" style={{ borderRadius: t.radius }} />}
                      <span className="text-xl">→</span>
                    </a>
                  )
                })}
              </div>
            )}

            {exLayout === 'aspen' && (
              <div className="grid items-end gap-6 sm:grid-cols-3">
                {doors.map((b, i) => (
                  <a key={b.href} href={b.href} className={'block text-center ' + (i % 2 === 0 && doors.length === 3 ? 'sm:mt-10' : '')}>
                    <div className="aspect-[3/4] overflow-hidden" style={{ borderRadius: '9999px 9999px 0 0', background: tint }}>
                      {doorPic(b.k, i) && <img src={doorPic(b.k, i) as string} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <div className="mt-4 flex items-center justify-center gap-3">
                      <p className="ex-t el-ex_title text-2xl sm:text-3xl" style={headStyle}>{b.t}</p>
                      <span className="flex h-7 w-7 items-center justify-center rounded-full text-xs text-white" style={{ background: accent }}>→</span>
                    </div>
                  </a>
                ))}
              </div>
            )}

            {exLayout === 'alder' && (
              <div className="grid h-[520px] sm:grid-cols-[1fr_1.25fr_1fr]">
                {doors.map((b, i) => (
                  <a key={b.href} href={b.href} className="relative block min-h-[240px] overflow-hidden" style={{ background: tint }}>
                    {doorPic(b.k, i) && <img src={doorPic(b.k, i) as string} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0) 55%)' }} />
                    <div className="absolute inset-x-0 bottom-6 text-center text-white">
                      <div className="mx-auto mb-3 h-px w-10 bg-white" />
                      <p className="ex-t el-ex_title text-3xl sm:text-4xl" style={headStyle}>{b.t}</p>
                    </div>
                  </a>
                ))}
              </div>
            )}

            {exLayout === 'maple' && (
              <div className="grid gap-3">
                {doors.length > 0 && (
                  <a href={doors[0].href} className="relative block h-[300px] overflow-hidden sm:h-[340px]" style={{ background: tint, borderRadius: t.radius }}>
                    {doorPic(doors[0].k, 0) && <img src={doorPic(doors[0].k, 0) as string} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0) 55%)' }} />
                    <p className="ex-t el-ex_title absolute bottom-5 left-6 text-4xl text-white sm:text-6xl" style={headStyle}>{doors[0].t}</p>
                    <span className="absolute bottom-6 right-6 flex h-10 w-10 items-center justify-center rounded-full bg-white" style={{ color: '#2A1F24' }}>→</span>
                  </a>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  {doors.slice(1).map((b, j) => {
                    const solid = j === doors.length - 2
                    return (
                      <a key={b.href} href={b.href} className="relative block h-[220px] overflow-hidden" style={{ background: solid ? accent : tint, borderRadius: t.radius }}>
                        {!solid && doorPic(b.k, j + 1) && <img src={doorPic(b.k, j + 1) as string} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                        {!solid && <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0) 55%)' }} />}
                        <p className="ex-t el-ex_title absolute bottom-5 left-6 text-3xl text-white sm:text-4xl" style={headStyle}>{b.t}</p>
                        <span className="absolute bottom-6 right-6 text-xl text-white">→</span>
                      </a>
                    )
                  })}
                </div>
              </div>
            )}

            {exLayout === 'elm' && (
              <div className="flex flex-col items-center gap-6 py-4 sm:flex-row sm:justify-center sm:gap-0">
                {doors.map((b, i) => (
                  <a key={b.href} href={b.href} className="block w-full max-w-[300px] bg-white p-3 pb-9 text-center shadow-lg sm:-mx-3 sm:w-[32%]" style={{ transform: 'rotate(' + [-3, 0, 3][i % 3] + 'deg)', zIndex: i % 3 === 1 ? 10 : 1, color: '#2A1F24' }}>
                    <div className="aspect-[4/5] overflow-hidden" style={{ background: tint }}>
                      {doorPic(b.k, i) && <img src={doorPic(b.k, i) as string} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <p className="ex-t el-ex_title mt-4 text-2xl" style={headStyle}>{b.t}</p>
                  </a>
                ))}
              </div>
            )}

            {exLayout === 'hawthorn' && (
              <div className="grid gap-10 sm:grid-cols-3">
                {doors.map((b, i) => (
                  <a key={b.href} href={b.href} className="block text-center">
                    <div className="relative mx-auto aspect-square w-full max-w-[280px]">
                      <div className="absolute inset-0 rounded-full" style={{ border: `1px solid ${accent}`, transform: 'translate(10px, -8px) scale(1.04)' }} />
                      <div className="absolute inset-0 overflow-hidden rounded-full" style={{ background: tint }}>
                        {doorPic(b.k, i) && <img src={doorPic(b.k, i) as string} alt="" className="h-full w-full object-cover" />}
                      </div>
                    </div>
                    <p className="ex-t el-ex_title mt-6 text-2xl sm:text-3xl" style={headStyle}>{b.t}</p>
                    <div className="mx-auto mt-2 h-px w-10" style={{ background: accent }} />
                  </a>
                ))}
              </div>
            )}

            {exLayout === 'linden' && (
              <div className="grid gap-5 sm:grid-cols-3">
                {doors.map((b, i) => (
                  <a key={b.href} href={b.href} className="block overflow-hidden bg-white transition hover:-translate-y-1" style={{ borderRadius: 14, color: '#2A1F24' }}>
                    <div className="aspect-[4/3.3] overflow-hidden" style={{ background: tint }}>
                      {doorPic(b.k, i) && <img src={doorPic(b.k, i) as string} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <div className="flex items-center justify-between px-5 py-4">
                      <p className="ex-t el-ex_title text-2xl" style={headStyle}>{b.t}</p>
                      <span className="flex h-8 w-8 items-center justify-center rounded-full text-sm text-white" style={{ background: accent }}>→</span>
                    </div>
                  </a>
                ))}
              </div>
            )}

            {exLayout === 'rowan' && (
              <div className="p-3 sm:p-5" style={{ background: '#1F1B18', borderRadius: t.radius }}>
                <div className="grid gap-3 sm:grid-cols-3">
                  {doors.map((b, i) => (
                    <a key={b.href} href={b.href} className="relative block aspect-[3/4] overflow-hidden" style={{ background: '#2A2622' }}>
                      {doorPic(b.k, i) && <img src={doorPic(b.k, i) as string} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ filter: 'saturate(0.8)' }} />}
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), rgba(0,0,0,0) 55%)' }} />
                      <div className="absolute bottom-5 left-5">
                        <p className="text-xs tracking-[0.2em]" style={{ color: '#C9A24D' }}>{String(i + 1).padStart(2, '0')}</p>
                        <div className="my-2 h-px w-8" style={{ background: '#C9A24D' }} />
                        <p className="ex-t el-ex_title text-3xl sm:text-4xl" style={{ ...headStyle, color: '#F3ECE2' }}>{b.t}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {exLayout === 'beech' && (() => {
              const bk = doors.find((d) => d.k === 'book') ?? doors[doors.length - 1]
              const rest = doors.filter((d) => d !== bk)
              return (
                <div className="grid gap-4 md:h-[520px] md:grid-cols-[3fr_2fr]">
                  <a href={bk.href} className="relative block min-h-[320px] overflow-hidden" style={{ background: tint, borderRadius: t.radius }}>
                    {doorPic(bk.k, doors.indexOf(bk)) && <img src={doorPic(bk.k, doors.indexOf(bk)) as string} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0) 60%)' }} />
                    <div className="absolute bottom-6 left-6">
                      <p className="ex-t el-ex_title text-5xl text-white sm:text-7xl" style={headStyle}>{bk.t}</p>
                      <span className="cr-btn mt-4 inline-block px-7 py-3 text-[11px] uppercase tracking-[0.22em]" style={{ ...btnStyle, background: accent, color: '#fff' }}>{bk.s}</span>
                    </div>
                  </a>
                  <div className="flex flex-col gap-4">
                    {rest.map((b) => (
                      <a key={b.href} href={b.href} className="flex min-h-[120px] flex-1 items-center justify-between bg-white px-7 transition hover:-translate-y-0.5" style={{ border: `1px solid ${line}`, borderRadius: t.radius, color: '#2A1F24' }}>
                        <p className="ex-t el-ex_title text-3xl" style={headStyle}>{b.t}</p>
                        <span className="text-xl" style={{ color: accent }}>→</span>
                      </a>
                    ))}
                  </div>
                </div>
              )
            })()}

            {exLayout === 'sorrel' && (
              <div className="mx-auto max-w-5xl rounded-md px-3 py-3" style={{ background: '#1a1613' }}>
                <div className="mb-3 h-2 rounded-sm" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #f3ead8 0 14px, transparent 14px 28px)', opacity: 0.85 }} />
                <div className="grid gap-3 sm:grid-cols-3">
                  {doors.map((b, i) => (
                    <a key={b.href} href={b.href} className="block">
                      <div className="relative aspect-[4/3] overflow-hidden" style={{ background: '#2b241f' }}>
                        {doorPic(b.k, i) && <img src={doorPic(b.k, i) as string} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                      </div>
                      <div className="mt-3 flex items-center justify-between px-1 pb-1">
                        <p className="ex-t el-ex_title text-xl sm:text-2xl" style={{ ...headStyle, color: '#f3ead8' }}>{b.t}</p>
                        <span className="text-lg" style={{ color: '#C9A24B' }}>→</span>
                      </div>
                    </a>
                  ))}
                </div>
                <div className="mt-3 h-2 rounded-sm" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #f3ead8 0 14px, transparent 14px 28px)', opacity: 0.85 }} />
              </div>
            )}

            {exLayout === 'tansy' && (
              <div className="flex h-[460px] flex-col gap-2 sm:flex-row">
                {doors.map((b, i) => {
                  const mid = i === (doors.length > 2 ? 1 : 0)
                  return (
                    <a key={b.href} href={b.href} className="relative block overflow-hidden transition-all duration-500 hover:flex-[3]" style={{ flex: mid ? 3 : 1, borderRadius: t.radius, background: tint }}>
                      {doorPic(b.k, i) && <img src={doorPic(b.k, i) as string} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.5), rgba(0,0,0,0) 55%)' }} />
                      <p className={'ex-t el-ex_title absolute text-xl text-white sm:text-2xl ' + (mid ? 'bottom-5 left-5' : 'bottom-5 left-5 sm:bottom-6 sm:left-1/2 sm:-translate-x-1/2 sm:[writing-mode:vertical-rl] sm:rotate-180')} style={headStyle}>{b.t}</p>
                    </a>
                  )
                })}
              </div>
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
      <CustomJs code={String((r as any).site_settings?.custom_js ?? '')} />
      <link rel="stylesheet" href={t.fontsHref} />
      {extraFontsHref && <link rel="stylesheet" href={extraFontsHref} />}
      {secCss && <style dangerouslySetInnerHTML={{ __html: secCss }} />}
      {(() => { const cc = sanitizeCss((r as any).site_settings?.custom_css); return cc ? <style dangerouslySetInnerHTML={{ __html: cc }} /> : null })()}
      <style>{`${t.cssVars}html{scroll-behavior:smooth;font-size:var(--text)}.cr-sub{font-size:var(--sub)!important}html,body{background:${pageBg ?? bg}}body{overflow-x:clip}`}</style>
      <PortfolioLightbox />
      <div style={{ background: pageBg ?? bg, color: ink, fontFamily: t.body }}>
        {page !== 'home' ? <SiteNav t={t} logo={logo} name={name} homeHref={hrefs.home} headStyle={headStyle} pageBg={pageBg} items={navItems} /> : null}

        {page === 'home' && tpl === 'editorial' && (
          <>
            {t.menu.solid && renderNav(false, false)}
            <header data-name="Cover" id="top" className="relative flex flex-col overflow-hidden" style={{ minHeight: t.menu.solid ? 'calc(var(--hero-h) - 4rem)' : 'var(--hero-h)' }}>
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
          <header data-name="Cover" id="top">
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
          <header data-name="Cover" id="top">
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
          <header data-name="Cover" id="top" className="relative flex flex-col overflow-hidden" style={{ minHeight: 'var(--hero-h)' }}>
            {heroImg('absolute inset-0 h-full w-full')}
            <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${(ov * 0.6).toFixed(2)})` }} />
            {renderNav(true, false)}
            <div className="relative mx-auto my-auto w-full max-w-xl px-6 py-28">
              <div className="p-3" style={{ background: t.hero.cardBg ?? bg, color: ink }}>
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
          <header data-name="Cover" id="top">
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
        {page === 'home' && tpl === 'peony' && (
          <>
            <header data-name="Cover" id="top" className="relative flex flex-col overflow-hidden" style={{ minHeight: 'var(--hero-h)' }}>
              <style>{`#top #nav{color:${ink}!important}`}</style>
              {heroImg('absolute inset-0 h-full w-full')}
              <div className="absolute inset-0" style={{ background: `color-mix(in srgb, ${bg} 38%, transparent)` }} />
              {renderNav(true, true)}
              <div className="relative mx-auto mt-auto flex w-full max-w-3xl flex-col items-center px-6 pb-14 pt-40 text-center" style={{ color: ink }}>
                <h1 style={h1Mid}>{headline}</h1>
                {subhead && <p className="cr-sub mt-4 text-[11px] uppercase tracking-[0.28em]" style={{ color: accent }}>{subhead}</p>}
                <div className="mt-8">{cta()}</div>
              </div>
            </header>
            {(() => {
              const pics = (mosaicSrcs.length > 0 ? mosaicSrcs : shownHero.length > 0 ? shownHero : isPreview ? PH_SCENES : []).slice(0, 3)
              return (
                <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
                  <div className="mx-auto flex max-w-xl flex-col items-center text-center">{heroPara(soft)}</div>
                  {pics.length > 0 && (
                    <div className="mt-14 grid grid-cols-3 gap-3 md:gap-6">
                      {pics.map((u, i) => (
                        <div key={u + i} className="aspect-[3/4] overflow-hidden"><img src={u} alt="" className="h-full w-full object-cover" /></div>
                      ))}
                    </div>
                  )}
                </section>
              )
            })()}
          </>
        )}
        {page === 'home' && tpl === 'ivy' && (
          <header data-name="Cover" id="top">
            {renderNav(false, true)}
            {(() => {
              const p = pickPics(3)
              const strip = [p[1], shownHero[0] ?? p[0], p[2]].filter(Boolean) as string[]
              return strip.length > 0 ? (
                <div className="mt-2 grid grid-cols-3" style={{ height: 'calc(var(--hero-h) * 0.9)' }}>
                  {strip.map((u, i) => <div key={u + i} className="relative overflow-hidden"><img src={u} alt={i === 1 ? name : ''} className="absolute inset-0 h-full w-full object-cover" /></div>)}
                </div>
              ) : <div style={{ height: 'calc(var(--hero-h) * 0.9)', background: accent, opacity: 0.85 }} />
            })()}
            <div className={`mx-auto flex max-w-3xl flex-col px-6 py-14 ${alignCls}`}>
              {subhead && <p className="cr-sub mb-4 text-[11px] italic" style={{ color: soft }}>{subhead}</p>}
              <h1 style={{ ...h1Mid, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{headline}</h1>
              {heroPara(soft)}
              <div className="mt-8">{cta()}</div>
            </div>
          </header>
        )}
        {page === 'home' && tpl === 'wisteria' && (
          <>
            <header data-name="Cover" id="top" style={{ background: tint }}>
              {renderNav(false, true)}
              <div className="mx-auto max-w-4xl px-6 pt-4">
                <div className="relative aspect-[16/10] overflow-hidden">{heroImg('absolute inset-0 h-full w-full')}</div>
              </div>
              <div className={`mx-auto flex max-w-2xl flex-col px-6 py-12 ${alignCls}`}>
                <h1 style={h1Mid}>{headline}</h1>
                {subhead && <p className="cr-sub mt-3 text-[11px] uppercase tracking-[0.28em]" style={{ color: soft }}>{subhead}</p>}
                <div className="mt-6">{cta()}</div>
              </div>
            </header>
            <section className="mx-auto max-w-5xl px-6 py-14">
              <div className={'grid items-center gap-8 ' + (aboutPhoto ? 'md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]' : '')}>
                {aboutPhoto && <div className="aspect-[4/3] overflow-hidden"><img src={aboutPhoto} alt="" className="h-full w-full object-cover" /></div>}
                <div>
                  <p style={{ ...headStyle, fontSize: 'calc(var(--hl) * 0.6)' }}>Hi, I&apos;m {name}</p>
                  <p className="mt-3 text-[15px] leading-relaxed" style={{ color: soft }}>{aboutText(180)}</p>
                  <a href={hrefs.about} className="mt-4 inline-block text-[13px] underline" style={{ color: accent }}>Read more</a>
                </div>
              </div>
            </section>
          </>
        )}
        {page === 'home' && tpl === 'juniper' && (
          <>
            <header data-name="Cover" id="top">
              {renderNav(false, true)}
              {(() => {
                const p = pickPics(2)
                const two = [shownHero[0] ?? p[0], p[1]].filter(Boolean) as string[]
                return two.length > 0 ? (
                  <div className="mx-auto grid max-w-6xl grid-cols-2 gap-3 px-6 pt-4 md:gap-4">
                    {two.map((u, i) => <div key={u + i} className="aspect-[4/5] overflow-hidden"><img src={u} alt={i === 0 ? name : ''} className="h-full w-full object-cover" /></div>)}
                  </div>
                ) : null
              })()}
              <div className={`mx-auto flex max-w-3xl flex-col px-6 py-12 ${alignCls}`}>
                {subhead && <p className="cr-sub mb-3 text-[11px] uppercase tracking-[0.28em]" style={{ color: accent }}>{subhead}</p>}
                <h1 style={{ ...h1Big, color: accent, textTransform: 'uppercase', lineHeight: 1 }}>{headline}</h1>
                {heroPara(soft)}
                <div className="mt-8">{cta()}</div>
              </div>
            </header>
            {sitePkgs.length > 0 && (
              <section className="mx-auto max-w-5xl px-6 pb-16">
                <div className="grid gap-8 md:grid-cols-3">
                  {sitePkgs.slice(0, 3).map((pk: any) => (
                    <div key={pk.id} className="text-center">
                      <p className="text-[11px] uppercase tracking-[0.22em]" style={{ color: accent }}>{pk.title}</p>
                      <p className="mt-2 text-[13px] leading-relaxed" style={{ color: soft }}>{(pk.description ?? '').slice(0, 90)}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
        {page === 'home' && tpl === 'camellia' && (
          <>
            <header data-name="Cover" id="top" className="relative flex flex-col overflow-hidden" style={{ minHeight: 'calc(var(--hero-h) * 0.9)' }}>
              {heroImg('absolute inset-0 h-full w-full')}
              <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${(ov * 0.5).toFixed(2)})` }} />
              {renderNav(true, true)}
              <div className="relative mx-auto my-auto flex w-full max-w-3xl flex-col items-center px-6 pb-16 pt-40 text-center text-white">
                <h1 style={{ ...h1Big, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{headline}</h1>
                {subhead && <p className="cr-sub mt-3 text-[13px] italic opacity-90">{subhead}</p>}
                <div className="mt-8">{cta()}</div>
              </div>
            </header>
            <div className="px-6 py-3 text-center text-[11px] italic" style={{ background: tint, color: soft }}>{cityLine || name}</div>
            {(() => {
              const p = pickPics(2)
              const words: string[] = galleries.length > 0 ? galleries.slice(0, 4).map((g: any) => g.title as string) : doors.map((d) => d.t)
              return (
                <section className="mx-auto max-w-6xl px-6 py-14">
                  <div className="grid items-center gap-10 md:grid-cols-2">
                    <ul className="space-y-3">{words.map((w) => <li key={w} className="text-[11px] uppercase tracking-[0.22em]" style={{ color: soft }}>{w}</li>)}</ul>
                    {p.length > 0 && (
                      <div className="relative h-56 md:h-64">
                        <img src={p[0]} alt="" className="absolute right-0 top-0 h-4/5 w-3/5 object-cover" style={{ filter: 'grayscale(1)' }} />
                        <img src={p[1]} alt="" className="absolute bottom-0 left-8 h-3/5 w-2/5 object-cover" style={{ filter: 'grayscale(1)', border: `4px solid ${bg}` }} />
                      </div>
                    )}
                  </div>
                </section>
              )
            })()}
          </>
        )}
        {page === 'home' && tpl === 'cedar' && (
          <>
            <header data-name="Cover" id="top" className="relative flex flex-col overflow-hidden" style={{ minHeight: 'var(--hero-h)', background: '#0B0B0B' }}>
              {heroImg('absolute inset-0 h-full w-full')}
              <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, rgba(0,0,0,${Math.min(0.8, ov + 0.3).toFixed(2)}), rgba(0,0,0,${(ov * 0.4).toFixed(2)}))` }} />
              {renderNav(true, false)}
              <div className="relative mx-auto my-auto w-full max-w-6xl px-6 py-28 text-white">
                <div className="max-w-xl">
                  <h1 style={h1Big}>{headline}</h1>
                  {subhead && <p className="cr-sub mt-4 text-[11px] uppercase tracking-[0.28em] opacity-90">{subhead}</p>}
                  {heroPara()}
                  <div className="mt-8">{cta()}</div>
                </div>
              </div>
            </header>
            {(() => {
              const ph = aboutPhoto ?? pickPics(1)[0] ?? null
              return (
                <section style={{ background: '#0B0B0B', color: '#E9E4DE' }}>
                  <div className={'mx-auto grid max-w-6xl items-start gap-8 px-6 py-14 ' + (ph ? 'md:grid-cols-[180px_1fr]' : '')}>
                    {ph && <div className="aspect-[3/4] overflow-hidden"><img src={ph} alt="" className="h-full w-full object-cover" /></div>}
                    <p className="text-[13px] leading-relaxed md:columns-2 md:gap-10" style={{ opacity: 0.75 }}>{aboutText(420)}</p>
                  </div>
                </section>
              )
            })()}
          </>
        )}
        {page === 'home' && tpl === 'olive' && (
          <>
            <header data-name="Cover" id="top">
              {renderNav(false, false)}
              <div className="mx-auto max-w-6xl px-6 pb-14 pt-4">
                <div className="relative aspect-[16/9]">
                  <div className="absolute inset-0 overflow-hidden">{heroImg('absolute inset-0 h-full w-full')}</div>
                  <div className="absolute -bottom-8 left-6 max-w-sm p-6 md:left-10" style={{ background: bg, color: ink }}>
                    {subhead && <p className="cr-sub mb-2 text-[11px] uppercase tracking-[0.28em]" style={{ color: accent }}>{subhead}</p>}
                    <h1 style={h1Mid}>{headline}</h1>
                    <div className="mt-4">{cta()}</div>
                  </div>
                </div>
              </div>
            </header>
            {galleries.length > 0 && (
              <section className="mx-auto max-w-6xl px-6 pb-16 pt-6">
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {galleries.slice(0, 4).map((g: any) => {
                    const u = photoUrl((g.photos.find((x: any) => x.id === g.cover_photo_id) ?? g.photos[0])?.storage_path)
                    return (
                      <a key={g.id} href={hrefs.galleries} className="block">
                        <div className="aspect-square overflow-hidden" style={{ background: tint }}>{u && <img src={u} alt="" className="h-full w-full object-cover" />}</div>
                        <p className="mt-2 text-[11px] uppercase tracking-[0.22em]" style={{ color: soft }}>{g.title}</p>
                      </a>
                    )
                  })}
                </div>
              </section>
            )}
          </>
        )}
        {page === 'home' && tpl === 'magnolia' && (
          <div className="md:flex">
            <aside id="nav" className="px-6 py-8 md:sticky md:top-0 md:h-screen md:w-72 md:shrink-0 md:py-12" style={{ background: tint, color: ink }}>
              <a href={hrefs.home} style={{ display: 'inline-flex' }}>
                {logo && t.menu.show !== 'name' ? <img src={logo} alt={name} style={{ height: 'var(--logo)', objectFit: 'contain' }} /> : <span className="el-menu_brand" style={{ ...headStyle, fontSize: 26 }}>{t.menu.brand ?? name}</span>}
              </a>
              <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 md:mt-12 md:flex-col md:gap-4">
                {navItems.map((n) => <li key={n.key}><a href={n.href} className="text-[11px] uppercase tracking-[0.22em]" style={{ color: ink, opacity: n.active ? 1 : 0.7 }}>{n.label}</a></li>)}
              </ul>
            </aside>
            <div className="min-w-0 flex-1">
              <header data-name="Cover" id="top" className="relative flex flex-col overflow-hidden" style={{ minHeight: 'var(--hero-h)' }}>
                {heroImg('absolute inset-0 h-full w-full')}
                <div className="absolute inset-0" style={{ background: `linear-gradient(rgba(0,0,0,0), rgba(0,0,0,${Math.min(0.7, ov * 1.4).toFixed(2)}))` }} />
                <div className="relative mt-auto px-8 pb-12 text-white">
                  <h1 style={h1Mid}>{headline}</h1>
                  {subhead && <p className="cr-sub mt-3 text-[11px] uppercase tracking-[0.28em] opacity-90">{subhead}</p>}
                  <div className="mt-6">{cta()}</div>
                </div>
              </header>
              <section className="px-8 py-14">
                <div className="grid items-center gap-8 md:grid-cols-[1fr_2fr]">
                  <div>
                    <p style={{ ...headStyle, fontSize: 'calc(var(--hl) * 0.6)' }}>Our story</p>
                    <p className="mt-3 text-[14px] leading-relaxed" style={{ color: soft }}>{aboutText(140)}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {pickPics(3).map((u, i) => <div key={u + i} className="aspect-square overflow-hidden"><img src={u} alt="" className="h-full w-full object-cover" /></div>)}
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}
        {page === 'home' && tpl === 'lily' && (
          <>
            <header data-name="Cover" id="top">
              {renderNav(false, false)}
              <div className="relative mx-auto max-w-6xl px-6 pb-14 pt-6">
                <div className="relative ml-auto aspect-[4/3] w-full overflow-hidden md:w-[70%]">{heroImg('absolute inset-0 h-full w-full')}</div>
                <div className="relative mt-4 p-8 md:absolute md:left-6 md:top-16 md:mt-0 md:w-[44%]" style={{ background: tint, color: ink }}>
                  {subhead && <p className="cr-sub mb-3 text-[11px] uppercase tracking-[0.28em]" style={{ color: accent }}>{subhead}</p>}
                  <h1 style={h1Mid}>{headline}</h1>
                  {heroPara(soft)}
                  <div className="mt-6">{cta()}</div>
                </div>
              </div>
            </header>
            <section className="mx-auto max-w-6xl px-6 pb-16">
              <div className="grid items-center gap-8 md:grid-cols-2">
                <div>
                  <p style={{ ...headStyle, fontSize: 'calc(var(--hl) * 0.6)' }}>Meet {name}</p>
                  <p className="mt-3 text-[14px] leading-relaxed" style={{ color: soft }}>{aboutText(150)}</p>
                  <a href={hrefs.about} className="mt-4 inline-block text-[13px] underline" style={{ color: accent }}>Read more</a>
                </div>
                <div className="flex gap-4">
                  {pickPics(2).map((u, i) => <div key={u + i} className={'aspect-[3/4] flex-1 overflow-hidden ' + (i === 1 ? 'mt-10' : '')}><img src={u} alt="" className="h-full w-full object-cover" /></div>)}
                </div>
              </div>
            </section>
          </>
        )}
        {page === 'home' && tpl === 'orchid' && (
          <>
            <header data-name="Cover" id="top">
              {renderNav(false, true)}
              <div className="mx-auto max-w-6xl px-6 pt-4">
                <div className="relative aspect-[16/8] overflow-hidden">{heroImg('absolute inset-0 h-full w-full')}</div>
                <div className="mt-3 grid grid-cols-5 gap-3">
                  {pickPics(5).map((u, i) => (
                    <a key={u + i} href={hrefs.galleries} className="block aspect-[4/3] overflow-hidden" style={{ outline: i === 0 ? `1px solid ${ink}` : undefined, outlineOffset: 2 }}><img src={u} alt="" className="h-full w-full object-cover" /></a>
                  ))}
                </div>
              </div>
            </header>
            <section className={`mx-auto flex max-w-3xl flex-col px-6 py-14 ${alignCls}`}>
              <h1 style={h1Mid}>{headline}</h1>
              {subhead && <p className="cr-sub mt-3 text-[11px] uppercase tracking-[0.28em]" style={{ color: soft }}>{subhead}</p>}
              <div className="mt-6">{cta()}</div>
            </section>
          </>
        )}
        {page === 'home' && tpl === 'lotus' && (
          <>
            <header data-name="Cover" id="top" className="relative flex flex-col overflow-hidden" style={{ minHeight: 'var(--hero-h)' }}>
              {heroImg('absolute inset-0 h-full w-full')}
              <nav id="nav" className="relative z-20 mt-auto flex flex-wrap items-center justify-between gap-4 px-6 py-4" style={{ background: bg, color: ink }}>
                <a href={hrefs.home} style={{ display: 'inline-flex' }}>
                  {logo && t.menu.show !== 'name' ? <img src={logo} alt={name} style={{ height: 'var(--logo)', objectFit: 'contain' }} /> : <span className="el-menu_brand" style={{ ...headStyle, fontSize: 22 }}>{t.menu.brand ?? name}</span>}
                </a>
                <ul className="hidden gap-8 md:flex">
                  {navItems.map((n) => <li key={n.key}><a href={n.href} className="text-[11px] uppercase tracking-[0.22em]" style={{ color: ink, opacity: n.active ? 1 : 0.7 }}>{n.label}</a></li>)}
                </ul>
                <div>{cta(true)}</div>
              </nav>
            </header>
            <section className="mx-auto max-w-6xl px-6 py-14">
              <div className="grid items-center gap-8 md:grid-cols-2">
                <div>
                  <h1 style={h1Mid}>{headline}</h1>
                  {subhead && <p className="cr-sub mt-3 text-[11px] uppercase tracking-[0.28em]" style={{ color: soft }}>{subhead}</p>}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {pickPics(3).map((u, i) => <div key={u + i} className="aspect-square overflow-hidden"><img src={u} alt="" className="h-full w-full object-cover" /></div>)}
                </div>
              </div>
            </section>
          </>
        )}
        {page === 'home' && tpl === 'aster' && (
          <>
            <header data-name="Cover" id="top">
              {renderNav(false, false)}
              <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-12 md:grid-cols-2">
                <div>
                  {subhead && <p className="cr-sub mb-4 text-[11px] uppercase tracking-[0.28em]" style={{ color: accent }}>{subhead}</p>}
                  <h1 style={h1Mid}>{headline}</h1>
                  {heroPara(soft)}
                  <div className="mt-8">{cta()}</div>
                </div>
                <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden" style={{ borderRadius: '999px 999px 0 0' }}>{heroImg('absolute inset-0 h-full w-full')}</div>
              </div>
            </header>
            {(() => {
              const q3 = (isPreview ? quotesShown : quotes).slice(0, 3)
              return q3.length > 0 ? (
                <section className="mx-auto max-w-6xl px-6 pb-16">
                  <p className="mb-6 text-center text-[11px] uppercase tracking-[0.28em]" style={{ color: accent }}>Kind words</p>
                  <div className="grid gap-8 md:grid-cols-3">
                    {q3.map((q, i) => (
                      <div key={i} className="text-center">
                        <p className="text-[14px] leading-relaxed" style={{ color: soft }}>{q.text.slice(0, 120)}</p>
                        <p className="mt-3 text-[11px] uppercase tracking-[0.22em]">{q.who}</p>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null
            })()}
          </>
        )}
        {page === 'home' && tpl === 'fern' && (
          <>
            <header data-name="Cover" id="top">
              {renderNav(false, true)}
              {(() => {
                const p = pickPics(4)
                const four = [shownHero[0] ?? p[0], p[1], p[2], p[3]].filter(Boolean) as string[]
                return four.length > 0 ? (
                  <div className="mx-auto grid max-w-6xl grid-cols-4 items-start gap-3 px-6 pt-4 md:gap-4">
                    {four.map((u, i) => <div key={u + i} className={'aspect-[3/4] overflow-hidden ' + (i % 2 === 1 ? 'mt-8' : '')}><img src={u} alt={i === 0 ? name : ''} className="h-full w-full object-cover" /></div>)}
                  </div>
                ) : null
              })()}
            </header>
            <section className={`mx-auto flex max-w-3xl flex-col px-6 py-16 ${alignCls}`}>
              <h1 style={h1Mid}>{headline}</h1>
              {subhead && <p className="cr-sub mt-3 text-[11px] uppercase tracking-[0.28em]" style={{ color: soft }}>{subhead}</p>}
              <div className="mt-6">{cta()}</div>
            </section>
          </>
        )}
        {page === 'home' && tpl === 'sage' && (
          <>
            <header data-name="Cover" id="top" className="grid md:grid-cols-3" style={{ minHeight: 'calc(var(--hero-h) * 0.9)' }}>
              <div className="relative min-h-[50vh] md:min-h-0">{heroImg('absolute inset-0 h-full w-full')}</div>
              <div id="nav" className="order-first flex flex-col items-center justify-center px-6 py-12 text-center md:order-none" style={{ background: tint, color: ink }}>
                <a href={hrefs.home} style={{ display: 'inline-flex' }}>
                  {logo && t.menu.show !== 'name' ? <img src={logo} alt={name} style={{ height: 'var(--logo)', objectFit: 'contain' }} /> : <span className="el-menu_brand" style={{ ...headStyle, fontSize: 26 }}>{t.menu.brand ?? name}</span>}
                </a>
                <ul className="mt-6 space-y-2">
                  {navItems.map((n) => <li key={n.key}><a href={n.href} className="text-[11px] uppercase tracking-[0.22em]" style={{ color: ink, opacity: n.active ? 1 : 0.7 }}>{n.label}</a></li>)}
                </ul>
                <h1 className="mt-8" style={h1Mid}>{headline}</h1>
                <div className="mt-6">{cta()}</div>
              </div>
              <div className="relative hidden md:block">
                {(() => { const u = pickPics(3)[1]; return u ? <img src={u} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null })()}
              </div>
            </header>
            <section className="mx-auto max-w-6xl px-6 py-14">
              <p className="text-center" style={{ ...headStyle, fontSize: 'calc(var(--hl) * 0.55)' }}>Recent sessions</p>
              <div className="mt-8 grid grid-cols-3 gap-3 md:gap-5">
                {pickPics(3).map((u, i) => <div key={u + i} className="aspect-[4/3] overflow-hidden"><img src={u} alt="" className="h-full w-full object-cover" /></div>)}
              </div>
            </section>
          </>
        )}
        {page === 'home' && tpl === 'rose' && (
          <>
            <header data-name="Cover" id="top">
              {renderNav(false, false)}
              <div className="mx-auto flex max-w-3xl flex-col items-center px-6 pb-10 pt-8 text-center">
                <div className="relative">
                  <div className="relative aspect-square overflow-hidden rounded-full" style={{ width: 'min(70vw, 420px)' }}>{heroImg('absolute inset-0 h-full w-full')}</div>
                  <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap" style={{ ...headStyle, fontStyle: 'italic', fontSize: 'calc(var(--hl) * 0.8)', color: accent }}>{name}</span>
                </div>
                <h1 className="mt-12" style={h1Mid}>{headline}</h1>
                {subhead && <p className="cr-sub mt-3 text-[11px] uppercase tracking-[0.28em]" style={{ color: soft }}>{subhead}</p>}
                <div className="mt-6">{cta()}</div>
              </div>
            </header>
            <section className="mx-auto max-w-4xl px-6 pb-16">
              <div className="grid grid-cols-3 gap-6">
                {pickPics(3).map((u, i) => (
                  <div key={u + i} className="text-center">
                    <div className="mx-auto aspect-square w-full max-w-[160px] overflow-hidden rounded-full"><img src={u} alt="" className="h-full w-full object-cover" /></div>
                    <p className="mt-3 text-[11px] uppercase tracking-[0.22em]" style={{ color: soft }}>{galleries[i]?.title ?? ['Weddings', 'Families', 'Portraits'][i]}</p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
        {page === 'home' && tpl === 'hazel' && (
          <>
            <header data-name="Cover" id="top">
              {renderNav(false, true)}
              <div className="relative mt-2 overflow-hidden" style={{ height: 'clamp(140px, 22vh, 260px)' }}>{heroImg('absolute inset-0 h-full w-full')}</div>
              {(() => {
                const p = pickPics(3)
                return (
                  <div className="grid md:grid-cols-2">
                    <div className="flex flex-col justify-center px-8 py-10 md:px-14" style={{ background: tint }}>
                      {subhead && <p className="cr-sub mb-3 text-[11px] uppercase tracking-[0.28em]" style={{ color: accent }}>{subhead}</p>}
                      <h1 style={h1Mid}>{headline}</h1>
                      <div className="mt-6">{cta()}</div>
                    </div>
                    <div className="relative min-h-[220px] overflow-hidden">{p[1] && <img src={p[1]} alt="" className="absolute inset-0 h-full w-full object-cover" />}</div>
                    <div className="relative order-4 min-h-[220px] overflow-hidden md:order-3">{p[2] && <img src={p[2]} alt="" className="absolute inset-0 h-full w-full object-cover" />}</div>
                    <div className="order-3 flex flex-col justify-center px-8 py-10 md:order-4 md:px-14" style={{ background: tint }}>{heroPara(soft)}</div>
                  </div>
                )
              })()}
            </header>
            {(() => {
              const q = (isPreview ? quotesShown : quotes)[0]
              return q ? (
                <section className="mx-auto max-w-2xl px-6 py-14 text-center">
                  <p style={{ ...headStyle, fontSize: 'calc(var(--hl) * 0.5)', fontStyle: 'italic' }}>{q.text.slice(0, 140)}</p>
                  <p className="mt-3 text-[11px] uppercase tracking-[0.22em]" style={{ color: soft }}>{q.who}</p>
                </section>
              ) : null
            })()}
          </>
        )}
        {page === 'home' && tpl === 'saffron' && (
          <>
            <header data-name="Cover" id="top" className="grid md:grid-cols-[2fr_3fr]" style={{ minHeight: 'var(--hero-h)' }}>
              <div id="nav" className="flex flex-col justify-between gap-10 px-8 py-10 md:px-12" style={{ background: bg, color: ink }}>
                <div>
                  <a href={hrefs.home} style={{ display: 'inline-flex' }}>
                    {logo && t.menu.show !== 'name' ? <img src={logo} alt={name} style={{ height: 'var(--logo)', objectFit: 'contain' }} /> : <span className="el-menu_brand" style={{ ...headStyle, fontSize: 24 }}>{t.menu.brand ?? name}</span>}
                  </a>
                  <h1 className="mt-4 italic opacity-80" style={{ ...headStyle, fontSize: 15 }}>{headline}</h1>
                </div>
                <div>
                  {(galleries.length > 0 ? galleries.slice(0, 4).map((g: any) => g.title as string) : doors.map((d) => d.t)).map((title, i) => (
                    <a key={title + i} href={hrefs.galleries} className="flex items-baseline gap-4 py-3" style={{ borderBottom: `1px solid ${line}` }}>
                      <span className="text-[11px]" style={{ color: accent }}>{String(i + 1).padStart(2, '0')}</span>
                      <span style={{ ...headStyle, fontSize: 'calc(var(--hl) * 0.55)' }}>{title}</span>
                    </a>
                  ))}
                </div>
                <div>
                  <ul className="flex flex-wrap gap-x-5 gap-y-2">{navItems.map((n) => <li key={n.key}><a href={n.href} className="text-[10px] uppercase tracking-[0.22em]" style={{ color: ink, opacity: n.active ? 1 : 0.7 }}>{n.label}</a></li>)}</ul>
                  <div className="mt-5">{cta()}</div>
                </div>
              </div>
              <div className="relative min-h-[60vh] md:min-h-0">{heroImg('absolute inset-0 h-full w-full')}</div>
            </header>
            <section className="mx-auto max-w-6xl px-6 py-14">
              <div className="grid grid-cols-3 gap-4">
                {pickPics(3).map((u, i) => (
                  <div key={u + i}>
                    <div className="aspect-[4/3] overflow-hidden"><img src={u} alt="" className="h-full w-full object-cover" /></div>
                    <p className="mt-2 text-[10px] uppercase tracking-[0.22em]" style={{ color: soft }}>{galleries[i]?.title ?? ''}</p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
        {page === 'home' && tpl === 'cypress' && (
          <>
            <header data-name="Cover" id="top" className="relative flex flex-col overflow-hidden" style={{ minHeight: 'var(--hero-h)' }}>
              {heroImg('absolute inset-0 h-full w-full')}
              <div className="absolute inset-0" style={{ background: `linear-gradient(rgba(0,0,0,0), rgba(0,0,0,${Math.min(0.7, ov * 1.4).toFixed(2)}))` }} />
              <nav id="nav" className="absolute inset-x-4 top-5 z-20 mx-auto flex max-w-5xl items-center justify-between gap-4 rounded-full px-6 py-3" style={{ background: 'rgba(255,255,255,0.93)', color: '#1a1a1a' }}>
                <a href={hrefs.home} style={{ display: 'inline-flex' }}>
                  {logo && t.menu.show !== 'name' ? <img src={logo} alt={name} style={{ height: 'calc(var(--logo) * 0.8)', objectFit: 'contain' }} /> : <span className="el-menu_brand" style={{ ...headStyle, fontSize: 20 }}>{t.menu.brand ?? name}</span>}
                </a>
                <ul className="hidden gap-6 md:flex">{navItems.map((n) => <li key={n.key}><a href={n.href} className="text-[10px] uppercase tracking-[0.22em]" style={{ color: '#1a1a1a', opacity: n.active ? 1 : 0.7 }}>{n.label}</a></li>)}</ul>
                <div>{cta(true)}</div>
              </nav>
              <div className="relative mx-auto mt-auto w-full max-w-6xl px-6 pb-12 pt-40 text-white">
                <div className="max-w-xl">
                  <h1 style={h1Big}>{headline}</h1>
                  {subhead && <p className="cr-sub mt-3 text-[11px] uppercase tracking-[0.28em] opacity-90">{subhead}</p>}
                </div>
              </div>
              {(() => { const u = pickPics(3)[2]; return u ? <div className="absolute bottom-8 right-8 hidden w-1/4 md:block" style={{ border: '8px solid #fff' }}><img src={u} alt="" className="aspect-[4/3] h-full w-full object-cover" /></div> : null })()}
            </header>
            <section className="mx-auto max-w-4xl px-6 py-14 text-center">
              {heroPara(soft)}
              <div className="mt-8 grid gap-6 md:grid-cols-3">
                {doors.map((d, i) => (
                  <a key={d.k} href={d.href} className="block">
                    <span className="text-[11px]" style={{ color: accent }}>{String(i + 1).padStart(2, '0')}</span>
                    <p className="mt-1" style={{ ...headStyle, fontSize: 'calc(var(--hl) * 0.5)' }}>{d.t}</p>
                  </a>
                ))}
              </div>
            </section>
          </>
        )}
        {page === 'home' && tpl === 'laurel' && (
          <>
            <div style={{ background: tint }}>
              <header data-name="Cover" id="top">
                {renderNav(false, false)}
                <div className="relative mx-auto max-w-6xl px-6 pb-10 pt-4">
                  <span className="absolute left-1 top-1/2 hidden -translate-y-1/2 text-[10px] uppercase tracking-[0.3em] md:block" style={{ writingMode: 'vertical-rl', transform: 'translateY(-50%) rotate(180deg)', color: soft }}>{subhead || name}</span>
                  <div className="relative aspect-[16/9] overflow-hidden">
                    {heroImg('absolute inset-0 h-full w-full')}
                    <div className="absolute bottom-5 left-5">{cta()}</div>
                  </div>
                </div>
              </header>
            </div>
            <section className="mx-auto max-w-6xl px-6 py-14">
              <div className="grid items-center gap-8 md:grid-cols-2">
                <div className="grid grid-cols-2 gap-4">
                  {pickPics(2).map((u, i) => <div key={u + i} className="aspect-[3/4] overflow-hidden"><img src={u} alt="" className="h-full w-full object-cover" /></div>)}
                </div>
                <div>
                  <h1 style={h1Mid}>{headline}</h1>
                  <p className="mt-3 text-[14px] leading-relaxed" style={{ color: soft }}>{aboutText(120)}</p>
                </div>
              </div>
            </section>
          </>
        )}
        {page === 'home' && tpl === 'iris' && (
          <>
            <header data-name="Cover" id="top" className="relative">
              <div className="relative aspect-[4/5] overflow-hidden md:aspect-[16/10]">
                {heroImg('absolute inset-0 h-full w-full')}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0) 38%, rgba(0,0,0,0.45))' }} />
                {renderNav(true, true)}
                <div className="absolute inset-x-0 top-20 px-6 text-center">
                  <h1 style={{ ...h1Big, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{headline}</h1>
                </div>
                <div className="absolute bottom-6 left-6 max-w-xs text-white">
                  <p className="text-[11px] uppercase tracking-[0.25em]">{subhead || cityLine}</p>
                  <div className="mt-4">{cta()}</div>
                </div>
              </div>
            </header>
            <section className="mx-auto max-w-6xl px-6 py-14">
              <div className="grid gap-6 md:grid-cols-3">
                {pickPics(3).map((u, i) => (
                  <div key={u + i}>
                    <div className="aspect-[3/4] overflow-hidden"><img src={u} alt="" className="h-full w-full object-cover" /></div>
                    <p className="mt-3 text-[11px] uppercase tracking-[0.25em]" style={{ color: soft }}>{'No. 0' + (i + 1)}</p>
                  </div>
                ))}
              </div>
              <p className="mx-auto mt-10 max-w-xl text-center text-[14px] leading-relaxed" style={{ color: soft }}>{aboutText(140)}</p>
            </section>
          </>
        )}
        {page === 'home' && tpl === 'poppy' && (
          <>
            <div style={{ background: '#000' }}>
              <header data-name="Cover" id="top" className="relative">
                {renderNav(true, false)}
                <div className="relative mx-auto aspect-[21/9] min-h-[50vh] max-w-none overflow-hidden" style={{ marginTop: 0 }}>
                  {heroImg('absolute inset-0 h-full w-full')}
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0) 55%)' }} />
                  <div className="absolute bottom-8 left-8 right-8 text-white">
                    <h1 style={{ ...h1Mid, color: '#fff' }}>{headline}</h1>
                    <div className="mt-4">{cta()}</div>
                  </div>
                </div>
              </header>
            </div>
            <section className="px-6 py-14" style={{ background: '#0B0B0B', color: '#EDE7DE' }}>
              <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
                {pickPics(3).map((u, i) => <div key={u + i} className="aspect-video overflow-hidden"><img src={u} alt="" className="h-full w-full object-cover" /></div>)}
              </div>
              <p className="mx-auto mt-10 max-w-xl text-center text-[14px] leading-relaxed opacity-70">{aboutText(130)}</p>
            </section>
          </>
        )}
        {page === 'home' && tpl === 'thistle' && (
          <>
            <header data-name="Cover" id="top" style={{ background: tint }}>
              {renderNav(false, false)}
              <div className="grid md:grid-cols-[3fr_2fr]" style={{ minHeight: 'calc(var(--hero-h) * 0.9)' }}>
                <div className="relative min-h-[50vh]" style={{ clipPath: 'polygon(0 0, 100% 0, 84% 100%, 0 100%)' }}>
                  {heroImg('absolute inset-0 h-full w-full')}
                </div>
                <div className="flex flex-col justify-center px-8 py-10 md:pl-4">
                  <h1 style={h1Mid}>{headline}</h1>
                  <p className="mt-3 text-[14px] leading-relaxed" style={{ color: soft }}>{subhead}</p>
                  <div className="mt-6">{cta(true)}</div>
                </div>
              </div>
            </header>
            <section className="mx-auto max-w-6xl px-6 py-14">
              <div className="grid gap-4 md:grid-cols-3">
                {pickPics(3).map((u, i) => <div key={u + i} className="aspect-[4/5] overflow-hidden" style={{ clipPath: 'polygon(12% 0, 100% 0, 88% 100%, 0 100%)' }}><img src={u} alt="" className="h-full w-full object-cover" /></div>)}
              </div>
              <p className="mx-auto mt-10 max-w-xl text-center text-[14px] leading-relaxed" style={{ color: soft }}>{aboutText(130)}</p>
            </section>
          </>
        )}
        {page === 'home' && tpl === 'clover' && (
          <>
            <header data-name="Cover" id="top">
              {renderNav(false, true)}
              <div className="mx-auto max-w-5xl px-6 pb-6 pt-2">
                <div className="relative aspect-[16/10] bg-white p-3 shadow-lg">
                  <div className="relative h-full w-full overflow-hidden">
                    {heroImg('absolute inset-0 h-full w-full')}
                    <div className="absolute bottom-4 left-4">{cta()}</div>
                  </div>
                </div>
                <h1 className="mt-6 text-center" style={h1Mid}>{headline}</h1>
              </div>
            </header>
            <section className="mx-auto max-w-6xl px-6 py-12">
              <div className="flex flex-wrap justify-center gap-6">
                {pickPics(5).map((u, i) => (
                  <div key={u + i} className="w-40 bg-white p-2 pb-8 shadow-md md:w-48" style={{ transform: 'rotate(' + [-4, 3, -2, 5, -3][i % 5] + 'deg)' }}>
                    <div className="aspect-square overflow-hidden"><img src={u} alt="" className="h-full w-full object-cover" /></div>
                    <p className="mt-2 text-center text-[11px]" style={{ color: soft }}>{name}</p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
        {page === 'home' && tpl === 'mimosa' && (
          <>
            <header data-name="Cover" id="top">
              {renderNav(false, false)}
              <div className="mx-auto max-w-6xl px-6 pb-8 pt-2">
                <div className="relative aspect-[16/9] overflow-hidden">
                  {heroImg('absolute inset-0 h-full w-full')}
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.45), rgba(0,0,0,0) 50%)' }} />
                  <div className="absolute bottom-6 left-6 text-white">
                    <h1 style={{ ...h1Mid, color: '#fff' }}>{headline}</h1>
                    <div className="mt-3">{cta()}</div>
                  </div>
                </div>
              </div>
            </header>
            <section className="mx-auto max-w-4xl px-6 py-12">
              <div className="relative">
                <div className="absolute bottom-0 left-1/2 top-0 hidden w-px md:block" style={{ background: line }} />
                {pickPics(3).map((u, i) => (
                  <div key={u + i} className={'relative mb-10 grid items-center gap-6 md:grid-cols-2 ' + (i % 2 ? 'md:[direction:rtl]' : '')}>
                    <div className="aspect-[4/3] overflow-hidden"><img src={u} alt="" className="h-full w-full object-cover" /></div>
                    <div style={{ direction: 'ltr' }}>
                      <p className="text-[11px] uppercase tracking-[0.25em]" style={{ color: accent }}>{'0' + (i + 1)}</p>
                      <p className="mt-2 text-[14px] leading-relaxed" style={{ color: soft }}>{aboutText(90)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
        {page === 'home' && tpl === 'yarrow' && (
          <>
            <header data-name="Cover" id="top">
              {renderNav(false, true)}
              <div className="mx-auto max-w-6xl px-6 pb-8 pt-2">
                <div className="relative aspect-[16/9] overflow-hidden">
                  {heroImg('absolute inset-0 h-full w-full')}
                  <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.25)' }} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-white">
                    <h1 style={{ ...h1Mid, color: '#fff' }}>{headline}</h1>
                    <p className="mt-2 text-[12px] uppercase tracking-[0.25em]">{subhead || cityLine}</p>
                    <div className="mt-5">{cta()}</div>
                  </div>
                </div>
              </div>
            </header>
            <section className="mx-auto max-w-6xl px-6 py-12">
              <div className="grid items-center gap-8 md:grid-cols-2">
                {(() => {
                  const d = new Date()
                  const y = d.getFullYear()
                  const m = d.getMonth()
                  const first = new Date(y, m, 1).getDay()
                  const days = new Date(y, m + 1, 0).getDate()
                  const mark = Math.min(14, days)
                  const cells: number[] = [...Array(first).fill(0), ...Array.from({ length: days }, (_, i) => i + 1)]
                  return (
                    <div className="mx-auto w-full max-w-sm p-6" style={{ background: tint, border: '1px solid ' + line }}>
                      <p className="text-center text-[12px] uppercase tracking-[0.25em]">{d.toLocaleString('en-US', { month: 'long' })}</p>
                      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px]">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((w, i) => <span key={'w' + i} style={{ color: soft }}>{w}</span>)}
                        {cells.map((c, i) => (
                          <span key={i} className="py-1" style={c === mark ? { background: accent, color: '#fff', borderRadius: 999 } : undefined}>{c || ''}</span>
                        ))}
                      </div>
                    </div>
                  )
                })()}
                <div>
                  <div className="aspect-[4/3] overflow-hidden">{pickPics(1).map((u) => <img key={u} src={u} alt="" className="h-full w-full object-cover" />)}</div>
                  <p className="mt-4 text-[14px] leading-relaxed" style={{ color: soft }}>{aboutText(110)}</p>
                </div>
              </div>
            </section>
          </>
        )}
        {page === 'home' && tpl === 'mosaic' && (
          <header data-name="Cover" id="top">
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
                        {logo && t.menu.show !== 'name' ? <img src={logo} alt={name} style={{ height: 'var(--logo)', objectFit: 'contain' }} /> : <span className="el-menu_brand" style={{ ...headStyle, fontSize: 24, color: 'inherit', ...(it.font === 'body' ? { fontFamily: t.body } : {}) }}>{t.menu.brand ?? name}</span>}
                      </a>
                    )
                  }
                  if (type === 'title') return <h1 style={{ ...h1Mid, margin: 0, color: 'inherit' }}>{headline}</h1>
                  if (type === 'subtitle') return subhead ? <p className="cr-sub text-[11px] uppercase tracking-[0.28em]" style={{ color: it.color ?? (it.light ? '#fff' : accent), margin: 0 }}>{subhead}</p> : null
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
                            <a href={n.href} className="el-menu_links text-[11px] uppercase tracking-[0.2em]" style={{ fontFamily: t.body, color: page === 'home' ? (t.menu.linkColor ?? undefined) : undefined, fontSize: 'var(--menu)', opacity: n.active ? 1 : 0.8, borderBottom: n.active ? '1px solid currentColor' : '1px solid transparent', paddingBottom: 3 }}>{n.label}</a>
                          </li>
                        ))}
                      </ul>
                    )
                  }
                  return null
                }}
                renderButton={(label) => (
                  <a data-name="Button" href={availHref} className="cr-btn inline-block px-8 py-3 text-[11px] uppercase tracking-[0.22em]" style={btnStyle}>{label}</a>
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
          <React.Fragment key={k}>{((hid: boolean) => isPreview ? (<div data-sec={k} style={hid ? { display: 'none' } : undefined}>{hid ? null : renderSection(k, i % 2 === 1)}</div>) : hid ? null : renderSection(k, i % 2 === 1))(((r as any).site_settings?.hiddenSecs ?? []).includes(k))}</React.Fragment>
        ))}

        {page === 'galleries' && visible.length > 0 && (
          <div className="px-6 pb-12 pt-4 text-center"><a href={resolveLink((r as any).site_settings?.galBtn?.link, availHref)} id="gal-btn" className="cr-btn gb-btn inline-block px-8 py-3 text-[11px] uppercase tracking-[0.22em]" style={btnStyle}>{t.galBtnText}</a></div>
        )}

        <footer data-name="Footer" id="footer" className="px-6 pb-12 pt-6 text-center uppercase tracking-[0.2em]" style={{ color: soft, fontSize: 'calc(11px * var(--fs-foot, 1))' }}>
          {t.text.footer && <p className="el-ft_line mb-3 whitespace-pre-line normal-case tracking-normal" style={{ fontSize: 'calc(13px * var(--fs-foot, 1))' }}>{t.text.footer}</p>}
          <span className="el-ft_copy">{'© ' + (t.text.copyright ? t.text.copyright.replace(/\{year\}/g, String(new Date().getFullYear())) : `${new Date().getFullYear()} ${name}`).replace(/^\s*©\s*/, '')}</span> · <a href="https://camrhia.com" style={{ color: accent }}>Powered by Camrhia</a>
        </footer>
      </div>
    </>
  )
}
