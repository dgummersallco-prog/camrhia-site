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
  const galRaw = s.galindex?.font as string
  const galKey: string | null = FONT_OPTIONS[galRaw] ? galRaw : s.galindex?.layout === 'checker' ? 'barlowcondensed' : null
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
  const orderHome = orderOf(s.order_home, ['portfolio', 'testimonials', 'contact', ...customIds('home')])
  const orderAbout = orderOf(s.order_about, ['about', 'investment', 'faq', ...customIds('about')])
  const orderGalleries = orderOf(s.order_galleries, ['portfolio', ...customIds('galleries')])

  const titles: Record<string, string> = { ...DEFAULT_TITLES }
  for (const k of Object.keys(DEFAULT_TITLES)) {
    const v = str(s.titles?.[k])
    if (v) titles[k] = v
  }

  const hero = {
    photos: Array.isArray(s.hero?.photos) ? (s.hero.photos as unknown[]).filter((x): x is string => typeof x === 'string' && !!x).slice(0, 6) : [],
    slideshow: !!s.hero?.slideshow,
    overlay: num(s.hero?.overlay, 0, 0.8, 0.35),
    align: pick(s.hero?.align, ['left', 'center', 'right'] as const, 'center'),
    valign: pick(s.hero?.valign, ['top', 'center', 'bottom'] as const, 'bottom'),
    ctaText: str(s.hero?.cta_text) ?? 'Check availability',
    ctaShow: s.hero?.cta_show !== false,
  }
  const gallery = {
    layout: pick(s.gallery?.layout, ['masonry', 'grid', 'single', 'tall', 'editorial', 'custom'] as const, 'masonry'),
    card: pick(s.gallery?.card, ['portrait', 'square', 'landscape'] as const, 'portrait'),
  }
  const cardRatio = gallery.card === 'square' ? '1/1' : gallery.card === 'landscape' ? '3/2' : '4/5'
  const menu = {
    solid: s.menu?.style === 'solid',
    logoPos: (['left', 'center', 'right'].includes(s.menu?.logoPos) ? s.menu.logoPos : '') as '' | 'left' | 'center' | 'right',
    labels: (s.menu?.labels ?? {}) as Record<string, string>,
    hidden: Array.isArray(s.menu?.hidden) ? (s.menu.hidden as string[]) : [],
  }
  const text = { about: str(s.text?.about), contact: str(s.text?.contact), footer: str(s.text?.footer) }
  const availability = {
    title: str(s.availability?.title) ?? 'Check availability',
    intro: str(s.availability?.intro) ?? 'Pick a date to see if I am free, then tell me a little about your day.',
    button: str(s.availability?.button) ?? 'Send inquiry',
    success: str(s.availability?.success),
    float: s.availability?.float !== false,
    layout: pick(s.availability?.layout, ['centered', 'side', 'banner'] as const, 'side'),
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
    button: s.pricing?.button !== false,
  }

  const testi = {
    layout: pick(s.testimonials?.layout, ['grid', 'stacked', 'cards'] as const, 'grid'),
  }

  const portfolio = {
    layout: pick(s.portfolio?.layout, ['grid', 'banners', 'feature'] as const, 'grid'),
  }

  const about = {
    layout: pick(s.about?.layout, ['left', 'right', 'stacked'] as const, 'left'),
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
    subhead: pairNum(s.sizes?.subhead, 9, 28, 11, 12),
    galHeading: pairNum(s.sizes?.galHeading, 24, 120, 38, 56),
    galGap: pairNum(s.sizes?.galGap ?? s.sizes?.photoGap, 0, 60, 8, 12),
    bookHeading: pairNum(s.sizes?.bookHeading, 24, 120, 34, 48),
    menu: pairNum(s.sizes?.menu, 9, 22, 12, 11),
  }
  const vars = (d: 'phone' | 'desktop') =>
    `--text:${sizes.text[d]}%;--hl:${sizes.headline[d]}px;--space:${sizes.sectionSpace[d]}px;--gap:${sizes.photoGap[d]}px;--cover-w:${sizes.coverSize[d]}%;--hero-h:${sizes.heroHeight[d]}vh;--logo:${sizes.logo[d]}px;--nudge:${sizes.logoNudge[d]}px;--nudgey:${sizes.menuNudgeY[d]}px;--menuy:${sizes.menuNudgeY[d]}px;--cal:${sizes.calScale[d]}%;--sub:${sizes.subhead[d]}px;--btn:${sizes.button[d]}px;--gal-h:${sizes.galHeading[d]}px;--gal-gap:${sizes.galGap[d]}px;--book-h:${sizes.bookHeading[d]}px;--menu:${sizes.menu[d]}px;`
  const cssVars = `:root{${vars('phone')}}@media (min-width:768px){:root{${vars('desktop')}}}.cr-btn{font-size:var(--btn)!important;padding:calc(var(--btn)*1.15) calc(var(--btn)*2.7)!important}`

  return {
    tpl,
    headKey,
    bodyKey,
    head: FONT_OPTIONS[headKey].family,
    body: FONT_OPTIONS[bodyKey].family,
    fontsHref:
      'https://fonts.googleapis.com/css2?' +
      Array.from(new Set([headKey, bodyKey, ...(bookKey ? [bookKey] : []), ...(galKey ? [galKey] : [])])).map((k) => 'family=' + FONT_OPTIONS[k].gf).join('&') +
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
