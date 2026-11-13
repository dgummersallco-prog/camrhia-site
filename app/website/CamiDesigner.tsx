'use client'

import { structureOf } from '@/lib/siteTheme'
import CamriTyping from '@/app/components/CamriTyping'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { makeVersions } from '@/lib/galleryImages'
import { camiSite, applyPalette, setButtons, type SiteState } from '@/lib/camiSite'
import { FONT_OPTIONS, PAIR_PRESETS } from '@/lib/siteTheme'
import CamriSetup from './CamriSetup'

type Prof = SiteState & {
  id: string; public_token: string | null; slug: string | null; logo_path: string | null
  instagram_url: string | null; facebook_url: string | null; tiktok_url: string | null; pinterest_url: string | null
}
type Tab = 'style' | 'pages' | 'colors' | 'type' | 'photos' | 'social'
type Msg = { from: 'cami' | 'you'; text: string }

const TABS: Tab[] = ['style', 'pages', 'colors', 'type', 'photos', 'social']
const TAB_TITLES: Record<Tab, string> = { style: 'Style', pages: 'Pages', colors: 'Colors', type: 'Fonts & buttons', photos: 'Photos', social: 'Social links' }
const HEADINGS: Record<Tab, [string, string]> = {
  style: ['What feeling do you want?', 'Pick the layout that feels like you.'],
  pages: ['Which pages do you want?', 'Home and Booking are always on.'],
  colors: ['Pick your three colors', 'Start from a palette or choose your own.'],
  type: ['Fonts and buttons', 'Pick a pairing, or choose every font yourself.'],
  photos: ['Hero photos', 'The big photos that open your site. Up to 6, strongest first. More than one becomes a slideshow.'],
  social: ['Where can people find you?', 'All optional. These show on your site.'],
}
const BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}/storage/v1/object/public/portfolio/`
const COLS = 'id, public_token, slug, logo_path, instagram_url, facebook_url, tiktok_url, pinterest_url, site_template, site_accent, site_font_pair, site_headline, site_subhead, site_settings'
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x))

const STYLES = [
  { key: 'airy', name: 'Light & airy', blurb: 'Bright white, lots of space.', tpl: 'minimal', pair: 'modern', bg: '#FFFFFF', text: '#2A1F24' },
  { key: 'classic', name: 'Classic & elegant', blurb: 'Big photo, timeless serif.', tpl: 'editorial', pair: 'serif', bg: '#FAF7F2', text: '#2A1F24' },
  { key: 'romantic', name: 'Romantic', blurb: 'Soft, framed and dreamy.', tpl: 'framed', pair: 'romantic', bg: '#FBF4F1', text: '#3A2A2E' },
  { key: 'bold', name: 'Bold editorial', blurb: 'Huge headline, magazine feel.', tpl: 'magazine', pair: 'modern', bg: '#FFFFFF', text: '#1B1B1D' },
  { key: 'moody', name: 'Moody & dark', blurb: 'Dark, cinematic, dramatic.', tpl: 'editorial', pair: 'serif', bg: '#17141A', text: '#F4EEE8' },
  { key: 'clean', name: 'Clean split', blurb: 'Words one side, photo the other.', tpl: 'split', pair: 'modern', bg: '#F6F1EA', text: '#2A1F24' },
  { key: 'mosaic', name: 'Photo collage', blurb: 'A wall of your best shots.', tpl: 'mosaic', pair: 'modern', bg: '#FAF7F2', text: '#2A1F24', mock: 'mosaic' },
  { key: 'earthy', name: 'Warm & earthy', blurb: 'Cream, clay and soft serif.', tpl: 'editorial', pair: 'serif', bg: '#F1E8DA', text: '#3A2A22', mock: 'classic' },
]
const PALETTES = [
  { name: 'Blush', accent: '#C98A8D', bg: '#FBF6F1', text: '#2A1F24' },
  { name: 'Sage', accent: '#7C8B6F', bg: '#F7F5EE', text: '#27302A' },
  { name: 'Navy & cream', accent: '#1F2D4A', bg: '#FAF7F2', text: '#1F2D4A' },
  { name: 'Terracotta', accent: '#C06A4D', bg: '#FAF4EC', text: '#3A2A22' },
  { name: 'Gold & ivory', accent: '#B08D57', bg: '#FBF8F1', text: '#2A1F24' },
  { name: 'Noir', accent: '#E6D3B3', bg: '#17141A', text: '#F4EEE8' },
]
const ACCENTS = ['#C98A8D', '#D98C8C', '#B76E79', '#A65D57', '#C06A4D', '#D4A373', '#B08D57', '#E6D3B3', '#C9B79C', '#9CAF88', '#7C8B6F', '#5F7A61', '#3F5B4A', '#6B8E9B', '#4A5D7A', '#1F2D4A', '#8E7AA3', '#6B4F5E', '#8B5E3C', '#2A1F24', '#7A7A7A', '#111111']
const BGS = ['#FFFFFF', '#FAF7F2', '#FBF6F1', '#F6F1EA', '#F7F5EE', '#EFE8DD', '#F3E9E4', '#E9EEF0', '#E8EDE6', '#17141A', '#1F1B20', '#2B2B2B']
const TEXTS = ['#2A1F24', '#1B1B1D', '#3A2A22', '#27302A', '#1F2D4A', '#4A4A4A', '#6B4F5E', '#F4EEE8', '#FFFFFF']
const TYPE_SETS: { key: string; name: string; pair?: string; head: string; body: string }[] = [
  { key: 'classic', name: 'Classic', pair: 'serif', head: PAIR_PRESETS.serif.head, body: PAIR_PRESETS.serif.body },
  { key: 'modern', name: 'Modern', pair: 'modern', head: PAIR_PRESETS.modern.head, body: PAIR_PRESETS.modern.body },
  { key: 'romantic', name: 'Romantic', pair: 'romantic', head: PAIR_PRESETS.romantic.head, body: PAIR_PRESETS.romantic.body },
  { key: 'luxury', name: 'Luxury', head: 'cormorant', body: 'josefin' },
  { key: 'editorial', name: 'Editorial', head: 'playfair', body: 'worksans' },
  { key: 'bold', name: 'Bold', head: 'bebasneue', body: 'montserrat' },
]
const SHAPES = [
  { k: 'square', name: 'Rectangle', r: 0 },
  { k: 'rounded', name: 'Soft', r: 10 },
  { k: 'pill', name: 'Pill', r: 999 },
] as const
const PAGES: { k: string; label: string; blurb: string; locked?: boolean; soon?: boolean }[] = [
  { k: 'home', label: 'Home', blurb: 'Your front page', locked: true },
  { k: 'book', label: 'Booking', blurb: 'Check dates, send an inquiry', locked: true },
  { k: 'galleries', label: 'Galleries', blurb: 'Your work, gallery by gallery' },
  { k: 'about', label: 'About', blurb: 'Your story' },
  { k: 'blog', label: 'Blog', blurb: 'Posts and stories', soon: true },
  { k: 'pricing', label: 'Pricing', blurb: 'Your packages', soon: true },
  { k: 'faq', label: 'FAQ', blurb: 'Common questions', soon: true },
]

const glass = 'rounded-2xl border border-white/70 bg-white/60 backdrop-blur-xl shadow-[0_18px_40px_-22px_rgba(90,50,60,0.45)]'
const accentBtn = 'rounded-xl bg-[color-mix(in_srgb,rgb(var(--scene-a,201_133_136))_65%,#e6e6e6)] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50'
const ghostBtn = 'rounded-xl border border-white/80 bg-white/60 px-5 py-2.5 text-sm font-medium text-ink transition hover:bg-white/80'
const ringOn = 'border-[rgb(var(--scene-b,201_133_136))] ring-2 ring-[rgb(var(--scene-b,201_133_136))]'
const fam = (k: string) => FONT_OPTIONS[k]?.family ?? 'serif'
const fname = (k: string) => { const o = FONT_OPTIONS[k] as unknown as Record<string, string> | undefined; return o?.label ?? o?.name ?? k }
const FONT_IDS = Object.keys(FONT_OPTIONS)
type Pick = { key: string; text: string; left: number; top: number; color: string }
const PICK_LABELS: Record<string, string> = { hero_headline: 'Headline', menu_links: 'Menu links', menu_brand: 'Your name', ex_label: 'Section label', ex_title: 'Section title', ex_sub: 'Section subtitle', con_msg: 'Contact message', con_social: 'Social links', ft_line: 'Footer line', ft_copy: 'Copyright', gal_name: 'Gallery name', gal_count: 'Gallery count', gal_link: 'Gallery link', tes_quote: 'Testimonial', tes_name: 'Testimonial name', about_text: 'About text', pr_intro: 'Package intro', pr_group: 'Package group', pr_name: 'Package name', pr_price: 'Package price', pr_list: 'Package list', pr_note: 'Package note', faq_q: 'Question', faq_a: 'Answer' }
const TEXT_KEYS = ['hero_headline', 'menu_brand', 'about_text', 'con_msg', 'ft_line', 'ft_copy']
const LONG_TEXT = ['about_text', 'con_msg']
const PICK_COLORS = [...TEXTS.slice(0, 7), ...ACCENTS.slice(0, 14), '#FFFFFF']
const rgbHex = (c: string) => { const m = c.match(/\d+/g); if (!m || m.length < 3) return '#2A1F24'; return '#' + m.slice(0, 3).map((x) => Number(x).toString(16).padStart(2, '0')).join('').toUpperCase() }

function Mock({ k, bg, tx }: { k: string; bg: string; tx: string }) {
  const dark = k === 'moody'
  const a = dark ? '#3a3340' : '#dcc7b5'
  const b = dark ? '#221e27' : '#b99d89'
  const L = (x: number, y: number, w: number, o = 0.8, h = 3, f = tx) => <rect x={x} y={y} width={w} height={h} rx={1.5} fill={f} opacity={o} />
  const nav = (
    <g>
      {L(10, 6, 24, 0.9)}
      {L(100, 6.5, 12, 0.4, 2)}{L(116, 6.5, 12, 0.4, 2)}{L(132, 6.5, 12, 0.4, 2)}
    </g>
  )
  const id = 'g' + k
  return (
    <svg viewBox="0 0 160 100" className="block w-full" role="img" aria-label={k}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></linearGradient></defs>
      <rect width="160" height="100" fill={bg} />
      {nav}
      {k === 'airy' && (<g>{L(52, 34, 56, 0.85, 4)}{L(64, 44, 32, 0.35, 2)}<rect x="66" y="52" width="28" height="8" fill={tx} />{<rect x="30" y="68" width="100" height="26" fill={`url(#${id})`} />}</g>)}
      {k === 'classic' && (<g><rect x="0" y="16" width="160" height="84" fill={`url(#${id})`} />{L(48, 48, 64, 0.95, 5, '#fff')}{L(60, 58, 40, 0.7, 2, '#fff')}<rect x="66" y="68" width="28" height="8" fill="none" stroke="#fff" strokeWidth="1" /></g>)}
      {k === 'romantic' && (<g><rect x="22" y="18" width="116" height="66" fill="none" stroke={tx} strokeWidth="0.8" opacity="0.5" /><rect x="27" y="23" width="106" height="56" fill={`url(#${id})`} />{L(56, 90, 48, 0.8, 3)}</g>)}
      {k === 'bold' && (<g>{L(10, 20, 140, 1, 10)}{L(10, 33, 96, 1, 10)}<rect x="10" y="50" width="140" height="44" fill={`url(#${id})`} /></g>)}
      {k === 'moody' && (<g><rect x="0" y="16" width="160" height="84" fill={`url(#${id})`} />{L(14, 64, 76, 0.95, 5)}{L(14, 74, 44, 0.45, 2)}<rect x="14" y="82" width="28" height="8" fill={tx} /></g>)}
      {k === 'mosaic' && (<g>{L(10, 17, 50, 0.85, 4)}<rect x="10" y="26" width="46" height="36" fill={`url(#${id})`} /><rect x="60" y="26" width="40" height="22" fill={`url(#${id})`} opacity="0.8" /><rect x="104" y="26" width="46" height="36" fill={`url(#${id})`} opacity="0.9" /><rect x="60" y="52" width="40" height="40" fill={`url(#${id})`} opacity="0.7" /><rect x="10" y="66" width="46" height="26" fill={`url(#${id})`} opacity="0.85" /><rect x="104" y="66" width="46" height="26" fill={`url(#${id})`} opacity="0.75" /></g>)}
      {k === 'clean' && (<g>{L(12, 36, 56, 0.85, 5)}{L(12, 46, 40, 0.35, 2)}<rect x="12" y="56" width="28" height="8" fill={tx} /><rect x="84" y="16" width="76" height="84" fill={`url(#${id})`} /></g>)}
    </svg>
  )
}

function FontPick({ label, hint, value, onPick }: { label: string; hint: string; value: string; onPick: (k: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl border border-white/80 bg-white/60 p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">{label}</p>
      <p className="text-xs text-ink-soft">{hint}</p>
      <button type="button" onClick={() => setOpen(!open)} className="mt-2 flex w-full items-center justify-between rounded-lg bg-white px-3 py-2 text-left text-lg text-ink" style={{ fontFamily: fam(value) }}>
        <span>{fname(value)}</span><span className="text-xs text-ink-soft">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="mt-2 max-h-52 overflow-y-auto rounded-lg border border-white/80 bg-white">
          {FONT_IDS.map((k) => (
            <button key={k} type="button" onClick={() => { onPick(k); setOpen(false) }} className={'block w-full px-3 py-2 text-left text-base text-ink hover:bg-paper ' + (k === value ? 'bg-paper' : '')} style={{ fontFamily: fam(k) }}>{fname(k)}</button>
          ))}
        </div>
      )}
    </div>
  )
}

const HOME_SECS: [string, string][] = [['explore', 'Explore'], ['portfolio', 'Portfolio'], ['testimonials', 'Testimonials'], ['contact', 'Contact']]

export default function CamiDesigner() {
  const router = useRouter()
  const [form, setForm] = useState<Prof | null>(null)
  const [history, setHistory] = useState<Prof[]>([])
  const [tab, setTab] = useState<Tab>('style')
  const [device, setDevice] = useState<'desktop' | 'phone'>('desktop')
  const [ig, setIg] = useState('')
  const [fb, setFb] = useState('')
  const [tt, setTt] = useState('')
  const [pin, setPin] = useState('')
  const [styleSel, setStyleSel] = useState<string | null>(null)
  const [typeSel, setTypeSel] = useState<string | null>(null)
  const [ownFonts, setOwnFonts] = useState(false)
  const [role, setRole] = useState<'accent' | 'bg' | 'text'>('accent')
  const [hexIn, setHexIn] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [pick, setPick] = useState<Pick | null>(null)
  const [ptext, setPtext] = useState('')
  const [phex, setPhex] = useState('')
  const frameRef = useRef<HTMLIFrameElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const latest = useRef<Prof | null>(null)
  const [msgs, setMsgs] = useState<Msg[]>([{ from: 'cami', text: "Hi, I'm Camri. What should I change?" }])
  const [camBusy, setCamBusy] = useState(false)
  const [tour, setTour] = useState<number | null>(null)
  const TOUR_Q = ["Let's build your site together. First, what feeling do you want?", 'Now pick your colors.', 'Now your lettering.', 'How should your buttons look?', 'Last one. Tell me what you shoot and where, and I will write your headline.']
  const tourPick = async (label: string, fn: (n: any) => void, next: number) => {
    setMsgs((m) => [...m, { from: 'you', text: label }])
    await commit((n) => { n.site_settings = n.site_settings ?? {}; fn(n) })
    setMsgs((m) => [...m, { from: 'cami', text: TOUR_Q[next] }])
    setTour(next)
  }
  const chip = 'rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs text-ink transition hover:border-twilight'

  const [input, setInput] = useState('')
  const chatEnd = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<'pages' | 'design' | 'settings'>('pages')
  const [curPage, setCurPage] = useState('home')
  const [showSet, setShowSet] = useState(false)
  const [confirmRestart, setConfirmRestart] = useState(false)
  const [sub, setSub] = useState<Tab | null>(null)
  const [camiOpen, setCamiOpen] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [pubMsg, setPubMsg] = useState('')
  const [full, setFull] = useState(false)
  const [setupSkipped, setSetupSkipped] = useState(false)
  const [setupFinished, setSetupFinished] = useState(false)
  const [review, setReview] = useState(false)
  const [setupForce] = useState(() => typeof window !== 'undefined' && window.location.search.includes('setup=1'))
  const commitRef = useRef<((fn: (n: Prof) => void) => Promise<void>) | null>(null)

  useEffect(() => {
    async function load() {
      const sb = supabase
      if (!sb) { router.push('/login'); return }
      const { data: sess } = await sb.auth.getSession()
      if (!sess.session) { router.push('/login'); return }
      const { data, error } = await sb.from('profiles').select(COLS + ', site_draft').eq('id', sess.session.user.id).single()
      if (error) { setErr(error.message.includes('site_draft') ? 'Run the website draft SQL in Supabase first.' : error.message); return }
      const raw = data as unknown as Prof & { site_draft?: Partial<Prof> | null }
      const dr = raw.site_draft
      const p = (dr ? { ...raw, ...dr } : raw) as Prof
      latest.current = p
      setDirty(!!dr)
      setForm(p)
      setIg(p.instagram_url ?? ''); setFb(p.facebook_url ?? ''); setTt(p.tiktok_url ?? ''); setPin(p.pinterest_url ?? '')
    }
    load()
  }, [router])

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, tab])

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      const d = e.data
      if (d && d.type === 'camrhia-preview-ready' && e.source === frameRef.current?.contentWindow) { if (latest.current) pushPatch(latest.current); return }
      if (d && d.type === 'camrhia-section' && e.source === frameRef.current?.contentWindow) {
        commitRef.current?.((n) => {
          const s = (n.site_settings = n.site_settings ?? {})
          if (d.action === 'hide') {
            const h: string[] = Array.isArray(s.hiddenSecs) ? s.hiddenSecs : []
            if (!h.includes(d.key)) s.hiddenSecs = [...h, d.key]
            return
          }
          const ord: string[] = [...(d.order as string[])]
          const from = ord.indexOf(d.key)
          if (from < 0) return
          ord.splice(from, 1)
          ord.splice(Math.max(0, Math.min(ord.length, Number(d.to))), 0, d.key)
          s.order_home = ord.includes('explore') ? ord : ['explore', ...ord]
        })
        return
      }
      if (!d || d.type !== 'camrhia-pick' || e.source !== frameRef.current?.contentWindow) return
      const f = frameRef.current!.getBoundingClientRect()
      const b = boxRef.current?.getBoundingClientRect()
      if (!b) return
      const left = Math.max(8, Math.min(b.width - 348, f.left - b.left + d.x))
      const top = Math.max(8, Math.min(b.height - 140, f.top - b.top + d.y + d.h + 10))
      setPick({ key: d.key, text: d.text ?? '', left, top, color: rgbHex(String(d.color ?? '')) })
      setPtext(d.text ?? '')
      setPhex('')
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [])

  function pushPatch(p: Prof) {
    latest.current = p
    try {
      frameRef.current?.contentWindow?.postMessage({ type: 'camrhia-preview', patch: { site_template: p.site_template, site_accent: p.site_accent, site_font_pair: p.site_font_pair, site_headline: p.site_headline, site_subhead: p.site_subhead, site_settings: p.site_settings, instagram_url: p.instagram_url, facebook_url: p.facebook_url, tiktok_url: p.tiktok_url, pinterest_url: p.pinterest_url } }, '*')
    } catch { /* ignore */ }
  }

  async function save(next: Prof) {
    const sb = supabase
    if (!sb) return
    pushPatch(next)
    setDirty(true)
    const draft = {
      site_template: next.site_template ?? 'editorial',
      site_accent: next.site_accent,
      site_font_pair: next.site_font_pair ?? 'serif',
      site_headline: next.site_headline?.trim() || null,
      site_subhead: next.site_subhead?.trim() || null,
      site_settings: next.site_settings ?? {},
      instagram_url: next.instagram_url,
      facebook_url: next.facebook_url,
      tiktok_url: next.tiktok_url,
      pinterest_url: next.pinterest_url,
    }
    const { error } = await sb.from('profiles').update({ site_draft: draft }).eq('id', next.id)
    if (error) { setErr(error.message.includes('site_draft') ? 'Run the website draft SQL in Supabase first.' : error.message); return }
    setErr(null)
  }

  async function publish() {
    const sb = supabase
    if (!sb || !form) return
    setBusy(true)
    const live = {
      site_template: form.site_template ?? 'editorial',
      site_accent: form.site_accent,
      site_font_pair: form.site_font_pair ?? 'serif',
      site_headline: form.site_headline?.trim() || null,
      site_subhead: form.site_subhead?.trim() || null,
      site_settings: form.site_settings ?? {},
      instagram_url: ig.trim() || null,
      facebook_url: fb.trim() || null,
      tiktok_url: tt.trim() || null,
      pinterest_url: pin.trim() || null,
    }
    const { error } = await sb.from('profiles').update({ ...live, site_draft: null }).eq('id', form.id)
    setBusy(false)
    if (error) { setErr(error.message); return }
    setErr(null)
    setForm({ ...form, ...live })
    setDirty(false)
    setPubMsg('Published. Your site is live.')
    setTimeout(() => setPubMsg(''), 3000)
  }

  async function commit(fn: (n: Prof) => void) {
    if (!form) return
    const next = clone(form)
    fn(next)
    setHistory((h) => [...h, form])
    setForm(next)
    await save(next)
  }

  commitRef.current = commit

  function kitOf(n: Prof) {
    const x = (n.site_settings = n.site_settings ?? {}) as Record<string, any>
    if (!x.kit) x.kit = { done: true, layouts: [], palettes: [], fonts: [], pages: [], extra_pages: '', themes: [] }
    if (!Array.isArray(x.kit.themes)) x.kit.themes = []
    return x.kit as Record<string, any>
  }
  function snapTheme(n: Prof, name: string) {
    const { kit: _k, ...rest } = (n.site_settings ?? {}) as Record<string, any>
    return { name, site_template: n.site_template, site_accent: n.site_accent, site_font_pair: n.site_font_pair, site_headline: n.site_headline, site_subhead: n.site_subhead, settings: JSON.parse(JSON.stringify(rest)) }
  }
  function saveThemeAs(n: Prof, name: string) {
    const k = kitOf(n)
    const snap = snapTheme(n, name)
    const i = k.themes.findIndex((t: any) => t.name === name)
    if (i >= 0) k.themes[i] = snap
    else k.themes.push(snap)
  }
  function applyKitOps(n: Prof, kc: Record<string, any>) {
    const k = kitOf(n)
    const x = n.site_settings as Record<string, any>
    if (kc.save_theme && !k.themes.some((t: any) => t.name === 'Main')) k.themes.push(snapTheme(n, 'Main'))
    if (kc.role_font) {
      const { role, font } = kc.role_font
      if (role === 'title') { x.fonts = { ...(x.fonts ?? {}), head: font }; x.hero = { ...(x.hero ?? {}), headline_font: font } }
      else if (role === 'subtitle') x.hero = { ...(x.hero ?? {}), subhead_font: font }
      else if (role === 'paragraph') { x.fonts = { ...(x.fonts ?? {}), body: font }; x.hero = { ...(x.hero ?? {}), para_font: font } }
    }
    if (kc.move_section || kc.add_page || kc.remove_page) {
      const stc: any = structureOf(n as any)
      const PG = ['home', 'about', 'galleries']
      const take = (sec: string) => { for (const pg of PG) stc[pg] = stc[pg].filter((q: string) => q !== sec); for (const e of stc.extra) e.sections = e.sections.filter((q: string) => q !== sec) }
      if (kc.add_page && stc.extra.length < 8 && !stc.extra.some((e: any) => e.id === kc.add_page.id)) {
        const secs: string[] = kc.add_page.sections ?? []
        secs.forEach(take)
        stc.extra.push({ id: kc.add_page.id, label: kc.add_page.label, sections: secs })
      }
      if (kc.move_section) {
        const { section, to } = kc.move_section
        take(section)
        if (PG.includes(to)) stc[to].push(section)
        else { const e = stc.extra.find((q: any) => q.id === to); if (e) e.sections.push(section) }
      }
      if (kc.remove_page) stc.extra = stc.extra.filter((e: any) => e.id !== kc.remove_page)
      x.structure = stc
    }
    if (kc.layout) {
      const L: string[] = k.layouts ?? []
      if (L.length) {
        let i = Number(k.layout_idx ?? 0)
        if (kc.layout === 'next') i = (i + 1) % L.length
        else if (kc.layout === 'prev') i = (i - 1 + L.length) % L.length
        else if (L.includes(kc.layout)) i = L.indexOf(kc.layout)
        k.layout_idx = i
        const st = STYLES.find((q) => q.key === L[i])
        if (st) n.site_template = st.tpl
      }
    }
    if (kc.palette) { const p = (k.palettes ?? []).find((q: any) => q.name === kc.palette); if (p) applyPalette(n, p.accent, p.bg, p.text) }
    if (kc.fonts) {
      const ts = TYPE_SETS.find((t) => t.key === kc.fonts)
      if (ts) {
        clearFontOverrides(x)
        if (ts.pair) n.site_font_pair = ts.pair
        else { x.fonts = { ...(x.fonts ?? {}), head: ts.head, body: ts.body }; x.hero = { ...(x.hero ?? {}), headline_font: ts.head, para_font: ts.body } }
      }
    }
    if (kc.heading_font) { x.fonts = { ...(x.fonts ?? {}), head: kc.heading_font }; x.hero = { ...(x.hero ?? {}), headline_font: kc.heading_font } }
    if (kc.body_font) { x.fonts = { ...(x.fonts ?? {}), body: kc.body_font }; x.hero = { ...(x.hero ?? {}), para_font: kc.body_font } }
    if (kc.theme) {
      const t = k.themes.find((q: any) => q.name === kc.theme)
      if (t) {
        n.site_template = t.site_template; n.site_accent = t.site_accent; n.site_font_pair = t.site_font_pair; n.site_headline = t.site_headline; n.site_subhead = t.site_subhead
        n.site_settings = { ...JSON.parse(JSON.stringify(t.settings)), kit: k }
      }
    }
  }

  async function undo() {
    const prev = history[history.length - 1]
    if (!prev) return false
    setHistory((h) => h.slice(0, -1))
    setForm(prev)
    await save(prev)
    return true
  }

  async function send(text: string) {
    setCamBusy(true)
    try { await sendInner(text) } finally { setCamBusy(false) }
  }
  async function sendInner(text: string) {
    const t = text.trim()
    if (!t || !form) return
    setMsgs((m) => [...m, { from: 'you', text: t }])
    setInput('')
    if (/^\s*(undo|go back|revert|that was wrong|put it back)\b/i.test(t)) {
      const ok = await undo()
      setMsgs((m) => [...m, { from: 'cami', text: ok ? 'Undone.' : 'Nothing to undo yet.' }])
      return
    }
    if (tour === 4) setTour(null)
    let aiDone = false
    try {
      const sess = (await supabase?.auth.getSession())?.data.session
      const st0 = form.site_settings ?? {}
      const kk = (st0 as any).kit ?? {}
      const kitPayload = { layouts: (kk.layouts ?? []).map((key: string) => ({ key, name: STYLES.find((q) => q.key === key)?.name ?? key })), palettes: (kk.palettes ?? []).map((p: any) => ({ name: p.name })), fonts: (kk.fonts ?? []).map((key: string) => ({ key, name: TYPE_SETS.find((t) => t.key === key)?.name ?? key })), themes: (kk.themes ?? []).map((t: any) => t.name), type: kk.type ?? null }
      let planNote = ''
      let madeImgs: { name: string; edge: string; url: string }[] = []
      if (/christmas|halloween|holiday|valentine|thanksgiving|easter|fourth of july|seasonal|animat|snow|sparkle|confetti|effect|magic|wow|dramatic|glow|twinkl|scene|theme|vibe|season|beach|summer|winter|spring|autumn|tropical|ocean|forest|boho|desert|mountain|sunset|night sky/i.test(t)) {
        try {
          const pr = await fetch('/api/ai/camri-plan', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sess?.access_token ?? ''}` }, body: JSON.stringify({ message: t }) })
          const pj = pr.ok ? await pr.json() : null
          const planImgs0 = Array.isArray(pj?.images) ? pj.images : []
          if (pj?.text) {
            await sayTyped(pj.text + (planImgs0.length ? ' Making your scenery pictures now. This takes about 40 seconds.' : ''))
            planNote = '\\n\\n(You already told them this plan out loud and must build it: ' + pj.text + ' Use this fresh angle: ' + pj.twist + '.)'
          }
          const planImgs: { name: string; edge: string; prompt: string }[] = Array.isArray(pj?.images) ? pj.images : []
          if (!pr.ok) setMsgs((m) => [...m, { from: 'cami', text: 'My planning step did not answer (' + pr.status + '), so no pictures were made.' }])
          else if (!planImgs.length) setMsgs((m) => [...m, { from: 'cami', text: 'No picture prompts came back from my plan, so no pictures were made.' }])
          madeImgs = (await Promise.all(planImgs.map(async (im) => {
            try {
              const rr = await fetch('/api/ai/camri-image', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sess?.access_token ?? ''}` }, body: JSON.stringify({ name: im.name, prompt: im.prompt, shape: 'wide' }) })
              if (!rr.ok) {
                const tx = await rr.text().catch(() => '')
                console.error('camri-image status', rr.status, tx)
                let why = tx
                try { const pj2 = JSON.parse(tx); why = pj2.detail || pj2.error || tx } catch { /* plain text */ }
                setMsgs((m) => [...m, { from: 'cami', text: "I couldn't make the " + im.name + " picture. " + String(why).slice(0, 300) }])
                return null
              }
              const jj = await rr.json()
              return jj?.url ? { ...im, url: jj.url as string } : null
            } catch (e) {
              console.error('camri-image failed', e)
              setMsgs((m) => [...m, { from: 'cami', text: "I couldn't make the " + im.name + ' picture. The connection dropped: ' + String((e as any)?.message ?? e).slice(0, 120) }])
              return null
            }
          }))).filter(Boolean) as { name: string; edge: string; url: string }[]
          if (madeImgs.length) planNote += "\\n\\n(A photoreal backdrop picture was just generated and is already pinned behind the whole page by the builder, so do not use any image in your css and do not draw scenery with emoji or css. Design the look to sit over a rich dark photographic backdrop: light, high-contrast text with soft text shadows, and no solid full-width section background colors.)"
        } catch (e) { console.error('camri-plan failed', e) }
      }
      const res = await fetch('/api/ai/camri-site', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sess?.access_token ?? ''}` }, body: JSON.stringify({ message: (tour === 4 ? 'Write my homepage headline and subhead. About me: ' + t : t) + planNote, history: msgs.slice(-10).map((m: any) => ({ from: m.from === 'cami' ? 'cami' : 'me', text: m.text })), site: { template: form.site_template, accent: form.site_accent, font_pair: form.site_font_pair, headline: form.site_headline, subhead: form.site_subhead, bg: st0.colors?.bg, text: st0.colors?.text, buttons: st0.button?.shape, css: st0.custom_css, js: st0.custom_js }, kit: kitPayload, structure: structureOf(form as any), page: curPage, fontList: FONT_IDS.slice(0, 150).map((id) => ({ id, label: fname(id) })) }) })
      if (!res.ok) console.error('camri-site status', res.status, await res.clone().text().catch(() => ''))
      const ai = res.ok ? await res.json() : null
      if (ai?.reply && ai.changes) {
        const ch = ai.changes
        if (madeImgs.length) {
          let extra = ''
          for (const im of madeImgs) {
            if (String(ch.css ?? '').includes(im.url)) continue
            extra += ' html{background:linear-gradient(rgba(8,12,24,.35),rgba(8,12,24,.35)) fixed,url(' + im.url + ') center/cover fixed no-repeat!important} html body,body > div,body > div > div,body main,body section,body header,body nav,body footer{background:transparent!important}'
          }
          if (extra) ch.css = String(typeof ch.css === 'string' ? ch.css : (st0.custom_css ?? '')) + extra
        }
        if (Array.isArray(ch.images) && ch.images.length && typeof ch.css === 'string') {
          const made = await Promise.all(ch.images.map(async (im: any) => {
            try {
              const rr = await fetch('/api/ai/camri-image', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sess?.access_token ?? ''}` }, body: JSON.stringify({ name: im.name, prompt: im.prompt, shape: im.shape }) })
              if (!rr.ok) { console.error('camri-image status', rr.status, await rr.text().catch(() => '')); return null }
              const jj = await rr.json()
              return jj?.url ? { name: im.name, url: jj.url } : null
            } catch (e) { console.error('camri-image failed', e); return null }
          }))
          for (const d of made) if (d) ch.css = String(ch.css).split('IMG:' + d.name).join(d.url)
        }
        if (ch.style || ch.palette || ch.font_pair || ch.buttons || ch.headline || ch.subhead || typeof ch.css === 'string' || typeof ch.js === 'string' || ch.kit) {
          await commit((n) => {
            n.site_settings = n.site_settings ?? {}
            if (ch.kit) applyKitOps(n, ch.kit)
            const sty = ch.style ? STYLES.find((x) => x.key === ch.style) : null
            if (sty) { n.site_template = sty.tpl; n.site_font_pair = sty.pair; applyPalette(n, n.site_accent ?? '#C98A8D', sty.bg, sty.text) }
            if (ch.palette) applyPalette(n, ch.palette.accent, ch.palette.bg, ch.palette.text)
            if (ch.font_pair) n.site_font_pair = ch.font_pair
            if (ch.buttons) setButtons(n.site_settings, ch.buttons)
            if (ch.headline) n.site_headline = ch.headline
            if (ch.subhead) n.site_subhead = ch.subhead
            if (typeof ch.css === 'string') { if (ch.css) n.site_settings.custom_css = ch.css; else delete n.site_settings.custom_css }
            if (typeof ch.js === 'string') { if (ch.js) n.site_settings.custom_js = ch.js; else delete n.site_settings.custom_js }
            if (ch.kit?.save_theme) saveThemeAs(n, ch.kit.save_theme)
          })
        }
        sayTyped(ai.reply)
        aiDone = true
        if (ai.next === 'js') {
          try {
            const r2 = await fetch('/api/ai/camri-site', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sess?.access_token ?? ''}` }, body: JSON.stringify({ message: '[[JS]] ' + t + planNote, history: [], site: { template: form.site_template, accent: form.site_accent, font_pair: form.site_font_pair, headline: form.site_headline, subhead: form.site_subhead, css: typeof ch.css === 'string' ? ch.css : st0.custom_css, js: st0.custom_js }, kit: kitPayload, structure: structureOf(form as any), page: curPage, fontList: [] }) })
            if (!r2.ok) console.error('camri-site js status', r2.status)
            const ai2 = r2.ok ? await r2.json() : null
            if (typeof ai2?.changes?.js === 'string' && ai2.changes.js) {
              await commit((n) => { n.site_settings = n.site_settings ?? {}; n.site_settings.custom_js = ai2.changes.js })
              sayTyped(ai2.reply)
            }
          } catch (e) { console.error('camri-site js step failed', e) }
        }
      }
    } catch (e) { console.error('camri-site failed', e) }
    const r = aiDone ? { changed: false, state: form, reply: '' } : camiSite(t, form)
    if (r.changed) await commit((n) => { n.site_template = r.state.site_template; n.site_accent = r.state.site_accent; n.site_font_pair = r.state.site_font_pair; n.site_headline = r.state.site_headline; n.site_subhead = r.state.site_subhead; n.site_settings = r.state.site_settings })
    if (!aiDone) setMsgs((m) => [...m, { from: 'cami', text: r.reply }])
  }

  // Camri's words appear one at a time, like she is thinking as she builds.
  async function sayTyped(text: string): Promise<void> {
    const full = String(text)
    const words = full.split(' ')
    setMsgs((m) => [...m, { from: 'cami', text: words[0] }])
    await (async () => {
      for (let wi = 2; wi <= words.length; wi++) {
        await new Promise((r) => setTimeout(r, 190))
        const part = words.slice(0, wi).join(' ')
        setMsgs((m) => {
          const k = [...m].reverse().findIndex((x) => x.from === 'cami' && full.startsWith(x.text) && part.startsWith(x.text) && x.text.length >= words[0].length)
          if (k < 0) return m
          const idx = m.length - 1 - k
          const c = [...m]
          c[idx] = { ...c[idx], text: part }
          return c
        })
      }
    })()
  }

  async function addPhotos(files: FileList | null) {
    const sb = supabase
    if (!files || !form || !sb) return
    setBusy(true)
    try {
      const cur: string[] = [...(form.site_settings?.hero?.photos ?? [])]
      for (const f of Array.from(files)) {
        if (cur.length >= 6) break
        const v = await makeVersions(f)
        const path = `${form.id}/hero_${Date.now()}_${cur.length}.jpg`
        const up = await sb.storage.from('portfolio').upload(path, v.web.blob, { contentType: 'image/jpeg', upsert: true })
        if (up.error) throw up.error
        cur.push(path)
      }
      await commit((n) => { const s = (n.site_settings = n.site_settings ?? {}); s.hero = { ...(s.hero ?? {}), photos: cur, slideshow: cur.length > 1 } })
    } catch (e) {
      setErr((e as { message?: string })?.message ?? 'Upload failed.')
    } finally {
      setBusy(false)
    }
  }
  async function removePhoto(path: string) {
    await commit((n) => { const s = (n.site_settings = n.site_settings ?? {}); const l = ((s.hero?.photos ?? []) as string[]).filter((p) => p !== path); s.hero = { ...(s.hero ?? {}), photos: l, slideshow: l.length > 1 } })
  }

  async function saveSocial() {
    if (!form) return
    const patch = { instagram_url: ig.trim() || null, facebook_url: fb.trim() || null, tiktok_url: tt.trim() || null, pinterest_url: pin.trim() || null }
    const next = { ...form, ...patch }
    setHistory((h) => [...h, form])
    setForm(next)
    await save(next)
  }

  if (!form) return <p className="text-sm text-ink-soft">{err ?? 'Loading…'}</p>
  const kitDone = !!(form.site_settings as any)?.kit?.done
  const siteEmpty = !form.site_headline && Object.keys(form.site_settings ?? {}).length === 0
  if (!setupFinished && (setupForce || review || !kitDone)) {
    return (
      <CamriSetup
        styles={STYLES} palettes={PALETTES} typeSets={TYPE_SETS} pages={PAGES} fam={fam} structure={review ? structureOf(form as any) : { v: 1 as const, home: [], about: [], galleries: [], extra: [], off: [] }}
        links={{ instagram_url: String((form as any).instagram_url ?? ''), facebook_url: String((form as any).facebook_url ?? ''), tiktok_url: String((form as any).tiktok_url ?? ''), pinterest_url: String((form as any).pinterest_url ?? '') }}
        fontList={FONT_IDS.map((id) => ({ id, label: fname(id), family: fam(id), gf: String((FONT_OPTIONS[id] as any)?.gf ?? ''), cat: String((FONT_OPTIONS[id] as any)?.cat ?? (FONT_OPTIONS[id] as any)?.category ?? (FONT_OPTIONS[id] as any)?.kind ?? (FONT_OPTIONS[id] as any)?.group ?? '') }))}
        startStep={review ? 1 : 0}
        onCancel={review ? () => { setReview(false); setSetupFinished(true) } : undefined}
        initial={review ? (() => { const k0: any = (form.site_settings as any)?.kit ?? {}; return { layouts: (k0.layouts ?? []) as string[], palettes: ((k0.palettes ?? []) as any[]).map((q) => ({ name: String(q.name), accent: String(q.accent), bg: String(q.bg), text: String(q.text) })), fonts: (k0.fonts ?? []) as string[], type: k0.type ?? undefined } })() : undefined}
        onSkip={() => setSetupSkipped(true)}
        onFinish={async (kit, struct, links) => {
          await commit((n) => {
            const x = (n.site_settings = n.site_settings ?? {})
            x.structure = struct
            const nn = n as any
            nn.instagram_url = links.instagram_url.trim() || null
            nn.facebook_url = links.facebook_url.trim() || null
            nn.tiktok_url = links.tiktok_url.trim() || null
            nn.pinterest_url = links.pinterest_url.trim() || null
            const prev: any = x.kit ?? null
            const same = (a: any, b: any) => JSON.stringify([a?.accent, a?.bg, a?.text]) === JSON.stringify([b?.accent, b?.bg, b?.text])
            const layoutNew = !prev || prev.layouts?.[0] !== kit.layouts[0]
            const palNew = !prev || !same(prev.palettes?.[0], kit.palettes[0])
            const fontNew = !prev || (['title', 'subtitle', 'paragraph'] as const).some((r) => (prev.type?.[r]?.[0] ?? null) !== (kit.type[r][0] ?? null))
            if (layoutNew) {
              const sty = STYLES.find((st) => st.key === kit.layouts[0])
              if (sty) { n.site_template = sty.tpl; n.site_font_pair = sty.pair; applyPalette(n, n.site_accent ?? '#C98A8D', sty.bg, sty.text) }
            }
            const pal = kit.palettes[0]
            if (pal && (layoutNew || palNew)) applyPalette(n, pal.accent, pal.bg, pal.text)
            if (fontNew) {
              clearFontOverrides(x)
              const tt = kit.type.title[0]
              const sb = kit.type.subtitle[0]
              const pp = kit.type.paragraph[0]
              if (tt) { x.fonts = { ...(x.fonts ?? {}), head: tt }; x.hero = { ...(x.hero ?? {}), headline_font: tt } }
              if (pp) { x.fonts = { ...(x.fonts ?? {}), body: pp }; x.hero = { ...(x.hero ?? {}), para_font: pp } }
              if (sb) x.hero = { ...(x.hero ?? {}), subhead_font: sb }
            }
            x.kit = prev ? { ...kit, themes: prev.themes ?? [], layout_idx: prev.layout_idx } : kit
          })
          setSetupFinished(true)
        }}
      />
    )
  }


  const photos: string[] = form.site_settings?.hero?.photos ?? []
  const set = form.site_settings ?? {}
  const colors = set.colors ?? {}
  const accent: string = form.site_accent ?? '#C98A8D'
  const bg: string = colors.bg ?? '#FAF7F2'
  const txt: string = colors.text ?? '#2A1F24'
  const curShape: string = set.button?.shape ?? 'square'
  const hidden: string[] = Array.isArray(set.menu?.hidden) ? set.menu.hidden : []
  const pairs = PAIR_PRESETS as unknown as Record<string, { head: string; body: string }>
  const pr = pairs[form.site_font_pair ?? 'serif'] ?? pairs.serif
  const curHead: string = set.fonts?.head ?? pr.head
  const curBody: string = set.fonts?.body ?? pr.body
  const curSub: string = set.hero?.para_font ?? curBody
  const idx = TABS.indexOf(tab)
  const roleVal = role === 'accent' ? accent : role === 'bg' ? bg : txt
  const swatches = role === 'accent' ? ACCENTS : role === 'bg' ? BGS : TEXTS
  const hiddenSecs: string[] = Array.isArray(set.hiddenSecs) ? set.hiddenSecs : []
  const homeKnown = HOME_SECS.map(([k]) => k)
  const homeCustom: string[] = ((set.customs ?? []) as { id: string; page: string }[]).filter((c) => c.page === 'home').map((c) => c.id)
  const savedHome: string[] = Array.isArray(set.order_home) ? set.order_home : []
  const homeFull: string[] = [...savedHome.filter((k) => homeKnown.includes(k) || homeCustom.includes(k)), ...homeKnown.filter((k) => !savedHome.includes(k)), ...homeCustom.filter((k) => !savedHome.includes(k))]
  const homeOrder: string[] = homeFull.filter((k) => homeKnown.includes(k))

  function pickColor(v: string) {
    commit((n) => applyPalette(n, role === 'accent' ? v : n.site_accent ?? accent, role === 'bg' ? v : n.site_settings?.colors?.bg ?? bg, role === 'text' ? v : n.site_settings?.colors?.text ?? txt))
  }
  function moveSec(k: string, dir: number) {
    const i = homeOrder.indexOf(k)
    const j = i + dir
    if (i < 0 || j < 0 || j >= homeOrder.length) return
    const other = homeOrder[j]
    commit((n) => {
      const s = (n.site_settings = n.site_settings ?? {})
      const full = [...homeFull]
      const a = full.indexOf(k)
      const b = full.indexOf(other)
      full[a] = other
      full[b] = k
      s.order_home = full
    })
  }
  function toggleSec(k: string) {
    commit((n) => {
      const s = (n.site_settings = n.site_settings ?? {})
      const h: string[] = Array.isArray(s.hiddenSecs) ? s.hiddenSecs : []
      s.hiddenSecs = h.includes(k) ? h.filter((x) => x !== k) : [...h, k]
    })
  }
  function togglePage(k: string) {
    commit((n) => {
      const s = (n.site_settings = n.site_settings ?? {})
      const h: string[] = Array.isArray(s.menu?.hidden) ? s.menu.hidden : []
      s.menu = { ...(s.menu ?? {}), hidden: h.includes(k) ? h.filter((x) => x !== k) : [...h, k] }
    })
  }
  function clearFontOverrides(s: NonNullable<Prof['site_settings']>) {
    if (s.fonts) { delete s.fonts.head; delete s.fonts.body }
    if (s.hero) { delete s.hero.headline_font; delete s.hero.para_font }
  }
  function setOwn(which: 'head' | 'sub' | 'body', k: string) {
    setTypeSel('own')
    commit((n) => {
      const s = (n.site_settings = n.site_settings ?? {})
      if (which === 'head') { s.fonts = { ...(s.fonts ?? {}), head: k }; s.hero = { ...(s.hero ?? {}), headline_font: k } }
      if (which === 'sub') { s.hero = { ...(s.hero ?? {}), para_font: k } }
      if (which === 'body') { s.fonts = { ...(s.fonts ?? {}), body: k } }
    })
  }

  function setElProp(key: string, patch: { font?: string; color?: string }) {
    commit((n) => {
      const s = (n.site_settings = n.site_settings ?? {})
      if (key === 'hero_headline') { if (patch.font) s.hero = { ...(s.hero ?? {}), headline_font: patch.font }; return }
      s.el = { ...(s.el ?? {}), [key]: { ...(s.el?.[key] ?? {}), ...patch } }
    })
  }
  function resetEl(key: string) {
    commit((n) => {
      const s = (n.site_settings = n.site_settings ?? {})
      if (key === 'hero_headline') { if (s.hero) delete s.hero.headline_font; return }
      if (s.el?.[key]) { delete s.el[key].font; delete s.el[key].color }
    })
  }
  function applyText() {
    if (!pick || !TEXT_KEYS.includes(pick.key) || ptext === pick.text) return
    const v = ptext
    const key = pick.key
    setPick({ ...pick, text: v })
    commit((n) => {
      const s = (n.site_settings = n.site_settings ?? {})
      if (key === 'hero_headline') n.site_headline = v
      else if (key === 'menu_brand') s.menu = { ...(s.menu ?? {}), brand: v }
      else { const f = key === 'about_text' ? 'about' : key === 'con_msg' ? 'contact' : key === 'ft_line' ? 'footer' : 'copyright'; s.text = { ...(s.text ?? {}), [f]: v } }
    })
  }

  function renderStep(k: Tab) {
    if (k === 'style') return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STYLES.map((st) => (
          <button key={st.key} type="button" onClick={async () => {
            setStyleSel(st.key)
            await commit((n) => { const x = (n.site_settings = n.site_settings ?? {}); n.site_template = st.tpl; n.site_font_pair = st.pair; clearFontOverrides(x); applyPalette(n, n.site_accent ?? '#C98A8D', st.bg, st.text) })
          }} className={'rounded-xl border bg-white/70 p-2.5 text-left transition hover:bg-white ' + (styleSel === st.key ? ringOn : 'border-white/80')}>
            <div className="overflow-hidden rounded-lg border border-black/5"><Mock k={st.mock ?? st.key} bg={st.bg} tx={st.text} /></div>
            <p className="mt-2 text-sm font-semibold text-ink">{st.name}</p>
            <p className="text-xs text-ink-soft">{st.blurb}</p>
          </button>
        ))}
      </div>
    )
    if (k === 'pages') return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {PAGES.map((pg) => {
          const on = pg.locked || (!pg.soon && !hidden.includes(pg.k))
          return (
            <button key={pg.k} type="button" disabled={pg.locked || pg.soon} onClick={() => togglePage(pg.k)} className={'flex h-24 flex-col justify-between rounded-xl border bg-white/70 p-3 text-left transition ' + (on ? ringOn : 'border-white/80') + (pg.soon ? ' opacity-50' : ' hover:bg-white')}>
              <span className="flex items-center justify-between">
                <span className="text-sm font-semibold text-ink">{pg.label}</span>
                <span className={'flex h-5 w-5 items-center justify-center rounded-full text-[11px] text-white ' + (on ? 'bg-[color-mix(in_srgb,rgb(var(--scene-a,201_133_136))_65%,#e6e6e6)]' : 'bg-ink/20')}>{on ? '✓' : ''}</span>
              </span>
              <span className="text-xs text-ink-soft">{pg.soon ? 'Coming soon' : pg.locked ? 'Always on' : pg.blurb}</span>
            </button>
          )
        })}
      </div>
    )
    if (k === 'colors') return (
      <div>
        <div className="grid grid-cols-3 gap-2 lg:grid-cols-6">
          {PALETTES.map((pl) => (
            <button key={pl.name} type="button" onClick={() => commit((n) => applyPalette(n, pl.accent, pl.bg, pl.text))} className="rounded-xl border border-white/80 bg-white/70 p-2.5 text-left transition hover:bg-white">
              <div className="flex gap-1">{[pl.accent, pl.bg, pl.text].map((c) => <span key={c} className="h-5 w-5 rounded-full border border-black/15" style={{ background: c }} />)}</div>
              <p className="mt-1.5 text-xs font-medium text-ink">{pl.name}</p>
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {([['accent', 'Main color', accent], ['bg', 'Background', bg], ['text', 'Text', txt]] as const).map(([rk, label, v]) => (
            <button key={rk} type="button" onClick={() => { setRole(rk); setHexIn('') }} className={'flex items-center gap-2 rounded-xl border bg-white/70 px-3 py-2 text-sm text-ink transition hover:bg-white ' + (role === rk ? ringOn : 'border-white/80')}>
              <span className="h-5 w-5 rounded-full border border-black/15" style={{ background: v }} />{label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2.5">
          {swatches.map((c) => (
            <button key={c} type="button" aria-label={c} onClick={() => pickColor(c)} className={'h-8 w-8 rounded-full border border-black/15 transition hover:scale-110 ' + (roleVal.toLowerCase() === c.toLowerCase() ? 'ring-2 ring-offset-2 ring-[rgb(var(--scene-b,201_133_136))]' : '')} style={{ background: c }} />
          ))}
          <input value={hexIn} onChange={(e) => { const v = e.target.value.trim(); setHexIn(v); if (/^#[0-9a-fA-F]{6}$/.test(v)) pickColor(v) }} placeholder="#hex" maxLength={7} className="w-24 rounded-lg border border-white/80 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-twilight" />
        </div>
      </div>
    )
    if (k === 'type') return (
      <div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          {TYPE_SETS.map((t) => (
            <div key={t.key} className="flex flex-col items-center gap-1.5">
              <button type="button" onClick={() => {
                setTypeSel(t.key); setOwnFonts(false)
                commit((n) => {
                  const x = (n.site_settings = n.site_settings ?? {})
                  clearFontOverrides(x)
                  if (t.pair) n.site_font_pair = t.pair
                  else { x.fonts = { ...(x.fonts ?? {}), head: t.head, body: t.body }; x.hero = { ...(x.hero ?? {}), headline_font: t.head, para_font: t.body } }
                })
              }} className={'flex h-28 w-full flex-col justify-center rounded-xl border bg-white/80 px-4 text-left transition hover:bg-white ' + (typeSel === t.key ? ringOn : 'border-white/80')}>
                <span className="truncate text-2xl text-ink" style={{ fontFamily: fam(t.head) }}>Your Name</span>
                <span className="mt-1 truncate text-sm text-ink-soft" style={{ fontFamily: fam(t.body) }}>Wedding photography</span>
              </button>
              <span className="text-xs font-medium uppercase tracking-wider text-ink-soft">{t.name}</span>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setOwnFonts(!ownFonts)} className={ghostBtn + ' mt-4'}>{ownFonts ? 'Hide my own fonts' : 'Choose my own fonts'}</button>
        {ownFonts && (
          <div className="mt-3 grid gap-3 lg:grid-cols-3">
            <FontPick label="Headings" hint="Your name and big titles" value={curHead} onPick={(fk) => setOwn('head', fk)} />
            <FontPick label="Sub headings" hint="The line under your headline" value={curSub} onPick={(fk) => setOwn('sub', fk)} />
            <FontPick label="Paragraphs" hint="Everything else you write" value={curBody} onPick={(fk) => setOwn('body', fk)} />
          </div>
        )}
        <p className="mt-6 text-sm font-medium text-ink">Button shape</p>
        <div className="mt-2 grid max-w-xl grid-cols-3 gap-3">
          {SHAPES.map((sh) => (
            <button key={sh.k} type="button" onClick={() => commit((n) => { const x = (n.site_settings = n.site_settings ?? {}); setButtons(x, sh.k) })}
              className={'flex h-24 flex-col items-center justify-center gap-2 rounded-xl border bg-white/70 transition hover:bg-white ' + (curShape === sh.k ? ringOn : 'border-white/80')}>
              <span className="inline-block px-3 py-1.5 text-xs font-medium text-white" style={{ background: accent, borderRadius: sh.r }}>Book now</span>
              <span className="text-xs text-ink-soft">{sh.name}</span>
            </button>
          ))}
        </div>
      </div>
    )
    if (k === 'photos') return (
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {photos.map((ph) => (
          <div key={ph} className="relative aspect-[4/5] overflow-hidden rounded-lg border border-white/80">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BASE + ph} alt="" className="h-full w-full object-cover" />
            <button type="button" aria-label="Remove photo" onClick={() => removePhoto(ph)} className="absolute right-1 top-1 rounded-full bg-black/55 px-1.5 text-xs text-white">×</button>
          </div>
        ))}
        {photos.length < 6 && (
          <label className="flex aspect-[4/5] cursor-pointer items-center justify-center rounded-lg border border-dashed border-ink/30 bg-white/50 text-center text-xs text-ink-soft hover:bg-white/80">
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addPhotos(e.target.files); e.target.value = '' }} />
            {busy ? 'Uploading…' : '+ Add photos'}
          </label>
        )}
      </div>
    )
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {([['Instagram link', ig, setIg], ['Facebook link', fb, setFb], ['TikTok link', tt, setTt], ['Pinterest link', pin, setPin]] as const).map(([ph, v, fn]) => (
          <input key={ph} value={v} onChange={(e) => fn(e.target.value)} placeholder={ph} className="w-full rounded-xl border border-white/80 bg-white/70 px-4 py-3 text-base text-ink outline-none focus:border-twilight" />
        ))}
      </div>
    )
  }

  const PAGE_LABEL: Record<string, string> = { home: 'Home', booking: 'Booking', galleries: 'Galleries', about: 'About', blog: 'Blog', pricing: 'Pricing', faq: 'FAQ' }
  const kitNow = ((form.site_settings as any)?.kit ?? {}) as Record<string, any>
  const stNow = structureOf(form as any)
  const chosenPages: string[] = ['home', 'booking', ...(stNow.off.includes('galleries') ? [] : ['galleries']), ...(stNow.off.includes('about') ? [] : ['about']), ...stNow.extra.map((e) => e.id)]
  const pageLabel = (k: string) => PAGE_LABEL[k] ?? stNow.extra.find((e) => e.id === k)?.label ?? (k.charAt(0).toUpperCase() + k.slice(1))
  const PAGE_PATH: Record<string, string> = { home: '', about: '/about', galleries: '/galleries', booking: '/availability' }
  const previewBase = process.env.NODE_ENV === 'production' ? 'https://sites.camrhia.com' : ''
  const previewSrc = previewBase + '/site/' + form.public_token + (PAGE_PATH[curPage] ?? (curPage && curPage !== 'home' ? '/p/' + curPage : '')) + '?preview=1'
  const ACC = 'bg-[color-mix(in_srgb,rgb(var(--scene-a,204_138_140))_65%,#e6e6e6)]'
  const tabsDef: { k: 'pages' | 'design' | 'settings'; label: string; icon: string }[] = [
    { k: 'pages', label: 'Pages', icon: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z M14 3v5h5' },
    { k: 'design', label: 'Design', icon: 'M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2 0-1.5-1-2-1-3s1-2 2-2h3a3 3 0 0 0 3-3c0-4.5-4-8-9-8z' },
    { k: 'settings', label: 'Settings', icon: 'M4 21v-7 M4 10V3 M12 21v-9 M12 8V3 M20 21v-5 M20 12V3 M1 14h6 M9 8h6 M17 16h6' },
  ]
  const designRows: [Tab, string, string][] = [
    ['style', 'Layout', 'The look of your whole site'],
    ['colors', 'Colors', 'Accent, background and text'],
    ['type', 'Fonts & buttons', 'Your fonts and the shape of your buttons'],
  ]
  const siteUrl = form.slug ? `camrhia.com/${form.slug}` : form.public_token ? `camrhia.com/site/${form.public_token}` : ''

  return (
    <div className="bld fixed inset-0 z-[60] flex bg-[#efeae4] text-ink">
      <aside className={(full ? 'hidden' : 'flex') + ' w-[400px] shrink-0 flex-col border-r border-black/10 bg-white'}>
        <div className="flex items-center justify-between px-5 pb-2 pt-5">
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Back to dashboard" onClick={() => router.push('/dashboard')} className="flex h-9 items-center gap-1 rounded-full px-3 text-sm text-ink-soft transition hover:bg-black/5 hover:text-ink">← Dashboard</button>
          </div>
          <div className="flex items-center gap-2">
            {siteUrl && <button type="button" onClick={() => { try { void navigator.clipboard.writeText('https://' + siteUrl) } catch { /* ignore */ } setPubMsg('Link copied.'); setTimeout(() => setPubMsg(''), 2000) }} className="rounded-lg px-3 py-1.5 text-sm text-ink-soft transition hover:bg-black/5 hover:text-ink">Copy link</button>}
            <button type="button" onClick={() => { void undo() }} disabled={history.length === 0} className="rounded-lg px-3 py-1.5 text-sm text-ink-soft transition hover:bg-black/5 hover:text-ink disabled:opacity-40">Undo</button>
          </div>
        </div>

        <p className="px-5 pb-2 font-fraunces text-2xl font-semibold text-ink">Design your website</p>
        {err && <p className="mx-5 mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{err}</p>}

        <div className="flex min-h-0 flex-1 flex-col">
          <button type="button" onClick={() => { setReview(true); setSetupFinished(false) }} className="mx-5 mb-2 mt-3 self-start rounded-full border border-black/15 bg-white px-4 py-1.5 text-xs font-medium text-ink transition hover:border-twilight">← Back to walkthrough</button>
          {kitNow.done && (
            <div className="min-h-0 flex-1 overflow-y-auto border-b border-black/10 bg-[#f1e9e0] px-5 py-4">
              <p className="font-fraunces text-lg font-semibold text-ink">Your setup</p>
              {(() => {
                const lab = 'mt-3 text-[11px] font-semibold uppercase tracking-wider text-ink-soft'
                const pill = 'rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs text-ink transition hover:border-twilight'
                return (
                  <>
                    {(kitNow.layouts ?? []).length > 0 && (
                      <div><p className={lab}>Layouts</p><div className="mt-1.5 flex flex-wrap gap-1.5">
                        {(kitNow.layouts as string[]).map((key, i) => <button key={key} type="button" className={pill + (Number(kitNow.layout_idx ?? 0) === i ? ' !border-twilight' : '')} onClick={() => { void commit((n) => applyKitOps(n, { layout: key })) }}>{STYLES.find((q) => q.key === key)?.name ?? key}</button>)}
                      </div></div>
                    )}
                    {(kitNow.palettes ?? []).length > 0 && (
                      <div><p className={lab}>Color schemes</p><div className="mt-1.5 flex flex-wrap gap-2">
                        {(kitNow.palettes as any[]).map((pl) => (
                          <button key={pl.name} type="button" className="flex items-center gap-2 rounded-xl border border-black/10 bg-white px-2.5 py-1.5 text-xs text-ink transition hover:border-twilight" onClick={() => { void commit((n) => applyKitOps(n, { palette: pl.name })) }}>
                            <span className="flex overflow-hidden rounded-md border border-black/10"><span className="h-5 w-5" style={{ background: pl.accent }} /><span className="h-5 w-5" style={{ background: pl.bg }} /><span className="h-5 w-5" style={{ background: pl.text }} /></span>
                            {pl.name}
                          </button>
                        ))}
                      </div></div>
                    )}
                    {kitNow.type && (['title', 'subtitle', 'paragraph'] as const).some((r) => (kitNow.type[r] ?? []).length > 0) && (
                      <div><p className={lab}>Fonts</p>
                        {(['title', 'subtitle', 'paragraph'] as const).map((r) => {
                          const curFont = r === 'title' ? (set.hero?.headline_font ?? set.fonts?.head) : r === 'subtitle' ? set.hero?.subhead_font : (set.hero?.para_font ?? set.fonts?.body)
                          return (kitNow.type[r] ?? []).length > 0 ? (
                            <div key={r} className="mt-1.5"><p className="text-[11px] capitalize text-ink-soft">{r}</p><div className="mt-1 flex flex-wrap gap-1.5">
                              {(kitNow.type[r] as string[]).map((id, i) => <button key={id} type="button" className={pill + ((curFont ? curFont === id : i === 0) ? ' !border-twilight' : '')} style={{ fontFamily: fam(id) }} onClick={() => { void commit((n) => applyKitOps(n, { role_font: { role: r, font: id } })) }}>{fname(id)}</button>)}
                            </div></div>
                          ) : null
                        })}
                      </div>
                    )}
                    {(kitNow.fonts ?? []).length > 0 && (
                      <div><p className={lab}>Fonts</p><div className="mt-1.5 flex flex-wrap gap-1.5">
                        {(kitNow.fonts as string[]).map((key) => <button key={key} type="button" className={pill} onClick={() => { void commit((n) => applyKitOps(n, { fonts: key })) }}>{TYPE_SETS.find((t) => t.key === key)?.name ?? key}</button>)}
                      </div></div>
                    )}
                    {(kitNow.themes ?? []).length > 0 && (
                      <div><p className={lab}>Saved themes</p><div className="mt-1.5 flex flex-wrap gap-1.5">
                        {(kitNow.themes as any[]).map((t) => (
                          <span key={t.name} className="inline-flex items-center overflow-hidden rounded-full border border-black/10 bg-white text-xs text-ink">
                            <button type="button" className="px-3 py-1.5 transition hover:bg-black/5" onClick={() => { void commit((n) => applyKitOps(n, { theme: t.name })) }}>{t.name}</button>
                            <button type="button" aria-label={'Delete ' + t.name} className="px-2 py-1.5 text-ink-soft transition hover:text-red-600" onClick={() => { void commit((n) => { const k = kitOf(n); k.themes = k.themes.filter((q: any) => q.name !== t.name) }) }}>×</button>
                          </span>
                        ))}
                      </div></div>
                    )}
                  </>
                )
              })()}
            </div>
          )}

          <div className="relative flex h-[320px] shrink-0 flex-col bg-[#faf7f3]">
            <div className="flex items-center gap-2 px-5 pt-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/camri/13_face_avatar.png" alt="" className="h-9 w-9 rounded-full" />
              <p className="font-fraunces text-xl font-semibold text-ink">Camri</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/camri/02_sitting_waving.png" alt="" className="pointer-events-none absolute -top-[43px] right-6 z-10 h-14 w-auto" />
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-3">
              {msgs.map((m, i) => (
                <div key={i} className={'max-w-[88%] rounded-2xl px-4 py-2.5 text-sm ' + (m.from === 'you' ? 'ml-auto ' + ACC + ' text-white' : 'bg-white text-ink shadow-sm')}>{m.text}</div>
              ))}
              {camBusy && <CamriTyping />}
              <div ref={chatEnd} />
            </div>
            <div className="border-t border-black/10 px-5 pb-3 pt-3">
              <div className="flex gap-1.5 overflow-x-auto whitespace-nowrap pb-1">
                {['Switch layout', 'Make me a Christmas theme for December', 'Make my buttons glow on hover'].map((t) => <button key={t} type="button" className={chip + ' shrink-0'} onClick={() => send(t)}>{t}</button>)}
              </div>
              <form onSubmit={(e) => { e.preventDefault(); send(input) }} className="mt-2 flex gap-2">
                <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={'Tell Camri what to change on ' + pageLabel(curPage)} className="min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-twilight" />
                <button type="submit" className={accentBtn + ' !px-4 !py-2'}>Send</button>
              </form>
            </div>
          </div>
        </div>

        {pubMsg && <p className="px-4 pt-3 text-center text-xs text-ink-soft">{pubMsg}</p>}
        <div className="flex gap-3 border-t border-black/10 p-4">
          <button type="button" onClick={() => setFull(true)} className="flex-1 rounded-lg bg-black/5 py-3 text-sm font-medium text-ink transition hover:bg-black/10">Preview</button>
          <button type="button" onClick={publish} disabled={busy} className={'relative flex-1 rounded-lg py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60 ' + ACC}>
            Publish
            {dirty && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-red-400" />}
          </button>
        </div>
      </aside>

      <main className="relative flex min-w-0 flex-1 flex-col p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {full && <button type="button" onClick={() => setFull(false)} className={'rounded-lg px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 ' + ACC}>← Back to editing</button>}
            <p className="text-xs text-ink-soft">{full ? 'Previewing your draft.' : 'Click any text on the page to change its words, font and color.'}</p>
          </div>
          <div className="flex overflow-hidden rounded-xl border border-black/10 bg-white text-sm">
            {(['desktop', 'phone'] as const).map((d) => (
              <button key={d} type="button" onClick={() => setDevice(d)} className={'px-4 py-2 font-medium transition ' + (device === d ? ACC + ' text-white' : 'text-ink-soft hover:text-ink')}>{d === 'desktop' ? 'Desktop' : 'Phone'}</button>
            ))}
          </div>
        </div>
        {!full && (
          <div className="mb-3 flex flex-wrap gap-2">
            {chosenPages.map((k) => (
              <button key={k} type="button" onClick={() => setCurPage(k)} className={'rounded-full px-4 py-1.5 text-sm font-medium transition ' + (curPage === k ? ACC + ' text-white' : 'bg-white text-ink-soft hover:text-ink')}>{pageLabel(k)}</button>
            ))}
          </div>
        )}
        <div ref={boxRef} className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-black/10 bg-[#e6e1da] shadow-sm">
          {form.public_token ? (
            <div className="flex h-full justify-center">
              <iframe ref={frameRef} src={previewSrc} title="Website preview" style={{ width: device === 'phone' ? 390 : '100%', height: '100%', border: 0, background: '#fff' }} />
            </div>
          ) : (
            <p className="p-8 text-center text-sm text-ink-soft">Your website link isn&apos;t set up yet. Finish setting up your portfolio in the app first.</p>
          )}
          {pick && (
            <div style={{ left: pick.left, top: pick.top, width: 340 }} className="absolute z-30 max-h-[85%] overflow-y-auto rounded-2xl border border-white/80 bg-white/95 p-4 shadow-[0_24px_60px_-20px_rgba(60,30,40,0.55)] backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <p className="font-fraunces text-lg font-semibold text-ink">{PICK_LABELS[pick.key] ?? 'Text'}</p>
                <button type="button" aria-label="Close" onClick={() => { applyText(); setPick(null) }} className="rounded-lg px-2 text-lg text-ink-soft hover:text-ink">×</button>
              </div>
              {TEXT_KEYS.includes(pick.key) && (LONG_TEXT.includes(pick.key)
                ? <textarea value={ptext} onChange={(e) => setPtext(e.target.value)} onBlur={applyText} rows={4} className="mt-3 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-twilight" />
                : <input value={ptext} onChange={(e) => setPtext(e.target.value)} onBlur={applyText} className="mt-3 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-twilight" />)}
              <div className="mt-3">
                <FontPick label="Font" hint="Just this text" value={set.el?.[pick.key]?.font ?? (pick.key === 'hero_headline' ? (set.hero?.headline_font ?? curHead) : curBody)} onPick={(fk) => setElProp(pick.key, { font: fk })} />
              </div>
              {pick.key !== 'hero_headline' && (
                <div className="mt-3">
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft">Color</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {PICK_COLORS.map((c) => (
                      <button key={c} type="button" aria-label={c} onClick={() => setElProp(pick.key, { color: c })} className={'h-7 w-7 rounded-full border border-black/15 transition hover:scale-110 ' + (String(set.el?.[pick.key]?.color ?? pick.color).toLowerCase() === c.toLowerCase() ? 'ring-2 ring-offset-1 ring-[rgb(var(--scene-b,201_133_136))]' : '')} style={{ background: c }} />
                    ))}
                    <input value={phex} onChange={(e) => { const v = e.target.value.trim(); setPhex(v); if (/^#[0-9a-fA-F]{6}$/.test(v)) setElProp(pick.key, { color: v }) }} placeholder="#hex" maxLength={7} className="w-20 rounded-lg border border-line bg-white px-2 py-1.5 text-xs text-ink outline-none focus:border-twilight" />
                  </div>
                </div>
              )}
              <div className="mt-4 flex gap-2">
                <button type="button" className={ghostBtn + ' !px-4 !py-2'} onClick={() => resetEl(pick.key)}>Reset</button>
                <button type="button" className={accentBtn + ' !px-4 !py-2'} onClick={() => { applyText(); setPick(null) }}>Done</button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
