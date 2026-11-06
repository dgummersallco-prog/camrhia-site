import LeadForm from './LeadForm'
import Slideshow from './Slideshow'
import { FONT_OPTIONS } from '@/lib/siteTheme'

export type MiniInfo = { id: string; title: string; price: number; duration_min: number | null; location: string | null; tz: string; slots: { id: string; starts_at: string }[] }

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
  termsTitle?: string
  miniId?: string
  mini?: MiniInfo | null
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

export type TextBlock = { text: string; font: string; color: string; size: number; align: 'left' | 'center'; place: 'title' | 'subtitle' | 'claim' }

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
  nameFont: string
  nameColor: string
  nameSizePx: number
  btnSizePx: number
  cardBg: string
  cardText: string
  cardRadius: number
  blocks: TextBlock[]
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
  nameFont: 'montserrat',
  nameColor: '',
  nameSizePx: 13,
  btnSizePx: 16,
  cardBg: '#FFFFFF',
  cardText: '#2A1F24',
  cardRadius: 16,
  blocks: [],
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
    titleSizePx: num(c.title_size_px, 12, 160, D.titleSizePx),
    titleAlign: pick(c.title_align ?? c.align, ['left', 'center'] as const, D.titleAlign),
    subFont: fontOr(c.sub_font, D.subFont),
    subColor: hexOr(c.sub_color, D.subColor),
    subSizePx: num(c.sub_size_px, 8, 80, D.subSizePx),
    subAlign: pick(c.sub_align ?? c.align, ['left', 'center'] as const, D.subAlign),
    bodyFont: fontOr(c.body_font, D.bodyFont),
    textColor: hexOr(c.text_color, D.textColor),
    accent: hexOr(c.accent_color, D.accent),
    btnText: hexOr(c.btn_text, D.btnText),
    shape: pick(c.shape, ['square', 'rounded', 'pill'] as const, D.shape),
    nameFont: fontOr(c.name_font, D.nameFont),
    nameColor: typeof c.name_color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(c.name_color) ? c.name_color : '',
    nameSizePx: num(c.name_size_px, 8, 60, D.nameSizePx),
    btnSizePx: num(c.btn_size_px, 10, 40, D.btnSizePx),
    cardBg: hexOr(c.card_bg, D.cardBg),
    cardText: hexOr(c.card_text, D.cardText),
    cardRadius: num(c.card_radius, 0, 60, D.cardRadius),
    blocks: [],
  }
}

function readBlocks(v: unknown): TextBlock[] {
  if (!Array.isArray(v)) return []
  return v.slice(0, 10).map((x) => {
    const o = (x ?? {}) as Record<string, unknown>
    return {
      text: String(o.text ?? ''),
      font: fontOr(o.font, 'montserrat'),
      color: hexOr(o.color, '#2A1F24'),
      size: num(o.size, 8, 160, 18),
      align: pick(o.align, ['left', 'center'] as const, 'center'),
      place: pick(o.place, ['title', 'subtitle', 'claim'] as const, 'claim'),
    }
  })
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
    name_font: t.nameFont,
    name_color: t.nameColor,
    name_size_px: t.nameSizePx,
    btn_size_px: t.btnSizePx,
    card_bg: t.cardBg,
    card_text: t.cardText,
    card_radius: t.cardRadius,
    blocks: t.blocks,
  }
}

export default function SpecialView({ d, theme, funnelId, preview }: { d: SpecialData; theme: SpecialTheme; funnelId: string; preview?: boolean }) {
  const t = theme
  const headFam = FONT_OPTIONS[t.headFont]?.family ?? 'serif'
  const subFam = FONT_OPTIONS[t.subFont]?.family ?? 'sans-serif'
  const bodyFam = FONT_OPTIONS[t.bodyFont]?.family ?? 'sans-serif'
  const keys = Array.from(new Set([t.headFont, t.subFont, t.bodyFont, t.nameFont, ...t.blocks.map((b) => b.font)])).filter((k) => FONT_OPTIONS[k])
  const fontHref = keys.length
    ? 'https://fonts.googleapis.com/css2?' + keys.map((k) => 'family=' + FONT_OPTIONS[k].gf.split(':')[0]).join('&') + '&display=swap'
    : null
  const photos = d.photos.filter(Boolean).slice(0, 8)
  const radius = t.shape === 'square' ? '0px' : t.shape === 'rounded' ? '12px' : '999px'
  const btnStyle = { background: t.accent, color: t.btnText, borderRadius: radius, fontSize: t.btnSizePx }
  const heading = { fontFamily: headFam, fontWeight: 500 as const }
  const heroText = t.bgImage ? '#FFFFFF' : t.textColor
  const emoji = DECOR_EMOJI[t.decor]
  const pattern = patternUrl(t.decor)
  const titleAlign = 'center' as const
  const m = d.mini
  const fmtSlot = (iso: string, tz: string) => new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: tz }).format(new Date(iso))
  const miniBlock = !d.miniId ? null : !m ? (
    <p className="font-medium">These sessions are no longer available.</p>
  ) : m.slots.length === 0 ? (
    <p className="font-medium">All spots are booked.</p>
  ) : (
    <div>
      <p className="mb-3 text-sm opacity-80">{m.slots.length} {m.slots.length === 1 ? 'time' : 'times'} left</p>
      <div className="flex flex-wrap gap-2">
        {m.slots.slice(0, 8).map((sl) => (
          <span key={sl.id} className="rounded-full border border-current px-3 py-1 text-sm opacity-80">{fmtSlot(sl.starts_at, m.tz)}</span>
        ))}
      </div>
      <div className="mt-5">
        {preview ? (
          <span className="block px-8 py-4 text-center font-medium" style={btnStyle}>{d.label}</span>
        ) : (
          <a href={`/mini/${m.id}`} className="block px-8 py-4 text-center font-medium transition hover:opacity-90" style={btnStyle}>{d.label}</a>
        )}
      </div>
    </div>
  )
  const renderBlocks = (place: 'title' | 'subtitle' | 'claim') =>
    t.blocks.filter((b) => b.place === place && b.text.trim()).map((b, i) => (
      <p key={i} className="mt-5 whitespace-pre-line leading-snug" style={{ fontFamily: FONT_OPTIONS[b.font]?.family ?? 'sans-serif', color: b.color, fontSize: b.size, textAlign: 'center' }}>{b.text}</p>
    ))

  return (
    <div style={{ background: t.bgColor, color: t.textColor, fontFamily: bodyFam }} className="relative min-h-full overflow-hidden">
      {pattern ? <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ backgroundImage: pattern, backgroundSize: '260px 260px', opacity: 0.18 }} /> : null}
      {fontHref ? <link rel="stylesheet" href={fontHref} /> : null}

      <div
        className="relative overflow-hidden"
        style={t.bgImage ? { backgroundImage: `url(${t.bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
      >
        {t.bgImage ? <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${t.overlay / 100})` }} /> : null}
        <div className={`relative mx-auto flex max-w-xl flex-col justify-center px-6 py-16 ${t.bgImage ? 'min-h-[520px]' : emoji ? 'min-h-[440px]' : ''}`}>
          {d.brand ? <p className="uppercase" style={{ fontFamily: FONT_OPTIONS[t.nameFont]?.family ?? 'sans-serif', letterSpacing: '0.2em', color: t.nameColor || heroText, fontSize: t.nameSizePx, textAlign: titleAlign }}>{d.brand}</p> : null}
          <h1
            className="mt-4 leading-tight"
            style={{ ...heading, color: t.titleColor, fontSize: t.titleSizePx, textAlign: titleAlign }}
          >
            {d.headline || 'Your offer title'}
          </h1>
          {renderBlocks('title')}
          {d.sub ? (
            <p className="mt-5 leading-relaxed" style={{ fontFamily: subFam, color: t.subColor, fontSize: t.subSizePx, textAlign: 'center' }}>{d.sub}</p>
          ) : null}
          {renderBlocks('subtitle')}
          {d.price ? <p className="mt-5 text-2xl" style={{ ...heading, color: t.bgImage ? '#FFFFFF' : t.accent, textAlign: titleAlign }}>{d.price}</p> : null}
          {d.whenWhere ? <p className="mt-2 opacity-80" style={{ color: heroText, textAlign: titleAlign }}>{d.whenWhere}</p> : null}
          {photos.length > 0 ? (
            <div style={{ width: '100%', maxWidth: 300, margin: '32px auto 0' }}>
              <Slideshow photos={photos} />
            </div>
          ) : null}
          <div className="mt-8" style={{ display: 'flex', justifyContent: 'center' }}>
            {preview ? (
              <span className="inline-block px-8 py-4 text-base font-medium" style={btnStyle}>{d.label}</span>
            ) : (
              <a href="#claim" className="inline-block px-8 py-4 text-base font-medium transition hover:opacity-90" style={btnStyle}>{d.label}</a>
            )}
          </div>
        </div>
      </div>

      <div className="relative mx-auto max-w-xl px-6 pb-16">
        {d.details ? (
          <section className="mt-12">
            <h2 className="text-2xl" style={heading}>{d.detailsTitle || 'What is included'}</h2>
            <p className="mt-3 whitespace-pre-line leading-relaxed opacity-80">{d.details}</p>
          </section>
        ) : null}

        {d.terms ? (
          <section className="mt-12">
            <h2 className="text-2xl" style={heading}>{d.termsTitle || 'Good to know'}</h2>
            <p className="mt-3 whitespace-pre-line leading-relaxed opacity-80">{d.terms}</p>
          </section>
        ) : null}

        {renderBlocks('claim')}

        <div id="claim">
          <section className="mt-12 p-6" style={{ background: t.cardBg, color: t.cardText, borderRadius: t.cardRadius }}>
            <h2 className="text-2xl" style={heading}>{d.formTitle || 'Claim your spot'}</h2>
            <div className="mt-3">
              {d.spots ? <p className="mb-4 font-medium">{d.spots}</p> : null}
              {d.miniId ? miniBlock : <LeadForm funnelId={funnelId} label={d.label} thanks={d.thanks} disabled={preview} accent={t.accent} btnText={t.btnText} radius={radius} textColor={t.cardText} />}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
