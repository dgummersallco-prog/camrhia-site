import LeadForm from './LeadForm'
import Slideshow from './Slideshow'
import SlotPicker from './SlotPicker'
import { createElement } from 'react'
import Fit from './Fit'
import FreeCanvas, { type FreeBox, type FreeEdit } from './FreeCanvas'
import Editable from '@/app/components/Editable'
import { ICONS } from '@/lib/specialIcons'
import { FONT_OPTIONS } from '@/lib/siteTheme'

export type MiniInfo = { id: string; title: string; price: number; duration_min: number | null; location: string | null; tz: string; photos_included?: number | null; slots: { id: string; starts_at: string }[]; taken_slots?: { id: string; starts_at: string }[] }

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

export type TextBlock = { text: string; font: string; color: string; size: number; align: 'left' | 'center' | 'right'; place: 'title' | 'subtitle' | 'claim'; spacing: number; upper: boolean; top: number }

export type FormStyle = {
  titleOn: boolean; titleFont: string; titleSize: number; titleColor: string; titleAlign: 'left' | 'center' | 'right'
  labelFont: string; labelSize: number; labelColor: string
  boxBg: string; boxText: string; btnFont: string
  showPhone: boolean; showNote: boolean
  labName: string; labEmail: string; labPhone: string; labNote: string
  top: number; pad: number
}

export const DEFAULT_FORM: FormStyle = {
  titleOn: true, titleFont: '', titleSize: 24, titleColor: '', titleAlign: 'left',
  labelFont: '', labelSize: 14, labelColor: '',
  boxBg: '', boxText: '', btnFont: '',
  showPhone: true, showNote: true,
  labName: '', labEmail: '', labPhone: '', labNote: '',
  top: 0, pad: 24,
}

// The page background: one color, or a fade to a second color.
export function bgCss(t: { bgColor: string; bgColor2: string; bgDir: string }): string {
  if (!t.bgColor2) return t.bgColor
  if (t.bgDir === 'radial') return `radial-gradient(circle at 50% 30%, ${t.bgColor}, ${t.bgColor2})`
  const deg = t.bgDir === 'up' ? 0 : t.bgDir === 'diag' ? 160 : 180
  return `linear-gradient(${deg}deg, ${t.bgColor}, ${t.bgColor2})`
}

export type SpecialTheme = {
  bgImage: string
  overlay: number
  overlayColor: string
  bgColor: string
  bgColor2: string
  bgDir: 'down' | 'up' | 'diag' | 'radial'
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
  free: FreeBox[]
  canvasH: number
  nameTop: number
  titleTop: number
  subTop: number
  photosTop: number
  btnTop: number
  form: FormStyle
}

export const DEFAULT_THEME: SpecialTheme = {
  bgImage: '',
  overlay: 0,
  overlayColor: '#000000',
  bgColor: '#FAF7F2',
  bgColor2: '',
  bgDir: 'down',
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
  free: [],
  canvasH: 125,
  nameTop: 0,
  titleTop: 0,
  subTop: 0,
  photosTop: 0,
  btnTop: 0,
  form: DEFAULT_FORM,
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

function readForm(v: unknown): FormStyle {
  const o = (v ?? {}) as Record<string, unknown>
  const D = DEFAULT_FORM
  const fo = (x: unknown) => (typeof x === 'string' && FONT_OPTIONS[x] ? x : '')
  const hx = (x: unknown) => (/^#[0-9a-fA-F]{3,8}$/.test(String(x ?? '')) ? String(x) : '')
  const tt = (x: unknown) => String(x ?? '').slice(0, 80)
  return {
    titleOn: o.titleOn !== false,
    titleFont: fo(o.titleFont),
    titleSize: num(o.titleSize, 10, 80, D.titleSize),
    titleColor: hx(o.titleColor),
    titleAlign: pick(o.titleAlign, ['left', 'center', 'right'] as const, D.titleAlign),
    labelFont: fo(o.labelFont),
    labelSize: num(o.labelSize, 8, 30, D.labelSize),
    labelColor: hx(o.labelColor),
    boxBg: hx(o.boxBg),
    boxText: hx(o.boxText),
    btnFont: fo(o.btnFont),
    showPhone: o.showPhone !== false,
    showNote: o.showNote !== false,
    labName: tt(o.labName), labEmail: tt(o.labEmail), labPhone: tt(o.labPhone), labNote: tt(o.labNote),
    top: num(o.top, -300, 400, 0),
    pad: num(o.pad, 0, 80, D.pad),
  }
}

export function readTheme(c: Record<string, unknown>): SpecialTheme {
  const D = DEFAULT_THEME
  return {
    bgImage: typeof c.bg_image === 'string' ? c.bg_image : '',
    overlay: num(c.overlay, 0, 80, D.overlay),
    overlayColor: hexOr(c.overlay_color, D.overlayColor),
    bgColor: hexOr(c.bg_color, D.bgColor),
    bgColor2: hexOr(c.bg_color2, ''),
    bgDir: (['down', 'up', 'diag', 'radial'] as const).find((d) => d === c.bg_dir) ?? D.bgDir,
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
    blocks: readBlocks(c.blocks),
    free: readFree(c.free_boxes),
    canvasH: num(c.canvas_h, 30, 300, D.canvasH),
    nameTop: num(c.name_top, -300, 400, 0),
    titleTop: num(c.title_top, -300, 400, 0),
    subTop: num(c.sub_top, -300, 400, 0),
    photosTop: num(c.photos_top, -300, 400, 0),
    btnTop: num(c.btn_top, -300, 400, 0),
    form: readForm(c.form_style),
  }
}

function readFree(v: unknown): FreeBox[] {
  if (!Array.isArray(v)) return []
  return v.slice(0, 60).map((x) => {
    const o = (x ?? {}) as Record<string, unknown>
    return {
      kind: pick(o.kind, ['text', 'icon', 'image'] as const, 'text'),
      icon: typeof o.icon === 'string' && ICONS[o.icon] ? o.icon : 'heart',
      src: typeof o.src === 'string' && /^https?:\/\//.test(o.src) ? o.src : '',
      text: String(o.text ?? ''),
      font: fontOr(o.font, 'montserrat'),
      color: hexOr(o.color, '#2A1F24'),
      size: num(o.size, 6, 300, 18),
      align: pick(o.align, ['left', 'center', 'right'] as const, 'center'),
      spacing: num(o.spacing, 0, 60, 0),
      upper: o.upper === true,
      x: num(o.x, -20, 100, 10),
      y: num(o.y, -20, 900, 10),
      w: num(o.w, 5, 100, 80),
      rot: num(o.rot, -90, 90, 0),
    }
  })
}

function readBlocks(v: unknown): TextBlock[] {
  if (!Array.isArray(v)) return []
  return v.slice(0, 40).map((x) => {
    const o = (x ?? {}) as Record<string, unknown>
    return {
      text: String(o.text ?? ''),
      font: fontOr(o.font, 'montserrat'),
      color: hexOr(o.color, '#2A1F24'),
      size: num(o.size, 8, 160, 18),
      align: pick(o.align, ['left', 'center', 'right'] as const, 'center'),
      spacing: num(o.spacing, 0, 60, 0),
      upper: o.upper === true,
      top: num(o.top, -300, 400, 0),
      place: pick(o.place, ['title', 'subtitle', 'claim'] as const, 'claim'),
    }
  })
}

export function themeToContent(t: SpecialTheme): Record<string, unknown> {
  return {
    bg_image: t.bgImage,
    overlay: t.overlay,
    overlay_color: t.overlayColor,
    bg_color: t.bgColor,
    bg_color2: t.bgColor2,
    bg_dir: t.bgDir,
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
    free_boxes: t.free,
    canvas_h: t.canvasH,
    name_top: t.nameTop,
    title_top: t.titleTop,
    sub_top: t.subTop,
    photos_top: t.photosTop,
    btn_top: t.btnTop,
    form_style: t.form,
  }
}

export default function SpecialView({ d, theme, funnelId, preview, edit }: { d: SpecialData; theme: SpecialTheme; funnelId: string; preview?: boolean; edit?: FreeEdit }) {
  const t = theme
  const headFam = FONT_OPTIONS[t.headFont]?.family ?? 'serif'
  const subFam = FONT_OPTIONS[t.subFont]?.family ?? 'sans-serif'
  const bodyFam = FONT_OPTIONS[t.bodyFont]?.family ?? 'sans-serif'
  const keys = Array.from(new Set([t.headFont, t.subFont, t.bodyFont, t.nameFont, t.form.titleFont, t.form.labelFont, t.form.btnFont, ...t.blocks.map((b) => b.font), ...t.free.map((b) => b.font)])).filter((k) => FONT_OPTIONS[k])
  const fontHref = keys.length
    ? 'https://fonts.googleapis.com/css2?' + keys.map((k) => 'family=' + FONT_OPTIONS[k].gf.split(':')[0]).join('&') + '&display=swap'
    : null
  const photos = d.photos.filter(Boolean).slice(0, 8)
  const radius = t.shape === 'square' ? '0px' : t.shape === 'rounded' ? '12px' : '999px'
  const btnStyle = { background: t.accent, color: t.btnText, borderRadius: radius, fontSize: t.btnSizePx, ...(t.form.btnFont ? { fontFamily: FONT_OPTIONS[t.form.btnFont]?.family } : {}) }
  const heading = { fontFamily: headFam, fontWeight: 500 as const }
  const heroText = t.bgImage ? '#FFFFFF' : t.textColor
  const emoji = DECOR_EMOJI[t.decor]
  const pattern = patternUrl(t.decor)
  const titleAlign = 'center' as const
  const m = d.mini
  const fmtSlot = (iso: string, tz: string) => new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: tz }).format(new Date(iso))
  const miniBlock = !d.miniId ? null : !m ? (
    <p className="font-medium">These sessions are no longer available.</p>
  ) : m.slots.length === 0 && !(m.taken_slots && m.taken_slots.length) ? (
    <p className="font-medium">All spots are booked.</p>
  ) : (
    <SlotPicker mini={m} preview={preview} label={d.label} btnStyle={btnStyle} />
  )
  const ed = (k: string) => (preview ? { 'data-edit': k } : {})
  const live = preview && edit?.onText ? edit.onText : null
  // Called as a plain function (not <Tx/>) so typing never remounts the text.
  const tx = (o: { k: string; tag: 'p' | 'h1'; value: string; ph: string; fallback?: string; className?: string; style?: React.CSSProperties; single?: boolean }) =>
    live
      ? <Editable key={o.k} tag={o.tag} attrs={{ 'data-edit': o.k }} value={o.value} placeholder={o.ph} single={o.single} className={o.className} style={{ ...o.style, whiteSpace: 'pre-wrap' }} onChange={(v) => live(o.k, v)} />
      : createElement(o.tag, { key: o.k, ...ed(o.k), className: o.className, style: o.style }, o.value || o.fallback || '')
  const renderBlocks = (place: 'title' | 'subtitle' | 'claim') =>
    t.blocks.map((b, i) => ({ b, i })).filter(({ b }) => b.place === place && (live || b.text.trim())).map(({ b, i }) =>
      tx({ k: 'line-' + i, tag: 'p', value: b.text, ph: 'New line', className: 'mt-5 whitespace-pre-line leading-snug', style: { fontFamily: FONT_OPTIONS[b.font]?.family ?? 'sans-serif', color: b.color, fontSize: b.size, textAlign: b.align, letterSpacing: b.spacing ? b.spacing / 100 + 'em' : undefined, textTransform: b.upper ? 'uppercase' : undefined, marginTop: 20 + b.top } })
    )

  return (
    <div {...ed('background')} style={{ background: bgCss(t), color: t.textColor, fontFamily: bodyFam }} className="relative min-h-full overflow-hidden">
      {pattern ? <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ backgroundImage: pattern, backgroundSize: '260px 260px', opacity: 0.18 }} /> : null}
      {fontHref ? <link rel="stylesheet" href={fontHref} /> : null}

      {t.bgImage ? <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ backgroundImage: `url(${t.bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }} /> : null}
      {t.bgImage ? <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: `color-mix(in srgb, ${t.overlayColor} ${t.overlay}%, transparent)` }} /> : null}

      <Fit>
      <div className="relative">
      {t.free.length > 0 ? <FreeCanvas boxes={t.free} edit={preview ? edit : undefined} /> : null}

      <div className="relative overflow-hidden">
        <div className={`relative mx-auto flex flex-col justify-center px-6 py-16 ${t.bgImage ? 'min-h-[520px]' : emoji ? 'min-h-[440px]' : ''}`}>
          {d.brand || live ? tx({ k: 'brand', tag: 'p', value: d.brand, ph: 'Studio name', className: 'uppercase', single: true, style: { fontFamily: FONT_OPTIONS[t.nameFont]?.family ?? 'sans-serif', letterSpacing: '0.2em', color: t.nameColor || heroText, fontSize: t.nameSizePx, textAlign: titleAlign, marginTop: t.nameTop || undefined } }) : null}
          {tx({ k: 'title', tag: 'h1', value: d.headline, ph: 'Your offer title', fallback: t.free.length ? '' : 'Your offer title', single: true, className: 'mt-4 leading-tight', style: { ...heading, color: t.titleColor, fontSize: t.titleSizePx, textAlign: titleAlign, marginTop: 16 + t.titleTop } })}
          {renderBlocks('title')}
          {d.sub || live ? tx({ k: 'sub', tag: 'p', value: d.sub, ph: 'Write your paragraph', className: 'mt-5 whitespace-pre-line leading-relaxed', style: { fontFamily: subFam, color: t.subColor, fontSize: t.subSizePx, textAlign: 'center', marginTop: 20 + t.subTop } }) : null}
          {renderBlocks('subtitle')}
          {d.price ? <p className="mt-5 text-2xl" style={{ ...heading, color: t.bgImage ? '#FFFFFF' : t.accent, textAlign: titleAlign }}>{d.price}</p> : null}
          {d.whenWhere ? <p className="mt-2 opacity-80" style={{ color: heroText, textAlign: titleAlign }}>{d.whenWhere}</p> : null}
          {photos.length > 0 ? (
            <div {...ed('photos')} style={{ width: '100%', maxWidth: 300, margin: `${32 + t.photosTop}px auto 0` }}>
              <Slideshow photos={photos} />
            </div>
          ) : null}
        </div>
      </div>

      <div className="relative px-6 pb-16">
        {d.details ? (
          <section {...ed('summary')} className="mt-12">
            <h2 className="text-2xl" style={heading}>{d.detailsTitle || 'What is included'}</h2>
            <p className="mt-3 whitespace-pre-line leading-relaxed opacity-80">{d.details}</p>
          </section>
        ) : null}

        {d.terms ? (
          <section {...ed('summary')} className="mt-12">
            <h2 className="text-2xl" style={heading}>{d.termsTitle || 'Good to know'}</h2>
            <p className="mt-3 whitespace-pre-line leading-relaxed opacity-80">{d.terms}</p>
          </section>
        ) : null}

        {renderBlocks('claim')}

        <div id="claim">
          <section {...ed('claim')} style={{ background: t.cardBg, color: t.cardText, borderRadius: t.cardRadius, marginTop: 48 + t.form.top, padding: t.form.pad }}>
            {t.form.titleOn ? <h2 style={{ ...heading, fontSize: t.form.titleSize, textAlign: t.form.titleAlign, ...(t.form.titleFont ? { fontFamily: FONT_OPTIONS[t.form.titleFont]?.family } : {}), ...(t.form.titleColor ? { color: t.form.titleColor } : {}) }}>{d.formTitle || 'Claim your spot'}</h2> : null}
            <div className="mt-3">
              {d.spots ? <p className="mb-4 font-medium">{d.spots}</p> : null}
              {d.miniId ? miniBlock : <LeadForm funnelId={funnelId} label={d.label} thanks={d.thanks} disabled={preview} accent={t.accent} btnText={t.btnText} radius={radius} textColor={t.form.labelColor || t.cardText} labels={{ name: t.form.labName, email: t.form.labEmail, phone: t.form.labPhone, note: t.form.labNote }} showPhone={t.form.showPhone} showNote={t.form.showNote} labelStyle={{ fontSize: t.form.labelSize, ...(t.form.labelFont ? { fontFamily: FONT_OPTIONS[t.form.labelFont]?.family } : {}) }} boxStyle={{ ...(t.form.boxBg ? { background: t.form.boxBg } : {}), ...(t.form.boxText ? { color: t.form.boxText } : {}) }} btnExtra={{ fontSize: t.btnSizePx, ...(t.form.btnFont ? { fontFamily: FONT_OPTIONS[t.form.btnFont]?.family } : {}) }} />}
            </div>
          </section>
        </div>
      </div>
      </div>
      </Fit>
    </div>
  )
}
