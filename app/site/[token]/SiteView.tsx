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
const PH_AVATAR = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="#E6E3DE"/><circle cx="100" cy="80" r="34" fill="#BDB8B0"/><path d="M32 200c0-42 30-68 68-68s68 26 68 68z" fill="#BDB8B0"/></svg>')
const PH_ABOUT = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000"><rect width="800" height="1000" fill="#EFECE7"/><g fill=\"none\" stroke=\"#BDB7AD\" stroke-width=\"14\" stroke-linejoin=\"round\" stroke-linecap=\"round\"><circle cx="560" cy="430" r="55"/><path d="M170 700 L340 500 L450 630 L520 550 L630 700 Z"/></g></svg>')
const PH_ABOUT_W = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900"><rect width="1600" height="900" fill="#EFECE7"/><g fill=\"none\" stroke=\"#BDB7AD\" stroke-width=\"14\" stroke-linejoin=\"round\" stroke-linecap=\"round\"><circle cx="930" cy="330" r="60"/><path d="M600 610 L780 400 L890 530 L960 450 L1080 610 Z"/></g></svg>')
const PH_SCENES: string[] = [PH_ABOUT, PH_ABOUT, PH_ABOUT, PH_ABOUT, PH_ABOUT, PH_ABOUT]
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
  const logo: string | null = null
  const brandText: string = String(t.menu.brand ?? '').trim() || ((tpl === 'magazine' || tpl === 'mosaic') ? 'Marcus Cole' : tpl === 'minimal' ? 'Avery Lane' : tpl === 'editorial' ? (String((r as any).site_settings?.look ?? '') === 'moody' ? 'Nova Reyes' : String((r as any).site_settings?.look ?? '') === 'earthy' ? 'Juniper Moss' : 'Eleanor Hart') : tpl === 'framed' ? 'Rosalind Vale' : tpl === 'split' ? 'Juniper Moss' : tpl === 'peony' ? 'Poppy Wells' : tpl === 'ivy' ? 'Ivy Marlowe' : tpl === 'wisteria' ? 'Wisteria Lane' : tpl === 'juniper' ? 'Juniper' : tpl === 'camellia' ? 'Camellia' : tpl === 'cedar' ? 'Cedar' : tpl === 'olive' ? 'Olive & Oak' : tpl === 'magnolia' ? 'Magnolia Rose' : tpl === 'lily' ? 'Lily & Lane' : tpl === 'orchid' ? 'Orchid Studio' : tpl === 'lotus' ? 'Lotus' : tpl === 'aster' ? 'Aster & Co' : tpl === 'fern' ? 'Fern & Finch' : tpl === 'sage' ? 'Sage & Stone' : tpl === 'rose' ? 'Rose & Rye' : tpl === 'hazel' ? 'Hazel Park' : tpl === 'saffron' ? 'Saffron' : tpl === 'cypress' ? 'Cypress' : tpl === 'laurel' ? 'Laurel Studio' : tpl === 'iris' ? 'Iris' : tpl === 'poppy' ? 'Poppy Reel' : tpl === 'thistle' ? 'Thistle & Thorn' : tpl === 'clover' ? 'Clover & Co' : tpl === 'mimosa' ? 'Mimosa' : tpl === 'yarrow' ? 'Yarrow' : 'Your Name')
  const aboutPhoto = photoUrl((r as any).site_settings?.about?.photo ?? null) ?? (isPreview ? (['stacked', 'textfirst'].includes((r as any).site_settings?.about?.layout) ? PH_ABOUT_W : PH_ABOUT) : null)

  const heroPaths: string[] = t.hero.photos
  const heroUrlsReal = heroPaths.map((p) => photoUrl(p)).filter(Boolean) as string[]
  const heroUrls = heroUrlsReal
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
    const src: string[] = a
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
      : <span className="el-menu_brand" style={{ ...headStyle, fontSize: 24 }}>{brandText}</span>
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

        {page === 'home' && tpl === 'editorial' && String((r as any).site_settings?.look ?? '') === 'moody' && (() => {
          const SF = "'Cormorant Garamond', 'Playfair Display', Georgia, serif"
          const txt = (r as any).site_settings?.text ?? {}
          const heading = String((r as any).site_headline ?? '').trim() || 'Authentic Stories,\nBeautifully Captured'
          const btnTxt = String(txt.hero_btn ?? '').trim() || 'Book your session'
          const labelTxt = String(txt.air_label ?? '').trim() || 'About'
          const aboutTxt = String(t.text.about ?? '').trim() || 'A photographer for modern couples\nwho value emotion, connection, and truth.'
          const mtn = (bgc: string, fgc: string) => (
            <div className="absolute inset-0" style={{ background: bgc }}>
              <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
                <circle cx="300" cy="58" r="16" fill={fgc} opacity="0.55" />
                <path d="M0 200 L105 82 L165 142 L238 62 L400 200 Z" fill={fgc} opacity="0.8" />
              </svg>
            </div>
          )
          const covers = realGalleries.map((g) => photoUrl((g.photos.find((x: any) => x.id === g.cover_photo_id) ?? g.photos[0])?.storage_path)).filter(Boolean) as string[]
          const rest = realGalleries.flatMap((g) => g.photos.map((x: any) => photoUrl(x?.storage_path))).filter(Boolean) as string[]
          const pics = Array.from(new Set([...covers, ...rest])).slice(0, 2)
          const box = (k: number, st: React.CSSProperties) => (
            <div data-name={'About photo ' + (k + 1)} className="absolute overflow-hidden" style={{ border: `1px solid ${accent}`, background: '#161310', ...st }}>
              {pics[k] ? <img src={pics[k]} alt="" className="absolute inset-0 h-full w-full object-cover" /> : mtn('#1a1714', '#3b342d')}
            </div>
          )
          return (
            <>
              <header data-name="Cover" id="top" className="relative w-full overflow-hidden" style={{ aspectRatio: '1.74 / 1', minHeight: 440, fontFamily: SF, color: '#fff', background: bg }}>
                <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&display=swap" />
                {shownHero.length === 0 ? <div data-name="Cover image" className="absolute inset-0">{mtn('#1e1a17', '#3b342d')}</div> : heroImg('absolute inset-0 h-full w-full')}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0) 30%, rgba(0,0,0,0.5) 62%, rgba(0,0,0,0.92))' }} />
                <div data-name="Menu bar" id="nav" className="absolute inset-x-0 top-0 flex flex-wrap items-center justify-between gap-3 px-6 py-6 md:px-10">
                  <a href={hrefs.home} data-name="Brand name" className="el-menu_brand" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(1.8rem, 3.4vw, 2.9rem)', lineHeight: 1.1, color: '#fff' }}>{brandText}</a>
                  <ul className="flex flex-wrap gap-x-5 gap-y-1 md:gap-x-9">
                    {navItems.map((n) => (
                      <li key={n.key}>
                        <a href={n.href} className="el-menu_links" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(12px, 1.5vw, 20px)', letterSpacing: '0.06em', color: t.menu.linkColor ?? '#fff' }}>{n.label}</a>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="absolute bottom-0 left-0 flex flex-col items-start px-6 pb-8 md:px-10 md:pb-11">
                  <h1 style={{ fontFamily: SF, fontWeight: 400, fontSize: 'clamp(2.1rem, 4.6vw, 4rem)', lineHeight: 1.05, whiteSpace: 'pre-line', color: '#f4efe8' }}>{heading}</h1>
                  <a data-name="Button" id="hero-btn" href={availHref} className="el-hero_btn mt-6 inline-block uppercase" style={{ fontFamily: SF, fontWeight: 600, fontSize: 'clamp(11px, 1.15vw, 15px)', letterSpacing: '0.22em', color: accent, border: `1.5px solid ${accent}`, padding: '14px 34px' }}>{btnTxt}</a>
                </div>
              </header>
              <section data-name="About" id="about-home" style={{ background: bg, color: ink, fontFamily: SF }}>
                <div className="grid items-center gap-8 md:grid-cols-[1fr_53%]" style={{ padding: '26px 5.4% 30px 5.6%' }}>
                  <div>
                    <p data-name="About label" className="el-air_label uppercase" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(1.2rem, 2.3vw, 2rem)', letterSpacing: '0.38em', color: accent }}>{labelTxt}</p>
                    <p className="el-about_text" style={{ fontFamily: SF, fontSize: 'clamp(15px, 1.7vw, 24px)', lineHeight: 1.45, marginTop: 14, whiteSpace: 'pre-line', opacity: 0.85 }}>{aboutTxt}</p>
                  </div>
                  <div className="relative w-full" style={{ aspectRatio: '2.52 / 1' }}>
                    {box(0, { left: 0, top: 0, width: '71%', height: '95%' })}
                    {box(1, { left: '57.7%', top: '27.8%', width: '42.3%', height: '72.2%' })}
                  </div>
                </div>
              </section>
            </>
          )
        })()}
        {page === 'home' && tpl === 'editorial' && String((r as any).site_settings?.look ?? '') === 'earthy' && (() => {
          const SF = "'Cormorant Garamond', 'Playfair Display', Georgia, serif"
          const SS = "'Jost', 'Helvetica Neue', Arial, sans-serif"
          const txt = (r as any).site_settings?.text ?? {}
          const heading = String((r as any).site_headline ?? '').trim() || 'Photography\nfor Every Chapter'
          const kicker = String(txt.ea_kicker ?? '').trim() || 'Portraits & life stories'
          const para = String(txt.ea_para ?? '').trim() || 'Honest, artful images that celebrate\nlove, family, and the beauty of real life.'
          const btnTxt = String(txt.hero_btn ?? '').trim() || 'Book a session'
          const followTxt = String(txt.ea_follow ?? '').trim() || 'Follow along'
          const mtn = (bgc: string, fgc: string) => (
            <div className="absolute inset-0" style={{ background: bgc }}>
              <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
                <circle cx="300" cy="58" r="16" fill={fgc} opacity="0.55" />
                <path d="M0 200 L105 82 L165 142 L238 62 L400 200 Z" fill={fgc} opacity="0.8" />
              </svg>
            </div>
          )
          const covers = realGalleries.map((g) => photoUrl((g.photos.find((x: any) => x.id === g.cover_photo_id) ?? g.photos[0])?.storage_path)).filter(Boolean) as string[]
          const rest = realGalleries.flatMap((g) => g.photos.map((x: any) => photoUrl(x?.storage_path))).filter(Boolean) as string[]
          const pics = Array.from(new Set([...covers, ...rest])).slice(0, 4)
          return (
            <>
              <header data-name="Cover" id="top" style={{ background: bg, color: ink }}>
                <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Jost:wght@400;500&display=swap" />
                <div data-name="Menu bar" id="nav" className="flex flex-wrap items-center justify-between gap-3 px-6 py-5 md:px-12" style={{ background: bg }}>
                  <a href={hrefs.home} data-name="Brand name" className="el-menu_brand" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(1.7rem, 3.2vw, 2.7rem)', lineHeight: 1.1, color: ink }}>{brandText}</a>
                  <ul className="flex flex-wrap gap-x-5 gap-y-1 md:gap-x-8">
                    {navItems.map((n) => (
                      <li key={n.key}>
                        <a href={n.href} className="el-menu_links uppercase" style={{ fontFamily: SS, fontWeight: 500, fontSize: 'clamp(10px, 1.05vw, 14px)', letterSpacing: '0.2em', color: t.menu.linkColor ?? ink }}>{n.label}</a>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="grid md:grid-cols-[43.4%_1fr]" style={{ minHeight: 'clamp(380px, 47vw, 720px)' }}>
                  <div className="flex flex-col justify-center" style={{ padding: '40px 6% 40px 5%', background: bg }}>
                    <p data-name="Small line" className="el-ea_kicker uppercase" style={{ fontFamily: SS, fontWeight: 500, fontSize: 'clamp(11px, 1.1vw, 15px)', letterSpacing: '0.26em', color: accent }}>{kicker}</p>
                    <h1 style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(2.1rem, 4.4vw, 3.9rem)', lineHeight: 1.1, margin: '20px 0 22px', whiteSpace: 'pre-line' }}>{heading}</h1>
                    <p data-name="Paragraph" className="el-ea_para" style={{ fontFamily: SF, fontSize: 'clamp(15px, 1.7vw, 22px)', lineHeight: 1.5, whiteSpace: 'pre-line', opacity: 0.8 }}>{para}</p>
                    <div><a data-name="Button" id="hero-btn" href={availHref} className="el-hero_btn mt-7 inline-block uppercase" style={{ fontFamily: SS, fontWeight: 500, fontSize: 'clamp(11px, 1.1vw, 15px)', letterSpacing: '0.22em', color: '#fff', background: accent, padding: '17px 36px' }}>{btnTxt}</a></div>
                  </div>
                  <div className="relative min-h-[300px]">
                    {shownHero.length === 0 ? <div data-name="Cover image" className="absolute inset-0">{mtn('#e6dfd5', '#c9bfb1')}</div> : heroImg('absolute inset-0 h-full w-full')}
                  </div>
                </div>
              </header>
              <section data-name="Follow along" id="follow" style={{ background: '#fff', color: ink }}>
                <div style={{ padding: '22px 4.6% 34px' }}>
                  <div className="flex items-center justify-center" style={{ gap: 'clamp(14px, 2.4vw, 36px)' }}>
                    <span style={{ display: 'block', width: 'clamp(50px, 13vw, 185px)', borderTop: '1px solid rgba(0,0,0,0.45)' }} />
                    <h2 data-name="Section title" className="el-ea_follow" style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 500, fontSize: 'clamp(1.3rem, 2.3vw, 2rem)', letterSpacing: '0.22em' }}>{followTxt}</h2>
                    <span style={{ display: 'block', width: 'clamp(50px, 13vw, 185px)', borderTop: '1px solid rgba(0,0,0,0.45)' }} />
                  </div>
                  <div className="mt-6 grid grid-cols-2 md:grid-cols-4" style={{ gap: 'clamp(10px, 2.3vw, 32px)' }}>
                    {[0, 1, 2, 3].map((k) => (
                      <div key={k} data-name={'Follow photo ' + (k + 1)} className="relative overflow-hidden" style={{ aspectRatio: '1.17 / 1', background: '#e6dfd5' }}>
                        {pics[k] ? <img src={pics[k]} alt="" className="absolute inset-0 h-full w-full object-cover" /> : mtn('#e6dfd5', '#c9bfb1')}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </>
          )
        })()}
        {page === 'home' && tpl === 'editorial' && !['moody', 'earthy'].includes(String((r as any).site_settings?.look ?? '')) && (() => {
          const SF = "'Cormorant Garamond', 'Playfair Display', Georgia, serif"
          const txt = (r as any).site_settings?.text ?? {}
          const heading = String((r as any).site_headline ?? '').trim() || 'Timeless Photography for Modern Love'
          const btnTxt = String(txt.hero_btn ?? '').trim() || 'Book your session'
          const lsTxt = String(txt.ls_title ?? '').trim() || 'Love Stories'
          const lsWords = lsTxt.split(' ')
          const lsLast = lsWords.length > 1 ? lsWords.pop() : null
          const lsFirst = lsWords.join(' ')
          const mtn = (bgc: string, fgc: string) => (
            <div className="absolute inset-0" style={{ background: bgc }}>
              <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
                <circle cx="300" cy="58" r="16" fill={fgc} opacity="0.55" />
                <path d="M0 200 L105 82 L165 142 L238 62 L400 200 Z" fill={fgc} opacity="0.8" />
              </svg>
            </div>
          )
          const covers = realGalleries.map((g) => photoUrl((g.photos.find((x: any) => x.id === g.cover_photo_id) ?? g.photos[0])?.storage_path)).filter(Boolean) as string[]
          const rest = realGalleries.flatMap((g) => g.photos.map((x: any) => photoUrl(x?.storage_path))).filter(Boolean) as string[]
          const pics = Array.from(new Set([...covers, ...rest])).slice(0, 3)
          return (
            <>
              <header data-name="Cover" id="top" className="relative w-full overflow-hidden" style={{ aspectRatio: '1.8 / 1', minHeight: 420, fontFamily: SF, color: '#fff', background: '#2a2522' }}>
                <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&display=swap" />
                {shownHero.length === 0 ? <div data-name="Cover image" className="absolute inset-0">{mtn('#3a3430', '#5b524a')}</div> : heroImg('absolute inset-0 h-full w-full')}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(rgba(0,0,0,0.28), rgba(0,0,0,0) 32%, rgba(0,0,0,0.68))' }} />
                <div data-name="Menu bar" id="nav" className="absolute inset-x-0 top-0 flex flex-wrap items-center justify-between gap-3 px-6 py-6 md:px-10">
                  <a href={hrefs.home} data-name="Brand name" className="el-menu_brand" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(1.7rem, 3.2vw, 2.7rem)', lineHeight: 1.1, color: '#fff' }}>{brandText}</a>
                  <ul className="flex flex-wrap gap-x-5 gap-y-1 md:gap-x-7">
                    {navItems.map((n) => (
                      <li key={n.key}>
                        <a href={n.href} className="el-menu_links uppercase" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(10px, 1.1vw, 13px)', letterSpacing: '0.22em', color: t.menu.linkColor ?? '#fff' }}>{n.label}</a>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="absolute bottom-0 left-0 flex flex-col items-start px-6 pb-10 md:px-10 md:pb-14">
                  <h1 style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(2rem, 4.4vw, 3.8rem)', lineHeight: 1.05, maxWidth: 'clamp(280px, 42vw, 640px)' }}>{heading}</h1>
                  <a data-name="Button" id="hero-btn" href={availHref} className="el-hero_btn mt-6 inline-block uppercase" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(11px, 1.05vw, 13px)', letterSpacing: '0.2em', color: '#fff', border: '1px solid #fff', padding: '14px 26px' }}>{btnTxt}</a>
                </div>
              </header>
              <section data-name="Love Stories" id="stories" style={{ background: bg, color: ink, fontFamily: SF }}>
                <div className="w-full pb-8 pt-5" style={{ padding: '20px 4.4% 30px' }}>
                  <h2 data-name="Stories title" className="el-ls_title text-center" style={{ fontFamily: SF, fontWeight: 400, fontSize: 'clamp(1.8rem, 3vw, 2.7rem)', lineHeight: 1.15, marginBottom: 18 }}>{lsFirst}{lsLast ? <> <em>{lsLast}</em></> : null}</h2>
                  <div className="grid grid-cols-3" style={{ gap: 'clamp(8px, 1.3vw, 18px)' }}>
                    {[0, 1, 2].map((k) => (
                      <div key={k} data-name={'Story photo ' + (k + 1)} className="relative overflow-hidden" style={{ aspectRatio: '1.9 / 1', background: '#e6dfd5' }}>
                        {pics[k] ? <img src={pics[k]} alt="" className="absolute inset-0 h-full w-full object-cover" /> : mtn('#e6dfd5', '#c9bfb1')}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </>
          )
        })()}
        {page === 'home' && tpl === 'split' && (() => {
          const SF = "'Cormorant Garamond', 'Playfair Display', Georgia, serif"
          const txt = (r as any).site_settings?.text ?? {}
          const heading = String((r as any).site_headline ?? '').trim() || 'Meaningful\nPhotography'
          const kicker = String(txt.ea_kicker ?? '').trim() || 'Weddings & portraits'
          const para = String(txt.ea_para ?? '').trim() || "Honest, natural imagery for life's\nbiggest moments and everything\nin between."
          const btnTxt = String(txt.hero_btn ?? '').trim() || 'Book a session'
          const followTxt = String(txt.ea_follow ?? '').trim() || 'Follow along'
          const mtn = (bgc: string, fgc: string) => (
            <div className="absolute inset-0" style={{ background: bgc }}>
              <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
                <circle cx="300" cy="58" r="16" fill={fgc} opacity="0.55" />
                <path d="M0 200 L105 82 L165 142 L238 62 L400 200 Z" fill={fgc} opacity="0.8" />
              </svg>
            </div>
          )
          const covers = realGalleries.map((g) => photoUrl((g.photos.find((x: any) => x.id === g.cover_photo_id) ?? g.photos[0])?.storage_path)).filter(Boolean) as string[]
          const rest = realGalleries.flatMap((g) => g.photos.map((x: any) => photoUrl(x?.storage_path))).filter(Boolean) as string[]
          const pics = Array.from(new Set([...covers, ...rest])).slice(0, 4)
          return (
            <>
              <header data-name="Cover" id="top" style={{ background: bg, color: ink, fontFamily: SF }}>
                <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&display=swap" />
                <div data-name="Menu bar" id="nav" className="flex flex-wrap items-center justify-between gap-3 px-6 py-5 md:px-12" style={{ background: bg }}>
                  <a href={hrefs.home} data-name="Brand name" className="el-menu_brand" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(1.7rem, 3.2vw, 2.7rem)', lineHeight: 1.1, color: ink }}>{brandText}</a>
                  <ul className="flex flex-wrap gap-x-5 gap-y-1 md:gap-x-8">
                    {navItems.map((n) => (
                      <li key={n.key}>
                        <a href={n.href} className="el-menu_links uppercase" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(11px, 1.1vw, 15px)', letterSpacing: '0.16em', color: t.menu.linkColor ?? ink }}>{n.label}</a>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="grid md:grid-cols-[43.8%_1fr]" style={{ minHeight: 'clamp(380px, 45vw, 680px)' }}>
                  <div className="flex flex-col justify-center" style={{ padding: '40px 6% 40px 5%', background: bg }}>
                    <p data-name="Small line" className="el-ea_kicker uppercase" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(12px, 1.2vw, 17px)', letterSpacing: '0.26em', color: accent }}>{kicker}</p>
                    <h1 style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(2.4rem, 5.2vw, 4.6rem)', lineHeight: 1.05, margin: '18px 0 22px', whiteSpace: 'pre-line' }}>{heading}</h1>
                    <p data-name="Paragraph" className="el-ea_para" style={{ fontFamily: SF, fontSize: 'clamp(15px, 1.75vw, 24px)', lineHeight: 1.45, whiteSpace: 'pre-line', opacity: 0.75 }}>{para}</p>
                    <div><a data-name="Button" id="hero-btn" href={availHref} className="el-hero_btn mt-8 inline-block uppercase" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(12px, 1.2vw, 17px)', letterSpacing: '0.2em', color: '#fff', background: accent, padding: '17px 36px' }}>{btnTxt}</a></div>
                  </div>
                  <div className="relative min-h-[300px]">
                    {shownHero.length === 0 ? <div data-name="Cover image" className="absolute inset-0">{mtn('#e6dfd5', '#c9bfb1')}</div> : heroImg('absolute inset-0 h-full w-full')}
                  </div>
                </div>
              </header>
              <section data-name="Follow along" id="follow" style={{ background: '#fff', color: ink }}>
                <div style={{ padding: '22px 4.8% 34px' }}>
                  <div className="flex items-center justify-center" style={{ gap: 'clamp(14px, 2.4vw, 36px)' }}>
                    <span style={{ display: 'block', width: 'clamp(50px, 17vw, 240px)', borderTop: '1px solid rgba(0,0,0,0.25)' }} />
                    <h2 data-name="Section title" className="el-ea_follow" style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 500, fontSize: 'clamp(1.4rem, 2.6vw, 2.3rem)' }}>{followTxt}</h2>
                    <span style={{ display: 'block', width: 'clamp(50px, 17vw, 240px)', borderTop: '1px solid rgba(0,0,0,0.25)' }} />
                  </div>
                  <div className="mt-6 grid grid-cols-2 md:grid-cols-4" style={{ gap: 'clamp(10px, 2vw, 28px)' }}>
                    {[0, 1, 2, 3].map((k) => (
                      <div key={k} data-name={'Follow photo ' + (k + 1)} className="relative overflow-hidden" style={{ aspectRatio: '1.16 / 1', background: '#e6dfd5' }}>
                        {pics[k] ? <img src={pics[k]} alt="" className="absolute inset-0 h-full w-full object-cover" /> : mtn('#e6dfd5', '#c9bfb1')}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </>
          )
        })()}
        {page === 'home' && tpl === 'minimal' && (() => {
          const SC = "'Pinyon Script', 'Great Vibes', cursive"
          const SF = "'Cormorant Garamond', 'Playfair Display', Georgia, serif"
          const txt = (r as any).site_settings?.text ?? {}
          const heading = String((r as any).site_headline ?? '').trim() || "Hello, I'm Avery"
          const aboutTxt = String(t.text.about ?? '').trim() || 'A wedding and portrait photographer, capturing real moments and genuine connection.'
          const labelTxt = String(txt.air_label ?? '').trim() || 'About'
          const moreTxt = String(txt.air_more ?? '').trim() || 'Read more'
          const aboutImg = photoUrl((r as any).site_settings?.about?.photo ?? null)
          const mtn = (bgc: string, fgc: string) => (
            <div className="absolute inset-0" style={{ background: bgc }}>
              <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
                <circle cx="300" cy="58" r="16" fill={fgc} opacity="0.55" />
                <path d="M0 200 L105 82 L165 142 L238 62 L400 200 Z" fill={fgc} opacity="0.8" />
              </svg>
            </div>
          )
          return (
            <header data-name="Cover" id="top" style={{ background: '#fff', color: '#1a1a1a', fontFamily: SF }}>
              <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Pinyon+Script&family=Cormorant+Garamond:wght@400;500;600&display=swap" />
              <div data-name="Menu bar" id="nav" className="flex flex-col items-center px-6 pb-5 pt-6">
                <a href={hrefs.home} data-name="Brand name" className="el-menu_brand" style={{ fontFamily: SC, fontWeight: 400, fontSize: 'clamp(2.6rem, 5vw, 4rem)', lineHeight: 1.1, color: '#1a1a1a' }}>{brandText}</a>
                <span style={{ display: 'block', width: 68, borderTop: '1px solid #1a1a1a', marginTop: 8 }} />
                <ul className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 md:gap-x-10">
                  {navItems.map((n) => (
                    <li key={n.key}>
                      <a href={n.href} className="el-menu_links" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(11px, 1.3vw, 15px)', letterSpacing: '0.28em', color: t.menu.linkColor ?? '#1a1a1a' }}>{n.label}</a>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mx-auto w-full px-6" style={{ maxWidth: 1120 }}>
                <div className="relative w-full overflow-hidden" style={{ aspectRatio: '2.3 / 1', minHeight: 200 }}>
                  {shownHero.length === 0 ? <div data-name="Cover image" className="absolute inset-0">{mtn('#ece8e1', '#cdc7bd')}</div> : heroImg('absolute inset-0 h-full w-full')}
                </div>
                <div className="grid items-center gap-6 py-10 md:grid-cols-[34%_1fr] md:gap-8">
                  <div data-name="About photo" className="relative w-full overflow-hidden" style={{ aspectRatio: '1.85 / 1', background: '#ece8e1' }}>
                    {aboutImg ? <img src={aboutImg} alt="" className="absolute inset-0 h-full w-full object-cover" /> : mtn('#ece8e1', '#cdc7bd')}
                  </div>
                  <div>
                    <p data-name="About label" className="el-air_label uppercase" style={{ fontFamily: SF, fontSize: 11, letterSpacing: '0.3em' }}>{labelTxt}</p>
                    <h1 style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(1.8rem, 3.2vw, 2.6rem)', lineHeight: 1.15, marginTop: 8 }}>{heading}</h1>
                    <p className="el-about_text" style={{ fontFamily: SF, fontSize: 14, lineHeight: 1.7, color: '#333', marginTop: 10 }}>{aboutTxt}</p>
                    <a href={hrefs.about} data-name="Link" className="el-air_more inline-block" style={{ fontFamily: SF, fontSize: 15, borderBottom: '1px solid currentColor', paddingBottom: 2, marginTop: 12 }}>{moreTxt}</a>
                  </div>
                </div>
              </div>
            </header>
          )
        })()}
        {page === 'home' && tpl === 'framed' && (() => {
          const SF = "'Cormorant Garamond', 'Playfair Display', Georgia, serif"
          const SC = "'Pinyon Script', 'Great Vibes', cursive"
          const txt = (r as any).site_settings?.text ?? {}
          const heading = String((r as any).site_headline ?? '').trim() || 'Capturing Your\nMost Meaningful Moments'
          const kicker = String(txt.rom_kicker ?? '').trim() || 'Wedding & portrait photography'
          const btnTxt = String(txt.hero_btn ?? '').trim() || 'Book your session'
          const storyTxt = String(txt.rom_story ?? '').trim() || 'Our Story'
          const moreTxt = String(txt.rom_more ?? '').trim() || 'Learn more'
          const aboutTxt = String(t.text.about ?? '').trim() || 'A love for people, real connection, and the beauty in everyday moments.'
          const aboutImg = photoUrl((r as any).site_settings?.about?.photo ?? null)
          const cardBg = t.hero.cardBg ?? bg
          const mtn = (bgc: string, fgc: string) => (
            <div className="absolute inset-0" style={{ background: bgc }}>
              <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
                <circle cx="300" cy="58" r="16" fill={fgc} opacity="0.55" />
                <path d="M0 200 L105 82 L165 142 L238 62 L400 200 Z" fill={fgc} opacity="0.8" />
              </svg>
            </div>
          )
          return (
            <>
              <header data-name="Cover" id="top" className="relative w-full overflow-hidden" style={{ aspectRatio: '1.8 / 1', minHeight: 520, fontFamily: SF, color: '#fff', background: '#b98c88' }}>
                <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Pinyon+Script&display=swap" />
                {shownHero.length === 0 ? <div data-name="Cover image" className="absolute inset-0">{mtn('#c99a97', '#a9736f')}</div> : heroImg('absolute inset-0 h-full w-full')}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(rgba(0,0,0,0.18), rgba(0,0,0,0) 30%)' }} />
                <div data-name="Menu bar" id="nav" className="absolute inset-x-0 top-0 flex flex-wrap items-center justify-between gap-3 px-6 py-5 md:px-12">
                  <a href={hrefs.home} data-name="Brand name" className="el-menu_brand" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(1.7rem, 3.2vw, 2.7rem)', lineHeight: 1.1, color: '#fff' }}>{brandText}</a>
                  <ul className="flex flex-wrap gap-x-5 gap-y-1 md:gap-x-7">
                    {navItems.map((n) => (
                      <li key={n.key}>
                        <a href={n.href} className="el-menu_links uppercase" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(10px, 1.1vw, 14px)', letterSpacing: '0.18em', color: t.menu.linkColor ?? '#fff' }}>{n.label}</a>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="absolute left-1/2 w-[92%] -translate-x-1/2" style={{ bottom: '9%', maxWidth: 690, background: cardBg, padding: 14, color: ink }}>
                  <div className="text-center" style={{ border: `1px solid color-mix(in srgb, ${accent} 70%, transparent)`, padding: '34px 24px 30px' }}>
                    <p data-name="Small line" className="el-rom_kicker uppercase" style={{ fontFamily: SF, fontSize: 'clamp(10px, 1.1vw, 13px)', letterSpacing: '0.3em' }}>{kicker}</p>
                    <h1 style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(1.7rem, 3.6vw, 3.1rem)', lineHeight: 1.1, margin: '14px 0 24px', whiteSpace: 'pre-line' }}>{heading}</h1>
                    <a data-name="Button" id="hero-btn" href={availHref} className="el-hero_btn inline-block uppercase" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(11px, 1.05vw, 14px)', letterSpacing: '0.22em', color: '#fff', background: accent, borderRadius: 9999, padding: '13px 38px' }}>{btnTxt}</a>
                  </div>
                </div>
              </header>
              <section data-name="Our Story" id="story" style={{ background: bg, color: ink, fontFamily: SF }}>
                <div className="grid items-center gap-8 md:grid-cols-[34%_1fr] md:gap-[7%]" style={{ padding: '26px 7% 34px' }}>
                  <div data-name="Story photo" className="relative w-full overflow-hidden" style={{ aspectRatio: '1.12 / 1', borderRadius: '9999px 9999px 0 0', background: '#e8cfca' }}>
                    {aboutImg ? <img src={aboutImg} alt="" className="absolute inset-0 h-full w-full object-cover" /> : mtn('#e8cfca', '#c9a29c')}
                  </div>
                  <div>
                    <h2 data-name="Story title" className="el-rom_story" style={{ fontFamily: SC, fontWeight: 400, fontSize: 'clamp(3rem, 6vw, 5.4rem)', lineHeight: 1.05, color: accent }}>{storyTxt}</h2>
                    <p className="el-about_text" style={{ fontFamily: SF, fontSize: 'clamp(15px, 1.6vw, 22px)', lineHeight: 1.5, margin: '10px 0 22px' }}>{aboutTxt}</p>
                    <a data-name="Link" href={hrefs.about} className="el-rom_more inline-block uppercase" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(11px, 1.05vw, 14px)', letterSpacing: '0.22em', color: '#fff', background: accent, borderRadius: 9999, padding: '13px 38px' }}>{moreTxt}</a>
                  </div>
                </div>
              </section>
            </>
          )
        })()}
        {page === 'home' && (tpl === 'magazine' || tpl === 'mosaic') && (() => {
          const PF = "'Poppins', 'Helvetica Neue', Arial, sans-serif"
          const brandTxt = brandText
          const hl = String((r as any).site_headline ?? '').trim() || (tpl === 'mosaic' ? 'Real moments,\nTimeless Photography' : 'Authentic moments. Timeless photography.')
          const hlLines = hl.replace(/([.!?])\s+/g, '$1\n').split('\n')
          const rawCta = String((t.hero as any).heroCtaText ?? '').trim()
          const ctaLabel = rawCta && rawCta.toLowerCase() !== 'check availability' ? rawCta : 'Book a session'
          const mtn = (bgc: string, fgc: string) => (
            <div className="absolute inset-0" style={{ background: bgc }}>
              <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
                <circle cx="300" cy="58" r="16" fill={fgc} opacity="0.55" />
                <path d="M0 200 L105 82 L165 142 L238 62 L400 200 Z" fill={fgc} opacity="0.8" />
              </svg>
            </div>
          )
          const covers = realGalleries.map((g) => photoUrl((g.photos.find((x: any) => x.id === g.cover_photo_id) ?? g.photos[0])?.storage_path)).filter(Boolean) as string[]
          const rest = realGalleries.flatMap((g) => g.photos.map((x: any) => photoUrl(x?.storage_path))).filter(Boolean) as string[]
          const pics = Array.from(new Set([...covers, ...rest])).slice(0, 3)
          return (
            <>
              <header data-name="Cover" id="top" style={{ fontFamily: PF, background: '#fff', color: '#000' }}>
                <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700;800&display=swap" />
                <div data-name="Menu bar" id="nav" className="flex w-full items-center justify-between px-8 py-5">
                  <a href={hrefs.home} data-name="Brand name" className="el-menu_brand" style={{ fontFamily: PF, fontWeight: 800, fontSize: 26, letterSpacing: '-0.02em', color: '#000' }}>{brandTxt}</a>
                  <ul className="hidden gap-7 md:flex">
                    {navItems.map((n) => (
                      <li key={n.key}>
                        <a href={n.href} className="el-menu_links uppercase" style={{ fontFamily: PF, fontWeight: 700, fontSize: 12, letterSpacing: '0.04em', color: t.menu.linkColor ?? '#000' }}>{n.label}</a>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="w-full px-8 pb-6 pt-2">
                  <h1 data-name="Headline" style={{ fontFamily: PF, fontWeight: 800, textTransform: 'uppercase', fontSize: 'clamp(1.9rem, 4.6vw, 4.2rem)', lineHeight: 1.02, letterSpacing: '-0.02em', textAlign: (((r as any).site_settings?.hero?.align ?? 'left') as 'left' | 'center' | 'right') }}>
                    {hlLines.map((l, k) => <span key={k} className="block">{l}</span>)}
                  </h1>
                </div>
                <div className="relative w-full overflow-hidden" style={{ aspectRatio: '2.9 / 1', minHeight: 240 }}>
                  {shownHero.length === 0 ? <div data-name="Cover image" className="absolute inset-0">{mtn('#d8d3cb', '#a9a299')}</div> : heroImg('absolute inset-0 h-full w-full')}
                  <a data-name="Button" id="hero-btn" href={availHref} className="el-hero_btn absolute bottom-6 left-6 uppercase" style={{ background: '#000', color: '#fff', fontFamily: PF, fontWeight: 700, fontSize: 11, letterSpacing: '0.16em', padding: '14px 26px' }}>{String((r as any).site_settings?.text?.hero_btn ?? '').trim() || ctaLabel}</a>
                </div>
              </header>
              <section data-name="Featured work" id="featured" style={{ background: '#000', color: '#fff', fontFamily: PF }}>
                <div className="w-full px-8 pb-7 pt-5">
                  <h2 data-name="Featured work title" className="el-feat_title uppercase" style={{ fontFamily: PF, fontWeight: 600, fontSize: 'clamp(0.8rem, 1.15vw, 1.1rem)', letterSpacing: '0.16em', marginBottom: 12 }}>{String((r as any).site_settings?.text?.feat_title ?? '').trim() || 'Featured work'}</h2>
                  <div className="grid grid-cols-3 gap-1">
                    {[0, 1, 2].map((k) => (
                      <div key={k} data-name={'Featured photo ' + (k + 1)} className="relative overflow-hidden" style={{ aspectRatio: '1.85 / 1', background: '#222' }}>
                        {pics[k] ? <img src={pics[k]} alt="" className="absolute inset-0 h-full w-full object-cover" /> : mtn('#2b2b2b', '#4a4a4a')}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </>
          )
        })()}
        {page === 'home' && tpl === 'peony' && (() => {
          const SF = "'Cormorant Garamond', 'Playfair Display', Georgia, serif"
          const SC = "'Mrs Saint Delafield', 'Pinyon Script', cursive"
          const txt = (r as any).site_settings?.text ?? {}
          const heading = String((r as any).site_headline ?? '').trim() || 'Capturing love stories'
          const btnTxt = String(txt.hero_btn ?? '').trim() || 'Book your session'
          const tagTxt = String(txt.pe_tag ?? '').trim() || 'Capturing love stories with honesty, emotion, and timeless beauty.'
          const mtn = (bgc: string, fgc: string) => (
            <div className="absolute inset-0" style={{ background: bgc }}>
              <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
                <circle cx="300" cy="58" r="16" fill={fgc} opacity="0.55" />
                <path d="M0 200 L105 82 L165 142 L238 62 L400 200 Z" fill={fgc} opacity="0.8" />
              </svg>
            </div>
          )
          const covers = realGalleries.map((g) => photoUrl((g.photos.find((x: any) => x.id === g.cover_photo_id) ?? g.photos[0])?.storage_path)).filter(Boolean) as string[]
          const rest = realGalleries.flatMap((g) => g.photos.map((x: any) => photoUrl(x?.storage_path))).filter(Boolean) as string[]
          const pics = Array.from(new Set([...covers, ...rest])).slice(0, 3)
          const tile = (k: number, st: React.CSSProperties) => (
            <div key={k} data-name={'Photo ' + (k + 1)} className="relative overflow-hidden" style={{ background: '#ead9d0', ...st }}>
              {pics[k] ? <img src={pics[k]} alt="" className="absolute inset-0 h-full w-full object-cover" /> : mtn('#ead9d0', '#cdb3a8')}
            </div>
          )
          return (
            <>
              <header data-name="Cover" id="top" className="relative w-full overflow-hidden" style={{ aspectRatio: '1.93 / 1', minHeight: 420, fontFamily: SF, color: ink, background: '#ead3c9' }}>
                <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Mrs+Saint+Delafield&family=Pinyon+Script&display=swap" />
                {shownHero.length === 0 ? <div data-name="Cover image" className="absolute inset-0">{mtn('#ead3c9', '#d3b3a6')}</div> : heroImg('absolute inset-0 h-full w-full')}
                <h1 className="sr-only">{heading}</h1>
                <div data-name="Menu bar" id="nav" className="absolute inset-x-0 top-0 flex flex-col items-center px-6 pt-2">
                  <a href={hrefs.home} data-name="Brand name" className="el-menu_brand" style={{ fontFamily: SC, fontWeight: 400, fontSize: 'clamp(3rem, 6.4vw, 5.6rem)', lineHeight: 1.05, color: `color-mix(in srgb, ${accent} 55%, #3a1f1c)` }}>{brandText}</a>
                  <ul className="mt-1 flex flex-wrap justify-center" style={{ gap: '6px clamp(18px, 4vw, 56px)' }}>
                    {navItems.map((n) => (
                      <li key={n.key}>
                        <a href={n.href} className="el-menu_links uppercase" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(10px, 1.05vw, 14px)', letterSpacing: '0.22em', color: t.menu.linkColor ?? ink }}>{n.label}</a>
                      </li>
                    ))}
                  </ul>
                </div>
                <a data-name="Button" id="hero-btn" href={availHref} className="el-hero_btn absolute left-1/2 -translate-x-1/2 uppercase" style={{ bottom: '4.8%', fontFamily: SF, fontWeight: 500, fontSize: 'clamp(11px, 1.3vw, 17px)', letterSpacing: '0.2em', color: '#fff', background: `color-mix(in srgb, ${accent} 85%, #5a2f2a)`, opacity: 0.92, padding: '14px 40px' }}>{btnTxt}</a>
              </header>
              <section data-name="Photos" id="photos" style={{ background: '#fff', color: ink, fontFamily: SF }}>
                <p data-name="Tagline" className="el-pe_tag text-center" style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 500, fontSize: 'clamp(1.1rem, 2vw, 1.8rem)', letterSpacing: '0.1em', padding: '20px 6% 18px' }}>{tagTxt}</p>
                <div className="grid items-start" style={{ gridTemplateColumns: '1.09fr 1fr 1.09fr', gap: 'clamp(10px, 1.9vw, 27px)', padding: '0 7% 26px' }}>
                  {tile(0, { aspectRatio: '1.44 / 1' })}
                  {tile(1, { aspectRatio: '1.33 / 1', marginTop: 'clamp(6px, 1.3vw, 18px)' })}
                  {tile(2, { aspectRatio: '1.44 / 1' })}
                </div>
              </section>
            </>
          )
        })()}
        {page === 'home' && tpl === 'ivy' && (() => {
          const SF = "'Cormorant Garamond', 'Playfair Display', Georgia, serif"
          const txt = (r as any).site_settings?.text ?? {}
          const heading = String((r as any).site_headline ?? '').trim() || 'Timeless Wedding\nPhotography'
          const kicker = String(txt.iv_kicker ?? '').trim() || 'for the modern romantic'
          const tag = String(txt.iv_tag ?? '').trim() || 'Authentic · Emotional · Elegant'
          const mtn = (bgc: string, fgc: string) => (
            <div className="absolute inset-0" style={{ background: bgc }}>
              <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
                <circle cx="300" cy="58" r="16" fill={fgc} opacity="0.55" />
                <path d="M0 200 L105 82 L165 142 L238 62 L400 200 Z" fill={fgc} opacity="0.8" />
              </svg>
            </div>
          )
          const covers = realGalleries.map((g) => photoUrl((g.photos.find((x: any) => x.id === g.cover_photo_id) ?? g.photos[0])?.storage_path)).filter(Boolean) as string[]
          const rest = realGalleries.flatMap((g) => g.photos.map((x: any) => photoUrl(x?.storage_path))).filter(Boolean) as string[]
          const pics = Array.from(new Set([...covers, ...rest])).slice(0, 3)
          return (
            <>
              <header data-name="Cover" id="top" style={{ background: bg, color: ink, fontFamily: SF }}>
                <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&display=swap" />
                <div data-name="Menu bar" id="nav" className="flex flex-col items-center px-6 pb-7 pt-3">
                  <a href={hrefs.home} data-name="Brand name" className="el-menu_brand" style={{ fontFamily: SF, fontWeight: 400, fontSize: 'clamp(2.4rem, 4.8vw, 4rem)', lineHeight: 1.1, color: ink }}>{brandText}</a>
                  <ul className="mt-5 flex flex-wrap justify-center" style={{ gap: '6px clamp(18px, 4vw, 56px)' }}>
                    {navItems.map((n) => (
                      <li key={n.key}>
                        <a href={n.href} className="el-menu_links uppercase" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(10px, 1.1vw, 15px)', letterSpacing: '0.22em', color: t.menu.linkColor ?? ink }}>{n.label}</a>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="grid grid-cols-3" style={{ gap: 2 }}>
                  {[0, 1, 2].map((k) => (
                    <div key={k} data-name={'Photo ' + (k + 1)} className="relative overflow-hidden" style={{ aspectRatio: '0.745 / 1', background: '#ece7e1' }}>
                      {pics[k] ? <img src={pics[k]} alt="" className="absolute inset-0 h-full w-full object-cover" /> : mtn('#ece7e1', '#cfc7bd')}
                    </div>
                  ))}
                </div>
                <div className="flex flex-col items-center px-6 text-center" style={{ padding: '30px 6% 36px' }}>
                  <div className="flex items-center justify-center" style={{ gap: 'clamp(14px, 2.4vw, 36px)' }}>
                    <span style={{ display: 'block', width: 'clamp(50px, 11.4vw, 160px)', borderTop: '1px solid currentColor' }} />
                    <p data-name="Small line" className="el-iv_kicker" style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 500, fontSize: 'clamp(1rem, 1.8vw, 1.6rem)', letterSpacing: '0.22em' }}>{kicker}</p>
                    <span style={{ display: 'block', width: 'clamp(50px, 11.4vw, 160px)', borderTop: '1px solid currentColor' }} />
                  </div>
                  <h1 className="uppercase" style={{ fontFamily: SF, fontWeight: 400, fontSize: 'clamp(1.8rem, 4.2vw, 3.6rem)', lineHeight: 1.18, letterSpacing: '0.16em', margin: '18px 0 20px', whiteSpace: 'pre-line' }}>{heading}</h1>
                  <p data-name="Tagline" className="el-iv_tag uppercase" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(9px, 1.05vw, 14px)', letterSpacing: '0.5em' }}>{tag}</p>
                </div>
              </header>
            </>
          )
        })()}
        {page === 'home' && tpl === 'wisteria' && (() => {
          const SF = "'Cormorant Garamond', 'Playfair Display', Georgia, serif"
          const SC = "'Great Vibes', 'Pinyon Script', cursive"
          const txt = (r as any).site_settings?.text ?? {}
          const heading = String((r as any).site_headline ?? '').trim() || 'For families who love\nevery little moment'
          const hiTxt = String(txt.wi_hi ?? '').trim() || "Hi, I'm Wisteria"
          const aboutTxt = String(t.text.about ?? '').trim() || 'A photographer passionate about capturing the real, everyday beauty of family life.'
          const aboutImg = photoUrl((r as any).site_settings?.about?.photo ?? null)
          const mtn = (bgc: string, fgc: string) => (
            <div className="absolute inset-0" style={{ background: bgc }}>
              <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
                <circle cx="300" cy="58" r="16" fill={fgc} opacity="0.55" />
                <path d="M0 200 L105 82 L165 142 L238 62 L400 200 Z" fill={fgc} opacity="0.8" />
              </svg>
            </div>
          )
          return (
            <>
              <header data-name="Cover" id="top" style={{ background: bg, color: ink, fontFamily: SF }}>
                <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Great+Vibes&display=swap" />
                <div data-name="Menu bar" id="nav" className="flex flex-col items-center px-6 pb-5 pt-2">
                  <a href={hrefs.home} data-name="Brand name" className="el-menu_brand" style={{ fontFamily: SC, fontWeight: 400, fontSize: 'clamp(3rem, 6.8vw, 6rem)', lineHeight: 1.1, color: ink }}>{brandText}</a>
                  <ul className="mt-1 flex flex-wrap justify-center" style={{ gap: '6px clamp(18px, 4.2vw, 60px)' }}>
                    {navItems.map((n) => (
                      <li key={n.key}>
                        <a href={n.href} className="el-menu_links uppercase" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(10px, 1.1vw, 15px)', letterSpacing: '0.22em', color: t.menu.linkColor ?? ink }}>{n.label}</a>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="relative mx-auto overflow-hidden" style={{ width: '77.4%', aspectRatio: '2.52 / 1', background: '#d9c9df' }}>
                  {shownHero.length === 0 ? <div data-name="Cover image" className="absolute inset-0">{mtn('#d9c9df', '#b79fc0')}</div> : heroImg('absolute inset-0 h-full w-full')}
                </div>
                <h1 className="text-center" style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 500, fontSize: 'clamp(2rem, 4.4vw, 3.8rem)', lineHeight: 1.08, padding: '14px 6% 30px', whiteSpace: 'pre-line' }}>{heading}</h1>
              </header>
              <section data-name="About" id="about-home" style={{ background: '#fff', color: ink, fontFamily: SF }}>
                <div className="grid items-center gap-6 md:grid-cols-[36.7%_1fr] md:gap-[4.5%]" style={{ padding: '34px 5.7%' }}>
                  <div data-name="About photo" className="relative w-full overflow-hidden" style={{ aspectRatio: '1.94 / 1', background: '#ece3ef' }}>
                    {aboutImg ? <img src={aboutImg} alt="" className="absolute inset-0 h-full w-full object-cover" /> : mtn('#ece3ef', '#c9b7d0')}
                  </div>
                  <div>
                    <h2 data-name="About heading" className="el-wi_hi" style={{ fontFamily: SF, fontWeight: 400, fontSize: 'clamp(2rem, 3.9vw, 3.4rem)', lineHeight: 1.1 }}>{hiTxt}</h2>
                    <p className="el-about_text" style={{ fontFamily: SF, fontSize: 'clamp(15px, 1.85vw, 26px)', lineHeight: 1.5, marginTop: 10, color: '#555' }}>{aboutTxt}</p>
                  </div>
                </div>
              </section>
            </>
          )
        })()}
        {page === 'home' && tpl === 'juniper' && (() => {
          const SF = "'Lora', 'Libre Baskerville', Georgia, serif"
          const txt = (r as any).site_settings?.text ?? {}
          const heading = String((r as any).site_headline ?? '').trim() || 'Juniper Reed'
          const kicker = String(txt.ju_kicker ?? '').trim() || 'Couples and portrait photography'
          const para = String(txt.ju_para ?? '').trim() || 'Thoughtful, natural photography for couples and individuals,\ncapturing connection, season, and the beauty in everyday moments.'
          const linkTxt = String(txt.hero_btn ?? '').trim() || 'Connect now'
          const svc = [
            [String(txt.ju_s1t ?? '').trim() || 'Weddings', String(txt.ju_s1d ?? '').trim() || 'Honest, timeless coverage of your wedding day, from quiet moments to the biggest celebrations.'],
            [String(txt.ju_s2t ?? '').trim() || 'Portraits', String(txt.ju_s2d ?? '').trim() || 'Natural, personality-filled portraits that feel like you.'],
            [String(txt.ju_s3t ?? '').trim() || 'Maternity', String(txt.ju_s3d ?? '').trim() || 'Warm, simple maternity sessions that honor this meaningful season.'],
          ]
          const mtn = (bgc: string, fgc: string) => (
            <div className="absolute inset-0" style={{ background: bgc }}>
              <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
                <circle cx="300" cy="58" r="16" fill={fgc} opacity="0.55" />
                <path d="M0 200 L105 82 L165 142 L238 62 L400 200 Z" fill={fgc} opacity="0.8" />
              </svg>
            </div>
          )
          const covers = realGalleries.map((g) => photoUrl((g.photos.find((x: any) => x.id === g.cover_photo_id) ?? g.photos[0])?.storage_path)).filter(Boolean) as string[]
          const rest = realGalleries.flatMap((g) => g.photos.map((x: any) => photoUrl(x?.storage_path))).filter(Boolean) as string[]
          const pics = Array.from(new Set([...covers, ...rest])).slice(0, 2)
          const mid = Math.ceil(navItems.length / 2)
          const lk = (n: any) => (
            <a key={n.key} href={n.href} className="el-menu_links uppercase" style={{ fontFamily: SF, fontWeight: 600, fontSize: 'clamp(10px, 1.05vw, 15px)', letterSpacing: '0.2em', color: t.menu.linkColor ?? accent }}>{n.label}</a>
          )
          return (
            <>
              <header data-name="Cover" id="top" style={{ background: bg, color: ink, fontFamily: SF }}>
                <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&display=swap" />
                <div data-name="Menu bar" id="nav" className="grid items-center gap-3" style={{ gridTemplateColumns: '1fr auto 1fr', padding: '22px 4.8% 18px' }}>
                  <div className="flex flex-wrap" style={{ gap: '4px clamp(14px, 2.2vw, 32px)' }}>{navItems.slice(0, mid).map(lk)}</div>
                  <a href={hrefs.home} data-name="Brand name" className="el-menu_brand uppercase" style={{ fontFamily: SF, fontWeight: 700, fontSize: 'clamp(1.2rem, 2.4vw, 2.1rem)', letterSpacing: '0.3em', color: accent }}>{brandText}</a>
                  <div className="flex flex-wrap justify-end" style={{ gap: '4px clamp(14px, 2.2vw, 32px)' }}>{navItems.slice(mid).map(lk)}</div>
                </div>
                <div className="grid grid-cols-2" style={{ gap: 'clamp(8px, 1.15vw, 16px)', padding: '0 4.8%' }}>
                  {[0, 1].map((k) => (
                    <div key={k} data-name={'Photo ' + (k + 1)} className="relative overflow-hidden" style={{ aspectRatio: '1.16 / 1', background: '#ead9c9' }}>
                      {pics[k] ? <img src={pics[k]} alt="" className="absolute inset-0 h-full w-full object-cover" /> : mtn('#ead9c9', '#cdb39b')}
                    </div>
                  ))}
                </div>
                <div className="flex flex-col items-center text-center" style={{ padding: '26px 6% 6px' }}>
                  <p data-name="Small line" className="el-ju_kicker uppercase" style={{ fontFamily: SF, fontWeight: 700, fontSize: 'clamp(11px, 1.25vw, 18px)', letterSpacing: '0.18em', color: accent }}>{kicker}</p>
                  <h1 className="uppercase" style={{ fontFamily: SF, fontWeight: 700, fontSize: 'clamp(2.6rem, 7.6vw, 6.8rem)', lineHeight: 1.05, letterSpacing: '0.1em', color: accent, margin: '6px 0 10px' }}>{heading}</h1>
                  <p data-name="Intro" className="el-ju_para" style={{ fontFamily: SF, fontSize: 'clamp(15px, 2.2vw, 30px)', lineHeight: 1.35, whiteSpace: 'pre-line' }}>{para}</p>
                  <a data-name="Button" id="hero-btn" href={availHref} className="el-hero_btn uppercase" style={{ fontFamily: SF, fontWeight: 700, fontSize: 'clamp(12px, 1.3vw, 18px)', letterSpacing: '0.18em', color: accent, borderBottom: `2px solid ${accent}`, paddingBottom: 3, marginTop: 24 }}>{linkTxt}</a>
                </div>
                <div className="grid gap-8 md:grid-cols-3" style={{ padding: '38px 6.8% 40px' }}>
                  {svc.map(([ttl, dsc], k) => (
                    <div key={k}>
                      <p data-name="Service title" className={'el-ju_s' + (k + 1) + 't uppercase'} style={{ fontFamily: SF, fontWeight: 700, fontSize: 'clamp(12px, 1.3vw, 18px)', letterSpacing: '0.2em', color: accent }}>{ttl}</p>
                      <p data-name="Service text" className={'el-ju_s' + (k + 1) + 'd'} style={{ fontFamily: SF, fontSize: 'clamp(12px, 1.15vw, 16px)', lineHeight: 1.5, letterSpacing: '0.02em', marginTop: 8, maxWidth: '22em' }}>{dsc}</p>
                    </div>
                  ))}
                </div>
              </header>
            </>
          )
        })()}
        {page === 'home' && tpl === 'camellia' && (() => {
          const SF = "'Cormorant Garamond', 'Playfair Display', Georgia, serif"
          const SC = "'Pinyon Script', 'Great Vibes', cursive"
          const txt = (r as any).site_settings?.text ?? {}
          const heading = String((r as any).site_headline ?? '').trim() || 'Wedding Photography'
          const sub = String(txt.ca_sub ?? '').trim() || 'Honest moments, beautifully captured.'
          const bar = String(txt.ca_bar ?? '').trim() || 'Documenting love stories with a timeless, intimate approach.'
          const words = [
            String(txt.ca_w1 ?? '').trim() || 'Timeless',
            String(txt.ca_w2 ?? '').trim() || 'Personal',
            String(txt.ca_w3 ?? '').trim() || 'Intimate',
            String(txt.ca_w4 ?? '').trim() || 'Luxurious',
          ]
          const mtn = (bgc: string, fgc: string) => (
            <div className="absolute inset-0" style={{ background: bgc }}>
              <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
                <circle cx="300" cy="58" r="16" fill={fgc} opacity="0.55" />
                <path d="M0 200 L105 82 L165 142 L238 62 L400 200 Z" fill={fgc} opacity="0.8" />
              </svg>
            </div>
          )
          const covers = realGalleries.map((g) => photoUrl((g.photos.find((x: any) => x.id === g.cover_photo_id) ?? g.photos[0])?.storage_path)).filter(Boolean) as string[]
          const rest = realGalleries.flatMap((g) => g.photos.map((x: any) => photoUrl(x?.storage_path))).filter(Boolean) as string[]
          const pics = Array.from(new Set([...covers, ...rest])).slice(0, 2)
          const mid = Math.ceil(navItems.length / 2)
          const lk = (n: any) => (
            <a key={n.key} href={n.href} className="el-menu_links uppercase" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(10px, 1.1vw, 15px)', letterSpacing: '0.2em', color: t.menu.linkColor ?? '#fff' }}>{n.label}</a>
          )
          const total = Math.max(heroUrls.length, 1)
          const cur = (((slide % total) + total) % total) + 1
          const photo = (k: number, st: React.CSSProperties) => (
            <div data-name={'Photo ' + (k + 1)} className="absolute overflow-hidden" style={{ background: '#cfcdca', ...st }}>
              {pics[k] ? <img src={pics[k]} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ filter: 'grayscale(1)' }} /> : mtn('#cfcdca', '#a9a6a1')}
            </div>
          )
          return (
            <>
              <header data-name="Cover" id="top" style={{ fontFamily: SF }}>
                <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Pinyon+Script&display=swap" />
                <div className="relative w-full overflow-hidden" style={{ aspectRatio: '2.03 / 1', minHeight: 380, background: '#a8917f', color: '#fff' }}>
                  {shownHero.length === 0 ? <div data-name="Cover image" className="absolute inset-0">{mtn('#b79d8a', '#8f7766')}</div> : heroImg('absolute inset-0 h-full w-full')}
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(rgba(0,0,0,0.22), rgba(0,0,0,0) 30%, rgba(0,0,0,0.35))' }} />
                  <div data-name="Menu bar" id="nav" className="absolute inset-x-0 top-0 grid items-center gap-3" style={{ gridTemplateColumns: '1fr auto 1fr', padding: '22px 5.2%' }}>
                    <div className="flex flex-wrap" style={{ gap: '4px clamp(14px, 3.4vw, 48px)' }}>{navItems.slice(0, mid).map(lk)}</div>
                    <a href={hrefs.home} data-name="Brand name" className="el-menu_brand" style={{ fontFamily: SC, fontWeight: 400, fontSize: 'clamp(2.4rem, 5vw, 4.4rem)', lineHeight: 1, color: '#fff' }}>{brandText}</a>
                    <div className="flex flex-wrap justify-end" style={{ gap: '4px clamp(14px, 3.4vw, 48px)' }}>{navItems.slice(mid).map(lk)}</div>
                  </div>
                  <div className="absolute left-1/2 w-full -translate-x-1/2 text-center" style={{ bottom: '15%', padding: '0 4%' }}>
                    <h1 className="uppercase" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(1.8rem, 4vw, 3.6rem)', lineHeight: 1.1, letterSpacing: '0.02em' }}>{heading}</h1>
                    <p data-name="Subtitle" className="el-ca_sub" style={{ fontFamily: SF, fontStyle: 'italic', fontSize: 'clamp(1.1rem, 2.1vw, 1.9rem)', marginTop: 4 }}>{sub}</p>
                  </div>
                </div>
                <div className="relative flex items-center justify-end" style={{ background: '#d9d8d6', color: '#2a2a2a', padding: '17px 4.4%', minHeight: 58 }}>
                  <p data-name="Bar text" className="el-ca_bar absolute left-1/2 -translate-x-1/2 text-center" style={{ fontFamily: SF, fontStyle: 'italic', fontSize: 'clamp(11px, 1.3vw, 17px)', width: '70%' }}>{bar}</p>
                  <div className="relative flex items-center" style={{ gap: 18, fontFamily: SF, fontSize: 'clamp(12px, 1.3vw, 17px)' }}>
                    <button type="button" aria-label="Previous" onClick={() => setSlide((x: number) => x - 1)} style={{ fontSize: 22, lineHeight: 1 }}>←</button>
                    <span>{cur} / {total}</span>
                    <button type="button" aria-label="Next" onClick={() => setSlide((x: number) => x + 1)} style={{ fontSize: 22, lineHeight: 1 }}>→</button>
                  </div>
                </div>
              </header>
              <section data-name="Words" id="words-home" style={{ background: bg, color: ink, fontFamily: SF }}>
                <div className="grid items-center gap-8 md:grid-cols-[1fr_57%]" style={{ padding: '28px 5.6% 34px' }}>
                  <ul className="flex flex-col" style={{ gap: 'clamp(16px, 3.4vw, 40px)' }}>
                    {words.map((w, k) => (
                      <li key={k}><p data-name="Word" className={'el-ca_w' + (k + 1) + ' uppercase'} style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(13px, 1.5vw, 20px)', letterSpacing: '0.26em' }}>{w}</p></li>
                    ))}
                  </ul>
                  <div className="relative w-full" style={{ aspectRatio: '2.5 / 1' }}>
                    {photo(1, { left: '58.9%', top: 0, width: '41.1%', height: '87.3%' })}
                    {photo(0, { left: 0, top: '7.5%', width: '64.7%', height: '92.5%' })}
                  </div>
                </div>
              </section>
            </>
          )
        })()}
        {page === 'home' && tpl === 'cedar' && (() => {
          const SY = "'Syne', 'Outfit', 'Helvetica Neue', Arial, sans-serif"
          const SB = "'Outfit', 'Helvetica Neue', Arial, sans-serif"
          const txt = (r as any).site_settings?.text ?? {}
          const heading = String((r as any).site_headline ?? '').trim() || 'Photographs\nof love and\nthe quiet\nmoments\nbetween'
          const p1 = String(txt.ce_p1 ?? '').trim() || 'Thoughtfully captured\nportraits that feel honest,\nintentional, and true\nto you.'
          const p2 = String(txt.ce_p2 ?? '').trim() || "Whether it's a milestone,\na celebration, or everyday\nlife, we create imagery that\nfeels personal and lasting."
          const mtn = (bgc: string, fgc: string) => (
            <div className="absolute inset-0" style={{ background: bgc }}>
              <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
                <circle cx="300" cy="58" r="16" fill={fgc} opacity="0.55" />
                <path d="M0 200 L105 82 L165 142 L238 62 L400 200 Z" fill={fgc} opacity="0.8" />
              </svg>
            </div>
          )
          const covers = realGalleries.map((g) => photoUrl((g.photos.find((x: any) => x.id === g.cover_photo_id) ?? g.photos[0])?.storage_path)).filter(Boolean) as string[]
          const rest = realGalleries.flatMap((g) => g.photos.map((x: any) => photoUrl(x?.storage_path))).filter(Boolean) as string[]
          const pic = Array.from(new Set([...covers, ...rest]))[0] ?? null
          return (
            <>
              <header data-name="Cover" id="top" style={{ fontFamily: SB, background: bg, color: '#fff' }}>
                <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500&family=Syne:wght@400;500&display=swap" />
                <div className="relative w-full overflow-hidden" style={{ aspectRatio: '1.77 / 1', minHeight: 440, background: '#1a1614' }}>
                  {shownHero.length === 0 ? <div data-name="Cover image" className="absolute inset-0">{mtn('#1e1a17', '#3b342d')}</div> : heroImg('absolute inset-0 h-full w-full')}
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.5), rgba(0,0,0,0) 58%), linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0) 25%)' }} />
                  <div data-name="Menu bar" id="nav" className="absolute inset-x-0 top-0 flex flex-wrap items-center justify-between gap-3" style={{ padding: '30px 4.5%' }}>
                    <a href={hrefs.home} data-name="Brand name" className="el-menu_brand uppercase" style={{ fontFamily: SY, fontWeight: 400, fontSize: 'clamp(1.4rem, 2.9vw, 2.6rem)', letterSpacing: '0.55em', color: '#fff' }}>{brandText}</a>
                    <ul className="flex flex-wrap" style={{ gap: '6px clamp(14px, 2.6vw, 38px)' }}>
                      {navItems.map((n) => (
                        <li key={n.key}>
                          <a href={n.href} className="el-menu_links uppercase" style={{ fontFamily: SB, fontWeight: 400, fontSize: 'clamp(10px, 1vw, 14px)', letterSpacing: '0.16em', color: t.menu.linkColor ?? '#fff' }}>{n.label}</a>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="absolute" style={{ left: '4.4%', top: '28%', right: '40%' }}>
                    <h1 style={{ fontFamily: SY, fontWeight: 400, fontSize: 'clamp(2.1rem, 4.8vw, 4.4rem)', lineHeight: 1.04, whiteSpace: 'pre-line' }}>{heading}</h1>
                  </div>
                </div>
              </header>
              <section data-name="Intro" id="intro-home" style={{ background: bg, color: '#fff', fontFamily: SB }}>
                <div className="grid items-center gap-6 md:grid-cols-[40.8%_1fr_1fr]" style={{ padding: '26px 4.6% 24px', columnGap: '5%' }}>
                  <div data-name="Photo" className="relative w-full overflow-hidden" style={{ aspectRatio: '1.85 / 1', background: '#1a1614' }}>
                    {pic ? <img src={pic} alt="" className="absolute inset-0 h-full w-full object-cover" /> : mtn('#1a1614', '#3b342d')}
                  </div>
                  <p data-name="Paragraph" className="el-ce_p1" style={{ fontFamily: SB, fontWeight: 300, fontSize: 'clamp(14px, 1.65vw, 23px)', lineHeight: 1.45, whiteSpace: 'pre-line', opacity: 0.9 }}>{p1}</p>
                  <p data-name="Paragraph" className="el-ce_p2" style={{ fontFamily: SB, fontWeight: 300, fontSize: 'clamp(14px, 1.65vw, 23px)', lineHeight: 1.45, whiteSpace: 'pre-line', opacity: 0.9 }}>{p2}</p>
                </div>
              </section>
            </>
          )
        })()}
        {page === 'home' && tpl === 'olive' && (() => {
          const SF = "'Cormorant Garamond', 'Playfair Display', Georgia, serif"
          const SS = "'Jost', 'Helvetica Neue', Arial, sans-serif"
          const txt = (r as any).site_settings?.text ?? {}
          const heading = String((r as any).site_headline ?? '').trim() || 'Honest, Timeless\nPhotography'
          const kicker = String(txt.ol_kicker ?? '').trim() || 'Love stories'
          const linkTxt = String(txt.hero_btn ?? '').trim() || 'View portfolio'
          const caps = [
            String(txt.ol_c1 ?? '').trim() || 'Engagements',
            String(txt.ol_c2 ?? '').trim() || 'Weddings',
            String(txt.ol_c3 ?? '').trim() || 'Elopements',
            String(txt.ol_c4 ?? '').trim() || 'Families',
          ]
          const mtn = (bgc: string, fgc: string) => (
            <div className="absolute inset-0" style={{ background: bgc }}>
              <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
                <circle cx="300" cy="58" r="16" fill={fgc} opacity="0.55" />
                <path d="M0 200 L105 82 L165 142 L238 62 L400 200 Z" fill={fgc} opacity="0.8" />
              </svg>
            </div>
          )
          const covers = realGalleries.map((g) => photoUrl((g.photos.find((x: any) => x.id === g.cover_photo_id) ?? g.photos[0])?.storage_path)).filter(Boolean) as string[]
          const rest = realGalleries.flatMap((g) => g.photos.map((x: any) => photoUrl(x?.storage_path))).filter(Boolean) as string[]
          const pics = Array.from(new Set([...covers, ...rest])).slice(0, 4)
          return (
            <>
              <header data-name="Cover" id="top" style={{ background: bg, color: ink, fontFamily: SS }}>
                <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Jost:wght@400;500&display=swap" />
                <div data-name="Menu bar" id="nav" className="flex flex-wrap items-center justify-between gap-3" style={{ padding: '14px 3.85% 12px' }}>
                  <a href={hrefs.home} data-name="Brand name" className="el-menu_brand" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(1.8rem, 3.6vw, 3.2rem)', lineHeight: 1.1, color: ink }}>{brandText}</a>
                  <ul className="flex flex-wrap" style={{ gap: '6px clamp(14px, 2.4vw, 36px)' }}>
                    {navItems.map((n) => (
                      <li key={n.key}>
                        <a href={n.href} className="el-menu_links uppercase" style={{ fontFamily: SS, fontWeight: 400, fontSize: 'clamp(11px, 1.2vw, 16px)', letterSpacing: '0.04em', color: t.menu.linkColor ?? ink }}>{n.label}</a>
                      </li>
                    ))}
                  </ul>
                </div>
                <div style={{ padding: '0 3.85%' }}>
                  <div className="relative w-full overflow-hidden" style={{ aspectRatio: '1.95 / 1', minHeight: 360, background: '#d8cdbf' }}>
                    {shownHero.length === 0 ? <div data-name="Cover image" className="absolute inset-0">{mtn('#d8cdbf', '#b8aa98')}</div> : heroImg('absolute inset-0 h-full w-full')}
                    <div className="absolute" style={{ left: '2.3%', bottom: '5%', width: '33.8%', minWidth: 250, background: bg, color: ink, padding: 'clamp(16px, 2.4vw, 32px)' }}>
                      <p data-name="Small line" className="el-ol_kicker uppercase" style={{ fontFamily: SS, fontWeight: 500, fontSize: 'clamp(10px, 1.15vw, 16px)', letterSpacing: '0.24em' }}>{kicker}</p>
                      <h1 style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(1.6rem, 3.6vw, 3.3rem)', lineHeight: 1.02, margin: '14px 0 18px', whiteSpace: 'pre-line' }}>{heading}</h1>
                      <a data-name="Button" id="hero-btn" href={availHref} className="el-hero_btn uppercase" style={{ fontFamily: SS, fontWeight: 500, fontSize: 'clamp(10px, 1.15vw, 16px)', letterSpacing: '0.22em', borderBottom: '2px solid currentColor', paddingBottom: 2 }}>{linkTxt}</a>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: 'clamp(8px, 1.35vw, 19px)', marginTop: 'clamp(14px, 2.4vw, 33px)', paddingBottom: 22 }}>
                    {[0, 1, 2, 3].map((k) => (
                      <div key={k}>
                        <div data-name={'Photo ' + (k + 1)} className="relative w-full overflow-hidden" style={{ aspectRatio: '1.23 / 1', background: '#d8cdbf' }}>
                          {pics[k] ? <img src={pics[k]} alt="" className="absolute inset-0 h-full w-full object-cover" /> : mtn('#d8cdbf', '#b8aa98')}
                        </div>
                        <p data-name="Caption" className={'el-ol_c' + (k + 1) + ' uppercase text-center'} style={{ fontFamily: SS, fontWeight: 500, fontSize: 'clamp(10px, 1.1vw, 15px)', letterSpacing: '0.3em', marginTop: 12 }}>{caps[k]}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </header>
            </>
          )
        })()}
        {page === 'home' && tpl === 'magnolia' && (() => {
          const SF = "'Cormorant Garamond', 'Playfair Display', Georgia, serif"
          const SB = "'Lora', Georgia, serif"
          const SC = "'Pinyon Script', 'Great Vibes', cursive"
          const txt = (r as any).site_settings?.text ?? {}
          const storyT = String(txt.mg_story ?? '').trim() || 'Our Story'
          const storyP = String(txt.mg_text ?? '').trim() || 'Capturing real connections with honesty and care.'
          const btnT = String(txt.hero_btn ?? '').trim() || 'View portfolio'
          const mtn = (bgc: string, fgc: string) => (
            <div className="absolute inset-0" style={{ background: bgc }}>
              <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
                <circle cx="300" cy="58" r="16" fill={fgc} opacity="0.55" />
                <path d="M0 200 L105 82 L165 142 L238 62 L400 200 Z" fill={fgc} opacity="0.8" />
              </svg>
            </div>
          )
          const covers = realGalleries.map((g) => photoUrl((g.photos.find((x: any) => x.id === g.cover_photo_id) ?? g.photos[0])?.storage_path)).filter(Boolean) as string[]
          const rest = realGalleries.flatMap((g) => g.photos.map((x: any) => photoUrl(x?.storage_path))).filter(Boolean) as string[]
          const pics = Array.from(new Set([...covers, ...rest])).slice(0, 3)
          return (
            <>
              <header data-name="Cover" id="top" className="flex flex-col md:flex-row" style={{ background: '#fffefd', color: ink, fontFamily: SF }}>
                <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400;1,500&family=Lora:wght@400&family=Pinyon+Script&display=swap" />
                <div data-name="Menu bar" id="nav" className="w-full md:w-[23.04%] md:min-h-screen" style={{ background: bg, padding: 'clamp(20px, 2.4vw, 34px) clamp(16px, 4.5%, 64px) 40px' }}>
                  <a href={hrefs.home} data-name="Brand name" className="el-menu_brand block" style={{ fontFamily: SC, fontSize: 'clamp(2.6rem, 5.2vw, 4.4rem)', lineHeight: 0.98, color: ink, textAlign: 'center' }}>{brandText}</a>
                  <div className="mx-auto" style={{ width: '30%', height: 1, background: ink, margin: 'clamp(20px, 3vw, 44px) auto clamp(24px, 4.5vw, 66px)' }} />
                  <ul className="flex flex-wrap md:flex-col" style={{ gap: 'clamp(14px, 3.2vw, 46px) clamp(18px, 3vw, 30px)' }}>
                    {navItems.map((n) => (
                      <li key={n.key}>
                        <a href={n.href} className="el-menu_links uppercase" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(12px, 1.35vw, 19px)', letterSpacing: '0.32em', color: t.menu.linkColor ?? ink }}>{n.label}</a>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="w-full md:w-[76.96%]">
                  <div className="relative w-full overflow-hidden" style={{ aspectRatio: '1.34 / 1', minHeight: 300, background: '#d8cdbf' }}>
                    {shownHero.length === 0 ? <div data-name="Cover image" className="absolute inset-0">{mtn('#d8cdbf', '#b8aa98')}</div> : heroImg('absolute inset-0 h-full w-full')}
                    <a data-name="Button" id="hero-btn" href={availHref} className="el-hero_btn absolute uppercase" style={{ left: '4.6%', bottom: '5.5%', fontFamily: SF, fontWeight: 500, fontSize: 'clamp(11px, 1.3vw, 18px)', letterSpacing: '0.28em', color: '#fff', border: '2px solid #fff', padding: 'clamp(8px, 1vw, 14px) clamp(16px, 2.4vw, 36px)', background: 'rgba(0,0,0,0.12)' }}>{btnT}</a>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-[1.45fr_1fr_1fr_1fr] items-center" style={{ gap: 'clamp(10px, 1.2vw, 16px)', padding: 'clamp(16px, 3.2vw, 36px) clamp(12px, 1.7%, 24px)' }}>
                    <div style={{ paddingRight: 'clamp(8px, 2vw, 30px)', paddingLeft: 'clamp(4px, 1.6vw, 22px)' }}>
                      <h2 data-name="Heading" className="el-mg_story" style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 500, fontSize: 'clamp(1.8rem, 3.4vw, 3rem)', lineHeight: 1.1, color: ink }}>{storyT}</h2>
                      <p data-name="Paragraph" className="el-mg_text" style={{ fontFamily: SB, fontSize: 'clamp(13px, 1.5vw, 21px)', lineHeight: 1.55, marginTop: 'clamp(10px, 1.6vw, 22px)', color: ink, opacity: 0.85 }}>{storyP}</p>
                    </div>
                    {[0, 1, 2].map((k) => (
                      <div key={k} data-name={'Photo ' + (k + 1)} className="relative w-full overflow-hidden" style={{ aspectRatio: '0.925 / 1', background: '#d8cdbf' }}>
                        {pics[k] ? <img src={pics[k]} alt="" className="absolute inset-0 h-full w-full object-cover" /> : mtn('#d8cdbf', '#b8aa98')}
                      </div>
                    ))}
                  </div>
                </div>
              </header>
            </>
          )
        })()}
        {page === 'home' && tpl === 'lily' && (() => {
          const SF = "'Cormorant Garamond', 'Playfair Display', Georgia, serif"
          const SS = "'DM Sans', 'Helvetica Neue', Arial, sans-serif"
          const txt = (r as any).site_settings?.text ?? {}
          const heading = String((r as any).site_headline ?? '').trim() || 'Real Moments\nfor a Lifetime\nof Memories'
          const kicker = String(txt.li_kicker ?? '').trim() || 'Family photography'
          const para = String(txt.li_para ?? '').trim() || 'Lifestyle photography for families who value connection, laughter, and the everyday magic.'
          const btnT = String(txt.hero_btn ?? '').trim() || 'Book a session'
          const meet = String(txt.li_meet ?? '').trim() || 'Meet the family\nphotographer'
          const more = String(txt.li_more ?? '').trim() || 'Learn more'
          const mtn = (bgc: string, fgc: string) => (
            <div className="absolute inset-0" style={{ background: bgc }}>
              <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
                <circle cx="300" cy="58" r="16" fill={fgc} opacity="0.55" />
                <path d="M0 200 L105 82 L165 142 L238 62 L400 200 Z" fill={fgc} opacity="0.8" />
              </svg>
            </div>
          )
          const covers = realGalleries.map((g) => photoUrl((g.photos.find((x: any) => x.id === g.cover_photo_id) ?? g.photos[0])?.storage_path)).filter(Boolean) as string[]
          const rest = realGalleries.flatMap((g) => g.photos.map((x: any) => photoUrl(x?.storage_path))).filter(Boolean) as string[]
          const pics = Array.from(new Set([...covers, ...rest])).slice(0, 2)
          const aboutPic = ((r as any).site_settings?.about?.photo as string | undefined) || ''
          return (
            <>
              <header data-name="Cover" id="top" style={{ background: bg, color: ink, fontFamily: SS }}>
                <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400;1,500&family=DM+Sans:wght@400;500&display=swap" />
                <div data-name="Menu bar" id="nav" className="flex flex-wrap items-center justify-between gap-3" style={{ padding: '10px 4.2% 6px' }}>
                  <a href={hrefs.home} data-name="Brand name" className="el-menu_brand" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(2.2rem, 4.8vw, 4.4rem)', lineHeight: 1.1, color: ink }}>{brandText}</a>
                  <ul className="flex flex-wrap" style={{ gap: '6px clamp(14px, 2.8vw, 40px)' }}>
                    {navItems.map((n) => (
                      <li key={n.key}>
                        <a href={n.href} className="el-menu_links uppercase" style={{ fontFamily: SS, fontWeight: 500, fontSize: 'clamp(11px, 1.2vw, 17px)', letterSpacing: '0.06em', color: t.menu.linkColor ?? ink }}>{n.label}</a>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="relative w-full" style={{ aspectRatio: '2.12 / 1', minHeight: 420 }}>
                  <div className="absolute overflow-hidden" style={{ left: '29.1%', width: '67.5%', top: 0, bottom: 0, background: '#d8cdbf' }}>
                    {shownHero.length === 0 ? <div data-name="Cover image" className="absolute inset-0">{mtn('#d8cdbf', '#b8aa98')}</div> : heroImg('absolute inset-0 h-full w-full')}
                  </div>
                  <div className="absolute" style={{ left: '3.35%', top: '13.3%', width: '35.6%', minWidth: 260, background: '#e8dccd', color: ink, padding: 'clamp(16px, 3.3%, 48px) clamp(16px, 3.3%, 48px)' }}>
                    <p data-name="Small line" className="el-li_kicker uppercase" style={{ fontFamily: SS, fontWeight: 500, fontSize: 'clamp(10px, 1.15vw, 16px)', letterSpacing: '0.3em' }}>{kicker}</p>
                    <h1 style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(1.7rem, 3.9vw, 3.7rem)', lineHeight: 1.05, margin: 'clamp(10px, 1.6vw, 22px) 0', whiteSpace: 'pre-line' }}>{heading}</h1>
                    <p data-name="Paragraph" className="el-li_para" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(13px, 1.6vw, 22px)', lineHeight: 1.4, opacity: 0.8, maxWidth: '88%' }}>{para}</p>
                    <a data-name="Button" id="hero-btn" href={availHref} className="el-hero_btn uppercase inline-block" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(11px, 1.3vw, 18px)', letterSpacing: '0.24em', background: '#4a3426', color: '#fff', padding: 'clamp(10px, 1.3vw, 18px) clamp(18px, 2.4vw, 34px)', marginTop: 'clamp(14px, 2.2vw, 32px)' }}>{btnT}</a>
                  </div>
                </div>
                <div className="relative w-full" style={{ aspectRatio: '4.55 / 1', minHeight: 260, marginTop: '2.4%' }}>
                  <div className="absolute flex flex-col justify-center" style={{ left: '4.9%', top: 0, bottom: 0, width: '30%' }}>
                    <h2 data-name="Heading" className="el-li_meet" style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 500, fontSize: 'clamp(1.7rem, 3.5vw, 3.2rem)', lineHeight: 1.05, whiteSpace: 'pre-line' }}>{meet}</h2>
                    <a data-name="Link" href={hrefs.about ?? availHref} className="el-li_more uppercase inline-block" style={{ fontFamily: SS, fontWeight: 500, fontSize: 'clamp(11px, 1.2vw, 16px)', letterSpacing: '0.26em', borderBottom: '2px solid currentColor', paddingBottom: 3, marginTop: 'clamp(14px, 2.4vw, 34px)', alignSelf: 'flex-start' }}>{more}</a>
                  </div>
                  <div data-name="Photo 1" className="absolute overflow-hidden" style={{ left: '35.9%', width: '35.2%', top: 0, height: '95%', background: '#d8cdbf' }}>
                    {aboutPic ? <img src={aboutPic} alt="" className="absolute inset-0 h-full w-full object-cover" /> : mtn('#d8cdbf', '#b8aa98')}
                  </div>
                  <div data-name="Photo 2" className="absolute overflow-hidden" style={{ left: '65.3%', width: '31%', top: '23%', height: '77%', background: '#d8cdbf', border: '3px solid ' + bg }}>
                    {pics[0] ? <img src={pics[0]} alt="" className="absolute inset-0 h-full w-full object-cover" /> : mtn('#d8cdbf', '#b8aa98')}
                  </div>
                </div>
                <div style={{ height: 24 }} />
              </header>
            </>
          )
        })()}
        {page === 'home' && tpl === 'orchid' && (() => {
          const SF = "'Cormorant Garamond', 'Playfair Display', Georgia, serif"
          const txt = (r as any).site_settings?.text ?? {}
          const heading = String((r as any).site_headline ?? '').trim() || 'Senior portraits with personality'
          const btnT = String(txt.hero_btn ?? '').trim() || 'View work'
          const mtn = (bgc: string, fgc: string) => (
            <div className="absolute inset-0" style={{ background: bgc }}>
              <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
                <circle cx="300" cy="58" r="16" fill={fgc} opacity="0.55" />
                <path d="M0 200 L105 82 L165 142 L238 62 L400 200 Z" fill={fgc} opacity="0.8" />
              </svg>
            </div>
          )
          const covers = realGalleries.map((g) => photoUrl((g.photos.find((x: any) => x.id === g.cover_photo_id) ?? g.photos[0])?.storage_path)).filter(Boolean) as string[]
          const rest = realGalleries.flatMap((g) => g.photos.map((x: any) => photoUrl(x?.storage_path))).filter(Boolean) as string[]
          const pics = Array.from(new Set([...covers, ...rest])).slice(0, 5)
          const arrow = (d: string) => (
            <svg width="22" height="40" viewBox="0 0 22 40" fill="none" stroke="#fff" strokeWidth="1.6"><path d={d} /></svg>
          )
          return (
            <>
              <header data-name="Cover" id="top" style={{ background: bg, color: ink, fontFamily: SF }}>
                <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&display=swap" />
                <div data-name="Menu bar" id="nav" className="text-center" style={{ padding: 'clamp(10px, 1.6vw, 22px) 3% 0' }}>
                  <a href={hrefs.home} data-name="Brand name" className="el-menu_brand uppercase block" style={{ fontFamily: SF, fontWeight: 400, fontSize: 'clamp(2rem, 4.8vw, 4.6rem)', letterSpacing: '0.12em', lineHeight: 1.15, color: ink }}>{brandText}</a>
                  <ul className="flex flex-wrap justify-center" style={{ gap: '8px clamp(16px, 3.6vw, 52px)', margin: 'clamp(10px, 1.6vw, 24px) 0 clamp(14px, 2.4vw, 36px)' }}>
                    {navItems.map((n) => (
                      <li key={n.key}>
                        <a href={n.href} className="el-menu_links uppercase" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(11px, 1.3vw, 18px)', letterSpacing: '0.24em', color: t.menu.linkColor ?? ink }}>{n.label}</a>
                      </li>
                    ))}
                  </ul>
                </div>
                <div style={{ padding: '0 3.85%' }}>
                  <div className="relative w-full overflow-hidden" style={{ aspectRatio: '2.67 / 1', minHeight: 220, background: '#b9b4b0' }}>
                    {shownHero.length === 0 ? <div data-name="Cover image" className="absolute inset-0">{mtn('#b9b4b0', '#8f8a86')}</div> : heroImg('absolute inset-0 h-full w-full')}
                    <button type="button" aria-label="Previous" onClick={() => setSlide((x: number) => Math.max(0, x - 1))} className="absolute" style={{ left: '1.6%', top: '50%', transform: 'translateY(-50%)' }}>{arrow('M18 2 L4 20 L18 38')}</button>
                    <button type="button" aria-label="Next" onClick={() => setSlide((x: number) => x + 1)} className="absolute" style={{ right: '1.6%', top: '50%', transform: 'translateY(-50%)' }}>{arrow('M4 2 L18 20 L4 38')}</button>
                  </div>
                  <div className="grid grid-cols-5" style={{ gap: 'clamp(6px, 1.2vw, 18px)', marginTop: 'clamp(8px, 1.3vw, 18px)' }}>
                    {[0, 1, 2, 3, 4].map((k) => (
                      <div key={k} data-name={'Thumbnail ' + (k + 1)} className="relative w-full overflow-hidden" style={{ aspectRatio: '1.55 / 1', background: '#b9b4b0', outline: k === 0 ? '2px solid ' + ink : 'none', outlineOffset: 3 }}>
                        {pics[k] ? <img src={pics[k]} alt="" className="absolute inset-0 h-full w-full object-cover" /> : mtn('#b9b4b0', '#8f8a86')}
                      </div>
                    ))}
                  </div>
                  <div className="text-center" style={{ padding: 'clamp(14px, 2.4vw, 34px) 0 clamp(24px, 3vw, 44px)' }}>
                    <h1 className="mx-auto" style={{ fontFamily: SF, fontWeight: 400, fontSize: 'clamp(1.9rem, 4.5vw, 4.2rem)', lineHeight: 1.02, maxWidth: '48ch', color: ink }}>{heading}</h1>
                    <a data-name="Button" id="hero-btn" href={availHref} className="el-hero_btn uppercase inline-block" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(11px, 1.3vw, 18px)', letterSpacing: '0.26em', border: '1.5px solid currentColor', padding: 'clamp(10px, 1.3vw, 18px) clamp(26px, 4.2vw, 60px)', marginTop: 'clamp(12px, 1.8vw, 26px)' }}>{btnT}</a>
                  </div>
                </div>
              </header>
            </>
          )
        })()}
        {page === 'home' && tpl === 'lotus' && (() => {
          const SF = "'Cormorant Garamond', 'Playfair Display', Georgia, serif"
          const SS = "'DM Sans', 'Helvetica Neue', Arial, sans-serif"
          const txt = (r as any).site_settings?.text ?? {}
          const heading = String((r as any).site_headline ?? '').trim() || 'Stories told\nwith care'
          const btnT = String(txt.hero_btn ?? '').trim() || 'Book now'
          const mtn = (bgc: string, fgc: string) => (
            <div className="absolute inset-0" style={{ background: bgc }}>
              <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
                <circle cx="300" cy="58" r="16" fill={fgc} opacity="0.55" />
                <path d="M0 200 L105 82 L165 142 L238 62 L400 200 Z" fill={fgc} opacity="0.8" />
              </svg>
            </div>
          )
          const covers = realGalleries.map((g) => photoUrl((g.photos.find((x: any) => x.id === g.cover_photo_id) ?? g.photos[0])?.storage_path)).filter(Boolean) as string[]
          const rest = realGalleries.flatMap((g) => g.photos.map((x: any) => photoUrl(x?.storage_path))).filter(Boolean) as string[]
          const pics = Array.from(new Set([...covers, ...rest])).slice(0, 3)
          return (
            <>
              <header data-name="Cover" id="top" style={{ background: '#fff', color: ink, fontFamily: SS }}>
                <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=DM+Sans:wght@400;500&display=swap" />
                <div className="relative w-full overflow-hidden" style={{ aspectRatio: '1.95 / 1', minHeight: 300, background: '#d8c4ae' }}>
                  {shownHero.length === 0 ? <div data-name="Cover image" className="absolute inset-0">{mtn('#d8c4ae', '#b9a28a')}</div> : heroImg('absolute inset-0 h-full w-full')}
                </div>
                <div data-name="Menu bar" id="nav" className="flex flex-wrap items-center justify-between gap-3" style={{ background: bg, padding: 'clamp(10px, 1.3vw, 18px) 3.9% clamp(10px, 1.3vw, 18px) 3.9%' }}>
                  <a href={hrefs.home} data-name="Brand name" className="el-menu_brand" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(1.8rem, 3.6vw, 3.3rem)', lineHeight: 1.1, color: ink }}>{brandText}</a>
                  <ul className="flex flex-wrap justify-center" style={{ gap: '6px clamp(14px, 2.9vw, 42px)' }}>
                    {navItems.map((n) => (
                      <li key={n.key}>
                        <a href={n.href} className="el-menu_links uppercase" style={{ fontFamily: SS, fontWeight: 500, fontSize: 'clamp(10px, 1.15vw, 16px)', letterSpacing: '0.16em', color: t.menu.linkColor ?? ink }}>{n.label}</a>
                      </li>
                    ))}
                  </ul>
                  <a data-name="Button" id="hero-btn" href={availHref} className="el-hero_btn uppercase" style={{ fontFamily: SS, fontWeight: 500, fontSize: 'clamp(10px, 1.1vw, 15px)', letterSpacing: '0.2em', background: '#2a1d12', color: '#fff', padding: 'clamp(10px, 1.2vw, 16px) clamp(18px, 2.4vw, 34px)' }}>{btnT}</a>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-[1.28fr_1.05fr_1fr_1fr] items-center" style={{ gap: 'clamp(8px, 1vw, 14px)', padding: 'clamp(20px, 3.2vw, 46px) 3.5% clamp(24px, 3vw, 44px) 3.9%' }}>
                  <div style={{ paddingRight: '8%' }}>
                    <h1 style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(2rem, 4.5vw, 4.2rem)', lineHeight: 1.04, whiteSpace: 'pre-line', color: ink }}>{heading}</h1>
                    <div style={{ width: '32%', height: 1, background: '#9a948d', marginTop: 'clamp(18px, 3vw, 44px)' }} />
                  </div>
                  {[0, 1, 2].map((k) => (
                    <div key={k} data-name={'Photo ' + (k + 1)} className="relative w-full overflow-hidden" style={{ aspectRatio: '1.27 / 1', background: '#d8c4ae' }}>
                      {pics[k] ? <img src={pics[k]} alt="" className="absolute inset-0 h-full w-full object-cover" /> : mtn('#d8c4ae', '#b9a28a')}
                    </div>
                  ))}
                </div>
              </header>
            </>
          )
        })()}
        {page === 'home' && tpl === 'aster' && (() => {
          const SF = "'Cormorant Garamond', 'Playfair Display', Georgia, serif"
          const SS = "'DM Sans', 'Helvetica Neue', Arial, sans-serif"
          const txt = (r as any).site_settings?.text ?? {}
          const g = (k: string, d: string) => String(txt[k] ?? '').trim() || d
          const heading = String((r as any).site_headline ?? '').trim() || 'Real Moments\nfor a Lifetime\nof Memories'
          const kicker = g('as_kicker', 'Family photography')
          const para = g('as_para', 'Natural, heartfelt photography for families who want to remember the everyday magic.')
          const btnT = g('hero_btn', 'Book a session')
          const kind = g('as_kind', 'Kind words')
          const qs = [
            [g('as_q1', '\u201CThe photos feel so real and so us. We love them!\u201D'), g('as_n1', 'Emily R.')],
            [g('as_q2', '\u201CYou captured our family perfectly. Every photo is special.\u201D'), g('as_n2', 'James K.')],
            [g('as_q3', '\u201CKind, patient, and so talented. We couldn\u2019t be happier!\u201D'), g('as_n3', 'Lauren M.')],
          ]
          const mtn = (bgc: string, fgc: string) => (
            <div className="absolute inset-0" style={{ background: bgc }}>
              <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
                <circle cx="300" cy="58" r="16" fill={fgc} opacity="0.55" />
                <path d="M0 200 L105 82 L165 142 L238 62 L400 200 Z" fill={fgc} opacity="0.8" />
              </svg>
            </div>
          )
          return (
            <>
              <header data-name="Cover" id="top" style={{ color: ink, fontFamily: SS }}>
                <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=DM+Sans:wght@400;500&display=swap" />
                <div style={{ background: bg }}>
                  <div data-name="Menu bar" id="nav" className="flex flex-wrap items-center justify-between gap-3" style={{ padding: '10px 5% 4px' }}>
                    <a href={hrefs.home} data-name="Brand name" className="el-menu_brand" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(2rem, 4.4vw, 4rem)', lineHeight: 1.1, color: ink }}>{brandText}</a>
                    <ul className="flex flex-wrap" style={{ gap: '6px clamp(14px, 3vw, 44px)' }}>
                      {navItems.map((n) => (
                        <li key={n.key}>
                          <a href={n.href} className="el-menu_links uppercase" style={{ fontFamily: SS, fontWeight: 500, fontSize: 'clamp(11px, 1.2vw, 17px)', letterSpacing: '0.14em', color: t.menu.linkColor ?? ink }}>{n.label}</a>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_56.4%] items-end" style={{ paddingRight: '3.9%' }}>
                    <div className="self-center" style={{ padding: 'clamp(20px, 3vw, 40px) 4% clamp(20px, 3vw, 40px) 6.4%' }}>
                      <p data-name="Small line" className="el-as_kicker uppercase" style={{ fontFamily: SS, fontWeight: 500, fontSize: 'clamp(11px, 1.4vw, 20px)', letterSpacing: '0.3em' }}>{kicker}</p>
                      <h1 style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(2.2rem, 5.2vw, 4.9rem)', lineHeight: 1.03, margin: 'clamp(14px, 2vw, 28px) 0 clamp(12px, 1.8vw, 24px)', whiteSpace: 'pre-line' }}>{heading}</h1>
                      <p data-name="Paragraph" className="el-as_para" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(14px, 1.8vw, 25px)', lineHeight: 1.4, opacity: 0.75, maxWidth: '88%' }}>{para}</p>
                      <a data-name="Button" id="hero-btn" href={availHref} className="el-hero_btn uppercase inline-block" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(11px, 1.4vw, 19px)', letterSpacing: '0.24em', background: '#818d6c', color: '#fff', padding: 'clamp(12px, 1.5vw, 20px) clamp(20px, 2.8vw, 40px)', marginTop: 'clamp(18px, 3vw, 44px)' }}>{btnT}</a>
                    </div>
                    <div className="relative w-full overflow-hidden" style={{ aspectRatio: '1.07 / 1', minHeight: 280, borderRadius: '9999px 9999px 0 0', background: '#d8cdbf' }}>
                      {shownHero.length === 0 ? <div data-name="Cover image" className="absolute inset-0">{mtn('#d8cdbf', '#b8aa98')}</div> : heroImg('absolute inset-0 h-full w-full')}
                    </div>
                  </div>
                </div>
                <div data-name="Kind words" id="reviews" style={{ background: '#fff', padding: 'clamp(20px, 2.6vw, 38px) 4% clamp(24px, 3vw, 44px)' }}>
                  <div className="flex items-center justify-center" style={{ gap: 'clamp(14px, 3vw, 40px)' }}>
                    <div style={{ height: 1, background: '#a9a6a3', width: '16%' }} />
                    <h2 className="el-as_kind uppercase" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(12px, 1.5vw, 21px)', letterSpacing: '0.32em' }}>{kind}</h2>
                    <div style={{ height: 1, background: '#a9a6a3', width: '16%' }} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3" style={{ marginTop: 'clamp(16px, 2.4vw, 34px)' }}>
                    {qs.map((q, k) => (
                      <div key={k} className="text-center" style={{ padding: '6px 4%', borderLeft: k > 0 ? '1px solid #cfcbc6' : 'none' }}>
                        <p data-name="Quote" className={'el-as_q' + (k + 1)} style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(14px, 1.7vw, 24px)', lineHeight: 1.3 }}>{q[0]}</p>
                        <p data-name="Name" className={'el-as_n' + (k + 1) + ' uppercase'} style={{ fontFamily: SS, fontWeight: 500, fontSize: 'clamp(10px, 1.2vw, 16px)', letterSpacing: '0.3em', marginTop: 'clamp(10px, 1.4vw, 20px)' }}>{q[1]}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </header>
            </>
          )
        })()}
        {page === 'home' && tpl === 'fern' && (() => {
          const SF = "'Cormorant Garamond', 'Playfair Display', Georgia, serif"
          const SC = "'Pinyon Script', 'Great Vibes', cursive"
          const txt = (r as any).site_settings?.text ?? {}
          const heading = String((r as any).site_headline ?? '').trim() || 'Tell your story with me'
          const btnT = String(txt.hero_btn ?? '').trim() || 'Book a session'
          const mtn = (bgc: string, fgc: string) => (
            <div className="absolute inset-0" style={{ background: bgc }}>
              <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
                <circle cx="300" cy="58" r="16" fill={fgc} opacity="0.55" />
                <path d="M0 200 L105 82 L165 142 L238 62 L400 200 Z" fill={fgc} opacity="0.8" />
              </svg>
            </div>
          )
          const covers = realGalleries.map((g) => photoUrl((g.photos.find((x: any) => x.id === g.cover_photo_id) ?? g.photos[0])?.storage_path)).filter(Boolean) as string[]
          const rest = realGalleries.flatMap((g) => g.photos.map((x: any) => photoUrl(x?.storage_path))).filter(Boolean) as string[]
          const pics = Array.from(new Set([...covers, ...rest])).slice(0, 4)
          const offs = ['0%', '10.5%', '1.2%', '12.1%']
          return (
            <>
              <header data-name="Cover" id="top" style={{ background: '#fff', color: ink, fontFamily: SF }}>
                <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=Pinyon+Script&display=swap" />
                <div data-name="Menu bar" id="nav" className="text-center" style={{ padding: 'clamp(6px, 1vw, 14px) 3% 0' }}>
                  <a href={hrefs.home} data-name="Brand name" className="el-menu_brand block" style={{ fontFamily: SC, fontSize: 'clamp(2.8rem, 6.6vw, 6rem)', lineHeight: 1.05, color: ink }}>{brandText}</a>
                  <ul className="flex flex-wrap justify-center" style={{ gap: '8px clamp(16px, 3.4vw, 50px)', margin: 'clamp(8px, 1.4vw, 20px) 0 clamp(18px, 3.6vw, 52px)' }}>
                    {navItems.map((n) => (
                      <li key={n.key}>
                        <a href={n.href} className="el-menu_links uppercase" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(11px, 1.3vw, 18px)', letterSpacing: '0.24em', color: t.menu.linkColor ?? ink }}>{n.label}</a>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: 'clamp(6px, 0.6vw, 9px)', padding: '0 2.9% clamp(34px, 5vw, 72px)' }}>
                  {[0, 1, 2, 3].map((k) => (
                    <div key={k} data-name={'Photo ' + (k + 1)} className="relative w-full overflow-hidden md:[transform:var(--off)]" style={{ aspectRatio: '0.575 / 1', background: '#d8cdbf', ['--off' as any]: 'translateY(' + offs[k] + ')' }}>
                      {pics[k] ? <img src={pics[k]} alt="" className="absolute inset-0 h-full w-full object-cover" /> : mtn('#d8cdbf', '#b8aa98')}
                    </div>
                  ))}
                </div>
                <div className="text-center" style={{ padding: '0 4% clamp(26px, 3.4vw, 50px)' }}>
                  <h1 style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(2rem, 5.2vw, 4.9rem)', lineHeight: 1.05, color: ink }}>{heading}</h1>
                  <a data-name="Button" id="hero-btn" href={availHref} className="el-hero_btn uppercase inline-block" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(11px, 1.35vw, 19px)', letterSpacing: '0.26em', border: '1.5px solid currentColor', padding: 'clamp(12px, 1.5vw, 20px) clamp(26px, 4.4vw, 62px)', marginTop: 'clamp(14px, 2.2vw, 32px)' }}>{btnT}</a>
                </div>
              </header>
            </>
          )
        })()}
        {page === 'home' && tpl === 'sage' && (() => {
          const SF = "'Cormorant Garamond', 'Playfair Display', Georgia, serif"
          const SC = "'Pinyon Script', 'Great Vibes', cursive"
          const txt = (r as any).site_settings?.text ?? {}
          const tag = String(txt.sg_tag ?? '').trim() || 'Candid photography\nfor real love stories.'
          const recent = String(txt.sg_recent ?? '').trim() || 'Recent Sessions'
          const btnT = String(txt.hero_btn ?? '').trim() || 'Book now'
          const mtn = (bgc: string, fgc: string) => (
            <div className="absolute inset-0" style={{ background: bgc }}>
              <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
                <circle cx="300" cy="58" r="16" fill={fgc} opacity="0.55" />
                <path d="M0 200 L105 82 L165 142 L238 62 L400 200 Z" fill={fgc} opacity="0.8" />
              </svg>
            </div>
          )
          const covers = realGalleries.map((g) => photoUrl((g.photos.find((x: any) => x.id === g.cover_photo_id) ?? g.photos[0])?.storage_path)).filter(Boolean) as string[]
          const rest = realGalleries.flatMap((g) => g.photos.map((x: any) => photoUrl(x?.storage_path))).filter(Boolean) as string[]
          const pics = Array.from(new Set([...covers, ...rest])).slice(0, 4)
          const ph = (u: string | undefined) => (u ? <img src={u} alt="" className="absolute inset-0 h-full w-full object-cover" /> : mtn('#d8cdbf', '#b8aa98'))
          return (
            <>
              <header data-name="Cover" id="top" style={{ background: '#fff', color: ink, fontFamily: SF }}>
                <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400;1,500&family=Pinyon+Script&display=swap" />
                <div className="grid grid-cols-1 md:grid-cols-[32.5%_35.1%_32.4%]" style={{ minHeight: 360 }}>
                  <div className="relative overflow-hidden" style={{ background: '#d8cdbf', minHeight: 260 }}>
                    {shownHero.length === 0 ? <div data-name="Cover image" className="absolute inset-0">{mtn('#d8cdbf', '#b8aa98')}</div> : heroImg('absolute inset-0 h-full w-full')}
                  </div>
                  <div data-name="Menu bar" id="nav" className="flex flex-col items-center text-center" style={{ background: bg, padding: 'clamp(16px, 2.6vw, 38px) 4% clamp(20px, 3vw, 44px)' }}>
                    <a href={hrefs.home} data-name="Brand name" className="el-menu_brand block" style={{ fontFamily: SC, fontSize: 'clamp(2.4rem, 4.6vw, 4.2rem)', lineHeight: 1.05, color: ink }}>{brandText}</a>
                    <ul className="flex flex-col items-center" style={{ gap: 'clamp(8px, 1.6vw, 24px)', marginTop: 'clamp(16px, 2.6vw, 38px)' }}>
                      {navItems.map((n) => (
                        <li key={n.key}>
                          <a href={n.href} className="el-menu_links uppercase" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(11px, 1.25vw, 17px)', letterSpacing: '0.34em', color: t.menu.linkColor ?? ink }}>{n.label}</a>
                        </li>
                      ))}
                    </ul>
                    <h1 data-name="Tagline" className="el-sg_tag" style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 500, fontSize: 'clamp(1.4rem, 2.7vw, 2.5rem)', lineHeight: 1.15, whiteSpace: 'pre-line', marginTop: 'clamp(24px, 4.4vw, 64px)' }}>{tag}</h1>
                    <a data-name="Button" id="hero-btn" href={availHref} className="el-hero_btn uppercase inline-block" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(10px, 1.2vw, 16px)', letterSpacing: '0.3em', background: '#2f2d1f', color: '#fff', padding: 'clamp(10px, 1.3vw, 18px) clamp(22px, 3vw, 42px)', marginTop: 'clamp(16px, 2.6vw, 38px)' }}>{btnT}</a>
                  </div>
                  <div data-name="Photo" className="relative overflow-hidden" style={{ background: '#d8cdbf', minHeight: 260 }}>{ph(pics[0])}</div>
                </div>
                <div className="text-center" style={{ padding: 'clamp(12px, 1.6vw, 22px) 3% clamp(18px, 2.6vw, 38px)' }}>
                  <h2 data-name="Heading" className="el-sg_recent" style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 500, fontSize: 'clamp(1.6rem, 3.1vw, 2.9rem)', lineHeight: 1.1 }}>{recent}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 'clamp(8px, 1.3vw, 18px)', marginTop: 'clamp(12px, 1.8vw, 26px)' }}>
                    {[1, 2, 3].map((k) => (
                      <div key={k} data-name={'Photo ' + k} className="relative w-full overflow-hidden" style={{ aspectRatio: '1.67 / 1', background: '#d8cdbf' }}>{ph(pics[k])}</div>
                    ))}
                  </div>
                </div>
              </header>
            </>
          )
        })()}
        {page === 'home' && tpl === 'rose' && (() => {
          const SF = "'Lora', 'Cormorant Garamond', Georgia, serif"
          const SC = "'Pinyon Script', 'Great Vibes', cursive"
          const txt = (r as any).site_settings?.text ?? {}
          const heading = String((r as any).site_headline ?? '').trim() || 'Honest, Heartfelt Photography for Real Life'
          const script = String(txt.ro_script ?? '').trim() || 'Photography'
          const btnT = String(txt.hero_btn ?? '').trim() || 'Book now'
          const caps = [
            String(txt.ro_c1 ?? '').trim() || 'Weddings',
            String(txt.ro_c2 ?? '').trim() || 'Families',
            String(txt.ro_c3 ?? '').trim() || 'Portraits',
          ]
          const mtn = (bgc: string, fgc: string) => (
            <div className="absolute inset-0" style={{ background: bgc }}>
              <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
                <circle cx="300" cy="58" r="16" fill={fgc} opacity="0.55" />
                <path d="M0 200 L105 82 L165 142 L238 62 L400 200 Z" fill={fgc} opacity="0.8" />
              </svg>
            </div>
          )
          const covers = realGalleries.map((g) => photoUrl((g.photos.find((x: any) => x.id === g.cover_photo_id) ?? g.photos[0])?.storage_path)).filter(Boolean) as string[]
          const rest = realGalleries.flatMap((g) => g.photos.map((x: any) => photoUrl(x?.storage_path))).filter(Boolean) as string[]
          const pics = Array.from(new Set([...covers, ...rest])).slice(0, 3)
          return (
            <>
              <header data-name="Cover" id="top" className="overflow-x-hidden" style={{ background: bg, color: ink, fontFamily: SF }}>
                <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600&family=Pinyon+Script&display=swap" />
                <div data-name="Menu bar" id="nav" className="flex flex-wrap items-center justify-between gap-3" style={{ padding: '14px 3.6% 0' }}>
                  <a href={hrefs.home} data-name="Brand name" className="el-menu_brand" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(1.8rem, 3.5vw, 3.2rem)', lineHeight: 1.1, color: ink }}>{brandText}</a>
                  <ul className="flex flex-wrap" style={{ gap: '6px clamp(12px, 2.1vw, 30px)' }}>
                    {navItems.map((n) => (
                      <li key={n.key}>
                        <a href={n.href} className="el-menu_links uppercase" style={{ fontFamily: SF, fontWeight: 600, fontSize: 'clamp(10px, 1.15vw, 16px)', letterSpacing: '0.1em', color: t.menu.linkColor ?? ink }}>{n.label}</a>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="relative mx-auto" style={{ width: 'min(39.5%, 560px)', minWidth: 240, aspectRatio: '1 / 1', marginTop: 'clamp(-20px, -1vw, 0px)' }}>
                  <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: '50%', background: '#d9a9ab' }}>
                    {shownHero.length === 0 ? <div data-name="Cover image" className="absolute inset-0">{mtn('#d9a9ab', '#b9777c')}</div> : heroImg('absolute inset-0 h-full w-full')}
                  </div>
                  <p data-name="Script word" className="el-ro_script absolute" style={{ fontFamily: SC, fontSize: 'clamp(2.4rem, 6.2vw, 6rem)', lineHeight: 1, color: accent, left: '-26%', top: '72%', whiteSpace: 'nowrap' }}>{script}</p>
                </div>
                <div className="text-center" style={{ padding: 'clamp(12px, 1.8vw, 26px) 4% 0' }}>
                  <h1 style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(1.4rem, 3vw, 2.9rem)', lineHeight: 1.15, color: ink }}>{heading}</h1>
                  <a data-name="Button" id="hero-btn" href={availHref} className="el-hero_btn uppercase inline-block" style={{ fontFamily: SF, fontWeight: 600, fontSize: 'clamp(11px, 1.3vw, 18px)', letterSpacing: '0.2em', background: accent, color: '#fff', padding: 'clamp(10px, 1.2vw, 16px) clamp(24px, 3.6vw, 52px)', marginTop: 'clamp(12px, 1.6vw, 22px)' }}>{btnT}</a>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 mx-auto" style={{ width: '78.6%', marginTop: 'clamp(16px, 2.4vw, 34px)', paddingBottom: 'clamp(18px, 2.4vw, 34px)' }}>
                  {[0, 1, 2].map((k) => (
                    <div key={k} className="text-center">
                      <div data-name={'Photo ' + (k + 1)} className="relative mx-auto overflow-hidden" style={{ width: '72%', aspectRatio: '1 / 1', borderRadius: '50%', background: '#d9a9ab' }}>
                        {pics[k] ? <img src={pics[k]} alt="" className="absolute inset-0 h-full w-full object-cover" /> : mtn('#d9a9ab', '#b9777c')}
                      </div>
                      <p data-name="Caption" className={'el-ro_c' + (k + 1) + ' uppercase'} style={{ fontFamily: SF, fontWeight: 600, fontSize: 'clamp(11px, 1.4vw, 19px)', letterSpacing: '0.2em', marginTop: 'clamp(8px, 1vw, 14px)' }}>{caps[k]}</p>
                    </div>
                  ))}
                </div>
              </header>
            </>
          )
        })()}
        {page === 'home' && tpl === 'hazel' && (() => {
          const SF = "'Cormorant Garamond', 'Playfair Display', Georgia, serif"
          const txt = (r as any).site_settings?.text ?? {}
          const g = (k: string, d: string) => String(txt[k] ?? '').trim() || d
          const heading = String((r as any).site_headline ?? '').trim() || 'Celebrate This Chapter\nYour Way'
          const kicker = g('hz_kicker', 'Senior portraits')
          const para = g('hz_para', 'Natural, personality-filled portraits that capture who you are right now and the milestone you\u2019ve earned.')
          const btnT = g('hero_btn', 'Book a session')
          const quote = g('hz_quote', '\u201CThe whole experience was easy, fun, and the photos are incredible.\u201D')
          const name = g('hz_name', 'Mason R.')
          const mtn = (bgc: string, fgc: string) => (
            <div className="absolute inset-0" style={{ background: bgc }}>
              <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
                <circle cx="300" cy="58" r="16" fill={fgc} opacity="0.55" />
                <path d="M0 200 L105 82 L165 142 L238 62 L400 200 Z" fill={fgc} opacity="0.8" />
              </svg>
            </div>
          )
          const covers = realGalleries.map((g2) => photoUrl((g2.photos.find((x: any) => x.id === g2.cover_photo_id) ?? g2.photos[0])?.storage_path)).filter(Boolean) as string[]
          const rest = realGalleries.flatMap((g2) => g2.photos.map((x: any) => photoUrl(x?.storage_path))).filter(Boolean) as string[]
          const pics = Array.from(new Set([...covers, ...rest])).slice(0, 2)
          const ph = (u: string | undefined) => (u ? <img src={u} alt="" className="absolute inset-0 h-full w-full object-cover" /> : mtn('#d8cdbf', '#b8aa98'))
          const CARD = '#ead9c9'
          return (
            <>
              <header data-name="Cover" id="top" style={{ background: '#fff', color: ink, fontFamily: SF }}>
                <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&display=swap" />
                <div data-name="Menu bar" id="nav" className="text-center" style={{ padding: 'clamp(10px, 2vw, 28px) 3% 0' }}>
                  <a href={hrefs.home} data-name="Brand name" className="el-menu_brand block" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(2.2rem, 5.2vw, 4.9rem)', lineHeight: 1.1, color: ink }}>{brandText}</a>
                  <ul className="flex flex-wrap justify-center" style={{ gap: '8px clamp(16px, 3.4vw, 50px)', margin: 'clamp(10px, 1.8vw, 26px) 0 clamp(16px, 3vw, 44px)' }}>
                    {navItems.map((n) => (
                      <li key={n.key}>
                        <a href={n.href} className="el-menu_links uppercase" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(11px, 1.3vw, 18px)', letterSpacing: '0.24em', color: t.menu.linkColor ?? ink }}>{n.label}</a>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 3, padding: '0 2.8%' }}>
                  <div className="relative md:col-span-2 overflow-hidden" style={{ aspectRatio: '5.7 / 1', minHeight: 130, background: '#d8cdbf' }}>
                    {shownHero.length === 0 ? <div data-name="Cover image" className="absolute inset-0">{mtn('#d8cdbf', '#b8aa98')}</div> : heroImg('absolute inset-0 h-full w-full')}
                  </div>
                  <div className="flex flex-col items-center justify-center text-center" style={{ background: CARD, padding: 'clamp(16px, 2.4vw, 34px) 6%', minHeight: 170 }}>
                    <p data-name="Small line" className="el-hz_kicker uppercase" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(10px, 1.2vw, 17px)', letterSpacing: '0.3em' }}>{kicker}</p>
                    <h1 style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(1.6rem, 3.4vw, 3.2rem)', lineHeight: 1.1, whiteSpace: 'pre-line', margin: 'clamp(8px, 1vw, 14px) 0 clamp(12px, 1.6vw, 22px)' }}>{heading}</h1>
                    <a data-name="Button" id="hero-btn" href={availHref} className="el-hero_btn uppercase inline-block" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(10px, 1.2vw, 16px)', letterSpacing: '0.24em', background: '#4a3020', color: '#fff', padding: 'clamp(9px, 1.1vw, 15px) clamp(22px, 3.2vw, 46px)' }}>{btnT}</a>
                  </div>
                  <div data-name="Photo 1" className="relative overflow-hidden" style={{ minHeight: 170, background: '#d8cdbf' }}>{ph(pics[0])}</div>
                  <div data-name="Photo 2" className="relative overflow-hidden" style={{ minHeight: 170, background: '#d8cdbf' }}>{ph(pics[1])}</div>
                  <div className="flex items-center" style={{ background: CARD, padding: 'clamp(16px, 2.4vw, 34px) 8%', minHeight: 170 }}>
                    <p data-name="Paragraph" className="el-hz_para" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(15px, 1.9vw, 26px)', lineHeight: 1.35, maxWidth: '78%' }}>{para}</p>
                  </div>
                </div>
                <div className="text-center" style={{ padding: 'clamp(18px, 2.6vw, 38px) 5% clamp(22px, 3vw, 44px)' }}>
                  <p data-name="Quote" className="el-hz_quote mx-auto" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(1.2rem, 2.9vw, 2.7rem)', lineHeight: 1.2, maxWidth: '40ch' }}>{quote}</p>
                  <p aria-hidden="true" style={{ fontSize: 'clamp(1.2rem, 2.6vw, 2.4rem)', letterSpacing: '0.18em', color: '#4a3020', marginTop: 'clamp(8px, 1.2vw, 16px)' }}>{'\u2605\u2605\u2605\u2605\u2605'}</p>
                  <p data-name="Name" className="el-hz_name uppercase" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(11px, 1.3vw, 18px)', letterSpacing: '0.3em', marginTop: 'clamp(6px, 1vw, 14px)' }}>{name}</p>
                </div>
              </header>
            </>
          )
        })()}
        {page === 'home' && tpl === 'saffron' && (() => {
          const SF = "'Cormorant Garamond', 'Playfair Display', Georgia, serif"
          const txt = (r as any).site_settings?.text ?? {}
          const g = (k: string, d: string) => String(txt[k] ?? '').trim() || d
          const names = [g('sf_n1', 'Weddings'), g('sf_n2', 'Portraits'), g('sf_n3', 'Families'), g('sf_n4', 'Elopements')]
          const caps = [g('sf_c1', 'Weddings'), g('sf_c2', 'Portraits'), g('sf_c3', 'Families')]
          const mtn = (bgc: string, fgc: string) => (
            <div className="absolute inset-0" style={{ background: bgc }}>
              <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
                <circle cx="300" cy="58" r="16" fill={fgc} opacity="0.55" />
                <path d="M0 200 L105 82 L165 142 L238 62 L400 200 Z" fill={fgc} opacity="0.8" />
              </svg>
            </div>
          )
          const covers = realGalleries.map((g2) => photoUrl((g2.photos.find((x: any) => x.id === g2.cover_photo_id) ?? g2.photos[0])?.storage_path)).filter(Boolean) as string[]
          const rest = realGalleries.flatMap((g2) => g2.photos.map((x: any) => photoUrl(x?.storage_path))).filter(Boolean) as string[]
          const pics = Array.from(new Set([...covers, ...rest])).slice(0, 3)
          return (
            <>
              <header data-name="Cover" id="top" style={{ background: bg, color: ink, fontFamily: SF }}>
                <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400;1,500&display=swap" />
                <div className="grid grid-cols-1 md:grid-cols-[39.5%_60.5%]">
                  <div data-name="Menu bar" id="nav" className="flex flex-col justify-between" style={{ padding: 'clamp(14px, 2.6vw, 38px) 3% clamp(14px, 2.4vw, 34px) 4.3%' }}>
                    <div>
                      <a href={hrefs.home} data-name="Brand name" className="el-menu_brand block" style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 500, fontSize: 'clamp(2rem, 4.4vw, 4.2rem)', lineHeight: 1.1, color: ink }}>{brandText}</a>
                      <div style={{ marginTop: 'clamp(4px, 0.6vw, 10px)' }}>
                        {names.map((n, k) => (
                          <a key={k} href={hrefs.galleries ?? availHref} className="flex items-baseline" style={{ gap: 'clamp(14px, 2.4vw, 36px)', padding: 'clamp(8px, 1.1vw, 16px) 0 clamp(8px, 1.1vw, 16px) 2%', borderTop: k > 0 ? '1px solid #a79d92' : 'none', color: ink }}>
                            <span style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(1.1rem, 2.5vw, 2.4rem)' }}>{'0' + (k + 1)}</span>
                            <span data-name="Service" className={'el-sf_n' + (k + 1)} style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(2rem, 4.6vw, 4.4rem)', lineHeight: 1.05 }}>{n}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                    <ul className="flex flex-wrap" style={{ gap: '6px clamp(10px, 1.6vw, 22px)', marginTop: 'clamp(18px, 3vw, 44px)' }}>
                      {navItems.map((n) => (
                        <li key={n.key}>
                          <a href={n.href} className="el-menu_links uppercase" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(9px, 1vw, 14px)', letterSpacing: '0.12em', color: t.menu.linkColor ?? ink }}>{n.label}</a>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="relative overflow-hidden" style={{ background: '#d8cdbf', minHeight: 300 }}>
                    {shownHero.length === 0 ? <div data-name="Cover image" className="absolute inset-0">{mtn('#d8cdbf', '#b8aa98')}</div> : heroImg('absolute inset-0 h-full w-full')}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 'clamp(8px, 1.4vw, 20px)', padding: 'clamp(16px, 2.9vw, 41px) 3.7% clamp(18px, 2.4vw, 34px)' }}>
                  {[0, 1, 2].map((k) => (
                    <div key={k}>
                      <div data-name={'Photo ' + (k + 1)} className="relative w-full overflow-hidden" style={{ aspectRatio: '1.54 / 1', background: '#d8cdbf' }}>
                        {pics[k] ? <img src={pics[k]} alt="" className="absolute inset-0 h-full w-full object-cover" /> : mtn('#d8cdbf', '#b8aa98')}
                      </div>
                      <p data-name="Caption" className={'el-sf_c' + (k + 1) + ' uppercase text-center'} style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(11px, 1.3vw, 18px)', letterSpacing: '0.3em', marginTop: 'clamp(8px, 1vw, 14px)' }}>{caps[k]}</p>
                    </div>
                  ))}
                </div>
              </header>
            </>
          )
        })()}
        {page === 'home' && tpl === 'cypress' && (() => {
          const SF = "'Cormorant Garamond', 'Playfair Display', Georgia, serif"
          const txt = (r as any).site_settings?.text ?? {}
          const g = (k: string, d: string) => String(txt[k] ?? '').trim() || d
          const heading = String((r as any).site_headline ?? '').trim() || 'Real People.\nMeaningful Moments.'
          const btnT = g('hero_btn', 'Book now')
          const tag = g('cy_tag', 'Timeless photography for life\u2019s biggest chapters.')
          const cols = [g('cy_s1', 'Capture\nyour story'), g('cy_s2', 'Preserve\nthe moments'), g('cy_s3', 'Relive\nthe feeling')]
          const mtn = (bgc: string, fgc: string) => (
            <div className="absolute inset-0" style={{ background: bgc }}>
              <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
                <circle cx="300" cy="58" r="16" fill={fgc} opacity="0.55" />
                <path d="M0 200 L105 82 L165 142 L238 62 L400 200 Z" fill={fgc} opacity="0.8" />
              </svg>
            </div>
          )
          const covers = realGalleries.map((g2) => photoUrl((g2.photos.find((x: any) => x.id === g2.cover_photo_id) ?? g2.photos[0])?.storage_path)).filter(Boolean) as string[]
          const rest = realGalleries.flatMap((g2) => g2.photos.map((x: any) => photoUrl(x?.storage_path))).filter(Boolean) as string[]
          const pics = Array.from(new Set([...covers, ...rest])).slice(0, 1)
          return (
            <>
              <header data-name="Cover" id="top" style={{ background: '#fff', color: ink, fontFamily: SF }}>
                <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&display=swap" />
                <div className="relative w-full overflow-hidden" style={{ aspectRatio: '1.76 / 1', minHeight: 460, background: '#c9b9a8' }}>
                  {shownHero.length === 0 ? <div data-name="Cover image" className="absolute inset-0">{mtn('#c9b9a8', '#a8978a')}</div> : heroImg('absolute inset-0 h-full w-full')}
                  <div data-name="Menu bar" id="nav" className="absolute flex flex-wrap items-center justify-between gap-3" style={{ left: '3.9%', right: '3.9%', top: '2.7%', background: bg, borderRadius: 9999, padding: 'clamp(8px, 1vw, 14px) clamp(18px, 3vw, 48px)' }}>
                    <a href={hrefs.home} data-name="Brand name" className="el-menu_brand" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(1.5rem, 3.2vw, 3rem)', lineHeight: 1.1, color: ink }}>{brandText}</a>
                    <ul className="flex flex-wrap" style={{ gap: '6px clamp(12px, 2.8vw, 40px)' }}>
                      {navItems.map((n) => (
                        <li key={n.key}>
                          <a href={n.href} className="el-menu_links uppercase" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(10px, 1.2vw, 17px)', letterSpacing: '0.14em', color: t.menu.linkColor ?? ink }}>{n.label}</a>
                        </li>
                      ))}
                    </ul>
                    <a data-name="Button" id="hero-btn" href={availHref} className="el-hero_btn uppercase" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(10px, 1.1vw, 15px)', letterSpacing: '0.2em', background: '#2f1f18', color: '#fff', borderRadius: 9999, padding: 'clamp(8px, 1vw, 14px) clamp(18px, 2.4vw, 34px)' }}>{btnT}</a>
                  </div>
                  <h1 className="absolute" style={{ left: '4.6%', bottom: '8.5%', maxWidth: '62%', fontFamily: SF, fontWeight: 500, fontSize: 'clamp(2rem, 5.6vw, 5.4rem)', lineHeight: 0.98, color: '#fff', whiteSpace: 'pre-line', textShadow: '0 1px 18px rgba(0,0,0,0.25)' }}>{heading}</h1>
                  <div data-name="Photo" className="absolute overflow-hidden" style={{ right: '3.9%', bottom: '3.7%', width: '29.5%', aspectRatio: '1.48 / 1', border: 'clamp(4px, 0.7vw, 10px) solid #fff', background: '#d8cdbf' }}>
                    {pics[0] ? <img src={pics[0]} alt="" className="absolute inset-0 h-full w-full object-cover" /> : mtn('#d8cdbf', '#b8aa98')}
                  </div>
                </div>
                <div className="text-center" style={{ padding: 'clamp(14px, 2.2vw, 32px) 4% 0' }}>
                  <h2 data-name="Tagline" className="el-cy_tag" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(1.5rem, 3.6vw, 3.4rem)', lineHeight: 1.1 }}>{tag}</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3" style={{ padding: 'clamp(22px, 3.6vw, 52px) 4% clamp(26px, 3.6vw, 52px)' }}>
                  {cols.map((c, k) => (
                    <div key={k} className="text-center" style={{ padding: '6px 4%', borderLeft: k > 0 ? '1px solid #b9b2aa' : 'none' }}>
                      <p style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(13px, 1.7vw, 24px)', letterSpacing: '0.2em' }}>{'0' + (k + 1)}</p>
                      <p data-name="Label" className={'el-cy_s' + (k + 1) + ' uppercase'} style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(12px, 1.7vw, 24px)', letterSpacing: '0.24em', lineHeight: 1.45, whiteSpace: 'pre-line', marginTop: 'clamp(8px, 1.2vw, 16px)' }}>{c}</p>
                    </div>
                  ))}
                </div>
              </header>
            </>
          )
        })()}
        {page === 'home' && tpl === 'laurel' && (() => {
          const SF = "'Cormorant Garamond', 'Playfair Display', Georgia, serif"
          const txt = (r as any).site_settings?.text ?? {}
          const g = (k: string, d: string) => String(txt[k] ?? '').trim() || d
          const heading = String((r as any).site_headline ?? '').trim() || 'Looks like you'
          const vert = g('la_vert', 'Personal branding and headshots')
          const para = g('la_para', 'Professional headshots and branding photos that feel authentic and confident.')
          const btnT = g('hero_btn', 'Book a session')
          const mtn = (bgc: string, fgc: string) => (
            <div className="absolute inset-0" style={{ background: bgc }}>
              <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
                <circle cx="300" cy="58" r="16" fill={fgc} opacity="0.55" />
                <path d="M0 200 L105 82 L165 142 L238 62 L400 200 Z" fill={fgc} opacity="0.8" />
              </svg>
            </div>
          )
          const covers = realGalleries.map((g2) => photoUrl((g2.photos.find((x: any) => x.id === g2.cover_photo_id) ?? g2.photos[0])?.storage_path)).filter(Boolean) as string[]
          const rest = realGalleries.flatMap((g2) => g2.photos.map((x: any) => photoUrl(x?.storage_path))).filter(Boolean) as string[]
          const pics = Array.from(new Set([...covers, ...rest])).slice(0, 2)
          const ph = (u: string | undefined) => (u ? <img src={u} alt="" className="absolute inset-0 h-full w-full object-cover" /> : mtn('#cfc4b8', '#b0a496'))
          return (
            <>
              <header data-name="Cover" id="top" style={{ background: bg, color: ink, fontFamily: SF }}>
                <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&display=swap" />
                <div data-name="Menu bar" id="nav" className="flex flex-wrap items-center justify-between gap-3" style={{ padding: '12px 4.4% 10px 5.4%' }}>
                  <a href={hrefs.home} data-name="Brand name" className="el-menu_brand" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(2rem, 4.6vw, 4.3rem)', lineHeight: 1.1, color: ink }}>{brandText}</a>
                  <ul className="flex flex-wrap" style={{ gap: '6px clamp(14px, 2.6vw, 38px)' }}>
                    {navItems.map((n) => (
                      <li key={n.key}>
                        <a href={n.href} className="el-menu_links uppercase" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(10px, 1.2vw, 17px)', letterSpacing: '0.2em', color: t.menu.linkColor ?? ink }}>{n.label}</a>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="relative">
                  <div className="hidden md:flex flex-col items-center absolute" style={{ left: '1.7%', top: '2.4%', bottom: 0, width: 24 }}>
                    <p data-name="Side text" className="el-la_vert uppercase" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontFamily: SF, fontWeight: 500, fontSize: 'clamp(10px, 1.1vw, 15px)', letterSpacing: '0.32em', whiteSpace: 'nowrap' }}>{vert}</p>
                    <div style={{ width: 1, height: 'clamp(30px, 4vw, 56px)', background: ink, marginTop: 'clamp(10px, 1.6vw, 22px)' }} />
                  </div>
                  <div style={{ margin: '0 4.7% 0 5.8%' }}>
                    <div className="relative w-full overflow-hidden" style={{ aspectRatio: '1.95 / 1', minHeight: 300, background: '#b3aca5' }}>
                      {shownHero.length === 0 ? <div data-name="Cover image" className="absolute inset-0">{mtn('#b3aca5', '#928b84')}</div> : heroImg('absolute inset-0 h-full w-full')}
                      <a data-name="Button" id="hero-btn" href={availHref} className="el-hero_btn absolute uppercase" style={{ left: '3.2%', bottom: '4.5%', fontFamily: SF, fontWeight: 500, fontSize: 'clamp(11px, 1.3vw, 18px)', letterSpacing: '0.26em', color: '#fff', border: '2px solid #fff', padding: 'clamp(9px, 1.1vw, 16px) clamp(18px, 2.4vw, 34px)' }}>{btnT}</a>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-[29.1%_26%_1fr]" style={{ gap: 'clamp(8px, 1vw, 14px)', marginTop: 'clamp(14px, 2.4vw, 34px)', paddingBottom: 'clamp(20px, 3vw, 44px)' }}>
                      <div data-name="Photo 1" className="relative overflow-hidden" style={{ aspectRatio: '1.457 / 1', background: '#cfc4b8' }}>{ph(pics[0])}</div>
                      <div data-name="Photo 2" className="relative overflow-hidden" style={{ minHeight: 150, background: '#cfc4b8' }}>{ph(pics[1])}</div>
                      <div className="flex flex-col justify-center" style={{ paddingLeft: 'clamp(8px, 2.6vw, 36px)' }}>
                        <h1 style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(2rem, 4.6vw, 4.4rem)', lineHeight: 1.05 }}>{heading}</h1>
                        <p data-name="Paragraph" className="el-la_para" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(14px, 1.8vw, 25px)', lineHeight: 1.5, opacity: 0.7, marginTop: 'clamp(8px, 1.2vw, 18px)', maxWidth: '34ch' }}>{para}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </header>
            </>
          )
        })()}
        {page === 'home' && tpl === 'iris' && (() => {
          const SF = "'Cormorant Garamond', 'Playfair Display', Georgia, serif"
          const txt = (r as any).site_settings?.text ?? {}
          const g = (k: string, d: string) => String(txt[k] ?? '').trim() || d
          const left = g('ir_l', 'Modern\nLove Stories')
          const right = g('ir_r', 'Timeless\nPortraits')
          const issue = g('ir_issue', 'In this issue')
          const cut = String((r as any).site_settings?.hero_cutout ?? '').trim()
          const labels = [g('ir_t1', 'The\nwedding\nexperience'), g('ir_t2', 'Portraits\nwith\npurpose'), g('ir_t3', 'The\ndetails\nthat matter')]
          const btnT = g('hero_btn', 'Book a session')
          const mtn = (bgc: string, fgc: string) => (
            <div className="absolute inset-0" style={{ background: bgc }}>
              <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
                <circle cx="300" cy="58" r="16" fill={fgc} opacity="0.55" />
                <path d="M0 200 L105 82 L165 142 L238 62 L400 200 Z" fill={fgc} opacity="0.8" />
              </svg>
            </div>
          )
          const covers = realGalleries.map((g2) => photoUrl((g2.photos.find((x: any) => x.id === g2.cover_photo_id) ?? g2.photos[0])?.storage_path)).filter(Boolean) as string[]
          const rest = realGalleries.flatMap((g2) => g2.photos.map((x: any) => photoUrl(x?.storage_path))).filter(Boolean) as string[]
          const pics = Array.from(new Set([...covers, ...rest])).slice(0, 3)
          return (
            <>
              <header data-name="Cover" id="top" style={{ background: '#fff', color: ink, fontFamily: SF }}>
                <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400;1,500&display=swap" />
                <div className="relative w-full overflow-hidden" style={{ aspectRatio: '1.82 / 1', minHeight: 460, background: '#8d8174', isolation: 'isolate' }}>
                  {shownHero.length === 0 ? <div data-name="Cover image" className="absolute inset-0">{mtn('#8d8174', '#a99c8d')}</div> : heroImg('absolute inset-0 h-full w-full')}
                  <div data-name="Menu bar" id="nav" className="absolute text-center" style={{ left: 0, right: 0, top: 0 }}>
                    <a href={hrefs.home} data-name="Brand name" className="el-menu_brand uppercase block" style={{ fontFamily: SF, fontWeight: 400, position: 'relative', zIndex: 1, fontSize: 'clamp(5rem, 25vw, 26rem)', letterSpacing: '0.14em', lineHeight: 0.92, color: '#fff', paddingLeft: '0.14em' }}>{brandText}</a>
                    <ul className="flex flex-wrap justify-center" style={{ position: 'relative', zIndex: 3, gap: '6px clamp(16px, 5.4vw, 76px)', marginTop: 'clamp(2px, 0.6vw, 8px)' }}>
                      {navItems.map((n) => (
                        <li key={n.key}>
                          <a href={n.href} className="el-menu_links uppercase" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(10px, 1.25vw, 17px)', letterSpacing: '0.24em', color: t.menu.linkColor ?? '#fff' }}>{n.label}</a>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {cut ? <img data-name="Cutout" src={cut} alt="" className="absolute inset-0 h-full w-full object-cover pointer-events-none" style={{ zIndex: 2 }} /> : null}
                  <h2 data-name="Left words" className="el-ir_l absolute" style={{ zIndex: 3, left: '3.6%', top: '53%', fontFamily: SF, fontStyle: 'italic', fontWeight: 500, fontSize: 'clamp(1.6rem, 4.2vw, 4rem)', lineHeight: 0.98, color: '#fff', whiteSpace: 'pre-line' }}>{left}</h2>
                  <h2 data-name="Right words" className="el-ir_r absolute text-right" style={{ zIndex: 3, right: '3.1%', top: '52%', fontFamily: SF, fontStyle: 'italic', fontWeight: 500, fontSize: 'clamp(1.6rem, 4.2vw, 4rem)', lineHeight: 0.98, color: '#fff', whiteSpace: 'pre-line' }}>{right}</h2>
                  <a data-name="Button" id="hero-btn" href={availHref} className="el-hero_btn absolute uppercase" style={{ zIndex: 3, left: '4.6%', bottom: '6.8%', fontFamily: SF, fontWeight: 500, fontSize: 'clamp(11px, 1.3vw, 18px)', letterSpacing: '0.24em', background: '#fff', color: '#2a211a', padding: 'clamp(10px, 1.4vw, 20px) clamp(20px, 2.8vw, 40px)' }}>{btnT}</a>
                </div>
                <div style={{ padding: 'clamp(10px, 1.6vw, 22px) 4.6% clamp(20px, 2.6vw, 38px)' }}>
                  <div className="flex items-center" style={{ gap: 'clamp(14px, 3vw, 44px)' }}>
                    <div className="flex-1" style={{ height: 1, background: '#b3b0ad' }} />
                    <h2 data-name="Heading" className="el-ir_issue uppercase" style={{ fontFamily: SF, fontWeight: 600, fontSize: 'clamp(13px, 1.9vw, 27px)', letterSpacing: '0.34em', whiteSpace: 'nowrap' }}>{issue}</h2>
                    <div className="flex-1" style={{ height: 1, background: '#b3b0ad' }} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 'clamp(14px, 2vw, 28px)', marginTop: 'clamp(14px, 2.2vw, 32px)' }}>
                    {[0, 1, 2].map((k) => (
                      <div key={k} className="flex items-start justify-between" style={{ gap: 'clamp(8px, 1.2vw, 16px)' }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 500, fontSize: 'clamp(2.2rem, 5vw, 4.8rem)', lineHeight: 1 }}>{'0' + (k + 1)}</p>
                          <div style={{ width: 'clamp(30px, 3.8vw, 54px)', height: 1, background: '#7d7873', margin: 'clamp(8px, 1.2vw, 16px) 0' }} />
                          <p data-name="Label" className={'el-ir_t' + (k + 1) + ' uppercase'} style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(10px, 1.25vw, 17px)', letterSpacing: '0.2em', lineHeight: 1.55, whiteSpace: 'pre-line' }}>{labels[k]}</p>
                        </div>
                        <div data-name={'Photo ' + (k + 1)} className="relative overflow-hidden" style={{ width: '47%', aspectRatio: '0.95 / 1', background: '#d8cdbf', flexShrink: 0 }}>
                          {pics[k] ? <img src={pics[k]} alt="" className="absolute inset-0 h-full w-full object-cover" /> : mtn('#d8cdbf', '#b8aa98')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </header>
            </>
          )
        })()}
        {page === 'home' && tpl === 'poppy' && (() => {
          const SF = "'Cormorant Garamond', 'Playfair Display', Georgia, serif"
          const txt = (r as any).site_settings?.text ?? {}
          const g = (k: string, d: string) => String(txt[k] ?? '').trim() || d
          const heading = String((r as any).site_headline ?? '').trim() || 'Poppy Reel'
          const kicker = g('pr_kicker', 'A film by')
          const btnT = g('hero_btn', 'Book a session')
          const caps = [g('pr_c1', 'Weddings'), g('pr_c2', 'Portraits'), g('pr_c3', 'Details'), g('pr_c4', 'Films')]
          const GOLD = '#d9b45a'
          const mtn = (bgc: string, fgc: string) => (
            <div className="absolute inset-0" style={{ background: bgc }}>
              <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
                <circle cx="300" cy="58" r="16" fill={fgc} opacity="0.55" />
                <path d="M0 200 L105 82 L165 142 L238 62 L400 200 Z" fill={fgc} opacity="0.8" />
              </svg>
            </div>
          )
          const covers = realGalleries.map((g2) => photoUrl((g2.photos.find((x: any) => x.id === g2.cover_photo_id) ?? g2.photos[0])?.storage_path)).filter(Boolean) as string[]
          const rest = realGalleries.flatMap((g2) => g2.photos.map((x: any) => photoUrl(x?.storage_path))).filter(Boolean) as string[]
          const pics = Array.from(new Set([...covers, ...rest])).slice(0, 4)
          return (
            <>
              <header data-name="Cover" id="top" style={{ background: bg, color: ink, fontFamily: SF }}>
                <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&display=swap" />
                <div data-name="Menu bar" id="nav" className="flex flex-wrap items-center justify-between gap-3" style={{ padding: '14px 3.9% 16px 4%' }}>
                  <a href={hrefs.home} data-name="Brand name" className="el-menu_brand" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(2rem, 4.4vw, 4.1rem)', lineHeight: 1.1, color: ink }}>{brandText}</a>
                  <ul className="flex flex-wrap" style={{ gap: '6px clamp(14px, 3vw, 44px)' }}>
                    {navItems.map((n) => (
                      <li key={n.key}>
                        <a href={n.href} className="el-menu_links uppercase" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(10px, 1.2vw, 17px)', letterSpacing: '0.2em', color: t.menu.linkColor ?? ink }}>{n.label}</a>
                      </li>
                    ))}
                  </ul>
                </div>
                <div style={{ padding: '0 2.9%' }}>
                  <div className="relative w-full overflow-hidden" style={{ aspectRatio: '2.66 / 1', minHeight: 220, background: '#241d17' }}>
                    {shownHero.length === 0 ? <div data-name="Cover image" className="absolute inset-0">{mtn('#241d17', '#4a3d31')}</div> : heroImg('absolute inset-0 h-full w-full')}
                  </div>
                </div>
                <div className="text-center" style={{ padding: 'clamp(14px, 2.2vw, 32px) 4% 0' }}>
                  <p data-name="Small line" className="el-pr_kicker uppercase" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(11px, 1.5vw, 21px)', letterSpacing: '0.42em' }}>{kicker}</p>
                  <h1 className="uppercase" style={{ fontFamily: SF, fontWeight: 400, fontSize: 'clamp(2.2rem, 5.6vw, 5.4rem)', letterSpacing: '0.12em', lineHeight: 1.1, marginTop: 'clamp(2px, 0.5vw, 8px)' }}>{heading}</h1>
                  <a data-name="Button" id="hero-btn" href={availHref} className="el-hero_btn uppercase inline-block" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(11px, 1.4vw, 19px)', letterSpacing: '0.3em', color: GOLD, border: '1.5px solid ' + GOLD, padding: 'clamp(10px, 1.3vw, 18px) clamp(22px, 3.4vw, 48px)', marginTop: 'clamp(12px, 2vw, 28px)' }}>{btnT}</a>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: 'clamp(6px, 1.2vw, 16px)', padding: 'clamp(18px, 3vw, 44px) 3.9% clamp(18px, 2.4vw, 34px)' }}>
                  {[0, 1, 2, 3].map((k) => (
                    <div key={k}>
                      <div data-name={'Photo ' + (k + 1)} className="relative w-full overflow-hidden" style={{ aspectRatio: '1.84 / 1', background: '#241d17' }}>
                        {pics[k] ? <img src={pics[k]} alt="" className="absolute inset-0 h-full w-full object-cover" /> : mtn('#241d17', '#4a3d31')}
                      </div>
                      <p data-name="Caption" className={'el-pr_c' + (k + 1) + ' uppercase text-center'} style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(10px, 1.2vw, 17px)', letterSpacing: '0.34em', marginTop: 'clamp(8px, 1vw, 14px)' }}>{caps[k]}</p>
                    </div>
                  ))}
                </div>
              </header>
            </>
          )
        })()}
        {page === 'home' && tpl === 'thistle' && (() => {
          const SF = "'Cormorant Garamond', 'Playfair Display', Georgia, serif"
          const txt = (r as any).site_settings?.text ?? {}
          const g = (k: string, d: string) => String(txt[k] ?? '').trim() || d
          const heading = String((r as any).site_headline ?? '').trim() || 'Weddings,\nPeople, and\nReal Moments'
          const btnT = g('hero_btn', 'Book a session')
          const tag = g('th_tag', 'Real love, honestly photographed')
          const PLUM = '#430a3b'
          const CREAM = '#fbf1de'
          const mtn = (bgc: string, fgc: string) => (
            <div className="absolute inset-0" style={{ background: bgc }}>
              <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
                <circle cx="300" cy="58" r="16" fill={fgc} opacity="0.55" />
                <path d="M0 200 L105 82 L165 142 L238 62 L400 200 Z" fill={fgc} opacity="0.8" />
              </svg>
            </div>
          )
          const covers = realGalleries.map((g2) => photoUrl((g2.photos.find((x: any) => x.id === g2.cover_photo_id) ?? g2.photos[0])?.storage_path)).filter(Boolean) as string[]
          const rest = realGalleries.flatMap((g2) => g2.photos.map((x: any) => photoUrl(x?.storage_path))).filter(Boolean) as string[]
          const pics = Array.from(new Set([...covers, ...rest])).slice(0, 4)
          return (
            <>
              <header data-name="Cover" id="top" style={{ background: bg, color: ink, fontFamily: SF }}>
                <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400;1,500&display=swap" />
                <div className="relative w-full overflow-hidden md:aspect-[1.87/1]" style={{ background: '#d8cdbf' }}>
                  <div className="relative md:absolute md:inset-0" style={{ aspectRatio: undefined, minHeight: 260 }}>
                    {shownHero.length === 0 ? <div data-name="Cover image" className="absolute inset-0">{mtn('#d8cdbf', '#b8aa98')}</div> : heroImg('absolute inset-0 h-full w-full')}
                  </div>
                  <div data-name="Menu bar" id="nav" className="relative md:absolute md:inset-0 md:[clip-path:polygon(0_0,55.6%_0,29.1%_100%,0_100%)]" style={{ background: PLUM, color: CREAM, padding: 'clamp(16px, 2.6vw, 38px) 3.4% clamp(24px, 3vw, 44px)' }}>
                    <div className="md:w-[50%]">
                      <a href={hrefs.home} data-name="Brand name" className="el-menu_brand block" style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 500, fontSize: 'clamp(2rem, 4.4vw, 4.1rem)', lineHeight: 1.1, color: CREAM }}>{brandText}</a>
                      <ul className="flex flex-wrap" style={{ gap: '6px clamp(10px, 1.9vw, 28px)', marginTop: 'clamp(6px, 1vw, 14px)' }}>
                        {navItems.map((n) => (
                          <li key={n.key}>
                            <a href={n.href} className="el-menu_links uppercase" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(9px, 1.05vw, 15px)', letterSpacing: '0.16em', color: t.menu.linkColor ?? CREAM }}>{n.label}</a>
                          </li>
                        ))}
                      </ul>
                      <h1 style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(2.2rem, 5.2vw, 5rem)', lineHeight: 1.02, whiteSpace: 'pre-line', color: CREAM, marginTop: 'clamp(24px, 5vw, 76px)' }}>{heading}</h1>
                      <a data-name="Button" id="hero-btn" href={availHref} className="el-hero_btn uppercase inline-block" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(11px, 1.4vw, 19px)', letterSpacing: '0.22em', color: CREAM, border: '2px solid ' + CREAM, padding: 'clamp(10px, 1.3vw, 18px) clamp(20px, 2.4vw, 34px)', marginTop: 'clamp(18px, 3.4vw, 50px)' }}>{btnT}</a>
                    </div>
                  </div>
                </div>
                <div className="text-center" style={{ padding: 'clamp(12px, 2vw, 28px) 3% 0' }}>
                  <h2 data-name="Tagline" className="el-th_tag" style={{ fontFamily: SF, fontStyle: 'italic', fontWeight: 500, fontSize: 'clamp(1.4rem, 3vw, 2.8rem)', lineHeight: 1.1 }}>{tag}</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: 'clamp(6px, 1vw, 14px)', padding: 'clamp(14px, 2.4vw, 34px) 2.4% clamp(18px, 2.4vw, 34px)' }}>
                  {[0, 1, 2, 3].map((k) => (
                    <div key={k} data-name={'Photo ' + (k + 1)} className="relative w-full overflow-hidden" style={{ aspectRatio: '1.35 / 1', background: '#d8cdbf' }}>
                      {pics[k] ? <img src={pics[k]} alt="" className="absolute inset-0 h-full w-full object-cover" /> : mtn('#d8cdbf', '#b8aa98')}
                    </div>
                  ))}
                </div>
              </header>
            </>
          )
        })()}
        {page === 'home' && tpl === 'clover' && (() => {
          const SF = "'Lora', 'Cormorant Garamond', Georgia, serif"
          const SI = "'Cormorant Garamond', 'Playfair Display', Georgia, serif"
          const SC = "'Allura', 'Pinyon Script', cursive"
          const SH = "'Reenie Beanie', 'Caveat', cursive"
          const txt = (r as any).site_settings?.text ?? {}
          const g = (k: string, d: string) => String(txt[k] ?? '').trim() || d
          const heading = String((r as any).site_headline ?? '').trim() || 'Candid Love Stories'
          const btnT = g('hero_btn', 'Book Now')
          const sub = g('cl_sub', 'Every moment, framed')
          const caps = [g('cl_p1', 'my person'), g('cl_p2', 'still laughing'), g('cl_p3', 'engaged \u2661'), g('cl_p4', 'us, always'), g('cl_p5', 'future together')]
          const labs = [g('cl_t1', 'Couples'), g('cl_t2', 'Engagements'), g('cl_t3', 'Weddings')]
          const mtn = (bgc: string, fgc: string) => (
            <div className="absolute inset-0" style={{ background: bgc }}>
              <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
                <circle cx="300" cy="58" r="16" fill={fgc} opacity="0.55" />
                <path d="M0 200 L105 82 L165 142 L238 62 L400 200 Z" fill={fgc} opacity="0.8" />
              </svg>
            </div>
          )
          const covers = realGalleries.map((g2) => photoUrl((g2.photos.find((x: any) => x.id === g2.cover_photo_id) ?? g2.photos[0])?.storage_path)).filter(Boolean) as string[]
          const rest = realGalleries.flatMap((g2) => g2.photos.map((x: any) => photoUrl(x?.storage_path))).filter(Boolean) as string[]
          const pics = Array.from(new Set([...covers, ...rest])).slice(0, 5)
          // [left%, top%, width%, rotate, polaroid aspect, z]
          const pol: [number, number, number, number, number, number][] = [
            [1.9, 18.3, 18.8, -8, 0.68, 1],
            [17.5, 12.5, 18.1, -4, 0.66, 2],
            [34.9, 2.5, 30.4, 0, 0.87, 4],
            [63.8, 14, 17.5, 3, 0.66, 2],
            [79.2, 23, 19.5, 7, 0.68, 1],
          ]
          return (
            <>
              <header data-name="Cover" id="top" style={{ background: bg, color: ink, fontFamily: SF }}>
                <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lora:wght@400;500&family=Cormorant+Garamond:ital,wght@0,500;1,400;1,500&family=Allura&family=Reenie+Beanie&display=swap" />
                <div data-name="Menu bar" id="nav" className="text-center" style={{ padding: 'clamp(6px, 1vw, 14px) 3% 0' }}>
                  <a href={hrefs.home} data-name="Brand name" className="el-menu_brand block" style={{ fontFamily: SC, fontSize: 'clamp(2.8rem, 6.4vw, 6rem)', lineHeight: 1.05, color: ink }}>{brandText}</a>
                  <ul className="flex flex-wrap justify-center" style={{ gap: '8px clamp(16px, 3.4vw, 50px)', margin: 'clamp(6px, 1vw, 14px) 0 clamp(14px, 2.6vw, 38px)' }}>
                    {navItems.map((n) => (
                      <li key={n.key}>
                        <a href={n.href} className="el-menu_links" style={{ fontFamily: SF, fontWeight: 400, fontSize: 'clamp(12px, 1.8vw, 25px)', letterSpacing: '0.04em', color: t.menu.linkColor ?? ink }}>{n.label}</a>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="relative w-full overflow-hidden" style={{ aspectRatio: '2.7 / 1', minHeight: 230 }}>
                  {pol.map((q, k) => (
                    <div key={k} data-name={'Photo ' + (k + 1)} className="absolute" style={{ left: q[0] + '%', top: q[1] + '%', width: q[2] + '%', aspectRatio: String(q[4]), transform: 'rotate(' + q[3] + 'deg)', zIndex: q[5], background: '#f6f1ea', boxShadow: '0 6px 18px rgba(60,40,20,0.22)', padding: '4.2% 4.2% 0' }}>
                      <div className="relative w-full overflow-hidden" style={{ height: '78%', background: '#d8cdbf' }}>
                        {k === 2 && shownHero.length > 0 ? heroImg('absolute inset-0 h-full w-full') : (pics[k] ? <img src={pics[k]} alt="" className="absolute inset-0 h-full w-full object-cover" /> : mtn('#d8cdbf', '#b8aa98'))}
                      </div>
                      <p data-name="Caption" className={'el-cl_p' + (k + 1) + ' text-center'} style={{ fontFamily: SH, fontSize: 'clamp(14px, 1.9vw, 27px)', lineHeight: 1, color: ink, marginTop: '5%' }}>{caps[k]}</p>
                    </div>
                  ))}
                </div>
                <div className="text-center" style={{ padding: 'clamp(8px, 2vw, 28px) 4% 0' }}>
                  <h1 style={{ fontFamily: SI, fontStyle: 'italic', fontWeight: 500, fontSize: 'clamp(2.4rem, 6vw, 5.7rem)', lineHeight: 1.05 }}>{heading}</h1>
                  <a data-name="Button" id="hero-btn" href={availHref} className="el-hero_btn inline-block" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(13px, 1.9vw, 26px)', letterSpacing: '0.04em', background: '#3a2518', color: '#fff', padding: 'clamp(10px, 1.4vw, 20px) clamp(28px, 4.6vw, 66px)', marginTop: 'clamp(14px, 2.4vw, 34px)' }}>{btnT}</a>
                  <h2 data-name="Subheading" className="el-cl_sub" style={{ fontFamily: SI, fontStyle: 'italic', fontWeight: 500, fontSize: 'clamp(1.4rem, 3vw, 2.8rem)', lineHeight: 1.1, marginTop: 'clamp(24px, 4vw, 58px)' }}>{sub}</h2>
                </div>
                <div className="mx-auto" style={{ width: '60.7%', borderTop: '1px solid #3a2518', marginTop: 'clamp(6px, 1vw, 14px)', paddingTop: 'clamp(8px, 1.2vw, 16px)', paddingBottom: 'clamp(20px, 2.6vw, 38px)' }}>
                  <div className="flex justify-around">
                    {labs.map((l, k) => (
                      <p key={k} data-name="Label" className={'el-cl_t' + (k + 1) + ' uppercase'} style={{ fontFamily: SF, fontWeight: 400, fontSize: 'clamp(10px, 1.25vw, 17px)', letterSpacing: '0.24em' }}>{l}</p>
                    ))}
                  </div>
                </div>
              </header>
            </>
          )
        })()}
        {page === 'home' && tpl === 'mimosa' && (() => {
          const SF = "'Cormorant Garamond', 'Playfair Display', Georgia, serif"
          const txt = (r as any).site_settings?.text ?? {}
          const g = (k: string, d: string) => String(txt[k] ?? '').trim() || d
          const heading = String((r as any).site_headline ?? '').trim() || 'Renewing\nOur Vows'
          const labs = [g('mi_t1', 'Engagement'), g('mi_t2', 'Wedding day'), g('mi_t3', 'Reception'), g('mi_t4', 'Anniversary')]
          const mtn = (bgc: string, fgc: string) => (
            <div className="absolute inset-0" style={{ background: bgc }}>
              <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
                <circle cx="300" cy="58" r="16" fill={fgc} opacity="0.55" />
                <path d="M0 200 L105 82 L165 142 L238 62 L400 200 Z" fill={fgc} opacity="0.8" />
              </svg>
            </div>
          )
          const covers = realGalleries.map((g2) => photoUrl((g2.photos.find((x: any) => x.id === g2.cover_photo_id) ?? g2.photos[0])?.storage_path)).filter(Boolean) as string[]
          const rest = realGalleries.flatMap((g2) => g2.photos.map((x: any) => photoUrl(x?.storage_path))).filter(Boolean) as string[]
          const pics = Array.from(new Set([...covers, ...rest])).slice(0, 4)
          return (
            <>
              <header data-name="Cover" id="top" style={{ background: bg, color: ink, fontFamily: SF }}>
                <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&display=swap" />
                <div data-name="Menu bar" id="nav" className="flex flex-wrap items-center justify-between gap-3" style={{ padding: '12px 4.6% 12px 4.6%' }}>
                  <a href={hrefs.home} data-name="Brand name" className="el-menu_brand" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(2rem, 4.6vw, 4.3rem)', lineHeight: 1.1, color: ink }}>{brandText}</a>
                  <ul className="flex flex-wrap" style={{ gap: '6px clamp(14px, 2.8vw, 40px)' }}>
                    {navItems.map((n) => (
                      <li key={n.key}>
                        <a href={n.href} className="el-menu_links uppercase" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(10px, 1.25vw, 17px)', letterSpacing: '0.16em', color: t.menu.linkColor ?? ink }}>{n.label}</a>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="relative w-full overflow-hidden" style={{ aspectRatio: '2.32 / 1', minHeight: 300, background: '#cdbca8' }}>
                  {shownHero.length === 0 ? <div data-name="Cover image" className="absolute inset-0">{mtn('#cdbca8', '#ad9a85')}</div> : heroImg('absolute inset-0 h-full w-full')}
                  <h1 className="absolute" style={{ left: '4.6%', bottom: '10.5%', fontFamily: SF, fontWeight: 500, fontSize: 'clamp(2.2rem, 6.2vw, 5.9rem)', lineHeight: 0.98, color: '#fff', whiteSpace: 'pre-line', textShadow: '0 1px 18px rgba(0,0,0,0.2)' }}>{heading}</h1>
                </div>
                <div style={{ padding: 'clamp(14px, 2.6vw, 38px) 4.3% clamp(20px, 2.8vw, 40px)' }}>
                  <div className="relative">
                    <div className="hidden md:block absolute" style={{ left: '12.5%', right: '12.5%', top: 5, height: 1, background: ink }} />
                    <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: 'clamp(8px, 2.2vw, 31px)' }}>
                      {[0, 1, 2, 3].map((k) => (
                        <div key={k} className="text-center">
                          <div className="hidden md:block mx-auto" style={{ width: 11, height: 11, borderRadius: '50%', background: ink, position: 'relative' }} />
                          <p data-name="Label" className={'el-mi_t' + (k + 1) + ' uppercase'} style={{ fontFamily: SF, fontWeight: 600, fontSize: 'clamp(10px, 1.4vw, 19px)', letterSpacing: '0.24em', margin: 'clamp(8px, 1.4vw, 20px) 0 clamp(10px, 1.4vw, 20px)' }}>{labs[k]}</p>
                          <div data-name={'Photo ' + (k + 1)} className="relative w-full overflow-hidden" style={{ aspectRatio: '1.3 / 1', background: '#d8cdbf' }}>
                            {pics[k] ? <img src={pics[k]} alt="" className="absolute inset-0 h-full w-full object-cover" /> : mtn('#d8cdbf', '#b8aa98')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </header>
            </>
          )
        })()}
        {page === 'home' && tpl === 'yarrow' && (() => {
          const SF = "'Cormorant Garamond', 'Playfair Display', Georgia, serif"
          const SC = "'Pinyon Script', 'Great Vibes', cursive"
          const txt = (r as any).site_settings?.text ?? {}
          const g = (k: string, d: string) => String(txt[k] ?? '').trim() || d
          const date = String((r as any).site_headline ?? '').trim() || '06.14'
          const script = g('ya_script', 'your day, beautifully kept')
          const btnT = g('hero_btn', 'Book your date')
          const month = g('ya_month', 'June')
          const head = g('ya_head', 'Check my dates')
          const para = g('ya_para', 'See what\u2019s available and find the perfect day for your session.')
          const link = g('ya_link', 'View availability')
          const GOLD = '#b8892f'
          const circled = [14, 18, 27]
          const crossed = [6, 21]
          const days = Array.from({ length: 30 }, (_, k) => k + 1)
          const mtn = (bgc: string, fgc: string) => (
            <div className="absolute inset-0" style={{ background: bgc }}>
              <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
                <circle cx="300" cy="58" r="16" fill={fgc} opacity="0.55" />
                <path d="M0 200 L105 82 L165 142 L238 62 L400 200 Z" fill={fgc} opacity="0.8" />
              </svg>
            </div>
          )
          return (
            <>
              <header data-name="Cover" id="top" style={{ background: '#fff', color: ink, fontFamily: SF }}>
                <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,400&family=Pinyon+Script&display=swap" />
                <div className="relative w-full overflow-hidden" style={{ aspectRatio: '1.83 / 1', minHeight: 480, background: '#9a7455' }}>
                  {shownHero.length === 0 ? <div data-name="Cover image" className="absolute inset-0">{mtn('#9a7455', '#b8946f')}</div> : heroImg('absolute inset-0 h-full w-full')}
                  <div data-name="Menu bar" id="nav" className="absolute flex flex-wrap items-center justify-between gap-3" style={{ left: 0, right: 0, top: 0, padding: 'clamp(10px, 1.6vw, 22px) 4.2%' }}>
                    <a href={hrefs.home} data-name="Brand name" className="el-menu_brand uppercase" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(1.6rem, 3.2vw, 3rem)', letterSpacing: '0.14em', lineHeight: 1.1, color: '#fff' }}>{brandText}</a>
                    <ul className="flex flex-wrap" style={{ gap: '6px clamp(12px, 2.6vw, 38px)' }}>
                      {navItems.map((n) => (
                        <li key={n.key}>
                          <a href={n.href} className="el-menu_links uppercase" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(10px, 1.15vw, 16px)', letterSpacing: '0.18em', color: t.menu.linkColor ?? '#fff' }}>{n.label}</a>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="absolute text-center" style={{ left: 0, right: 0, top: '47%' }}>
                    <h1 style={{ fontFamily: SF, fontWeight: 300, fontSize: 'clamp(4rem, 19vw, 19rem)', lineHeight: 0.95, color: '#fff', letterSpacing: '0.01em' }}>{date}</h1>
                    <p data-name="Script line" className="el-ya_script" style={{ fontFamily: SC, fontSize: 'clamp(1.6rem, 4.2vw, 4rem)', lineHeight: 1, color: '#fff', marginTop: 'clamp(-14px, -1.2vw, 0px)' }}>{script}</p>
                    <a data-name="Button" id="hero-btn" href={availHref} className="el-hero_btn uppercase inline-block" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(11px, 1.4vw, 19px)', letterSpacing: '0.3em', color: '#fff', border: '1.5px solid #fff', padding: 'clamp(10px, 1.3vw, 18px) clamp(24px, 4vw, 58px)', marginTop: 'clamp(14px, 2.4vw, 34px)' }}>{btnT}</a>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2" style={{ padding: 'clamp(14px, 2.2vw, 30px) 0 clamp(24px, 3.4vw, 50px)' }}>
                  <div style={{ padding: '0 8% 0 8.9%' }}>
                    <p data-name="Month" className="el-ya_month uppercase" style={{ fontFamily: SF, fontWeight: 600, fontSize: 'clamp(1.1rem, 2.1vw, 2rem)', letterSpacing: '0.26em', marginBottom: 'clamp(6px, 1vw, 14px)' }}>{month}</p>
                    <div className="grid grid-cols-7 text-center" style={{ maxWidth: 520, rowGap: 'clamp(4px, 0.8vw, 12px)' }}>
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                        <span key={d} className="uppercase" style={{ fontFamily: SF, fontWeight: 600, fontSize: 'clamp(8px, 0.95vw, 13px)', letterSpacing: '0.12em', paddingBottom: 4 }}>{d}</span>
                      ))}
                      {days.map((d) => (
                        <span key={d} className="relative inline-flex items-center justify-center mx-auto" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(12px, 1.5vw, 21px)', width: 'clamp(26px, 3.4vw, 48px)', height: 'clamp(26px, 3.2vw, 46px)', border: circled.includes(d) ? '2px solid ' + GOLD : '2px solid transparent', borderRadius: '50%' }}>
                          {d}
                          {crossed.includes(d) ? <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center" style={{ color: '#8a8a8a', fontSize: 'clamp(16px, 2.2vw, 30px)', fontWeight: 300 }}>{'\u2715'}</span> : null}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="md:border-l flex flex-col justify-center" style={{ borderColor: '#a9a6a3', padding: '0 7% 0 5.8%', marginTop: 'clamp(10px, 2vw, 0px)' }}>
                    <h2 data-name="Heading" className="el-ya_head" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(2rem, 4.4vw, 4.2rem)', lineHeight: 1.05 }}>{head}</h2>
                    <p data-name="Paragraph" className="el-ya_para" style={{ fontFamily: SF, fontWeight: 500, fontSize: 'clamp(14px, 1.8vw, 25px)', lineHeight: 1.5, opacity: 0.7, marginTop: 'clamp(8px, 1.2vw, 18px)', maxWidth: '36ch' }}>{para}</p>
                    <a data-name="Link" href={availHref} className="el-ya_link uppercase inline-block" style={{ fontFamily: SF, fontWeight: 600, fontSize: 'clamp(11px, 1.4vw, 19px)', letterSpacing: '0.24em', borderBottom: '2px solid currentColor', paddingBottom: 3, marginTop: 'clamp(14px, 2.2vw, 32px)', alignSelf: 'flex-start' }}>{link}</a>
                  </div>
                </div>
              </header>
            </>
          )
        })()}
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
