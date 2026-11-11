export type GalleryDesign = { look?: string; cover?: string; colors?: string; focal?: { x: number; y: number } }

export type LookSpec = {
  name: string; blurb: string; font: string; upper: boolean; italic?: boolean; weight: number
  track: string; radius: number; gap: number; grid: 'masonry' | 'uniform'; cover: string; colors: string
}

const SERIF = "Georgia, 'Times New Roman', serif"
const SANS = "'Helvetica Neue', Arial, sans-serif"

export const LOOKS: Record<string, LookSpec> = {
  classic: { name: 'Heirloom', blurb: 'Warm serif, soft corners.', font: 'fraunces', upper: false, weight: 600, track: '0', radius: 8, gap: 12, grid: 'masonry', cover: 'bottom', colors: 'ivory' },
  fine: { name: 'Linen', blurb: 'Thin, spaced capitals.', font: SERIF, upper: true, weight: 400, track: '0.18em', radius: 0, gap: 20, grid: 'uniform', cover: 'center', colors: 'white' },
  minimal: { name: 'Plain', blurb: 'Clean and quiet, tight grid.', font: SANS, upper: false, weight: 300, track: '0', radius: 0, gap: 4, grid: 'uniform', cover: 'below', colors: 'white' },
  airy: { name: 'Daylight', blurb: 'Light and open, lots of space.', font: 'fraunces', upper: false, weight: 300, track: '0', radius: 2, gap: 24, grid: 'masonry', cover: 'frame', colors: 'ivory' },
  spotlight: { name: 'After dark', blurb: 'Dark and dramatic.', font: SANS, upper: true, weight: 600, track: '0.12em', radius: 10, gap: 10, grid: 'masonry', cover: 'center', colors: 'charcoal' },
  editorial: { name: 'Press', blurb: 'Bold magazine type.', font: 'fraunces', upper: true, weight: 700, track: '0.04em', radius: 0, gap: 8, grid: 'masonry', cover: 'split', colors: 'sand' },
  expressive: { name: 'Loud', blurb: 'Big, rounded and loud.', font: "'Arial Black', Helvetica, sans-serif", upper: true, weight: 800, track: '0.02em', radius: 22, gap: 10, grid: 'masonry', cover: 'bottom', colors: 'blush' },
  folk: { name: 'Handmade', blurb: 'Handmade, italic serif.', font: SERIF, upper: false, italic: true, weight: 400, track: '0', radius: 16, gap: 16, grid: 'masonry', cover: 'frame', colors: 'sage' },
  soft: { name: 'Petal', blurb: 'Gentle and rounded.', font: 'fraunces', upper: false, weight: 400, track: '0', radius: 28, gap: 14, grid: 'masonry', cover: 'center', colors: 'mist' },
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
  { k: 'bottom', name: 'Caption' },
  { k: 'center', name: 'Centered' },
  { k: 'split', name: 'Side by side' },
  { k: 'frame', name: 'Matted' },
  { k: 'below', name: 'Below' },
  { k: 'text', name: 'Words only' },
]

export function resolveDesign(d?: GalleryDesign | null) {
  const look = LOOKS[d?.look ?? ''] ?? LOOKS.classic
  const cv = d?.cover
  const cover = cv && COVERS.some((c) => c.k === cv) ? cv : look.cover
  const pal = PALETTES.find((p) => p.key === d?.colors) ?? PALETTES.find((p) => p.key === look.colors) ?? PALETTES[0]
  const f = d?.focal
  const focal = f && Number.isFinite(f.x) && Number.isFinite(f.y) ? { x: Math.min(100, Math.max(0, f.x)), y: Math.min(100, Math.max(0, f.y)) } : { x: 50, y: 50 }
  return { look, cover, pal, focal }
}
