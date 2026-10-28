export type FontCat = 'serif' | 'sans' | 'script' | 'display'
type FontOpt = { label: string; family: string; gf: string; cat: FontCat; weights: number[] }

const GENERIC: Record<FontCat, string> = {
  serif: 'Georgia, serif',
  sans: 'system-ui, sans-serif',
  script: 'cursive',
  display: 'Georgia, serif',
}
function mk(label: string, cat: FontCat, gf?: string): FontOpt {
  const g = gf ?? label.replace(/ /g, '+')
  const m = /wght@([0-9;]+)/.exec(g)
  const weights = m ? m[1].split(';').map(Number) : [400]
  return { label, cat, family: `'${label}', ${GENERIC[cat]}`, gf: g, weights }
}

const LEGACY: Record<string, FontOpt> = {
  cormorant: mk('Cormorant Garamond', 'serif', 'Cormorant+Garamond:wght@400;500;600'),
  playfair: mk('Playfair Display', 'serif', 'Playfair+Display:wght@400;500;600'),
  dmserif: mk('DM Serif Display', 'serif', 'DM+Serif+Display'),
  bodoni: mk('Bodoni Moda', 'serif', 'Bodoni+Moda:wght@400;500;600'),
  italiana: mk('Italiana', 'serif', 'Italiana'),
  lora: mk('Lora', 'serif', 'Lora:wght@400;500'),
  josefin: mk('Josefin Sans', 'sans', 'Josefin+Sans:wght@300;400;600'),
  montserrat: mk('Montserrat', 'sans', 'Montserrat:wght@300;400;500;600'),
  worksans: mk('Work Sans', 'sans', 'Work+Sans:wght@300;400;500'),
  raleway: mk('Raleway', 'sans', 'Raleway:wght@300;400;500;600'),
}

const MORE: [string, FontCat][] = [
  ['EB Garamond', 'serif'], ['Libre Baskerville', 'serif'], ['Cinzel', 'serif'], ['Cormorant', 'serif'],
  ['Cormorant Infant', 'serif'], ['Marcellus', 'serif'], ['Gilda Display', 'serif'], ['Prata', 'serif'],
  ['Abril Fatface', 'serif'], ['Fraunces', 'serif'], ['Crimson Text', 'serif'], ['Spectral', 'serif'],
  ['Libre Caslon Text', 'serif'], ['Old Standard TT', 'serif'], ['Rufina', 'serif'], ['Yeseva One', 'serif'],
  ['Bellefair', 'serif'], ['Noto Serif Display', 'serif'], ['Young Serif', 'serif'], ['Instrument Serif', 'serif'],
  ['Newsreader', 'serif'],
  ['Inter', 'sans'], ['Poppins', 'sans'], ['Jost', 'sans'], ['Lato', 'sans'], ['Open Sans', 'sans'],
  ['Nunito Sans', 'sans'], ['Manrope', 'sans'], ['DM Sans', 'sans'], ['Outfit', 'sans'], ['Figtree', 'sans'],
  ['Karla', 'sans'], ['Quicksand', 'sans'], ['Questrial', 'sans'], ['Tenor Sans', 'sans'], ['Syncopate', 'sans'],
  ['Archivo', 'sans'], ['Space Grotesk', 'sans'], ['Cabin', 'sans'], ['Mulish', 'sans'], ['Poiret One', 'sans'],
  ['Didact Gothic', 'sans'], ['Urbanist', 'sans'], ['Albert Sans', 'sans'],
  ['Great Vibes', 'script'], ['Allura', 'script'], ['Dancing Script', 'script'], ['Pinyon Script', 'script'],
  ['Parisienne', 'script'], ['Sacramento', 'script'], ['Alex Brush', 'script'], ['Playball', 'script'],
  ['Tangerine', 'script'], ['Italianno', 'script'], ['Satisfy', 'script'], ['Mrs Saint Delafield', 'script'],
  ['La Belle Aurore', 'script'], ['Cookie', 'script'],
  ['Bebas Neue', 'display'], ['Oswald', 'display'], ['Anton', 'display'], ['Limelight', 'display'],
  ['Julius Sans One', 'display'], ['Federo', 'display'], ['Barlow Condensed', 'display'],
]

const W: Record<string, string> = {
  'Inter': '100;200;300;400;500;600;700',
  'Poppins': '100;200;300;400;500;600;700',
  'Jost': '100;200;300;400;500;600;700',
  'Lato': '100;300;400;700',
  'Open Sans': '300;400;500;600;700',
  'Nunito Sans': '200;300;400;600;700',
  'Manrope': '200;300;400;500;600;700',
  'DM Sans': '100;200;300;400;500;600;700',
  'Outfit': '100;200;300;400;500;600;700',
  'Urbanist': '100;200;300;400;500;600;700',
  'Oswald': '200;300;400;500;600;700',
  'Fraunces': '100;200;300;400;500;600;700',
  'Cormorant': '300;400;500;600;700',
  'Barlow Condensed': '100;200;300;400;500;600;700',
  'Archivo': '100;200;300;400;500;600;700',
  'Mulish': '200;300;400;500;600;700',
  'Karla': '200;300;400;500;600;700',
  'Quicksand': '300;400;500;600;700',
  'Spectral': '200;300;400;500;600;700',
  'EB Garamond': '400;500;600;700',
  'Cinzel': '400;500;600;700',
}
export const FONT_OPTIONS: Record<string, FontOpt> = { ...LEGACY }
for (const [label, cat] of MORE) {
  const key = label.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (!FONT_OPTIONS[key]) FONT_OPTIONS[key] = mk(label, cat, W[label] ? label.replace(/ /g, '+') + ':wght@' + W[label] : undefined)
}

export const PAIR_PRESETS: Record<string, { name: string; head: string; body: string }> = {
  serif: { name: 'Classic', head: 'cormorant', body: 'montserrat' },
  modern: { name: 'Modern', head: 'josefin', body: 'worksans' },
  romantic: { name: 'Romantic', head: 'playfair', body: 'lora' },
}

const EL_DEF: Record<string, [number, number]> = { menu_links: [11, 11], menu_brand: [24, 24], ex_label: [11, 11], ex_title: [24, 30], ex_sub: [10, 11], con_msg: [15, 15], con_social: [11, 11], ft_line: [13, 13], ft_copy: [11, 11], gal_name: [30, 30], gal_count: [11, 11], gal_link: [11, 11], tes_quote: [18, 18], tes_name: [11, 11], about_text: [16, 16], pr_intro: [15, 15], pr_group: [12, 12], pr_name: [24, 24], pr_price: [30, 30], pr_list: [14, 14], pr_note: [14, 14], faq_q: [20, 20], faq_a: [15, 15] }
export const EL_KEYS = Object.keys(EL_DEF)
export const SECTION_KEYS = ['about', 'portfolio', 'investment', 'testimonials', 'faq', 'contact'] as const
export const DEFAULT_TITLES: Record<string, string> = {
  about: 'About', portfolio: 'Portfolio', investment: 'Investment', testimonials: 'Kind words', faq: 'FAQ', contact: "Let's connect",
}
export const NAV_DEFAULTS: Record<string, string> = {
  home: 'Home', galleries: 'Galleries', about: 'About', book: 'Book',
}

function hex(v: unknown, d: string): string {
  return /^#[0-9a-fA-F]{3,8}$/.test(String(v ?? '')) ? String(v) : d
}
function pick<T extends string>(v: unknown, allowed: readonly T[], d: T): T {
  return (allowed as readonly string[]).includes(String(v)) ? (v as T) : d
}
function num(v: unknown, min: number, max: number, d: number): number {
  if (v === null || v === undefined || v === '') return d
  const n = Number(v)
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d
}
function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null
}
function pairNum(v: any, min: number, max: number, dp: number, dd: number) {
  return { phone: num(v?.phone, min, max, dp), desktop: num(v?.desktop, min, max, dd) }
}

export function resolveTheme(r: Record<string, any>) {
  const s = (r.site_settings ?? {}) as Record<string, any>
  const tpl = pick(r.site_template, ['editorial', 'split', 'minimal', 'framed', 'magazine', 'mosaic'] as const, 'editorial')
  const preset = PAIR_PRESETS[r.site_font_pair as string] ?? PAIR_PRESETS.serif
  const headKey: string = FONT_OPTIONS[s.fonts?.head as string] ? (s.fonts.head as string) : preset.head
  const bodyKey: string = FONT_OPTIONS[s.fonts?.body as string] ? (s.fonts.body as string) : preset.body
  const bookKey: string | null = FONT_OPTIONS[s.availability?.font as string] ? (s.availability.font as string) : null
  const galKey: string | null = null
  const hwRaw = Number(s.fonts?.headWeight)
  const headWeight: number | null = Number.isFinite(hwRaw) && hwRaw >= 100 && hwRaw <= 900 ? hwRaw : null
  const accent = hex(r.site_accent, hex(r.accent_color, '#A9545F'))
  const bg = hex(s.colors?.bg, tpl === 'minimal' ? '#FFFFFF' : tpl === 'split' ? '#F6F1EA' : '#FAF7F2')
  const ink = hex(s.colors?.text, '#2A1F24')
  const tint = hex(s.colors?.tint, tpl === 'minimal' ? '#F7F5F2' : '#F0EAE1')
  const shape = pick(s.button?.shape, ['square', 'rounded', 'pill'] as const, 'square')
  const btnText = hex(s.button?.text, '#FFFFFF')

  const savedOrder: string[] = Array.isArray(s.order)
    ? (s.order as string[]).filter((k) => (SECTION_KEYS as readonly string[]).includes(k))
    : []
  const order: string[] = [...savedOrder, ...SECTION_KEYS.filter((k) => !savedOrder.includes(k))]

  const orderOf = (saved: unknown, def: string[]) => {
    const sv = Array.isArray(saved) ? (saved as string[]).filter((k) => def.includes(k)) : []
    return [...sv, ...def.filter((k) => !sv.includes(k))]
  }
  const customs = (Array.isArray(s.customs) ? (s.customs as any[]) : [])
    .filter((c) => c && typeof c.id === 'string' && ['home', 'about', 'galleries'].includes(c.page))
    .map((c) => ({ id: String(c.id), page: c.page as 'home' | 'about' | 'galleries', canvas: (c.canvas ?? {}) as any }))
  const customIds = (pg: string) => customs.filter((c) => c.page === pg).map((c) => c.id)
  const homeDef = ['explore', 'portfolio', 'testimonials', 'contact', ...customIds('home')]
  const hasEx = Array.isArray(s.order_home) && s.order_home.includes('explore')
  const orderHome: string[] = hasEx
    ? orderOf(s.order_home, homeDef)
    : (() => {
        const o = orderOf(s.order_home, homeDef.filter((k) => k !== 'explore'))
        o.splice(0, 0, 'explore')
        return o
      })().filter((k) => k !== 'portfolio')
  const orderAbout = orderOf(s.order_about, ['about', 'investment', 'faq', 'aboutcta', ...customIds('about')])
  const orderGalleries = orderOf(s.order_galleries, ['portfolio', ...customIds('galleries')])

  const titles: Record<string, string> = { ...DEFAULT_TITLES }
  for (const k of Object.keys(DEFAULT_TITLES)) {
    const v = str(s.titles?.[k])
    if (v) titles[k] = v
  }

  const heroFont = (k: unknown): string | null => (typeof k === 'string' && FONT_OPTIONS[k] ? k : null)
  const heroColor = (v: unknown): string | null => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v : null)
  const hfHead = heroFont(s.hero?.headline_font)
  const hfSub = heroFont(s.hero?.subhead_font)
  const hfPara = heroFont(s.hero?.para_font)
  const heroFontKeys: string[] = [hfHead, hfSub, hfPara].filter((k): k is string => !!k)
  const hero = {
    cardBg: (typeof s.hero?.card_bg === 'string' && /^#[0-9a-fA-F]{6}$/.test(s.hero.card_bg) ? s.hero.card_bg : null) as string | null,
    photos: Array.isArray(s.hero?.photos) ? (s.hero.photos as unknown[]).filter((x): x is string => typeof x === 'string' && !!x).slice(0, 6) : [],
    slideshow: !!s.hero?.slideshow,
    overlay: num(s.hero?.overlay, 0, 0.8, 0.35),
    align: pick(s.hero?.align, ['left', 'center', 'right'] as const, 'center'),
    valign: pick(s.hero?.valign, ['top', 'center', 'bottom'] as const, 'bottom'),
    ctaText: str(s.hero?.cta_text) ?? 'Check availability',
    heroCtaText: str(s.hero?.btn_text) ?? str(s.hero?.cta_text) ?? 'Check availability',
    ctaShow: s.hero?.cta_show !== false,
    headColor: heroColor(s.hero?.headline_color),
    headFont: hfHead ? FONT_OPTIONS[hfHead].family : null,
    subColor: heroColor(s.hero?.subhead_color),
    subFont: hfSub ? FONT_OPTIONS[hfSub].family : null,
    paraText: str(s.hero?.para_text),
    paraColor: heroColor(s.hero?.para_color),
    paraFont: hfPara ? FONT_OPTIONS[hfPara].family : null,
  }
  const gallery = {
    layout: pick(s.gallery?.layout, ['masonry', 'grid', 'single', 'tall', 'editorial', 'custom'] as const, 'masonry'),
    card: pick(s.gallery?.card, ['portrait', 'square', 'landscape'] as const, 'portrait'),
  }
  const cardRatio = gallery.card === 'square' ? '1/1' : gallery.card === 'landscape' ? '3/2' : '4/5'
  const menu = {
    solid: s.menu?.style === 'solid',
    none: s.menu?.style === 'none',
    bg: (typeof s.menu?.bg === 'string' && /^#[0-9a-fA-F]{6}$/.test(s.menu.bg) ? s.menu.bg : null) as string | null,
    logoPos: (['left', 'center', 'right'].includes(s.menu?.logoPos) ? s.menu.logoPos : '') as '' | 'left' | 'center' | 'right',
    brand: (typeof s.menu?.brand === 'string' ? s.menu.brand : null) as string | null,
    linkColor: (/^#[0-9a-fA-F]{6}$/.test(String(s.el?.menu_links?.color ?? '')) ? s.el.menu_links.color : null) as string | null,
    backColor: (/^#[0-9a-fA-F]{6}$/.test(String(s.menu?.backColor ?? '')) ? s.menu.backColor : null) as string | null,
    icon: (s.menu?.icon === 'burger' ? 'burger' : '') as '' | 'burger',
    show: (s.menu?.show === 'name' ? 'name' : s.menu?.show === 'logo' ? 'logo' : '') as '' | 'logo' | 'name',
    labels: (s.menu?.labels ?? {}) as Record<string, string>,
    hidden: Array.isArray(s.menu?.hidden) ? (s.menu.hidden as string[]) : [],
  }
  const text = { about: str(s.text?.about), contact: str(s.text?.contact), contactBtn: str(s.contactBtn?.text) ?? str(s.hero?.cta_text) ?? 'Check availability', footer: str(s.text?.footer), copyright: str(s.text?.copyright), portfolioBtn: str(s.portfolioBtn?.text) ?? 'View all galleries' }
  const availability = {
    title: str(s.availability?.title) ?? 'Check availability',
    intro: str(s.availability?.intro) ?? 'Pick a date to see if I am free, then tell me a little about your day.',
    button: str(s.availability?.button) ?? 'Send inquiry',
    success: str(s.availability?.success),
    float: s.availability?.float !== false,
    layout: pick(s.availability?.layout, ['centered', 'side', 'banner', 'between'] as const, 'side'),
    photo: s.availability?.photo === true,
    font: bookKey,
    family: bookKey ? FONT_OPTIONS[bookKey].family : FONT_OPTIONS[headKey].family,
    redirect: s.availability?.redirect !== false,
  }

  const pricing = {
    layout: pick(s.pricing?.layout, ['cards', 'menu', 'columns'] as const, 'cards'),
    featured: str(s.pricing?.featured),
    intro: str(s.pricing?.intro),
    note: str(s.pricing?.note),
    pkgIntro: (((s as any).pricing?.pkgIntro) ?? {}) as Record<string, string>,
    button: s.pricing?.button !== false,
  }

  const testi = {
    layout: pick(s.testimonials?.layout, ['grid', 'stacked', 'cards'] as const, 'grid'),
  }

  const portfolio = {
    layout: pick(s.portfolio?.layout, ['grid', 'banners', 'feature', 'carousel', 'rows'] as const, 'grid'),
    shape: pick(s.portfolio?.shape, ['auto', 'portrait', 'landscape', 'square', 'tall'] as const, 'auto'),
    radius: pick(s.portfolio?.radius, ['sharp', 'soft', 'round'] as const, 'sharp'),
    spacing: pick(s.portfolio?.spacing, ['tight', 'normal', 'airy'] as const, 'normal'),
    name: pick(s.portfolio?.name, ['over', 'hover', 'below'] as const, 'over'),
  }

  const about = {
    layout: pick(s.about?.layout, ['left', 'right', 'stacked', 'textfirst'] as const, 'left'),
  }

  const galpage = {
    layout: pick(s.galpage?.layout ?? s.gallery?.layout, ['masonry', 'grid', 'single', 'tall', 'editorial', 'custom'] as const, 'masonry'),
    showCount: s.galpage?.show_count !== false,
    showMore: s.galpage?.show_more !== false,
    showButton: s.galpage?.show_button !== false,
  }

  const galindex = {
    layout: pick(s.galindex?.layout, ['grid', 'banners', 'feature'] as const, 'grid'),
  }

  const calendar = {
    show: s.calendar?.show !== false,
    sync: s.calendar?.sync === true,
    bg: hex(s.calendar?.bg, '#FFFFFF'),
    selected: hex(s.calendar?.selected, accent),
    day: hex(s.calendar?.day, ink),
    month: hex(s.calendar?.month, ink),
    available: hex(s.calendar?.available, '#3F9142'),
    unavailable: hex(s.calendar?.unavailable, '#8A8A8A'),
  }

  const sizes = {
    text: pairNum(s.sizes?.text, 80, 130, 100, 100),
    headline: pairNum(s.sizes?.headline, 24, 140, 44, 72),
    sectionSpace: pairNum(s.sizes?.sectionSpace, 16, 220, 56, 88),
    photoGap: pairNum(s.sizes?.photoGap, 0, 60, 8, 12),
    coverSize: pairNum(s.sizes?.coverSize, 40, 100, 100, 100),
    heroHeight: pairNum(s.sizes?.heroHeight, 40, 100, 80, 92),
    logo: pairNum(s.sizes?.logo, 16, 120, 30, 38),
    logoNudge: pairNum(s.sizes?.logoNudge, -80, 80, 0, 0),
    logoNudgeY: pairNum(s.sizes?.logoNudgeY, -40, 40, 0, 0),
    menuNudgeY: pairNum(s.sizes?.menuNudgeY, -40, 40, 0, 0),
    calScale: pairNum(s.sizes?.calScale, 50, 160, 100, 100),
    button: pairNum(s.sizes?.button, 9, 20, 11, 12),
    heroBtn: pairNum(s.sizes?.hero_btn ?? s.sizes?.button, 9, 20, 11, 12),
    pfBtn: pairNum(s.sizes?.pf_btn ?? s.sizes?.button, 9, 20, 11, 12),
    ctBtn: pairNum(s.sizes?.ct_btn ?? s.sizes?.button, 9, 20, 11, 12),
    bkBtn: pairNum(s.sizes?.bk_btn ?? s.sizes?.button, 9, 20, 11, 12),
    abBtn: pairNum(s.sizes?.ab_btn ?? s.sizes?.button, 9, 20, 11, 12),
    gbBtn: pairNum(s.sizes?.gb_btn ?? s.sizes?.button, 9, 20, 11, 12),
    back: Object.fromEntries(['galleries', 'about', 'book'].map((k) => [k, pairNum(s.sizes?.['bk_' + k], 8, 24, 11, 11)])) as Record<string, ReturnType<typeof pairNum>>,
    exTitle: pairNum(s.sizes?.ex_title, 14, 90, 26, 32),
    exSub: pairNum(s.sizes?.ex_sub, 9, 28, 11, 11),
    subhead: pairNum(s.sizes?.subhead, 9, 28, 11, 12),
    galHeading: pairNum(s.sizes?.galHeading, 24, 120, 38, 56),
    secHead: pairNum(s.sizes?.secHead, 20, 100, 36, 48),
    secTitles: Object.fromEntries(['about', 'portfolio', 'investment', 'words', 'faq', 'contact'].map((k) => [k, pairNum((s.sizes as any)?.['sec_' + k] ?? s.sizes?.secHead, 20, 100, 36, 48)])) as Record<string, ReturnType<typeof pairNum>>,
    el: Object.fromEntries(EL_KEYS.map((k) => [k, pairNum((s.sizes as any)?.['el_' + k], 8, 90, EL_DEF[k][0], EL_DEF[k][1])])) as Record<string, ReturnType<typeof pairNum>>,
    paraSize: pairNum(s.sizes?.paraSize, 10, 40, 15, 15),
    fsAbout: pairNum(s.sizes?.fsAbout, 60, 200, 100, 100),
    fsPkgName: pairNum(s.sizes?.fsPkgName, 60, 200, 100, 100),
    fsPkgPrice: pairNum(s.sizes?.fsPkgPrice, 60, 200, 100, 100),
    fsPkgList: pairNum(s.sizes?.fsPkgList, 60, 200, 100, 100),
    fsTesti: pairNum(s.sizes?.fsTesti, 60, 200, 100, 100),
    fsFaqQ: pairNum(s.sizes?.fsFaqQ, 60, 200, 100, 100),
    fsFaqA: pairNum(s.sizes?.fsFaqA, 60, 200, 100, 100),
    fsContact: pairNum(s.sizes?.fsContact, 60, 200, 100, 100),
    fsFoot: pairNum(s.sizes?.fsFoot, 60, 200, 100, 100),
    fsCover: pairNum(s.sizes?.fsCover, 60, 200, 100, 100),
    fsSocial: pairNum(s.sizes?.fsSocial, 60, 200, 100, 100),
    galGap: pairNum(s.sizes?.galGap ?? s.sizes?.photoGap, 0, 60, 8, 12),
    bookHeading: pairNum(s.sizes?.bookHeading, 24, 120, 34, 48),
    menu: pairNum(s.sizes?.menu, 9, 22, 12, 11),
  }
  const vars = (d: 'phone' | 'desktop') =>
    `--text:${sizes.text[d]}%;--hl:${sizes.headline[d]}px;--space:${sizes.sectionSpace[d]}px;--gap:${sizes.photoGap[d]}px;--cover-w:${sizes.coverSize[d]}%;--hero-h:${sizes.heroHeight[d]}vh;--logo:${sizes.logo[d]}px;--nudge:${sizes.logoNudge[d]}px;--nudgey:${sizes.menuNudgeY[d]}px;--menuy:${sizes.menuNudgeY[d]}px;--cal:${sizes.calScale[d]}%;--sub:${sizes.subhead[d]}px;--btn:${sizes.button[d]}px;--gal-h:${sizes.galHeading[d]}px;--gal-gap:${sizes.galGap[d]}px;--book-h:${sizes.bookHeading[d]}px;--menu:${sizes.menu[d]}px;--sec-h:${sizes.secHead[d]}px;--hpara:${sizes.paraSize[d]}px;--fs-about:${sizes.fsAbout[d] / 100};--fs-pname:${sizes.fsPkgName[d] / 100};--fs-pprice:${sizes.fsPkgPrice[d] / 100};--fs-plist:${sizes.fsPkgList[d] / 100};--fs-testi:${sizes.fsTesti[d] / 100};--fs-faqq:${sizes.fsFaqQ[d] / 100};--fs-faqa:${sizes.fsFaqA[d] / 100};--fs-contact:${sizes.fsContact[d] / 100};--fs-foot:${sizes.fsFoot[d] / 100};--fs-cover:${sizes.fsCover[d] / 100};--fs-social:${sizes.fsSocial[d] / 100};`
  const heroBtnCss = (() => {
    const hb: any = s.hero ?? {}
    const okHex = (v: any) => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v : null)
    const bg = okHex(hb.btn_bg)
    const fg = okHex(hb.btn_color)
    const rad = hb.btn_shape === 'pill' ? 999 : hb.btn_shape === 'rounded' ? 10 : hb.btn_shape === 'square' ? 0 : null
    const r: string[] = []
    if (bg) r.push(`background:${bg}!important`)
    if (fg) r.push(`color:${fg}!important`)
    if (rad !== null) r.push(`border-radius:${rad}px!important`)
    let out = r.length ? `#top .cr-btn{${r.join(';')}}` : ''
    if (s.sizes?.hero_btn) {
      const sz = (n: number) => `font-size:${n}px!important;padding:${(n * 1.15).toFixed(1)}px ${(n * 2.7).toFixed(1)}px!important`
      out += `#top .cr-btn{${sz(sizes.heroBtn.phone)}}@media (min-width:768px){#top .cr-btn{${sz(sizes.heroBtn.desktop)}}}`
    }
    return out
  })()
  const exploreCss = (() => {
    const ex: any = s.explore ?? {}
    const okHex = (v: any) => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v : null)
    const tile = okHex(ex.tile_bg)
    let out = ''
    if (tile) out += `#explore .ex-tile{background:${tile}!important}`
    return out
  })()
  const contactBtnCss = (() => {
    const cb: any = s.contactBtn ?? {}
    const okHex = (v: any) => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v : null)
    const bg = okHex(cb.bg)
    const fg = okHex(cb.color)
    const rad = cb.shape === 'pill' ? 999 : cb.shape === 'rounded' ? 10 : cb.shape === 'square' ? 0 : null
    const r: string[] = []
    if (bg) r.push(`background:${bg}!important`)
    if (fg) r.push(`color:${fg}!important`)
    if (rad !== null) r.push(`border-radius:${rad}px!important`)
    let out = r.length ? `.cr-btn.ct-btn{${r.join(';')}}` : ''
    if (s.sizes?.ct_btn) {
      const sz = (n: number) => `font-size:${n}px!important;padding:${(n * 1.15).toFixed(1)}px ${(n * 2.7).toFixed(1)}px!important`
      out += `.cr-btn.ct-btn{${sz(sizes.ctBtn.phone)}}@media (min-width:768px){.cr-btn.ct-btn{${sz(sizes.ctBtn.desktop)}}}`
    }
    return out
  })()
  const bookBtnCss = (() => {
    const cb: any = s.bookBtn ?? {}
    const okHex = (v: any) => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v : null)
    const bg = okHex(cb.bg)
    const fg = okHex(cb.color)
    const rad = cb.shape === 'pill' ? 999 : cb.shape === 'rounded' ? 10 : cb.shape === 'square' ? 0 : null
    const r: string[] = []
    if (bg) r.push(`background:${bg}!important`)
    if (fg) r.push(`color:${fg}!important`)
    if (rad !== null) r.push(`border-radius:${rad}px!important`)
    let out = r.length ? `.cr-btn.bk-btn{${r.join(';')}}` : ''
    if (s.sizes?.bk_btn) {
      const sz = (n: number) => `font-size:${n}px!important;padding:${(n * 1.15).toFixed(1)}px ${(n * 2.7).toFixed(1)}px!important`
      out += `.cr-btn.bk-btn{${sz(sizes.bkBtn.phone)}}@media (min-width:768px){.cr-btn.bk-btn{${sz(sizes.bkBtn.desktop)}}}`
    }
    return out
  })()
  const backCss = ['galleries', 'about', 'book'].map((pg) => {
    const cb: any = (s.backBtn ?? {})[pg] ?? {}
    const c = typeof cb.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(cb.color) ? cb.color : null
    let out = c ? `.cr-back-${pg}{color:${c}!important}` : ''
    if (s.sizes?.['bk_' + pg]) {
      const z = sizes.back[pg]
      out += `.cr-back-${pg}{font-size:${z.phone}px!important}@media (min-width:768px){.cr-back-${pg}{font-size:${z.desktop}px!important}}`
    }
    return out
  }).join('')
  const galBtnCss = (() => {
    const cb: any = s.galBtn ?? {}
    const okHex = (v: any) => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v : null)
    const bg = okHex(cb.bg)
    const fg = okHex(cb.color)
    const rad = cb.shape === 'pill' ? 999 : cb.shape === 'rounded' ? 10 : cb.shape === 'square' ? 0 : null
    const r: string[] = []
    if (bg) r.push(`background:${bg}!important`)
    if (fg) r.push(`color:${fg}!important`)
    if (rad !== null) r.push(`border-radius:${rad}px!important`)
    let out = r.length ? `.cr-btn.gb-btn{${r.join(';')}}` : ''
    if (s.sizes?.gb_btn) {
      const sz = (n: number) => `font-size:${n}px!important;padding:${(n * 1.15).toFixed(1)}px ${(n * 2.7).toFixed(1)}px!important`
      out += `.cr-btn.gb-btn{${sz(sizes.gbBtn.phone)}}@media (min-width:768px){.cr-btn.gb-btn{${sz(sizes.gbBtn.desktop)}}}`
    }
    return out
  })()
  const aboutBtnCss = (() => {
    const cb: any = s.aboutBtn ?? {}
    const okHex = (v: any) => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v : null)
    const bg = okHex(cb.bg)
    const fg = okHex(cb.color)
    const rad = cb.shape === 'pill' ? 999 : cb.shape === 'rounded' ? 10 : cb.shape === 'square' ? 0 : null
    const r: string[] = []
    if (bg) r.push(`background:${bg}!important`)
    if (fg) r.push(`color:${fg}!important`)
    if (rad !== null) r.push(`border-radius:${rad}px!important`)
    let out = r.length ? `.cr-btn.ab-btn{${r.join(';')}}` : ''
    if (s.sizes?.ab_btn) {
      const sz = (n: number) => `font-size:${n}px!important;padding:${(n * 1.15).toFixed(1)}px ${(n * 2.7).toFixed(1)}px!important`
      out += `.cr-btn.ab-btn{${sz(sizes.abBtn.phone)}}@media (min-width:768px){.cr-btn.ab-btn{${sz(sizes.abBtn.desktop)}}}`
    }
    return out
  })()
  const secTitleCss = ['about', 'portfolio', 'investment', 'words', 'faq', 'contact'].map((id) => {
    if (!(s.sizes as any)?.['sec_' + id]) return ''
    const z = sizes.secTitles[id]
    return `#${id} .cr-sech{font-size:${z.phone}px!important}@media (min-width:768px){#${id} .cr-sech{font-size:${z.desktop}px!important}}`
  }).join('')
  const elFontKeys = Array.from(new Set(EL_KEYS.map((k) => (s.el as any)?.[k]?.font).filter((k: any) => typeof k === 'string' && FONT_OPTIONS[k]))) as string[]
  const elCss = EL_KEYS.map((k) => {
    const e: any = (s.el as any)?.[k] ?? {}
    const r: string[] = []
    if (k !== 'menu_links' && typeof e.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(e.color)) r.push(`color:${e.color}!important`)
    if (typeof e.font === 'string' && FONT_OPTIONS[e.font]) r.push(`font-family:${FONT_OPTIONS[e.font].family}!important`)
    let out = r.length ? `.el-${k}{${r.join(';')}}` : ''
    if (typeof e.font === 'string' && FONT_OPTIONS[e.font]) out += `:is(#nav,#top,#explore,#about,#portfolio,#investment,#words,#faq,#contact) .el-${k}.el-${k}{font-family:${FONT_OPTIONS[e.font].family}!important}`
    if ((s.sizes as any)?.['el_' + k]) {
      const z = sizes.el[k]
      out += `.el-${k}{font-size:${z.phone}px!important}@media (min-width:768px){.el-${k}{font-size:${z.desktop}px!important}}`
    }
    return out
  }).join('')
  const portfolioBtnCss = (() => {
    const cb: any = s.portfolioBtn ?? {}
    const okHex = (v: any) => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v : null)
    const bg = okHex(cb.bg)
    const fg = okHex(cb.color)
    const rad = cb.shape === 'pill' ? 999 : cb.shape === 'rounded' ? 10 : cb.shape === 'square' ? 0 : null
    const r: string[] = []
    if (bg) r.push(`background:${bg}!important`)
    if (fg) r.push(`color:${fg}!important`)
    if (rad !== null) r.push(`border-radius:${rad}px!important`)
    let out = r.length ? `.cr-btn.pf-btn{${r.join(';')}}` : ''
    if (s.sizes?.pf_btn) {
      const sz = (n: number) => `font-size:${n}px!important;padding:${(n * 1.15).toFixed(1)}px ${(n * 2.7).toFixed(1)}px!important`
      out += `.cr-btn.pf-btn{${sz(sizes.pfBtn.phone)}}@media (min-width:768px){.cr-btn.pf-btn{${sz(sizes.pfBtn.desktop)}}}`
    }
    return out
  })()
  const heroCss =
    (hero.headFont || hero.headColor ? `#top h1{${hero.headFont ? `font-family:${hero.headFont}!important;` : ''}${hero.headColor ? `color:${hero.headColor}!important;` : ''}}` : '') +
    (hero.subFont || hero.subColor ? `#top .cr-sub{${hero.subFont ? `font-family:${hero.subFont}!important;` : ''}${hero.subColor ? `color:${hero.subColor}!important;` : ''}}` : '') +
    `#top .cr-hpara{font-size:var(--hpara)!important;${hero.paraFont ? `font-family:${hero.paraFont}!important;` : ''}${hero.paraColor ? `color:${hero.paraColor}!important;` : ''}}`
  const cssVars = `:root{${vars('phone')}}@media (min-width:768px){:root{${vars('desktop')}}}.cr-btn{font-size:var(--btn)!important;padding:calc(var(--btn)*1.15) calc(var(--btn)*2.7)!important}${heroCss}${heroBtnCss}${galBtnCss}${backCss}${exploreCss}${contactBtnCss}${bookBtnCss}${aboutBtnCss}${secTitleCss}${elCss}${portfolioBtnCss}`

  return {
    tpl,
    headKey,
    bodyKey,
    head: FONT_OPTIONS[headKey].family,
    body: FONT_OPTIONS[bodyKey].family,
    fontsHref:
      'https://fonts.googleapis.com/css2?' +
      Array.from(new Set([headKey, bodyKey, ...(bookKey ? [bookKey] : []), ...(galKey ? [galKey] : []), ...heroFontKeys, ...elFontKeys])).map((k) => 'family=' + FONT_OPTIONS[k].gf).join('&') +
      '&display=swap',
    accent,
    bg,
    ink,
    tint,
    soft: `color-mix(in srgb, ${ink} 68%, ${bg})`,
    line: `color-mix(in srgb, ${ink} 14%, transparent)`,
    radius: shape === 'pill' ? 999 : shape === 'rounded' ? 10 : 0,
    shape,
    btnText,
    order,
    orderHome,
    aboutBtnText: (str(s.aboutBtn?.text) ?? str(s.hero?.cta_text) ?? 'Check availability') as string,
    galBtnText: (str(s.galBtn?.text) ?? str(s.hero?.cta_text) ?? 'Check availability') as string,
    backText: Object.fromEntries(['galleries', 'about', 'book'].map((pg) => [pg, str((s.backBtn ?? {})[pg]?.text)])) as Record<string, string | null>,
    socialHidden: (Array.isArray(s.socials_off) ? s.socials_off : []) as string[],
    galText: (s.galtext && typeof s.galtext === 'object' ? s.galtext : {}) as Record<string, { name?: string; line?: string }>,
    orderAbout,
    titles,
    text,
    hero,
    gallery,
    cardRatio,
    menu,
    availability,
    pricing,
    portfolio,
    about,
    galpage,
    galindex,
    calendar,
    testi,
    headWeight,
    customs,
    orderGalleries,
    galFamily: galKey ? FONT_OPTIONS[galKey].family : null,
    sizes,
    cssVars,
  }
}
