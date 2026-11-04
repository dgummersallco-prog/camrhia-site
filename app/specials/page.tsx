'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { HexColorPicker } from 'react-colorful'
import { supabase } from '@/lib/supabase'
import { makeVersions } from '@/lib/galleryImages'
import { FONT_OPTIONS } from '@/lib/siteTheme'
import { DashboardHeader } from '@/app/components/DashboardHeader'
import SpecialView, { DEFAULT_THEME, readTheme, themeToContent, type SpecialData, type SpecialTheme } from '@/app/go/[slug]/SpecialView'

const STORAGE_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}/storage/v1/object/public/portfolio/`
const ALL_FONTS_HREF =
  'https://fonts.googleapis.com/css2?' +
  Object.values(FONT_OPTIONS).map((f) => 'family=' + f.gf.split(':')[0]).join('&') +
  '&display=swap'

type Funnel = {
  id: string
  slug: string
  name: string
  content: Record<string, unknown> | null
  cta_label: string
  published: boolean
}
type Lead = { id: string; funnel_id: string; name: string; email: string; phone: string | null; note: string | null; created_at: string }
type Form = { id: string; slug: string; published: boolean; cta_label: string; text: Record<string, string>; photos: string[]; theme: SpecialTheme }

const FIELDS: { key: string; label: string; hint?: string; area?: boolean }[] = [
  { key: 'hero_headline', label: 'Offer title', hint: 'Holiday mini sessions' },
  { key: 'brand_name', label: 'Your name or studio', hint: 'Shown at the top of the page' },
  { key: 'hero_sub', label: 'One line about the offer', hint: 'Family portraits by the lake, 20 minutes each', area: true },
  { key: 'price_line', label: 'Price line', hint: '$250 · 20 minutes · 6 spots' },
  { key: 'when_where', label: 'When and where', hint: 'Saturday, December 6 · Ross Park, Pocatello' },
  { key: 'details_body', label: 'What is included', hint: 'One line per item', area: true },
  { key: 'spots_note', label: 'Limited spots note (optional)', hint: 'Only 6 spots available' },
  { key: 'terms', label: 'Good to know (optional)', hint: 'Bookings are final and non-refundable', area: true },
  { key: 'thanks_message', label: 'Message after they sign up', hint: 'Thank you! I will email you within a day.' },
]

const SWATCHES = ['#FAF7F2', '#FFFFFF', '#2A1F24', '#111111', '#A9545F', '#B08D57', '#1F3A2E', '#2F6DB5', '#F3E3CF', '#FBEFF1']

type Example = { name: string; text: Record<string, string>; theme: Partial<SpecialTheme> }
const EXAMPLES: Example[] = [
  {
    name: 'Holiday',
    theme: { bgColor: '#1F3A2E', textColor: '#F6EFE2', accent: '#C8A24A', btnText: '#1F3A2E', headFont: 'playfair', bodyFont: 'lora', align: 'center', titleSize: 'large', shape: 'pill' },
    text: {
      hero_headline: 'Holiday Mini Sessions',
      brand_name: 'Your Studio',
      hero_sub: 'Twenty minutes by the tree, and your holiday cards are done.',
      price_line: '$225 · 20 minutes · 8 edited photos',
      when_where: 'Saturday, [date] · [your location]',
      details_body: '20 minute session for your family\n8 edited photos in an online gallery\nA cozy holiday set with lights\nExtra photos and prints available',
      spots_note: 'Only 6 spots available',
      terms: 'Bookings are final and non-refundable, but you can pass your spot to a friend.',
      thanks_message: 'Thank you! I will email you within a day to lock in your time.',
    },
  },
  {
    name: 'Fall family',
    theme: { bgColor: '#F3E3CF', textColor: '#4A2C17', accent: '#B5532A', btnText: '#FFFFFF', headFont: 'cormorant', bodyFont: 'montserrat', align: 'left', titleSize: 'large', shape: 'rounded' },
    text: {
      hero_headline: 'Fall Family Minis',
      brand_name: 'Your Studio',
      hero_sub: 'Golden light, a short session, and no stress.',
      price_line: '$195 · 15 minutes · 8 edited photos',
      when_where: 'Two Saturdays in October · [your location]',
      details_body: '15 minute outdoor session\n8 edited photos in an online gallery\nKids and pets welcome\nPrints and albums available',
      spots_note: 'Only 8 spots per day',
      terms: 'Rain date included. Bookings are final and non-refundable.',
      thanks_message: 'You are on the list! Watch your email for next steps.',
    },
  },
  {
    name: 'Spring blossom',
    theme: { bgColor: '#FBEFF1', textColor: '#4B2A33', accent: '#D77A8F', btnText: '#FFFFFF', headFont: 'playfair', bodyFont: 'lora', align: 'center', titleSize: 'medium', shape: 'pill' },
    text: {
      hero_headline: 'Spring Blossom Minis',
      brand_name: 'Your Studio',
      hero_sub: 'Soft light, fresh blooms, and photos you will want on your wall.',
      price_line: '$175 · 15 minutes · 6 edited photos',
      when_where: '[date] · [garden or park name]',
      details_body: '15 minute session among the blossoms\n6 edited photos in an online gallery\nGreat for families, couples and moms\nExtra photos available',
      spots_note: 'Blossoms are short lived, so spots are limited',
      terms: 'Bookings are final and non-refundable. Weather dates are announced by email.',
      thanks_message: 'Thank you! I will be in touch soon with your time.',
    },
  },
  {
    name: 'Back to school',
    theme: { bgColor: '#F2F6FA', textColor: '#17324D', accent: '#2F6DB5', btnText: '#FFFFFF', headFont: 'josefin', bodyFont: 'worksans', align: 'left', titleSize: 'medium', shape: 'square' },
    text: {
      hero_headline: 'Back-to-School Portraits',
      brand_name: 'Your Studio',
      hero_sub: 'A quick portrait to remember this grade.',
      price_line: '$85 · 10 minutes · 5 edited photos',
      when_where: '[date] · [your location]',
      details_body: '10 minute portrait session per child\n5 edited photos in an online gallery\nSiblings can share one slot\nPrints ready for grandparents',
      spots_note: 'Limited time slots',
      terms: 'Bookings are final and non-refundable.',
      thanks_message: 'Thank you! I will email you to confirm your time.',
    },
  },
  {
    name: 'Couples',
    theme: { bgColor: '#2A1F24', textColor: '#F6F1EA', accent: '#A9545F', btnText: '#FFFFFF', headFont: 'cormorant', bodyFont: 'montserrat', align: 'center', titleSize: 'large', shape: 'pill' },
    text: {
      hero_headline: 'Valentine Couples Minis',
      brand_name: 'Your Studio',
      hero_sub: 'A short, relaxed session just for the two of you.',
      price_line: '$150 · 20 minutes · 8 edited photos',
      when_where: '[date] · [your location]',
      details_body: '20 minute couples session\n8 edited photos in an online gallery\nPosing help, so no experience needed\nPrints available',
      spots_note: 'Only 5 spots',
      terms: 'Bookings are final and non-refundable, but can be gifted.',
      thanks_message: 'Thank you! I will email you shortly to pick your time.',
    },
  },
  {
    name: 'Branding',
    theme: { bgColor: '#FFFFFF', textColor: '#111111', accent: '#111111', btnText: '#FFFFFF', headFont: 'josefin', bodyFont: 'worksans', align: 'left', titleSize: 'large', shape: 'square' },
    text: {
      hero_headline: 'Branding Mini Sessions',
      brand_name: 'Your Studio',
      hero_sub: 'Fresh photos for your website and social media, in one short visit.',
      price_line: '$250 · 30 minutes · 10 edited photos',
      when_where: '[date] · [your location]',
      details_body: '30 minute session with two outfit changes\n10 edited photos for web and social\nPlanning call before the session\nFull usage for your business',
      spots_note: 'Only 4 spots this month',
      terms: 'Bookings are final and non-refundable.',
      thanks_message: 'Thank you! I will email you to plan your session.',
    },
  },
]

const inputCls = 'mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 text-ink outline-none focus:border-twilight'
const rand = () => Math.random().toString(36).slice(2, 8)
const makeSlug = () => `special-${rand()}`

function toData(text: Record<string, string>, photos: string[], label: string): SpecialData {
  return {
    brand: text.brand_name ?? '',
    headline: text.hero_headline ?? '',
    sub: text.hero_sub ?? '',
    price: text.price_line ?? '',
    photos,
    details: text.details_body ?? '',
    spots: text.spots_note ?? '',
    label: label || 'Claim my spot',
    thanks: text.thanks_message ?? '',
    whenWhere: text.when_where ?? '',
    terms: text.terms ?? '',
  }
}

function toForm(f: Funnel | null): Form {
  const c = (f?.content ?? {}) as Record<string, unknown>
  const text: Record<string, string> = {}
  FIELDS.forEach((x) => { text[x.key] = String(c[x.key] ?? '') })
  return {
    id: f?.id ?? '',
    slug: f?.slug ?? makeSlug(),
    published: f?.published ?? false,
    cta_label: f?.cta_label ?? 'Claim my spot',
    text,
    photos: Array.isArray(c.photos) ? (c.photos as string[]) : [],
    theme: readTheme(c),
  }
}

function StepCard({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-card p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-twilight text-sm font-medium text-white">{n}</span>
        <h2 className="font-fraunces text-xl font-semibold text-ink">{title}</h2>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function Group({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 mt-7 border-t border-line pt-5 text-xs font-semibold uppercase tracking-widest text-ink-soft first:mt-0 first:border-0 first:pt-0">{children}</p>
}

function Chips<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="mt-1 flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o.id} type="button" onClick={() => onChange(o.id)} className={`rounded-full border px-4 py-1.5 text-sm transition ${value === o.id ? 'border-twilight bg-twilight/10 text-twilight' : 'border-line text-ink-soft hover:border-twilight'}`}>{o.label}</button>
      ))}
    </div>
  )
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const [txt, setTxt] = useState(value)
  useEffect(() => setTxt(value), [value])
  return (
    <div>
      <span className="text-sm font-medium text-ink">{label}</span>
      <button type="button" onClick={() => setOpen(!open)} className="mt-1 flex w-full items-center gap-2 rounded-xl border border-line bg-paper px-3 py-2">
        <span className="h-5 w-5 rounded border border-line" style={{ background: value }} />
        <span className="font-mono text-xs uppercase text-ink">{value}</span>
      </button>
      {open && (
        <div className="mt-2 rounded-xl border border-line bg-card p-3">
          <div className="mb-3 flex flex-wrap gap-2">
            {SWATCHES.map((h) => (
              <button key={h} type="button" onClick={() => onChange(h)} className="h-7 w-7 rounded-full border border-line" style={{ background: h, boxShadow: value.toLowerCase() === h.toLowerCase() ? '0 0 0 2px #fff, 0 0 0 4px #2A1F24' : undefined }} />
            ))}
          </div>
          <HexColorPicker color={value} onChange={onChange} style={{ width: '100%', height: 160 }} />
          <input
            value={txt}
            maxLength={7}
            onChange={(e) => { setTxt(e.target.value); if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) onChange(e.target.value) }}
            className={inputCls + ' mt-3 font-mono uppercase'}
          />
          <button type="button" onClick={() => setOpen(false)} className="mt-2 text-xs font-medium text-twilight">Done</button>
        </div>
      )}
    </div>
  )
}

function FontPicker({ label, value, onChange }: { label: string; value: string; onChange: (k: string) => void }) {
  const [open, setOpen] = useState(false)
  const [cat, setCat] = useState('all')
  const cats = Array.from(new Set(Object.values(FONT_OPTIONS).map((f) => f.cat)))
  const list = Object.entries(FONT_OPTIONS).filter(([, f]) => cat === 'all' || f.cat === cat)
  const cur = FONT_OPTIONS[value]
  return (
    <div>
      <span className="text-sm font-medium text-ink">{label}</span>
      <button type="button" onClick={() => setOpen(!open)} className="mt-1 block w-full rounded-xl border border-line bg-paper px-3 py-2 text-left text-lg text-ink" style={{ fontFamily: cur?.family }}>
        {cur?.label ?? 'Pick a font'}
      </button>
      {open && (
        <div className="mt-2 rounded-xl border border-line bg-card p-3">
          <div className="mb-2 flex flex-wrap gap-2">
            {['all', ...cats].map((c) => (
              <button key={c} type="button" onClick={() => setCat(c)} className={`rounded-full border px-3 py-1 text-xs capitalize ${cat === c ? 'border-twilight bg-twilight/10 text-twilight' : 'border-line text-ink-soft'}`}>{c}</button>
            ))}
          </div>
          <div className="max-h-64 overflow-y-auto">
            {list.map(([k, f]) => (
              <button key={k} type="button" onClick={() => { onChange(k); setOpen(false) }} className={`block w-full rounded-lg px-3 py-2 text-left text-xl hover:bg-paper ${k === value ? 'bg-paper' : ''}`} style={{ fontFamily: f.family }}>{f.label}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function SpecialsPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [items, setItems] = useState<Funnel[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [form, setForm] = useState<Form | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const photoInput = useRef<HTMLInputElement>(null)
  const bgInput = useRef<HTMLInputElement>(null)

  const load = useCallback(async (uid: string) => {
    const sb = supabase
    if (!sb) return
    const { data } = await sb.from('funnel_pages').select('*').eq('owner_id', uid).order('created_at', { ascending: false })
    const rows = (data ?? []) as Funnel[]
    setItems(rows)
    if (rows.length) {
      const { data: l } = await sb.from('funnel_leads').select('*').in('funnel_id', rows.map((r) => r.id)).order('created_at', { ascending: false })
      setLeads((l ?? []) as Lead[])
    } else {
      setLeads([])
    }
  }, [])

  useEffect(() => {
    async function init() {
      const sb = supabase
      if (!sb) return
      const { data: sess } = await sb.auth.getSession()
      if (!sess.session) { router.replace('/login?next=/specials'); return }
      setUserId(sess.session.user.id)
      load(sess.session.user.id)
    }
    init()
  }, [router, load])

  const flash = (m: string) => { setMessage(m); setTimeout(() => setMessage(null), 2500) }
  const setTheme = (patch: Partial<SpecialTheme>) => setForm((f) => (f ? { ...f, theme: { ...f.theme, ...patch } } : f))

  async function save() {
    const sb = supabase
    if (!sb || !form || !userId) return
    setSaving(true)
    try {
      const content: Record<string, unknown> = {}
      Object.entries(form.text).forEach(([k, v]) => { if (v.trim()) content[k] = v.trim() })
      content.photos = form.photos
      Object.assign(content, themeToContent(form.theme))
      const row = {
        name: form.text.hero_headline.trim() || 'Special',
        style: 'special',
        content,
        cta_label: form.cta_label.trim() || 'Claim my spot',
        cta_url: null,
        published: form.published,
        updated_at: new Date().toISOString(),
      }
      let saved: Funnel | null = null
      if (form.id) {
        const { data, error } = await sb.from('funnel_pages').update(row).eq('id', form.id).select().single()
        if (error) throw error
        saved = data as Funnel
      } else {
        let slug = form.slug
        for (let i = 0; i < 3 && !saved; i++) {
          const { data, error } = await sb.from('funnel_pages').insert({ ...row, slug, owner_id: userId }).select().single()
          if (error && error.code !== '23505') throw error
          if (data) saved = data as Funnel
          else slug = makeSlug()
        }
        if (!saved) throw new Error('Could not create the page. Try again.')
      }
      setForm(toForm(saved))
      flash('Saved')
      await load(userId)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  async function uploadImage(file: File, kind: 'photo' | 'bg') {
    const sb = supabase
    if (!sb || !form || !userId) return
    setUploading(true)
    try {
      const v = await makeVersions(file)
      const path = `${userId}/special_${kind}_${Date.now()}.jpg`
      const up = await sb.storage.from('portfolio').upload(path, v.web.blob, { contentType: 'image/jpeg', upsert: true })
      if (up.error) throw up.error
      const url = STORAGE_BASE + path
      if (kind === 'photo') setForm((f) => (f ? { ...f, photos: [...f.photos, url].slice(0, 3) } : f))
      else {
        const old = form.theme.bgImage
        setTheme({ bgImage: url })
        if (old.startsWith(STORAGE_BASE)) await sb.storage.from('portfolio').remove([old.slice(STORAGE_BASE.length)])
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not upload that photo.')
    } finally {
      setUploading(false)
    }
  }

  async function removeImage(url: string, kind: 'photo' | 'bg') {
    const sb = supabase
    if (kind === 'photo') setForm((f) => (f ? { ...f, photos: f.photos.filter((p) => p !== url) } : f))
    else setTheme({ bgImage: '' })
    if (sb && url.startsWith(STORAGE_BASE)) await sb.storage.from('portfolio').remove([url.slice(STORAGE_BASE.length)])
  }

  async function remove(id: string) {
    const sb = supabase
    if (!sb || !userId) return
    if (!window.confirm('Delete this special and its sign-ups for good?')) return
    await sb.from('funnel_pages').delete().eq('id', id)
    setForm(null)
    await load(userId)
  }

  const linkFor = (slug: string) => `${typeof window !== 'undefined' ? window.location.origin : 'https://camrhia.com'}/go/${slug}`

  return (
    <div className="min-h-screen bg-paper xl:pl-60">
      <DashboardHeader active="specials" />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 font-mono text-xs uppercase tracking-widest text-brass">Specials</p>
            <h1 className="font-fraunces text-3xl font-semibold text-ink">Specials</h1>
            <p className="mt-1 text-sm text-ink-soft">A simple page for an offer, like holiday minis. Sign-ups land here.</p>
          </div>
          {!form && <button type="button" onClick={() => setForm(toForm(null))} className="rounded-full bg-twilight px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90">+ New special</button>}
        </div>

        {message && <p className="mb-4 text-sm text-ink-soft">{message}</p>}

        {form && (
          <>
            <link rel="stylesheet" href={ALL_FONTS_HREF} />

            <div className="mb-6 grid gap-6 md:grid-cols-2">
              <StepCard n={1} title="Design a post for Instagram, TikTok or Facebook">
                <p className="text-sm leading-relaxed text-ink-soft">Make your post in any app you like, such as Canva, CapCut or Instagram itself. Keep it to three things:</p>
                <ul className="mt-3 space-y-2 text-sm text-ink">
                  <li>• A photo that stops the scroll</li>
                  <li>• Your offer in one line, like “Holiday mini sessions, $250”</li>
                  <li>• A call to action: “Tap the link to claim your spot”</li>
                </ul>
              </StepCard>
              <StepCard n={2} title="Send your ad to this address">
                <p className="text-sm text-ink-soft">Use this link as the button on your ad, or put it in your bio.</p>
                <p className="mt-3 break-all rounded-xl bg-paper px-4 py-3 text-sm font-medium text-ink">{linkFor(form.slug)}</p>
                <button type="button" onClick={() => { navigator.clipboard.writeText(linkFor(form.slug)); flash('Link copied') }} className="mt-3 rounded-full border border-line px-4 py-2 text-sm text-ink transition hover:border-twilight">Copy link</button>
                {!form.id && <p className="mt-2 text-xs text-ink-soft">The link starts working once you save and publish in step 4.</p>}
              </StepCard>
            </div>

            <div className="mb-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
              <div className="space-y-6">
                <StepCard n={3} title="Design your special">
                  <Group>Background</Group>
                  <div className="flex flex-wrap items-center gap-4">
                    {form.theme.bgImage ? (
                      <div className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={form.theme.bgImage} alt="" className="h-24 w-36 rounded-xl object-cover" />
                        <button type="button" onClick={() => removeImage(form.theme.bgImage, 'bg')} className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-xs text-white">×</button>
                      </div>
                    ) : null}
                    <button type="button" disabled={uploading} onClick={() => bgInput.current?.click()} className="rounded-full border border-line px-4 py-2 text-sm text-ink transition hover:border-twilight disabled:opacity-50">
                      {uploading ? 'Uploading…' : form.theme.bgImage ? 'Replace background photo' : '+ Background photo'}
                    </button>
                    <input ref={bgInput} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f, 'bg'); e.target.value = '' }} />
                  </div>
                  {form.theme.bgImage && (
                    <div className="mt-4">
                      <span className="text-sm font-medium text-ink">Darken the photo</span>
                      <Chips value={String(form.theme.overlay)} options={[{ id: '0', label: 'None' }, { id: '25', label: 'Light' }, { id: '45', label: 'Medium' }, { id: '65', label: 'Dark' }]} onChange={(v) => setTheme({ overlay: Number(v) })} />
                    </div>
                  )}
                  <div className="mt-4 max-w-xs">
                    <ColorField label="Background color" value={form.theme.bgColor} onChange={(v) => setTheme({ bgColor: v })} />
                  </div>

                  <Group>Words</Group>
                  <div className="grid gap-4">
                    {FIELDS.map((f) => (
                      <label key={f.key} className="block">
                        <span className="text-sm font-medium text-ink">{f.label}</span>
                        {f.area ? (
                          <textarea rows={3} placeholder={f.hint} value={form.text[f.key]} onChange={(e) => setForm({ ...form, text: { ...form.text, [f.key]: e.target.value } })} className={inputCls} />
                        ) : (
                          <input placeholder={f.hint} value={form.text[f.key]} onChange={(e) => setForm({ ...form, text: { ...form.text, [f.key]: e.target.value } })} className={inputCls} />
                        )}
                      </label>
                    ))}
                  </div>

                  <Group>Fonts</Group>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FontPicker label="Title font" value={form.theme.headFont} onChange={(k) => setTheme({ headFont: k })} />
                    <FontPicker label="Body font" value={form.theme.bodyFont} onChange={(k) => setTheme({ bodyFont: k })} />
                  </div>
                  <div className="mt-4">
                    <span className="text-sm font-medium text-ink">Title size</span>
                    <Chips value={form.theme.titleSize} options={[{ id: 'small', label: 'Small' }, { id: 'medium', label: 'Medium' }, { id: 'large', label: 'Large' }]} onChange={(v) => setTheme({ titleSize: v })} />
                  </div>
                  <div className="mt-4">
                    <span className="text-sm font-medium text-ink">Alignment</span>
                    <Chips value={form.theme.align} options={[{ id: 'left', label: 'Left' }, { id: 'center', label: 'Center' }]} onChange={(v) => setTheme({ align: v })} />
                  </div>

                  <Group>Colors</Group>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <ColorField label="Text color" value={form.theme.textColor} onChange={(v) => setTheme({ textColor: v })} />
                    <ColorField label="Button color" value={form.theme.accent} onChange={(v) => setTheme({ accent: v })} />
                    <ColorField label="Button text" value={form.theme.btnText} onChange={(v) => setTheme({ btnText: v })} />
                  </div>

                  <Group>Button</Group>
                  <label className="block">
                    <span className="text-sm font-medium text-ink">Button words</span>
                    <input value={form.cta_label} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} className={inputCls} />
                  </label>
                  <div className="mt-4">
                    <span className="text-sm font-medium text-ink">Button shape</span>
                    <Chips value={form.theme.shape} options={[{ id: 'square', label: 'Square' }, { id: 'rounded', label: 'Rounded' }, { id: 'pill', label: 'Pill' }]} onChange={(v) => setTheme({ shape: v })} />
                  </div>

                  <Group>Photos (up to 3)</Group>
                  <div className="flex flex-wrap gap-3">
                    {form.photos.map((u) => (
                      <div key={u} className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={u} alt="" className="h-28 w-28 rounded-xl object-cover" />
                        <button type="button" onClick={() => removeImage(u, 'photo')} className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-xs text-white">×</button>
                      </div>
                    ))}
                    {form.photos.length < 3 && (
                      <button type="button" disabled={uploading} onClick={() => photoInput.current?.click()} className="flex h-28 w-28 items-center justify-center rounded-xl border border-dashed border-line text-2xl text-ink-soft hover:border-twilight disabled:opacity-50">
                        {uploading ? '…' : '+'}
                      </button>
                    )}
                    <input ref={photoInput} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f, 'photo'); e.target.value = '' }} />
                  </div>
                </StepCard>

                <StepCard n={4} title="Publish">
                  <label className="flex items-center gap-2 text-sm text-ink">
                    <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} className="accent-twilight" />
                    Published (anyone with the link can see it)
                  </label>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button type="button" onClick={save} disabled={saving} className="rounded-full bg-twilight px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
                    <button type="button" onClick={() => setForm(null)} className="text-sm text-ink-soft underline">Close</button>
                    {form.id && <button type="button" onClick={() => remove(form.id)} className="ml-auto text-xs text-ink-soft underline hover:text-red-700">Delete</button>}
                  </div>
                </StepCard>
              </div>

              <div className="lg:sticky lg:top-6 lg:self-start">
                <p className="mb-2 font-mono text-xs uppercase tracking-widest text-ink-soft/60">Live preview</p>
                <div className="mx-auto h-[720px] w-[390px] max-w-full overflow-y-auto rounded-[2rem] border-4 border-ink/80" style={{ background: form.theme.bgColor }}>
                  <SpecialView preview funnelId={form.id || 'preview'} theme={form.theme} d={toData(form.text, form.photos, form.cta_label)} />
                </div>
              </div>
            </div>
          </>
        )}

        {items.length > 0 && (
          <section className="mb-8 rounded-2xl border border-line bg-card p-8">
            <p className="font-mono text-xs uppercase tracking-widest text-ink-soft/60">Your specials</p>
            <ul className="mt-3 divide-y divide-line">
              {items.map((it) => (
                <li key={it.id} className="flex flex-wrap items-center gap-3 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-fraunces text-xl font-semibold text-ink">{it.name}</p>
                    <p className="text-sm text-ink-soft">{leads.filter((l) => l.funnel_id === it.id).length} sign-ups</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${it.published ? 'bg-sage/15 text-sage' : 'bg-line text-ink-soft'}`}>{it.published ? 'Published' : 'Draft'}</span>
                  <button type="button" onClick={() => setForm(toForm(it))} className="rounded-full border border-line px-4 py-1.5 text-sm text-ink transition hover:border-twilight">Edit</button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {leads.length > 0 && (
          <section className="mb-8 rounded-2xl border border-line bg-card p-8">
            <p className="font-mono text-xs uppercase tracking-widest text-ink-soft/60">Sign-ups</p>
            <ul className="mt-3 divide-y divide-line">
              {leads.map((l) => (
                <li key={l.id} className="py-4 text-sm">
                  <p className="font-medium text-ink">{l.name} <span className="font-normal text-ink-soft">· {items.find((i) => i.id === l.funnel_id)?.name ?? 'Special'} · {new Date(l.created_at).toLocaleDateString()}</span></p>
                  <p className="text-ink-soft">{l.email}{l.phone ? ` · ${l.phone}` : ''}</p>
                  {l.note ? <p className="mt-1 text-ink">{l.note}</p> : null}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-2xl border border-line bg-card p-8">
          <p className="font-mono text-xs uppercase tracking-widest text-ink-soft/60">Examples</p>
          <p className="mt-2 text-sm text-ink-soft">Ideas to look at. Scroll inside any phone to see the whole page.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-8">
            {EXAMPLES.map((ex) => {
              const theme = { ...DEFAULT_THEME, ...ex.theme }
              return (
                <div key={ex.name} className="text-center">
                  <div className="mx-auto h-[400px] w-[200px] overflow-y-auto rounded-[1.5rem] border-[3px] border-ink/80" style={{ background: theme.bgColor }}>
                    <div style={{ width: 390, zoom: 0.5 }}>
                      <SpecialView preview funnelId="preview" theme={theme} d={toData(ex.text, [], 'Claim my spot')} />
                    </div>
                  </div>
                  <p className="mt-3 text-sm font-medium text-ink">{ex.name}</p>
                </div>
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}
