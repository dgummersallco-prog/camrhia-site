'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { makeVersions } from '@/lib/galleryImages'
import { camiSite, applyPalette, setButtons, type SiteState } from '@/lib/camiSite'
import { FONT_OPTIONS, PAIR_PRESETS } from '@/lib/siteTheme'

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
  const [msgs, setMsgs] = useState<Msg[]>([{ from: 'cami', text: "Hi, I'm Cami. What should I change?" }])
  const [input, setInput] = useState('')
  const chatEnd = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      const sb = supabase
      if (!sb) { router.push('/login'); return }
      const { data: sess } = await sb.auth.getSession()
      if (!sess.session) { router.push('/login'); return }
      const { data, error } = await sb.from('profiles').select(COLS).eq('id', sess.session.user.id).single()
      if (error) { setErr(error.message); return }
      const p = data as unknown as Prof
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
    const { error } = await sb.from('profiles').update({
      site_template: next.site_template ?? 'editorial',
      site_accent: next.site_accent,
      site_font_pair: next.site_font_pair ?? 'serif',
      site_headline: next.site_headline?.trim() || null,
      site_subhead: next.site_subhead?.trim() || null,
      site_settings: next.site_settings ?? {},
    }).eq('id', next.id)
    if (error) { setErr(error.message); return }
    setErr(null)
    pushPatch(next)
  }

  async function commit(fn: (n: Prof) => void) {
    if (!form) return
    const next = clone(form)
    fn(next)
    setHistory((h) => [...h, form])
    setForm(next)
    await save(next)
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
    const t = text.trim()
    if (!t || !form) return
    setMsgs((m) => [...m, { from: 'you', text: t }])
    setInput('')
    if (/^\s*(undo|go back|revert|that was wrong|put it back)\b/i.test(t)) {
      const ok = await undo()
      setMsgs((m) => [...m, { from: 'cami', text: ok ? 'Undone.' : 'Nothing to undo yet.' }])
      return
    }
    const r = camiSite(t, form)
    if (r.changed) await commit((n) => { n.site_template = r.state.site_template; n.site_accent = r.state.site_accent; n.site_font_pair = r.state.site_font_pair; n.site_headline = r.state.site_headline; n.site_subhead = r.state.site_subhead; n.site_settings = r.state.site_settings })
    setMsgs((m) => [...m, { from: 'cami', text: r.reply }])
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
    const sb = supabase
    if (!sb || !form) return
    setBusy(true)
    const patch = { instagram_url: ig.trim() || null, facebook_url: fb.trim() || null, tiktok_url: tt.trim() || null, pinterest_url: pin.trim() || null }
    const { error } = await sb.from('profiles').update(patch).eq('id', form.id)
    setBusy(false)
    if (error) { setErr(error.message); return }
    setForm({ ...form, ...patch })
    pushPatch({ ...form, ...patch })
  }

  if (!form) return <p className="text-sm text-ink-soft">{err ?? 'Loading…'}</p>

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

  function pickColor(v: string) {
    commit((n) => applyPalette(n, role === 'accent' ? v : n.site_accent ?? accent, role === 'bg' ? v : n.site_settings?.colors?.bg ?? bg, role === 'text' ? v : n.site_settings?.colors?.text ?? txt))
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

  return (
    <div className="w-full">
      {err && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{err}</p>}

      <div className={glass + ' mb-4 p-4'}>
        <div>
          <p className="font-fraunces text-xl font-semibold text-ink">Cami</p>
          <p className="text-xs text-ink-soft">Tell me what to change, in plain words.</p>
        </div>
        <div className="mt-3 max-h-32 space-y-2 overflow-y-auto pr-1">
          {msgs.slice(-4).map((m, i) => (
            <div key={i} className={'max-w-[85%] rounded-2xl px-3 py-2 text-sm ' + (m.from === 'you' ? 'ml-auto bg-[color-mix(in_srgb,rgb(var(--scene-a,201_133_136))_65%,#e6e6e6)] text-white' : 'bg-white text-ink')}>{m.text}</div>
          ))}
          <div ref={chatEnd} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); send(input) }} className="mt-3 flex gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Tell Cami what to change" className="min-w-0 flex-1 rounded-xl border border-white/80 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-twilight" />
          <button type="submit" className={accentBtn}>Send</button>
        </form>
      </div>

      <div>
        <div className="mb-3 flex flex-wrap gap-2">
          {TABS.map((k, i) => (
            <button key={k} type="button" onClick={() => setTab(k)} className={'flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ' + (tab === k ? 'border-transparent bg-[color-mix(in_srgb,rgb(var(--scene-a,204_138_140))_65%,#e6e6e6)] text-white' : 'border-white/70 bg-white/60 text-ink hover:bg-white/80')}>
              <span className={'flex h-6 w-6 items-center justify-center rounded-full text-xs ' + (tab === k ? 'bg-white/25 text-white' : 'bg-[color-mix(in_srgb,rgb(var(--scene-a,204_138_140))_65%,#e6e6e6)] text-white')}>{i + 1}</span>
              {TAB_TITLES[k]}
            </button>
          ))}
        </div>
        <div className={glass + ' mb-4 max-h-[44vh] overflow-y-auto p-5'}>
          <div className="mb-4 flex items-start justify-between gap-3">
            <p className="text-sm text-ink-soft">{HEADINGS[tab][1]}</p>
            {tab === 'social'
              ? <button className={accentBtn + ' !px-4 !py-2'} disabled={busy} onClick={saveSocial}>Save</button>
              : <button className={accentBtn + ' !px-4 !py-2'} onClick={() => setTab(TABS[idx + 1])}>Next</button>}
          </div>
          {renderStep(tab)}
        </div>

        <div className="mx-auto w-full max-w-5xl">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-fraunces text-xl font-semibold text-ink">Live preview</p>
              <p className="text-xs text-ink-soft">Click any text on the site to change its words, font and color.</p>
            </div>
            <div className="flex overflow-hidden rounded-xl border border-white/70 bg-white/60 text-sm">
              {(['desktop', 'phone'] as const).map((d) => (
                <button key={d} type="button" onClick={() => setDevice(d)} className={'px-4 py-2 font-medium transition ' + (device === d ? 'bg-[color-mix(in_srgb,rgb(var(--scene-a,201_133_136))_65%,#e6e6e6)] text-white' : 'text-ink-soft hover:text-ink')}>{d === 'desktop' ? 'Desktop' : 'Phone'}</button>
              ))}
            </div>
          </div>
          <div ref={boxRef} className={glass + ' relative overflow-hidden p-3'}>
            {form.public_token ? (
              <div style={{ height: 'calc(100vh - 9rem)', minHeight: 520 }} className="flex justify-center">
                <iframe ref={frameRef} src={`/site/${form.public_token}?preview=1`} title="Website preview" style={{ width: device === 'phone' ? 390 : '100%', height: '100%', border: 0, borderRadius: 12, background: '#fff' }} />
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
        </div>
      </div>
    </div>
  )
}
