import LeadForm from './LeadForm'
import { FONT_OPTIONS } from '@/lib/siteTheme'

export type SpecialData = {
  brand: string
  headline: string
  sub: string
  price: string
  photos: string[]
  detailsTitle?: string
  details: string
  spots: string
  label: string
  thanks: string
  formTitle?: string
  whenWhere?: string
  terms?: string
}

export const DECORS = ['none', 'santa', 'leaves', 'flowers', 'pencils', 'hearts', 'pumpkins', 'sun'] as const
export type Decor = (typeof DECORS)[number]
export const DECOR_EMOJI: Record<Decor, string> = {
  none: '',
  santa: '🎅',
  leaves: '🍂',
  flowers: '🌸',
  pencils: '✏️',
  hearts: '❤️',
  pumpkins: '🎃',
  sun: '☀️',
}

const DECOR_SETS: Record<string, string[]> = {
  santa: ['🎅', '🎄', '⭐', '❄️', '🎁', '🦌'],
  leaves: ['🍂', '🍁', '🍃', '🍂', '🍁', '🌰'],
  flowers: ['🌸', '🌷', '🌼', '🌿', '🌺', '🦋'],
  pencils: ['✏️', '📚', '🍎', '📏', '🖍️', '🎒'],
  hearts: ['❤️', '💕', '💗', '🌹', '💘', '💖'],
  pumpkins: ['🎃', '🍂', '🕯️', '🦇', '🍁', '🎃'],
  sun: ['☀️', '🌊', '🐚', '🌴', '🏖️', '🦀'],
}
const TILE = [
  [30, 50, 34, -15], [110, 30, 26, 12], [190, 62, 38, -8], [60, 120, 28, 20],
  [150, 130, 36, -20], [220, 150, 24, 10], [20, 200, 32, 8], [100, 215, 40, -12], [190, 225, 28, 18],
]
function patternUrl(decor: string): string | null {
  const set = DECOR_SETS[decor]
  if (!set) return null
  const items = TILE.map(([x, y, sz, r], i) =>
    `<text x="${x}" y="${y}" font-size="${sz}" transform="rotate(${r} ${x} ${y})">${set[i % set.length]}</text>`).join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="260">${items}</svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

export type SpecialTheme = {
  bgImage: string
  overlay: number
  bgColor: string
  decor: Decor
  headFont: string
  titleColor: string
  titleSizePx: number
  titleAlign: 'left' | 'center'
  subFont: string
  subColor: string
  subSizePx: number
  subAlign: 'left' | 'center'
  bodyFont: string
  textColor: string
  accent: string
  btnText: string
  shape: 'square' | 'rounded' | 'pill'
}

export const DEFAULT_THEME: SpecialTheme = {
  bgImage: '',
  overlay: 45,
  bgColor: '#FAF7F2',
  decor: 'none',
  headFont: 'cormorant',
  titleColor: '#2A1F24',
  titleSizePx: 48,
  titleAlign: 'center',
  subFont: 'montserrat',
  subColor: '#2A1F24',
  subSizePx: 18,
  subAlign: 'center',
  bodyFont: 'montserrat',
  textColor: '#2A1F24',
  accent: '#A9545F',
  btnText: '#FFFFFF',
  shape: 'pill',
}

const hexOr = (v: unknown, d: string) => (/^#[0-9a-fA-F]{3,8}$/.test(String(v ?? '')) ? String(v) : d)
function pick<T extends string>(v: unknown, allowed: readonly T[], d: T): T {
  return (allowed as readonly string[]).includes(String(v)) ? (v as T) : d
}
function num(v: unknown, min: number, max: number, d: number): number {
  if (v === undefined || v === null || v === '') return d
  const n = Number(v)
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d
}
const fontOr = (v: unknown, d: string) => (typeof v === 'string' && FONT_OPTIONS[v] ? v : d)

export function readTheme(c: Record<string, unknown>): SpecialTheme {
  const D = DEFAULT_THEME
  return {
    bgImage: typeof c.bg_image === 'string' ? c.bg_image : '',
    overlay: num(c.overlay, 0, 80, D.overlay),
    bgColor: hexOr(c.bg_color, D.bgColor),
    decor: pick(c.decor, DECORS, D.decor),
    headFont: fontOr(c.head_font, D.headFont),
    titleColor: hexOr(c.title_color, D.titleColor),
    titleSizePx: num(c.title_size_px, 24, 96, D.titleSizePx),
    titleAlign: pick(c.title_align ?? c.align, ['left', 'center'] as const, D.titleAlign),
    subFont: fontOr(c.sub_font, D.subFont),
    subColor: hexOr(c.sub_color, D.subColor),
    subSizePx: num(c.sub_size_px, 12, 40, D.subSizePx),
    subAlign: pick(c.sub_align ?? c.align, ['left', 'center'] as const, D.subAlign),
    bodyFont: fontOr(c.body_font, D.bodyFont),
    textColor: hexOr(c.text_color, D.textColor),
    accent: hexOr(c.accent_color, D.accent),
    btnText: hexOr(c.btn_text, D.btnText),
    shape: pick(c.shape, ['square', 'rounded', 'pill'] as const, D.shape),
  }
}

export function themeToContent(t: SpecialTheme): Record<string, unknown> {
  return {
    bg_image: t.bgImage,
    overlay: t.overlay,
    bg_color: t.bgColor,
    decor: t.decor,
    head_font: t.headFont,
    title_color: t.titleColor,
    title_size_px: t.titleSizePx,
    title_align: t.titleAlign,
    sub_font: t.subFont,
    sub_color: t.subColor,
    sub_size_px: t.subSizePx,
    sub_align: t.subAlign,
    body_font: t.bodyFont,
    text_color: t.textColor,
    accent_color: t.accent,
    btn_text: t.btnText,
    shape: t.shape,
  }
}

export default function SpecialView({ d, theme, funnelId, preview }: { d: SpecialData; theme: SpecialTheme; funnelId: string; preview?: boolean }) {
  const t = theme
  const headFam = FONT_OPTIONS[t.headFont]?.family ?? 'serif'
  const subFam = FONT_OPTIONS[t.subFont]?.family ?? 'sans-serif'
  const bodyFam = FONT_OPTIONS[t.bodyFont]?.family ?? 'sans-serif'
  const keys = Array.from(new Set([t.headFont, t.subFont, t.bodyFont])).filter((k) => FONT_OPTIONS[k])
  const fontHref = keys.length
    ? 'https://fonts.googleapis.com/css2?' + keys.map((k) => 'family=' + FONT_OPTIONS[k].gf.split(':')[0]).join('&') + '&display=swap'
    : null
  const photos = d.photos.filter(Boolean).slice(0, 3)
  const radius = t.shape === 'square' ? '0px' : t.shape === 'rounded' ? '12px' : '999px'
  const btnStyle = { background: t.accent, color: t.btnText, borderRadius: radius }
  const heading = { fontFamily: headFam, fontWeight: 500 as const }
  const heroText = t.bgImage ? '#FFFFFF' : t.textColor
  const emoji = DECOR_EMOJI[t.decor]
  const pattern = patternUrl(t.decor)
  const titleAlign = t.titleAlign

  return (
    <div style={{ background: t.bgColor, color: t.textColor, fontFamily: bodyFam }} className="relative min-h-full overflow-hidden">
      {pattern ? <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10" style={{ backgroundImage: pattern, backgroundSize: '260px 260px', opacity: 0.32 }} /> : null}
      {fontHref ? <link rel="stylesheet" href={fontHref} /> : null}

      <div
        className="relative overflow-hidden"
        style={t.bgImage ? { backgroundImage: `url(${t.bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
      >
        {t.bgImage ? <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${t.overlay / 100})` }} /> : null}
        <div className={`relative mx-auto flex max-w-xl flex-col justify-center px-6 py-16 ${t.bgImage ? 'min-h-[520px]' : emoji ? 'min-h-[440px]' : ''}`}>
          {d.brand ? <p className="font-mono text-xs uppercase tracking-widest opacity-70" style={{ color: heroText, textAlign: titleAlign }}>{d.brand}</p> : null}
          <h1
            className="mt-4 leading-tight"
            style={{ ...heading, color: t.titleColor, fontSize: `min(${t.titleSizePx}px, 13vw)`, textAlign: titleAlign }}
          >
            {d.headline || 'Your offer title'}
          </h1>
          {d.sub ? (
            <p className="mt-5 leading-relaxed" style={{ fontFamily: subFam, color: t.subColor, fontSize: t.subSizePx, textAlign: t.subAlign }}>{d.sub}</p>
          ) : null}
          {d.price ? <p className="mt-5 text-2xl" style={{ ...heading, color: t.bgImage ? '#FFFFFF' : t.accent, textAlign: titleAlign }}>{d.price}</p> : null}
          {d.whenWhere ? <p className="mt-2 opacity-80" style={{ color: heroText, textAlign: titleAlign }}>{d.whenWhere}</p> : null}
          <div className="mt-8" style={{ display: 'flex', justifyContent: titleAlign === 'center' ? 'center' : 'flex-start' }}>
            {preview ? (
              <span className="inline-block px-8 py-4 text-base font-medium" style={btnStyle}>{d.label}</span>
            ) : (
              <a href="#claim" className="inline-block px-8 py-4 text-base font-medium transition hover:opacity-90" style={btnStyle}>{d.label}</a>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-xl px-6 pb-16">
        {photos.length > 0 && (
          <div className={`mt-10 grid gap-3 ${photos.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {photos.map((u, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={u} alt="" className={`w-full rounded-2xl object-cover ${photos.length === 1 || i === 0 ? 'aspect-[4/5] sm:aspect-[4/3]' : 'aspect-square'} ${photos.length === 3 && i === 0 ? 'col-span-2' : ''}`} />
            ))}
          </div>
        )}

        {d.details ? (
          <section className="mt-12">
            <h2 className="text-2xl" style={heading}>{d.detailsTitle || 'What is included'}</h2>
            <p className="mt-3 whitespace-pre-line leading-relaxed opacity-80">{d.details}</p>
          </section>
        ) : null}

        {d.terms ? (
          <section className="mt-12">
            <h2 className="text-2xl" style={heading}>Good to know</h2>
            <p className="mt-3 whitespace-pre-line leading-relaxed opacity-80">{d.terms}</p>
          </section>
        ) : null}

        <div id="claim">
          <section className="mt-12 rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.94)', color: '#2A1F24' }}>
            <h2 className="text-2xl" style={heading}>{d.formTitle || 'Claim your spot'}</h2>
            <div className="mt-3">
              {d.spots ? <p className="mb-4 font-medium">{d.spots}</p> : null}
              <LeadForm funnelId={funnelId} label={d.label} thanks={d.thanks} disabled={preview} accent={t.accent} btnText={t.btnText} radius={radius} />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
