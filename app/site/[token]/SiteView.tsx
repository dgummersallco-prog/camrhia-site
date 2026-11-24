'use client'
import { sitePackagesOf, groupBySession } from '@/lib/sitePackages'
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
import { applyPhotoFx, applyBtnFx, applyBoxFx, applySecAccent } from '@/lib/photoFx'
import { GalleriesSection, GALSEC, GALOWN, GalleryGarnet } from './GalleriesSections'
import { SiteNav } from './SiteNav'
import { Addons } from './Addons'

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
  useEffect(() => { applyPhotoFx((r as any).site_settings?.photoFx, (r as any).site_settings?.slotPics, photoUrl); applyBtnFx((r as any).site_settings?.btnFx); applyBoxFx((r as any).site_settings?.boxFx); document.body.dataset.camGroups = JSON.stringify((r as any).site_settings?.boxGroups ?? []); applySecAccent((r as any).site_settings?.secStyle, accent) })

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
  const shownHero = heroUrls.slice(0, 1)
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
  const ownPkgs = sitePackagesOf(r)
  const realPkgs = ((ownPkgs.length > 0 ? ownPkgs : (r.site_packages ?? [])) as { id: string; title: string; price: string | null; description: string | null; session_type?: string | null }[]).map((pk) => {
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
    about: on('about') && (isPreview || !!(t.text.about || r.bio || aboutPhoto)),
    portfolio: page === 'galleries' ? (isPreview || galleries.length > 0) : on('portfolio') && galleries.length > 0,
    galsec: on('galsec') && (isPreview || galleries.length > 0),
    pricesec: on('pricesec') && sitePkgs.length > 0,
    investment: on('investment') && sitePkgs.length > 0,
    testimonials: on('testimonials') && quotesShown.length > 0,
    faq: on('faq') && faq.length > 0,
    contact: true,
    explore: true,
    aboutcta: on('aboutcta'),
    social: isPreview || ['instagram_url', 'facebook_url', 'pinterest_url', 'tiktok_url'].some((k) => !!(r as any)[k] && !t.socialHidden.includes(k)),
  }
  for (const c of t.customs) showMap[c.id] = on(c.id)
  const pageOrder: string[] = page === 'home' ? t.orderHome : page === 'about' ? t.orderAbout : page === 'galleries' ? t.orderGalleries : (t.extraPages.find((e) => e.id === page)?.sections ?? [])
  const visible = pageOrder.filter((k) => showMap[k])

  for (const e of t.extraPages) hrefs[e.id] = `${base}/p/${e.id}${qs}`
  hrefs.blog = `${base}/blog${qs}`
  const blogOn = blogPosts((r as any).site_settings).length > 0 || (isPreview && !!(r as any).site_settings?.structure && !t.pagesOff.includes('blog'))
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
  const secZoom = (((r as any).site_settings?.secZoom ?? {}) as Record<string, number>)
  const slotPics = (((r as any).site_settings?.slotPics ?? {}) as Record<string, string>)
  const curSec = { k: '' }
  const spo = (id: string, k: number, d: any): any => (slotPics[id + ':' + k] ? photoUrl(slotPics[id + ':' + k]) : null) || d
  const secStyles = (((r as any).site_settings?.secStyle ?? {}) as Record<string, { bg?: string; accent?: string; text?: string; head?: string; body?: string; title?: string; titleFont?: string; pt?: number; pb?: number }>)
  const famOf = (k?: string) => (k && FONT_OPTIONS[k] ? FONT_OPTIONS[k].family : null)
  const hexOk = (v?: string) => (v && /^#[0-9a-fA-F]{3,8}$/.test(v) ? v : null)
  const pageBg = page === 'galleries' ? hexOk(secStyles.portfolio?.bg) : page === 'about' ? hexOk(secStyles.about?.bg) : null
  const secCss = Object.entries(secStyles).map(([id, v]) => {
    if (!v || !/^[A-Za-z0-9_-]+$/.test(id)) return ''
    const rules: string[] = []
    if (hexOk(v.bg) && id !== 'nav') rules.push('background:' + hexOk(v.bg) + ' !important')
    if (hexOk(v.text)) rules.push('color:' + hexOk(v.text) + ' !important')
    if (famOf(v.body)) rules.push('font-family:' + famOf(v.body) + ' !important')
    const pad = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 800 ? Math.round(n) : null)
    if (pad(v.pt) !== null) rules.push('padding-top:' + pad(v.pt) + 'px !important')
    if (pad(v.pb) !== null) rules.push('padding-bottom:' + pad(v.pb) + 'px !important')
    let css = rules.length ? '#' + id + ' {' + rules.join(';') + '}' : ''
    if (hexOk(v.bg) && id !== 'nav') css += '[data-secbg="' + id + '"] section {background:' + hexOk(v.bg) + ' !important}'
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
    const base = src.length === 0 ? [] : Array.from({ length: n }, (_, i) => src[i % src.length])
    const sk = curSec.k
    if (!sk || !Object.keys(slotPics).some((x) => x.startsWith(sk + ':'))) return base
    return Array.from({ length: n }, (_, i) => (slotPics[sk + ':' + i] ? ((photoUrl(slotPics[sk + ':' + i]) as string) || '') : (base[i] ?? '')))
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

  const sec = (id: string, title: string | null, children: React.ReactNode, tinted: boolean, flush = false, base?: string) => (
    <section id={id} className={'scroll-mt-16' + (title === null && page === 'home' ? ' px-4 md:px-6' : ' px-6')} style={{ background: tinted ? tint : base, paddingTop: flush ? 0 : title === null && page === 'home' ? 'calc(var(--space) / 2)' : 'var(--space)', paddingBottom: flush ? 0 : title === null && page === 'home' ? 'calc(var(--space) / 2)' : 'var(--space)' }}>
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
        if (sd === 'coral' && (socials.length > 0 || isPreview)) {
          const txt = (kk: string, d: string) => String((r as any).site_settings?.text?.[kk] ?? d)
          const list = socials.length > 0 ? socials : [
            { key: 'instagram_url', label: 'Instagram', url: '#' },
            { key: 'facebook_url', label: 'Facebook', url: '#' },
            { key: 'pinterest_url', label: 'Pinterest', url: '#' },
            { key: 'tiktok_url', label: 'TikTok', url: '#' },
            { key: 'youtube_url', label: 'YouTube', url: '#' },
          ]
          const icon = (key: string) => {
            const c = { fill: 'none', stroke: 'currentColor', strokeWidth: 2 }
            if (key === 'instagram_url') return <svg viewBox="0 0 24 24" width="100%" height="100%"><rect x="3.5" y="3.5" width="17" height="17" rx="5" {...c} /><circle cx="12" cy="12" r="4" {...c} /><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" /></svg>
            if (key === 'facebook_url') return <svg viewBox="0 0 24 24" width="100%" height="100%"><path fill="currentColor" d="M14 8.5V7c0-.7.2-1 1.1-1H17V3h-2.6C11.6 3 10.5 4.5 10.5 6.8v1.7H8v3h2.5V21H14v-9.5h2.6l.4-3z" /></svg>
            if (key === 'pinterest_url') return <svg viewBox="0 0 24 24" width="100%" height="100%"><path fill="currentColor" d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z" /></svg>
            if (key === 'tiktok_url') return <svg viewBox="0 0 24 24" width="100%" height="100%"><path fill="currentColor" d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" /></svg>
            return <svg viewBox="0 0 24 24" width="100%" height="100%"><path fill="currentColor" fillRule="evenodd" d="M6 5h12a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V9a4 4 0 0 1 4-4zm4 3.5v7l6-3.5z" /></svg>
          }
          const hd = handle || (isPreview ? '@lenahartphoto' : '')
          return (
            <section id="social" className="px-6 py-14 text-center">
              <div className="mx-auto flex max-w-4xl items-center justify-center" style={{ gap: 'clamp(14px, 3vw, 44px)' }}>
                <span style={{ flex: '0 1 140px', height: 1, background: line }} />
                <h2 data-name="Heading" className="el-soc_title" style={{ ...headStyle, fontWeight: 400, fontSize: 'clamp(2.2rem, 5.2vw, 4.6rem)', lineHeight: 1.1, margin: 0, color: ink }}>{txt('soc_title', 'Follow along')}</h2>
                <span style={{ flex: '0 1 140px', height: 1, background: line }} />
              </div>
              <div className="flex flex-wrap justify-center" style={{ gap: 'clamp(12px, 2.6vw, 40px)', marginTop: 'clamp(24px, 4vw, 52px)' }}>
                {list.map((x) => (
                  <a key={x.key} href={x.url} target="_blank" rel="noopener noreferrer" aria-label={x.label} className="flex items-center justify-center rounded-full" style={{ width: 'clamp(52px, 8.4vw, 84px)', height: 'clamp(52px, 8.4vw, 84px)', border: `1px solid ${line}`, background: 'rgba(0,0,0,0.035)', color: ink }}>
                    <span style={{ width: '46%', height: '46%', display: 'block' }}>{icon(x.key)}</span>
                  </a>
                ))}
              </div>
              {hd && <p data-name="Handle" className="el-soc_handle" style={{ color: ink, fontWeight: 300, fontSize: 'clamp(1.1rem, 2.4vw, 2.1rem)', letterSpacing: '0.2em', margin: 'clamp(20px, 3vw, 40px) 0 0' }}>{txt('soc_handle', hd)}</p>}
            </section>
          )
        }
        if (sd === 'reef' && (socials.length > 0 || isPreview)) {
          const txt = (kk: string, d: string) => String((r as any).site_settings?.text?.[kk] ?? d)
          const raw: any[] = (pickPics(6) as any) || []
          const src = (q: any) => (typeof q === 'string' ? q : q?.url ?? q?.src ?? q?.thumb ?? q?.path ?? '')
          const pics: any[] = Array.from({ length: 6 }, (_, i) => raw[i] ?? null)
          const hd = handle || (isPreview ? '@lenahartphoto' : '')
          const ig = (socials.find((x: any) => x.key === 'instagram_url') as any)?.url || (socials[0] as any)?.url || '#'
          return (
            <section id="social" className="px-4 py-14 text-center" style={{ color: ink }}>
              <h2 data-name="Heading" className="el-soc_title" style={{ ...headStyle, fontStyle: 'italic', fontWeight: 400, fontSize: 'clamp(2rem, 5.2vw, 4.8rem)', lineHeight: 1.1, margin: 0, color: ink }}>{txt('soc_title', 'Follow along on Instagram')}</h2>
              <div className="mx-auto grid grid-cols-3 md:grid-cols-6" style={{ gap: 'clamp(6px, 1vw, 16px)', marginTop: 'clamp(24px, 5vw, 72px)', maxWidth: 1600 }}>
                {pics.map((q, i) => (
                  <div key={i} style={{ aspectRatio: '0.96 / 1', overflow: 'hidden', background: '#e4e1dc' }}>
                    {q && src(q) ? (
                      <img src={src(q)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    ) : (
                      <svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="xMidYMid slice"><rect width="100" height="100" fill="#e4e1dc" /><path d="M10 72 36 42l14 16 12-14 28 28z" fill="#c9c5be" /><circle cx="68" cy="30" r="6" fill="#c9c5be" /></svg>
                    )}
                  </div>
                ))}
              </div>
              {hd && (
                <a href={ig} target="_blank" rel="noopener noreferrer" data-name="Button" className="el-soc_handle inline-block" style={{ ...headStyle, background: accent, color: '#f6f2ea', borderRadius: 6, padding: 'clamp(14px, 1.8vw, 24px) clamp(36px, 6vw, 92px)', fontSize: 'clamp(1rem, 1.9vw, 1.8rem)', letterSpacing: '0.04em', marginTop: 'clamp(24px, 4vw, 60px)' }}>{txt('soc_handle', 'Follow ' + hd)}</a>
              )}
            </section>
          )
        }
        if (sd === 'ember' && (socials.length > 0 || isPreview)) {
          const txt = (kk: string, d: string) => String((r as any).site_settings?.text?.[kk] ?? d)
          const list = (socials.length > 0 ? socials : [
            { key: 'instagram_url', label: 'Instagram', url: '#' },
            { key: 'facebook_url', label: 'Facebook', url: '#' },
            { key: 'pinterest_url', label: 'Pinterest', url: '#' },
            { key: 'tiktok_url', label: 'TikTok', url: '#' },
          ]).filter((x: any) => x.key !== 'youtube_url')
          const icon = (key: string) => {
            const c = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.4 }
            if (key === 'instagram_url') return <svg viewBox="0 0 24 24" width="100%" height="100%"><rect x="2.5" y="2.5" width="19" height="19" rx="5.5" {...c} /><circle cx="12" cy="12" r="4.4" {...c} /><circle cx="17.4" cy="6.6" r="1.2" fill="currentColor" /></svg>
            if (key === 'facebook_url') return <svg viewBox="0 0 24 24" width="100%" height="100%"><circle cx="12" cy="12" r="11" fill="currentColor" /><path fill="#f8f0ea" d="M13.2 21v-7.6h2.5l.4-3h-2.9V8.6c0-.8.3-1.4 1.5-1.4h1.5V4.5c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.2H7.8v3h2.5V21z" /></svg>
            if (key === 'pinterest_url') return <svg viewBox="0 0 24 24" width="100%" height="100%"><circle cx="12" cy="12" r="11" fill="currentColor" /><path fill="#f8f0ea" d="M12.2 5.2c-3.3 0-5 2.2-5 4.6 0 1.1.6 2.5 1.5 2.9.2.1.3 0 .3-.2l.2-.9c0-.1 0-.2-.1-.3-.3-.4-.5-1-.5-1.7 0-1.6 1.2-3.1 3.3-3.1 1.8 0 3 1.2 3 2.9 0 2-1 3.3-2.200 3.300-.7 0-1.200-.6-1-1.300.2-.8.6-1.700.6-2.300 0-.5-.3-1-.9-1-.7 0-1.300.7-1.300 1.700 0 .6.2 1 .2 1l-.9 3.700c-.1.700 0 1.600 0 1.800h.2c.2-.3 1.100-1.400 1.400-2.600l.5-1.800c.3.500 1 .9 1.800.9 2.300 0 3.900-2.100 3.900-4.800 0-2.100-1.700-4-4.200-4z" /></svg>
            return <svg viewBox="0 0 24 24" width="100%" height="100%"><path fill="currentColor" d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" /></svg>
          }
          const hd = handle || (isPreview ? '@lenahartphoto' : '')
          return (
            <section id="social" className="px-6 py-14" style={{ color: ink }}>
              <div className="mx-auto grid items-center md:grid-cols-2" style={{ maxWidth: 1300, gap: 'clamp(28px, 5vw, 80px)', padding: '0 clamp(0px, 3vw, 48px)' }}>
                <div>
                  <h2 data-name="Heading" className="el-soc_title" style={{ ...headStyle, fontWeight: 400, fontSize: 'clamp(2.6rem, 6.4vw, 6rem)', lineHeight: 1.02, letterSpacing: '-0.02em', margin: 0, color: ink }}>{txt('soc_title', 'Find us on social')}</h2>
                  <span style={{ display: 'block', width: 'clamp(48px, 6vw, 86px)', height: 1, background: ink, margin: 'clamp(20px, 3vw, 40px) 0' }} />
                  {hd && <p data-name="Handle" className="el-soc_handle" style={{ color: ink, fontWeight: 300, fontSize: 'clamp(1rem, 1.9vw, 1.7rem)', letterSpacing: '0.28em', margin: 0 }}>{txt('soc_handle', hd)}</p>}
                </div>
                <div className="flex flex-col" style={{ gap: 'clamp(10px, 1.4vw, 18px)' }}>
                  {list.map((x: any) => (
                    <a key={x.key} href={x.url} target="_blank" rel="noopener noreferrer" className="flex items-center" style={{ border: `1px solid ${accent}`, borderRadius: 999, padding: 'clamp(12px, 1.8vw, 26px) clamp(18px, 3vw, 44px)', color: ink, gap: 'clamp(14px, 2.4vw, 36px)' }}>
                      <span style={{ width: 'clamp(28px, 3.6vw, 48px)', height: 'clamp(28px, 3.6vw, 48px)', display: 'block', flex: 'none' }}>{icon(x.key)}</span>
                      <span style={{ flex: 1, ...headStyle, fontSize: 'clamp(0.95rem, 1.7vw, 1.6rem)', letterSpacing: '0.3em', textTransform: 'uppercase' }}>{x.label}</span>
                      <svg viewBox="0 0 40 16" style={{ width: 'clamp(26px, 3.2vw, 44px)', flex: 'none' }} fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M0 8h38M31 1l7 7-7 7" /></svg>
                    </a>
                  ))}
                </div>
              </div>
            </section>
          )
        }
        if (sd === 'dune' && (socials.length > 0 || isPreview)) {
          const txt = (kk: string, d: string) => String((r as any).site_settings?.text?.[kk] ?? d)
          const list = (socials.length > 0 ? socials : [
            { key: 'instagram_url', label: 'Instagram', url: '#' },
            { key: 'facebook_url', label: 'Facebook', url: '#' },
            { key: 'pinterest_url', label: 'Pinterest', url: '#' },
            { key: 'tiktok_url', label: 'TikTok', url: '#' },
          ]).filter((x: any) => x.key !== 'youtube_url')
          const icon = (key: string) => {
            const c = { fill: 'none', stroke: 'currentColor', strokeWidth: 2 }
            if (key === 'instagram_url') return <svg viewBox="0 0 24 24" width="100%" height="100%"><rect x="3.5" y="3.5" width="17" height="17" rx="5" {...c} /><circle cx="12" cy="12" r="4" {...c} /><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" /></svg>
            if (key === 'facebook_url') return <svg viewBox="0 0 24 24" width="100%" height="100%"><path fill="currentColor" d="M14 8.5V7c0-.7.2-1 1.1-1H17V3h-2.6C11.6 3 10.5 4.5 10.5 6.8v1.7H8v3h2.5V21H14v-9.5h2.6l.4-3z" /></svg>
            if (key === 'pinterest_url') return <svg viewBox="0 0 24 24" width="100%" height="100%"><path fill="currentColor" d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z" /></svg>
            if (key === 'tiktok_url') return <svg viewBox="0 0 24 24" width="100%" height="100%"><path fill="currentColor" d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" /></svg>
            return <svg viewBox="0 0 24 24" width="100%" height="100%"><path fill="currentColor" fillRule="evenodd" d="M6 5h12a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V9a4 4 0 0 1 4-4zm4 3.5v7l6-3.5z" /></svg>
          }
          const cream = '#f3ebe0'
          return (
            <section id="social" style={{ background: '#2b1a11', color: cream, padding: 'clamp(48px, 9vw, 120px) clamp(20px, 5vw, 80px)' }}>
              <div className="mx-auto flex flex-wrap items-center justify-between" style={{ maxWidth: 1400, gap: 'clamp(20px, 3vw, 40px)' }}>
                <h2 data-name="Heading" className="el-soc_title" style={{ ...headStyle, fontWeight: 400, fontSize: 'clamp(2.1rem, 5.4vw, 5.2rem)', lineHeight: 1.1, margin: 0, color: cream }}>{txt('soc_title', 'Let us stay in touch.')}</h2>
                <div className="flex" style={{ gap: 'clamp(10px, 1.6vw, 26px)' }}>
                  {list.map((x: any) => (
                    <a key={x.key} href={x.url} target="_blank" rel="noopener noreferrer" aria-label={x.label} className="flex items-center justify-center" style={{ width: 'clamp(46px, 5.8vw, 92px)', height: 'clamp(46px, 5.8vw, 92px)', border: `2px solid ${cream}`, borderRadius: '24%', color: cream }}>
                      <span style={{ width: '50%', height: '50%', display: 'block' }}>{icon(x.key)}</span>
                    </a>
                  ))}
                </div>
              </div>
            </section>
          )
        }
        if (sd === 'tide' && (socials.length > 0 || isPreview)) {
          const list = (socials.length > 0 ? socials : [
            { key: 'instagram_url', label: 'Instagram', url: '#' },
            { key: 'facebook_url', label: 'Facebook', url: '#' },
            { key: 'pinterest_url', label: 'Pinterest', url: '#' },
            { key: 'tiktok_url', label: 'TikTok', url: '#' },
          ]).filter((x: any) => x.key !== 'youtube_url').slice(0, 4)
          const raw: any[] = (pickPics(4) as any) || []
          const src = (q: any) => (typeof q === 'string' ? q : q?.url ?? q?.src ?? q?.thumb ?? q?.path ?? '')
          const card = '#fbf8f3'
          const tilt = [-2.5, 1.2, -0.8, 2.4]
          const drop = [0, 10, -8, 12]
          const icon = (key: string) => {
            const c = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.4 }
            if (key === 'instagram_url') return <svg viewBox="0 0 24 24" width="100%" height="100%"><rect x="2.5" y="2.5" width="19" height="19" rx="5.5" {...c} /><circle cx="12" cy="12" r="4.4" {...c} /><circle cx="17.4" cy="6.6" r="1.2" fill="currentColor" /></svg>
            if (key === 'facebook_url') return <svg viewBox="0 0 24 24" width="100%" height="100%"><circle cx="12" cy="12" r="11" fill="currentColor" /><path fill={card} d="M13.2 21v-7.6h2.5l.4-3h-2.9V8.6c0-.8.3-1.4 1.5-1.4h1.5V4.5c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.2H7.8v3h2.5V21z" /></svg>
            if (key === 'pinterest_url') return <svg viewBox="0 0 24 24" width="100%" height="100%"><circle cx="12" cy="12" r="11" fill="currentColor" /><path fill={card} d="M12.2 5.2c-3.3 0-5 2.2-5 4.6 0 1.1.6 2.5 1.5 2.9.2.1.3 0 .3-.2l.2-.9c0-.1 0-.2-.1-.3-.3-.4-.5-1-.5-1.7 0-1.6 1.2-3.1 3.3-3.1 1.8 0 3 1.2 3 2.9 0 2-1 3.3-2.2 3.3-.7 0-1.2-.6-1-1.3.2-.8.6-1.7.6-2.3 0-.5-.3-1-.9-1-.7 0-1.3.7-1.3 1.7 0 .6.2 1 .2 1l-.9 3.7c-.1.7 0 1.6 0 1.8h.2c.2-.3 1.1-1.4 1.4-2.6l.5-1.8c.3.5 1 .9 1.8.9 2.3 0 3.9-2.1 3.9-4.8 0-2.1-1.7-4-4.2-4z" /></svg>
            return <svg viewBox="0 0 24 24" width="100%" height="100%"><path fill="currentColor" d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" /></svg>
          }
          return (
            <section id="social" className="px-5 py-16" style={{ color: ink }}>
              <div className="mx-auto grid grid-cols-2 md:grid-cols-4" style={{ maxWidth: 1500, gap: 'clamp(18px, 2.4vw, 40px)' }}>
                {list.map((x: any, i: number) => (
                  <a key={x.key} href={x.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', background: card, padding: 'clamp(8px, 1.2vw, 18px) clamp(8px, 1.2vw, 18px) 0', boxShadow: '0 6px 18px rgba(60,40,20,0.18)', transform: `rotate(${tilt[i % 4]}deg) translateY(${drop[i % 4]}px)`, color: ink }}>
                    <div style={{ aspectRatio: '1 / 1', overflow: 'hidden', background: '#e4e1dc' }}>
                      {raw[i] && src(raw[i]) ? (
                        <img src={src(raw[i])} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      ) : (
                        <svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="xMidYMid slice"><rect width="100" height="100" fill="#e4e1dc" /><path d="M10 72 36 42l14 16 12-14 28 28z" fill="#c9c5be" /><circle cx="68" cy="30" r="6" fill="#c9c5be" /></svg>
                      )}
                    </div>
                    <div className="flex items-center justify-center" style={{ gap: 'clamp(8px, 1.2vw, 18px)', padding: 'clamp(14px, 2vw, 30px) 0' }}>
                      <span style={{ width: 'clamp(22px, 2.6vw, 38px)', height: 'clamp(22px, 2.6vw, 38px)', display: 'block', flex: 'none' }}>{icon(x.key)}</span>
                      <span style={{ ...headStyle, fontSize: 'clamp(0.7rem, 1.35vw, 1.3rem)', letterSpacing: '0.24em', textTransform: 'uppercase' }}>{x.label}</span>
                    </div>
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
          const out = (node: React.ReactNode) => sec('about', null, node, tinted, false, ad === 'saffron' ? '#ece8e4' : ad === 'cumin' ? '#ebe6e0' : undefined)
          const outF = (node: React.ReactNode) => sec('about', null, node, tinted, true)
          const loves: string[] = Array.isArray(aboutSet?.loves) ? aboutSet.loves.filter(Boolean).slice(0, 5) : []
          const facts: { q: string; a: string }[] = Array.isArray(aboutSet?.facts) ? aboutSet.facts.filter((f: any) => f?.q).slice(0, 8) : []
          const stats: { n: string; l: string }[] = Array.isArray(aboutSet?.stats) ? aboutSet.stats.filter((f: any) => f?.n).slice(0, 4) : []
          if (ad === 'lyra') return out(
            <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-2">
              <div className="overflow-hidden" style={{ aspectRatio: '4/5' }}>{img()}</div>
              <div className="space-y-5">{H()}{P(paras)}<div className="pt-2">{btn()}</div></div>
            </div>)
          if (ad === 'vega') {
            const ph = <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" style={{ width: '100%', height: '100%', display: 'block' }}><rect width="100" height="100" fill="#e4e2de" /><path d="M0 78 L28 42 L44 62 L62 30 L100 78 Z" fill="#c9c6c1" /><circle cx="74" cy="26" r="7" fill="#d3d0cb" /></svg>
            const txt = (k: string, d: string) => String((r as any).site_settings?.text?.[k] ?? d)
            const sf = (headStyle as any).fontFamily
            const row: (string | undefined)[] = [pp[1], pp[2], pp[3]]
            const ratios = ['1.155 / 1', '1 / 1', '1.155 / 1']
            return out(
              <div className="mx-auto max-w-6xl text-center">
                <div className="mx-auto overflow-hidden" style={{ width: 'clamp(220px, 43.5%, 440px)', aspectRatio: '1 / 1', borderRadius: '50%', background: tint }}>{main ? <img src={main} alt="" className="h-full w-full object-cover" style={aboutCrop('side')} /> : ph}</div>
                <h1 data-name="Heading" className="el-ab_h1" style={{ ...headStyle, fontWeight: 400, fontSize: 'clamp(3rem, 9vw, 7.4rem)', lineHeight: 1, margin: 'clamp(4px, 1vw, 12px) 0 clamp(14px, 2.4vw, 32px)', color: ink }}>{txt('ab_h1', 'Hi I am ' + firstName)}</h1>
                <div className="el-about_text mx-auto" data-name="Bio text" style={{ maxWidth: 'min(100%, 720px)' }}>{paras.map((x: string, i: number) => <p key={i} style={{ fontFamily: sf, color: ink, fontSize: 'clamp(1.05rem, 1.9vw, 1.55rem)', lineHeight: 1.4, margin: '0 0 1em' }}>{x}</p>)}</div>
                <div className="grid" style={{ gridTemplateColumns: '1.155fr 1fr 1.155fr', gap: 'clamp(8px, 1.8vw, 18px)', marginTop: 'clamp(28px, 5vw, 64px)' }}>
                  {row.map((src, i) => <div key={i} className="overflow-hidden" style={{ aspectRatio: ratios[i], background: tint }}>{src ? <img src={src} alt="" className="h-full w-full object-cover" /> : ph}</div>)}
                </div>
                <div style={{ marginTop: 'clamp(20px, 3.4vw, 44px)' }}>{btn(true)}</div>
              </div>)
          }
          if (ad === 'orion') {
            const ph = <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" style={{ width: '100%', height: '100%', display: 'block' }}><rect width="100" height="100" fill="#e4e2de" /><path d="M0 78 L28 42 L44 62 L62 30 L100 78 Z" fill="#c9c6c1" /><circle cx="74" cy="26" r="7" fill="#d3d0cb" /></svg>
            const txt = (k: string, d: string) => String((r as any).site_settings?.text?.[k] ?? d)
            const half = Math.ceil(paras.length / 2)
            const colA = paras.slice(0, half)
            const colB = paras.slice(half)
            const sf = (headStyle as any).fontFamily
            const bigName = String(name ?? '').replace(/\s*photography\s*$/i, '')
            const ptxt = (list: string[]) => list.map((x: string, i: number) => <p key={i} style={{ fontFamily: sf, color: ink, fontSize: 'clamp(1.05rem, 1.7vw, 1.4rem)', lineHeight: 1.45, margin: '0 0 1.2em' }}>{x}</p>)
            const hh = (k: string, d: string) => <h2 data-name="Heading" className={'el-' + k} style={{ ...headStyle, fontStyle: 'italic', fontWeight: 400, fontSize: 'clamp(2rem, 3.8vw, 3.2rem)', lineHeight: 1.05, margin: '0 0 clamp(18px, 2.6vw, 34px)', color: ink }}>{txt(k, d)}</h2>
            return out(
              <div className="mx-auto max-w-6xl">
                <div className="relative overflow-hidden" style={{ aspectRatio: '1003 / 765', background: tint }}>
                  {main ? <img src={main} alt="" className="h-full w-full object-cover" style={aboutCrop('side')} /> : ph}
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0) 35%, rgba(0,0,0,0.28) 100%)' }} />
                  <div className="absolute inset-x-0 text-center" style={{ bottom: '8%' }}>
                    <h1 data-name="Heading" className="el-ab_h1" style={{ ...headStyle, fontWeight: 400, fontSize: 'clamp(2.6rem, 9vw, 8rem)', lineHeight: 1, margin: 0, color: '#fff' }}>{txt('ab_h1', bigName)}</h1>
                    <div className="flex items-center justify-center" style={{ gap: 'clamp(12px, 3vw, 40px)', marginTop: 'clamp(8px, 1.6vw, 24px)' }}>
                      <span style={{ width: 'clamp(30px, 10vw, 100px)', height: 1, background: 'rgba(255,255,255,0.7)' }} />
                      <span data-name="Tagline" className="el-ab_tag" style={{ color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5em', fontSize: 'clamp(0.8rem, 2.3vw, 1.7rem)' }}>{txt('ab_tag', 'Photography')}</span>
                      <span style={{ width: 'clamp(30px, 10vw, 100px)', height: 1, background: 'rgba(255,255,255,0.7)' }} />
                    </div>
                  </div>
                </div>
                <div className="grid md:grid-cols-2" style={{ marginTop: 'clamp(28px, 5vw, 64px)' }}>
                  <div style={{ paddingRight: 'clamp(14px, 3.4vw, 56px)' }}><div className="el-about_text" data-name="Bio text">{hh('ab_h2', 'My Story')}{ptxt(colA)}</div></div>
                  <div style={{ borderLeft: `1px solid ${line}`, paddingLeft: 'clamp(14px, 3.4vw, 56px)' }}>{colB.length > 0 && <div className="el-about_text" data-name="Bio text">{hh('ab_h3', 'The Heart Behind My Work')}{ptxt(colB)}</div>}</div>
                </div>
                <div className="text-center" style={{ marginTop: 'clamp(16px, 3vw, 40px)' }}>{btn()}</div>
              </div>)
          }
          if (ad === 'cygnus') {
            const ph = <svg viewBox="0 0 100 95" preserveAspectRatio="xMidYMid slice" style={{ width: '100%', height: '100%', display: 'block' }}><rect width="100" height="95" fill="#e4e2de" /><path d="M0 74 L28 40 L44 58 L62 28 L100 74 Z" fill="#c9c6c1" /><circle cx="74" cy="22" r="7" fill="#d3d0cb" /></svg>
            const txt = (k: string, d: string) => String((r as any).site_settings?.text?.[k] ?? d)
            const shots = [{ u: main, ar: '0.8 / 1', rot: -4, w: '92%', ml: '0%', mt: 0 }, { u: pp[1] ?? null, ar: '1.1 / 1', rot: 3, w: '90%', ml: '8%', mt: '-9%' }, { u: pp[2] ?? null, ar: '1 / 1', rot: -3, w: '88%', ml: '2%', mt: '-9%' }]
            return out(
              <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-[46%_1fr]">
                <div style={{ padding: '2% 0' }}>{shots.map((sh, i) => (
                  <div key={i} style={{ width: sh.w, marginLeft: sh.ml, marginTop: sh.mt, transform: `rotate(${sh.rot}deg)`, background: '#fbf8f3', padding: '3.4%', boxShadow: '0 10px 28px rgba(0,0,0,.16)', position: 'relative', zIndex: i + 1 }}>
                    <div className="overflow-hidden" style={{ aspectRatio: sh.ar, background: tint }}>{sh.u ? <img src={sh.u} alt="" className="h-full w-full object-cover" style={i === 0 ? aboutCrop('side') : undefined} /> : ph}</div>
                  </div>))}</div>
                <div style={{ padding: 'clamp(8px, 2vw, 32px)' }}>
                  <h2 data-name="Heading" className="el-ab_h1 text-center" style={{ ...headStyle, fontStyle: 'italic', fontWeight: 400, fontSize: 'clamp(3.4rem, 8vw, 7rem)', lineHeight: 1, margin: 0, color: ink }}>{txt('ab_h1', 'My story')}</h2>
                  <p data-name="By line" className="el-ab_by mt-5 text-center uppercase" style={{ color: ink, fontSize: 'clamp(0.9rem, 1.8vw, 1.5rem)', letterSpacing: '0.4em' }}>{txt('ab_by', 'By ' + name)}</p>
                  <div className="mx-auto" style={{ width: 90, height: 2, background: accent, margin: 'clamp(18px, 3vw, 40px) auto' }} />
                  <div data-name="Bio text" className="el-about_text">{paras.map((x: string, i: number) => <p key={i} style={{ fontFamily: (headStyle as any).fontFamily, color: ink, fontSize: 'clamp(1.1rem, 1.8vw, 1.45rem)', lineHeight: 1.45, margin: '0 0 1.3em' }}>{x}</p>)}</div>
                  <div className="mt-8">{btn()}</div>
                </div>
              </div>)
          }
          if (ad === 'draco') {
            const cream = '#f3ead8'
            const dh = String(aboutSet?.heading ?? '').trim() || ('Hi I am\n' + name)
            const txt = (k: string, d: string) => String((r as any).site_settings?.text?.[k] ?? d)
            return out(
              <div style={{ background: dark, boxShadow: `0 0 0 100vmax ${dark}`, clipPath: 'inset(0 -100vmax)' }}>
                <div className="mx-auto grid max-w-6xl md:grid-cols-[48%_1fr]">
                  <div style={{ padding: 'clamp(24px, 4vw, 56px) clamp(16px, 3vw, 44px) clamp(24px, 4vw, 56px) 0' }}>
                    <h2 data-name="Heading" className="el-about_title" style={{ ...headStyle, color: cream, fontWeight: 400, fontSize: 'clamp(3rem, 6.6vw, 5.8rem)', lineHeight: 1, margin: 0, whiteSpace: 'pre-line' }}>{dh}</h2>
                    <div style={{ width: 80, height: 3, background: accent, margin: 'clamp(16px, 2.6vw, 34px) 0' }} />
                    <div data-name="Bio text" className="el-about_text">{paras.map((x: string, i: number) => <p key={i} style={{ fontFamily: (headStyle as any).fontFamily, color: cream, fontSize: 'clamp(1.1rem, 1.9vw, 1.5rem)', lineHeight: 1.4, margin: '0 0 1.3em' }}>{x}</p>)}</div>
                    {loves.length > 0 && <div style={{ marginTop: 'clamp(24px, 4vw, 52px)' }}>
                      <p data-name="Loves label" className="el-ab_loves uppercase" style={{ color: cream, fontSize: 'clamp(0.8rem, 1.5vw, 1.2rem)', letterSpacing: '0.4em', margin: '0 0 1.2em' }}>{txt('ab_loves', 'A few things I love')}</p>
                      {loves.map((x: string, i: number) => (
                        <div key={i} className="grid items-center" style={{ gridTemplateColumns: 'clamp(46px, 7vw, 72px) 1px 1fr', gap: 'clamp(12px, 2vw, 24px)', marginBottom: 'clamp(16px, 2.4vw, 30px)' }}>
                          <span style={{ ...headStyle, fontStyle: 'italic', color: accent, fontSize: 'clamp(1.6rem, 3vw, 2.4rem)' }}>{String(i + 1).padStart(2, '0')}</span>
                          <span aria-hidden="true" style={{ alignSelf: 'stretch', background: accent }} />
                          <span className="el-about_loves" style={{ fontFamily: (headStyle as any).fontFamily, color: cream, fontSize: 'clamp(1rem, 1.7vw, 1.35rem)', lineHeight: 1.3 }}>{x}</span>
                        </div>))}
                    </div>}
                    <div style={{ marginTop: 'clamp(16px, 3vw, 40px)' }}><a data-name="About button" href={btnHref} className="cr-btn inline-block px-8 py-3 text-[12px] uppercase tracking-[0.25em]" style={{ border: `1px solid ${accent}`, color: cream, background: 'transparent' }}>{btnText} &rarr;</a></div>
                  </div>
                  <div className="relative min-h-[420px] overflow-hidden" style={{ background: '#3a2c22' }}>
                    {main ? <img src={main} alt="" className="absolute inset-0 h-full w-full object-cover" style={aboutCrop('side')} /> : <svg viewBox="0 0 100 150" preserveAspectRatio="xMidYMid slice" className="absolute inset-0" style={{ width: '100%', height: '100%' }}><rect width="100" height="150" fill="#e4e2de" /><path d="M0 112 L28 64 L44 92 L62 48 L100 112 Z" fill="#c9c6c1" /><circle cx="74" cy="34" r="8" fill="#d3d0cb" /></svg>}
                  </div>
                </div>
              </div>)
          }
          if (ad === 'aries') {
            const ph = (ar: string) => <svg viewBox="0 0 100 95" preserveAspectRatio="xMidYMid slice" style={{ width: '100%', height: '100%', display: 'block' }}><rect width="100" height="95" fill="#e4e2de" /><path d="M0 74 L28 40 L44 58 L62 28 L100 74 Z" fill="#c9c6c1" /><circle cx="74" cy="22" r="7" fill="#d3d0cb" /></svg>
            const txt = (k: string, d: string) => String((r as any).site_settings?.text?.[k] ?? d)
            const rows = [
              { h: txt('ab_h1', 'My story'), hk: 'ab_h1', body: p1, u: main },
              { h: txt('ab_h2', 'What I believe'), hk: 'ab_h2', body: rest[0] ?? '', u: pp[1] ?? null },
              { h: txt('ab_h3', "Let's work together"), hk: 'ab_h3', body: txt('ab_p3', "If you're looking for a photographer who values connection, keeps things comfortable, and cares about telling your story, I'd love to hear from you. Let's create something meaningful together."), u: pp[2] ?? null, cta: true },
            ]
            return out(
              <div className="mx-auto max-w-6xl">{rows.map((row, i) => (
                <div key={i} className="grid items-stretch md:grid-cols-2" style={{ background: i === 1 ? tint : 'transparent' }}>
                  <div className="overflow-hidden" style={{ order: i === 1 ? 2 : 1, aspectRatio: '1.05 / 1', background: tint }}>
                    {row.u ? <img src={row.u} alt="" className="h-full w-full object-cover" style={i === 0 ? aboutCrop('side') : undefined} /> : ph('1.05 / 1')}
                  </div>
                  <div className="flex flex-col justify-center" style={{ order: i === 1 ? 1 : 2, padding: 'clamp(24px, 5vw, 72px)' }}>
                    <h2 data-name="Heading" className={'el-' + row.hk} style={{ ...headStyle, fontStyle: 'italic', fontWeight: 400, fontSize: 'clamp(2.4rem, 5vw, 4.4rem)', lineHeight: 1.05, margin: 0, color: ink }}>{row.h}</h2>
                    <div style={{ width: 80, height: 2, background: accent, margin: 'clamp(16px, 2.4vw, 30px) 0' }} />
                    {row.body && <p data-name={row.cta ? 'Invitation text' : 'Bio text'} className={row.cta ? 'el-ab_p3' : 'el-about_text'} style={{ fontFamily: (headStyle as any).fontFamily, color: ink, fontSize: 'clamp(1.1rem, 1.9vw, 1.5rem)', lineHeight: 1.45, margin: 0, whiteSpace: 'pre-line' }}>{row.body}</p>}
                    {row.cta && <div className="mt-8">{btn()}</div>}
                  </div>
                </div>))}</div>)
          }
          if (ad === 'libra') {
            const ph = <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" style={{ width: '100%', height: '100%', display: 'block' }}><rect width="100" height="100" fill="#e4e2de" /><path d="M0 78 L28 42 L44 62 L62 30 L100 78 Z" fill="#c9c6c1" /><circle cx="74" cy="26" r="7" fill="#d3d0cb" /></svg>
            const txt = (k: string, d: string) => String((r as any).site_settings?.text?.[k] ?? d)
            const half = Math.ceil(paras.length / 2)
            const colA = paras.slice(0, half)
            const colB = paras.slice(half)
            const sf = (headStyle as any).fontFamily
            const ptxt = (list: string[]) => list.map((x: string, i: number) => <p key={i} style={{ fontFamily: sf, color: ink, fontSize: 'clamp(1.05rem, 1.7vw, 1.4rem)', lineHeight: 1.45, margin: '0 0 1.3em' }}>{x}</p>)
            const hh = (k: string, d: string) => <><h2 data-name="Heading" className={'el-' + k} style={{ ...headStyle, fontStyle: 'italic', fontWeight: 400, fontSize: 'clamp(2rem, 3.8vw, 3.2rem)', lineHeight: 1.05, margin: 0, color: ink }}>{txt(k, d)}</h2><div style={{ width: 64, height: 2, background: accent, margin: 'clamp(14px, 2vw, 26px) 0 clamp(18px, 2.6vw, 34px)' }} /></>
            return out(
              <div className="mx-auto max-w-6xl">
                <blockquote data-name="Quote" className="el-ab_quote" style={{ ...headStyle, fontStyle: 'italic', fontWeight: 400, fontSize: 'clamp(2.4rem, 6.4vw, 6rem)', lineHeight: 1.05, margin: 0, color: ink, paddingLeft: '0.45em', textIndent: '-0.45em' }}>&ldquo;{txt('ab_quote', "I'm here to capture the real, the honest, and the beautifully ordinary.")}&rdquo;</blockquote>
                <div style={{ width: '10%', minWidth: 60, height: 2, background: accent, margin: 'clamp(20px, 3.4vw, 46px) auto clamp(24px, 4vw, 56px)' }} />
                <div className="grid items-stretch md:grid-cols-[30%_1fr_1fr]" style={{ gap: 'clamp(16px, 3vw, 44px)' }}>
                  <div className="overflow-hidden" style={{ aspectRatio: '0.4 / 1', background: tint }}>{main ? <img src={main} alt="" className="h-full w-full object-cover" style={aboutCrop('side')} /> : ph}</div>
                  <div className="flex flex-col"><div className="el-about_text" data-name="Bio text">{hh('ab_h1', 'About Me')}{ptxt(colA)}</div>
                    <p data-name="Signature" className="el-ab_sig mt-auto" style={{ fontFamily: "'Snell Roundhand','Segoe Script','Apple Chancery','Brush Script MT',cursive", color: ink, fontSize: 'clamp(2rem, 4.2vw, 3.6rem)', lineHeight: 1.1, transform: 'rotate(-3deg)', transformOrigin: 'left center', margin: '1em 0 0' }}>{txt('ab_sig', name)}</p></div>
                  <div className="flex flex-col" style={{ borderLeft: `1px solid ${line}`, paddingLeft: 'clamp(14px, 2.4vw, 34px)' }}>{colB.length > 0 && <div className="el-about_text" data-name="Bio text">{hh('ab_h2', 'My Approach')}{ptxt(colB)}</div>}
                    <div className="mt-auto pt-6">{btn()}</div></div>
                </div>
              </div>)
          }
          if (ad === 'pavo') {
            const ph = <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" style={{ width: '100%', height: '100%', display: 'block' }}><rect width="100" height="100" fill="#e4e2de" /><path d="M0 78 L28 42 L44 62 L62 30 L100 78 Z" fill="#c9c6c1" /><circle cx="74" cy="26" r="7" fill="#d3d0cb" /></svg>
            const tx: any = (r as any).site_settings?.text ?? {}
            const txt = (k: string, d: string) => String(tx[k] ?? d)
            const sf = (headStyle as any).fontFamily
            const bigName = String(name ?? '').replace(/\s*photography\s*$/i, '')
            const ic = (kind: number) => {
              const c = { fill: 'none', stroke: accent, strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
              return <svg viewBox="0 0 40 40" width="40" height="40" style={{ flex: 'none' }}>
                {kind === 0 && <g {...c}><rect x="5" y="12" width="30" height="21" rx="3" /><path d="M13 12l2-4h10l2 4" /><circle cx="20" cy="22" r="6" /></g>}
                {kind === 1 && <g {...c}><path d="M7 15h22v8a8 8 0 0 1-8 8h-6a8 8 0 0 1-8-8z" /><path d="M29 17h3a3 3 0 0 1 0 6h-3" /><path d="M10 35h18" /></g>}
                {kind === 2 && <g {...c}><path d="M5 22l9-2 9-11 4 1-5 11 9 1 3-3 2 1-2 4 2 4-2 1-3-3-9 1 5 11-4 1-9-11-9-2z" transform="scale(0.8) translate(4 4)" /></g>}
                {kind === 3 && <g {...c}><path d="M20 33S6 24 6 15a7 7 0 0 1 14-2 7 7 0 0 1 14 2c0 9-14 18-14 18z" /></g>}
                {kind === 4 && <g {...c}><path d="M3 30l9-12 5 6 7-11 13 17z" transform="translate(0 -2)" /><path d="M24 13l3 4" /></g>}
              </svg>
            }
            const facts: [string, string, string, string][] = [
              ['ab_f1t', 'Favorite lens', 'ab_f1d', '35mm — it’s versatile and feels the most natural to me.'],
              ['ab_f2t', 'Coffee order', 'ab_f2d', 'Iced vanilla latte, always.'],
              ['ab_f3t', 'Dream location', 'ab_f3d', 'Tuscany, Italy.'],
              ['ab_f4t', 'What I love most', 'ab_f4d', 'Working with kind, laid-back people who value real moments.'],
              ['ab_f5t', 'Outside of photography', 'ab_f5d', 'Hiking, cooking new recipes, and planning my next trip.'],
            ]
            const shown = facts.map((f, i) => ({ f, i })).filter(({ f }) => isPreview || tx[f[0]] != null || tx[f[2]] != null)
            return out(
              <div className="mx-auto max-w-6xl">
                <div className="grid md:grid-cols-[46.5%_1fr] items-stretch" style={{ gap: 'clamp(20px, 4vw, 48px)' }}>
                  <div className="overflow-hidden" style={{ minHeight: 'clamp(320px, 60vw, 700px)', background: tint }}>{main ? <img src={main} alt="" className="h-full w-full object-cover" style={aboutCrop('side')} /> : ph}</div>
                  <div className="flex flex-col" style={{ paddingTop: 'clamp(0px, 1vw, 16px)' }}>
                    <p data-name="Greeting" className="el-ab_hi" style={{ ...headStyle, fontStyle: 'italic', fontWeight: 400, fontSize: 'clamp(1.8rem, 4vw, 3.6rem)', lineHeight: 1.05, margin: 0, color: ink }}>{txt('ab_hi', 'Hi, I’m')}</p>
                    <h1 data-name="Heading" className="el-ab_h1" style={{ ...headStyle, fontStyle: 'italic', fontWeight: 400, fontSize: 'clamp(2.6rem, 6vw, 5.4rem)', lineHeight: 1.02, margin: 0, color: ink }}>{txt('ab_h1', bigName)}</h1>
                    <div style={{ width: 80, height: 2, background: accent, margin: 'clamp(16px, 2.6vw, 34px) 0 clamp(16px, 2.6vw, 30px)' }} />
                    <div className="el-about_text" data-name="Bio text">{paras.map((x: string, i: number) => <p key={i} style={{ fontFamily: sf, color: ink, fontSize: 'clamp(1.05rem, 1.9vw, 1.6rem)', lineHeight: 1.4, margin: '0 0 1em' }}>{x}</p>)}</div>
                    <div className="flex items-center" style={{ gap: 'clamp(14px, 2vw, 28px)', margin: 'clamp(16px, 2.6vw, 34px) 0 clamp(8px, 1.4vw, 16px)' }}>
                      <h2 data-name="Heading" className="el-ab_h2" style={{ fontFamily: "'Snell Roundhand','Segoe Script','Apple Chancery','Brush Script MT',cursive", fontWeight: 400, fontSize: 'clamp(2.2rem, 4.6vw, 4.2rem)', lineHeight: 1.1, margin: 0, color: ink }}>{txt('ab_h2', 'Quick Facts')}</h2>
                      <span style={{ flex: 1, height: 1, background: ink, opacity: 0.6 }} />
                    </div>
                    <div>
                      {shown.map(({ f, i }, n) => (
                        <div key={i} className="flex items-start" style={{ gap: 'clamp(14px, 2.4vw, 30px)', padding: 'clamp(12px, 1.8vw, 22px) 0', borderBottom: n < shown.length - 1 ? `1px solid ${line}` : 'none' }}>
                          <div style={{ width: 56, display: 'flex', justifyContent: 'center', paddingTop: 4 }}>{ic(i)}</div>
                          <div>
                            <p data-name="Fact title" className={'el-' + f[0]} style={{ ...headStyle, fontStyle: 'italic', fontWeight: 600, fontSize: 'clamp(1.2rem, 2.1vw, 1.8rem)', lineHeight: 1.15, margin: 0, color: ink }}>{txt(f[0], f[1])}</p>
                            <p data-name="Fact text" className={'el-' + f[2]} style={{ fontFamily: sf, color: ink, fontSize: 'clamp(1rem, 1.6vw, 1.3rem)', lineHeight: 1.35, margin: '4px 0 0' }}>{txt(f[2], f[3])}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="text-center" style={{ marginTop: 'clamp(18px, 3vw, 44px)' }}>{btn()}</div>
                  </div>
                </div>
              </div>)
          }
          if (ad === 'lynx') {
            const ph = <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" style={{ width: '100%', height: '100%', display: 'block' }}><rect width="100" height="100" fill="#e4e2de" /><path d="M0 78 L28 42 L44 62 L62 30 L100 78 Z" fill="#c9c6c1" /><circle cx="74" cy="26" r="7" fill="#d3d0cb" /></svg>
            const txt = (k: string, d: string) => String((r as any).site_settings?.text?.[k] ?? d)
            const pool = paras.length > 1 ? paras.slice(1) : paras
            const half = Math.ceil(pool.length / 2)
            const colA = pool.slice(0, half)
            const colB = pool.slice(half)
            const sf = (headStyle as any).fontFamily
            const ptxt = (list: string[]) => list.map((x: string, i: number) => <p key={i} style={{ fontFamily: sf, color: ink, fontSize: 'clamp(1.05rem, 1.7vw, 1.4rem)', lineHeight: 1.45, margin: '0 0 1.2em' }}>{x}</p>)
            const hh = (k: string, d: string) => <><h2 data-name="Heading" className={'el-' + k} style={{ ...headStyle, fontStyle: 'italic', fontWeight: 400, fontSize: 'clamp(2rem, 3.8vw, 3.2rem)', lineHeight: 1.05, margin: 0, color: ink }}>{txt(k, d)}</h2><div style={{ width: 60, height: 2, background: accent, margin: 'clamp(14px, 2vw, 26px) 0 clamp(18px, 2.6vw, 34px)' }} /></>
            return out(
              <div className="mx-auto max-w-6xl">
                <div className="relative">
                  <div className="overflow-hidden" style={{ aspectRatio: '1003 / 965', background: tint }}>{main ? <img src={main} alt="" className="h-full w-full object-cover" style={aboutCrop('side')} /> : ph}</div>
                  <div className="md:absolute" style={{ left: '2.4%', bottom: '2.6%', width: 'min(100%, 48.8%)', background: tint, padding: 'clamp(20px, 3.4vw, 56px)', boxSizing: 'border-box' }}>
                    <div style={{ width: 64, height: 2, background: accent, marginBottom: 'clamp(12px, 2vw, 26px)' }} />
                    <h1 data-name="Heading" className="el-ab_h1" style={{ ...headStyle, fontStyle: 'italic', fontWeight: 400, fontSize: 'clamp(2.2rem, 4.6vw, 4.2rem)', lineHeight: 1.05, margin: 0, color: ink }}>{txt('ab_h1', 'Hi we are ' + name)}</h1>
                    <div className="el-about_text" data-name="Bio text" style={{ margin: 'clamp(14px, 2.2vw, 30px) 0 clamp(16px, 2.4vw, 34px)' }}><p style={{ fontFamily: sf, color: ink, fontSize: 'clamp(1rem, 1.6vw, 1.3rem)', lineHeight: 1.4, margin: 0 }}>{paras[0] ?? ''}</p></div>
                    {btn()}
                  </div>
                </div>
                <div className="grid md:grid-cols-2" style={{ marginTop: 'clamp(28px, 5vw, 72px)' }}>
                  <div style={{ paddingRight: 'clamp(14px, 3.4vw, 56px)' }}><div className="el-about_text" data-name="Bio text">{hh('ab_h2', 'Our Story')}{ptxt(colA)}</div></div>
                  <div style={{ borderLeft: `1px solid ${line}`, paddingLeft: 'clamp(14px, 3.4vw, 56px)' }}>{colB.length > 0 && <div className="el-about_text" data-name="Bio text">{hh('ab_h3', 'What We Love')}{ptxt(colB)}</div>}</div>
                </div>
              </div>)
          }
          if (ad === 'hydra') {
            const ph = <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" style={{ width: '100%', height: '100%', display: 'block' }}><rect width="100" height="100" fill="#e4e2de" /><path d="M0 78 L28 42 L44 62 L62 30 L100 78 Z" fill="#c9c6c1" /><circle cx="74" cy="26" r="7" fill="#d3d0cb" /></svg>
            const txt = (k: string, d: string) => String((r as any).site_settings?.text?.[k] ?? d)
            const sv = (k: string, d: string) => String((r as any).site_settings?.text?.[k] ?? (isPreview ? d : ''))
            const stats = [[sv('ab_n1', '12'), sv('ab_l1', 'Years behind the lens'), 'ab_n1', 'ab_l1'], [sv('ab_n2', '160+'), sv('ab_l2', 'Couples photographed'), 'ab_n2', 'ab_l2'], [sv('ab_n3', '18'), sv('ab_l3', 'Countries visited'), 'ab_n3', 'ab_l3']].filter((x) => x[0].trim())
            const strip = pickPics(8) as any[]
            const hn = String(aboutSet?.heading ?? '').trim() || name
            return out(
              <div className="mx-auto max-w-6xl">
                <div className="grid items-center md:grid-cols-[46%_1fr]" style={{ gap: 'clamp(20px, 4vw, 56px)' }}>
                  <div className="overflow-hidden" style={{ aspectRatio: '0.64 / 1', background: tint }}>{main ? <img src={main} alt="" className="h-full w-full object-cover" style={aboutCrop('side')} /> : ph}</div>
                  <div>
                    <p data-name="Greeting" className="el-ab_hi" style={{ ...headStyle, fontStyle: 'italic', fontWeight: 400, fontSize: 'clamp(1.8rem, 3.6vw, 3.2rem)', lineHeight: 1.1, margin: 0, color: ink }}>{txt('ab_hi', "Hi, I'm")}</p>
                    <h2 data-name="Heading" className="el-about_title" style={{ ...headStyle, fontStyle: 'italic', fontWeight: 400, fontSize: 'clamp(2.8rem, 6vw, 5.4rem)', lineHeight: 1.02, margin: 0, color: ink }}>{hn}</h2>
                    <div style={{ width: 80, height: 2, background: accent, margin: 'clamp(16px, 2.4vw, 30px) 0' }} />
                    <div data-name="Bio text" className="el-about_text">{paras.map((x: string, i: number) => <p key={i} style={{ fontFamily: (headStyle as any).fontFamily, color: ink, fontSize: 'clamp(1.1rem, 1.9vw, 1.5rem)', lineHeight: 1.4, margin: '0 0 1.1em' }}>{x}</p>)}</div>
                    <div className="mt-6">{btn()}</div>
                  </div>
                </div>
                {stats.length > 0 && <div className="grid text-center" style={{ gridTemplateColumns: `repeat(${stats.length}, 1fr)`, borderTop: `1px solid ${line}`, marginTop: 'clamp(24px, 4vw, 56px)', padding: 'clamp(18px, 3vw, 40px) 0' }}>{stats.map((st, i) => (
                  <div key={i} style={{ borderLeft: i > 0 ? `1px solid ${line}` : undefined, padding: '0 3%' }}>
                    <p data-name="Stat" className={'el-' + st[2]} style={{ ...headStyle, fontStyle: 'italic', fontWeight: 400, fontSize: 'clamp(3rem, 7vw, 6rem)', lineHeight: 1, margin: 0, color: ink }}>{st[0]}</p>
                    <p data-name="Stat label" className={'el-' + st[3] + ' uppercase'} style={{ color: ink, fontSize: 'clamp(0.7rem, 1.4vw, 1.2rem)', letterSpacing: '0.3em', marginTop: 10 }}>{st[1]}</p>
                  </div>))}</div>}
                <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: 'clamp(4px, 0.6vw, 8px)', marginTop: 'clamp(16px, 3vw, 40px)' }}>{[0, 1, 2, 3].map((i) => (
                  <div key={i} className="overflow-hidden" style={{ aspectRatio: '0.7 / 1', background: tint }}>{strip[4 + i] ? <img src={strip[4 + i]} alt="" className="h-full w-full object-cover" /> : ph}</div>))}</div>
              </div>)
          }
          if (ad === 'saffron') return out(
            <div className="relative mx-auto grid max-w-6xl items-center overflow-hidden md:aspect-[2/1] md:block" style={{ color: dark }}>
              <div className="relative min-h-[320px] overflow-hidden md:absolute md:[left:0] md:[top:0] md:[bottom:0] md:[width:47.5%] md:[-webkit-mask-image:linear-gradient(to_right,#000_86%,transparent)] md:[mask-image:linear-gradient(to_right,#000_86%,transparent)]" style={{ background: 'transparent' }}>
                {main ? img() : (
                  <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full"><rect width="400" height="300" fill="#d8d0c6" /><circle cx="290" cy="80" r="20" fill="#b8aa98" opacity="0.55" /><path d="M0 300 L110 120 L180 210 L260 100 L400 300 Z" fill="#b8aa98" opacity="0.8" /></svg>
                )}
              </div>
              <div className="relative px-6 py-8 md:absolute md:px-0 md:py-0" style={{ left: undefined, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div className="md:[margin-left:52.7%] md:[width:44%]">
                  {H({ color: '#16130f', fontSize: 'clamp(2.2rem, 5vw, 4.6rem)', lineHeight: 1.05 })}
                  <svg viewBox="0 0 240 12" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" style={{ width: 'clamp(110px, 13vw, 230px)', marginTop: 'clamp(6px, 1.2vw, 20px)', marginLeft: '1%' }}><path d="M2 10 C 70 5, 160 3, 238 2" /></svg>
                  <div className="space-y-2" style={{ marginTop: 'clamp(16px, 3vw, 50px)', fontSize: 'clamp(14px, 1.75vw, 31px)', lineHeight: 1.5 }}>{P(paras, '#2a2a26')}</div>
                  <a data-name="About button" href={btnHref} className="inline-flex items-center" style={{ ...headStyle, background: accent, color: '#f6f2ea', borderRadius: 'clamp(10px, 1.2vw, 18px)', fontSize: 'clamp(14px, 1.65vw, 28px)', padding: 'clamp(12px, 1.8vw, 28px) clamp(24px, 3.2vw, 56px)', gap: 'clamp(12px, 1.8vw, 30px)', marginTop: 'clamp(18px, 3.4vw, 58px)' }}>{btnText}<span aria-hidden="true">&rarr;</span></a>
                </div>
              </div>
            </div>)
          if (ad === 'cumin') return out(
            <div className="mx-auto flex max-w-6xl flex-col items-center justify-center text-center md:aspect-[2/1]" style={{ color: dark, padding: 'clamp(24px, 3.2vw, 48px) 16px clamp(24px, 3vw, 44px)' }}>
              <div className="relative shrink-0 overflow-hidden" style={{ width: 'clamp(150px, 21.2vw, 376px)', aspectRatio: '1 / 1', borderRadius: '9999px', background: '#d8d0c6' }}>
                {main ? img() : (
                  <svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full"><rect width="200" height="200" fill="#d8d0c6" /><circle cx="140" cy="62" r="14" fill="#b8aa98" opacity="0.55" /><path d="M0 200 L58 92 L98 146 L136 84 L200 200 Z" fill="#b8aa98" opacity="0.8" /></svg>
                )}
              </div>
              {H({ color: '#1f1812', fontSize: 'clamp(2.4rem, 6.2vw, 5.6rem)', lineHeight: 1.05, marginTop: 'clamp(4px, 0.6vw, 10px)' })}
              <div style={{ width: 'clamp(48px, 6.9vw, 122px)', height: 4, background: accent, marginTop: 'clamp(12px, 2.2vw, 36px)' }} />
              <div className="space-y-2" style={{ width: '100%', maxWidth: '57.5%', minWidth: 'min(100%, 300px)', marginTop: 'clamp(14px, 2.4vw, 40px)' }}>{P(paras, '#2a2119')}</div>
              <a data-name="About button" href={btnHref} className="inline-flex items-center justify-center" style={{ ...headStyle, background: accent, color: '#f6f0e4', textTransform: 'uppercase', letterSpacing: '0.16em', fontSize: 'clamp(12px, 1.5vw, 24px)', padding: 'clamp(12px, 1.8vw, 28px) clamp(22px, 3.4vw, 54px)', gap: 'clamp(10px, 1.4vw, 20px)', marginTop: 'clamp(18px, 2.8vw, 46px)' }}>{btnText}<span aria-hidden="true">&rarr;</span></a>
            </div>)
          if (ad === 'clove') return out(
            <div className="relative mx-auto grid max-w-6xl items-center overflow-hidden md:aspect-[2/1] md:block" style={{ background: '#f3ece4', color: dark }}>
              <div className="hidden md:block absolute" style={{ right: 0, top: '8.8%', width: '22.2%', height: '82.2%', background: `color-mix(in srgb, ${accent} 45%, #f3ece4)` }} />
              <div className="relative order-2 min-h-[300px] overflow-hidden md:absolute md:order-none" style={{ left: '52.7%', width: '35.8%', top: 0, bottom: 0, background: 'transparent' }}>
                {main ? img() : (
                  <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full"><rect width="400" height="200" fill="#d8cdbf" /><circle cx="300" cy="58" r="16" fill="#b8aa98" opacity="0.55" /><path d="M0 200 L105 82 L165 142 L238 62 L400 200 Z" fill="#b8aa98" opacity="0.8" /></svg>
                )}
              </div>
              <div className="relative md:absolute" style={{ left: '7.6%', width: '45%', top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '28px 0' }}>
                {H({ color: '#1f1812', fontSize: 'clamp(2.4rem, 6vw, 5rem)', lineHeight: 1.05 })}
                <svg viewBox="0 0 300 12" fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round" style={{ width: '38%', marginTop: 'clamp(4px, 0.8vw, 12px)' }}><path d="M2 9 C 70 3, 190 2, 298 4" /></svg>
                <div className="space-y-3" style={{ marginTop: 'clamp(16px, 2.6vw, 38px)' }}>{P(paras, '#2a2119')}</div>
                <a data-name="About button" href={btnHref} className="inline-flex items-center self-start" style={{ ...headStyle, background: accent, color: '#f6ecd9', fontSize: 'clamp(14px, 1.7vw, 22px)', padding: 'clamp(10px, 1.4vw, 18px) clamp(22px, 3vw, 42px)', gap: 'clamp(10px, 1.4vw, 18px)', marginTop: 'clamp(18px, 3vw, 44px)' }}>{btnText}<span aria-hidden="true">&rarr;</span></a>
              </div>
            </div>)
          if (ad === 'anise') return outF(
            <div className="mx-auto grid max-w-6xl items-center gap-8 md:grid-cols-[35.5%_1fr] md:aspect-[2/1]" style={{ background: '#2a1510', padding: 'clamp(18px, 5.6%, 56px) 6%', color: '#f3ead8', boxShadow: '0 0 0 100vmax #2a1510', clipPath: 'inset(0 -100vmax)' }}>
              <div className="relative w-full overflow-hidden" style={{ aspectRatio: '0.8 / 1', borderRadius: '9999px 9999px 0 0', background: '#4a3329' }}>
                {main ? img() : (
                  <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full"><rect width="400" height="200" fill="#6b5546" /><circle cx="300" cy="58" r="16" fill="#8d7766" opacity="0.55" /><path d="M0 200 L105 82 L165 142 L238 62 L400 200 Z" fill="#8d7766" opacity="0.8" /></svg>
                )}
              </div>
              <div style={{ paddingLeft: '4%' }}>
                {H({ color: '#fbf3e2', fontSize: 'clamp(2.4rem, 5.6vw, 4.6rem)', lineHeight: 1.05 })}
                <div className="space-y-3" style={{ marginTop: 'clamp(14px, 2vw, 28px)' }}>{P(paras, '#f3ead8')}</div>
                <a data-name="About button" href={btnHref} className="inline-block" style={{ ...headStyle, border: '1.5px solid #f3ead8', color: '#f3ead8', fontSize: 'clamp(14px, 1.7vw, 22px)', padding: 'clamp(8px, 1.1vw, 14px) clamp(26px, 4.2vw, 58px)', marginTop: 'clamp(18px, 3vw, 42px)' }}>{btnText}</a>
              </div>
            </div>)
          if (ad === 'fennel') return outF(
            <div className="relative mx-auto max-w-6xl overflow-hidden px-5 py-8 md:aspect-[2/1] md:px-0 md:py-0" style={{ background: '#f6f2ee', color: dark, boxShadow: '0 0 0 100vmax #f6f2ee', clipPath: 'inset(0 -100vmax)' }}>
              <div data-pframe="1" className="relative mx-auto w-[78%] max-w-[340px] md:absolute md:w-[35.5%] md:max-w-none md:[left:6.4%] md:[top:7.6%]" style={{ transform: 'rotate(-5deg)', background: '#f3f0ec', padding: '5% 5% 0', boxShadow: '0 10px 28px rgba(60,45,30,0.22)', aspectRatio: '0.915 / 1' }}>
                <div className="relative w-full overflow-hidden" style={{ aspectRatio: '1 / 1', background: '#d8d0c6' }}>
                  {main ? img() : (
                    <svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full"><rect width="200" height="200" fill="#d8d0c6" /><circle cx="140" cy="62" r="14" fill="#b8aa98" opacity="0.55" /><path d="M0 200 L58 92 L98 146 L136 84 L200 200 Z" fill="#b8aa98" opacity="0.8" /></svg>
                  )}
                </div>
              </div>
              <div className="relative mt-8 md:absolute md:mt-0 md:[left:45.5%] md:[top:16%] md:[width:51%]">
                <div style={{ fontFamily: "'Snell Roundhand','Segoe Script','Apple Chancery','Brush Script MT',cursive", fontSize: 'clamp(19px, 2.35vw, 42px)', lineHeight: 1.75, color: '#2a2119' }}>{P(paras, '#2a2119')}</div>
                <div style={{ marginTop: 'clamp(12px, 3vw, 54px)', marginLeft: '3%' }}>
                  {H({ color: '#1f1812', fontFamily: "'Snell Roundhand','Segoe Script','Apple Chancery','Brush Script MT',cursive", fontSize: 'clamp(2.6rem, 5.2vw, 5.6rem)', lineHeight: 1, fontWeight: 400 })}
                  <svg viewBox="0 0 140 12" fill="none" stroke="#1f1812" strokeWidth="1.6" strokeLinecap="round" style={{ width: 'clamp(80px, 7.6vw, 136px)', marginLeft: '2%' }}><path d="M2 10 C 40 8, 92 4, 138 2" /></svg>
                </div>
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
        const gs0 = String((r as any).site_settings?.galSection || (r as any).site_settings?.kit?.designAlts?.galleries_section?.items?.[0]?.key || '')
        const gs2 = GALSEC.includes(gs0) ? gs0 : 'sahara'
        const items2 = galleries.slice(0, 6).map((g: any) => {
          const cover = g.photos.find((p: any) => p.id === g.cover_photo_id) ?? g.photos[0]
          return { id: String(g.id), title: String(g.title ?? ''), line: String(g.line ?? ''), u: (photoUrl(cover?.storage_path) as string | null) ?? null, href: `${base}/g/${g.id}${qs}`, n: (g.photos ?? []).length }
        })
        return sec('portfolio', GALOWN.includes(gs2) ? null : t.titles.portfolio, <GalleriesSection design={gs2} title={String((r as any).site_settings?.text?.gs_title ?? 'Galleries')} items={padGal(items2, gs2)} bg={hexOk(secStyles.portfolio?.bg) ?? undefined} viewHref={hrefs.galleries} viewText="View all galleries" headStyle={headStyle} ink={ink} soft={soft} accent={accent} line={line} />, false, gs2 === 'sonora' || gs2 === 'namib' || gs2 === 'thar' || gs2 === 'kalahari')
      }
      case 'portfolio': {
        const rawGal = (r as any).site_settings?.galindex?.layout
        const L: string = page === 'galleries' ? (['checker', 'rows', 'custom', 'jade', 'jasper', 'amber', 'pearl', 'ruby', 'topaz', 'garnet', 'agate', 'quartz', 'moonstone'].includes(rawGal) ? rawGal : t.galindex.layout) : t.portfolio.layout
        const list = page === 'home' ? galleries.slice(0, 6) : galleries
        const gsd = String((r as any).site_settings?.galSection || (r as any).site_settings?.kit?.designAlts?.galleries_section?.items?.[0]?.key || '')
        if (page === 'home' && GALSEC.includes(gsd) && list.length > 0) {
          const items = list.map((g: any) => {
            const cover = g.photos.find((p: any) => p.id === g.cover_photo_id) ?? g.photos[0]
            return { id: String(g.id), title: String(g.title ?? ''), line: String(g.line ?? ''), u: (photoUrl(cover?.storage_path) as string | null) ?? null, href: `${base}/g/${g.id}${qs}`, n: (g.photos ?? []).length }
          })
          return sec('portfolio', GALOWN.includes(gsd) ? null : t.titles.portfolio, <GalleriesSection design={gsd} title={String((r as any).site_settings?.text?.gs_title ?? 'Galleries')} items={padGal(items, gsd)} bg={hexOk(secStyles.portfolio?.bg) ?? undefined} viewHref={hrefs.galleries} viewText="View all galleries" headStyle={headStyle} ink={ink} soft={soft} accent={accent} line={line} />, false, gsd === 'sonora' || gsd === 'namib' || gsd === 'thar' || gsd === 'kalahari')
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
                {L !== 'jasper' && L !== 'jade' && L !== 'amber' && L !== 'pearl' && L !== 'ruby' && L !== 'topaz' && L !== 'garnet' && L !== 'agate' && L !== 'quartz' && L !== 'moonstone' && <h1 className="mb-10 text-center" style={{ ...headStyle, fontSize: 'clamp(2rem, 4vw, 3rem)' }}>{t.titles.portfolio}</h1>}
                {L === 'jade' && (() => {
                  const mt = (<svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full"><rect width="400" height="200" fill="#d8cfc4" /><circle cx="300" cy="58" r="16" fill="#b8aa98" opacity="0.55" /><path d="M0 200 L105 82 L165 142 L238 62 L400 200 Z" fill="#b8aa98" opacity="0.8" /></svg>)
                  return (
                    <div>
                      <h1 data-name="Page title" className="el-gp_title text-center" style={{ ...headStyle, fontSize: 'clamp(2.4rem, 5vw, 4.4rem)', lineHeight: 1.1, margin: '0 0 clamp(14px, 2.6vw, 34px)' }}>{String((r as any).site_settings?.text?.gp_title ?? 'Galleries')}</h1>
                      {list[0] && (() => { const c = gc(list[0]); return (
                        <div className="[--ja:16/9] sm:[--ja:3.02/1]">
                          <a href={c.href} className="group relative block overflow-hidden" style={{ aspectRatio: 'var(--ja)', background: '#E5E1DB' }}>{c.u ? gim(c.u) : mt}<div className="absolute inset-0" style={{ background: 'linear-gradient(to top right, rgba(30,22,15,.62), transparent 58%)' }} /><p data-name="Gallery name" className="el-gal_name absolute text-white" style={{ ...headStyle, left: '2.9%', bottom: '8%', fontSize: 'clamp(1.5rem, 3.6vw, 3.2rem)', lineHeight: 1.1, margin: 0 }}>{list[0].title}</p></a>
                        </div>
                      ) })()}
                      <div className="grid grid-cols-1 sm:grid-cols-2" style={{ columnGap: '2.1%', rowGap: 'clamp(14px, 2.6vw, 34px)', marginTop: 'clamp(14px, 2.9vw, 36px)' }}>
                        {list.slice(1).map((g) => { const c = gc(g); return (
                          <a key={g.id} href={c.href} className="group block"><div className="relative overflow-hidden" style={{ aspectRatio: '2.3/1', background: '#E5E1DB' }}>{c.u ? gim(c.u) : mt}</div><p data-name="Gallery name" className="el-gal_name" style={{ ...headStyle, fontSize: 'clamp(1.1rem, 2.1vw, 1.8rem)', lineHeight: 1.2, margin: 0, paddingTop: 'clamp(4px, 0.5vw, 8px)', paddingLeft: '0.3%' }}>{g.title}</p></a>
                        ) })}
                      </div>
                    </div>
                  )
                })()}
                {L === 'jasper' && (() => {
                  const mt = (<svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full"><rect width="400" height="200" fill="#2b241f" /><circle cx="300" cy="58" r="16" fill="#4a423a" opacity="0.7" /><path d="M0 200 L105 82 L165 142 L238 62 L400 200 Z" fill="#4a423a" opacity="0.85" /></svg>)
                  const PAT: [number, number, number][] = [[481, 443, 3.29], [426, 497, 3.57], [452, 473, 3.29]]
                  const rest = list.slice(1)
                  const rows: any[][] = []
                  for (let k = 0; k < rest.length; k += 2) rows.push(rest.slice(k, k + 2))
                  const ov = <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,8,6,.62), transparent 45%)' }} />
                  return (
                    <div style={{ background: '#171717', width: '100vw', marginLeft: 'calc(50% - 50vw)', padding: 'clamp(18px, 3.2vw, 40px) clamp(14px, 3.2vw, 56px) clamp(24px, 4vw, 70px)' }}>
                      <h1 data-name="Page title" className="el-gp_title text-center" style={{ ...headStyle, color: '#f6f1e8', fontSize: 'clamp(2.4rem, 5vw, 4.6rem)', lineHeight: 1.1, margin: '0 0 clamp(14px, 2.6vw, 34px)' }}>{String((r as any).site_settings?.text?.gp_title ?? 'Galleries')}</h1>
                      {list[0] && (() => { const c = gc(list[0]); return (
                        <div className="[--jr:16/9] sm:[--jr:2.365/1]">
                          <a href={c.href} className="group relative block overflow-hidden" style={{ aspectRatio: 'var(--jr)', background: '#2b241f' }}>{c.u ? gim(c.u) : mt}{ov}<p data-name="Gallery name" className="el-gal_name absolute text-white" style={{ ...headStyle, left: '3%', bottom: '8%', fontSize: 'clamp(1.5rem, 3.6vw, 3.2rem)', lineHeight: 1.1, margin: 0 }}>{list[0].title}</p></a>
                        </div>
                      ) })()}
                      {rows.map((row, ri) => { const pt = PAT[ri % 3]; return (
                        <div key={ri} className="flex flex-col sm:flex-row sm:[aspect-ratio:var(--r)]" style={{ ['--r' as any]: pt[2], gap: 'clamp(8px, 1.4vw, 16px)', marginTop: 'clamp(8px, 1.4vw, 16px)' }}>
                          {row.map((g: any, gi: number) => { const c = gc(g); return (
                            <a key={g.id} href={c.href} className="group relative block aspect-[4/3] overflow-hidden sm:aspect-auto" style={{ flex: `${pt[gi]} 1 0`, background: '#2b241f' }}>{c.u ? gim(c.u) : mt}{ov}<p data-name="Gallery name" className="el-gal_name absolute text-white" style={{ ...headStyle, left: '5%', bottom: '8%', fontSize: 'clamp(1.15rem, 2.7vw, 2.4rem)', lineHeight: 1.1, margin: 0 }}>{g.title}</p></a>
                          ) })}
                        </div>
                      ) })}
                    </div>
                  )
                })()}
                {L === 'amber' && (() => {
                  const mt = (<svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full"><rect width="400" height="200" fill="#d8cfc4" /><circle cx="300" cy="58" r="16" fill="#b8aa98" opacity="0.55" /><path d="M0 200 L105 82 L165 142 L238 62 L400 200 Z" fill="#b8aa98" opacity="0.8" /></svg>)
                  const AR = ['1.48/1', '1.69/1', '1.59/1']
                  return (
                    <div>
                      <h1 data-name="Page title" className="el-gp_title text-center" style={{ ...headStyle, color: ink, fontSize: 'clamp(2.6rem, 6.2vw, 5.6rem)', lineHeight: 1.1, margin: 0 }}>{String((r as any).site_settings?.text?.gp_title ?? 'Galleries')}</h1>
                      <div style={{ width: 'clamp(60px, 9.5vw, 120px)', height: 1, background: ink, margin: 'clamp(10px, 1.8vw, 24px) auto clamp(20px, 4.2vw, 56px)' }} />
                      {list.map((g, i) => { const c = gc(g); const odd = i % 2 === 1; return (
                        <div key={g.id} className={'grid items-center md:gap-0 ' + (odd ? 'md:grid-cols-[41%_59%]' : 'md:grid-cols-[58%_42%]')} style={{ borderTop: i > 0 ? `1px solid ${line}` : 'none', padding: 'clamp(12px, 2.2vw, 26px) 0' }}>
                          <a href={c.href} className={'group relative block overflow-hidden ' + (odd ? 'md:order-2' : '')} style={{ aspectRatio: AR[i % 3], background: '#E5E1DB' }}>{c.u ? gim(c.u) : mt}</a>
                          <div className={odd ? 'md:order-1' : ''} style={{ padding: odd ? '18px 0 0 6%' : '18px 0 0 5%' }}>
                            <div style={{ width: 'clamp(30px, 5.5vw, 70px)', height: 1, background: ink, marginBottom: 'clamp(14px, 3.4vw, 44px)' }} />
                            <p data-name="Gallery name" className="el-gal_name" style={{ ...headStyle, color: ink, fontSize: 'clamp(1.8rem, 4.6vw, 4.2rem)', lineHeight: 1.1, margin: 0 }}>{g.title}</p>
                            {g.line && <p data-name="Gallery count" className="el-gal_count" style={{ color: soft, fontSize: 'clamp(0.65rem, 1.5vw, 1.2rem)', letterSpacing: '0.3em', textTransform: 'uppercase', margin: 'clamp(8px, 1.4vw, 18px) 0 0' }}>{g.line}</p>}
                            <a data-name="View button" href={c.href} className="el-gal_link inline-block" style={{ marginTop: 'clamp(14px, 3vw, 40px)', border: `1px solid ${ink}`, color: ink, fontSize: 'clamp(0.6rem, 1.2vw, 1rem)', letterSpacing: '0.3em', textTransform: 'uppercase', padding: 'clamp(8px, 1vw, 14px) clamp(26px, 5vw, 70px)' }}>View</a>
                          </div>
                        </div>
                      ) })}
                    </div>
                  )
                })()}
                {L === 'pearl' && (() => {
                  const mt = (<svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full"><rect width="400" height="200" fill="#d8cfc4" /><circle cx="300" cy="58" r="16" fill="#b8aa98" opacity="0.55" /><path d="M0 200 L105 82 L165 142 L238 62 L400 200 Z" fill="#b8aa98" opacity="0.8" /></svg>)
                  return (
                    <div>
                      <h1 data-name="Page title" className="el-gp_title text-center" style={{ ...headStyle, fontStyle: 'italic', color: ink, fontSize: 'clamp(2.6rem, 5.6vw, 5rem)', lineHeight: 1.1, margin: '0 0 clamp(20px, 5vw, 62px)' }}>{String((r as any).site_settings?.text?.gp_title ?? 'Galleries')}</h1>
                      <div className="mx-auto grid grid-cols-1 sm:grid-cols-3" style={{ width: '88%', columnGap: '3.2%', rowGap: 'clamp(20px, 3.4vw, 44px)' }}>
                        {list.map((g) => { const c = gc(g); return (
                          <a key={g.id} href={c.href} className="group block"><div className="relative overflow-hidden" style={{ aspectRatio: '1.03/1', background: '#E5E1DB' }}>{c.u ? gim(c.u) : mt}</div><p data-name="Gallery name" className="el-gal_name text-center" style={{ ...headStyle, color: ink, fontSize: 'clamp(0.75rem, 1.5vw, 1.3rem)', letterSpacing: '0.2em', textTransform: 'uppercase', lineHeight: 1.2, margin: 0, paddingTop: 'clamp(8px, 1.4vw, 18px)' }}>{g.title}</p></a>
                        ) })}
                      </div>
                    </div>
                  )
                })()}
                {L === 'ruby' && (() => {
                  const mt = (<svg viewBox="0 0 400 100" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full"><rect width="400" height="100" fill="#cfc5b8" /><circle cx="310" cy="30" r="10" fill="#b8aa98" opacity="0.55" /><path d="M0 100 L110 40 L170 72 L245 28 L400 100 Z" fill="#b8aa98" opacity="0.8" /></svg>)
                  const BR = ['3.16/1', '3.2/1', '3.6/1', '3.54/1']
                  return (
                    <div style={{ width: '100vw', marginLeft: 'calc(50% - 50vw)', padding: '0 1.2vw' }}>
                      <h1 data-name="Page title" className="el-gp_title text-center" style={{ ...headStyle, color: ink, fontSize: 'clamp(2.6rem, 6.8vw, 6rem)', lineHeight: 1.1, margin: 0 }}>{String((r as any).site_settings?.text?.gp_title ?? 'Galleries')}</h1>
                      <div style={{ width: 'clamp(60px, 9.5vw, 120px)', height: 1, background: ink, margin: 'clamp(8px, 1.6vw, 22px) auto clamp(14px, 2.6vw, 34px)' }} />
                      <div className="flex flex-col" style={{ gap: '1.3vw' }}>
                        {list.map((g, i) => { const c = gc(g); return (
                          <a key={g.id} href={c.href} className="group relative flex items-center overflow-hidden" style={{ aspectRatio: BR[i % 4], minHeight: 150, background: '#E5E1DB' }}>{c.u ? gim(c.u) : mt}<div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(0,0,0,.4), rgba(0,0,0,.08) 62%)' }} /><p data-name="Gallery name" className="el-gal_name relative text-white" style={{ ...headStyle, fontSize: 'clamp(2.2rem, 8.4vw, 7.4rem)', lineHeight: 1, margin: 0, paddingLeft: '6%' }}>{g.title}</p></a>
                        ) })}
                      </div>
                    </div>
                  )
                })()}
                {L === 'topaz' && (() => {
                  const mt = (<svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full"><rect width="400" height="200" fill="#d8cfc4" /><circle cx="300" cy="58" r="16" fill="#b8aa98" opacity="0.55" /><path d="M0 200 L105 82 L165 142 L238 62 L400 200 Z" fill="#b8aa98" opacity="0.8" /></svg>)
                  const ROT = [-4, 4, 2, -2, -1, 5]
                  const script = "'Snell Roundhand','Segoe Script','Apple Chancery','Brush Script MT',cursive"
                  const card = (g: any, i: number) => { const c = gc(g); return (
                    <a key={g.id} href={c.href} className="group block hover:[--rot:0deg]" style={{ ['--rot' as any]: ROT[i % 6] + 'deg', transform: 'rotate(var(--rot))', transition: 'transform .3s', background: '#f4f1ec', padding: '4.2% 4.2% 0', boxShadow: '0 8px 22px rgba(60,45,30,.25)', marginBottom: '-1.5%', position: 'relative' }}>
                      <div className="relative overflow-hidden" style={{ aspectRatio: '1.17/1', background: '#E5E1DB' }}>{c.u ? gim(c.u) : mt}</div>
                      <p data-name="Gallery name" className="el-gal_name text-center" style={{ fontFamily: script, color: '#1f1812', fontSize: 'clamp(1.3rem, 4.4vw, 4rem)', lineHeight: 1.1, margin: 0, padding: 'clamp(8px, 1.8vw, 26px) 0 clamp(8px, 1.8vw, 24px)' }}>{g.title}</p>
                    </a>
                  ) }
                  return (
                    <div>
                      <h1 data-name="Page title" className="el-gp_title text-center" style={{ ...headStyle, color: ink, fontSize: 'clamp(2.6rem, 6.6vw, 6rem)', lineHeight: 1.1, margin: 0 }}>{String((r as any).site_settings?.text?.gp_title ?? 'Galleries')}</h1>
                      <div style={{ width: 'clamp(60px, 9.5vw, 120px)', height: 1, background: ink, margin: 'clamp(8px, 1.6vw, 22px) auto clamp(20px, 4vw, 56px)' }} />
                      <div className="mx-auto grid grid-cols-2 items-start" style={{ width: '92%', columnGap: '2%' }}>
                        <div>{list.filter((_, i) => i % 2 === 0).map((g, j) => card(g, j * 2))}</div>
                        <div style={{ marginTop: '4.5%' }}>{list.filter((_, i) => i % 2 === 1).map((g, j) => card(g, j * 2 + 1))}</div>
                      </div>
                    </div>
                  )
                })()}
                {L === 'garnet' && (
                  <div>
                    <h1 data-name="Page title" className="el-gp_title text-center" style={{ ...headStyle, color: ink, fontSize: 'clamp(2.6rem, 6.6vw, 6rem)', lineHeight: 1.1, margin: 0 }}>{String((r as any).site_settings?.text?.gp_title ?? 'Galleries')}</h1>
                    <div style={{ width: 'clamp(60px, 9.5vw, 120px)', height: 1, background: ink, margin: 'clamp(8px, 1.6vw, 22px) auto clamp(20px, 4vw, 56px)' }} />
                    <GalleryGarnet items={list.map((g) => { const c = gc(g); return { id: String(g.id), title: String(g.title ?? ''), u: c.u, href: c.href } })} headStyle={headStyle} ink={ink} />
                  </div>
                )}
                {L === 'agate' && (() => {
                  const mt = (<svg viewBox="0 0 300 450" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full"><rect width="300" height="450" fill="#d8cfc4" /><circle cx="220" cy="120" r="20" fill="#b8aa98" opacity="0.55" /><path d="M0 450 L80 230 L140 340 L210 210 L300 450 Z" fill="#b8aa98" opacity="0.8" /></svg>)
                  return (
                    <div>
                      <h1 data-name="Page title" className="el-gp_title text-center" style={{ ...headStyle, fontStyle: 'italic', color: accent, fontSize: 'clamp(2.8rem, 8vw, 7rem)', lineHeight: 1.1, margin: 0 }}>{String((r as any).site_settings?.text?.gp_title ?? 'Galleries')}</h1>
                      <div style={{ width: 'clamp(60px, 12vw, 150px)', height: 1, background: accent, margin: 'clamp(10px, 2vw, 28px) auto clamp(20px, 3.6vw, 48px)' }} />
                      <div className="mx-auto grid grid-cols-1 sm:grid-cols-3" style={{ width: '95.6%', columnGap: '2.3%', rowGap: 'clamp(24px, 5.7vw, 70px)' }}>
                        {list.map((g) => { const c = gc(g); const yr = g.line || ((g as any).created_at ? String(new Date((g as any).created_at).getFullYear()) : ''); return (
                          <a key={g.id} href={c.href} className="group block text-center">
                            <div className="relative overflow-hidden" style={{ aspectRatio: '2/3', borderRadius: '9999px 9999px 0 0', background: '#E5E1DB' }}>{c.u ? gim(c.u) : mt}</div>
                            <p data-name="Gallery name" className="el-gal_name" style={{ ...headStyle, color: accent, fontSize: 'clamp(1.1rem, 2.8vw, 2.4rem)', letterSpacing: '0.2em', textTransform: 'uppercase', lineHeight: 1.15, margin: 0, paddingTop: 'clamp(10px, 3.2vw, 40px)' }}>{g.title}</p>
                            {yr && <div className="flex items-center justify-center" style={{ gap: '1.8%', marginTop: 'clamp(8px, 1.6vw, 22px)' }}><span style={{ width: '20%', height: 1, background: accent }} /><span data-name="Gallery count" className="el-gal_count" style={{ ...headStyle, color: accent, fontSize: 'clamp(0.65rem, 1.5vw, 1.2rem)', letterSpacing: '0.25em' }}>{yr}</span><span style={{ width: '20%', height: 1, background: accent }} /></div>}
                          </a>
                        ) })}
                      </div>
                    </div>
                  )
                })()}
                {L === 'quartz' && (() => {
                  const mt = (<svg viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full"><rect width="300" height="400" fill="#d8cfc4" /><circle cx="220" cy="100" r="20" fill="#b8aa98" opacity="0.55" /><path d="M0 400 L80 200 L140 300 L210 180 L300 400 Z" fill="#b8aa98" opacity="0.8" /></svg>)
                  return (
                    <div>
                      <h1 data-name="Page title" className="el-gp_title text-center" style={{ ...headStyle, color: ink, fontSize: 'clamp(2.6rem, 7vw, 6.4rem)', lineHeight: 1.1, margin: 0 }}>{String((r as any).site_settings?.text?.gp_title ?? 'Galleries')}</h1>
                      <div style={{ width: 'clamp(60px, 10.9vw, 130px)', height: 1, background: ink, margin: 'clamp(8px, 1.6vw, 24px) auto clamp(20px, 3.8vw, 52px)' }} />
                      <div className="mx-auto grid grid-cols-2 sm:grid-cols-4" style={{ width: '97%', gap: 3 }}>
                        {list.map((g) => { const c = gc(g); return (
                          <a key={g.id} href={c.href} className="group block">
                            <div className="relative overflow-hidden" style={{ aspectRatio: '0.76/1', background: '#E5E1DB' }}>{c.u ? gim(c.u) : mt}</div>
                            <p data-name="Gallery name" className="el-gal_name text-center" style={{ ...headStyle, background: '#5a4a3f', color: '#f3ece2', fontSize: 'clamp(0.85rem, 2.2vw, 1.9rem)', letterSpacing: '0.12em', textTransform: 'uppercase', lineHeight: 1.2, margin: 0, padding: 'clamp(8px, 1.5vw, 20px) 4px' }}>{g.title}</p>
                          </a>
                        ) })}
                      </div>
                    </div>
                  )
                })()}
                {L === 'moonstone' && (() => {
                  const mt = (<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full"><rect width="400" height="300" fill="#d8cfc4" /><circle cx="300" cy="80" r="20" fill="#b8aa98" opacity="0.55" /><path d="M0 300 L110 120 L180 210 L260 100 L400 300 Z" fill="#b8aa98" opacity="0.8" /></svg>)
                  const PR = [1.056, 1.069, 1.15, 1.284]
                  const LR = [1.95, 2.65, 2.7, 2.5]
                  const nameEl = (g: any, k: number) => (<span data-name="Gallery name" className="el-gal_name" style={{ ...headStyle, fontStyle: 'italic', color: ink, fontSize: 'clamp(1.5rem, 4.4vw, 3.8rem)', lineHeight: 1.1 }}>{g.title}</span>)
                  const photo = (g: any, k: number) => { const c = gc(g); return (
                    <a key={g.id + 'p'} href={c.href} className="group relative block overflow-hidden" style={{ aspectRatio: String(PR[k % 4]) + '/1', background: '#E5E1DB' }}>{c.u ? gim(c.u) : mt}</a>
                  ) }
                  const label = (g: any, k: number, lineSide: 'left' | 'right') => { const c = gc(g); return (
                    <a key={g.id + 'l'} href={c.href} className="flex items-center" style={{ aspectRatio: String(LR[k % 4]) + '/1', gap: '4.4%', color: ink, textDecoration: 'none', justifyContent: lineSide === 'right' ? 'flex-end' : 'flex-start' }}>
                      {lineSide === 'left' && <span style={{ width: '15%', height: 1, background: ink, flexShrink: 0 }} />}
                      {nameEl(g, k)}
                      {lineSide === 'right' && <span style={{ width: '30%', height: 1, background: ink, flexShrink: 0 }} />}
                    </a>
                  ) }
                  return (
                    <div>
                      <h1 data-name="Page title" className="el-gp_title text-center" style={{ ...headStyle, color: ink, fontSize: 'clamp(2.6rem, 7.6vw, 6.8rem)', lineHeight: 1.1, margin: 0 }}>{String((r as any).site_settings?.text?.gp_title ?? 'Galleries')}</h1>
                      <div style={{ width: 'clamp(60px, 12.8vw, 130px)', height: 1, background: accent, margin: 'clamp(8px, 1.6vw, 22px) auto clamp(20px, 3.6vw, 48px)' }} />
                      <div className="md:hidden" style={{ width: '92%', margin: '0 auto' }}>
                        {list.map((g, k) => (<div key={g.id} style={{ marginBottom: 24 }}>{photo(g, k)}<p className="text-center" style={{ margin: '10px 0 0' }}><a href={gc(g).href} style={{ color: ink }}>{nameEl(g, k)}</a></p></div>))}
                      </div>
                      <div className="mx-auto hidden md:grid" style={{ width: '92.4%', gridTemplateColumns: '48.5% 48.5%', columnGap: '3%' }}>
                        <div>{list.map((g, k) => (k % 2 === 0 ? photo(g, k) : label(g, k, 'right')))}</div>
                        <div>{list.map((g, k) => (k % 2 === 0 ? label(g, k, 'left') : photo(g, k)))}</div>
                      </div>
                    </div>
                  )
                })()}
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
        const pkgsShown = sectionMode ? sitePkgs.slice(0, 3) : sitePkgs
        const pd = String((sectionMode ? prs.sectionDesign : prs.pageDesign) ?? '')
        if ((sectionMode ? PR_SEC : PR_PAGE).includes(pd)) {
          return sec('investment', null,
            <PricingDesign design={pd} title={t.titles.investment} pkgs={pkgsShown as any} fid={fid ?? ''} intro={t.pricing.intro ?? ''} note={t.pricing.note ?? ''}
              pkgIntro={t.pricing.pkgIntro} headStyle={headStyle} ink={ink} soft={soft} accent={accent} line={line} bg={bg} tint={tint}
              pics={(pickPics(4) as any[]).filter(Boolean) as string[]} fsp={fsp as any} fsr={fsr as any} />, tinted)
        }
        return sec('investment', t.titles.investment,
          <div className="mx-auto max-w-5xl">
            {(sectionMode ? [{ label: '', items: pkgsShown as any[] }] : groupBySession(sitePkgs as any)).map((g, gi) => (
              <div key={gi} className={gi > 0 ? 'mt-16' : ''}>
                {g.label && <p className="mb-8 text-center text-[11px] uppercase tracking-[0.28em]" style={{ color: accent }}>{g.label}</p>}
                {layoutBlocks(g.items)}
              </div>
            ))}
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
            <div className="mx-auto grid max-w-6xl items-center gap-8 md:grid-cols-[40%_1fr] md:gap-[3%]">
              <h2 data-name="Title" className="el-tes_title" style={{ ...headStyle, fontWeight: 400, fontSize: 'clamp(3.2rem, 10vw, 9.5rem)', lineHeight: 0.92, letterSpacing: '-0.02em', margin: 0, color: ink, whiteSpace: 'pre-line' }}>{String((r as any).site_settings?.text?.tes_title ?? 'Kind\nwords.')}</h2>
              <div>{list.slice(0, 3).map((q, i) => (
                <figure key={i} id={'tm-' + i} style={{ margin: 0, padding: 'clamp(16px, 2.8vw, 38px) 0', borderTop: i > 0 ? `1px solid ${accent}` : undefined }}>
                  <blockquote data-name="Quote" className="el-tes_quote" style={{ ...headStyle, fontWeight: 400, fontSize: 'clamp(1.2rem, 2.7vw, 2.6rem)', lineHeight: 1.2, margin: 0, color: ink, paddingLeft: '0.6em', textIndent: '-0.6em' }}>&ldquo;{q.text}&rdquo;</blockquote>
                  {q.who && <p data-name="Name" className="el-tes_name" style={{ color: ink, fontSize: 'clamp(0.65rem, 1.3vw, 1.2rem)', letterSpacing: '0.3em', textTransform: 'uppercase', margin: 'clamp(10px, 1.8vw, 24px) 0 0 0.6em' }}>{q.who}</p>}
                </figure>
              ))}</div>
            </div>)
          if (td === 'velvet') return out(
            <div className="mx-auto max-w-6xl">
              <div className="flex items-center justify-center gap-[3%]" style={{ marginBottom: 'clamp(20px, 4vw, 56px)' }}>
                <span className="hidden sm:block" style={{ height: 1, width: '9%', background: ink, opacity: 0.55 }} />
                <h2 data-name="Title" className="el-tes_title" style={{ ...headStyle, fontWeight: 400, fontSize: 'clamp(2.4rem, 6.4vw, 6rem)', lineHeight: 1, margin: 0, color: ink, textAlign: 'center' }}>{String((r as any).site_settings?.text?.tes_title ?? 'Kind words')}</h2>
                <span className="hidden sm:block" style={{ height: 1, width: '9%', background: ink, opacity: 0.55 }} />
              </div>
              <div className="grid gap-6 md:grid-cols-3" style={{ columnGap: 'clamp(12px, 2.4vw, 34px)' }}>{list.slice(0, 3).map((q, i) => {
                const im: any = (q as any).img || (pics as any)[i]
                return (
                  <figure key={i} id={'tm-' + i} style={{ margin: 0, padding: 'clamp(24px, 3.6vw, 48px) clamp(16px, 2.4vw, 32px)', borderRadius: 'clamp(18px, 2.8vw, 36px)', background: cardBg, textAlign: 'center' }}>
                    <div style={{ width: '50%', aspectRatio: '1 / 1', margin: '0 auto', borderRadius: '50%', overflow: 'hidden', background: tint }}>
                      {im ? <img src={typeof im === 'string' ? im : (im.u ?? im)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" style={{ width: '100%', height: '100%', display: 'block' }}><rect width="100" height="100" fill="#e4e2de" /><path d="M0 78 L28 42 L44 62 L62 30 L100 78 Z" fill="#c9c6c1" /><circle cx="74" cy="26" r="7" fill="#d3d0cb" /></svg>}
                    </div>
                    <blockquote data-name="Quote" className="el-tes_quote" style={{ ...headStyle, fontWeight: 400, fontSize: 'clamp(1.15rem, 2.2vw, 2.1rem)', lineHeight: 1.22, margin: 'clamp(14px, 2.4vw, 32px) 0 0', color: ink }}>&ldquo;{q.text}&rdquo;</blockquote>
                    <div style={{ width: '30%', height: 1, background: accent, margin: 'clamp(16px, 2.6vw, 36px) auto' }} />
                    {q.who && <p data-name="Name" className="el-tes_name" style={{ color: ink, fontSize: 'clamp(0.65rem, 1.3vw, 1.2rem)', letterSpacing: '0.3em', textTransform: 'uppercase', margin: 0 }}>{q.who}</p>}
                  </figure>
                )
              })}</div>
            </div>)
          if (td === 'silk') { const q = list[0]; if (!q) return null; const im: any = (q as any).img || (pics as any)[0]; return out(
            <figure id="tm-0" className="mx-auto grid max-w-6xl items-center gap-8 md:grid-cols-[1fr_40%] md:gap-[6%]" style={{ margin: 0 }}>
              <div>
                <span aria-hidden="true" style={{ ...headStyle, color: accent, fontSize: 'clamp(6rem, 15vw, 14rem)', lineHeight: 1, display: 'block', height: '0.5em', fontWeight: 700 }}>&ldquo;</span>
                <blockquote data-name="Quote" className="el-tes_quote" style={{ ...headStyle, fontWeight: 400, fontSize: 'clamp(1.7rem, 4.6vw, 4.4rem)', lineHeight: 1.12, margin: 'clamp(12px, 2vw, 28px) 0 0', color: ink }}>{q.text}&rdquo;</blockquote>
                <div style={{ width: 'clamp(50px, 8vw, 140px)', height: 1, background: accent, margin: 'clamp(18px, 3.2vw, 46px) 0' }} />
                {q.who && <p data-name="Name" className="el-tes_name" style={{ color: ink, fontSize: 'clamp(0.7rem, 1.5vw, 1.4rem)', letterSpacing: '0.3em', textTransform: 'uppercase', margin: 0 }}>{q.who}</p>}
              </div>
              <div style={{ aspectRatio: '0.86 / 1', width: '100%', overflow: 'hidden', background: tint }}>
                {im ? <img src={typeof im === 'string' ? im : (im.u ?? im)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : <svg viewBox="0 0 100 80" preserveAspectRatio="xMidYMid slice" style={{ width: '100%', height: '100%', display: 'block' }}><rect width="100" height="80" fill="#e4e2de" /><path d="M0 62 L28 30 L44 48 L62 22 L100 62 Z" fill="#c9c6c1" /><circle cx="76" cy="20" r="6" fill="#d3d0cb" /></svg>}
              </div>
            </figure>) }
          if (td === 'satin') return out(
            <div className="mx-auto max-w-6xl"><div className="flex items-center justify-center gap-[3%]" style={{ marginBottom: 'clamp(20px, 4vw, 56px)' }}>
                <span className="hidden sm:block" style={{ height: 1, width: '9%', background: accent }} />
                <h2 data-name="Title" className="el-tes_title" style={{ ...headStyle, fontWeight: 400, fontSize: 'clamp(2.4rem, 6.4vw, 6rem)', lineHeight: 1, margin: 0, color: ink, textAlign: 'center' }}>{String((r as any).site_settings?.text?.tes_title ?? 'Kind words')}</h2>
                <span className="hidden sm:block" style={{ height: 1, width: '9%', background: accent }} />
              </div>
              <TestiSlider mode="satin" list={quotesShown.slice(0, 8)} headStyle={headStyle} ink={ink} soft={soft} accent={accent} card={cardBg} /></div>)
          if (td === 'tweed') return out(
            <div className="mx-auto max-w-6xl">
              <div className="flex items-center justify-center gap-[3%]" style={{ marginBottom: 'clamp(20px, 4vw, 56px)' }}>
                <span className="hidden sm:block" style={{ height: 1, width: '9%', background: ink, opacity: 0.55 }} />
                <h2 data-name="Title" className="el-tes_title" style={{ ...headStyle, fontWeight: 400, fontSize: 'clamp(2.4rem, 6.4vw, 6rem)', lineHeight: 1, margin: 0, color: ink, textAlign: 'center' }}>{String((r as any).site_settings?.text?.tes_title ?? 'Kind words')}</h2>
                <span className="hidden sm:block" style={{ height: 1, width: '9%', background: ink, opacity: 0.55 }} />
              </div>
              <div className="columns-1 sm:columns-2 lg:columns-3" style={{ columnGap: 'clamp(12px, 2.4vw, 34px)' }}>{list.slice(0, 6).map((q, i) => {
                const dark = [0, 1, 1, 0, 0, 1][i] === 1
                const fg = dark ? '#ffffff' : ink
                return (
                  <figure key={i} id={'tm-' + i} className="break-inside-avoid" style={{ margin: 0, marginBottom: 'clamp(12px, 2.4vw, 34px)', padding: 'clamp(20px, 3.4vw, 46px) clamp(20px, 3.6vw, 50px)', borderRadius: 'clamp(12px, 1.8vw, 24px)', background: dark ? `color-mix(in srgb, ${accent} 78%, #4a3322)` : cardBg, color: fg }}>
                    <blockquote data-name="Quote" className="el-tes_quote" style={{ ...headStyle, fontStyle: 'italic', fontWeight: 400, fontSize: 'clamp(1.2rem, 2.4vw, 2.3rem)', lineHeight: 1.2, margin: 0, color: fg }}>&ldquo;{q.text}&rdquo;</blockquote>
                    <div style={{ width: 'clamp(36px, 5vw, 84px)', height: 1, background: fg, opacity: 0.8, margin: 'clamp(14px, 2.2vw, 30px) 0' }} />
                    {q.who && <p data-name="Name" className="el-tes_name" style={{ color: fg, fontSize: 'clamp(0.65rem, 1.3vw, 1.2rem)', letterSpacing: '0.3em', textTransform: 'uppercase', margin: 0 }}>{q.who}</p>}
                  </figure>
                )
              })}</div>
            </div>)
          if (td === 'mohair') { const q = list[0]; if (!q) return null; return out(
            <figure id="tm-0" className="mx-auto max-w-6xl" style={{ margin: 0 }}>
              <blockquote data-name="Quote" className="el-tes_quote" style={{ ...headStyle, fontWeight: 400, fontSize: 'clamp(1.7rem, 5.6vw, 5.4rem)', lineHeight: 1.12, margin: 0, color: ink, textAlign: 'center' }}>&ldquo;{String(q.text).split(/\*([^*]+)\*/).map((seg, k) => k % 2 ? <em key={k}>{seg}</em> : seg)}&rdquo;</blockquote>
              {q.who && <div className="flex items-center justify-end gap-[2%]" style={{ marginTop: 'clamp(24px, 6vw, 80px)' }}>
                <span style={{ height: 1, width: 'clamp(40px, 9vw, 150px)', background: ink }} />
                <p data-name="Name" className="el-tes_name" style={{ color: ink, fontSize: 'clamp(0.7rem, 1.5vw, 1.4rem)', letterSpacing: '0.3em', textTransform: 'uppercase', margin: 0 }}>{q.who}</p>
              </div>}
            </figure>) }
          if (td === 'lace') return out(
            <div className="mx-auto max-w-6xl">
              <div className="flex items-center justify-center gap-[3%]" style={{ marginBottom: 'clamp(20px, 4vw, 56px)' }}>
                <span className="hidden sm:block" style={{ height: 1, width: '9%', background: accent }} />
                <h2 data-name="Title" className="el-tes_title" style={{ ...headStyle, fontWeight: 400, fontSize: 'clamp(2.4rem, 6.4vw, 6rem)', lineHeight: 1, margin: 0, color: ink, textAlign: 'center' }}>{String((r as any).site_settings?.text?.tes_title ?? 'Kind words')}</h2>
                <span className="hidden sm:block" style={{ height: 1, width: '9%', background: accent }} />
              </div>
              <div className="grid gap-10 md:grid-cols-3" style={{ columnGap: '4%' }}>{list.slice(0, 3).map((q, i) => {
                const im = (q as any).img || (pics as any)[i]
                return (
                  <figure key={i} id={'tm-' + i} style={{ margin: 0, textAlign: 'center' }}>
                    <div style={{ aspectRatio: '1.2 / 1', width: '100%', overflow: 'hidden', background: tint }}>
                      {im ? <img src={typeof im === 'string' ? im : (im.u ?? im)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : <svg viewBox="0 0 100 80" preserveAspectRatio="xMidYMid slice" style={{ width: '100%', height: '100%', display: 'block' }}><rect width="100" height="80" fill="#e4e2de" /><path d="M0 62 L28 30 L44 48 L62 22 L100 62 Z" fill="#c9c6c1" /><circle cx="76" cy="20" r="6" fill="#d3d0cb" /></svg>}
                    </div>
                    <blockquote data-name="Quote" className="el-tes_quote" style={{ ...headStyle, fontStyle: 'italic', fontWeight: 400, fontSize: 'clamp(1.2rem, 2.3vw, 2.2rem)', lineHeight: 1.25, margin: 'clamp(16px, 2.6vw, 34px) 4% 0', color: ink }}>&ldquo;{q.text}&rdquo;</blockquote>
                    <div style={{ width: '26%', height: 1, background: accent, margin: 'clamp(14px, 2.4vw, 32px) auto' }} />
                    {q.who && <p data-name="Name" className="el-tes_name" style={{ color: ink, fontSize: 'clamp(0.7rem, 1.4vw, 1.3rem)', letterSpacing: '0.35em', textTransform: 'uppercase', margin: 0 }}>{q.who}</p>}
                  </figure>
                )
              })}</div>
            </div>)
          if (td === 'wool') return out(
            <div className="mx-auto max-w-6xl"><div className="flex items-center gap-[3%]" style={{ marginBottom: 'clamp(20px, 4vw, 56px)' }}>
                <h2 data-name="Title" className="el-tes_title" style={{ ...headStyle, fontWeight: 400, fontSize: 'clamp(2.4rem, 6.4vw, 6rem)', lineHeight: 1, margin: 0, color: ink }}>{String((r as any).site_settings?.text?.tes_title ?? 'What clients say.')}</h2>
                <span className="hidden sm:block" style={{ height: 1, flex: 1, maxWidth: '26%', background: accent }} />
              </div>
              <TestiSlider mode="wool" list={quotesShown.slice(0, 12)} headStyle={headStyle} ink={ink} soft={soft} accent={accent} card={cardBg} /></div>)
          if (td === 'cotton') return out(
            <div className="mx-auto grid max-w-6xl items-center gap-6 md:grid-cols-[26%_1fr] md:gap-0">
              <span aria-hidden="true" style={{ ...headStyle, color: accent, fontSize: 'clamp(7rem, 24vw, 22rem)', lineHeight: 0.8, display: 'block', height: '0.55em', paddingLeft: '2%' }}>&ldquo;</span>
              <div className="grid sm:grid-cols-2" style={{ columnGap: '6%', rowGap: 'clamp(16px, 2.4vw, 32px)' }}>{list.slice(0, 4).map((q, i) => (
                <figure key={i} id={'tm-' + i} style={{ margin: 0, paddingBottom: i < 2 ? 'clamp(14px, 2.6vw, 36px)' : 0, borderBottom: i < 2 ? `1px solid ${accent}` : undefined }}>
                  <blockquote data-name="Quote" className="el-tes_quote" style={{ ...headStyle, fontWeight: 400, fontSize: 'clamp(1.25rem, 3vw, 2.8rem)', lineHeight: 1.2, margin: 0, color: ink }}>&ldquo;{q.text}&rdquo;</blockquote>
                  {q.who && <p data-name="Name" className="el-tes_name" style={{ color: ink, fontSize: 'clamp(0.65rem, 1.4vw, 1.3rem)', letterSpacing: '0.3em', textTransform: 'uppercase', margin: 'clamp(10px, 2vw, 26px) 0 0 2%' }}>{q.who}</p>}
                </figure>
              ))}</div>
            </div>)
          { const q = list[0]; const im = (q?.img ?? pics[0]) as string | null; const script = "'Snell Roundhand','Segoe Script','Apple Chancery','Brush Script MT',cursive"; return out(
            <div className="relative mx-auto grid max-w-6xl items-center gap-8 overflow-hidden px-2 md:block md:aspect-[2/1] md:px-0">
              <div className="mx-auto w-[78%] max-w-[340px] md:absolute md:w-[38%] md:max-w-none md:[left:2.9%] md:[top:5%]" style={{ transform: 'rotate(-6deg)', background: '#f4f1ec', padding: '4.8% 4.8% 0', boxShadow: '0 10px 28px rgba(60,45,30,.22)', aspectRatio: '0.89 / 1' }}>
                <div className="relative w-full overflow-hidden" style={{ aspectRatio: '1 / 1', background: '#d8d0c6' }}>
                  {im ? <img src={im} alt="" className="absolute inset-0 h-full w-full object-cover" /> : (
                    <svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full"><rect width="200" height="200" fill="#d8d0c6" /><circle cx="140" cy="62" r="14" fill="#b8aa98" opacity="0.55" /><path d="M0 200 L58 92 L98 146 L136 84 L200 200 Z" fill="#b8aa98" opacity="0.8" /></svg>
                  )}
                </div>
              </div>
              <div className="md:absolute md:[left:44%] md:[top:9%] md:[width:53%]">
                <blockquote data-name="Quote" className="el-tes_quote" style={{ fontFamily: script, fontSize: 'clamp(1.5rem, 4.2vw, 3.9rem)', lineHeight: 1.4, color: ink, margin: 0 }}>&ldquo;{q?.text}&rdquo;</blockquote>
                <svg viewBox="0 0 320 12" fill="none" stroke={ink} strokeWidth="2.4" strokeLinecap="round" style={{ width: '33%', marginLeft: '11%', marginTop: 'clamp(12px, 3.4vw, 60px)', display: 'block' }}><path d="M2 10 C 90 5, 200 3, 318 2" /></svg>
                <p data-name="Name" className="el-tes_name" style={{ fontFamily: script, fontSize: 'clamp(1.5rem, 4.2vw, 3.9rem)', lineHeight: 1.2, color: ink, margin: 'clamp(8px, 1.6vw, 28px) 0 0 8%' }}>{q?.who}</p>
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
        const qa = (fd === 'dill' && isPreview && faq.length < 4 ? [...faq, ...['first', 'second', 'third', 'fourth'].slice(faq.length).map((n, j) => ({ id: 'phd' + j, question: 'Your ' + n + ' question', answer: 'Your answer goes here.' }))] : faq) as any[]
        const qst: any = { fontFamily: t.head, fontSize: fsp('fs-faqq', 20), color: ink }
        const ast: any = { fontFamily: t.body, fontSize: fsp('fs-faqa', 15), color: soft, lineHeight: 1.7 }
        if (fd === 'basil') return sec('faq', null,
          <div className="mx-auto max-w-6xl">
            <h2 data-name="Title" className="el-faq_title text-center" style={{ fontFamily: t.head, fontWeight: 400, fontSize: 'clamp(2.6rem, 6.4vw, 6rem)', lineHeight: 1, margin: 0, color: ink }}>{String((r as any).site_settings?.text?.faq_title ?? 'Good to know.')}</h2>
            <div className="mx-auto" style={{ width: '20%', height: 1, background: ink, opacity: 0.6, margin: 'clamp(18px, 3vw, 40px) auto clamp(20px, 4vw, 56px)' }} />
            <div className="grid sm:grid-cols-2" style={{ columnGap: 'clamp(24px, 6vw, 90px)' }}>{qa.map((f, i) => (
              <div key={i} style={{ padding: 'clamp(16px, 2.6vw, 36px) 0', borderBottom: i < qa.length - (qa.length % 2 || 2) ? `1px solid ${line}` : undefined }}>
                <p className="el-faq_q" style={{ ...qst, fontSize: fsp('fs-faqq', 34), lineHeight: 1.15 }}>{f.question}</p>
                <p className="el-faq_a mt-3" style={{ ...ast, fontSize: fsp('fs-faqa', 17), color: ink, letterSpacing: '0.02em' }}>{f.answer}</p>
              </div>))}</div>
          </div>, tinted)
        if (fd === 'thyme') { const im: any = (pickPics(1) as any[])[0]; const src = im ? (typeof im === 'string' ? im : (im.u ?? im)) : null; return sec('faq', null,
          <div className="mx-auto grid max-w-6xl md:grid-cols-[37%_1fr]">
            <div className="relative min-h-[320px] overflow-hidden" style={{ background: tint }}>
              {src ? <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <svg viewBox="0 0 100 130" preserveAspectRatio="xMidYMid slice" className="absolute inset-0" style={{ width: '100%', height: '100%' }}><rect width="100" height="130" fill="#e4e2de" /><path d="M0 98 L28 56 L44 80 L62 42 L100 98 Z" fill="#c9c6c1" /><circle cx="74" cy="30" r="8" fill="#d3d0cb" /></svg>}
            </div>
            <div style={{ padding: 'clamp(20px, 4vw, 56px)' }}>
              <h2 data-name="Title" className="el-faq_title" style={{ fontFamily: t.head, fontWeight: 400, fontSize: 'clamp(2.6rem, 6vw, 5.6rem)', lineHeight: 1, margin: 0, color: ink }}>{String((r as any).site_settings?.text?.faq_title ?? 'Questions')}</h2>
              <div style={{ width: '24%', height: 1, background: ink, opacity: 0.55, margin: 'clamp(16px, 2.6vw, 34px) 0 clamp(18px, 3vw, 40px)' }} />
              <div>{qa.map((f, i) => (
                <details key={i} open={i === 0} className="group" style={{ borderBottom: `1px solid ${line}` }}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 [&::-webkit-details-marker]:hidden" style={{ padding: 'clamp(14px, 1.8vw, 24px) 0' }}>
                    <span className="el-faq_q" style={{ ...qst, fontSize: fsp('fs-faqq', 30), lineHeight: 1.2 }}>{f.question}</span>
                    <span className="text-3xl leading-none group-open:hidden" style={{ color: ink }}>+</span><span className="hidden text-3xl leading-none group-open:inline" style={{ color: ink }}>&minus;</span>
                  </summary>
                  <p className="el-faq_a max-w-2xl" style={{ ...ast, fontSize: fsp('fs-faqa', 17), paddingBottom: 'clamp(16px, 2.4vw, 30px)' }}>{f.answer}</p>
                </details>))}</div>
            </div>
          </div>, tinted) }
        if (fd === 'mint') return sec('faq', null,
          <div className="mx-auto max-w-5xl">
            <h2 data-name="Title" className="el-faq_title text-center" style={{ fontFamily: t.head, fontWeight: 400, fontSize: 'clamp(2.4rem, 5.6vw, 5.2rem)', lineHeight: 1.05, margin: 0, color: ink }}>{String((r as any).site_settings?.text?.faq_title ?? 'Frequently asked.')}</h2>
            <div style={{ width: '14%', height: 1, background: accent, margin: 'clamp(16px, 2.6vw, 34px) auto clamp(18px, 3vw, 40px)' }} />
            <div>{qa.map((f, i) => (
              <div key={i} className="grid items-center" style={{ gridTemplateColumns: 'clamp(70px, 14vw, 190px) 1fr', padding: 'clamp(14px, 2.2vw, 28px) 0', borderTop: i > 0 ? `1px solid ${line}` : undefined }}>
                <span aria-hidden="true" style={{ fontFamily: t.head, color: accent, fontSize: 'clamp(2.6rem, 6vw, 5.4rem)', lineHeight: 1, textAlign: 'center', paddingRight: '8%' }}>{String(i + 1).padStart(2, '0')}</span>
                <div style={{ borderLeft: `1px solid ${accent}`, paddingLeft: 'clamp(16px, 3vw, 44px)' }}>
                  <p className="el-faq_q" style={{ ...qst, fontSize: fsp('fs-faqq', 36), lineHeight: 1.1 }}>{f.question}</p>
                  <p className="el-faq_a mt-2" style={{ ...ast, fontSize: fsp('fs-faqa', 17), color: ink, letterSpacing: '0.02em' }}>{f.answer}</p>
                </div>
              </div>))}</div>
          </div>, tinted)
        if (fd === 'dill') return sec('faq', null,
          <div className="mx-auto max-w-6xl">
            <h2 data-name="Title" className="el-faq_title text-center" style={{ fontFamily: t.head, fontWeight: 400, fontSize: 'clamp(2.4rem, 5.6vw, 5.2rem)', lineHeight: 1.05, margin: 0, color: ink }}>{String((r as any).site_settings?.text?.faq_title ?? 'Your questions answered.')}</h2>
            <div style={{ width: '14%', height: 1, background: accent, margin: 'clamp(16px, 2.6vw, 34px) auto clamp(22px, 4vw, 56px)' }} />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3" style={{ gap: 'clamp(12px, 1.6vw, 22px)' }}>{qa.map((f, i) => (
              <div key={i} style={{ background: `color-mix(in srgb, ${bg} 45%, #fff)`, borderRadius: 'clamp(20px, 2.6vw, 34px)', padding: 'clamp(20px, 2.6vw, 38px)', boxShadow: '0 1px 8px rgba(0,0,0,.05)' }}>
                <p className="el-faq_q" style={{ ...qst, fontSize: fsp('fs-faqq', 30), fontWeight: 600, lineHeight: 1.12 }}>{f.question}</p>
                <p className="el-faq_a mt-3" style={{ ...ast, fontSize: fsp('fs-faqa', 17), color: ink, lineHeight: 1.55, letterSpacing: '0.02em' }}>{f.answer}</p>
              </div>))}</div>
          </div>, tinted)
        return sec('faq', null,
          <div className="mx-auto max-w-4xl">
            <h2 data-name="Title" className="el-faq_title text-center" style={{ fontFamily: t.head, fontWeight: 400, fontSize: 'clamp(2.4rem, 5.6vw, 5.2rem)', lineHeight: 1.05, margin: 0, color: ink }}>{String((r as any).site_settings?.text?.faq_title ?? 'Questions.')}</h2>
            <div style={{ marginTop: 'clamp(20px, 4vw, 52px)' }}>{qa.map((f, i) => (
              <details key={i} open={i === 0} className="group" style={{ borderBottom: `1px solid ${line}` }}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 [&::-webkit-details-marker]:hidden" style={{ padding: 'clamp(16px, 2vw, 26px) 0' }}>
                  <span className="el-faq_q" style={{ ...qst, fontFamily: t.body, fontSize: fsp('fs-faqq', 28), lineHeight: 1.2 }}>{f.question}</span>
                  <span className="text-3xl leading-none group-open:hidden" style={{ color: ink }}>+</span><span className="hidden text-3xl leading-none group-open:inline" style={{ color: ink }}>&minus;</span>
                </summary>
                <p className="el-faq_a max-w-3xl" style={{ ...ast, fontSize: fsp('fs-faqa', 18), paddingBottom: 'clamp(18px, 2.6vw, 34px)' }}>{f.answer}</p>
              </details>))}</div>
          </div>, tinted)
      }
      case 'contact': {
        const cd = String((r as any).site_settings?.contactDesign ?? '')
        const msg0 = t.text.contact
        const msg = (!msg0 || msg0 === 'Tell me about your day. Check a date and send me a message.') ? 'Check my availability and send a note. I would love to hear about your day.' : msg0
        const ctitle = String((r as any).site_settings?.text?.con_title ?? 'Ready to book your session?')
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
          <div style={{ width: '100vw', marginLeft: 'calc(50% - 50vw)', padding: '0 clamp(16px, 4.4vw, 80px)' }}>
            <div className="flex flex-wrap items-center justify-between" style={{ gap: 'clamp(20px, 3vw, 54px)' }}>
              <div style={{ flex: '1 1 320px', maxWidth: 1100 }}>
                <h3 data-name="Heading" className="el-con_title" style={{ ...big, fontWeight: 600, fontSize: 'clamp(1.9rem, 5.2vw, 5.2rem)', lineHeight: 1.1, margin: 0 }}>{ctitle}</h3>
                <p data-name="Paragraph" className="el-con_msg whitespace-pre-line" style={{ ...msgStyle, fontSize: 'clamp(15px, 2.1vw, 34px)', letterSpacing: '0.02em', lineHeight: 1.55, maxWidth: '34ch', margin: 'clamp(12px, 1.8vw, 30px) 0 0' }}>{msg}</p>
              </div>
              <a href={resolveLink((r as any).site_settings?.contactBtn?.link, availHref)} className="cr-btn ct-btn inline-block uppercase" id="closing-btn" style={{ ...btnStyle, borderRadius: 4, fontSize: 'clamp(11px, 1.8vw, 29px)', fontWeight: 500, letterSpacing: '0.2em', padding: 'clamp(14px, 2vw, 34px) clamp(22px, 2.4vw, 42px)' }}>{t.text.contactBtn}</a>
            </div>
          </div>, tinted)
        if (cd === 'bar') return sec('contact', null,
          <div style={{ width: '100vw', marginLeft: 'calc(50% - 50vw)', borderTop: '1px solid ' + line, borderBottom: '1px solid ' + line }}>
            <div className="flex flex-wrap items-center justify-between" style={{ gap: 'clamp(14px, 2.4vw, 36px)', padding: 'clamp(18px, 2.6vw, 44px) clamp(16px, 2vw, 40px)' }}>
              <h3 data-name="Heading" className="el-con_title" style={{ ...big, fontWeight: 400, fontSize: 'clamp(1.7rem, 4.6vw, 4.6rem)', lineHeight: 1.1, margin: 0 }}>{ctitle}</h3>
              <a href={resolveLink((r as any).site_settings?.contactBtn?.link, availHref)} className="cr-btn ct-btn inline-block uppercase" id="closing-btn" style={{ ...btnStyle, borderRadius: 4, fontSize: 'clamp(11px, 1.55vw, 24px)', letterSpacing: '0.2em', padding: 'clamp(12px, 1.7vw, 28px) clamp(22px, 3.2vw, 54px)' }}>{t.text.contactBtn}</a>
            </div>
          </div>, tinted)
        if (cd === 'framed') return sec('contact', null,
          <div className="mx-auto text-center" style={{ width: '88%', maxWidth: 1600, border: '2px solid ' + ink, padding: 'clamp(28px, 5.6vw, 100px) clamp(16px, 3vw, 56px)' }}>
            <h3 data-name="Heading" className="el-con_title" style={{ ...big, fontWeight: 600, fontSize: 'clamp(1.8rem, 5vw, 5rem)', lineHeight: 1.1, margin: 0 }}>{ctitle}</h3>
            <p data-name="Paragraph" className="el-con_msg mx-auto whitespace-pre-line" style={{ ...msgStyle, fontSize: 'clamp(14px, 1.75vw, 28px)', letterSpacing: '0.02em', lineHeight: 1.6, maxWidth: '34ch', margin: 'clamp(14px, 2vw, 34px) auto 0' }}>{msg}</p>
            <div style={{ marginTop: 'clamp(22px, 3.4vw, 60px)' }}>
              <a href={resolveLink((r as any).site_settings?.contactBtn?.link, availHref)} className="cr-btn ct-btn inline-block uppercase" id="closing-btn" style={{ ...btnStyle, borderRadius: 4, fontSize: 'clamp(11px, 1.9vw, 30px)', fontWeight: 500, letterSpacing: '0.2em', padding: 'clamp(14px, 2vw, 34px) clamp(24px, 3.4vw, 60px)' }}>{t.text.contactBtn}</a>
            </div>
          </div>, tinted)
        if (cd === 'photo') {
          const pic = pickPics(1)[0]
          return sec('contact', null,
            <div className="relative overflow-hidden text-center" style={{ width: '100vw', marginLeft: 'calc(50% - 50vw)', minHeight: 'clamp(380px, 50vw, 900px)', background: '#6f685e' }}>
              {pic ? <img src={pic as string} alt="" className="absolute inset-0 h-full w-full object-cover" /> : (
                <svg viewBox="0 0 100 50" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full"><rect width="100" height="50" fill="#6f685e" /><path d="M0 50 28 22l12 12 18-16 42 32z" fill="#857e72" /><circle cx="76" cy="14" r="5" fill="#857e72" /></svg>
              )}
              <div className="absolute inset-0" style={{ background: 'rgba(40,25,15,0.5)' }} />
              <div className="relative flex flex-col items-center justify-center" style={{ minHeight: 'inherit', padding: 'clamp(40px, 6vw, 110px) clamp(16px, 4vw, 70px)' }}>
                <h3 data-name="Heading" className="el-con_title" style={{ ...big, color: '#fff', fontWeight: 600, fontSize: 'clamp(2rem, 5.6vw, 5.6rem)', lineHeight: 1.1, margin: 0 }}>{ctitle}</h3>
                <p data-name="Paragraph" className="el-con_msg mx-auto whitespace-pre-line" style={{ ...msgStyle, color: 'rgba(255,255,255,0.92)', fontSize: 'clamp(15px, 1.8vw, 29px)', letterSpacing: '0.02em', lineHeight: 1.6, maxWidth: '34ch', margin: 'clamp(14px, 2vw, 34px) auto 0' }}>{msg}</p>
                <div style={{ marginTop: 'clamp(22px, 3.4vw, 60px)' }}>
                  <a href={resolveLink((r as any).site_settings?.contactBtn?.link, availHref)} className="cr-btn ct-btn inline-block uppercase" id="closing-btn" style={{ ...btnStyle, background: '#fff', color: '#2B1D14', borderRadius: 4, fontSize: 'clamp(11px, 1.9vw, 30px)', fontWeight: 500, letterSpacing: '0.2em', padding: 'clamp(14px, 2vw, 34px) clamp(24px, 3.4vw, 60px)' }}>{t.text.contactBtn}</a>
                </div>
              </div>
            </div>, tinted, true)
        }
        if (cd === 'duo') {
          const pp = pickPics(2)
          const ph = (q: any, extra: string) => (
            <div className={extra} style={{ aspectRatio: '0.69 / 1', overflow: 'hidden', background: '#e4e1dc' }}>
              {q ? <img src={q as string} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : (
                <svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="xMidYMid slice"><rect width="100" height="100" fill="#e4e1dc" /><path d="M10 72 36 42l14 16 12-14 28 28z" fill="#c9c5be" /><circle cx="68" cy="30" r="6" fill="#c9c5be" /></svg>
              )}
            </div>
          )
          return sec('contact', null,
            <div style={{ width: '100vw', marginLeft: 'calc(50% - 50vw)', padding: '0 clamp(14px, 2.7vw, 48px)' }}>
              <div className="grid grid-cols-2 items-center md:grid-cols-[1fr_1.75fr_1fr]" style={{ gap: 'clamp(14px, 2vw, 36px)' }}>
                {ph(pp[0], 'order-2 md:order-1')}
                <div className="order-1 col-span-2 text-center md:order-2 md:col-span-1">
                  <h3 data-name="Heading" className="el-con_title" style={{ ...big, fontWeight: 600, fontSize: 'clamp(2rem, 4.4vw, 4.6rem)', lineHeight: 1.12, margin: 0 }}>{ctitle}</h3>
                  <p data-name="Paragraph" className="el-con_msg mx-auto whitespace-pre-line" style={{ ...msgStyle, fontSize: 'clamp(15px, 1.7vw, 28px)', letterSpacing: '0.02em', lineHeight: 1.55, maxWidth: '30ch', margin: 'clamp(16px, 2vw, 34px) auto 0' }}>{msg}</p>
                  <div style={{ marginTop: 'clamp(22px, 3.4vw, 60px)' }}>
                    <a href={resolveLink((r as any).site_settings?.contactBtn?.link, availHref)} className="cr-btn ct-btn inline-block uppercase" id="closing-btn" style={{ ...btnStyle, borderRadius: 4, fontSize: 'clamp(11px, 1.7vw, 27px)', fontWeight: 500, letterSpacing: '0.2em', padding: 'clamp(14px, 1.9vw, 32px) clamp(22px, 3.2vw, 56px)' }}>{t.text.contactBtn}</a>
                  </div>
                </div>
                {ph(pp[1], 'order-3')}
              </div>
            </div>, tinted)
        }
        return sec('contact', null,
          <div className="mx-auto text-center" style={{ maxWidth: 1400 }}>
            <h3 data-name="Heading" className="el-con_title" style={{ ...big, fontWeight: 600, fontSize: 'clamp(2rem, 5.6vw, 5.6rem)', lineHeight: 1.1, margin: 0 }}>{ctitle}</h3>
            <p data-name="Paragraph" className="el-con_msg mx-auto whitespace-pre-line" style={{ ...msgStyle, fontSize: 'clamp(15px, 1.9vw, 30px)', letterSpacing: '0.02em', lineHeight: 1.5, maxWidth: '62ch', margin: 'clamp(16px, 2.4vw, 40px) auto 0' }}>{msg}</p>
            <div style={{ marginTop: 'clamp(24px, 4.4vw, 76px)' }}>
              <a href={resolveLink((r as any).site_settings?.contactBtn?.link, availHref)} className="cr-btn ct-btn inline-block uppercase" id="closing-btn" style={{ ...btnStyle, borderRadius: 4, fontSize: 'clamp(11px, 1.9vw, 30px)', fontWeight: 500, letterSpacing: '0.2em', padding: 'clamp(14px, 2vw, 34px) clamp(26px, 3.4vw, 58px)' }}>{t.text.contactBtn}</a>
            </div>
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

  const GAL_N: Record<string, number> = { sahara: 3, gobi: 4, mojave: 3, atacama: 4, namib: 3, sonora: 4, kalahari: 4, thar: 3 }
  const padGal = (items: any[], design: string): any[] => {
    const need = GAL_N[design] ?? 0
    if (!isPreview || items.length >= need) return items
    const names = ['Wedding', 'Engagement', 'Family', 'Portraits']
    const out = [...items]
    while (out.length < need) { const i = out.length; out.push({ id: 'ph-g' + i, title: names[i % names.length], line: '', u: null, href: '#', n: 0 }) }
    return out
  }

  const doorPic = (k: string, i: number): string | null => {
    const ov = slotPics['explore:' + i]
    if (ov) { const u = photoUrl(ov) as string | null; if (u) return u }
    const own = k === 'galleries' ? (galleries[0] ? galleryCover(galleries[0] as any) : null) : k === 'about' ? ((aboutPhoto as any) || null) : null
    return (own as string | null) || pickPics(3)[i] || null
  }

  const exploreEl = doors.length > 0 && ex.show !== false ? (
          <section data-name="Explore section" id="explore" className={exLayout === 'rowan' ? '' : 'px-6 py-16'}>
          <div className={exLayout === 'rowan' ? 'w-full' : 'mx-auto max-w-6xl'}>
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
              <div className="grid gap-3 md:aspect-[2.04/1] md:[grid-template-columns:834fr_830fr] md:[grid-template-rows:1fr_1fr] md:gap-[1%]">
                {doors.map((b, i) => (
                  <a key={b.href} href={b.href} className={'relative block min-h-[240px] overflow-hidden ' + (i === 0 || doors.length === 2 ? 'md:row-span-2' : '')} style={{ background: tint }}>
                    {doorPic(b.k, i) ? <img src={doorPic(b.k, i) as string} alt="" className="absolute inset-0 h-full w-full object-cover" /> : (
                      <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full"><rect width="400" height="200" fill="#cfc4b8" /><circle cx="300" cy="58" r="16" fill="#b0a496" opacity="0.55" /><path d="M0 200 L105 82 L165 142 L238 62 L400 200 Z" fill="#b0a496" opacity="0.8" /></svg>
                    )}
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.62), rgba(0,0,0,0) 42%)' }} />
                    <span className="absolute flex items-center justify-center rounded-full bg-white" style={{ right: '2.4%', top: '3.4%', width: 'clamp(30px, 3.8vw, 44px)', height: 'clamp(30px, 3.8vw, 44px)', color: '#2A1F24', fontSize: 'clamp(14px, 1.8vw, 22px)' }}>&rarr;</span>
                    <p className="ex-t el-ex_title absolute text-white" style={{ ...headStyle, left: '4.4%', bottom: '3.4%', fontSize: 'clamp(2rem, 4.8vw, 3.8rem)', lineHeight: 1.05 }}>{b.t}</p>
                  </a>
                ))}
              </div>
            )}

            {exLayout === 'willow' && (
              <div>
                {doors.map((b, i) => {
                  const last = i === doors.length - 1
                  const fg = last ? '#fbf3e2' : ink
                  return (
                    <div key={b.href}>
                      {i > 0 && <div style={{ height: 1.5, background: ink }} />}
                      <a href={b.href} className="flex items-center transition hover:opacity-90 md:aspect-[5.7/1]" style={{ background: last ? accent : 'transparent', color: fg, padding: 'clamp(12px, 2vw, 24px) 2.4% clamp(12px, 2vw, 24px) 2.8%', marginTop: last ? 6 : 0, gap: 'clamp(12px, 2.4vw, 32px)' }}>
                        <span style={{ ...headStyle, color: last ? '#fbf3e2' : accent, fontSize: 'clamp(1.2rem, 2.8vw, 2.3rem)', width: 'clamp(30px, 4.4vw, 70px)', flexShrink: 0 }}>{String(i + 1).padStart(2, '0')}</span>
                        <span className="ex-t el-ex_title flex-1" style={{ ...headStyle, fontWeight: 300, fontSize: 'clamp(2.6rem, 9vw, 7.2rem)', lineHeight: 1.02, color: fg }}>{b.t}</span>
                        <div className="relative hidden shrink-0 overflow-hidden sm:block" style={{ width: '25.8%', aspectRatio: '1.87 / 1', background: tint }}>
                          {doorPic(b.k, i) ? <img src={doorPic(b.k, i) as string} alt="" className="absolute inset-0 h-full w-full object-cover" /> : (
                            <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full"><rect width="400" height="200" fill="#cfc4b8" /><circle cx="300" cy="58" r="16" fill="#b0a496" opacity="0.55" /><path d="M0 200 L105 82 L165 142 L238 62 L400 200 Z" fill="#b0a496" opacity="0.8" /></svg>
                          )}
                        </div>
                        <svg viewBox="0 0 58 24" fill="none" stroke={last ? '#fbf3e2' : accent} strokeWidth="2.4" style={{ width: 'clamp(30px, 3.7vw, 56px)', flexShrink: 0 }}><path d="M2 12 H54 M44 3 L55 12 L44 21" /></svg>
                      </a>
                    </div>
                  )
                })}
              </div>
            )}

            {exLayout === 'aspen' && (
              <div className={'grid items-end gap-4 ' + (doors.length === 3 ? 'md:[grid-template-columns:496fr_547fr_496fr] md:gap-[1.2%]' : 'sm:grid-flow-col sm:auto-cols-fr')}>
                {doors.map((b, i) => (
                  <a key={b.href} href={b.href} className="block text-center">
                    <div className="relative w-full overflow-hidden" style={{ aspectRatio: doors.length === 3 && i === 1 ? '0.787 / 1' : '0.83 / 1', borderRadius: '9999px 9999px 0 0', background: tint }}>
                      {doorPic(b.k, i) ? <img src={doorPic(b.k, i) as string} alt="" className="absolute inset-0 h-full w-full object-cover" /> : (
                        <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full"><rect width="400" height="200" fill="#cfc4b8" /><circle cx="300" cy="58" r="16" fill="#b0a496" opacity="0.55" /><path d="M0 200 L105 82 L165 142 L238 62 L400 200 Z" fill="#b0a496" opacity="0.8" /></svg>
                      )}
                    </div>
                    <div className="flex items-center justify-center" style={{ gap: 'clamp(8px, 1.4vw, 18px)', marginTop: 'clamp(8px, 1.4vw, 18px)' }}>
                      <p className="ex-t el-ex_title" style={{ ...headStyle, fontSize: 'clamp(1.6rem, 3.6vw, 3.2rem)', lineHeight: 1.1 }}>{b.t}</p>
                      <span className="flex shrink-0 items-center justify-center rounded-full text-white" style={{ background: accent, width: 'clamp(28px, 3.6vw, 42px)', height: 'clamp(28px, 3.6vw, 42px)', fontSize: 'clamp(14px, 1.8vw, 22px)' }}>&rarr;</span>
                    </div>
                  </a>
                ))}
              </div>
            )}

            {exLayout === 'alder' && (
              <div className="grid md:aspect-[2/1]" style={doors.length === 3 ? { gridTemplateColumns: undefined } : undefined}>
                <div className={'grid h-full ' + (doors.length === 3 ? 'md:[grid-template-columns:505fr_702fr_567fr]' : 'md:grid-flow-col md:auto-cols-fr')}>
                  {doors.map((b, i) => (
                    <a key={b.href} href={b.href} className="relative block min-h-[260px] overflow-hidden" style={{ background: tint }}>
                      {doorPic(b.k, i) ? <img src={doorPic(b.k, i) as string} alt="" className="absolute inset-0 h-full w-full object-cover" /> : (
                        <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full"><rect width="400" height="200" fill="#cfc4b8" /><circle cx="300" cy="58" r="16" fill="#b0a496" opacity="0.55" /><path d="M0 200 L105 82 L165 142 L238 62 L400 200 Z" fill="#b0a496" opacity="0.8" /></svg>
                      )}
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0) 46%)' }} />
                      <div className="absolute inset-x-0 text-center text-white" style={{ bottom: '6%' }}>
                        <div className="mx-auto h-[2px] w-[24%] bg-white" style={{ marginBottom: 'clamp(4px, 0.8vw, 10px)' }} />
                        <p className="ex-t el-ex_title" style={{ ...headStyle, fontSize: 'clamp(1.9rem, 4.4vw, 3.6rem)', lineHeight: 1.1 }}>{b.t}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {exLayout === 'maple' && (() => {
              const mtnSvg = <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full"><rect width="400" height="200" fill="#cfc4b8" /><circle cx="300" cy="58" r="16" fill="#b0a496" opacity="0.55" /><path d="M0 200 L105 82 L165 142 L238 62 L400 200 Z" fill="#b0a496" opacity="0.8" /></svg>
              return (
                <div className="grid gap-3 md:gap-[1.3%]">
                  {doors.length > 0 && (
                    <a href={doors[0].href} className="relative block min-h-[220px] overflow-hidden md:aspect-[3.17/1]" style={{ background: tint }}>
                      {doorPic(doors[0].k, 0) ? <img src={doorPic(doors[0].k, 0) as string} alt="" className="absolute inset-0 h-full w-full object-cover" /> : mtnSvg}
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.62), rgba(0,0,0,0) 45%)' }} />
                      <div className="absolute flex items-center" style={{ left: '2.5%', bottom: '8%', gap: 'clamp(10px, 1.6vw, 20px)' }}>
                        <p className="ex-t el-ex_title text-white" style={{ ...headStyle, fontSize: 'clamp(2.4rem, 5.4vw, 4.4rem)', lineHeight: 1 }}>{doors[0].t}</p>
                        <span className="flex shrink-0 items-center justify-center rounded-full bg-white" style={{ width: 'clamp(32px, 3.9vw, 46px)', height: 'clamp(32px, 3.9vw, 46px)', color: '#2A1F24', fontSize: 'clamp(14px, 1.8vw, 22px)' }}>&rarr;</span>
                      </div>
                    </a>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2 md:gap-[1.2%]">
                    {doors.slice(1).map((b, k) => {
                      const solid = k === doors.length - 2
                      return (
                        <a key={b.href} href={b.href} className="relative block min-h-[170px] overflow-hidden md:aspect-[2.82/1]" style={{ background: solid ? accent : tint }}>
                          {!solid && (doorPic(b.k, k + 1) ? <img src={doorPic(b.k, k + 1) as string} alt="" className="absolute inset-0 h-full w-full object-cover" /> : mtnSvg)}
                          {!solid && <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.62), rgba(0,0,0,0) 45%)' }} />}
                          <div className="absolute flex items-center" style={{ left: '6%', bottom: '10%', gap: 'clamp(8px, 1.2vw, 16px)' }}>
                            <p className="ex-t el-ex_title" style={{ ...headStyle, color: solid ? '#f6ecd9' : '#fff', fontSize: 'clamp(2rem, 4.4vw, 3.6rem)', lineHeight: 1 }}>{b.t}</p>
                            <span className="flex shrink-0 items-center justify-center rounded-full" style={{ background: solid ? '#f6ecd9' : '#fff', width: 'clamp(26px, 3vw, 36px)', height: 'clamp(26px, 3vw, 36px)', color: '#2A1F24', fontSize: 'clamp(12px, 1.5vw, 18px)' }}>&rarr;</span>
                          </div>
                        </a>
                      )
                    })}
                  </div>
                </div>
              )
            })()}

            {exLayout === 'elm' && (() => {
              // left%, top%, width%, rotate, z
              const pos = [
                ['2.3%', '10%', '31%', '-5.5deg', 1],
                ['33.5%', '5.4%', '32.9%', '0deg', 3],
                ['66.5%', '10.7%', '31.3%', '6deg', 2],
              ] as const
              return (
                <div className="flex flex-col items-center gap-8 py-4 md:relative md:block md:aspect-[2/1] md:py-0">
                  {doors.slice(0, 3).map((b, i) => (
                    <a key={b.href} href={b.href} className="flex w-full max-w-[300px] flex-col bg-white md:absolute md:max-w-none md:aspect-[0.756/1] md:[left:var(--l)] md:[top:var(--t)] md:[width:var(--w)] md:[transform:rotate(var(--r))]" style={{ ['--l' as any]: pos[i][0], ['--t' as any]: pos[i][1], ['--w' as any]: pos[i][2], ['--r' as any]: pos[i][3], zIndex: pos[i][4], padding: '3.8% 3.8% 0', boxShadow: '0 6px 18px rgba(60,40,20,0.22)', color: '#2A1F24' }}>
                      <div className="relative w-full overflow-hidden" style={{ aspectRatio: '0.884 / 1', background: tint }}>
                        {doorPic(b.k, i) ? <img src={doorPic(b.k, i) as string} alt="" className="absolute inset-0 h-full w-full object-cover" /> : (
                          <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full"><rect width="400" height="200" fill="#cfc4b8" /><circle cx="300" cy="58" r="16" fill="#b0a496" opacity="0.55" /><path d="M0 200 L105 82 L165 142 L238 62 L400 200 Z" fill="#b0a496" opacity="0.8" /></svg>
                        )}
                      </div>
                      <div className="flex flex-1 items-center justify-center py-4 md:py-0">
                        <p className="ex-t el-ex_title" style={{ ...headStyle, fontSize: 'clamp(1.7rem, 3.8vw, 3rem)', lineHeight: 1.1 }}>{b.t}</p>
                      </div>
                    </a>
                  ))}
                </div>
              )
            })()}

            {exLayout === 'hawthorn' && (
              <div className={'grid gap-8 ' + (doors.length === 3 ? 'md:grid-cols-3 md:gap-[2%]' : 'sm:grid-flow-col sm:auto-cols-fr')}>
                {doors.map((b, i) => (
                  <a key={b.href} href={b.href} className="block text-center">
                    <div className="relative mx-auto w-full" style={{ aspectRatio: '1 / 1', borderRadius: '50%', border: '2.5px solid ' + accent, padding: '2.2%', background: '#fff' }}>
                      <div className="relative h-full w-full overflow-hidden" style={{ borderRadius: '50%', background: tint }}>
                        {doorPic(b.k, i) ? <img src={doorPic(b.k, i) as string} alt="" className="absolute inset-0 h-full w-full object-cover" /> : (
                          <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full"><rect width="400" height="200" fill="#cfc4b8" /><circle cx="300" cy="58" r="16" fill="#b0a496" opacity="0.55" /><path d="M0 200 L105 82 L165 142 L238 62 L400 200 Z" fill="#b0a496" opacity="0.8" /></svg>
                        )}
                      </div>
                    </div>
                    <p className="ex-t el-ex_title" style={{ ...headStyle, fontSize: 'clamp(1.9rem, 4.4vw, 3.5rem)', lineHeight: 1.1, marginTop: 'clamp(10px, 2vw, 26px)' }}>{b.t}</p>
                    <div className="mx-auto" style={{ width: '34%', height: 4, background: accent, marginTop: 'clamp(8px, 1.6vw, 22px)' }} />
                  </a>
                ))}
              </div>
            )}

            {exLayout === 'linden' && (
              <div className={'grid gap-4 ' + (doors.length === 3 ? 'md:grid-cols-3 md:gap-[1.1%]' : 'sm:grid-flow-col sm:auto-cols-fr')}>
                {doors.map((b, i) => (
                  <a key={b.href} href={b.href} className="block overflow-hidden bg-white" style={{ borderRadius: 'clamp(14px, 1.6vw, 26px)' }}>
                    <div className="relative w-full overflow-hidden" style={{ aspectRatio: '0.883 / 1', background: tint }}>
                      {doorPic(b.k, i) ? <img src={doorPic(b.k, i) as string} alt="" className="absolute inset-0 h-full w-full object-cover" /> : (
                        <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full"><rect width="400" height="200" fill="#cfc4b8" /><circle cx="300" cy="58" r="16" fill="#b0a496" opacity="0.55" /><path d="M0 200 L105 82 L165 142 L238 62 L400 200 Z" fill="#b0a496" opacity="0.8" /></svg>
                      )}
                    </div>
                    <div className="flex items-center justify-between" style={{ padding: 'clamp(10px, 2.2vw, 28px) 6%' }}>
                      <p className="ex-t el-ex_title" style={{ ...headStyle, fontSize: 'clamp(1.7rem, 3.8vw, 3rem)', lineHeight: 1.1 }}>{b.t}</p>
                      <span className="flex shrink-0 items-center justify-center rounded-full text-white" style={{ background: accent, width: 'clamp(32px, 3.9vw, 48px)', height: 'clamp(32px, 3.9vw, 48px)', fontSize: 'clamp(14px, 1.8vw, 22px)' }}>&rarr;</span>
                    </div>
                  </a>
                ))}
              </div>
            )}

            {exLayout === 'rowan' && (
              <div style={{ background: hexOk(secStyles.explore?.bg) ? 'transparent' : '#1d1613', padding: 'clamp(22px, 3.4vw, 64px) 2.9%', width: '100vw', marginLeft: 'calc(50% - 50vw)' }}>
                <div className={'grid gap-3 ' + (doors.length === 3 ? 'md:grid-cols-3 md:gap-[1.1%]' : 'sm:grid-flow-col sm:auto-cols-fr')}>
                  {doors.map((b, i) => (
                    <a key={b.href} href={b.href} className="relative block min-h-[320px] overflow-hidden md:aspect-[0.668/1]" style={{ background: tint }}>
                      {doorPic(b.k, i) ? <img src={doorPic(b.k, i) as string} alt="" className="absolute inset-0 h-full w-full object-cover" /> : (
                        <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full"><rect width="400" height="200" fill="#cfc4b8" /><circle cx="300" cy="58" r="16" fill="#b0a496" opacity="0.55" /><path d="M0 200 L105 82 L165 142 L238 62 L400 200 Z" fill="#b0a496" opacity="0.8" /></svg>
                      )}
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(18,12,10,0.82), rgba(18,12,10,0) 40%)' }} />
                      <div className="absolute" style={{ left: '8%', right: '6%', bottom: '5.5%' }}>
                        <div className="flex items-center" style={{ gap: 'clamp(8px, 1.4vw, 18px)' }}>
                          <span style={{ ...headStyle, color: hexOk(secStyles.explore?.accent) || '#c9a35a', fontSize: 'clamp(1.2rem, 2.6vw, 2.2rem)', lineHeight: 1 }}>{String(i + 1).padStart(2, '0')}</span>
                          <span style={{ display: 'block', height: 2, width: 'clamp(40px, 6.2vw, 80px)', background: hexOk(secStyles.explore?.accent) || '#c9a35a' }} />
                        </div>
                        <p className="ex-t el-ex_title" style={{ ...headStyle, color: '#f2e8d8', fontSize: 'clamp(2rem, 4.8vw, 3.8rem)', lineHeight: 1.05, marginTop: 'clamp(2px, 0.5vw, 8px)' }}>{b.t}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {exLayout === 'beech' && (() => {
              const big = doors.find((x) => x.k === 'book') ?? doors[doors.length - 1]
              const small = doors.filter((x) => x !== big)
              const bigIdx = doors.indexOf(big)
              const mtnSvg = <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full"><rect width="400" height="200" fill="#cfc4b8" /><circle cx="300" cy="58" r="16" fill="#b0a496" opacity="0.55" /><path d="M0 200 L105 82 L165 142 L238 62 L400 200 Z" fill="#b0a496" opacity="0.8" /></svg>
              return (
                <div className="grid gap-3 md:aspect-[2.09/1] md:[grid-template-columns:974fr_668fr] md:[grid-template-rows:1fr_1fr] md:gap-[1.2%]">
                  <a href={big.href} className="relative block min-h-[320px] overflow-hidden md:row-span-2" style={{ background: tint, border: '1px solid ' + ink }}>
                    {doorPic(big.k, bigIdx) ? <img src={doorPic(big.k, bigIdx) as string} alt="" className="absolute inset-0 h-full w-full object-cover" /> : mtnSvg}
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), rgba(0,0,0,0) 45%)' }} />
                    <div className="absolute" style={{ left: '3.4%', bottom: '3.4%' }}>
                      <p className="ex-t el-ex_title text-white" style={{ ...headStyle, fontSize: 'clamp(2.6rem, 6vw, 4.8rem)', lineHeight: 1 }}>{big.t}</p>
                      <span className="ex-s el-ex_sub inline-block text-white" style={{ ...headStyle, background: accent, fontSize: 'clamp(1rem, 2.1vw, 1.6rem)', padding: 'clamp(6px, 0.9vw, 12px) clamp(14px, 2vw, 26px)', marginTop: 'clamp(8px, 1.4vw, 18px)', letterSpacing: 0 }}>{big.s}</span>
                    </div>
                  </a>
                  {small.map((b) => (
                    <a key={b.href} href={b.href} className="flex min-h-[140px] items-center justify-between" style={{ background: '#fff', border: '1.5px solid ' + ink, padding: '0 6%' }}>
                      <p className="ex-t el-ex_title" style={{ ...headStyle, fontSize: 'clamp(1.9rem, 4.6vw, 3.6rem)', lineHeight: 1.1 }}>{b.t}</p>
                      <svg viewBox="0 0 58 24" fill="none" stroke={accent} strokeWidth="2.4" style={{ width: 'clamp(32px, 3.6vw, 52px)', flexShrink: 0 }}><path d="M2 12 H54 M44 3 L55 12 L44 21" /></svg>
                    </a>
                  ))}
                </div>
              )
            })()}

            {exLayout === 'sorrel' && (() => {
              const holes = (
                <div className="flex justify-between" style={{ padding: '1.05% 1.6% 1.05% 1.5%' }} aria-hidden="true">
                  {Array.from({ length: 30 }, (_, k) => (
                    <span key={k} style={{ display: 'block', width: '1.58%', aspectRatio: '1 / 1', borderRadius: '26%', background: '#f6f1ea' }} />
                  ))}
                </div>
              )
              return (
                <div style={{ background: '#1f1917' }}>
                  {holes}
                  <div className={'grid gap-3 ' + (doors.length === 3 ? 'md:grid-cols-3 md:gap-[1.2%]' : 'sm:grid-flow-col sm:auto-cols-fr')} style={{ padding: '0 1.3%' }}>
                    {doors.map((b, i) => (
                      <a key={b.href} href={b.href} className="block">
                        <div className="relative w-full overflow-hidden" style={{ aspectRatio: '1.35 / 1', background: tint }}>
                          {doorPic(b.k, i) ? <img src={doorPic(b.k, i) as string} alt="" className="absolute inset-0 h-full w-full object-cover" /> : (
                            <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full"><rect width="400" height="200" fill="#cfc4b8" /><circle cx="300" cy="58" r="16" fill="#b0a496" opacity="0.55" /><path d="M0 200 L105 82 L165 142 L238 62 L400 200 Z" fill="#b0a496" opacity="0.8" /></svg>
                          )}
                        </div>
                        <div className="flex items-center justify-center" style={{ gap: 'clamp(8px, 1.2vw, 16px)', padding: 'clamp(6px, 1.2vw, 14px) 0' }}>
                          <p className="ex-t el-ex_title" style={{ ...headStyle, color: '#f6f1ea', fontSize: 'clamp(1.5rem, 3.4vw, 2.7rem)', lineHeight: 1.1 }}>{b.t}</p>
                          <svg viewBox="0 0 40 18" fill="none" stroke="#e3a83c" strokeWidth="2.2" style={{ width: 'clamp(22px, 2.8vw, 36px)', flexShrink: 0 }}><path d="M1 9 H37 M29 2 L38 9 L29 16" /></svg>
                        </div>
                      </a>
                    ))}
                  </div>
                  {holes}
                </div>
              )
            })()}

            {exLayout === 'tansy' && (
              <div className={'grid gap-3 ' + (doors.length === 3 ? 'md:[grid-template-columns:324fr_976fr_324fr] md:aspect-[2.01/1] md:gap-[0.7%]' : 'sm:grid-flow-col sm:auto-cols-fr')}>
                {doors.map((b, i) => {
                  const center = doors.length === 3 ? i === 1 : true
                  return (
                    <a key={b.href} href={b.href} className="relative block min-h-[280px] overflow-hidden" style={{ background: tint }}>
                      {doorPic(b.k, i) ? <img src={doorPic(b.k, i) as string} alt="" className="absolute inset-0 h-full w-full object-cover" /> : (
                        <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full"><rect width="400" height="200" fill="#cfc4b8" /><circle cx="300" cy="58" r="16" fill="#b0a496" opacity="0.55" /><path d="M0 200 L105 82 L165 142 L238 62 L400 200 Z" fill="#b0a496" opacity="0.8" /></svg>
                      )}
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.62), rgba(0,0,0,0) 45%)' }} />
                      {center ? (
                        <div className="absolute flex items-center" style={{ left: '4%', bottom: '5.5%', gap: 'clamp(10px, 1.6vw, 20px)' }}>
                          <p className="ex-t el-ex_title text-white" style={{ ...headStyle, fontSize: 'clamp(2.4rem, 5.4vw, 4.4rem)', lineHeight: 1 }}>{b.t}</p>
                          <span className="flex shrink-0 items-center justify-center rounded-full bg-white" style={{ width: 'clamp(32px, 4vw, 48px)', height: 'clamp(32px, 4vw, 48px)', color: '#2A1F24', fontSize: 'clamp(14px, 1.8vw, 22px)' }}>&rarr;</span>
                        </div>
                      ) : (
                        <p className="ex-t el-ex_title absolute text-white" style={{ ...headStyle, left: '11%', bottom: '4%', writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: 'clamp(2rem, 4.6vw, 3.8rem)', lineHeight: 1 }}>{b.t}</p>
                      )}
                    </a>
                  )
                })}
              </div>
            )}{exLayout === 'lines' && (
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
      <Addons list={(r as any).site_settings?.addons} accent={t.accent} pics={(r as any).site_settings?.slotPics} />
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
                        {spo('follow', k, pics[k]) ? <img src={spo('follow', k, pics[k])} alt="" className="absolute inset-0 h-full w-full object-cover" /> : mtn('#e6dfd5', '#c9bfb1')}
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
                        {spo('stories', k, pics[k]) ? <img src={spo('stories', k, pics[k])} alt="" className="absolute inset-0 h-full w-full object-cover" /> : mtn('#e6dfd5', '#c9bfb1')}
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
                        {spo('follow', k, pics[k]) ? <img src={spo('follow', k, pics[k])} alt="" className="absolute inset-0 h-full w-full object-cover" /> : mtn('#e6dfd5', '#c9bfb1')}
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
                        {spo('featured', k, pics[k]) ? <img src={spo('featured', k, pics[k])} alt="" className="absolute inset-0 h-full w-full object-cover" /> : mtn('#2b2b2b', '#4a4a4a')}
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
              {spo('featured', k, pics[k]) ? <img src={spo('featured', k, pics[k])} alt="" className="absolute inset-0 h-full w-full object-cover" /> : mtn('#ead9d0', '#cdb3a8')}
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
          <React.Fragment key={k}>{((hid: boolean) => { curSec.k = k; const zv = Number(secZoom[k]); const zk = zv > 0.39 && zv < 0.995 ? zv : 1; const bgv = hexOk(secStyles[k]?.bg); const outer: React.CSSProperties = { background: bgv ?? undefined }; const inner = <div style={zk < 1 ? ({ zoom: zk } as React.CSSProperties) : undefined}>{renderSection(k, i % 2 === 1)}</div>; return isPreview ? (<div data-sec={k} data-secbg={k} data-sc={zk} style={hid ? { display: 'none' } : outer}>{hid ? null : inner}</div>) : hid ? null : (zk < 1 || bgv) ? (<div data-secbg={k} style={outer}>{inner}</div>) : renderSection(k, i % 2 === 1) })(((r as any).site_settings?.hiddenSecs ?? []).includes(k))}</React.Fragment>
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
