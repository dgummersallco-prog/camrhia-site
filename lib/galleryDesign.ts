export type ElStyle = { align?: 'left' | 'center' | 'right'; lineColor?: string; font?: string; size?: number; color?: string; bold?: boolean; dx?: number; dy?: number; text?: string; hide?: boolean }
export type GalleryDesign = {
  look?: string; cover?: string; colors?: string; focal?: { x: number; y: number }; focals?: Record<string, { x: number; y: number }>; zoom?: number; slots?: Record<string, string>
  layout?: string; bg?: string; coverBg?: string; accent?: string; gap?: number; radius?: number; el?: Record<string, ElStyle>
  watermark?: { on?: boolean; text?: string }
}

export const COVER_SLOTS: Record<string, number> = { mosaic: 5, strip: 5, stack: 3, diptych: 1 }

export const COVER_PRESETS: Record<string, Partial<GalleryDesign>> = {
  monogram: { el: { title: { text: 'Sofia & Daniel' }, brand: { text: 'September 20, 2026' } } },
  ticket: { el: { title: { text: 'Wildcats 12U' }, brand: { text: 'Spring 2026 Season' } } },
  bigtype: { coverBg: '#F6EDE1', el: { title: { text: 'Marcus Hall' }, brand: { text: 'Senior Season 2026' } } },
  arch: { coverBg: '#F7EBDE', el: { title: { text: 'Jordan Ellis' }, brand: { text: 'Class of 2026' } } },
  circle: { coverBg: '#F9EEE5', el: { title: { text: 'Dana Reyes' }, brand: { text: 'Brand Session 2026' } } },
  diptych: { coverBg: '#F9F2EA', el: { title: { text: 'Maya & Theo' }, brand: { text: 'May 30, 2026' } } },
  magazine: { el: { title: { text: 'Priya & James' }, brand: { text: 'October 4, 2026' } } },
  cinema: { el: { title: { text: 'Emma & Luke' }, brand: { text: 'June 14, 2026' } } },
  strip: { el: { title: { text: 'Baby Noah' }, brand: { text: 'Born March 12, 2026' } } },
  postcard: { el: { title: { text: 'The Alvarez Family' }, brand: { text: 'July 12, 2026' } } },
  mosaic: { coverBg: '#F9EFE4', el: { title: { text: 'Hannah & Paul' }, brand: { text: 'Due January 2027' } } },
  stack: { el: { title: { text: 'The Whitfield Family' }, brand: { text: 'October 2026' } } },
}

export type LookSpec = {
  name: string; blurb: string; font: string; upper: boolean; italic?: boolean; weight: number
  track: string; radius: number; gap: number; grid: 'masonry' | 'uniform'; cover: string; colors: string
}

const SERIF = "Georgia, 'Times New Roman', serif"
const SANS = "'Helvetica Neue', Arial, sans-serif"

export const LOOKS: Record<string, LookSpec> = {
  classic: { name: 'Heirloom', blurb: 'Warm serif, soft corners.', font: 'fraunces', upper: false, weight: 600, track: '0', radius: 8, gap: 12, grid: 'masonry', cover: 'cinema', colors: 'ivory' },
  fine: { name: 'Linen', blurb: 'Thin, spaced capitals.', font: SERIF, upper: true, weight: 400, track: '0.18em', radius: 0, gap: 20, grid: 'uniform', cover: 'monogram', colors: 'white' },
  minimal: { name: 'Plain', blurb: 'Clean and quiet, tight grid.', font: SANS, upper: false, weight: 300, track: '0', radius: 0, gap: 4, grid: 'uniform', cover: 'bigtype', colors: 'white' },
  airy: { name: 'Daylight', blurb: 'Light and open, lots of space.', font: 'fraunces', upper: false, weight: 300, track: '0', radius: 2, gap: 24, grid: 'masonry', cover: 'arch', colors: 'ivory' },
  spotlight: { name: 'After dark', blurb: 'Dark and dramatic.', font: SANS, upper: true, weight: 600, track: '0.12em', radius: 10, gap: 10, grid: 'masonry', cover: 'magazine', colors: 'charcoal' },
  editorial: { name: 'Press', blurb: 'Bold magazine type.', font: 'fraunces', upper: true, weight: 700, track: '0.04em', radius: 0, gap: 8, grid: 'masonry', cover: 'diptych', colors: 'sand' },
  expressive: { name: 'Loud', blurb: 'Big, rounded and loud.', font: "'Arial Black', Helvetica, sans-serif", upper: true, weight: 800, track: '0.02em', radius: 22, gap: 10, grid: 'masonry', cover: 'stack', colors: 'blush' },
  folk: { name: 'Handmade', blurb: 'Handmade, italic serif.', font: SERIF, upper: false, italic: true, weight: 400, track: '0', radius: 16, gap: 16, grid: 'masonry', cover: 'cinema', colors: 'sage' },
  soft: { name: 'Petal', blurb: 'Gentle and rounded.', font: 'fraunces', upper: false, weight: 400, track: '0', radius: 28, gap: 14, grid: 'masonry', cover: 'circle', colors: 'mist' },
}
export const LOOK_KEYS = ['classic', 'fine', 'minimal', 'airy', 'spotlight', 'editorial', 'expressive', 'folk', 'soft']

export type Palette = { key: string; name: string; bg: string; ink: string; soft: string; line: string; accent: string; onAccent: string }
export const PALETTES: Palette[] = [
  { key: 'ivory', name: 'Ivory', bg: '#FBF8F2', ink: '#2A1F24', soft: '#7B6E70', line: '#E6DFD3', accent: '#B08D57', onAccent: '#FFFFFF' },
  { key: 'white', name: 'White', bg: '#FFFFFF', ink: '#1B1B1D', soft: '#76767A', line: '#E8E8EA', accent: '#1B1B1D', onAccent: '#FFFFFF' },
  { key: 'blush', name: 'Blush', bg: '#FBF1EF', ink: '#3A2A2E', soft: '#86706F', line: '#EBD9D6', accent: '#C98A8D', onAccent: '#FFFFFF' },
  { key: 'sand', name: 'Sand', bg: '#F2EADF', ink: '#3A2A22', soft: '#80705F', line: '#DDD0BE', accent: '#A5683F', onAccent: '#FFFFFF' },
  { key: 'sage', name: 'Sage', bg: '#EEF1EA', ink: '#27302A', soft: '#6D7A70', line: '#D6DDD0', accent: '#6F8A66', onAccent: '#FFFFFF' },
  { key: 'mist', name: 'Mist', bg: '#EEF2F5', ink: '#1F2D4A', soft: '#6A7790', line: '#D6DEE6', accent: '#3F5F8F', onAccent: '#FFFFFF' },
  { key: 'charcoal', name: 'Charcoal', bg: '#1F1F22', ink: '#F4EEE8', soft: '#A9A39D', line: '#34343A', accent: '#E6D3B3', onAccent: '#1F1F22' },
  { key: 'noir', name: 'Noir', bg: '#111113', ink: '#F4EEE8', soft: '#A19B96', line: '#2A2A2E', accent: '#E6D3B3', onAccent: '#111113' },
  { key: 'navy', name: 'Navy', bg: '#14213D', ink: '#F1EDE4', soft: '#A5AFC2', line: '#27365A', accent: '#E2C58A', onAccent: '#14213D' },
  { key: 'forest', name: 'Forest', bg: '#17261F', ink: '#EFEBDD', soft: '#A5B3A8', line: '#2A3F34', accent: '#D5C59A', onAccent: '#17261F' },
  { key: 'plum', name: 'Plum', bg: '#2A1B26', ink: '#F4E9EE', soft: '#B79FAE', line: '#42303C', accent: '#E8B4C8', onAccent: '#2A1B26' },
  { key: 'mocha', name: 'Mocha', bg: '#2B211B', ink: '#F3E9DD', soft: '#B3A396', line: '#43342B', accent: '#D9B382', onAccent: '#2B211B' },
]

export const COVERS = [
  { k: 'cinema', name: 'Cinema' },
  { k: 'monogram', name: 'Monogram' },
  { k: 'magazine', name: 'Magazine' },
  { k: 'diptych', name: 'Diptych' },
  { k: 'stack', name: 'Stack' },
  { k: 'arch', name: 'Arch' },
  { k: 'bigtype', name: 'Big type' },
  { k: 'mosaic', name: 'Mosaic' },
  { k: 'circle', name: 'Circle' },
  { k: 'ticket', name: 'Ticket' },
]
const LEGACY_COVER: Record<string, string> = { bottom: 'cinema', center: 'monogram', split: 'diptych', frame: 'arch', below: 'bigtype', text: 'cinema' }

export const LAYOUTS = [
  { k: 'masonry', name: 'Masonry' },
  { k: 'grid', name: 'Even grid' },
  { k: 'square', name: 'Squares' },
  { k: 'rows', name: 'Wide rows' },
  { k: 'feature', name: 'Big and small' },
  { k: 'wide', name: 'Two columns' },
  { k: 'mosaic', name: 'Mosaic' },
  { k: 'story', name: 'Story' },
  { k: 'stagger', name: 'Staggered' },
  { k: 'filmstrip', name: 'Filmstrip' },
]

export const LAYOUT_PRESETS: Record<string, { bg: string; accent: string; gap: number; radius: number }> = {
  masonry: { bg: '#F8F0E8', accent: '#A8553A', gap: 8, radius: 6 },
  grid: { bg: '#FFFFFF', accent: '#000000', gap: 6, radius: 0 },
  rows: { bg: '#1E1D1C', accent: '#C9AE7B', gap: 5, radius: 3 },
  feature: { bg: '#F6E3E0', accent: '#9A5A5C', gap: 6, radius: 6 },
  wide: { bg: '#EEF0E6', accent: '#2C4A22', gap: 6, radius: 0 },
  mosaic: { bg: '#111111', accent: '#E8761E', gap: 0, radius: 0 },
  story: { bg: '#FAF6F1', accent: '#1E2A52', gap: 4, radius: 0 },
  stagger: { bg: '#F6E5D6', accent: '#A8432B', gap: 10, radius: 12 },
  filmstrip: { bg: '#F7F0E8', accent: '#1B2A52', gap: 8, radius: 10 },
  square: { bg: '#E5E7E8', accent: '#2A2A2A', gap: 10, radius: 4 },
}

export const EL_NAMES: Record<string, string> = {
  title: 'Gallery title', brand: 'Studio name', count: 'Photo count', download: 'Download button', all: 'All button',
  favs: 'Favorites button', moment: 'Section heading', footer: 'Footer line', photos: 'Photos', initials: 'Cover initials', title2: 'Gallery title line 2',
}
const EL_SEL: Record<string, string> = {
  title: '.gal-root h1,.gal-root [data-gk="title"]',
  brand: '.gal-root [data-gk="brand"]',
  count: '.gal-root [data-gk="count"]',
  download: '.gal-root [data-gk="download"]',
  all: '.gal-root [data-gk="all"]',
  favs: '.gal-root [data-gk="favs"]',
  moment: '.gal-root [data-gk="moment"]',
  footer: '.gal-root [data-gk="footer"]',
  initials: '.gal-root [data-gk="initials"]',
  title2: '.gal-root [data-gk="title2"]',
}
const HEX = /^#[0-9a-f]{6}$/i

export function elCss(el: Record<string, ElStyle>, famOf: (k: string) => string | undefined): string {
  let out = ''
  for (const [k, s] of Object.entries(el)) {
    const sel = EL_SEL[k] ?? (/^x\d{1,2}$/.test(k) ? `.gal-root [data-gk="${k}"]` : undefined)
    if (!sel || !s) continue
    const r: string[] = []
    if (s.font) { const f = famOf(s.font); if (f) r.push(`font-family:${f}!important`) }
    if (typeof s.size === 'number' && Number.isFinite(s.size)) r.push(`font-size:${Math.min(160, Math.max(6, s.size))}px!important`)
    if (s.color && HEX.test(s.color)) r.push(`color:${s.color}!important`)
    if (typeof s.bold === 'boolean') r.push(`font-weight:${s.bold ? 700 : 400}!important`)
    {
      const mx = typeof s.dx === 'number' && Number.isFinite(s.dx) ? Math.min(600, Math.max(-600, s.dx)) : 0
      const my = typeof s.dy === 'number' && Number.isFinite(s.dy) ? Math.min(300, Math.max(-300, s.dy)) : 0
      if (mx !== 0 || my !== 0) r.push(`translate:${mx}px ${my}px!important`)
    }
    if (r.length) out += `${sel}{${r.join(';')}}`
  }
  return out
}

const lum = (h: string) => {
  const n = parseInt(h.slice(1), 16)
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
}
const isHex = (c?: string): c is string => !!c && HEX.test(c)
const clampN = (v: unknown, lo: number, hi: number, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d)

export function resolveDesign(d?: GalleryDesign | null) {
  const base = LOOKS[d?.look ?? ''] ?? LOOKS.classic
  const look = { ...base, gap: clampN(d?.gap, 0, 60, base.gap), radius: clampN(d?.radius, 0, 40, base.radius) }
  const cv = LEGACY_COVER[d?.cover ?? ''] ?? d?.cover
  const cover = cv && COVERS.some((c) => c.k === cv) ? cv : base.cover
  let pal: Palette = PALETTES.find((p) => p.key === d?.colors) ?? PALETTES.find((p) => p.key === base.colors) ?? PALETTES[0]
  if (isHex(d?.bg)) {
    const dark = lum(d.bg) < 0.5
    pal = { ...pal, bg: d.bg, ink: dark ? '#F4EEE8' : '#2A1F24', soft: dark ? '#A9A39D' : '#7B6E70', line: dark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)' }
  }
  if (isHex(d?.accent)) pal = { ...pal, accent: d.accent, onAccent: lum(d.accent) < 0.6 ? '#FFFFFF' : '#1B1B1D' }
  let coverPal: Palette = pal
  if (isHex(d?.coverBg)) {
    const dark = lum(d.coverBg) < 0.5
    coverPal = { ...pal, bg: d.coverBg, ink: dark ? '#F4EEE8' : '#2A1F24', soft: dark ? '#A9A39D' : '#7B6E70', line: dark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)' }
  }
  const f = d?.focal
  const focal = f && Number.isFinite(f.x) && Number.isFinite(f.y) ? { x: Math.min(100, Math.max(0, f.x)), y: Math.min(100, Math.max(0, f.y)) } : { x: 50, y: 50 }
  const layout = LAYOUTS.some((l) => l.k === d?.layout) ? (d?.layout as string) : base.grid === 'masonry' ? 'masonry' : 'grid'
  const el: Record<string, ElStyle> = d?.el ?? {}
  const zoom = Math.min(3, Math.max(1, Number(d?.zoom) || 1))
  const focals: Record<string, { x: number; y: number }> = {}
  for (const [k, v] of Object.entries(d?.focals ?? {})) {
    if (v && Number.isFinite(v.x) && Number.isFinite(v.y)) focals[k] = { x: Math.min(100, Math.max(0, v.x)), y: Math.min(100, Math.max(0, v.y)) }
  }
  const slots: Record<string, string> = {}
  for (const [k, v] of Object.entries(d?.slots ?? {})) if (typeof v === 'string' && v) slots[k] = v
  return { look, cover, pal, coverPal, focal, focals, zoom, layout, el, slots }
}
