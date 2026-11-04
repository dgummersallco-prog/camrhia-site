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

export type SpecialTheme = {
  bgImage: string
  overlay: number
  bgColor: string
  textColor: string
  accent: string
  btnText: string
  headFont: string
  bodyFont: string
  align: 'left' | 'center'
  titleSize: 'small' | 'medium' | 'large'
  shape: 'square' | 'rounded' | 'pill'
}

export const DEFAULT_THEME: SpecialTheme = {
  bgImage: '',
  overlay: 45,
  bgColor: '#FAF7F2',
  textColor: '#2A1F24',
  accent: '#A9545F',
  btnText: '#FFFFFF',
  headFont: 'cormorant',
  bodyFont: 'montserrat',
  align: 'center',
  titleSize: 'medium',
  shape: 'pill',
}

const hexOr = (v: unknown, d: string) => (/^#[0-9a-fA-F]{3,8}$/.test(String(v ?? '')) ? String(v) : d)
function pick<T extends string>(v: unknown, allowed: readonly T[], d: T): T {
  return (allowed as readonly string[]).includes(String(v)) ? (v as T) : d
}

export function readTheme(c: Record<string, unknown>): SpecialTheme {
  const o = Number(c.overlay)
  return {
    bgImage: typeof c.bg_image === 'string' ? c.bg_image : '',
    overlay: c.overlay !== undefined && Number.isFinite(o) ? Math.min(80, Math.max(0, o)) : DEFAULT_THEME.overlay,
    bgColor: hexOr(c.bg_color, DEFAULT_THEME.bgColor),
    textColor: hexOr(c.text_color, DEFAULT_THEME.textColor),
    accent: hexOr(c.accent_color, DEFAULT_THEME.accent),
    btnText: hexOr(c.btn_text, DEFAULT_THEME.btnText),
    headFont: typeof c.head_font === 'string' && FONT_OPTIONS[c.head_font] ? c.head_font : DEFAULT_THEME.headFont,
    bodyFont: typeof c.body_font === 'string' && FONT_OPTIONS[c.body_font] ? c.body_font : DEFAULT_THEME.bodyFont,
    align: pick(c.align, ['left', 'center'] as const, DEFAULT_THEME.align),
    titleSize: pick(c.title_size, ['small', 'medium', 'large'] as const, DEFAULT_THEME.titleSize),
    shape: pick(c.shape, ['square', 'rounded', 'pill'] as const, DEFAULT_THEME.shape),
  }
}

export function themeToContent(t: SpecialTheme): Record<string, unknown> {
  return {
    bg_image: t.bgImage,
    overlay: t.overlay,
    bg_color: t.bgColor,
    text_color: t.textColor,
    accent_color: t.accent,
    btn_text: t.btnText,
    head_font: t.headFont,
    body_font: t.bodyFont,
    align: t.align,
    title_size: t.titleSize,
    shape: t.shape,
  }
}

export default function SpecialView({ d, theme, funnelId, preview }: { d: SpecialData; theme: SpecialTheme; funnelId: string; preview?: boolean }) {
  const t = theme
  const headFam = FONT_OPTIONS[t.headFont]?.family ?? 'serif'
  const bodyFam = FONT_OPTIONS[t.bodyFont]?.family ?? 'sans-serif'
  const keys = Array.from(new Set([t.headFont, t.bodyFont])).filter((k) => FONT_OPTIONS[k])
  const fontHref = keys.length
    ? 'https://fonts.googleapis.com/css2?' + keys.map((k) => 'family=' + FONT_OPTIONS[k].gf.split(':')[0]).join('&') + '&display=swap'
    : null
  const photos = d.photos.filter(Boolean).slice(0, 3)
  const radius = t.shape === 'square' ? '0px' : t.shape === 'rounded' ? '12px' : '999px'
  const sizeCls = { small: 'text-3xl', medium: 'text-4xl', large: 'text-5xl' }[t.titleSize]
  const center = t.align === 'center'
  const heroColor = t.bgImage ? '#FFFFFF' : t.textColor
  const btnStyle = { background: t.accent, color: t.btnText, borderRadius: radius }
  const heading = { fontFamily: headFam, fontWeight: 500 as const }

  return (
    <div style={{ background: t.bgColor, color: t.textColor, fontFamily: bodyFam }} className="min-h-full">
      {fontHref ? <link rel="stylesheet" href={fontHref} /> : null}

      <div
        className="relative"
        style={t.bgImage ? { backgroundImage: `url(${t.bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
      >
        {t.bgImage ? <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${t.overlay / 100})` }} /> : null}
        <div
          className={`relative mx-auto flex max-w-xl flex-col justify-center px-6 py-16 ${t.bgImage ? 'min-h-[520px]' : ''} ${center ? 'items-center text-center' : 'items-start text-left'}`}
          style={{ color: heroColor }}
        >
          {d.brand ? <p className="font-mono text-xs uppercase tracking-widest opacity-70">{d.brand}</p> : null}
          <h1 className={`mt-4 leading-tight ${sizeCls}`} style={heading}>{d.headline || 'Your offer title'}</h1>
          {d.sub ? <p className="mt-5 text-lg leading-relaxed opacity-85">{d.sub}</p> : null}
          {d.price ? <p className="mt-5 text-2xl" style={{ ...heading, color: t.bgImage ? '#FFFFFF' : t.accent }}>{d.price}</p> : null}
          {d.whenWhere ? <p className="mt-2 opacity-80">{d.whenWhere}</p> : null}
          <div className="mt-8">
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
