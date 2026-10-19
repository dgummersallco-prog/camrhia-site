export const FONT_OPTIONS: Record<string, { label: string; family: string; gf: string }> = {
  cormorant: { label: 'Cormorant Garamond', family: "'Cormorant Garamond', Georgia, serif", gf: 'Cormorant+Garamond:wght@400;500;600' },
  playfair: { label: 'Playfair Display', family: "'Playfair Display', Georgia, serif", gf: 'Playfair+Display:wght@400;500;600' },
  dmserif: { label: 'DM Serif Display', family: "'DM Serif Display', Georgia, serif", gf: 'DM+Serif+Display' },
  bodoni: { label: 'Bodoni Moda', family: "'Bodoni Moda', Georgia, serif", gf: 'Bodoni+Moda:wght@400;500;600' },
  italiana: { label: 'Italiana', family: "'Italiana', Georgia, serif", gf: 'Italiana' },
  josefin: { label: 'Josefin Sans', family: "'Josefin Sans', system-ui, sans-serif", gf: 'Josefin+Sans:wght@300;400;600' },
  montserrat: { label: 'Montserrat', family: "'Montserrat', system-ui, sans-serif", gf: 'Montserrat:wght@300;400;500;600' },
  worksans: { label: 'Work Sans', family: "'Work Sans', system-ui, sans-serif", gf: 'Work+Sans:wght@300;400;500' },
  raleway: { label: 'Raleway', family: "'Raleway', system-ui, sans-serif", gf: 'Raleway:wght@300;400;500;600' },
  lora: { label: 'Lora', family: "'Lora', Georgia, serif", gf: 'Lora:wght@400;500' },
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

export function resolveTheme(r: Record<string, any>) {
  const s = (r.site_settings ?? {}) as Record<string, any>
  const tpl = pick(r.site_template, ['editorial', 'split', 'minimal'] as const, 'editorial')
  const preset = PAIR_PRESETS[r.site_font_pair as string] ?? PAIR_PRESETS.serif
  const headKey: string = FONT_OPTIONS[s.fonts?.head as string] ? (s.fonts.head as string) : preset.head
  const bodyKey: string = FONT_OPTIONS[s.fonts?.body as string] ? (s.fonts.body as string) : preset.body
  const accent = hex(r.site_accent, hex(r.accent_color, '#A9545F'))
  const bg = hex(s.colors?.bg, tpl === 'minimal' ? '#FFFFFF' : tpl === 'split' ? '#F6F1EA' : '#FAF7F2')
  const ink = hex(s.colors?.text, '#2A1F24')
  const tint = hex(s.colors?.tint, tpl === 'minimal' ? '#F7F5F2' : '#F0EAE1')
  const spacing = pick(s.spacing, ['tight', 'normal', 'airy'] as const, 'normal')
  const pad = spacing === 'tight' ? 56 : spacing === 'airy' ? 128 : 88
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
    gap: num(s.gallery?.gap, 0, 40, 12),
    card: pick(s.gallery?.card, ['portrait', 'square', 'landscape'] as const, 'portrait'),
  }
  const cardRatio = gallery.card === 'square' ? '1/1' : gallery.card === 'landscape' ? '3/2' : '4/5'
  const menu = {
    solid: s.menu?.style === 'solid',
    labels: (s.menu?.labels ?? {}) as Record<string, string>,
    hidden: Array.isArray(s.menu?.hidden) ? (s.menu.hidden as string[]) : [],
  }
  const text = { about: str(s.text?.about), contact: str(s.text?.contact), footer: str(s.text?.footer) }

  return {
    tpl,
    headKey,
    bodyKey,
    head: FONT_OPTIONS[headKey].family,
    body: FONT_OPTIONS[bodyKey].family,
    fontScale: num(s.fonts?.scale, 0.85, 1.25, 1),
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
    spacing,
    padCss: `clamp(${Math.round(pad * 0.6)}px, 8vw, ${pad}px)`,
    radius: shape === 'pill' ? 999 : shape === 'rounded' ? 10 : 0,
    shape,
    order,
    titles,
    text,
    hero,
    gallery,
    cardRatio,
    menu,
  }
}
