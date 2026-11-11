import { FONT_OPTIONS } from '@/lib/siteTheme'

export type SiteState = {
  site_template: string | null
  site_accent: string | null
  site_font_pair: string | null
  site_headline: string | null
  site_subhead: string | null
  site_settings: Record<string, any> | null
}

const COLORS: Record<string, string> = {
  blush: '#E8C4C4', 'dusty rose': '#C98A8D', 'dusty pink': '#D9A5A9', rose: '#C98A8D', pink: '#E8A5B3', 'soft pink': '#F2CFD3', 'light pink': '#F6DDE0', 'hot pink': '#E0457B', magenta: '#B3317A', fuchsia: '#C2338F',
  cream: '#FAF6EE', ivory: '#FBF8F1', 'off white': '#FAF8F4', offwhite: '#FAF8F4', bone: '#EFE8DA', oat: '#E6DCCB', oatmeal: '#E6DCCB', white: '#FFFFFF',
  black: '#111111', charcoal: '#2B2B2E', slate: '#4A5560', stone: '#B8B0A4', gray: '#8A8A8A', grey: '#8A8A8A', silver: '#C4C4C8',
  sage: '#9CAF88', olive: '#7A7F4E', moss: '#6F7F4F', pistachio: '#B7C99A', mint: '#BFDCCB', seafoam: '#A7D3C0', 'forest green': '#2F4A38', 'hunter green': '#2F4A38', emerald: '#1F6F5B', green: '#5C8A5E',
  navy: '#1F2D4A', midnight: '#16213A', cobalt: '#2F55A4', 'dusty blue': '#7C93AE', 'baby blue': '#BCD6EC', 'sky blue': '#A9C7E3', blue: '#4A6FA5', periwinkle: '#8D96D6', teal: '#2F7F86',
  terracotta: '#C06A4D', rust: '#B5532F', copper: '#B87333', bronze: '#9A7340', gold: '#B08D57', champagne: '#E6D3B3', honey: '#D9A441', butter: '#F3E3A8', lemon: '#F1DD6B', mustard: '#CFA73A', yellow: '#E3B93C', orange: '#D9722E',
  burgundy: '#6E1F2E', maroon: '#6B1D2A', wine: '#722F37', crimson: '#A81C2E', red: '#B3262E',
  lavender: '#B7A5D3', mauve: '#A58A9A', plum: '#5B2C4A', purple: '#7B4F9E', peach: '#F2B79B', coral: '#EE7D6F',
  tan: '#CDB89B', taupe: '#8B7D73', sand: '#E4D6C3', beige: '#DCCFB8', nude: '#E0C3B1', khaki: '#BDB08A', brown: '#6B4A3A', chocolate: '#3E2A22', cocoa: '#5A3E33', espresso: '#2E1F1A',
}
const COLOR_NAMES = Object.keys(COLORS).sort((a, b) => b.length - a.length)

export function findColor(t: string): string | null {
  const m = /#(?:[0-9a-f]{6}|[0-9a-f]{3})\b/i.exec(t)
  if (m) return m[0].length === 4 ? '#' + m[0].slice(1).split('').map((c) => c + c).join('') : m[0]
  for (const n of COLOR_NAMES) if (new RegExp('\\b' + n + '\\b').test(t)) return COLORS[n]
  return null
}

const toRgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
export function mixHex(a: string, b: string, t: number): string {
  const x = toRgb(a), y = toRgb(b)
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')
}
export function isLight(h: string): boolean {
  const [r, g, b] = toRgb(h)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62
}

const ens = (S: Record<string, any>, k: string) => (S[k] = S[k] ?? {})

export function applyPalette(n: SiteState, accent: string, bg: string, text: string) {
  const s = (n.site_settings = n.site_settings ?? {})
  n.site_accent = accent
  s.colors = { ...(s.colors ?? {}), bg, text, tint: mixHex(bg, text, 0.06) }
  s.button = { ...(s.button ?? {}), text: isLight(accent) ? '#2A1F24' : '#FFFFFF' }
}

function setButtons(S: Record<string, any>, shape: 'square' | 'rounded' | 'pill') {
  ens(S, 'button').shape = shape
  ens(S, 'hero').btn_shape = shape
  for (const k of ['contactBtn', 'bookBtn', 'aboutBtn', 'galBtn', 'portfolioBtn']) ens(S, k).shape = shape
}

// ---- Photographer design knowledge ----
type Preset = {
  why: string
  tpl?: string; pair?: string; head?: string; body?: string
  pal?: [string, string, string]
  btn?: 'square' | 'rounded' | 'pill'
  radius?: 'sharp' | 'soft' | 'round'
  space?: 'airy' | 'tight'
  gallery?: string; portfolio?: string; big?: boolean
}

const VIBES: Record<string, Preset> = {
  luxury: { why: 'Luxury is quiet: thin elegant serif type, lots of space, ivory and gold, sharp square buttons.', tpl: 'editorial', head: 'cormorant', body: 'josefin', pal: ['#B08D57', '#FBF8F1', '#2A1F24'], btn: 'square', radius: 'sharp', space: 'airy' },
  editorial: { why: 'Editorial means a huge headline over a wide photo, a fashion-magazine serif and black on white.', tpl: 'magazine', head: 'playfair', body: 'worksans', pal: ['#1B1B1D', '#FFFFFF', '#1B1B1D'], btn: 'square', radius: 'sharp', big: true },
  romantic: { why: 'Romantic is soft: framed photos, a gentle serif, blush tones and softly rounded buttons.', tpl: 'framed', pair: 'romantic', pal: ['#C98A8D', '#FBF4F1', '#3A2A2E'], btn: 'rounded', radius: 'soft', space: 'airy' },
  minimal: { why: 'Minimal lets the photos do the talking: clean white, small clean type, square corners, lots of air.', tpl: 'minimal', pair: 'modern', pal: ['#2A1F24', '#FFFFFF', '#2A1F24'], btn: 'square', radius: 'sharp', space: 'airy' },
  moody: { why: 'Moody is dark and cinematic: deep background, warm light text, a classic serif.', tpl: 'editorial', pair: 'serif', pal: ['#E6D3B3', '#17141A', '#F4EEE8'], btn: 'square' },
  vintage: { why: 'Vintage and film looks lean on warm creams, a chunky retro serif and earthy rust.', tpl: 'editorial', head: 'dmserif', body: 'lora', pal: ['#B5532F', '#F5EBDD', '#3A2A22'], btn: 'square', radius: 'soft' },
  boho: { why: 'Boho and earthy is warm and natural: sand backgrounds, terracotta, an airy serif.', tpl: 'split', head: 'cormorant', body: 'worksans', pal: ['#9A6B4F', '#F4EDE3', '#3A2F27'], btn: 'rounded', radius: 'soft', space: 'airy' },
  modern: { why: 'Modern is crisp: a split layout, clean sans type, navy on white.', tpl: 'split', head: 'jost', body: 'inter', pal: ['#1F2D4A', '#FFFFFF', '#1F2D4A'], btn: 'square', radius: 'sharp' },
  bold: { why: 'Bold is loud and confident: a big condensed headline, black and white, big photos.', tpl: 'magazine', head: 'bebasneue', body: 'montserrat', pal: ['#111111', '#FFFFFF', '#111111'], btn: 'square', radius: 'sharp', big: true },
  pastel: { why: 'Pastel is light and sweet: a soft pink on a warm white with a gentle serif.', tpl: 'framed', pair: 'romantic', pal: ['#E8A5B3', '#FFF7F5', '#4A3A3F'], btn: 'rounded', radius: 'soft', space: 'airy' },
}
const VIBE_WORDS: [RegExp, string][] = [
  [/\b(luxury|luxurious|high.?end|upscale|expensive|elegant)\b/, 'luxury'], [/\beditorial|magazine|fashion\b/, 'editorial'],
  [/\b(romantic|dreamy|whimsical)\b/, 'romantic'], [/\b(minimal|minimalist|clean|simple)\b/, 'minimal'],
  [/\b(moody|dark and|cinematic|dramatic)\b/, 'moody'], [/\b(vintage|film|retro|nostalgic|old school)\b/, 'vintage'],
  [/\b(boho|bohemian|earthy|natural|organic|rustic)\b/, 'boho'], [/\b(modern|contemporary|sleek)\b/, 'modern'],
  [/\b(bold|striking|loud|powerful)\b/, 'bold'], [/\b(pastel|soft and|sweet|feminine)\b/, 'pastel'],
]

const NICHES: Record<string, { label: string; p: Preset }> = {
  wedding: { label: 'wedding', p: { why: 'Wedding clients buy on feeling, so I went with a full-screen photo, a classic serif, lots of space and a soft palette. Masonry galleries show off a whole day.', tpl: 'editorial', pair: 'serif', pal: ['#C98A8D', '#FBF6F1', '#2A1F24'], btn: 'square', radius: 'sharp', space: 'airy', gallery: 'masonry', portfolio: 'feature' } },
  newborn: { label: 'newborn and family', p: { why: 'Newborn and family sites feel best soft and warm: framed photos, a gentle serif, cream and blush, softly rounded buttons.', tpl: 'framed', pair: 'romantic', pal: ['#C9A09A', '#FBF5F0', '#3A2A2E'], btn: 'rounded', radius: 'soft', space: 'airy', gallery: 'grid' } },
  portrait: { label: 'portrait and senior', p: { why: 'Portrait and senior clients want confident and current: a split layout, clean modern type, navy on white, sharp corners.', tpl: 'split', pair: 'modern', pal: ['#1F2D4A', '#FFFFFF', '#1B1B1D'], btn: 'square', radius: 'sharp', gallery: 'masonry' } },
  sports: { label: 'sports and team', p: { why: 'Sports sites need energy: a big condensed headline, bold red on white, a tight photo grid.', tpl: 'magazine', head: 'bebasneue', body: 'montserrat', pal: ['#C8102E', '#FFFFFF', '#111111'], btn: 'square', radius: 'sharp', big: true, gallery: 'grid' } },
  commercial: { label: 'commercial and brand', p: { why: 'Commercial clients want clarity: minimal white, clean sans type, square corners and a clean grid.', tpl: 'minimal', pair: 'modern', pal: ['#111111', '#FFFFFF', '#111111'], btn: 'square', radius: 'sharp', space: 'airy', gallery: 'grid' } },
  boudoir: { label: 'boudoir', p: { why: 'Boudoir works best dark and intimate: deep background, warm gold, an elegant serif.', tpl: 'editorial', pair: 'serif', pal: ['#E6D3B3', '#17141A', '#F4EEE8'], btn: 'square', space: 'airy' } },
}
const NICHE_WORDS: [RegExp, string][] = [
  [/\bwedding|weddings|bride|bridal|elopement\b/, 'wedding'], [/\b(newborn|maternity|family|families|baby|babies|kids|children)\b/, 'newborn'],
  [/\b(senior|seniors|portrait|portraits|headshot|headshots|lifestyle|graduation)\b/, 'portrait'], [/\b(sports|sport|team|teams|athlete|athletes)\b/, 'sports'],
  [/\b(commercial|brand|branding|product|food|real estate|architecture|corporate)\b/, 'commercial'], [/\bboudoir\b/, 'boudoir'],
]

function applyPreset(n: SiteState, p: Preset) {
  const S = (n.site_settings = n.site_settings ?? {})
  if (p.tpl) n.site_template = p.tpl
  if (p.pair || p.head || p.body) {
    if (p.pair) { n.site_font_pair = p.pair; if (S.fonts) { delete S.fonts.head; delete S.fonts.body } }
    if (S.hero) { delete S.hero.headline_font; delete S.hero.para_font }
  }
  if (p.head) { ens(S, 'fonts').head = p.head; ens(S, 'hero').headline_font = p.head }
  if (p.body) { ens(S, 'fonts').body = p.body; ens(S, 'hero').para_font = p.body }
  if (p.pal) applyPalette(n, p.pal[0], p.pal[1], p.pal[2])
  if (p.btn) setButtons(S, p.btn)
  if (p.radius) ens(S, 'portfolio').radius = p.radius
  if (p.space) ens(S, 'sizes').sectionSpace = p.space === 'airy' ? { phone: 84, desktop: 140 } : { phone: 36, desktop: 56 }
  if (p.gallery) { ens(S, 'gallery').layout = p.gallery; ens(S, 'galpage').layout = p.gallery }
  if (p.portfolio) ens(S, 'portfolio').layout = p.portfolio
  if (p.big) ens(S, 'sizes').headline = { phone: 56, desktop: 100 }
}

// ---- Fonts ----
const FONT_ALIASES: [string, string][] = [
  ['times new roman', 'timesnewroman'], ['times', 'timesnewroman'], ['georgia', 'georgia'], ['cambria', 'cambria'], ['arial', 'arial'], ['helvetica', 'helvetica'],
  ['calibri', 'calibri'], ['courier', 'couriernew'], ['typewriter', 'couriernew'], ['garamond', 'ebgaramond'], ['baskerville', 'librebaskerville'], ['caslon', 'librecaslontext'],
  ['didot', 'bodoni'], ['bodoni', 'bodoni'], ['futura', 'jost'], ['gotham', 'montserrat'], ['avenir', 'nunitosans'], ['century gothic', 'questrial'], ['optima', 'marcellus'],
  ['palatino', 'lora'], ['comic sans', 'quicksand'], ['impact', 'anton'], ['copperplate', 'cinzel'], ['trajan', 'cinzel'], ['brush script', 'allura'], ['signature', 'mrssaintdelafield'],
]
function resolveFont(t: string): { key: string; alias: boolean } | null {
  for (const [a, k] of [...FONT_ALIASES].sort((x, y) => y[0].length - x[0].length)) {
    if (new RegExp('\\b' + a + '\\b').test(t) && FONT_OPTIONS[k]) return { key: k, alias: true }
  }
  let best: string | null = null
  for (const [k, f] of Object.entries(FONT_OPTIONS)) {
    const lab = f.label.toLowerCase()
    if (new RegExp('\\b' + lab.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(t) && (!best || lab.length > FONT_OPTIONS[best].label.length)) best = k
  }
  return best ? { key: best, alias: false } : null
}

const SHAPE_WORDS = (t: string): 'square' | 'rounded' | 'pill' | null => {
  if (/\b(pill|capsule|oval)\b/.test(t)) return 'pill'
  if (/\b(rectangle|rectangles|rectangular|square|squared|sharp|boxy|straight|no curve|not round)/.test(t)) return 'square'
  if (/\b(rounded|round|soft|curved|curvy)\b/.test(t)) return 'rounded'
  return null
}

const TEMPLATES: [string, string][] = [['editorial', 'editorial'], ['split', 'split'], ['minimal', 'minimal'], ['framed', 'framed'], ['magazine', 'magazine'], ['freestyle', 'mosaic'], ['mosaic', 'mosaic']]

export const CAMI_EXAMPLES = [
  'I shoot weddings',
  'Make the buttons rectangles',
  'Times New Roman for the title',
  'Make it feel luxury',
  'Make it more airy',
  'Change the main color to sage',
  'Undo',
]

const ADVICE: [RegExp, string][] = [
  [/\b(font|fonts|typeface|type)\b/, 'Fonts: use two at most. A serif headline (Cormorant, Playfair, Times New Roman) with a clean sans body (Montserrat, Jost, Arial) is the safest high-end pairing. Script fonts are best saved for your name only. Tell me "Cormorant for the title and Jost for the body" and I will set it.'],
  [/\b(color|colors|colour|colours|palette)\b/, 'Colors: pick one main color, one soft background and one dark text color. Weddings love blush, sage or champagne on ivory. Families love cream and warm neutrals. Sports and brands do well with one bold color on white. Tell me "main color sage" or "background cream".'],
  [/\b(layout|layouts|template|templates)\b/, 'Layouts: Editorial (full-screen photo) suits weddings. Framed suits families and newborns. Split suits portraits and seniors. Magazine suits bold brands and sports. Minimal suits commercial work. Tell me "try the magazine layout".'],
]

export function camiSite(input: string, cur: SiteState): { state: SiteState; reply: string; changed: boolean } {
  const raw = input.trim()
  const t = raw.toLowerCase()
  const n: SiteState = JSON.parse(JSON.stringify(cur))
  const S = (n.site_settings = n.site_settings ?? {})
  const o = (k: string) => ens(S, k)
  const done: string[] = []
  const why: string[] = []

  // advice questions (no change)
  if (/\b(what|which|suggest|recommend|should i|ideas?|advice|help me pick|best)\b/.test(t) && /\?|\b(what|which|suggest|recommend|should)\b/.test(t)) {
    const a = ADVICE.find(([re]) => re.test(t))
    if (a) return { state: cur, changed: false, reply: a[1] }
  }

  // photographer niche
  if (/\b(i shoot|i photograph|i'm a|i am a|im a|my niche|my clients|photographer|my business is)\b/.test(t)) {
    const hit = NICHE_WORDS.find(([re]) => re.test(t))
    if (hit) { const nz = NICHES[hit[1]]; applyPreset(n, nz.p); done.push('set your site up for ' + nz.label + ' photography'); why.push(nz.p.why) }
  }

  // vibe
  const explicit = /\b(button|buttons|font|fonts|photo|photos|corner|corners|gap|menu|headline|background|spacing|text color|title|body)\b/.test(t)
  if (!done.length && !explicit && /\b(make it|more|feel|feeling|look|vibe|style|go|want|something|aesthetic|like)\b/.test(t)) {
    const hit = VIBE_WORDS.find(([re]) => re.test(t))
    if (hit) { const v = VIBES[hit[1]]; applyPreset(n, v); done.push('gave it a ' + hit[1] + ' look'); why.push(v.why) }
  }

  // headline / subhead / business name — only with a connector or quotes
  const grab = (re1: RegExp, re2: RegExp): string | null => {
    const m = re1.exec(raw) ?? re2.exec(raw)
    if (!m) return null
    const c = m[1].trim().replace(/^["“']|["”']$/g, '')
    const cl = c.toLowerCase()
    if (!c || c.split(/\s+/).length > 14) return null
    if (resolveFont(cl) && c.split(/\s+/).length <= 4) return null
    if (findColor(cl) && c.split(/\s+/).length <= 3) return null
    if (/^(bigger|smaller|larger|bold|bolder|lighter|darker|centered|left|right|hidden|shorter|longer|white|black)\b/i.test(c)) return null
    return c
  }
  const sub = grab(/(?:subhead|subtitle|tagline|sub headline)\s*(?:to|is|says?|:|=)\s*["“]?(.+?)["”]?$/i, /(?:subhead|subtitle|tagline)[^"“]*["“]([^"”]+)["”]/i)
  if (sub) { n.site_subhead = sub; done.push('updated the subhead') }
  const head = !sub ? grab(/(?:headline|main title|hero text|big text)\s*(?:to|is|says?|:|=)\s*["“]?(.+?)["”]?$/i, /(?:headline|main title|hero text|big text)[^"“]*["“]([^"”]+)["”]/i) : null
  if (head) { n.site_headline = head; done.push('changed the headline') }
  const biz = grab(/(?:business name|brand name|my name|logo text)\s*(?:to|is|:|=)\s*["“]?(.+?)["”]?$/i, /(?:business name|brand name)[^"“]*["“]([^"”]+)["”]/i)
  if (biz) { o('menu').brand = biz; o('menu').show = 'name'; done.push('set your name in the menu') }

  // template
  if (/\b(template|layout|look)\b/.test(t) && !/gallery|galleries|portfolio/.test(t) && !explicit) {
    const hit = TEMPLATES.find(([w]) => t.includes(w))
    if (hit) { n.site_template = hit[1]; done.push('switched to the ' + hit[0] + ' layout') }
  }

  // dark / light
  if (/\b(dark mode|dark theme|dark background|go dark)\b/.test(t)) {
    o('colors').bg = '#17141A'; S.colors.text = '#F4EEE8'; S.colors.tint = '#221E26'; done.push('went dark')
  } else if (/\b(light and airy|bright and airy|go light|light mode|light theme)\b/.test(t)) {
    o('colors').bg = '#FFFFFF'; S.colors.text = '#2A1F24'; S.colors.tint = '#F7F5F2'; done.push('made it light and airy')
  }

  // colors
  const col = findColor(t)
  if (col && !head && !sub && !biz && !/\b(font|typeface)\b/.test(t)) {
    if (/\b(title|headline|hero)\b.*\bcolou?r\b|\bcolou?r\b.*\b(title|headline)\b/.test(t)) { o('hero').headline_color = col; done.push('changed the title color') }
    else if (/\b(background|backdrop|bg)\b/.test(t)) { o('colors').bg = col; S.colors.tint = mixHex(col, S.colors.text ?? '#2A1F24', 0.06); done.push('changed the background') }
    else if (/\b(text color|font color|writing|words)\b/.test(t)) { o('colors').text = col; done.push('changed the text color') }
    else if (/\b(color|colour|accent|main|button|theme|make it|use)\b/.test(t) || t.split(/\s+/).length <= 3) {
      n.site_accent = col; o('button').text = isLight(col) ? '#2A1F24' : '#FFFFFF'; done.push('changed your main color')
    }
  }

  // fonts, with targets (title / subtitle / body / menu / everything)
  const fk = resolveFont(t)
  const fontWord = /\b(font|fonts|typeface|lettering|type)\b/.test(t)
  const tgt = new Set<string>()
  if (/\b(title|headline|heading|headings|header|hero|names?)\b/.test(t)) tgt.add('title')
  if (/\b(subhead|subtitle|tagline)\b/.test(t)) tgt.add('sub')
  if (/\b(body|paragraph|paragraphs|description|copy|text)\b/.test(t)) tgt.add('body')
  if (/\b(menu|nav|navigation|links)\b/.test(t)) tgt.add('menu')
  if (/\b(everything|whole site|all of it|all text|entire site|everywhere)\b/.test(t)) { tgt.add('title'); tgt.add('body') }
  if (fk && !head && !sub && !biz && (fontWord || tgt.size > 0 || fk.alias || FONT_OPTIONS[fk.key].label.length >= 8)) {
    if (tgt.size === 0) tgt.add('title')
    const lab = FONT_OPTIONS[fk.key].label
    const names: string[] = []
    if (tgt.has('title')) { o('fonts').head = fk.key; o('hero').headline_font = fk.key; names.push('the title and headings') }
    if (tgt.has('sub')) { o('hero').subhead_font = fk.key; names.push('the subtitle') }
    if (tgt.has('body')) { o('fonts').body = fk.key; o('hero').para_font = fk.key; names.push('the body text') }
    if (tgt.has('menu')) { ens(o('el'), 'menu_links').font = fk.key; names.push('the menu') }
    done.push('set ' + names.join(', ').replace(/, ([^,]*)$/, ' and $1') + ' in ' + lab)
  } else if (/\b(font|fonts|typeface|lettering)\b/.test(t) && !head && !sub) {
    const pair = /\b(elegant|classic|traditional|timeless)\b/.test(t) ? 'serif'
      : /\b(modern|clean|simple|minimal|sleek)\b/.test(t) ? 'modern'
      : /\b(romantic|soft|feminine|dreamy)\b/.test(t) ? 'romantic' : null
    if (/\b(script|handwritten|cursive|calligraphy)\b/.test(t)) { o('fonts').head = 'allura'; o('hero').headline_font = 'allura'; done.push('set the title in a script font') }
    else if (pair) {
      n.site_font_pair = pair
      if (S.fonts) { delete S.fonts.head; delete S.fonts.body }
      if (S.hero) { delete S.hero.headline_font; delete S.hero.para_font }
      done.push('switched to a ' + pair.replace('serif', 'classic') + ' font pairing')
    }
  }
  if (/\b(bolder|bold|heavier|thicker)\b/.test(t) && /\b(font|heading|headings|headline|title)\b/.test(t) && !/\b(bigger|larger)\b/.test(t)) { o('fonts').headWeight = 700; done.push('made the headings bolder') }
  else if (/\b(lighter|thin|thinner|delicate)\b/.test(t) && /\b(font|heading|headings|headline|title)\b/.test(t)) { o('fonts').headWeight = 300; done.push('made the headings lighter') }

  // shapes
  const shape = SHAPE_WORDS(t)
  if (shape && !fontWord) {
    const btn = /\b(button|buttons)\b/.test(t)
    const pho = /\b(photo|photos|image|images|picture|pictures|gallery|galleries|portfolio|corner|corners)\b/.test(t)
    const all = !btn && !pho
    if (btn || all) { setButtons(S, shape); done.push('made the buttons ' + (shape === 'square' ? 'rectangles' : shape === 'pill' ? 'pills' : 'softly rounded')) }
    if ((pho && !btn) || all) { o('portfolio').radius = shape === 'square' ? 'sharp' : shape === 'pill' ? 'round' : 'soft'; done.push('set the photo corners to ' + S.portfolio.radius) }
  }

  // spacing
  if (/\b(airy|airier|spacious|breathing room|roomy|more space|more spacing)\b/.test(t) && !done.some((d) => /look|set your site/.test(d))) { o('sizes').sectionSpace = { phone: 84, desktop: 140 }; done.push('opened up the spacing') }
  else if (/\b(tight|tighter|compact|less space|closer together)\b/.test(t)) { o('sizes').sectionSpace = { phone: 36, desktop: 56 }; done.push('tightened the spacing') }
  if (/\b(gap|gaps)\b/.test(t) && /\b(bigger|larger|wider|more)\b/.test(t)) { o('sizes').photoGap = { phone: 14, desktop: 26 }; S.sizes.galGap = { phone: 14, desktop: 26 }; done.push('widened the gaps between photos') }
  else if (/\b(gap|gaps)\b/.test(t) && /\b(smaller|less|tighter|no|none|remove)\b/.test(t)) { o('sizes').photoGap = { phone: 2, desktop: 4 }; S.sizes.galGap = { phone: 2, desktop: 4 }; done.push('tightened the gaps between photos') }

  // headline size
  if (/\b(headline|title|heading)\b/.test(t) && /\b(bigger|larger|huge|big|increase)\b/.test(t) && !/button/.test(t)) { o('sizes').headline = { phone: 56, desktop: 100 }; done.push('made the headline bigger') }
  else if (/\b(headline|title|heading)\b/.test(t) && /\b(smaller|tiny|decrease|reduce)\b/.test(t)) { o('sizes').headline = { phone: 32, desktop: 52 }; done.push('made the headline smaller') }

  // hero
  if (/\bslideshow\b/.test(t)) { const off = /\b(off|no|stop|turn off|disable)\b/.test(t); o('hero').slideshow = !off; done.push('turned the slideshow ' + (off ? 'off' : 'on')) }
  if (/\b(overlay|photo)\b/.test(t) && /\b(darker|dim|dimmer|more contrast)\b/.test(t)) { o('hero').overlay = 0.55; done.push('darkened the photo') }
  else if (/\b(overlay|photo)\b/.test(t) && /\b(lighter|brighter|brighten|less dark)\b/.test(t)) { o('hero').overlay = 0.12; done.push('brightened the photo') }
  const al = /\btext\b.*\b(left|right|center|centered|middle)\b/.exec(t)
  if (al && !/\b(top|bottom)\b/.test(t) && !fontWord) { o('hero').align = al[1] === 'centered' || al[1] === 'middle' ? 'center' : al[1]; done.push('moved the text ' + S.hero.align) }
  const va = /\b(text|words)\b.*\b(top|bottom|middle)\b/.exec(t)
  if (va) { o('hero').valign = va[2] === 'middle' ? 'center' : va[2]; done.push('moved the text to the ' + va[2]) }
  if (/\b(hide|remove|no)\b.*\b(button|check availability)\b/.test(t) && /\b(hero|main|top)\b/.test(t)) { o('hero').cta_show = false; done.push('hid the top button') }

  // menu
  const lp = /\blogo\b.*\b(left|center|right)\b/.exec(t)
  if (lp) { o('menu').logoPos = lp[1]; done.push('moved the logo ' + lp[1]) }
  if (/\bmenu\b/.test(t) && /\bsolid\b/.test(t)) { o('menu').style = 'solid'; done.push('made the menu solid') }
  else if (/\bmenu\b/.test(t) && /\b(transparent|clear|see through)\b/.test(t)) { o('menu').style = ''; done.push('made the menu transparent') }
  for (const pg of ['galleries', 'about', 'book']) {
    if (new RegExp('\\b(hide|remove)\\b.*\\b' + pg + '\\b.*\\bmenu\\b|\\bmenu\\b.*\\b(hide|remove)\\b.*\\b' + pg + '\\b').test(t)) {
      const h: string[] = Array.isArray(o('menu').hidden) ? S.menu.hidden : []
      if (!h.includes(pg)) h.push(pg)
      S.menu.hidden = h; done.push('hid ' + pg + ' from the menu')
    }
    if (new RegExp('\\b(show|add|bring back)\\b.*\\b' + pg + '\\b.*\\bmenu\\b').test(t)) {
      S.menu = S.menu ?? {}; S.menu.hidden = (Array.isArray(S.menu.hidden) ? S.menu.hidden : []).filter((x: string) => x !== pg); done.push('showed ' + pg + ' in the menu')
    }
  }

  // gallery layouts
  const gl = /\b(masonry|grid|single|tall|editorial)\b/.exec(t)
  if (gl && /\b(gallery|galleries)\b/.test(t)) { o('gallery').layout = gl[1]; o('galpage').layout = gl[1]; done.push('set the gallery layout to ' + gl[1]) }
  const pl = /\b(carousel|rows|banners|feature|grid)\b/.exec(t)
  if (pl && /\b(portfolio|home ?page)\b/.test(t)) { o('portfolio').layout = pl[1]; done.push('set the portfolio layout to ' + pl[1]) }

  if (done.length === 0) {
    return {
      state: cur,
      changed: false,
      reply: "I didn't catch a change in that one. I can do fonts (any name, like \"Times New Roman for the title\"), colors, buttons, photo corners, spacing, the headline, layouts, the menu and the hero photo. I also know photography: try \"I shoot weddings\" or \"make it feel luxury\".",
    }
  }
  const text = done.length === 1 ? done[0] : done.slice(0, -1).join(', ') + ' and ' + done[done.length - 1]
  return { state: n, changed: true, reply: 'Done. I ' + text + '.' + (why.length ? ' ' + why.join(' ') : '') }
}
