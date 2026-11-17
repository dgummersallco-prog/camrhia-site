'use client'

import { GoesTo } from './GoesTo'
import { Select } from '@/app/components/Select'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { makeVersions } from '@/lib/galleryImages'
import { getBoard, starter, blank, newItem, hasBoard, galleryStarter, exploreStarter } from '@/lib/aboutCanvas'
import type { CItem } from '@/lib/aboutCanvas'
import { DashboardHeader } from '@/app/components/DashboardHeader'
import CamiDesigner from './CamiDesigner'
import { FONT_OPTIONS, PAIR_PRESETS, NAV_DEFAULTS, DEFAULT_TITLES, resolveTheme } from '@/lib/siteTheme'
import { HexColorPicker } from 'react-colorful'

type Site = {
  id: string
  public_token: string | null
  slug: string | null
  accent_color: string | null
  cover_path: string | null
  cover_paths: string[] | null
  logo_path: string | null
  instagram_url: string | null
  facebook_url: string | null
  pinterest_url: string | null
  tiktok_url: string | null
  brand_colors_named: Record<string, string | null> | null
  site_template: string | null
  site_accent: string | null
  site_font_pair: string | null
  site_headline: string | null
  site_subhead: string | null
  site_sections: Record<string, boolean> | null
  site_settings: Record<string, any> | null
}
type Tm = { id: string; storage_path: string | null; quote: string | null; client_name: string | null; sort_order: number }
type WPkg = { id: string; title: string; price: string | null; description: string | null; sort_order: number; source_package_id: string | null }
type OwnPkg = { id: string; name: string; price: string | null; covers: string | null; detail: string | null; session_type: string | null }

function heroAspect(tpl: string, dev: 'phone' | 'desktop', vh: number): number | null {
  const W = dev === 'phone' ? 390 : 1280
  const H = dev === 'phone' ? 844 : 800
  if (tpl === 'editorial' || tpl === 'framed' || tpl === 'peony' || tpl === 'camellia' || tpl === 'cedar') return W / ((vh / 100) * H)
  if (tpl === 'magazine') return W / (0.8 * (vh / 100) * H)
  if (tpl === 'minimal') return dev === 'phone' ? 16 / 10 : 21 / 9
  if (tpl === 'split') return dev === 'phone' ? W / (0.6 * H) : (W / 2) / Math.max(0.6 * H, (vh / 100) * H - 64)
  return null
}

function HeroFrame({ src, aspect, x, y, onChange }: { src: string; aspect: number | null; x: number; y: number; onChange: (x: number, y: number) => void }) {
  const box = useRef<HTMLDivElement>(null)
  const [ia, setIa] = useState(1.5)
  const drag = useRef<{ sx: number; sy: number; x: number; y: number } | null>(null)
  const a = aspect ?? ia
  const fw = ia > a ? a / ia : 1
  const fh = ia > a ? 1 : ia / a
  const left = (x / 100) * (1 - fw) * 100
  const top = (y / 100) * (1 - fh) * 100
  const clamp = (v: number) => Math.round(Math.min(100, Math.max(0, v)))
  return (
    <div ref={box} className="relative mx-auto select-none overflow-hidden rounded-lg" style={{ aspectRatio: String(ia), width: 'min(100%, ' + Math.round(460 * ia) + 'px)' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" draggable={false} onLoad={(e) => { const im = e.currentTarget; if (im.naturalWidth && im.naturalHeight) setIa(im.naturalWidth / im.naturalHeight) }} className="absolute inset-0 h-full w-full object-fill" />
      <div
        className="absolute cursor-grab touch-none active:cursor-grabbing"
        style={{ left: left + '%', top: top + '%', width: fw * 100 + '%', height: fh * 100 + '%', boxShadow: '0 0 0 999px rgba(0,0,0,0.55)', border: '2px solid #fff' }}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = { sx: e.clientX, sy: e.clientY, x, y } }}
        onPointerMove={(e) => {
          const d = drag.current
          if (!d || !box.current) return
          const r = box.current.getBoundingClientRect()
          const nx = fw < 1 ? clamp(d.x + (((e.clientX - d.sx) / r.width) / (1 - fw)) * 100) : x
          const ny = fh < 1 ? clamp(d.y + (((e.clientY - d.sy) / r.height) / (1 - fh)) * 100) : y
          onChange(nx, ny)
        }}
        onPointerUp={() => { drag.current = null }}
        onPointerCancel={() => { drag.current = null }}
      />
    </div>
  )
}

const PKG_TYPE_ORDER = ['wedding', 'engagement', 'proposal', 'maternity', 'newborn', 'family', 'senior', 'graduation', 'headshots', 'branding', 'boudoir', 'dance', 'sports_team']
function groupOwnPkgs(list: OwnPkg[]) {
  const map = new Map<string, OwnPkg[]>()
  for (const x of list) {
    const k = x.session_type ?? ''
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(x)
  }
  const rank = (k: string) => { const i = PKG_TYPE_ORDER.indexOf(k); return i === -1 ? 999 : i }
  return Array.from(map.entries())
    .sort((a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0]))
    .map(([key, items]) => ({ key, items, label: key ? key.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()) : 'Other' }))
}
type Dev = 'phone' | 'desktop'

const COLUMNS = 'id, public_token, slug, accent_color, cover_path, cover_paths, logo_path, instagram_url, facebook_url, pinterest_url, tiktok_url, brand_colors_named, site_template, site_accent, site_font_pair, site_headline, site_subhead, site_sections, site_settings'
const BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}/storage/v1/object/public/portfolio/`

const TEMPLATES = [
  { key: 'editorial', name: 'Editorial', blurb: 'Full-screen photo with your headline over it.' },
  { key: 'split', name: 'Split', blurb: 'Words on one side, a big photo on the other.' },
  { key: 'minimal', name: 'Minimal', blurb: 'Clean white, photo first, lots of air.' },
  { key: 'framed', name: 'Framed', blurb: 'Photo with your words in a centered card.' },
  { key: 'magazine', name: 'Magazine', blurb: 'Huge headline over a wide photo.' },
  { key: 'mosaic', name: 'Freestyle', blurb: 'Place your photos anywhere you like.' },
]
const SWATCHES = ['#A9545F', '#5B6B8C', '#7C8B6F', '#B08D57', '#8A5A83', '#2A1F24']
const MENU_KEYS = ['home', 'galleries', 'about', 'book']

const btn = 'rounded-full bg-twilight px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50'
const btnGhost = 'rounded-full border border-line px-5 py-2.5 text-sm text-ink hover:bg-paper-deep'
const inputCls = 'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink'
const card = 'rounded-2xl border border-line bg-card p-5'

const ALL_FONTS_HREF =
  'https://fonts.googleapis.com/css2?' +
  Object.values(FONT_OPTIONS).map((f) => 'family=' + f.gf.split(':')[0]).join('&') +
  '&display=swap'
const CAT_LABEL: Record<string, string> = { serif: 'Serif', sans: 'Sans', script: 'Script', display: 'Display' }

const SLIDER_CSS = `
.cr-range{-webkit-appearance:none;appearance:none;width:100%;height:18px;background:transparent;cursor:pointer;margin:0}
.cr-range::-webkit-slider-runnable-track{height:2px;border-radius:2px;background:linear-gradient(to right,#2A1F24 var(--pct),#D9CFC3 var(--pct))}
.cr-range::-moz-range-track{height:2px;border-radius:2px;background:#D9CFC3}
.cr-range::-moz-range-progress{height:2px;border-radius:2px;background:#2A1F24}
.cr-range::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:16px;height:16px;margin-top:-7px;border-radius:50%;background:#FAF7F2;border:1.5px solid #2A1F24;box-shadow:0 1px 3px rgba(0,0,0,.15)}
.cr-range::-moz-range-thumb{width:14px;height:14px;border-radius:50%;background:#FAF7F2;border:1.5px solid #2A1F24}
.cr-range:focus-visible{outline:none}
.cr-range:focus-visible::-webkit-slider-thumb{box-shadow:0 0 0 3px rgba(42,31,36,.18)}
.cr-cap summary,.cr-cap summary span,.cr-cap label,.cr-cap [data-rowlabel],.cr-cap .cr-seg button{text-transform:capitalize}
.cr-cap input,.cr-cap textarea{text-transform:none}
`

function Group({ title, hint, open, onOpen, children }: { title: string; hint?: string; open?: boolean; onOpen?: () => void; children: React.ReactNode }) {
  return (
    <details open={open} onToggle={(e) => {
      const el = e.currentTarget as HTMLDetailsElement
      if (el.open) {
        const topBefore = el.getBoundingClientRect().top
        el.parentElement?.querySelectorAll(':scope > details').forEach((d) => { if (d !== el) (d as HTMLDetailsElement).open = false })
        const shift = el.getBoundingClientRect().top - topBefore
        let sp: HTMLElement | null = el.parentElement
        while (sp) { const o = getComputedStyle(sp).overflowY; if ((o === 'auto' || o === 'scroll') && sp.scrollHeight > sp.clientHeight) break; sp = sp.parentElement }
        if (shift) { if (sp) sp.scrollTop += shift; else window.scrollBy(0, shift) }
        const body = el.querySelector(':scope > div') as HTMLElement | null
        body?.animate?.([{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: 'ease-out' })
        requestAnimationFrame(() => {
          const off = el.getBoundingClientRect().top - (sp ? sp.getBoundingClientRect().top : 0)
          if (sp && Math.abs(off - 12) > 24) sp.scrollTo({ top: sp.scrollTop + off - 12, behavior: 'smooth' })
        })
        setTimeout(() => onOpen?.(), 220)
      }
    }} className="scroll-mt-4 rounded-2xl border border-line bg-card p-5">
      <summary className="cursor-pointer font-fraunces text-lg font-semibold text-ink">
        {title}
        
      </summary>
      <div className="mt-4 space-y-4 [&>p:first-child]:border-t-0 [&>p:first-child]:pt-0">{children}</div>
    </details>
  )
}
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span data-rowlabel className="text-sm capitalize text-ink">{label}</span>
      {children}
    </div>
  )
}
function Seg<V extends string>({ value, options, onChange }: { value: V; options: { v: V; label: string }[]; onChange: (v: V) => void }) {
  return (
    <div className="cr-seg inline-flex flex-wrap gap-1 rounded-full border border-line bg-paper p-1">
      {options.map((o) => (
        <button key={o.v} type="button" onClick={() => onChange(o.v)}
          className={`rounded-full px-3 py-1 text-xs ${value === o.v ? 'bg-twilight text-white' : 'text-ink-soft hover:text-ink'}`}>{o.label}</button>
      ))}
    </div>
  )
}
function Switch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!on)} aria-pressed={on} className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? 'bg-twilight' : 'bg-line'}`}>
      <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all" style={{ left: on ? 22 : 2 }} />
    </button>
  )
}
function Slider({ min, max, step, value, onChange }: { min: number; max: number; step: number; value: number; onChange: (v: number) => void }) {
  const clamped = Math.min(max, Math.max(min, value))
  const pct = max > min ? ((clamped - min) / (max - min)) * 100 : 0
  return (
    <input type="range" className="cr-range" min={min} max={max} step={step} value={clamped}
      onChange={(e) => onChange(Number(e.target.value))} style={{ '--pct': `${pct}%` } as React.CSSProperties} />
  )
}
function NumBox({ value, min, max, step, unit, onChange }: { value: number; min: number; max: number; step: number; unit: string; onChange: (v: number) => void }) {
  const [txt, setTxt] = useState(String(value))
  const [focus, setFocus] = useState(false)
  useEffect(() => { if (!focus) setTxt(String(value)) }, [value, focus])
  const clamp = (n: number) => Math.min(max, Math.max(min, Math.round(n * 100) / 100))
  return (
    <span className="inline-flex shrink-0 items-center rounded-full border border-line bg-white px-3 py-1.5 transition focus-within:border-ink">
      <input type="text" inputMode="decimal" value={txt}
        onFocus={(e) => { setFocus(true); e.currentTarget.select() }}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^0-9.]/g, '')
          setTxt(raw)
          const n = Number(raw)
          if (raw !== '' && Number.isFinite(n)) onChange(clamp(n))
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp') { e.preventDefault(); const v = clamp(value + step); setTxt(String(v)); onChange(v) }
          if (e.key === 'ArrowDown') { e.preventDefault(); const v = clamp(value - step); setTxt(String(v)); onChange(v) }
        }}
        onBlur={() => { setFocus(false); const n = Number(txt); if (txt === '' || !Number.isFinite(n)) setTxt(String(value)); else setTxt(String(clamp(n))) }}
        className="w-9 bg-transparent text-right text-sm tabular-nums text-ink outline-none" />
      <span className="ml-1 text-xs text-ink-soft">{unit}</span>
    </span>
  )
}

function SizeControl({ label, unit, min, max, step, value, onChange, device }: {
  label: string; unit: string; min: number; max: number; step: number
  value: { phone: number; desktop: number }; onChange: (d: Dev, v: number) => void; device: Dev
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm capitalize text-ink">{label}</p>
        <span className="text-[11px] uppercase tracking-widest text-ink-soft">{device}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1"><Slider min={min} max={max} step={step} value={value[device]} onChange={(v) => onChange(device, v)} /></div>
        <NumBox value={value[device]} min={min} max={max} step={step} unit={unit} onChange={(v) => onChange(device, v)} />
      </div>
    </div>
  )
}

function ColorField({ label, value, swatches, onChange, onReset }: {
  label: string; value: string; swatches: { name: string; hex: string }[]
  onChange: (hex: string) => void; onReset?: () => void
}) {
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const down = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false) }
    const blur = () => setOpen(false)
    document.addEventListener('mousedown', down)
    window.addEventListener('blur', blur)
    return () => { document.removeEventListener('mousedown', down); window.removeEventListener('blur', blur) }
  }, [open])
  const [txt, setTxt] = useState(value)
  useEffect(() => { setTxt(value) }, [value])
  const ok = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v)
  return (
    <div ref={boxRef} className="relative">
      <Row label={label}>
        <button type="button" onClick={() => setOpen(!open)} className="flex items-center gap-2 rounded-lg border border-line bg-white px-2 py-1.5">
          <span className="h-5 w-5 rounded border border-line" style={{ background: value }} />
          <span className="font-mono text-xs uppercase text-ink">{value}</span>
        </button>
      </Row>
      {open && (
        <>
          
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-2 w-72 max-w-[calc(100vw-3rem)] rounded-2xl border border-line bg-card p-4 shadow-lg">
            <p className="mb-2 text-[11px] uppercase tracking-widest text-ink-soft">Your colors</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {swatches.map((sw) => (
                <button key={sw.name + sw.hex} type="button" title={sw.name} onClick={() => onChange(sw.hex)} className="h-8 w-8 rounded-full border border-line"
                  style={{ background: sw.hex, boxShadow: value.toLowerCase() === sw.hex.toLowerCase() ? '0 0 0 2px #fff, 0 0 0 4px #2A1F24' : undefined }} />
              ))}
            </div>
            <p className="mb-2 text-[11px] uppercase tracking-widest text-ink-soft">Pick any color</p>
            <HexColorPicker color={ok(value) ? value : '#ffffff'} onChange={(h) => onChange(h)} style={{ width: '100%', height: 170 }} />
            <input value={txt} maxLength={7} placeholder="#A9545F" className={inputCls + ' mt-3 font-mono uppercase'}
              onChange={(e) => { let v = e.target.value.trim(); setTxt(v); if (v && !v.startsWith('#')) v = '#' + v; if (ok(v)) onChange(v) }} />
            <div className="mt-3 flex items-center justify-between">
              {onReset ? <button type="button" className="text-xs text-ink-soft hover:text-ink" onClick={() => { onReset(); setOpen(false) }}>Reset</button> : <span />}
              <button type="button" className="text-xs font-medium text-twilight" onClick={() => setOpen(false)}>Done</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function FontPicker({ label, value, onChange, cats }: { label: string; value: string; onChange: (k: string) => void; cats: string[] }) {
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const down = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false) }
    const blur = () => setOpen(false)
    document.addEventListener('mousedown', down)
    window.addEventListener('blur', blur)
    return () => { document.removeEventListener('mousedown', down); window.removeEventListener('blur', blur) }
  }, [open])
  const [cat, setCat] = useState('all')
  const list = Object.entries(FONT_OPTIONS).filter(([, f]) => cats.includes(f.cat) && (cat === 'all' || f.cat === cat))
  const cur = FONT_OPTIONS[value]
  return (
    <div ref={boxRef} className="relative">
      <Row label={label}>
        <button type="button" onClick={() => setOpen(!open)} className="rounded-lg border border-line bg-white px-3 py-1.5 text-base text-ink" style={{ fontFamily: cur?.family }}>
          {cur?.label ?? 'Choose'} ▾
        </button>
      </Row>
      {open && (
        <>
          
          <div className="absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-3rem)] rounded-2xl border border-line bg-card p-3 shadow-lg">
            <Seg value={cat} options={[{ v: 'all', label: 'All' }, ...cats.map((c) => ({ v: c, label: CAT_LABEL[c] }))]} onChange={setCat} />
            <div className="mt-3 max-h-80 overflow-y-auto">
              {list.map(([k, f]) => (
                <button key={k} type="button" onClick={() => { onChange(k); setOpen(false) }}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-paper-deep ${k === value ? 'bg-paper-deep' : ''}`}>
                  <span className="text-xl text-ink" style={{ fontFamily: f.family }}>{f.label}</span>
                  {k === value && <span className="text-xs text-twilight">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

import { AboutCropper } from './AboutCropper'
const TB = '#B9AEA5'
const TL = '#D8CFC4'
const bx = (cls = '') => <div className={cls} style={{ background: 'linear-gradient(145deg,#D9C7B5 0%,#A8917C 55%,#7A6858 100%)', borderRadius: 2 }} />
const pcard = () => (
  <div className="flex flex-col items-center gap-1 border p-1 pt-2" style={{ borderColor: TB }}>
    <div className="h-1 w-3/4" style={{ background: TB }} />
    <div className="h-2 w-1/2" style={{ background: TL }} />
    <div className="h-1 w-3/5" style={{ background: TL }} />
  </div>
)
const pmenu = () => (
  <div className="flex items-end gap-1">
    <div className="h-1 w-6" style={{ background: TB }} />
    <div className="flex-1 border-b border-dotted" style={{ borderColor: TB }} />
    <div className="h-1 w-3" style={{ background: TB }} />
  </div>
)
const pcol = (b: boolean) => (
  <div className={`flex flex-col items-center gap-1 pt-2 ${b ? 'border-l' : ''}`} style={{ borderColor: TB }}>
    <div className="h-1 w-3/4" style={{ background: TB }} />
    <div className="h-2 w-1/2" style={{ background: TL }} />
    <div className="h-1 w-3/5" style={{ background: TL }} />
  </div>
)
const tcol = () => (
  <div className="flex flex-col items-center gap-1">
    {bx('w-full flex-1')}
    <div className="h-1 w-4/5" style={{ background: TL }} />
    <div className="h-1 w-3/5" style={{ background: TL }} />
  </div>
)
const tcard = () => (
  <div className="flex flex-col gap-1 border p-1" style={{ borderColor: TB }}>
    <div className="h-2 w-2" style={{ background: TB }} />
    <div className="h-1 w-full" style={{ background: TL }} />
    <div className="h-1 w-4/5" style={{ background: TL }} />
    <div className="h-1 w-2/5" style={{ background: TB }} />
  </div>
)
const xbar = (w: string, h: number, c = '#2A1F24', o = 1) => <div style={{ width: w, height: h, background: c, opacity: o, borderRadius: 1 }} />
const exv = (inner: React.ReactNode) => <div className="flex h-full flex-col justify-center gap-2.5"><div className="flex justify-center">{xbar('26%', 2, '#2A1F24', 0.45)}</div>{inner}</div>
const exw = (inner: React.ReactNode) => <div className="flex h-full flex-col gap-2"><div className="flex justify-center">{xbar('26%', 3, '#2A1F24', 0.45)}</div><div className="min-h-0 flex-1">{inner}</div></div>
const fld = (w: number, h: number, btn = true) => <div className="flex flex-col gap-[3px]" style={{ width: w, height: h, border: '1px solid #CBBFB0', borderRadius: 2, background: '#fff', padding: 5 }}>{xbar('50%', 2, '#2A1F24', 0.3)}{xbar('100%', 2, '#2A1F24', 0.18)}{xbar('100%', 2, '#2A1F24', 0.18)}{btn && <div className="mt-auto" style={{ height: 5, background: '#B08D57', borderRadius: 2 }} />}</div>
const cal = (sz: number) => <div className="flex flex-col overflow-hidden" style={{ width: sz, height: sz, border: '1px solid #CBBFB0', borderRadius: 2, background: '#fff' }}><div className="flex items-center justify-center" style={{ height: 8, background: '#EBE3D8', borderBottom: '1px solid #CBBFB0' }}>{xbar('34%', 2, '#2A1F24', 0.5)}</div><div className="flex-1" /></div>
const bkBtn = () => <div style={{ height: 8, background: '#B08D57', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{xbar('30%', 2, '#F6F1EA')}</div>
const dvd = (w = '70%') => <div style={{ width: w, height: 1, background: '#CFC4B8' }} />
const pavatar = (sz: number) => <div style={{ width: sz, height: sz, borderRadius: 999, background: 'linear-gradient(145deg,#D9C7B5,#7A6858)' }} />
const ln = (w = 'w-full') => <div className={`h-1 ${w}`} style={{ background: TL }} />
const THUMBS = {
  galGrid: <div className="grid h-full grid-cols-3 gap-1">{bx()}{bx()}{bx()}</div>,
  galBanners: <div className="flex h-full flex-col gap-1">{bx('flex-1')}{bx('flex-1')}{bx('flex-1')}</div>,
  galFeature: <div className="grid h-full grid-cols-3 grid-rows-2 gap-1">{bx('col-span-2 row-span-2')}{bx()}{bx()}</div>,
  galCarousel: <div className="flex h-full flex-col gap-1.5"><div className="flex flex-1 gap-1.5">{bx('flex-1')}{bx('flex-1')}{bx('flex-1')}</div><div className="flex justify-center gap-1"><div style={{ width: 10, height: 3, borderRadius: 2, background: '#2A1F24' }} /><div style={{ width: 3, height: 3, borderRadius: 2, background: '#2A1F24', opacity: 0.3 }} /><div style={{ width: 3, height: 3, borderRadius: 2, background: '#2A1F24', opacity: 0.3 }} /></div></div>,
  galRows: <div className="flex h-full flex-col gap-1"><div className="flex flex-1 gap-1">{bx('flex-[3]')}<div className="flex flex-[2] flex-col justify-center gap-1"><div className="h-1" style={{ background: TB }} /><div className="h-1 w-2/3" style={{ background: TB }} /></div></div><div className="flex flex-1 gap-1"><div className="flex flex-[2] flex-col justify-center gap-1"><div className="h-1" style={{ background: TB }} /><div className="h-1 w-2/3" style={{ background: TB }} /></div>{bx('flex-[3]')}</div></div>,
  phMasonry: (
    <div className="flex h-full gap-1">
      <div className="flex flex-1 flex-col gap-1">{bx('flex-[3]')}{bx('flex-[2]')}</div>
      <div className="flex flex-1 flex-col gap-1">{bx('flex-[2]')}{bx('flex-[3]')}</div>
      <div className="flex flex-1 flex-col gap-1">{bx('flex-1')}{bx('flex-1')}{bx('flex-1')}</div>
    </div>
  ),
  phGrid: <div className="grid h-full grid-cols-3 grid-rows-2 gap-1">{bx()}{bx()}{bx()}{bx()}{bx()}{bx()}</div>,
  phSingle: <div className="mx-auto flex h-full w-3/5 flex-col gap-1">{bx('flex-1')}{bx('flex-1')}</div>,
  prCards: <div className="grid h-full grid-cols-3 gap-1.5">{[0, 1, 2].map((i) => <div key={i} className="flex flex-col items-center justify-center gap-1.5" style={{ background: '#EBE3D8', border: i === 1 ? '1px solid #B08D57' : '1px solid #D8CDBF', borderRadius: 2 }}>{xbar('60%', 5)}{xbar('38%', 5, '#B08D57')}{xbar('26%', 1, '#CBBFB0')}{xbar('78%', 2, '#2A1F24', 0.35)}{xbar('66%', 2, '#2A1F24', 0.35)}{xbar('72%', 2, '#2A1F24', 0.35)}</div>)}</div>,
  prMenu: <div className="flex h-full flex-col justify-around">{[0, 1, 2].map((i) => <div key={i} className="flex flex-col gap-1" style={{ borderTop: i > 0 ? '1px solid #CBBFB0' : undefined, paddingTop: i > 0 ? 5 : 0 }}><div className="flex items-end gap-1.5">{xbar('30%', 5)}<div className="flex-1" style={{ borderBottom: '1px dotted #A89C8E', marginBottom: 2 }} />{xbar('14%', 5, '#B08D57')}</div>{xbar('82%', 2, '#2A1F24', 0.35)}</div>)}</div>,
  prCols: <div className="grid h-full grid-cols-3" style={{ gap: 1, background: '#CBBFB0', border: '1px solid #CBBFB0' }}>{[0, 1, 2].map((i) => <div key={i} className="flex flex-col items-center justify-center gap-1.5" style={{ background: i === 1 ? '#EBE3D8' : '#F6F1EA' }}>{xbar('55%', 5)}{xbar('36%', 5, '#B08D57')}{xbar('22%', 1, '#B08D57')}{xbar('72%', 2, '#2A1F24', 0.35)}{xbar('62%', 2, '#2A1F24', 0.35)}{xbar('68%', 2, '#2A1F24', 0.35)}</div>)}</div>,
  teGrid: <div className="grid h-full grid-cols-3 gap-2">{[0, 1, 2].map((i) => <div key={i} className="flex flex-col items-center gap-1">{bx('w-full flex-1')}{xbar('92%', 2, '#2A1F24', 0.35)}{xbar('68%', 2, '#2A1F24', 0.35)}{xbar('22%', 1, '#B08D57')}{xbar('46%', 2, '#2A1F24', 0.55)}</div>)}</div>,
  teStacked: <div className="flex h-full flex-col justify-around">{[0, 1].map((i) => <div key={i} className="flex flex-col items-center gap-1" style={{ borderTop: i > 0 ? '1px solid #CBBFB0' : undefined, paddingTop: i > 0 ? 5 : 0 }}><div style={{ fontFamily: 'Georgia, serif', fontSize: 15, lineHeight: '10px', color: '#B08D57', height: 8 }}>&ldquo;</div>{xbar('62%', 2, '#2A1F24', 0.35)}{xbar('44%', 2, '#2A1F24', 0.35)}<div className="flex items-center gap-1"><div style={{ width: 8, height: 8, borderRadius: 999, background: '#CBBFB0' }} />{xbar('22px', 2, '#2A1F24', 0.55)}</div></div>)}</div>,
  abLeft: <div className="flex h-full gap-2">{bx('w-2/5')}<div className="flex flex-1 flex-col justify-center gap-1.5">{xbar('60%', 6)}{xbar('100%', 2, '#2A1F24', 0.35)}{xbar('100%', 2, '#2A1F24', 0.35)}{xbar('100%', 2, '#2A1F24', 0.35)}{xbar('55%', 2, '#2A1F24', 0.35)}</div></div>,
  abRight: <div className="flex h-full gap-2"><div className="flex flex-1 flex-col justify-center gap-1.5">{xbar('60%', 6)}{xbar('100%', 2, '#2A1F24', 0.35)}{xbar('100%', 2, '#2A1F24', 0.35)}{xbar('100%', 2, '#2A1F24', 0.35)}{xbar('55%', 2, '#2A1F24', 0.35)}</div>{bx('w-2/5')}</div>,
  abStack: <div className="flex h-full flex-col gap-2">{bx('h-[48%]')}<div className="flex flex-1 flex-col items-center justify-center gap-1.5">{xbar('45%', 6)}{xbar('85%', 2, '#2A1F24', 0.35)}{xbar('70%', 2, '#2A1F24', 0.35)}</div></div>,
  bkCentered: <div className="flex h-full flex-col items-center justify-center gap-1">{ln('w-3/5')}{ln('w-4/5')}{bx('h-3 w-4/5')}{bx('h-3 w-4/5')}</div>,
  bkSide: <div className="flex h-full gap-1">{bx('w-2/5')}<div className="flex flex-1 flex-col justify-center gap-1">{ln()}{bx('h-3')}{bx('h-3')}</div></div>,
  bkBanner: <div className="flex h-full flex-col gap-1">{bx('h-1/3')}<div className="flex flex-1 flex-col items-center justify-center gap-1">{ln('w-3/5')}{bx('h-3 w-4/5')}</div></div>,
  abText: <div className="flex h-full flex-col items-center gap-2">{xbar('34%', 6)}{xbar('85%', 2, '#2A1F24', 0.35)}{xbar('70%', 2, '#2A1F24', 0.35)}{bx('w-full flex-1')}</div>,
  abCollage: (
    <div className="relative h-full w-full">
      <div style={{ position: 'absolute', left: 0, top: 0, width: '50%', height: '74%', background: 'linear-gradient(145deg,#D9C7B5 0%,#A8917C 55%,#7A6858 100%)', borderRadius: 10 }} />
      <div className="flex flex-col gap-1" style={{ position: 'absolute', left: '34%', right: '5%', top: '40%', bottom: '4%', background: '#EBE3D8', borderRadius: 6, boxShadow: '0 3px 8px rgba(0,0,0,0.12)', padding: 6 }}>
        {xbar('55%', 5)}{xbar('100%', 2, '#2A1F24', 0.35)}{xbar('100%', 2, '#2A1F24', 0.35)}{xbar('70%', 2, '#2A1F24', 0.35)}
      </div>
    </div>
  ),
  abFree: (
    <div className="relative h-full w-full">
      <div style={{ position: 'absolute', left: '4%', top: '6%', width: '40%', height: '56%', background: 'linear-gradient(145deg,#D9C7B5 0%,#A8917C 55%,#7A6858 100%)', borderRadius: 2 }} />
      <div className="flex flex-col gap-1" style={{ position: 'absolute', left: '52%', top: '10%', width: '42%' }}>
        {xbar('70%', 5)}{xbar('100%', 2, '#2A1F24', 0.35)}{xbar('90%', 2, '#2A1F24', 0.35)}{xbar('60%', 2, '#2A1F24', 0.35)}
      </div>
      <div style={{ position: 'absolute', left: '30%', top: '46%', width: '34%', height: '44%', background: 'linear-gradient(145deg,#C9BCAE,#8F7C6B)', borderRadius: 2, outline: '1px dashed #B08D57', outlineOffset: 2 }} />
      <div style={{ position: 'absolute', left: 'calc(64% - 3px)', top: 'calc(90% - 3px)', width: 7, height: 7, background: '#B08D57', borderRadius: 2 }} />
    </div>
  ),
  teCards: <div className="grid h-full grid-cols-3 gap-2">{[0, 1, 2].map((i) => <div key={i} className="flex flex-col gap-1" style={{ background: '#fff', borderRadius: 6, boxShadow: '0 3px 8px rgba(0,0,0,0.12)', padding: 6 }}><div style={{ fontFamily: 'Georgia, serif', fontSize: 15, lineHeight: '10px', color: '#B08D57', height: 8 }}>&ldquo;</div>{xbar('100%', 2, '#2A1F24', 0.35)}{xbar('100%', 2, '#2A1F24', 0.35)}{xbar('70%', 2, '#2A1F24', 0.35)}<div className="flex-1" />{xbar('16%', 1, '#B08D57')}<div className="flex items-center gap-1"><div style={{ width: 7, height: 7, borderRadius: 999, background: '#CBBFB0' }} />{xbar('40%', 2, '#2A1F24', 0.55)}</div></div>)}</div>,
}

function LayoutPicker<V extends string>({ value, options, onChange }: { value: V; options: { v: V; name: string; thumb: React.ReactNode }[]; onChange: (v: V) => void }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {options.map((o) => (
        <button key={o.v} type="button" onClick={() => onChange(o.v)} className="group text-left">
          <div className={`overflow-hidden rounded-lg transition ${value === o.v ? 'ring-2 ring-ink ring-offset-2 ring-offset-card' : 'ring-1 ring-line group-hover:ring-ink-soft'}`}>
            <div className="h-[120px] p-3" style={{ background: '#F6F1EA' }}>{o.thumb}</div>
          </div>
          <p className="mt-2 font-fraunces text-sm text-ink">{o.name}</p>
        </button>
      ))}
    </div>
  )
}

function Thumb({ kind }: { kind: string }) {
  const PH = 'linear-gradient(145deg,#D9C7B5 0%,#A8917C 55%,#7A6858 100%)'
  const PH2 = 'linear-gradient(145deg,#C9D2C4 0%,#8E9C8A 100%)'
  const PH3 = 'linear-gradient(145deg,#D6C3C6 0%,#A58A90 100%)'
  const ink = '#2A1F24'
  const cream = '#F6F1EA'
  const brass = '#B08D57'
  const bar = (w: number | string, h: number, c: string, o = 1, mb = 0) => (
    <div style={{ width: w, height: h, background: c, opacity: o, borderRadius: 2, marginBottom: mb }} />
  )
  const navBar = (c: string) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px' }}>
      {bar(20, 3, c, 0.95)}
      <div style={{ display: 'flex', gap: 4 }}>{bar(8, 2, c, 0.6)}{bar(8, 2, c, 0.6)}{bar(8, 2, c, 0.6)}</div>
    </div>
  )
  const pill = (c: string, w = 30) => <div style={{ width: w, height: 8, background: c, borderRadius: 1 }} />
  const col = { display: 'flex', flexDirection: 'column', alignItems: 'center' } as const

  return (
    <div style={{ position: 'relative', height: 120, background: cream, overflow: 'hidden' }}>
      {kind === 'editorial' && (
        <>
          <div style={{ position: 'absolute', inset: 0, background: PH }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(rgba(0,0,0,0.04), rgba(0,0,0,0.38))' }} />
          <div style={{ position: 'absolute', left: 0, right: 0, top: 0 }}>{navBar('#fff')}</div>
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 16, ...col }}>
            {bar(74, 6, '#fff', 0.95, 4)}{bar(46, 2, '#fff', 0.7, 9)}{pill('#fff', 30)}
          </div>
        </>
      )}
      {kind === 'split' && (
        <div style={{ display: 'flex', height: '100%' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {navBar(ink)}
            <div style={{ flex: 1, padding: '0 11px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              {bar(16, 2, brass, 1, 7)}{bar('88%', 6, ink, 0.9, 3)}{bar('62%', 6, ink, 0.9, 8)}{bar('78%', 2, ink, 0.3, 3)}{bar('56%', 2, ink, 0.3, 9)}{pill(ink, 28)}
            </div>
          </div>
          <div style={{ flex: 1, background: PH }} />
        </div>
      )}
      {kind === 'minimal' && (
        <>
          <div style={{ position: 'absolute', inset: 0, background: '#fff' }} />
          <div style={{ position: 'relative', ...col }}>
            <div style={{ padding: '9px 0 8px', ...col, gap: 4 }}>
              {bar(22, 3, ink, 0.9)}
              <div style={{ display: 'flex', gap: 6 }}>{bar(10, 2, ink, 0.3)}{bar(10, 2, ink, 0.3)}{bar(10, 2, ink, 0.3)}</div>
            </div>
            <div style={{ width: '86%', height: 54, background: PH }} />
            <div style={{ marginTop: 9, ...col }}>{bar(66, 5, ink, 0.9, 4)}{bar(40, 2, ink, 0.3)}</div>
          </div>
        </>
      )}
      {kind === 'framed' && (
        <>
          <div style={{ position: 'absolute', inset: 0, background: PH }} />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.14)' }} />
          <div style={{ position: 'absolute', left: 0, right: 0, top: 0 }}>{navBar('#fff')}</div>
          <div style={{ position: 'absolute', left: '24%', right: '24%', top: '32%', bottom: '14%', background: cream, padding: 4, boxShadow: '0 6px 18px rgba(0,0,0,0.18)' }}>
            <div style={{ height: '100%', border: '1px solid rgba(42,31,36,0.25)', ...col, justifyContent: 'center' }}>
              {bar(8, 2, brass, 1, 5)}{bar('70%', 5, ink, 0.9, 3)}{bar('46%', 2, ink, 0.3, 7)}{pill(ink, 24)}
            </div>
          </div>
        </>
      )}
      {kind === 'magazine' && (
        <>
          {navBar(ink)}
          <div style={{ padding: '2px 11px' }}>
            {bar('92%', 10, ink, 0.92, 3)}{bar('64%', 10, ink, 0.92)}
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '44%', background: PH }} />
        </>
      )}
      {kind === 'mosaic' && (
        <>
          {navBar(ink)}
          <div style={{ ...col, paddingBottom: 6 }}>{bar(62, 5, ink, 0.9, 4)}{pill(brass, 22)}</div>
          <div style={{ position: 'absolute', left: 10, right: 10, bottom: 10, height: 50, display: 'grid', gridTemplateColumns: '1.4fr 1fr', gridTemplateRows: '1fr 1fr', gap: 3 }}>
            <div style={{ gridRow: 'span 2', background: PH }} />
            <div style={{ background: PH2 }} />
            <div style={{ background: PH3 }} />
          </div>
        </>
      )}
    </div>
  )
}

import { heroStarter } from '@/lib/aboutCanvas'

const CV_ICONS: Record<string, string> = { door: 'M5 12h14M13 6l6 6-6 6',
  photo: 'M3 5h18v14H3z M3 16l5-5 4 4 3-3 6 6',
  card: 'M4 5h16v14H4z M8 10h8 M8 14h5',
  heading: 'M6 5v14 M18 5v14 M6 12h12',
  button: 'M3 8h18v8H3z M8 12h8',
  gallery: 'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  logo: 'M12 3l2.5 5.5 6 .8-4.4 4.1 1.1 6L12 16.6l-5.2 2.8 1.1-6L3.5 9.3l6-.8z',
  title: 'M5 7V5h14v2 M12 5v14 M9 19h6',
  subtitle: 'M4 9h16 M4 15h10',
}

export default function WebsitePage() {
  const router = useRouter()
  const [form, setForm] = useState<Site | null>(null)
  const [saved, setSaved] = useState<Site | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [focusIdx, setFocusIdx] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState(false)
  const [device, setDevice] = useState<Dev>('desktop')
  const [previewPage, setPreviewPage] = useState<'home' | 'galleries' | 'gallery' | 'about' | 'availability' | 'blog'>('home')
  const [heroBox, setHeroBox] = useState<{ w: number; h: number } | null>(null)
  const [tab, setTab] = useState<'style' | 'home' | 'galleries' | 'about' | 'book' | 'blog'>('home')
  const [blogSel, setBlogSel] = useState<string | null>(null)
  useEffect(() => {
    try {
      const t = sessionStorage.getItem('camrhia-design-tab')
      if (t === 'style' || t === 'home' || t === 'galleries' || t === 'about' || t === 'book' || t === 'blog') {
        setTab(t)
        setPreviewPage(t === 'book' ? 'availability' : t === 'style' ? 'home' : t)
      }
    } catch { /* ignore */ }
  }, [])
  useEffect(() => {
    try { sessionStorage.setItem('camrhia-design-tab', tab) } catch { /* ignore */ }
  }, [tab])
  const [firstGid, setFirstGid] = useState<string | null>(null)
  const [showSent, setShowSent] = useState(false)
  const [slugOverride, setSlugOverride] = useState<string | null>(null)
  const [slugEdit, setSlugEdit] = useState(false)
  const [slugDraft, setSlugDraft] = useState('')
  const [slugMsg, setSlugMsg] = useState('')
  const [slugSaving, setSlugSaving] = useState(false)
  const [cvSel, setCvSel] = useState<string | null>(null)
  const [cvBoard, setCvBoard] = useState<string | null>(null)
  const [cvNew, setCvNew] = useState<string | null>(null)
  const [cvGalleries, setCvGalleries] = useState<{ id: string; title: string }[]>([])
  const [featured, setFeatured] = useState<{ id: string; title: string; cover: string | null }[]>([])
  const cvBridge = useState(() => ({ upd: null as any, board: null as string | null }))[0]

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      const d = e.data as { type?: string; dev?: string; board?: unknown; id?: string | null; boardId?: string; list?: unknown } | null
      if (!d) return
      if (d.type === 'camrhia-canvas' && d.dev && d.board && cvBridge.upd) {
        const bid = d.boardId ?? 'about'
        cvBridge.upd((st: any) => {
          if (bid === 'explore') {
            st.explore = { ...(st.explore ?? {}), canvas: { ...((st.explore ?? {}).canvas ?? {}), [d.dev as string]: d.board } }
          } else if (bid === 'featured') {
            st.portfolio = { ...(st.portfolio ?? {}), canvas: { ...((st.portfolio ?? {}).canvas ?? {}), [d.dev as string]: d.board } }
          } else if (bid === 'galleries') {
            st.galindex = { ...(st.galindex ?? {}), canvas: { ...((st.galindex ?? {}).canvas ?? {}), [d.dev as string]: d.board } }
          } else if (bid.startsWith('gal:')) {
            const gid2 = bid.slice(4)
            const gpp = { ...(st.galpage ?? {}) }
            const cvs = { ...(gpp.canvases ?? {}) }
            cvs[gid2] = { ...(cvs[gid2] ?? {}), [d.dev as string]: d.board }
            gpp.canvases = cvs
            st.galpage = gpp
          } else if (bid === 'hero') {
            st.hero = { ...(st.hero ?? {}), canvas: { ...((st.hero ?? {}).canvas ?? {}), [d.dev as string]: d.board } }
          } else if (bid === 'about') {
            const a2 = { ...(st.about ?? {}) }
            a2.canvas = { ...(a2.canvas ?? {}), [d.dev as string]: d.board }
            st.about = a2
          } else {
            st.customs = ((st.customs ?? []) as any[]).map((c) => (c.id === bid ? { ...c, canvas: { ...(c.canvas ?? {}), [d.dev as string]: d.board } } : c))
          }
        })
      }
      if (d.type === 'camrhia-galleries' && Array.isArray(d.list)) setCvGalleries(d.list as { id: string; title: string }[])
      if (d.type === 'camrhia-featured' && Array.isArray(d.list)) setFeatured(d.list as { id: string; title: string; cover: string | null }[])
      if (d.type === 'camrhia-hero-box') { const hb = d as unknown as { w?: unknown; h?: unknown }; if (typeof hb.w === 'number' && typeof hb.h === 'number' && hb.h > 0) setHeroBox({ w: hb.w, h: hb.h }) }
      if (d.type === 'camrhia-canvas-select') {
        if (d.id == null) {
          if (cvBridge.board && d.boardId !== cvBridge.board) return
          cvBridge.board = null
          setCvSel(null)
          setCvBoard(null)
        } else {
          cvBridge.board = d.boardId ?? 'about'
          setCvSel(d.id)
          setCvBoard(d.boardId ?? 'about')
        }
      }
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [cvBridge])

  useEffect(() => {
    if (!slugEdit) return
    const v = slugDraft.trim().toLowerCase()
    setSlugMsg('Checking…')
    const id = setTimeout(async () => {
      if (!supabase) return
      const { data, error } = await supabase.rpc('check_slug_available', { p_slug: v })
      setSlugMsg(error ? 'Could not check that name' : String(data))
    }, 400)
    return () => clearTimeout(id)
  }, [slugDraft, slugEdit])
  const [stageEl, setStageEl] = useState<HTMLDivElement | null>(null)
  const [stageW, setStageW] = useState(0)
  const formRef = useRef<Site | null>(null)
  const previewPageRef = useRef<string>('home')
  const curKeyRef = useRef<string>('home|0')
  const previewSrcRef = useRef<(k: string) => string>(() => '')
  const [previewGid, setPreviewGid] = useState<string | null>(null)
  const [tms, setTms] = useState<Tm[]>([])
  const [pkgs, setPkgs] = useState<WPkg[]>([])
  const [ownPkgs, setOwnPkgs] = useState<OwnPkg[]>([])
  const [tName, setTName] = useState('')
  const [tQuote, setTQuote] = useState('')
  const [tFile, setTFile] = useState<File | null>(null)
  const [tBusy, setTBusy] = useState(false)
  const [tSlot, setTSlot] = useState(0)
  const [gSlot, setGSlot] = useState(0)
  const [studioName, setStudioName] = useState('')
  const [pSlot, setPSlot] = useState(0)
  useEffect(() => {
    const h = (e: MessageEvent) => { const d = e.data; if (d && d.type === 'camrhia-studio' && typeof d.name === 'string') setStudioName(d.name) }
    window.addEventListener('message', h)
    return () => window.removeEventListener('message', h)
  }, [])
  const [previewKey, setPreviewKey] = useState(0)
  const [seen, setSeen] = useState<string[]>([])
  const [candsDb, setCandsDb] = useState<string[]>([])
  const [extraHero, setExtraHero] = useState<string[]>([])

  const load = useCallback(async () => {
    const sb = supabase
    if (!sb) return
    const { data: sess } = await sb.auth.getSession()
    if (!sess.session) { router.replace('/login?next=/website'); return }
    const { data, error } = await sb.from('profiles').select(COLUMNS).eq('id', sess.session.user.id).single()
    if (error || !data) { setMessage(error?.message ?? 'Could not load your profile.'); return }
    setForm(data as Site)
    setSaved(data as Site)
  }, [router])
  useEffect(() => { load() }, [load])

  const sendPreview = useCallback(() => {
    const f = formRef.current
    if (!f) return
    const patch = {
      logo_path: f.logo_path,
      instagram_url: f.instagram_url,
      facebook_url: f.facebook_url,
      pinterest_url: f.pinterest_url,
      tiktok_url: f.tiktok_url,
      site_template: f.site_template ?? 'editorial',
      site_accent: f.site_accent,
      site_font_pair: f.site_font_pair ?? 'serif',
      site_headline: f.site_headline,
      site_subhead: f.site_subhead,
      site_sections: f.site_sections ?? {},
      site_settings: f.site_settings ?? {},
    }
    const frame = document.getElementById('site-frame') as HTMLIFrameElement | null
    frame?.contentWindow?.postMessage({ type: 'camrhia-preview', patch }, '*')
  }, [])
  useEffect(() => {
    formRef.current = form
    const t = setTimeout(sendPreview, 80)
    return () => clearTimeout(t)
  }, [form, sendPreview])
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e.data && e.data.type === 'camrhia-preview-ready') {
        sendPreview()
        const frame = document.getElementById('site-frame') as HTMLIFrameElement | null
        const pg = e.data.page as string | null | undefined
        if (frame && pg && e.source === frame.contentWindow && pg !== previewPageRef.current) {
          frame.src = previewSrcRef.current(curKeyRef.current)
          if (pg === 'gallery') setPreviewGid((e.data.gid as string | undefined) ?? null)
          setTab(pg === 'availability' ? 'book' : pg === 'gallery' ? 'galleries' : (pg as 'home' | 'galleries' | 'about' | 'blog'))
          setPreviewPage(pg as 'home' | 'galleries' | 'gallery' | 'about' | 'availability' | 'blog')
        }
      }
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [sendPreview])
  useEffect(() => {
    if (!stageEl) return
    const ro = new ResizeObserver(() => setStageW(stageEl.clientWidth))
    ro.observe(stageEl)
    setStageW(stageEl.clientWidth)
    return () => ro.disconnect()
  }, [stageEl])

  const curKey = `${previewPage}|${showSent ? 1 : 0}`
  curKeyRef.current = curKey
  previewPageRef.current = previewPage
  useEffect(() => {
    setSeen((x) => (x.includes(curKey) ? x : [...x, curKey]))
    const t = setTimeout(sendPreview, 120)
    return () => clearTimeout(t)
  }, [curKey, sendPreview])
  useEffect(() => {
    const t = setTimeout(() => setSeen((x) => {
      const add = ['galleries|0', 'about|0', 'availability|0', 'blog|0'].filter((k) => !x.includes(k))
      return add.length ? [...x, ...add] : x
    }), 2500)
    return () => clearTimeout(t)
  }, [])

  const loadExtras = useCallback(async () => {
    const sb = supabase
    if (!sb) return
    const { data: sess } = await sb.auth.getSession()
    const id = sess.session?.user.id
    if (!id) return
    const { data } = await sb.from('testimonials').select('id, storage_path, quote, client_name, sort_order').eq('owner_id', id).order('sort_order', { ascending: true })
    setTms((data ?? []) as Tm[])
    const pk = await sb.from('website_packages').select('id, title, price, description, sort_order, source_package_id').eq('photographer_id', id).order('sort_order', { ascending: true })
    setPkgs((pk.data ?? []) as WPkg[])
    const op = await sb.from('packages').select('id, name, price, covers, detail, session_type').eq('owner_id', id).order('sort_order', { ascending: true })
    setOwnPkgs((op.data ?? []) as OwnPkg[])
    const ph = await sb.from('website_photos').select('storage_path').eq('photographer_id', id).order('created_at', { ascending: false }).limit(80)
    setCandsDb(((ph.data ?? []) as { storage_path: string }[]).map((x) => x.storage_path))
    const gl = await sb.from('website_galleries').select('id').eq('photographer_id', id).order('sort_order', { ascending: true }).limit(1)
    setFirstGid(((gl.data ?? []) as { id: string }[])[0]?.id ?? null)
  }, [])
  useEffect(() => { loadExtras() }, [loadExtras])
  useEffect(() => {
    const sb = supabase
    if (!sb) return
    let timer: ReturnType<typeof setTimeout> | null = null
    const refresh = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => { loadExtras(); setPreviewKey((k) => k + 1) }, 400)
    }
    const ch = sb.channel('site-pkgs').on('postgres_changes', { event: '*', schema: 'public', table: 'packages' }, refresh).subscribe()
    const onFocus = () => { loadExtras() }
    window.addEventListener('focus', onFocus)
    return () => { if (timer) clearTimeout(timer); sb.removeChannel(ch); window.removeEventListener('focus', onFocus) }
  }, [loadExtras])

  function flash(text: string) {
    setMessage(text)
    setTimeout(() => setMessage((m) => (m === text ? null : m)), 2500)
  }
  function set<K extends keyof Site>(key: K, val: Site[K]) {
    setForm((f) => (f ? { ...f, [key]: val } : f))
  }
  function upd(fn: (s: Record<string, any>) => void) {
    setForm((f) => {
      if (!f) return f
      const s = JSON.parse(JSON.stringify(f.site_settings ?? {})) as Record<string, any>
      fn(s)
      return { ...f, site_settings: s }
    })
  }
  const [genBusy, setGenBusy] = useState(false)
  async function generateSite(styleKey: string) {
    if (!form) return
    const looks: Record<string, { tpl: string; pair: string; bg: string; text: string; tint: string; shape: string }> = {
      airy: { tpl: 'minimal', pair: 'serif', bg: '#FAF6EF', text: '#2A1F24', tint: '#F0EAE1', shape: 'pill' },
      moody: { tpl: 'editorial', pair: 'romantic', bg: '#1E1A1C', text: '#F3ECE4', tint: '#2A2427', shape: 'square' },
      classic: { tpl: 'framed', pair: 'serif', bg: '#FFFFFF', text: '#1A1A1A', tint: '#F5F2EE', shape: 'rounded' },
      bold: { tpl: 'magazine', pair: 'modern', bg: '#FFFFFF', text: '#111111', tint: '#F2F2F2', shape: 'square' },
    }
    const look = looks[styleKey]
    if (!look) return
    setGenBusy(true)
    const accent = form.brand_colors_named?.primary || form.accent_color || '#A9545F'
    const n = parseInt(accent.slice(1), 16)
    const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
    set('site_template', look.tpl)
    set('site_font_pair', look.pair)
    set('site_accent', accent)
    upd((st) => {
      st.fonts = { ...(st.fonts ?? {}) }
      delete st.fonts.head
      delete st.fonts.body
      st.colors = { ...(st.colors ?? {}), bg: look.bg, text: look.text, tint: look.tint }
      st.button = { ...(st.button ?? {}), shape: look.shape, text: lum > 0.6 ? '#1A1A1A' : '#FFFFFF' }
    })
    if (!(form.site_headline ?? '').trim() || !(form.site_subhead ?? '').trim()) {
      const sb = supabase
      const { data } = sb ? await sb.from('profiles').select('studio_name, service_city, service_state').eq('id', form.id).single() : { data: null }
      const where = [data?.service_city, data?.service_state].filter(Boolean).join(', ')
      if (!(form.site_headline ?? '').trim()) set('site_headline', data?.studio_name ? String(data.studio_name) : 'Photography that feels like you')
      if (!(form.site_subhead ?? '').trim()) set('site_subhead', where ? `Photographer in ${where}` : 'Photographer')
    }
    setGenBusy(false)
    setMessage('Done. Check the preview, change anything you like.')
  }
  function pickPair(k: string) {
    setForm((f) => {
      if (!f) return f
      const s = JSON.parse(JSON.stringify(f.site_settings ?? {})) as Record<string, any>
      if (s.fonts) { delete s.fonts.head; delete s.fonts.body }
      return { ...f, site_font_pair: k, site_settings: s }
    })
  }
  const dirty = JSON.stringify(form) !== JSON.stringify(saved)
  useEffect(() => { setSaveErr(false) }, [form])
  useEffect(() => {
    if (!dirty || saving || saveErr) return
    const id = setTimeout(() => { save() }, 1500)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, dirty, saving, saveErr])

  async function save() {
    const sb = supabase
    if (!form || !sb) return
    setSaving(true)
    const { error } = await sb.from('profiles').update({
      logo_path: form.logo_path,
      instagram_url: form.instagram_url?.trim() || null,
      facebook_url: form.facebook_url?.trim() || null,
      pinterest_url: form.pinterest_url?.trim() || null,
      tiktok_url: form.tiktok_url?.trim() || null,
      site_template: form.site_template ?? 'editorial',
      site_accent: form.site_accent,
      site_font_pair: form.site_font_pair ?? 'serif',
      site_headline: form.site_headline?.trim() || null,
      site_subhead: form.site_subhead?.trim() || null,
      site_sections: form.site_sections ?? {},
      site_settings: form.site_settings ?? {},
    }).eq('id', form.id)
    setSaving(false)
    if (error) { setSaveErr(true); flash(error.message); return }
    setSaveErr(false)
    setSaved(form)
  }

  function toggleHero(path: string) {
    upd((s) => {
      const cur: string[] = [...(s.hero?.photos ?? [])]
      const i = cur.indexOf(path)
      if (i >= 0) cur.splice(i, 1)
      else if (cur.length < 6) cur.push(path)
      s.hero = { ...(s.hero ?? {}), photos: cur }
    })
  }
  async function uploadHero(file: File) {
    const sb = supabase
    if (!sb) return
    const { data: sess } = await sb.auth.getSession()
    const id = sess.session?.user.id
    if (!id) return
    try {
      const v = await makeVersions(file)
      const path = `${id}/hero_${Date.now()}.jpg`
      const up = await sb.storage.from('portfolio').upload(path, v.web.blob, { contentType: 'image/jpeg', upsert: true })
      if (up.error) throw up.error
      setExtraHero((c) => [path, ...c])
      toggleHero(path)
    } catch (e) {
      flash((e as { message?: string })?.message ?? 'Upload failed.')
    }
  }

  async function uploadLogo(file: File) {
    const sb = supabase
    if (!sb) return
    const { data: sess } = await sb.auth.getSession()
    const id = sess.session?.user.id
    if (!id) return
    try {
      const keep = /\.(png|svg|webp)$/i.test(file.name)
      const ext = keep ? (file.name.split('.').pop() ?? 'png').toLowerCase() : 'jpg'
      const body: Blob = keep ? file : (await makeVersions(file)).web.blob
      const ct = ext === 'svg' ? 'image/svg+xml' : ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
      const path = `${id}/logo_${Date.now()}.${ext}`
      const up = await sb.storage.from('portfolio').upload(path, body, { contentType: ct, upsert: true })
      if (up.error) throw up.error
      set('logo_path', path)
    } catch (e) {
      flash((e as { message?: string })?.message ?? 'Logo upload failed.')
    }
  }

  const slugOf = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'post'
  function blogList(): any[] { return Array.isArray(S.blog?.posts) ? (S.blog.posts as any[]) : [] }
  function setPosts(next: any[]) { setIn('blog', { posts: next }) }
  function addPost() {
    const pid = Math.random().toString(36).slice(2, 10)
    const p = { id: pid, slug: 'new-post-' + pid.slice(0, 4), title: 'New post', date: new Date().toISOString().slice(0, 10), cover: null, excerpt: '', body: '', published: false }
    setPosts([p, ...blogList()])
    setBlogSel(pid)
  }
  function editPost(pid: string, patch: Record<string, any>) { setPosts(blogList().map((p) => (p.id === pid ? { ...p, ...patch } : p))) }
  function removePost(pid: string) { setPosts(blogList().filter((p) => p.id !== pid)); setBlogSel(null) }
  async function uploadPostCover(pid: string, file: File) {
    const sb = supabase
    if (!sb) return
    const { data: sess } = await sb.auth.getSession()
    const id = sess.session?.user.id
    if (!id) return
    try {
      const v = await makeVersions(file)
      const path = `${id}/blog_${pid}_${Date.now()}.jpg`
      const up = await sb.storage.from('portfolio').upload(path, v.web.blob, { contentType: 'image/jpeg', upsert: true })
      if (up.error) throw up.error
      editPost(pid, { cover: path })
    } catch (e) {
      flash((e as { message?: string })?.message ?? 'Upload failed.')
    }
  }

  async function uploadAbout(file: File) {
    const sb = supabase
    if (!sb) return
    const { data: sess } = await sb.auth.getSession()
    const id = sess.session?.user.id
    if (!id) return
    try {
      const v = await makeVersions(file)
      const path = `${id}/about_site_${Date.now()}.jpg`
      const up = await sb.storage.from('portfolio').upload(path, v.web.blob, { contentType: 'image/jpeg', upsert: true })
      if (up.error) throw up.error
      setIn('about', { photo: path })
    } catch (e) {
      flash((e as { message?: string })?.message ?? 'Upload failed.')
    }
  }

  async function uploadAbout2(file: File) {
    const sb = supabase
    if (!sb) return
    const { data: sess } = await sb.auth.getSession()
    const id = sess.session?.user.id
    if (!id) return
    try {
      const v = await makeVersions(file)
      const path = `${id}/about2_${Date.now()}.jpg`
      const up = await sb.storage.from('portfolio').upload(path, v.web.blob, { contentType: 'image/jpeg', upsert: true })
      if (up.error) throw up.error
      setIn('about', { photo2: path })
    } catch (e) {
      flash((e as { message?: string })?.message ?? 'Upload failed.')
    }
  }

  function canvasPanel(boardId: string, part: 'layout' | 'tiles' = 'layout') {
    const isAbout = boardId === 'about'
    const isFeat = boardId === 'featured'
    const isExplore = boardId === 'explore'
    const isGal = boardId === 'galleries' || isFeat
    const isHero = boardId === 'hero'
    const isGalPage = boardId.startsWith('gal:')
    const gpid = boardId.slice(4)
    const customsList = (S.customs ?? []) as any[]
    const canvasData = isGalPage ? (S.galpage?.canvases ?? {})[gpid] : isHero ? S.hero?.canvas : isAbout ? S.about?.canvas : isExplore ? S.explore?.canvas : isFeat ? S.portfolio?.canvas : isGal ? S.galindex?.canvas : customsList.find((c) => c.id === boardId)?.canvas
    const ph2 = isAbout ? S.about?.photo2 : null
    const galIds = cvGalleries.map((g) => g.id)
    const b = isGalPage && !hasBoard(canvasData, device) ? { h: 88, items: [] as CItem[] } : isHero && !hasBoard(canvasData, device) ? heroStarter(device, heroSel.slice(0, 3)) : isExplore && !hasBoard(canvasData, device) ? exploreStarter(device) : isGal && !hasBoard(canvasData, device) ? galleryStarter(device, isFeat ? featured.map((g) => g.id) : galIds) : getBoard(canvasData, device, ph2, !isAbout)
    const sel: CItem | null = cvBoard === boardId ? (b.items.find((i) => i.id === cvSel) ?? null) : null
    const setBoard = (nb: { h: number; items: CItem[] }) => upd((st: any) => {
      if (isGalPage) {
        const gp2 = { ...(st.galpage ?? {}) }
        const cvs2 = { ...(gp2.canvases ?? {}) }
        cvs2[gpid] = { ...(cvs2[gpid] ?? {}), [device]: nb }
        gp2.canvases = cvs2
        st.galpage = gp2
      } else if (isHero) {
        const h2 = { ...(st.hero ?? {}) }
        h2.canvas = { ...(h2.canvas ?? {}), [device]: nb }
        st.hero = h2
      } else if (isExplore) {
        const x2 = { ...(st.explore ?? {}) }
        x2.canvas = { ...(x2.canvas ?? {}), [device]: nb }
        st.explore = x2
      } else if (isFeat) {
        const f2 = { ...(st.portfolio ?? {}) }
        f2.canvas = { ...(f2.canvas ?? {}), [device]: nb }
        st.portfolio = f2
      } else if (isGal) {
        const g2 = { ...(st.galindex ?? {}) }
        g2.canvas = { ...(g2.canvas ?? {}), [device]: nb }
        st.galindex = g2
      } else if (isAbout) {
        const a2 = { ...(st.about ?? {}) }
        a2.canvas = { ...(a2.canvas ?? {}), [device]: nb }
        st.about = a2
      } else {
        st.customs = ((st.customs ?? []) as any[]).map((c) => (c.id === boardId ? { ...c, canvas: { ...(c.canvas ?? {}), [device]: nb } } : c))
      }
    })
    const patch = (id: string, pt: Partial<CItem>) => setBoard({ ...b, items: b.items.map((i) => (i.id === id ? { ...i, ...pt } : i)) })
    const pick = (id: string | null) => {
      setCvSel(id)
      setCvBoard(id ? boardId : null)
      cvBridge.board = id ? boardId : null
      ;(document.getElementById('site-frame') as HTMLIFrameElement | null)?.contentWindow?.postMessage({ type: 'camrhia-canvas-pick', id, boardId }, '*')
    }
    const add = (type: 'photo' | 'card' | 'heading' | 'button' | 'gallery' | 'menu' | 'logo' | 'title' | 'subtitle' | 'door') => {
      if (isGalPage && !hasBoard(canvasData, device)) { flash('Drag any photo in the preview first, then add things.'); return }
      const it = newItem(type, device, Math.max(0, ...b.items.map((i) => i.z)) + 1)
      if (type === 'gallery') it.galleryId = galIds.find((id) => !b.items.some((i) => i.galleryId === id)) ?? galIds[0]
      setBoard({ ...b, items: [...b.items, it] })
      pick(it.id)
    }
    const names: Record<string, string> = { photo: 'Photo', card: 'Text card', heading: 'Heading', button: 'Button', gallery: 'Gallery tile', menu: 'Menu', logo: 'Logo', title: 'Title', subtitle: 'Subtitle', door: 'Explore link' }
    async function up(id: string, file: File) {
      const sb = supabase
      if (!sb) return
      const { data: sess } = await sb.auth.getSession()
      const uid = sess.session?.user.id
      if (!uid) return
      try {
        const v = await makeVersions(file)
        const path = `${uid}/canvas_${Date.now()}.jpg`
        const r2 = await sb.storage.from('portfolio').upload(path, v.web.blob, { contentType: 'image/jpeg', upsert: true })
        if (r2.error) throw r2.error
        patch(id, { src: path })
      } catch (e) {
        flash((e as { message?: string })?.message ?? 'Upload failed.')
      }
    }
    if (part === 'tiles') {
      const tiles = b.items.filter((i) => i.type === 'gallery')
      return (
        <div className="space-y-3">
          {tiles.length === 0 && <p className="text-sm text-ink-soft">No gallery tiles yet. Add one in the Layout step above.</p>}
          {tiles.map((tl, n) => (
            <div key={tl.id} className="space-y-3 rounded-xl border border-line bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-ink">Tile {n + 1}</p>
                <button type="button" className="text-xs text-ink-soft hover:text-red-700" onClick={() => setBoard({ ...b, items: b.items.filter((x) => x.id !== tl.id) })}>Remove ×</button>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink">Gallery</label>
                <Select value={tl.galleryId ?? ''} onChange={(e) => patch(tl.id, { galleryId: e.target.value })} className={inputCls}>
                  {cvGalleries.map((g) => <option key={g.id} value={g.id}>{g.title || 'Untitled'}</option>)}
                </Select>
              </div>
              <Row label="Title">
                <Seg value={tl.titleMode ?? 'overlay'} options={[{ v: 'overlay', label: 'On photo' }, { v: 'below', label: 'Below' }, { v: 'none', label: 'Hidden' }]} onChange={(v) => patch(tl.id, { titleMode: v as 'overlay' | 'below' | 'none' })} />
              </Row>
              <div>
                <p className="mb-1 text-xs text-ink-soft">Title size</p>
                <Slider min={0.8} max={5} step={0.1} value={tl.fs ?? 1.8} onChange={(v) => patch(tl.id, { fs: v })} />
              </div>
              <div>
                <p className="mb-1 text-xs text-ink-soft">Rounded corners</p>
                <Slider min={0} max={20} step={1} value={tl.radius ?? 0} onChange={(v) => patch(tl.id, { radius: v })} />
              </div>
            </div>
          ))}
        </div>
      )
    }
    return (
      <div className="space-y-4 border-t border-line pt-4">
        <p className="text-sm text-ink">Freestyle <span className="text-xs text-ink-soft">· arranging the {device} layout</span></p>
        <p className="text-xs text-ink-soft">Drag a block in the preview to move it. Drag the gold square on its corner to resize. Tap the × next to a block's name below, or press Delete, to remove it. Use the Phone / Desktop switch above the preview to arrange each size.</p>
        <div>
          <p className="mb-2 text-xs font-medium text-ink">Add to your layout</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {((isGalPage ? ['title', 'subtitle', 'button', 'photo', 'heading', 'card'] : isHero ? ['title', 'subtitle', 'menu', 'logo', 'button', 'photo', 'heading', 'card'] : isExplore ? ['door', 'heading', 'card', 'button', 'photo'] : isGal ? ['gallery', 'heading', 'card', 'button', 'photo'] : ['photo', 'card', 'heading', 'button']) as ('photo' | 'card' | 'heading' | 'button' | 'gallery' | 'menu' | 'logo' | 'title' | 'subtitle')[]).map((tp) => (
              <button key={tp} type="button" onClick={() => add(tp)} className="group flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-line bg-white px-2 py-3 text-xs text-ink-soft transition hover:border-twilight hover:bg-twilight/5 hover:text-twilight">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d={CV_ICONS[tp]} /></svg>
                {names[tp]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-ink">Your blocks</p>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {b.items.map((i, n) => {
              const on = cvBoard === boardId && cvSel === i.id
              const hint = (i.title || i.text || '').toString().slice(0, 24)
              return (
                <button key={i.id} type="button" onClick={() => pick(i.id)} className={'flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition ' + (on ? 'border-ink bg-ink text-white' : 'border-line bg-card text-ink hover:border-ink')}>
                  <span className={'flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-medium ' + (on ? 'bg-white/20' : 'bg-tint')}>{n + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm leading-tight">{names[i.type]}</span>
                    {hint && <span className={'block truncate text-xs ' + (on ? 'text-white/70' : 'text-ink-soft')}>{hint}</span>}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
        <div>
          {isGalPage && !hasBoard(canvasData, device) && <p className="mb-2 text-xs text-ink-soft">Drag any photo in the preview to start arranging. Your layout is created automatically.</p>}
        <p className="mb-1 text-xs text-ink-soft">Section height · {Math.round(b.h)}%</p>
          <Slider min={30} max={260} step={2} value={b.h} onChange={(v) => setBoard({ ...b, h: v })} />
        </div>
        {sel && (
          <div className="space-y-3 rounded-xl border border-line bg-white p-4">
            <p className="text-sm font-medium text-ink">{names[sel.type]}</p>
            {sel.type === 'door' && (
              <div>
                <label className="mb-1 block text-xs font-medium text-ink">Link to</label>
                <Select value={sel.door ?? 'about'} onChange={(e) => patch(sel.id, { door: e.target.value })} className={inputCls}>
                  <option value="galleries">Galleries</option>
                  <option value="about">About</option>
                  <option value="book">Book</option>
                </Select>
              </div>
            )}
            {sel.type === 'photo' && (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <label className={btnGhost + ' cursor-pointer'}>
                    {sel.src && sel.src !== 'about' ? 'Replace photo' : 'Upload photo'}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) up(sel.id, f); e.target.value = '' }} />
                  </label>
                  <button type="button" className={btnGhost} onClick={() => patch(sel.id, { src: 'about' })}>Use my About photo</button>
                </div>
                <div>
                  <p className="mb-1 text-xs text-ink-soft">Rounded corners</p>
                  <Slider min={0} max={30} step={1} value={sel.radius ?? 0} onChange={(v) => patch(sel.id, { radius: v })} />
                </div>
              </>
            )}
            {sel.type === 'gallery' && !isGal && (
              <>
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink">Gallery</label>
                  <Select value={sel.galleryId ?? ''} onChange={(e) => patch(sel.id, { galleryId: e.target.value })} className={inputCls}>
                    {cvGalleries.map((g) => <option key={g.id} value={g.id}>{g.title || 'Untitled'}</option>)}
                  </Select>
                </div>
                <Row label="Title">
                  <Seg value={sel.titleMode ?? 'overlay'} options={[{ v: 'overlay', label: 'On photo' }, { v: 'below', label: 'Below' }, { v: 'none', label: 'Hidden' }]} onChange={(v) => patch(sel.id, { titleMode: v as 'overlay' | 'below' | 'none' })} />
                </Row>
                <div>
                  <p className="mb-1 text-xs text-ink-soft">Title size</p>
                  <Slider min={0.8} max={5} step={0.1} value={sel.fs ?? 1.8} onChange={(v) => patch(sel.id, { fs: v })} />
                </div>
                <div>
                  <p className="mb-1 text-xs text-ink-soft">Rounded corners</p>
                  <Slider min={0} max={20} step={1} value={sel.radius ?? 0} onChange={(v) => patch(sel.id, { radius: v })} />
                </div>
              </>
            )}
            {sel.type === 'card' && (
              <>
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink">Heading</label>
                  <input value={sel.title ?? ''} onChange={(e) => patch(sel.id, { title: e.target.value })} placeholder={isAbout ? 'Uses your About heading' : 'Card heading'} className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink">Text</label>
                  <textarea rows={4} value={sel.text ?? ''} onChange={(e) => patch(sel.id, { text: e.target.value })} placeholder={isAbout ? 'Leave empty to use your About text' : 'Write your words'} className={inputCls} />
                </div>
                <div>
                  <p className="mb-1 text-xs text-ink-soft">Text size</p>
                  <Slider min={0.8} max={6} step={0.05} value={sel.fs ?? 1.45} onChange={(v) => patch(sel.id, { fs: v })} />
                </div>
                <Row label="Card background"><Switch on={sel.bg !== false} onChange={(v) => patch(sel.id, { bg: v })} /></Row>
              </>
            )}
            {sel.type === 'heading' && (
              <>
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink">Words</label>
                  <textarea rows={2} value={sel.text ?? ''} onChange={(e) => patch(sel.id, { text: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <p className="mb-1 text-xs text-ink-soft">Size</p>
                  <Slider min={2} max={16} step={0.2} value={sel.fs ?? 4.6} onChange={(v) => patch(sel.id, { fs: v })} />
                </div>
              </>
            )}
            {sel.type === 'button' && (
              <div>
                <label className="mb-1 block text-xs font-medium text-ink">Button wording</label>
                <input value={sel.text ?? ''} onChange={(e) => patch(sel.id, { text: e.target.value })} placeholder="Uses your site button wording" className={inputCls} />
              </div>
            )}
            {(sel.type === 'title' || sel.type === 'subtitle' || sel.type === 'menu' || sel.type === 'logo') && (
              <>
                <p className="text-xs text-ink-soft">{sel.type === 'title' ? 'Shows your headline. Edit the words and size in this Hero section.' : sel.type === 'subtitle' ? 'Shows your location line. Edit the words in this Hero section.' : sel.type === 'menu' ? 'Shows your menu links. Words and size are in the Menu section.' : 'Shows your logo. Size is in the Logo section.'}</p>
                <Row label="Align">
                  <Seg value={sel.align ?? (sel.type === 'menu' ? 'right' : 'left')} options={[{ v: 'left', label: 'Left' }, { v: 'center', label: 'Center' }, { v: 'right', label: 'Right' }]} onChange={(v) => patch(sel.id, { align: v as 'left' | 'center' | 'right' })} />
                </Row>
                {sel.type !== 'logo' && <Row label="White text"><Switch on={!!sel.light} onChange={(v) => patch(sel.id, { light: v })} /></Row>}
              </>
            )}
            {['title', 'subtitle', 'menu', 'heading', 'card'].includes(sel.type) && (
              <div className="space-y-3 border-t border-line pt-3">
                <p className="text-xs font-medium text-ink">Style</p>
                <ColorField label="Text color" value={sel.color ?? '#2B2B2B'} swatches={palette()} onChange={(h) => patch(sel.id, { color: h })} onReset={() => patch(sel.id, { color: undefined })} />
                <Row label="Font">
                  <Seg value={sel.font ?? 'auto'} options={[{ v: 'auto', label: 'Default' }, { v: 'head', label: 'Heading' }, { v: 'body', label: 'Body' }]} onChange={(v) => patch(sel.id, { font: v === 'auto' ? undefined : (v as 'head' | 'body') })} />
                </Row>
              </div>
            )}
            {['title', 'subtitle', 'menu', 'logo', 'button'].includes(sel.type) && (
              <div className="space-y-3 border-t border-line pt-3">
                <p className="mb-1 text-xs text-ink-soft">Size</p>
                <Slider min={0.5} max={2.5} step={0.05} value={sel.fs ?? 1} onChange={(v) => patch(sel.id, { fs: v })} />
              </div>
            )}
            <div className="grid grid-cols-3 gap-2 border-t border-line pt-3">
          <button type="button" className="flex h-10 w-full items-center justify-center rounded-lg border border-line text-sm text-ink transition hover:border-ink" onClick={() => patch(sel.id, { z: sel.z + 1 })}>Bring forward</button>
          <button type="button" className="flex h-10 w-full items-center justify-center rounded-lg border border-line text-sm text-ink transition hover:border-ink" onClick={() => patch(sel.id, { z: Math.max(0, sel.z - 1) })}>Send back</button>
          <button type="button" className="flex h-10 w-full items-center justify-center rounded-lg border border-line text-sm text-ink transition hover:border-ink hover:!border-[#9c3b3b]" style={{ color: '#9c3b3b' }} onClick={() => { setBoard({ ...b, items: b.items.filter((i) => i.id !== sel.id) }); pick(null) }}>Remove item</button>
        </div>
          </div>
        )}
        <button type="button" className="text-xs text-ink-soft hover:text-ink" onClick={() => { isGalPage ? upd((st: any) => { const gpp = { ...(st.galpage ?? {}) }; const cvs = { ...(gpp.canvases ?? {}) }; delete cvs[gpid]; gpp.canvases = cvs; st.galpage = gpp }) : setBoard(isHero ? heroStarter(device, heroSel.slice(0, 3)) : isAbout ? starter(device, ph2) : isGal ? galleryStarter(device, isFeat ? featured.map((g) => g.id) : galIds) : blank(device)); pick(null) }}>
          Start over with the {isHero || isAbout ? 'starter' : isGal ? 'default' : 'blank'} layout
        </button>
      </div>
    )
  }

  function customBlock(pg: 'home' | 'about' | 'galleries') {
    const list = ((S.customs ?? []) as any[]).filter((c) => c.page === pg)
    return (
      <>
        {list.map((c, n) => (
          <Group key={c.id} open={cvNew === c.id} title={list.length > 1 ? `Freestyle section ${n + 1}` : 'Freestyle section'} hint="freestyle"
            onOpen={() => { if (pg === 'galleries') setPreviewPage('galleries'); scrollPreview(c.id) }}>
            {sectionHead(c.id, true, false)}
            {canvasPanel(c.id)}
            <button type="button" className="text-xs text-ink-soft hover:text-ink" onClick={() => removeCustom(c.id)}>Delete this section</button>
          </Group>
        ))}
        <button type="button" className="w-full rounded-lg border-2 border-dashed py-4 text-sm font-medium text-ink transition hover:bg-black/5" style={{ borderColor: '#B08D57' }} onClick={() => addCustom(pg)}>+ Add a freestyle section</button>
      </>
    )
  }

  async function addTm(fileOverride?: File | null) {
    const f = fileOverride ?? tFile
    const sb = supabase
    if (!sb || !tQuote.trim() || tBusy) return
    const { data: sess } = await sb.auth.getSession()
    const id = sess.session?.user.id
    if (!id) return
    setTBusy(true)
    try {
      let path: string | null = null
      if (f) {
        const v = await makeVersions(f)
        path = `${id}/testimonial_${Date.now()}.jpg`
        const up = await sb.storage.from('portfolio').upload(path, v.web.blob, { contentType: 'image/jpeg', upsert: true })
        if (up.error) throw up.error
      }
      const { error } = await sb.from('testimonials').insert({ owner_id: id, quote: tQuote.trim(), client_name: tName.trim() || null, storage_path: path, sort_order: tms.length })
      if (error) throw error
      setTName(''); setTQuote(''); setTFile(null); setTSlot(tms.length)
      await loadExtras()
      setPreviewKey((k) => k + 1)
      flash('Testimonial added')
    } catch (e) {
      flash((e as { message?: string })?.message ?? 'Could not add the testimonial.')
    } finally {
      setTBusy(false)
    }
  }
  async function saveTm(t: Tm, patch: { quote?: string; client_name?: string | null }) {
    const sb = supabase
    if (!sb) return
    if (patch.quote !== undefined && !patch.quote.trim()) return
    const { error } = await sb.from('testimonials').update(patch).eq('id', t.id)
    if (error) { flash(error.message); return }
    await loadExtras()
    setPreviewKey((k) => k + 1)
  }
  async function setTmPhoto(t: Tm, file: File) {
    const sb = supabase
    if (!sb || tBusy) return
    const { data: sess } = await sb.auth.getSession()
    const id = sess.session?.user.id
    if (!id) return
    setTBusy(true)
    try {
      const v = await makeVersions(file)
      const path = `${id}/testimonial_${Date.now()}.jpg`
      const up = await sb.storage.from('portfolio').upload(path, v.web.blob, { contentType: 'image/jpeg', upsert: true })
      if (up.error) throw up.error
      const { error } = await sb.from('testimonials').update({ storage_path: path }).eq('id', t.id)
      if (error) throw error
      if (t.storage_path) await sb.storage.from('portfolio').remove([t.storage_path])
      await loadExtras()
      setPreviewKey((k) => k + 1)
      flash('Photo saved')
    } catch (e) {
      flash((e as { message?: string })?.message ?? 'Could not save the photo.')
    } finally {
      setTBusy(false)
    }
  }
  async function removeTm(t: Tm) {
    const sb = supabase
    if (!sb || !window.confirm('Remove this testimonial?')) return
    const { error } = await sb.from('testimonials').delete().eq('id', t.id)
    if (error) { flash(error.message); return }
    if (t.storage_path) await sb.storage.from('portfolio').remove([t.storage_path])
    await loadExtras()
    setPreviewKey((k) => k + 1)
  }

  async function addPkg() {
    const sb = supabase
    if (!sb) return
    const { data: sess } = await sb.auth.getSession()
    const id = sess.session?.user.id
    if (!id) return
    const { error } = await sb.from('website_packages').insert({ photographer_id: id, title: 'New package', price: null, description: null, sort_order: pkgs.length })
    if (error) { flash(error.message); return }
    await loadExtras()
    setPSlot(pkgs.length)
    setPreviewKey((k) => k + 1)
  }
  async function linkPkg(p: WPkg, srcId: string) {
    if (!srcId) { await updatePkg(p, { source_package_id: null }); return }
    const src = ownPkgs.find((x) => x.id === srcId)
    if (!src) return
    const desc = [src.covers, src.detail].map((x) => (x ?? '').trim()).filter(Boolean).join('\n')
    await updatePkg(p, { source_package_id: src.id, title: src.name, price: src.price, description: desc || null })
  }
  async function updatePkg(p: WPkg, patch: Partial<WPkg>) {
    const sb = supabase
    if (!sb) return
    const { error } = await sb.from('website_packages').update(patch).eq('id', p.id)
    if (error) { flash(error.message); return }
    setPkgs((list) => list.map((x) => (x.id === p.id ? { ...x, ...patch } : x)))
    setPreviewKey((k) => k + 1)
  }
  async function removePkg(p: WPkg) {
    const sb = supabase
    if (!sb || !window.confirm(`Remove "${p.title}"?`)) return
    const { error } = await sb.from('website_packages').delete().eq('id', p.id)
    if (error) { flash(error.message); return }
    await loadExtras()
    setPreviewKey((k) => k + 1)
  }
  async function movePkg(p: WPkg, dir: -1 | 1) {
    const sb = supabase
    if (!sb) return
    const arr = [...pkgs].sort((a, b) => a.sort_order - b.sort_order)
    const i = arr.findIndex((x) => x.id === p.id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= arr.length) return
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp
    await Promise.all(arr.map((x, idx) => sb.from('website_packages').update({ sort_order: idx }).eq('id', x.id)))
    await loadExtras()
    setPreviewKey((k) => k + 1)
  }
  const T = form ? resolveTheme(form as unknown as Record<string, any>) : null
  const S = (form?.site_settings ?? {}) as Record<string, any>
  const heroSel: string[] = Array.isArray(S.hero?.photos) ? (S.hero.photos as string[]) : []
  const cands = form
    ? Array.from(new Set([...heroSel, ...extraHero, ...(form.cover_paths ?? []), ...(form.cover_path ? [form.cover_path] : []), ...candsDb]))
    : []

  const ABOUT_KEYS = ['about', 'investment', 'faq', 'aboutcta']
  function pageOfKey(k: string): 'home' | 'about' | 'galleries' {
    const c = ((S.customs ?? []) as any[]).find((x) => x.id === k)
    if (c) return c.page
    return ABOUT_KEYS.includes(k) ? 'about' : 'home'
  }
  function orderField(pg: string) {
    return pg === 'about' ? 'order_about' : pg === 'galleries' ? 'order_galleries' : 'order_home'
  }
  function listFor(k: string): string[] {
    if (!T) return []
    if (k === 'explore') return T.orderHome
    const pg = pageOfKey(k)
    return pg === 'about' ? T.orderAbout : pg === 'galleries' ? T.orderGalleries : T.orderHome
  }
  function moveSection(k: string, dir: -1 | 1) {
    if (!T) return
    const order = [...listFor(k)]
    const i = order.indexOf(k)
    const j = i + dir
    if (i < 0 || j < 0 || j >= order.length) return
    const tmp = order[i]; order[i] = order[j]; order[j] = tmp
    const field = orderField(k === 'explore' ? 'home' : pageOfKey(k))
    upd((st) => { st[field] = order })
  }
  function addCustom(pg: 'home' | 'about' | 'galleries') {
    if (!T) return
    const id = 'cs_' + Date.now().toString(36)
    const base = pg === 'home' ? T.orderHome : pg === 'about' ? T.orderAbout : T.orderGalleries
    const order = [...base]
    const at = pg === 'home' && order.includes('contact') ? order.indexOf('contact') : order.length
    order.splice(at, 0, id)
    const field = orderField(pg)
    upd((st) => { st.customs = [...(st.customs ?? []), { id, page: pg, canvas: { desktop: blank('desktop'), phone: blank('phone') } }]; st[field] = order })
    setCvNew(id)
    setTimeout(() => scrollPreview(id), 600)
  }
  function removeCustom(id: string) {
    if (!window.confirm('Delete this custom section?')) return
    const field = orderField(pageOfKey(id))
    const order = listFor(id).filter((x) => x !== id)
    upd((st) => { st.customs = ((st.customs ?? []) as any[]).filter((c) => c.id !== id); st[field] = order })
    setCvSel(null)
    setCvBoard(null)
  }
  function setHero(patch: Record<string, any>) { upd((s) => { s.hero = { ...(s.hero ?? {}), ...patch } }) }
  function setIn(group: string, patch: Record<string, any>) { upd((s) => { s[group] = { ...(s[group] ?? {}), ...patch } }) }
  function setSize(key: string, d: Dev, v: number) {
    upd((s) => { s.sizes = { ...(s.sizes ?? {}), [key]: { ...(s.sizes?.[key] ?? {}), [d]: v } } })
    setDevice(d)
  }
  function brandHex() {
    const b = form?.accent_color ?? ''
    return /^#[0-9a-fA-F]{6}$/.test(b) ? b : '#A9545F'
  }
  function palette() {
    const out: { name: string; hex: string }[] = []
    for (const [k, v] of Object.entries(form?.brand_colors_named ?? {})) {
      if (v && /^#[0-9a-fA-F]{6}$/.test(v)) out.push({ name: k.replace(/_/g, ' '), hex: v })
    }
    if (out.length === 0) out.push({ name: 'My brand color', hex: brandHex() })
    return out.slice(0, 5)
  }
  function nudgeCtl(label: string, key: string, lim: number) {
    if (!T) return null
    const nv = ((T.sizes as any)[key]?.[device] ?? 0) as number
    return (
      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-sm text-ink">{label}</span>
          <span className="font-mono text-xs text-ink-soft">{nv > 0 ? '+' : ''}{nv}px</span>
        </div>
        <div className="relative">
          <Slider min={-lim} max={lim} step={1} value={nv} onChange={(x) => setSize(key as any, device, Math.abs(x) <= 3 ? 0 : x)} />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded bg-brass" style={{ opacity: nv === 0 ? 1 : 0.55 }} />
        </div>
        <p className="mt-1 text-center text-[11px] text-ink-soft">{nv === 0 ? 'Centered on its spot' : 'Slide to the line to snap back'}</p>
      </div>
    )
  }

  function secStyleBlock(id: string, opts?: { title?: boolean; extra?: React.ReactNode }) {
    if (!T) return null
    const sv = ((S as any).secStyle?.[id] ?? {}) as { bg?: string; text?: string; head?: string; body?: string; title?: string }
    const put = (patch: Record<string, string | undefined>) => setIn('secStyle', { [id]: { ...sv, ...patch } })
    const lab = 'text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft'
    const tk = id === 'words' ? 'testimonials' : id
    const touched = sv.bg || sv.text || sv.head || sv.body || sv.title || (S as any).sizes?.['sec_' + id]
    return (
      <div className="space-y-4">
        {opts?.title && titleBlock(id)}
        {opts?.extra && (
          <>
            <p className={lab}>Items in this section</p>
            {opts.extra}
          </>
        )}
        <p className={lab}>Text and fonts</p>
        <ColorField label="Body text color" value={sv.text ?? T.ink} swatches={palette()} onChange={(h) => put({ text: h })} onReset={() => put({ text: undefined })} />
        <FontPicker label="Title font (section title and item titles)" value={sv.head ?? T.headKey} cats={['serif', 'sans', 'script', 'display']} onChange={(k) => put({ head: k })} />
        <FontPicker label="Body font" value={sv.body ?? T.bodyKey} cats={['serif', 'sans']} onChange={(k) => put({ body: k })} />
        {touched && (
          <button type="button" className="text-xs text-ink-soft hover:text-ink" onClick={() => upd((st) => {
            const ss = { ...(st.secStyle ?? {}) }; delete ss[id]; st.secStyle = ss
            if (st.sizes) { const z = { ...st.sizes }; delete z['sec_' + id]; st.sizes = z }
          })}>Reset this section</button>
        )}
      </div>
    )
  }

  function elBlock(heading: string, k: string, o?: { texts?: { label?: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }[]; min?: number; max?: number; fontCats?: string[] }) {
    if (!T) return null
    const e = ((S as any).el?.[k] ?? {}) as { color?: string; font?: string }
    const put = (patch: Record<string, string | undefined>) => setIn('el', { [k]: { ...e, ...patch } })
    return (
      <>
        <p className="border-t border-line pt-4 text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">{heading}</p>
        {o?.texts?.map((x, i) => (
          <div key={i}>
            {x.label && <label className="mb-1 block text-xs font-medium text-ink">{x.label}</label>}
            {x.rows
              ? <textarea rows={x.rows} value={x.value} onChange={(ev) => x.onChange(ev.target.value)} placeholder={x.placeholder} className={inputCls} />
              : <input value={x.value} onChange={(ev) => x.onChange(ev.target.value)} placeholder={x.placeholder} className={inputCls} />}
          </div>
        ))}
        <ColorField label={`${heading} color`} value={e.color ?? T.ink} swatches={palette()} onChange={(h) => put({ color: h })} onReset={() => put({ color: undefined })} />
        <FontPicker label={`${heading} font`} value={e.font ?? T.bodyKey} cats={o?.fontCats ?? ['serif', 'sans', 'script', 'display']} onChange={(f) => put({ font: f })} />
        <SizeControl device={device} label={`${heading} size`} unit="px" min={o?.min ?? 9} max={o?.max ?? 40} step={1} value={T.sizes.el[k]} onChange={(d, val) => setSize(('el_' + k) as any, d, val)} />
      </>
    )
  }
  function titleBlock(id: string) {
    if (!T) return null
    const tk = id === 'words' ? 'testimonials' : id
    const sv = ((S as any).secStyle?.[id] ?? {}) as { title?: string; titleFont?: string; head?: string }
    const put = (patch: Record<string, string | undefined>) => setIn('secStyle', { [id]: { ...sv, ...patch } })
    return (
      <>
        <p className="border-t border-line pt-4 text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">Section title</p>
        <input value={S.titles?.[tk] ?? ''} onChange={(ev) => setIn('titles', { [tk]: ev.target.value })} placeholder={DEFAULT_TITLES[tk]} className={inputCls} />
        <ColorField label="Section title color" value={sv.title ?? T.ink} swatches={palette()} onChange={(h) => put({ title: h })} onReset={() => put({ title: undefined })} />
        <FontPicker label="Section title font" value={sv.titleFont ?? sv.head ?? T.headKey} cats={['serif', 'sans', 'script', 'display']} onChange={(f) => put({ titleFont: f })} />
        <SizeControl device={device} label="Section title size" unit="px" min={20} max={100} step={2} value={T.sizes.secTitles[id]} onChange={(d, val) => setSize(('sec_' + id) as any, d, val)} />
      </>
    )
  }

  function secBg(title: string, id: string, scrollKey: string, extra?: React.ReactNode) {
    if (!T) return null
    const sv = ((S as any).secStyle?.[id] ?? {}) as { bg?: string }
    const put = (bg?: string) => setIn('secStyle', { [id]: { ...sv, bg } })
    return (
      <Group title={title} hint="color behind this section" onOpen={() => scrollPreview(scrollKey)}>
        <ColorField label="Background color" value={sv.bg ?? T.bg} swatches={palette()} onChange={(h) => put(h)} onReset={() => put(undefined)} />
        {extra}
      </Group>
    )
  }

  function backCard(pg: 'galleries' | 'about' | 'book') {
    if (!T) return null
    const cb = (((S as any).backBtn ?? {})[pg] ?? {}) as { text?: string; color?: string }
    const put = (patch: Record<string, string | undefined>) => setIn('backBtn', { [pg]: { ...cb, ...patch } })
    return (
      <Group title="Back button" hint="the link back to your site" onOpen={() => scrollPreview('nav')}>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink">Button wording</label>
          <input value={cb.text ?? ''} onChange={(e) => put({ text: e.target.value })} placeholder={pg === 'book' ? '← Back' : pg === 'galleries' ? '← Home' : '← Home'} className={inputCls} />
        </div>
        <ColorField label="Button color" value={cb.color ?? T.ink} swatches={palette()} onChange={(h) => put({ color: h })} onReset={() => put({ color: undefined })} />
        <SizeControl device={device} label="Button size" unit="px" min={8} max={24} step={1} value={T.sizes.back[pg]} onChange={(d, v) => setSize(('bk_' + pg) as any, d, v)} />
      </Group>
    )
  }

  function pickTab(t: 'style' | 'home' | 'galleries' | 'about' | 'book' | 'blog') {
    setTab(t)
    setPreviewPage(t === 'book' ? 'availability' : t === 'style' ? 'home' : t)
  }
  function previewSrc(k: string) {
    const [pg, sent] = k.split('|')
    const b = `/site/${token}`
    if (pg === 'availability') return `${b}/availability?preview=1${sent === '1' ? '&sent=1' : ''}`
    if (pg === 'blog') return `${b}/blog?preview=1`
    if (pg === 'about') return `${b}/about?preview=1`
    if (pg === 'galleries') return `${b}/galleries?preview=1`
    if (pg === 'gallery') { const gid = previewGid ?? firstGid; return gid ? `${b}/g/${gid}?preview=1` : `${b}/galleries?preview=1` }
    return `${b}?preview=1`
  }
  previewSrcRef.current = previewSrc
  function scrollPreview(id: string) {
    const win = () => (document.getElementById('site-frame') as HTMLIFrameElement | null)?.contentWindow
    win()?.postMessage({ type: 'camrhia-outline', id }, '*')
    if (id) win()?.postMessage({ type: 'camrhia-scroll', id }, '*')
  }
  function sectionHead(k: string, _toggle = true, heading = true) {
    return (
      <div>
        {heading && <label className="mb-1 block text-xs font-medium text-ink">Section heading</label>}
        {heading && <input value={S.titles?.[k] ?? ''} onChange={(e) => setIn('titles', { [k]: e.target.value })} placeholder={DEFAULT_TITLES[k]} className={inputCls} />}
      </div>
    )
  }
  function styleHead(name: string, hint: string, k?: string, o?: { toggle?: boolean; explore?: boolean }) {
    const list = k ? listFor(k) : []
    const idx = k ? list.indexOf(k) : -1
    const total = list.length
    const showToggle = o?.explore || (k && o?.toggle !== false)
    const on = o?.explore ? S.explore?.show !== false : k ? form?.site_sections?.[k] !== false : true
    const arrow = 'flex h-7 w-7 items-center justify-center rounded-full border border-line bg-card text-[11px] text-ink transition hover:bg-paper disabled:opacity-30'
    return (
      <div data-sh="1" className="scroll-mt-2 flex items-center justify-between gap-3 border-b border-line px-1 pb-2 pt-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">
          {name}
        </p>
        {(showToggle || (k && total > 0)) && (
          <div className="flex items-center gap-3">
            {showToggle && (
              <span className="flex items-center gap-2 text-xs text-ink-soft">
                
                <Switch on={on} onChange={(v) => (o?.explore ? setIn('explore', { show: v }) : set('site_sections', { ...(form?.site_sections ?? {}), [k as string]: v }))} />
              </span>
            )}
            {k && total > 0 && (
              <span className="flex items-center gap-1.5">
                <button type="button" aria-label="Move section up" disabled={idx <= 0} onClick={() => moveSection(k, -1)} className={arrow}>▲</button>
                
                <button type="button" aria-label="Move section down" disabled={idx < 0 || idx >= total - 1} onClick={() => moveSection(k, 1)} className={arrow}>▼</button>
              </span>
            )}
          </div>
        )}
      </div>
    )
  }
  function calRow(label: string, key: string, current: string) {
    return (
      <ColorField label={label} value={/^#[0-9a-fA-F]{6}$/.test(current) ? current : '#FFFFFF'} swatches={palette()}
        onChange={(h) => setIn('calendar', { [key]: h })}
        onReset={() => upd((st) => { const c = { ...(st.calendar ?? {}) }; delete c[key]; st.calendar = c })} />
    )
  }
  function colorRow(label: string, key: string, current: string) {
    return (
      <ColorField label={label} value={/^#[0-9a-fA-F]{6}$/.test(current) ? current : '#FFFFFF'} swatches={palette()}
        onChange={(h) => setIn('colors', { [key]: h })}
        onReset={() => upd((s) => { const c = { ...(s.colors ?? {}) }; delete c[key]; s.colors = c })} />
    )
  }

  const token = form?.public_token ?? null
  cvBridge.upd = upd
  const curSlug = slugOverride ?? form?.slug ?? null
  const path = curSlug ? `/${curSlug}` : token ? `/site/${token}` : null
  async function saveSlug() {
    if (!supabase) return
    setSlugSaving(true)
    const { data, error } = await supabase.rpc('claim_profile_slug', { p_slug: slugDraft.trim().toLowerCase() })
    setSlugSaving(false)
    if (error) { setSlugMsg(error.message); return }
    setSlugOverride(String(data))
    setSlugEdit(false)
    flash('Link updated')
  }
  const fullUrl = path ? `https://camrhia.com${path}` : null
  const tpl = form?.site_template ?? 'editorial'
  const accent = form?.site_accent ?? null
  const brand = form?.accent_color ?? '#A9545F'
  const menuHidden: string[] = Array.isArray(S.menu?.hidden) ? S.menu.hidden : []

  return (
    <div className="min-h-screen bg-paper xl:pl-60">
      <style>{SLIDER_CSS}</style>
      <link rel="stylesheet" href={ALL_FONTS_HREF} />
      <DashboardHeader active="website" hideNav />
      <main className="px-6 py-8">
        {!form || !T ? (
          <p className="text-sm text-ink-soft">{message ?? 'Loading…'}</p>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="mb-2 font-mono text-xs uppercase tracking-widest text-brass">Your website</p>
                <h1 className="font-fraunces text-3xl font-semibold text-ink">Design your website</h1>
                <p className="mt-1 text-sm text-ink-soft">Answer a few questions and Camri builds your site. Every change saves as you go.</p>
              </div>
              <div className="flex items-center gap-3">
                {message && <span className="text-sm text-twilight">{message}</span>}
                <button style={{ display: 'none' }} className={btn} disabled={!dirty || saving} onClick={save}>
                  {saving ? 'Saving…' : saveErr ? 'Retry save' : dirty ? 'Save now' : 'All changes saved'}
                </button>
              </div>
            </div>

            <div className="hidden mb-6 rounded-2xl border border-line bg-card p-5">
              <p className="font-fraunces text-lg font-semibold text-ink">Generate for me</p>
              <p className="mt-1 text-sm text-ink-soft">Pick a style. I choose the layout, fonts, colors and button shape, and write a headline if you do not have one. Then change anything you like.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[['airy', 'Light and airy'], ['moody', 'Dark and moody'], ['classic', 'Classic'], ['bold', 'Bold']].map(([k, l]) => (
                  <button key={k} type="button" disabled={genBusy} onClick={() => generateSite(k)} className="rounded-full border border-line bg-paper px-4 py-2 text-sm text-ink transition hover:border-twilight disabled:opacity-50">{genBusy ? 'Working…' : l}</button>
                ))}
              </div>
            </div>

            {fullUrl && (
              <div className="mb-6">
                <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-2xl border border-line bg-card px-5 py-4">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wider text-ink-soft">Your link</p>
                    <p className="truncate font-fraunces text-lg font-semibold text-ink">{fullUrl.replace('https://', '')}</p>
                    <Link href="/website/domain" className="text-xs text-twilight hover:underline">Use your professional domain →</Link>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => { navigator.clipboard?.writeText(fullUrl); flash('Link copied') }} className="rounded-full border border-line px-4 py-2 text-sm text-ink hover:bg-paper-deep">Copy link</button>
                    <button type="button" onClick={() => { setSlugDraft(curSlug ?? ''); setSlugMsg(''); setSlugEdit(true) }} className="rounded-full border border-line px-4 py-2 text-sm text-ink hover:bg-paper-deep">Change name</button>
                    <a href={path ?? '#'} target="_blank" rel="noreferrer" className="rounded-full bg-twilight px-4 py-2 text-sm font-medium text-white transition hover:opacity-90">View live site</a>
                  </div>
                </div>
                {slugEdit && (
                  <div className="mt-3 max-w-md space-y-2 rounded-2xl border border-line bg-card p-4">
                    <div className="flex items-center gap-1 text-sm text-ink-soft">
                      <span>camrhia.com/</span>
                      <input value={slugDraft} onChange={(e) => setSlugDraft(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="yourname" className={inputCls} />
                      
                    </div>
                    <p className={`text-xs ${slugMsg === 'ok' ? 'text-sage' : 'text-ink-soft'}`}>
                      {slugMsg === 'ok' ? (slugDraft.trim().toLowerCase() === (curSlug ?? '') ? 'This is your current name' : '✓ That name is free') : slugMsg}
                    </p>
                    <div className="flex gap-2">
                      <button className={btn} disabled={slugSaving || slugMsg !== 'ok' || slugDraft.trim().toLowerCase() === (curSlug ?? '')} onClick={saveSlug}>
                        {slugSaving ? 'Saving…' : 'Save name'}
                      </button>
                      <button className={btnGhost} onClick={() => setSlugEdit(false)}>Cancel</button>
                    </div>
                    <p className="text-xs text-ink-soft">Changing your name changes your link, so the old one stops working. Update it anywhere you have shared it.</p>
                  </div>
                )}
              </div>
            )}

            <CamiDesigner />
          </>
        )}
      </main>
    </div>
  )
}
