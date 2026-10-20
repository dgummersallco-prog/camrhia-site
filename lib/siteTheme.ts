export type FontCat = 'serif' | 'sans' | 'script' | 'display'
type FontOpt = { label: string; family: string; gf: string; cat: FontCat }

const GENERIC: Record<FontCat, string> = {
  serif: 'Georgia, serif',
  sans: 'system-ui, sans-serif',
  script: 'cursive',
  display: 'Georgia, serif',
}
function mk(label: string, cat: FontCat, gf?: string): FontOpt {
  return { label, cat, family: `'${label}', ${GENERIC[cat]}`, gf: gf ?? label.replace(/ /g, '+') }
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
  ['Julius Sans One', 'display'], ['Federo', 'display'],
]

export const FONT_OPTIONS: Record<string, FontOpt> = { ...LEGACY }
for (const [label, cat] of MORE) {
  const key = label.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (!FONT_OPTIONS[key]) FONT_OPTIONS[key] = mk(label, cat)
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
  home: 'Home', about: 'About', portfolio: 'Portfolio', investment: 'Investment', contact: 'Contact',
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
  const accent = hex(r.site_accent, hex(r.accent_color, '#A9545F'))
  const bg = hex(s.colors?.bg, tpl === 'minimal' ? '#FFFFFF' : tpl === 'split' ? '#F6F1EA' : '#FAF7F2')
  const ink = hex(s.colors?.text, '#2A1F24')
  const tint = hex(s.colors?.tint, tpl === 'minimal' ? '#F7F5F2' : '#F0EAE1')
  const shape = pick(s.button?.shape, ['square', 'rounded', 'pill'] as const, 'square')

  const savedOrder: string[] = Array.isArray(s.order)
    ? (s.order as string[]).filter((k) => (SECTION_KEYS as readonly string[]).includes(k))
    : []
  const order: string[] = [...savedOrder, ...SECTION_KEYS.filter((k) => !savedOrder.includes(k))]

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
    layout: pick(s.gallery?.layout, ['masonry', 'grid', 'single'] as const, 'masonry'),
    card: pick(s.gallery?.card, ['portrait', 'square', 'landscape'] as const, 'portrait'),
  }
  const cardRatio = gallery.card === 'square' ? '1/1' : gallery.card === 'landscape' ? '3/2' : '4/5'
  const menu = {
    solid: s.menu?.style === 'solid',
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

  const sizes = {
    text: pairNum(s.sizes?.text, 80, 130, 100, 100),
    headline: pairNum(s.sizes?.headline, 24, 140, 44, 72),
    sectionSpace: pairNum(s.sizes?.sectionSpace, 16, 220, 56, 88),
    photoGap: pairNum(s.sizes?.photoGap, 0, 60, 8, 12),
    heroHeight: pairNum(s.sizes?.heroHeight, 40, 100, 80, 92),
    logo: pairNum(s.sizes?.logo, 16, 120, 30, 38),
  }
  const vars = (d: 'phone' | 'desktop') =>
    `--text:${sizes.text[d]}%;--hl:${sizes.headline[d]}px;--space:${sizes.sectionSpace[d]}px;--gap:${sizes.photoGap[d]}px;--hero-h:${sizes.heroHeight[d]}vh;--logo:${sizes.logo[d]}px;`
  const cssVars = `:root{${vars('phone')}}@media (min-width:768px){:root{${vars('desktop')}}}`

  return {
    tpl,
    headKey,
    bodyKey,
    head: FONT_OPTIONS[headKey].family,
    body: FONT_OPTIONS[bodyKey].family,
    fontsHref:
      'https://fonts.googleapis.com/css2?' +
      Array.from(new Set([headKey, bodyKey])).map((k) => 'family=' + FONT_OPTIONS[k].gf).join('&') +
      '&display=swap',
    accent,
    bg,
    ink,
    tint,
    soft: `color-mix(in srgb, ${ink} 68%, ${bg})`,
    line: `color-mix(in srgb, ${ink} 14%, transparent)`,
    radius: shape === 'pill' ? 999 : shape === 'rounded' ? 10 : 0,
    shape,
    order,
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
    testi,
    sizes,
    cssVars,
  }
}
