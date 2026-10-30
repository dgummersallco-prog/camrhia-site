import type { Adjust } from '@/lib/enhance'

export type SceneDef = { id: string; name: string; startId: string; light: string }
export type Brief = { type?: string; style?: string; setting?: string; light?: string; mood?: string; skin?: string; scenes?: SceneDef[] }
export type Option = { value: string; label: string; blurb?: string }
export type Question = { key: keyof Brief; title: string; hint?: string; options: Option[] }

export const STYLE_LOOK: Record<string, string> = {
  light_airy: 'airy',
  true_color: 'natural',
  dark_moody: 'moody',
  film: 'film',
  bw: 'bw',
  bold_vibrant: 'vivid',
}

export const QUESTIONS: Question[] = [
  {
    key: 'type',
    title: 'What kind of shoot is this?',
    options: [
      { value: 'wedding', label: 'Wedding' },
      { value: 'engagement', label: 'Engagement or couples' },
      { value: 'family', label: 'Family' },
      { value: 'newborn', label: 'Newborn or maternity' },
      { value: 'senior', label: 'Senior or graduation' },
      { value: 'headshots', label: 'Headshots or branding' },
      { value: 'sports', label: 'Sports or team' },
      { value: 'other', label: 'Something else' },
    ],
  },
  {
    key: 'style',
    title: 'What style do you want to edit this shoot in?',
    hint: 'Your starting look for this shoot. It can be different every time.',
    options: [
      { value: 'light_airy', label: 'Light & Airy', blurb: 'Soft, bright and dreamy' },
      { value: 'true_color', label: 'True to Color', blurb: 'Clean and natural' },
      { value: 'dark_moody', label: 'Dark & Moody', blurb: 'Deep and dramatic' },
      { value: 'film', label: 'Film', blurb: 'Warm tones with a film feel' },
      { value: 'bw', label: 'Black & White', blurb: 'Classic monochrome' },
      { value: 'bold_vibrant', label: 'Bold & Vibrant', blurb: 'Rich, punchy color' },
    ],
  },
  {
    key: 'setting',
    title: 'Where did you shoot?',
    options: [
      { value: 'outdoors', label: 'Outdoors' },
      { value: 'indoors', label: 'Indoors' },
      { value: 'both', label: 'Both' },
    ],
  },
  {
    key: 'light',
    title: 'What was the light like?',
    hint: 'Pick the main light for this shoot.',
    options: [
      { value: 'golden_hour', label: 'Golden hour', blurb: 'Low, warm sun' },
      { value: 'open_shade', label: 'Open shade', blurb: 'Soft, cooler light' },
      { value: 'harsh_sun', label: 'Harsh midday sun', blurb: 'High contrast, hard shadows' },
      { value: 'overcast', label: 'Overcast', blurb: 'Even, flat light' },
      { value: 'window', label: 'Window light', blurb: 'Soft indoor daylight' },
      { value: 'dark_flash', label: 'Dark venue or flash', blurb: 'Low light, flash' },
      { value: 'mixed', label: 'A mix of everything' },
    ],
  },
  {
    key: 'mood',
    title: 'What mood are you going for?',
    options: [
      { value: 'romantic', label: 'Romantic and soft' },
      { value: 'joyful', label: 'Bright and joyful' },
      { value: 'dramatic', label: 'Dark and dramatic' },
      { value: 'timeless', label: 'Timeless and classic' },
      { value: 'cinematic', label: 'Cinematic' },
    ],
  },
  {
    key: 'skin',
    title: 'Keep skin tones natural?',
    options: [
      { value: 'yes', label: 'Yes, keep skin natural', blurb: 'Recommended. Holds back extreme color shifts.' },
      { value: 'no', label: 'No, let the look go all the way' },
    ],
  },
]

const LIGHT: Record<string, Adjust> = {
  golden_hour: { temp: 0.05, highlights: -0.1 },
  open_shade: { temp: 0.06, exposure: 0.1 },
  harsh_sun: { highlights: -0.25, shadows: 0.2, contrast: -0.05 },
  overcast: { contrast: 0.08, temp: 0.03, saturation: 0.05 },
  window: { shadows: 0.1, exposure: 0.05 },
  dark_flash: { exposure: 0.12, shadows: 0.15, saturation: -0.03 },
}

const MOOD: Record<string, Adjust> = {
  romantic: { fade: 0.02, contrast: -0.05, temp: 0.03, saturation: -0.03 },
  joyful: { exposure: 0.1, saturation: 0.06 },
  dramatic: { contrast: 0.15, exposure: -0.1, shadows: -0.08 },
  timeless: { contrast: 0.05, saturation: -0.05 },
  cinematic: { contrast: 0.1, saturation: -0.08, fade: 0.03 },
}

const SETTING: Record<string, Adjust> = {
  indoors: { shadows: 0.05 },
}

function add(a: Adjust, b: Adjust | undefined): Adjust {
  const out: Adjust = { ...a }
  if (!b) return out
  for (const k of Object.keys(b) as (keyof Adjust)[]) out[k] = (out[k] ?? 0) + (b[k] ?? 0)
  return out
}

export function briefAdjust(b: Brief): { adjust: Adjust | undefined; skin: boolean } {
  let a: Adjust = {}
  a = add(a, b.light ? LIGHT[b.light] : undefined)
  a = add(a, b.mood ? MOOD[b.mood] : undefined)
  a = add(a, b.setting ? SETTING[b.setting] : undefined)
  return { adjust: Object.keys(a).length > 0 ? a : undefined, skin: b.skin === 'yes' }
}
