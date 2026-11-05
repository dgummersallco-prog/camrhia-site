'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { HexColorPicker } from 'react-colorful'
import { supabase } from '@/lib/supabase'
import { makeVersions } from '@/lib/galleryImages'
import { FONT_OPTIONS } from '@/lib/siteTheme'
import { DashboardHeader } from '@/app/components/DashboardHeader'
import SpecialView, { DEFAULT_THEME, readTheme, themeToContent, type Decor, type SpecialData, type SpecialTheme, type TextBlock } from '@/app/go/[slug]/SpecialView'

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
type Pkg = { id: string; name: string; price: string | null; detail: string | null; covers: string | null }
type Lead = { id: string; funnel_id: string; name: string; email: string; phone: string | null; note: string | null; created_at: string }
type Form = { id: string; slug: string; published: boolean; cta_label: string; text: Record<string, string>; photos: string[]; theme: SpecialTheme }

const TEXT_KEYS = ['hero_headline', 'brand_name', 'hero_sub', 'price_line', 'when_where', 'details_body', 'spots_note', 'terms', 'thanks_message', 'form_title', 'details_title', 'terms_title', 'package_id']

const SWATCHES = ['#FAF7F2', '#FFFFFF', '#2A1F24', '#111111', '#A9545F', '#B08D57', '#1F3A2E', '#2F6DB5', '#F3E3CF', '#FBEFF1']

const DECOR_OPTIONS: { id: Decor; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'santa', label: '🎅🎄⭐ Holiday' },
  { id: 'leaves', label: '🍂🍁🍃 Fall' },
  { id: 'flowers', label: '🌸🌷🌼 Spring' },
  { id: 'pencils', label: '✏️📚🍎 School' },
  { id: 'hearts', label: '❤️💕🌹 Love' },
  { id: 'pumpkins', label: '🎃🍂🦇 Pumpkin patch' },
  { id: 'sun', label: '☀️🌊🐚 Beach' },
]

const TITLE_SIZES = [{ id: '32', label: 'S' }, { id: '40', label: 'M' }, { id: '48', label: 'L' }, { id: '60', label: 'XL' }, { id: '72', label: '2XL' }]
const SUB_SIZES = [{ id: '14', label: 'S' }, { id: '16', label: 'M' }, { id: '18', label: 'L' }, { id: '22', label: 'XL' }, { id: '26', label: '2XL' }]
const ALIGNS: { id: 'left' | 'center'; label: string }[] = [{ id: 'left', label: 'Left' }, { id: 'center', label: 'Center' }]

const PLACES: { id: TextBlock['place']; label: string }[] = [
  { id: 'title', label: 'With the title' },
  { id: 'subtitle', label: 'With the subtitle' },
  { id: 'claim', label: 'Above the sign-up box' },
]

type Example = { name: string; cta: string; text: Record<string, string>; theme: Partial<SpecialTheme> }
const EXAMPLES: Example[] = [
  {
    name: 'Holiday',
    cta: 'Reserve my session',
    theme: { bgColor: '#1F3A2E', decor: 'santa', headFont: 'playfair', titleColor: '#F6EFE2', titleSizePx: 56, subFont: 'lora', subColor: '#E9DFC9', textColor: '#F6EFE2', accent: '#C8A24A', btnText: '#1F3A2E', bodyFont: 'lora', cardBg: '#F6EFE2', cardText: '#1F3A2E', cardRadius: 20 },
    text: {
      hero_headline: 'Holiday Mini Sessions',
      brand_name: 'Juniper & Pine Photography',
      hero_sub: 'Twenty minutes by the tree, and your holiday cards are done.',
      price_line: '$225 · 20 minutes · 8 edited photos',
      when_where: 'Saturday, December 5 · The Lodge at Pine Hollow, Park City, UT',
      details_body: '20 minute session for your family\n8 edited photos in an online gallery\nA cozy holiday set with warm lights\nExtra photos and prints available',
      spots_note: 'Only 6 spots available',
      terms: 'Bookings are final and non-refundable, but you can pass your spot to a friend.',
      form_title: 'Save your holiday spot',
      thanks_message: 'Thank you! I will email you within a day to lock in your time.',
    },
  },
  {
    name: 'Fall family',
    cta: 'Book my mini',
    theme: { bgColor: '#F3E3CF', decor: 'leaves', headFont: 'cormorant', titleColor: '#4A2C17', titleSizePx: 60, titleAlign: 'left', subColor: '#6B4A33', subAlign: 'left', textColor: '#4A2C17', accent: '#B5532A', shape: 'rounded', cardBg: '#4A2C17', cardText: '#F6E8D3', cardRadius: 14 },
    text: {
      hero_headline: 'Fall Family Minis',
      brand_name: 'Marigold Lane Studio',
      hero_sub: 'Golden light, a short session, and no stress.',
      price_line: '$195 · 15 minutes · 8 edited photos',
      when_where: 'October 10 & 11 · Harlow Farm, Rhinebeck, NY',
      details_body: '15 minute outdoor session\n8 edited photos in an online gallery\nKids and pets welcome\nPrints and albums available',
      spots_note: 'Only 8 spots per day',
      terms: 'Rain date included. Bookings are final and non-refundable.',
      form_title: 'Pick your fall day',
      thanks_message: 'You are on the list! Watch your email for next steps.',
    },
  },
  {
    name: 'Spring blossom',
    cta: 'Save my spot',
    theme: { bgColor: '#FBEFF1', decor: 'flowers', headFont: 'playfair', titleColor: '#4B2A33', titleSizePx: 50, subFont: 'lora', subColor: '#7A4A57', textColor: '#4B2A33', accent: '#D77A8F', bodyFont: 'lora', cardBg: '#FFFFFF', cardText: '#4B2A33', cardRadius: 30 },
    text: {
      hero_headline: 'Spring Blossom Minis',
      brand_name: 'Wren & Willow Photo',
      hero_sub: 'Soft light, fresh blooms, and photos you will want on your wall.',
      price_line: '$175 · 15 minutes · 6 edited photos',
      when_where: 'Saturday, April 11 · Bloom Hill Gardens, Santa Barbara, CA',
      details_body: '15 minute session among the blossoms\n6 edited photos in an online gallery\nGreat for families, couples and moms\nExtra photos available',
      spots_note: 'Blossoms are short lived, so spots are limited',
      terms: 'Bookings are final and non-refundable. Weather dates are announced by email.',
      form_title: 'Join the blossom list',
      thanks_message: 'Thank you! I will be in touch soon with your time.',
    },
  },
  {
    name: 'Back to school',
    cta: 'Get on the list',
    theme: { bgColor: '#F2F6FA', decor: 'pencils', headFont: 'josefin', titleColor: '#17324D', titleSizePx: 48, titleAlign: 'left', subFont: 'worksans', subColor: '#3D5A78', subAlign: 'left', textColor: '#17324D', accent: '#F2B632', btnText: '#17324D', bodyFont: 'worksans', shape: 'square', cardBg: '#17324D', cardText: '#FFFFFF', cardRadius: 4 },
    text: {
      hero_headline: 'Back-to-School Portraits',
      brand_name: 'Penny Lane Portraits',
      hero_sub: 'A quick portrait to remember this grade.',
      price_line: '$85 · 10 minutes · 5 edited photos',
      when_where: 'Saturday, August 8 · Lincoln Park Pavilion, Austin, TX',
      details_body: '10 minute portrait session per child\n5 edited photos in an online gallery\nSiblings can share one slot\nPrints ready for grandparents',
      spots_note: 'Limited time slots',
      terms: 'Bookings are final and non-refundable.',
      form_title: 'Sign up for a time slot',
      thanks_message: 'Thank you! I will email you to confirm your time.',
    },
  },
  {
    name: 'Valentine',
    cta: 'Book our date',
    theme: { bgColor: '#2A1F24', decor: 'hearts', headFont: 'cormorant', titleColor: '#F6F1EA', titleSizePx: 60, subColor: '#E7D6DB', textColor: '#F6F1EA', accent: '#E0607E', btnText: '#FFFFFF', cardBg: '#4A2A33', cardText: '#F6F1EA', cardRadius: 24 },
    text: {
      hero_headline: 'Valentine Couples Minis',
      brand_name: 'Rosewood Collective',
      hero_sub: 'A short, relaxed session just for the two of you.',
      price_line: '$150 · 20 minutes · 8 edited photos',
      when_where: 'Saturday, February 6 · The Glass House Loft, Chicago, IL',
      details_body: '20 minute couples session\n8 edited photos in an online gallery\nPosing help, so no experience needed\nPrints available',
      spots_note: 'Only 5 spots',
      terms: 'Bookings are final and non-refundable, but can be gifted.',
      form_title: 'Reserve your date night',
      thanks_message: 'Thank you! I will email you shortly to pick your time.',
    },
  },
  {
    name: 'Pumpkin patch',
    cta: 'Pick my time',
    theme: { bgColor: '#1C1A24', decor: 'pumpkins', headFont: 'playfair', titleColor: '#FFF4E0', titleSizePx: 56, subFont: 'lora', subColor: '#F2D9B8', textColor: '#FFF4E0', accent: '#E8731A', btnText: '#1C1A24', bodyFont: 'lora', cardBg: '#2E2A3A', cardText: '#FFF4E0', cardRadius: 18 },
    text: {
      hero_headline: 'Pumpkin Patch Minis',
      brand_name: 'Hollow Oak Photography',
      hero_sub: 'Hay bales, pumpkins and the cutest fall photos.',
      price_line: '$185 · 15 minutes · 8 edited photos',
      when_where: 'Saturday, October 17 · Miller Family Pumpkin Patch, Marietta, GA',
      details_body: '15 minute session at the patch\n8 edited photos in an online gallery\nCostumes welcome\nPrints available',
      spots_note: 'Only 10 spots',
      terms: 'Bookings are final and non-refundable.',
      form_title: 'Choose your patch time',
      thanks_message: 'Thank you! I will email you to confirm your time.',
    },
  },
  {
    name: 'Summer beach',
    cta: 'Grab a sunset slot',
    theme: { bgColor: '#FFF3C4', decor: 'sun', headFont: 'josefin', titleColor: '#12414F', titleSizePx: 50, subFont: 'worksans', subColor: '#2F6A7A', textColor: '#12414F', accent: '#F6C42D', btnText: '#3A2F00', bodyFont: 'worksans', cardBg: '#12414F', cardText: '#FFF3C4', cardRadius: 22 },
    text: {
      hero_headline: 'Summer Beach Minis',
      brand_name: 'Salt & Sun Studio',
      hero_sub: 'Sand, sun and sunset light for the whole family.',
      price_line: '$200 · 20 minutes · 10 edited photos',
      when_where: 'Saturday, July 11 · Pebble Cove Beach, Clearwater, FL',
      details_body: '20 minute sunset session\n10 edited photos in an online gallery\nFamilies and couples welcome\nPrints available',
      spots_note: 'Only 6 spots',
      terms: 'Bookings are final and non-refundable. Weather dates by email.',
      form_title: 'Book your golden hour',
      thanks_message: 'Thank you! I will email you to pick your time.',
    },
  },
  {
    name: 'Branding',
    cta: 'Book my brand shoot',
    theme: { bgColor: '#FFFFFF', headFont: 'josefin', titleColor: '#111111', titleSizePx: 56, titleAlign: 'left', subFont: 'worksans', subColor: '#444444', subAlign: 'left', textColor: '#111111', accent: '#111111', bodyFont: 'worksans', shape: 'square', cardBg: '#111111', cardText: '#FFFFFF', cardRadius: 0 },
    text: {
      hero_headline: 'Branding Mini Sessions',
      brand_name: 'Atelier North',
      hero_sub: 'Fresh photos for your website and social media, in one short visit.',
      price_line: '$250 · 30 minutes · 10 edited photos',
      when_where: 'First Friday of the month · Downtown studio, Scottsdale, AZ',
      details_body: '30 minute session with two outfit changes\n10 edited photos for web and social\nPlanning call before the session\nFull usage for your business',
      spots_note: 'Only 4 spots this month',
      terms: 'Bookings are final and non-refundable.',
      form_title: 'Request your session',
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
    formTitle: text.form_title ?? '',
    detailsTitle: text.details_title ?? '',
    termsTitle: text.terms_title ?? '',
  }
}

function toForm(f: Funnel | null): Form {
  const c = (f?.content ?? {}) as Record<string, unknown>
  const text: Record<string, string> = {}
  TEXT_KEYS.forEach((k) => { text[k] = String(c[k] ?? '') })
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

function MiniCard({ title, summary, children }: { title: string; summary?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl border border-line bg-paper">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 px-5 py-4 text-left">
        <span className="shrink-0 text-base font-medium text-ink">{title}</span>
        <span className="min-w-0 flex-1 truncate text-right text-sm text-ink-soft">{summary}</span>
        <span className={`shrink-0 text-xl leading-none text-ink-soft transition-transform ${open ? 'rotate-90' : ''}`}>›</span>
      </button>
      {open && <div className="space-y-4 px-5 pb-5">{children}</div>}
    </div>
  )
}

function SizeField({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (n: number) => void }) {
  const [txt, setTxt] = useState(String(value))
  useEffect(() => setTxt(String(value)), [value])
  return (
    <div className="mt-1 flex items-center gap-3">
      <input
        type="number"
        value={txt}
        min={min}
        max={max}
        onChange={(e) => { setTxt(e.target.value); const n = Number(e.target.value); if (Number.isFinite(n) && n >= min && n <= max) onChange(n) }}
        onBlur={() => setTxt(String(value))}
        className="w-20 rounded-xl border border-line bg-card px-3 py-2 text-ink outline-none focus:border-twilight"
      />
      <span className="text-sm text-ink-soft">px</span>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="flex-1 accent-twilight" />
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-sm font-medium text-ink">{children}</span>
}

function Chips<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="mt-1 flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o.id} type="button" onClick={() => onChange(o.id)} className={`rounded-full border px-4 py-1.5 text-sm transition ${value === o.id ? 'border-twilight bg-twilight/10 text-twilight' : 'border-line bg-card text-ink-soft hover:border-twilight'}`}>{o.label}</button>
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
      <Label>{label}</Label>
      <button type="button" onClick={() => setOpen(!open)} className="mt-1 flex w-full items-center gap-2 rounded-xl border border-line bg-card px-3 py-2">
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
      <Label>{label}</Label>
      <button type="button" onClick={() => setOpen(!open)} className="mt-1 block w-full rounded-xl border border-line bg-card px-3 py-2 text-left text-lg text-ink" style={{ fontFamily: cur?.family }}>
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
  const bgInput = useRef<HTMLInputElement>(null)
  const [packages, setPackages] = useState<Pkg[]>([])
  const photoInput = useRef<HTMLInputElement>(null)

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
      setForm((f) => f ?? toForm(null))
      sb.from('packages').select('id,name,price,detail,covers').eq('owner_id', sess.session.user.id).order('sort_order').then(({ data }) => setPackages((data ?? []) as Pkg[]))
      load(sess.session.user.id)
    }
    init()
  }, [router, load])

  const flash = (m: string) => { setMessage(m); setTimeout(() => setMessage(null), 2500) }
  const setTheme = (patch: Partial<SpecialTheme>) => setForm((f) => (f ? { ...f, theme: { ...f.theme, ...patch } } : f))
  const pickPackage = (id: string) =>
    setForm((f) => {
      if (!f) return f
      const p = packages.find((x) => x.id === id)
      const text: Record<string, string> = { ...f.text, package_id: id }
      if (p) {
        text.price_line = [p.price, p.covers].filter(Boolean).join(' · ')
        if (!text.details_body.trim() && p.detail) text.details_body = p.detail
      } else {
        text.price_line = ''
      }
      return { ...f, text }
    })
  const setBlock = (i: number, patch: Partial<TextBlock>) =>
    setForm((f) => (f ? { ...f, theme: { ...f.theme, blocks: f.theme.blocks.map((b, j) => (j === i ? { ...b, ...patch } : b)) } } : f))
  const addBlock = () =>
    setForm((f) => (f && f.theme.blocks.length < 10 ? { ...f, theme: { ...f.theme, blocks: [...f.theme.blocks, { text: '', font: f.theme.subFont, color: f.theme.textColor, size: 20, align: 'center' as const, place: 'subtitle' as const }] } } : f))
  const removeBlock = (i: number) =>
    setForm((f) => (f ? { ...f, theme: { ...f.theme, blocks: f.theme.blocks.filter((_, j) => j !== i) } } : f))
  const setText = (k: string, v: string) => setForm((f) => (f ? { ...f, text: { ...f.text, [k]: v } } : f))

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

  async function uploadBackground(file: File) {
    const sb = supabase
    if (!sb || !form || !userId) return
    setUploading(true)
    try {
      const v = await makeVersions(file)
      const path = `${userId}/special_bg_${Date.now()}.jpg`
      const up = await sb.storage.from('portfolio').upload(path, v.web.blob, { contentType: 'image/jpeg', upsert: true })
      if (up.error) throw up.error
      const old = form.theme.bgImage
      setTheme({ bgImage: STORAGE_BASE + path, titleColor: '#FFFFFF', subColor: '#FFFFFF' })
      if (old.startsWith(STORAGE_BASE)) await sb.storage.from('portfolio').remove([old.slice(STORAGE_BASE.length)])
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not upload that photo.')
    } finally {
      setUploading(false)
    }
  }

  async function uploadPhotos(files: FileList) {
    const sb = supabase
    if (!sb || !form || !userId) return
    setUploading(true)
    try {
      const urls: string[] = []
      for (const file of Array.from(files).slice(0, Math.max(0, 8 - form.photos.length))) {
        const v = await makeVersions(file)
        const path = `${userId}/special_${Date.now()}_${rand()}.jpg`
        const up = await sb.storage.from('portfolio').upload(path, v.web.blob, { contentType: 'image/jpeg', upsert: true })
        if (up.error) throw up.error
        urls.push(STORAGE_BASE + path)
      }
      setForm((f) => (f ? { ...f, photos: [...f.photos, ...urls] } : f))
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not upload that photo.')
    } finally {
      setUploading(false)
    }
  }

  async function removePhoto(url: string) {
    const sb = supabase
    setForm((f) => (f ? { ...f, photos: f.photos.filter((u) => u !== url) } : f))
    if (sb && url.startsWith(STORAGE_BASE)) await sb.storage.from('portfolio').remove([url.slice(STORAGE_BASE.length)])
  }

  async function removeBackground() {
    const sb = supabase
    const url = form?.theme.bgImage ?? ''
    setTheme({ bgImage: '' })
    if (sb && url.startsWith(STORAGE_BASE)) await sb.storage.from('portfolio').remove([url.slice(STORAGE_BASE.length)])
  }

  async function remove(id: string) {
    const sb = supabase
    if (!sb || !userId) return
    if (!window.confirm('Delete this special and its sign-ups for good?')) return
    await sb.from('funnel_pages').delete().eq('id', id)
    setForm(toForm(null))
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
          {form?.id && <button type="button" onClick={() => { setForm(toForm(null)); window.scrollTo({ top: 0 }) }} className="rounded-full border border-line px-5 py-2.5 text-sm text-ink transition hover:border-twilight">+ New special</button>}
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
                  <div className="space-y-5">
                    <MiniCard title="Background" summary={form.theme.bgImage ? 'Photo added' : 'Color'}>
                      <div className="flex flex-wrap items-center gap-4">
                        {form.theme.bgImage ? (
                          <div className="relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={form.theme.bgImage} alt="" className="h-24 w-36 rounded-xl object-cover" />
                            <button type="button" onClick={removeBackground} className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-xs text-white">×</button>
                          </div>
                        ) : null}
                        <button type="button" disabled={uploading} onClick={() => bgInput.current?.click()} className="rounded-full border border-line bg-card px-4 py-2 text-sm text-ink transition hover:border-twilight disabled:opacity-50">
                          {uploading ? 'Uploading…' : form.theme.bgImage ? 'Replace background photo' : '+ Background photo'}
                        </button>
                        <input ref={bgInput} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadBackground(f); e.target.value = '' }} />
                      </div>
                      {form.theme.bgImage && (
                        <div>
                          <Label>Darken the photo</Label>
                          <Chips value={String(form.theme.overlay)} options={[{ id: '0', label: 'None' }, { id: '25', label: 'Light' }, { id: '45', label: 'Medium' }, { id: '65', label: 'Dark' }]} onChange={(v) => setTheme({ overlay: Number(v) })} />
                        </div>
                      )}
                      <div className="max-w-xs">
                        <ColorField label="Background color" value={form.theme.bgColor} onChange={(v) => setTheme({ bgColor: v })} />
                      </div>
                      <div>
                        <Label>Decoration</Label>
                        <Chips value={form.theme.decor} options={DECOR_OPTIONS} onChange={(v) => setTheme({ decor: v })} />
                      </div>
                    </MiniCard>

                    <MiniCard title="Studio name" summary={form.text.brand_name}>
                      <label className="block">
                        <Label>Words</Label>
                        <input placeholder="Your studio name" value={form.text.brand_name} onChange={(e) => setText('brand_name', e.target.value)} className={inputCls} />
                      </label>
                      <FontPicker label="Font" value={form.theme.nameFont} onChange={(k) => setTheme({ nameFont: k })} />
                      <div>
                        <Label>Size</Label>
                        <SizeField value={form.theme.nameSizePx} min={8} max={60} onChange={(n) => setTheme({ nameSizePx: n })} />
                      </div>
                      <div className="max-w-xs">
                        <ColorField label="Color" value={form.theme.nameColor || form.theme.textColor} onChange={(v) => setTheme({ nameColor: v })} />
                      </div>
                    </MiniCard>

                    <MiniCard title="Special title" summary={form.text.hero_headline}>
                      <label className="block">
                        <Label>Main title</Label>
                        <input placeholder="Holiday mini sessions" value={form.text.hero_headline} onChange={(e) => setText('hero_headline', e.target.value)} className={inputCls} />
                      </label>
                      <FontPicker label="Title font" value={form.theme.headFont} onChange={(k) => setTheme({ headFont: k })} />
                      <div>
                        <Label>Title size</Label>
                        <SizeField value={form.theme.titleSizePx} min={12} max={160} onChange={(n) => setTheme({ titleSizePx: n })} />
                      </div>
                      <div className="max-w-xs">
                        <ColorField label="Title color" value={form.theme.titleColor} onChange={(v) => setTheme({ titleColor: v })} />
                      </div>
                      <div className="border-t border-line" />
                      <label className="block">
                        <Label>Subtitle</Label>
                        <textarea rows={2} placeholder="Family portraits by the lake, 20 minutes each" value={form.text.hero_sub} onChange={(e) => setText('hero_sub', e.target.value)} className={inputCls} />
                      </label>
                      <FontPicker label="Subtitle font" value={form.theme.subFont} onChange={(k) => setTheme({ subFont: k })} />
                      <div>
                        <Label>Subtitle size</Label>
                        <SizeField value={form.theme.subSizePx} min={8} max={80} onChange={(n) => setTheme({ subSizePx: n })} />
                      </div>
                      <div className="max-w-xs">
                        <ColorField label="Subtitle color" value={form.theme.subColor} onChange={(v) => setTheme({ subColor: v })} />
                      </div>
                    </MiniCard>

                    <MiniCard title="Text boxes" summary={form.theme.blocks.length ? `${form.theme.blocks.length} added` : 'None'}>
                      {form.theme.blocks.map((b, i) => (
                        <div key={i} className="space-y-4 rounded-xl border border-line bg-card p-4">
                          <div className="flex items-center justify-between">
                            <Label>Text box {i + 1}</Label>
                            <button type="button" onClick={() => removeBlock(i)} className="text-xs text-ink-soft underline hover:text-red-700">Remove</button>
                          </div>
                          <textarea rows={2} value={b.text} onChange={(e) => setBlock(i, { text: e.target.value })} className={inputCls} placeholder="Type anything" />
                          <FontPicker label="Font" value={b.font} onChange={(k) => setBlock(i, { font: k })} />
                          <div>
                            <Label>Size</Label>
                            <SizeField value={b.size} min={8} max={160} onChange={(n) => setBlock(i, { size: n })} />
                          </div>
                          <div className="max-w-xs">
                            <ColorField label="Color" value={b.color} onChange={(v) => setBlock(i, { color: v })} />
                          </div>
                          <div>
                            <Label>Shows</Label>
                            <Chips value={b.place} options={PLACES} onChange={(v) => setBlock(i, { place: v })} />
                          </div>
                        </div>
                      ))}
                      <button type="button" onClick={addBlock} className="rounded-full border border-line bg-card px-4 py-2 text-sm text-ink transition hover:border-twilight">+ Add text box</button>
                    </MiniCard>

                    <MiniCard title="Mini session" summary={packages.find((x) => x.id === form.text.package_id)?.name || 'None'}>
                      {packages.length === 0 ? (
                        <p className="text-sm text-ink-soft">You have no packages yet. Add a package in the app first, then come back and pick it here.</p>
                      ) : (
                        <>
                          <label className="block">
                            <Label>Pick the package for this special</Label>
                            <select value={form.text.package_id} onChange={(e) => pickPackage(e.target.value)} className={inputCls}>
                              <option value="">Pick a package</option>
                              {packages.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}{p.price ? ` · ${p.price}` : ''}</option>
                              ))}
                            </select>
                          </label>
                          <p className="text-sm text-ink-soft">Sign-ups land in your app inquiries with this package attached. The price and details come from the package.</p>
                        </>
                      )}
                    </MiniCard>

                    <MiniCard title="When and where (optional)" summary={form.text.when_where || 'None'}>
                      <label className="block">
                        <Label>Words</Label>
                        <input placeholder="Saturday, December 5 · Pine Hollow Lodge, Park City, UT" value={form.text.when_where} onChange={(e) => setText('when_where', e.target.value)} className={inputCls} />
                      </label>
                    </MiniCard>

                    <MiniCard title="Photos" summary={form.photos.length ? `${form.photos.length} added` : 'None'}>
                      <p className="text-sm text-ink-soft">Add up to 8. One photo stays still. Two or more fade into each other.</p>
                      <div className="flex flex-wrap gap-3">
                        {form.photos.map((u) => (
                          <div key={u} className="relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={u} alt="" className="h-24 w-20 rounded-xl object-cover" />
                            <button type="button" onClick={() => removePhoto(u)} className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-xs text-white">×</button>
                          </div>
                        ))}
                      </div>
                      {form.photos.length < 8 && (
                        <button type="button" disabled={uploading} onClick={() => photoInput.current?.click()} className="rounded-full border border-line bg-card px-4 py-2 text-sm text-ink transition hover:border-twilight disabled:opacity-50">
                          {uploading ? 'Uploading…' : '+ Add photos'}
                        </button>
                      )}
                      <input ref={photoInput} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { if (e.target.files?.length) uploadPhotos(e.target.files); e.target.value = '' }} />
                    </MiniCard>

                    <MiniCard title="Button" summary={form.cta_label}>
                      <label className="block">
                        <Label>Words</Label>
                        <input value={form.cta_label} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} className={inputCls} />
                      </label>
                      <div className="max-w-xs">
                        <ColorField label="Button color" value={form.theme.accent} onChange={(v) => setTheme({ accent: v })} />
                      </div>
                      <div className="max-w-xs">
                        <ColorField label="Button text color" value={form.theme.btnText} onChange={(v) => setTheme({ btnText: v })} />
                      </div>
                      <div>
                        <Label>Text size</Label>
                        <SizeField value={form.theme.btnSizePx} min={10} max={40} onChange={(n) => setTheme({ btnSizePx: n })} />
                      </div>
                      <div>
                        <Label>Shape</Label>
                        <Chips value={form.theme.shape} options={[{ id: 'square', label: 'Square' }, { id: 'rounded', label: 'Rounded' }, { id: 'pill', label: 'Pill' }]} onChange={(v) => setTheme({ shape: v })} />
                      </div>
                    </MiniCard>

                    <MiniCard title="Summary" summary={form.text.details_body || form.text.terms ? 'Added' : 'None'}>
                      <label className="block">
                        <Label>First title</Label>
                        <input placeholder="What is included" value={form.text.details_title} onChange={(e) => setText('details_title', e.target.value)} className={inputCls} />
                      </label>
                      <label className="block">
                        <Label>First paragraph</Label>
                        <textarea rows={4} value={form.text.details_body} onChange={(e) => setText('details_body', e.target.value)} className={inputCls} />
                      </label>
                      <div className="border-t border-line" />
                      <label className="block">
                        <Label>Second title</Label>
                        <input placeholder="Good to know" value={form.text.terms_title} onChange={(e) => setText('terms_title', e.target.value)} className={inputCls} />
                      </label>
                      <label className="block">
                        <Label>Second paragraph</Label>
                        <textarea rows={4} value={form.text.terms} onChange={(e) => setText('terms', e.target.value)} className={inputCls} />
                      </label>
                    </MiniCard>

                    <MiniCard title="Sign-up form" summary={form.text.form_title || 'Sign up'}>
                      <label className="block">
                        <Label>Title words</Label>
                        <input placeholder="Claim your spot" value={form.text.form_title} onChange={(e) => setText('form_title', e.target.value)} className={inputCls} />
                      </label>
                      <div className="max-w-xs">
                        <ColorField label="Box color" value={form.theme.cardBg} onChange={(v) => setTheme({ cardBg: v })} />
                      </div>
                      <div className="max-w-xs">
                        <ColorField label="Text color" value={form.theme.cardText} onChange={(v) => setTheme({ cardText: v })} />
                      </div>
                      <div>
                        <Label>Corner roundness</Label>
                        <SizeField value={form.theme.cardRadius} min={0} max={60} onChange={(n) => setTheme({ cardRadius: n })} />
                      </div>
                    </MiniCard>
                  </div>
                </StepCard>

                <StepCard n={4} title="Publish">
                  <label className="flex items-center gap-2 text-sm text-ink">
                    <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} className="accent-twilight" />
                    Published (anyone with the link can see it)
                  </label>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button type="button" onClick={save} disabled={saving} className="rounded-full bg-twilight px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
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
                  <button type="button" onClick={() => { setForm(toForm(it)); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="rounded-full border border-line px-4 py-1.5 text-sm text-ink transition hover:border-twilight">Edit</button>
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
                      <SpecialView preview funnelId="preview" theme={theme} d={toData(ex.text, [`/examples/${ex.name.toLowerCase().replace(/\s+/g, '-')}.jpg`], ex.cta)} />
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
