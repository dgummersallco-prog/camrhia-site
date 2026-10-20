'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { makeVersions } from '@/lib/galleryImages'
import { getBoard, starter, blank, newItem, hasBoard, galleryStarter } from '@/lib/aboutCanvas'
import type { CItem } from '@/lib/aboutCanvas'
import { DashboardHeader } from '@/app/components/DashboardHeader'
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
type WPkg = { id: string; title: string; price: string | null; description: string | null; sort_order: number }
type Dev = 'phone' | 'desktop'

const COLUMNS = 'id, public_token, slug, accent_color, cover_path, cover_paths, logo_path, brand_colors_named, site_template, site_accent, site_font_pair, site_headline, site_subhead, site_sections, site_settings'
const BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}/storage/v1/object/public/portfolio/`

const TEMPLATES = [
  { key: 'editorial', name: 'Editorial', blurb: 'Full-screen photo with your headline over it.' },
  { key: 'split', name: 'Split', blurb: 'Words on one side, a big photo on the other.' },
  { key: 'minimal', name: 'Minimal', blurb: 'Clean white, photo first, lots of air.' },
  { key: 'framed', name: 'Framed', blurb: 'Photo with your words in a centered card.' },
  { key: 'magazine', name: 'Magazine', blurb: 'Huge headline over a wide photo.' },
  { key: 'mosaic', name: 'Mosaic', blurb: 'A collage of your best shots.' },
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
        el.parentElement?.querySelectorAll(':scope > details').forEach((d) => { if (d !== el) (d as HTMLDetailsElement).open = false })
        onOpen?.()
      }
    }} className="rounded-2xl border border-line bg-card p-5">
      <summary className="cursor-pointer font-fraunces text-lg font-semibold text-ink">
        {title}
        {hint && <span className="ml-2 text-sm font-normal text-ink-soft">{hint}</span>}
      </summary>
      <div className="mt-4 space-y-4">{children}</div>
    </details>
  )
}
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span data-rowlabel className="text-sm text-ink">{label}</span>
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
        <p className="text-sm text-ink">{label}</p>
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
          
          <div className="absolute right-0 z-40 mt-2 w-72 rounded-2xl border border-line bg-card p-4 shadow-lg">
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
          
          <div className="absolute right-0 z-40 mt-2 w-80 rounded-2xl border border-line bg-card p-3 shadow-lg">
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

const TB = '#B9AEA5'
const TL = '#D8CFC4'
const bx = (cls = '') => <div className={cls} style={{ background: TB }} />
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
const ln = (w = 'w-full') => <div className={`h-1 ${w}`} style={{ background: TL }} />
const THUMBS = {
  galGrid: <div className="grid h-full grid-cols-3 gap-1">{bx()}{bx()}{bx()}</div>,
  galBanners: <div className="flex h-full flex-col gap-1">{bx('flex-1')}{bx('flex-1')}{bx('flex-1')}</div>,
  galFeature: <div className="grid h-full grid-cols-3 grid-rows-2 gap-1">{bx('col-span-2 row-span-2')}{bx()}{bx()}</div>,
  phMasonry: (
    <div className="flex h-full gap-1">
      <div className="flex flex-1 flex-col gap-1">{bx('flex-[3]')}{bx('flex-[2]')}</div>
      <div className="flex flex-1 flex-col gap-1">{bx('flex-[2]')}{bx('flex-[3]')}</div>
      <div className="flex flex-1 flex-col gap-1">{bx('flex-1')}{bx('flex-1')}{bx('flex-1')}</div>
    </div>
  ),
  phGrid: <div className="grid h-full grid-cols-3 grid-rows-2 gap-1">{bx()}{bx()}{bx()}{bx()}{bx()}{bx()}</div>,
  phSingle: <div className="mx-auto flex h-full w-3/5 flex-col gap-1">{bx('flex-1')}{bx('flex-1')}</div>,
  prCards: <div className="grid h-full grid-cols-3 gap-1">{pcard()}{pcard()}{pcard()}</div>,
  prMenu: <div className="flex h-full flex-col justify-center gap-2">{pmenu()}{pmenu()}{pmenu()}</div>,
  prCols: <div className="grid h-full grid-cols-3 border" style={{ borderColor: TB }}>{pcol(false)}{pcol(true)}{pcol(true)}</div>,
  teGrid: <div className="grid h-full grid-cols-3 gap-1">{tcol()}{tcol()}{tcol()}</div>,
  teStacked: (
    <div className="flex h-full flex-col items-center justify-center gap-1">
      <div className="h-4 w-4 rounded-full" style={{ background: TB }} />
      <div className="h-1 w-4/5" style={{ background: TL }} />
      <div className="h-1 w-3/5" style={{ background: TL }} />
      <div className="mt-1 h-px w-full" style={{ background: TB }} />
      <div className="h-1 w-3/5" style={{ background: TL }} />
    </div>
  ),
  abLeft: <div className="flex h-full gap-1">{bx('w-2/5')}<div className="flex flex-1 flex-col justify-center gap-1 px-1">{ln()}{ln()}{ln('w-3/5')}</div></div>,
  abRight: <div className="flex h-full gap-1"><div className="flex flex-1 flex-col justify-center gap-1 px-1">{ln()}{ln()}{ln('w-3/5')}</div>{bx('w-2/5')}</div>,
  abStack: <div className="flex h-full flex-col gap-1">{bx('h-1/2')}<div className="flex flex-1 flex-col items-center justify-center gap-1">{ln('w-4/5')}{ln('w-3/5')}</div></div>,
  bkCentered: <div className="flex h-full flex-col items-center justify-center gap-1">{ln('w-3/5')}{ln('w-4/5')}{bx('h-3 w-4/5')}{bx('h-3 w-4/5')}</div>,
  bkSide: <div className="flex h-full gap-1">{bx('w-2/5')}<div className="flex flex-1 flex-col justify-center gap-1">{ln()}{bx('h-3')}{bx('h-3')}</div></div>,
  bkBanner: <div className="flex h-full flex-col gap-1">{bx('h-1/3')}<div className="flex flex-1 flex-col items-center justify-center gap-1">{ln('w-3/5')}{bx('h-3 w-4/5')}</div></div>,
  teCards: <div className="grid h-full grid-cols-3 gap-1">{tcard()}{tcard()}{tcard()}</div>,
}

function LayoutPicker<V extends string>({ value, options, onChange }: { value: V; options: { v: V; name: string; thumb: React.ReactNode }[]; onChange: (v: V) => void }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {options.map((o) => (
        <button key={o.v} type="button" onClick={() => onChange(o.v)} className="text-left">
          <div className={`rounded-xl ${value === o.v ? 'ring-2 ring-ink ring-offset-2 ring-offset-card' : 'ring-1 ring-line hover:ring-ink-soft'}`}>
            <div className="h-20 overflow-hidden rounded-lg border border-line bg-white p-1.5">{o.thumb}</div>
          </div>
          <p className="mt-1.5 text-xs font-medium text-ink">{o.name}</p>
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

export default function WebsitePage() {
  const router = useRouter()
  const [form, setForm] = useState<Site | null>(null)
  const [saved, setSaved] = useState<Site | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [device, setDevice] = useState<Dev>('desktop')
  const [previewPage, setPreviewPage] = useState<'home' | 'galleries' | 'gallery' | 'about' | 'availability'>('home')
  const [tab, setTab] = useState<'style' | 'home' | 'galleries' | 'about' | 'book'>('home')
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
  const cvBridge = useState(() => ({ upd: null as any, board: null as string | null }))[0]

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      const d = e.data as { type?: string; dev?: string; board?: unknown; id?: string | null; boardId?: string; list?: unknown } | null
      if (!d) return
      if (d.type === 'camrhia-canvas' && d.dev && d.board && cvBridge.upd) {
        const bid = d.boardId ?? 'about'
        cvBridge.upd((st: any) => {
          if (bid === 'galleries') {
            st.galindex = { ...(st.galindex ?? {}), canvas: { ...((st.galindex ?? {}).canvas ?? {}), [d.dev as string]: d.board } }
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
  const [tms, setTms] = useState<Tm[]>([])
  const [pkgs, setPkgs] = useState<WPkg[]>([])
  const [tName, setTName] = useState('')
  const [tQuote, setTQuote] = useState('')
  const [tFile, setTFile] = useState<File | null>(null)
  const [tBusy, setTBusy] = useState(false)
  const [previewKey, setPreviewKey] = useState(0)
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
      if (e.data && e.data.type === 'camrhia-preview-ready') sendPreview()
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

  const loadExtras = useCallback(async () => {
    const sb = supabase
    if (!sb) return
    const { data: sess } = await sb.auth.getSession()
    const id = sess.session?.user.id
    if (!id) return
    const { data } = await sb.from('testimonials').select('id, storage_path, quote, client_name, sort_order').eq('owner_id', id).order('sort_order', { ascending: true })
    setTms((data ?? []) as Tm[])
    const pk = await sb.from('website_packages').select('id, title, price, description, sort_order').eq('photographer_id', id).order('sort_order', { ascending: true })
    setPkgs((pk.data ?? []) as WPkg[])
    const ph = await sb.from('website_photos').select('storage_path').eq('photographer_id', id).order('created_at', { ascending: false }).limit(80)
    setCandsDb(((ph.data ?? []) as { storage_path: string }[]).map((x) => x.storage_path))
    const gl = await sb.from('website_galleries').select('id').eq('photographer_id', id).order('sort_order', { ascending: true }).limit(1)
    setFirstGid(((gl.data ?? []) as { id: string }[])[0]?.id ?? null)
  }, [])
  useEffect(() => { loadExtras() }, [loadExtras])

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
  function pickPair(k: string) {
    setForm((f) => {
      if (!f) return f
      const s = JSON.parse(JSON.stringify(f.site_settings ?? {})) as Record<string, any>
      if (s.fonts) { delete s.fonts.head; delete s.fonts.body }
      return { ...f, site_font_pair: k, site_settings: s }
    })
  }
  const dirty = JSON.stringify(form) !== JSON.stringify(saved)

  async function save() {
    const sb = supabase
    if (!form || !sb) return
    setSaving(true)
    const { error } = await sb.from('profiles').update({
      logo_path: form.logo_path,
      site_template: form.site_template ?? 'editorial',
      site_accent: form.site_accent,
      site_font_pair: form.site_font_pair ?? 'serif',
      site_headline: form.site_headline?.trim() || null,
      site_subhead: form.site_subhead?.trim() || null,
      site_sections: form.site_sections ?? {},
      site_settings: form.site_settings ?? {},
    }).eq('id', form.id)
    setSaving(false)
    if (error) { flash(error.message); return }
    setSaved(form)
    flash('Saved')
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

  function canvasPanel(boardId: string) {
    const isAbout = boardId === 'about'
    const isGal = boardId === 'galleries'
    const customsList = (S.customs ?? []) as any[]
    const canvasData = isAbout ? S.about?.canvas : isGal ? S.galindex?.canvas : customsList.find((c) => c.id === boardId)?.canvas
    const ph2 = isAbout ? S.about?.photo2 : null
    const galIds = cvGalleries.map((g) => g.id)
    const b = isGal && !hasBoard(canvasData, device) ? galleryStarter(device, galIds) : getBoard(canvasData, device, ph2, !isAbout)
    const sel: CItem | null = cvBoard === boardId ? (b.items.find((i) => i.id === cvSel) ?? null) : null
    const setBoard = (nb: { h: number; items: CItem[] }) => upd((st: any) => {
      if (isGal) {
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
    const add = (type: 'photo' | 'card' | 'heading' | 'button' | 'gallery') => {
      const it = newItem(type, device, Math.max(0, ...b.items.map((i) => i.z)) + 1)
      if (type === 'gallery') it.galleryId = galIds.find((id) => !b.items.some((i) => i.galleryId === id)) ?? galIds[0]
      setBoard({ ...b, items: [...b.items, it] })
      pick(it.id)
    }
    const names: Record<string, string> = { photo: 'Photo', card: 'Text card', heading: 'Heading', button: 'Button', gallery: 'Gallery tile' }
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
    return (
      <div className="space-y-4 border-t border-line pt-4">
        <p className="text-sm text-ink">Free layout <span className="text-xs text-ink-soft">· arranging the {device} page</span></p>
        <p className="text-xs text-ink-soft">Drag anything in the preview to move it, and drag the small square on its corner to resize. To remove something, click it, then press the small × on its corner or the Delete key. Use the Phone / Desktop switch above the preview to arrange each size.</p>
        <div className="flex flex-wrap gap-2">
          {((isGal ? ['gallery', 'heading', 'card', 'button', 'photo'] : ['photo', 'card', 'heading', 'button']) as ('photo' | 'card' | 'heading' | 'button' | 'gallery')[]).map((tp) => (
            <button key={tp} type="button" className={btnGhost} onClick={() => add(tp)}>+ {names[tp]}</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {b.items.map((i, n) => (
            <button key={i.id} type="button" onClick={() => pick(i.id)}
              className={`rounded-full border px-3 py-1 text-xs ${cvBoard === boardId && cvSel === i.id ? 'border-ink text-ink' : 'border-line text-ink-soft'}`}>
              {names[i.type]} {n + 1}
            </button>
          ))}
        </div>
        <div>
          <p className="mb-1 text-xs text-ink-soft">Section height</p>
          <Slider min={30} max={260} step={2} value={b.h} onChange={(v) => setBoard({ ...b, h: v })} />
        </div>
        {sel && (
          <div className="space-y-3 rounded-xl border border-line bg-white p-4">
            <p className="text-sm font-medium text-ink">{names[sel.type]}</p>
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
            {sel.type === 'gallery' && (
              <>
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink">Gallery</label>
                  <select value={sel.galleryId ?? ''} onChange={(e) => patch(sel.id, { galleryId: e.target.value })} className={inputCls}>
                    {cvGalleries.map((g) => <option key={g.id} value={g.id}>{g.title || 'Untitled'}</option>)}
                  </select>
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
            <div className="flex flex-wrap gap-2 border-t border-line pt-3">
              <button type="button" className={btnGhost} onClick={() => patch(sel.id, { z: sel.z + 1 })}>Bring forward</button>
              <button type="button" className={btnGhost} onClick={() => patch(sel.id, { z: Math.max(0, sel.z - 1) })}>Send back</button>
              <button type="button" className={btnGhost} style={{ color: '#9c3b3b' }} onClick={() => { setBoard({ ...b, items: b.items.filter((i) => i.id !== sel.id) }); pick(null) }}>Remove this item</button>
            </div>
          </div>
        )}
        <button type="button" className="text-xs text-ink-soft hover:text-ink" onClick={() => { setBoard(isAbout ? starter(device, ph2) : isGal ? galleryStarter(device, galIds) : blank(device)); pick(null) }}>
          Start over with the {isAbout ? 'starter' : isGal ? 'default' : 'blank'} layout
        </button>
      </div>
    )
  }

  function customBlock(pg: 'home' | 'about' | 'galleries') {
    const list = ((S.customs ?? []) as any[]).filter((c) => c.page === pg)
    return (
      <>
        {list.map((c, n) => (
          <Group key={c.id} open={cvNew === c.id} title={list.length > 1 ? `Custom section ${n + 1}` : 'Custom section'} hint="free layout"
            onOpen={() => { if (pg === 'galleries') setPreviewPage('galleries'); scrollPreview(c.id) }}>
            {sectionHead(c.id, true, false)}
            {canvasPanel(c.id)}
            <button type="button" className="text-xs text-ink-soft hover:text-ink" onClick={() => removeCustom(c.id)}>Delete this section</button>
          </Group>
        ))}
        <button type="button" className={btnGhost + ' w-full'} onClick={() => addCustom(pg)}>+ Add a custom section</button>
      </>
    )
  }

  async function addTm() {
    const sb = supabase
    if (!sb || !tQuote.trim() || tBusy) return
    const { data: sess } = await sb.auth.getSession()
    const id = sess.session?.user.id
    if (!id) return
    setTBusy(true)
    try {
      let path: string | null = null
      if (tFile) {
        const v = await makeVersions(tFile)
        path = `${id}/testimonial_${Date.now()}.jpg`
        const up = await sb.storage.from('portfolio').upload(path, v.web.blob, { contentType: 'image/jpeg', upsert: true })
        if (up.error) throw up.error
      }
      const { error } = await sb.from('testimonials').insert({ owner_id: id, quote: tQuote.trim(), client_name: tName.trim() || null, storage_path: path, sort_order: tms.length })
      if (error) throw error
      setTName(''); setTQuote(''); setTFile(null)
      await loadExtras()
      setPreviewKey((k) => k + 1)
      flash('Testimonial added')
    } catch (e) {
      flash((e as { message?: string })?.message ?? 'Could not add the testimonial.')
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
    setPreviewKey((k) => k + 1)
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

  const ABOUT_KEYS = ['about', 'investment', 'faq']
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
    const field = orderField(pageOfKey(k))
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
  function secStyleBlock(id: string) {
    if (!T) return null
    const sv = ((S as any).secStyle?.[id] ?? {}) as { bg?: string; text?: string; head?: string; body?: string }
    const put = (patch: Record<string, string | undefined>) => setIn('secStyle', { [id]: { ...sv, ...patch } })
    return (
      <div className="space-y-4 border-t border-line pt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">Colors and fonts for this section</p>
        <ColorField label="Background" value={sv.bg ?? T.bg} swatches={palette()} onChange={(h) => put({ bg: h })} onReset={() => put({ bg: undefined })} />
        <ColorField label="Text color" value={sv.text ?? T.ink} swatches={palette()} onChange={(h) => put({ text: h })} onReset={() => put({ text: undefined })} />
        <FontPicker label="Heading font" value={sv.head ?? T.headKey} cats={['serif', 'sans', 'script', 'display']} onChange={(k) => put({ head: k })} />
        <FontPicker label="Body font" value={sv.body ?? T.bodyKey} cats={['serif', 'sans']} onChange={(k) => put({ body: k })} />
        {(sv.bg || sv.text || sv.head || sv.body) && (
          <button type="button" className="text-xs text-ink-soft hover:text-ink" onClick={() => setIn('secStyle', { [id]: undefined })}>Use the site-wide look for this section</button>
        )}
      </div>
    )
  }

  function pickTab(t: 'style' | 'home' | 'galleries' | 'about' | 'book') {
    setTab(t)
    setPreviewPage(t === 'book' ? 'availability' : t === 'style' ? 'home' : t)
  }
  function previewSrc() {
    const b = `/site/${token}`
    if (previewPage === 'availability') return `${b}/availability?preview=1${showSent ? '&sent=1' : ''}`
    if (previewPage === 'about') return `${b}/about?preview=1`
    if (previewPage === 'galleries') return `${b}/galleries?preview=1`
    if (previewPage === 'gallery') return firstGid ? `${b}/g/${firstGid}?preview=1` : `${b}/galleries?preview=1`
    return `${b}?preview=1`
  }
  function scrollPreview(id: string) {
    const win = () => (document.getElementById('site-frame') as HTMLIFrameElement | null)?.contentWindow
    win()?.postMessage({ type: 'camrhia-outline', id }, '*')
    if (id) win()?.postMessage({ type: 'camrhia-scroll', id }, '*')
  }
  function sectionHead(k: string, toggle = true, heading = true) {
    const list = listFor(k)
    const idx = list.indexOf(k)
    const total = list.length
    const small = 'rounded-full border border-line px-3 py-1 text-xs text-ink disabled:opacity-30'
    return (
      <>
        {toggle && (
          <Row label="Show this section">
            <Switch on={form?.site_sections?.[k] !== false} onChange={(v) => set('site_sections', { ...(form?.site_sections ?? {}), [k]: v })} />
          </Row>
        )}
        <Row label={`Position on page (${idx + 1} of ${total})`}>
          <span className="flex gap-2">
            <button type="button" disabled={idx <= 0} onClick={() => moveSection(k, -1)} className={small}>▲ Up</button>
            <button type="button" disabled={idx < 0 || idx >= total - 1} onClick={() => moveSection(k, 1)} className={small}>▼ Down</button>
          </span>
        </Row>
        <div>
          {heading && <label className="mb-1 block text-xs font-medium text-ink">Section heading</label>}
          {heading && <input value={S.titles?.[k] ?? ''} onChange={(e) => setIn('titles', { [k]: e.target.value })} placeholder={DEFAULT_TITLES[k]} className={inputCls} />}
        </div>
      </>
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
  const path = curSlug ? `/${curSlug}/site` : token ? `/site/${token}` : null
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
    <div className="min-h-screen bg-paper lg:pl-60">
      <style>{SLIDER_CSS}</style>
      <link rel="stylesheet" href={ALL_FONTS_HREF} />
      <DashboardHeader active="website" />
      <main className="mx-auto max-w-7xl px-6 py-8">
        {!form || !T ? (
          <p className="text-sm text-ink-soft">{message ?? 'Loading…'}</p>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="mb-2 font-mono text-xs uppercase tracking-widest text-brass">Your website</p>
                <h1 className="font-fraunces text-3xl font-semibold text-ink">Design your website</h1>
                <p className="mt-1 text-sm text-ink-soft">Work down the steps. The preview updates as you go, and nothing is live until you press Save.</p>
              </div>
              <div className="flex items-center gap-3">
                {message && <span className="text-sm text-twilight">{message}</span>}
                {path && <a href={path} target="_blank" rel="noreferrer" className={btnGhost}>View live site</a>}
                <button className={btn} disabled={!dirty || saving} onClick={save}>
                  {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
                </button>
              </div>
            </div>

            {fullUrl && (
              <div className="-mt-2 mb-5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
                  <span className="text-ink-soft">Your link</span>
                  <span className="font-medium text-ink">{fullUrl.replace('https://', '')}</span>
                  <button className={btnGhost} onClick={() => { navigator.clipboard?.writeText(fullUrl); flash('Link copied') }}>Copy</button>
                  {!slugEdit && <button className={btnGhost} onClick={() => { setSlugDraft(curSlug ?? ''); setSlugMsg(''); setSlugEdit(true) }}>Change name</button>}
                </div>
                {slugEdit && (
                  <div className="mt-3 max-w-md space-y-2 rounded-2xl border border-line bg-card p-4">
                    <div className="flex items-center gap-1 text-sm text-ink-soft">
                      <span>camrhia.com/</span>
                      <input value={slugDraft} onChange={(e) => setSlugDraft(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="yourname" className={inputCls} />
                      <span>/site</span>
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

            <div className="grid gap-8 lg:grid-cols-[minmax(0,480px)_1fr]">
              <div className="cr-cap space-y-4">
                <div>
                  <div className="flex flex-wrap gap-x-7 border-b border-line">
                    {([{ v: 'home', label: 'Home' }, { v: 'galleries', label: 'Galleries' }, { v: 'about', label: 'About' }, { v: 'book', label: 'Book' }] as const).map((o) => (
                      <button key={o.v} type="button" onClick={() => pickTab(o.v)}
                        className={`-mb-px border-b-2 pb-3 font-fraunces text-lg transition ${tab === o.v ? 'border-ink text-ink' : 'border-transparent text-ink-soft hover:text-ink'}`}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                  <p className={tab === 'home' || tab === 'style' ? 'hidden' : 'mt-3 text-xs text-ink-soft'}>
                    {tab === 'home' ? 'Your main page, plus the look that every page shares.' : tab === 'galleries' ? 'Your list of galleries, and the page inside each one.' : tab === 'about' ? 'Your story, your pricing and your FAQ.' : 'Where every button leads: the date check and inquiry form.'}
                  </p>
                </div>
                {tab === 'home' && (<>
<p className="px-1 pt-1 text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">Style controls <span className="font-normal normal-case tracking-normal">· the look of every page</span></p>

<Group title="Template" hint="pick a look" onOpen={() => scrollPreview('')}>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {TEMPLATES.map((t) => (
                      <button key={t.key} type="button" onClick={() => set('site_template', t.key)} className="group text-left">
                        <div className={`overflow-hidden rounded-lg transition ${tpl === t.key ? 'ring-2 ring-ink ring-offset-2 ring-offset-card' : 'ring-1 ring-line group-hover:ring-ink-soft'}`}><Thumb kind={t.key} /></div>
                        <p className="mt-2.5 font-fraunces text-base text-ink">{t.name}</p>
                        <p className="text-xs leading-snug text-ink-soft">{t.blurb}</p>
                      </button>
                    ))}
                  </div>
                </Group>

<Group title="Color & fonts" hint="used on every page" onOpen={() => scrollPreview('')}>
                  
                  {colorRow('Background', 'bg', T.bg)}
                  {colorRow('Text', 'text', T.ink)}
                  <div className="grid grid-cols-3 gap-3 pt-2">
                    {Object.entries(PAIR_PRESETS).map(([key, p]) => {
                      const sel = (form.site_font_pair ?? 'serif') === key && !S.fonts?.head && !S.fonts?.body
                      return (
                        <button key={key} onClick={() => pickPair(key)} className={`rounded-xl border p-3 text-left ${sel ? 'border-twilight ring-1 ring-twilight' : 'border-line'}`}>
                          <p style={{ fontFamily: FONT_OPTIONS[p.head].family, fontSize: 24, lineHeight: 1.1 }} className="text-ink">Aa</p>
                          <p style={{ fontFamily: FONT_OPTIONS[p.body].family, fontSize: 11 }} className="mt-1 text-ink-soft">{p.name}</p>
                        </button>
                      )
                    })}
                  </div>
                  <FontPicker label="Heading font" value={T.headKey} cats={['serif', 'sans', 'script', 'display']} onChange={(k) => setIn('fonts', { head: k })} />
                  {(() => {
                    const ws = (FONT_OPTIONS[T.headKey]?.weights ?? [400]).filter((w) => w <= 700)
                    const nm: Record<number, string> = { 100: 'Hairline', 200: 'Thin', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semi', 700: 'Bold' }
                    const want = T.headWeight ?? 500
                    const cur = ws.reduce((a, b) => (Math.abs(b - want) < Math.abs(a - want) ? b : a), ws[0])
                    return ws.length > 1 ? (
                      <div>
                        <p className="mb-2 text-sm text-ink">Heading weight</p>
                        <Seg value={String(cur)} options={ws.map((w) => ({ v: String(w), label: nm[w] ?? String(w) }))} onChange={(v) => setIn('fonts', { headWeight: Number(v) })} />
                      </div>
                    ) : <p className="text-xs text-ink-soft">This font has one weight. Pick a font with Thin or Light for a lighter look.</p>
                  })()}
                  <FontPicker label="Body font" value={T.bodyKey} cats={['serif', 'sans']} onChange={(k) => setIn('fonts', { body: k })} />
                </Group>
<Group title="Buttons" hint="wording, color, size, shape" onOpen={() => scrollPreview('')}>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink">Button wording (every button on the site)</label>
                    <input value={S.hero?.cta_text ?? ''} onChange={(e) => setHero({ cta_text: e.target.value })} placeholder="Check availability" className={inputCls} />
                  </div>
                  <ColorField label="Button & accent color" value={form.site_accent ?? brandHex()} swatches={palette()}
                    onChange={(h) => set('site_accent', h)} onReset={() => set('site_accent', null)} />
                  <ColorField label="Button text color" value={T.btnText} swatches={palette()}
                    onChange={(h) => setIn('button', { text: h })}
                    onReset={() => upd((st) => { const b = { ...(st.button ?? {}) }; delete b.text; st.button = b })} />
                  <Row label="Button shape">
                    <Seg value={T.shape} options={[{ v: 'square', label: 'Square' }, { v: 'rounded', label: 'Rounded' }, { v: 'pill', label: 'Pill' }]} onChange={(v) => setIn('button', { shape: v })} />
                  </Row>
                  <SizeControl device={device} label="Button size" unit="px" min={9} max={20} step={1} value={T.sizes.button} onChange={(d, v) => setSize('button', d, v)} />
                </Group>

<Group title="Text & spacing sizes" hint="phone and desktop" onOpen={() => scrollPreview('')}>
                  
                  
                  <p className="text-xs text-ink-soft">Sizes follow the Phone / Desktop switch above the preview. You can also type an exact number.</p>
                  <SizeControl device={device} label="Text size" unit="%" min={80} max={130} step={5} value={T.sizes.text} onChange={(d, v) => setSize('text', d, v)} />
                  
                  
                  <SizeControl device={device} label="Space between sections" unit="px" min={16} max={220} step={4} value={T.sizes.sectionSpace} onChange={(d, v) => setSize('sectionSpace', d, v)} />
                  <SizeControl device={device} label="Space between gallery covers" unit="px" min={0} max={60} step={2} value={T.sizes.photoGap} onChange={(d, v) => setSize('photoGap', d, v)} />
                </Group>
</>)}
{tab === 'home' && (<><p className="px-1 pt-3 text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">Sections <span className="font-normal normal-case tracking-normal">· build your home page top to bottom</span></p><Group title="1. Logo" hint="upload, size and position" onOpen={() => scrollPreview('nav')}>
<div className="border-t border-line pt-4">
                    <p className="mb-1 text-sm text-ink">Logo</p>
                    <p className="mb-3 text-xs text-ink-soft">Shows in your menu bar. It is the same logo as your app profile. Without one, your studio name is used.</p>
                    <div className="flex flex-wrap items-center gap-3">
                      {form.logo_path ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={BASE + form.logo_path} alt="" className="h-12 max-w-[160px] rounded border border-line bg-white object-contain p-1" />
                      ) : (
                        <div className="flex h-12 w-24 items-center justify-center rounded border border-dashed border-line text-xs text-ink-soft">No logo</div>
                      )}
                      <label className={btnGhost + ' cursor-pointer'}>
                        {form.logo_path ? 'Replace' : 'Upload logo'}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(f); e.target.value = '' }} />
                      </label>
                      {form.logo_path && <button type="button" className="text-xs text-ink-soft hover:text-ink" onClick={() => set('logo_path', null)}>Remove</button>}
                    </div>
                  </div>
                  <SizeControl device={device} label="Logo size" unit="px" min={16} max={120} step={2} value={T.sizes.logo} onChange={(d, v) => setSize('logo', d, v)} />
                  <Row label="Logo position">
                    <Seg value={T.menu.logoPos || 'default'} options={[{ v: 'default', label: 'Match template' }, { v: 'left', label: 'Left' }, { v: 'center', label: 'Center' }, { v: 'right', label: 'Right' }]} onChange={(v) => setIn('menu', { logoPos: v === 'default' ? '' : v })} />
                  </Row>
                  {(() => {
                    const nv = T.sizes.logoNudge[device]
                    return (
                      <div>
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-sm text-ink">Nudge left / right</span>
                          <span className="font-mono text-xs text-ink-soft">{nv > 0 ? '+' : ''}{nv}px</span>
                        </div>
                        <div className="relative">
                          <Slider min={-80} max={80} step={1} value={nv} onChange={(x) => setSize('logoNudge', device, Math.abs(x) <= 4 ? 0 : x)} />
                          <div className="pointer-events-none absolute left-1/2 top-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded bg-brass" style={{ opacity: nv === 0 ? 1 : 0.55 }} />
                        </div>
                        <p className="mt-1 text-center text-[11px] text-ink-soft">{nv === 0 ? 'Centered on its spot' : 'Slide to the line to snap back'}</p>
                      </div>
                    )
                  })()}
                  </Group>
<Group title="2. Menu" hint="style, words and fonts" onOpen={() => scrollPreview('nav')}>
<Row label="Menu bar">
                    <Seg value={T.menu.solid ? 'solid' : 'auto'} options={[{ v: 'auto', label: 'Match template' }, { v: 'solid', label: 'Solid bar' }]} onChange={(v) => setIn('menu', { style: v })} />
                  </Row>
                  <Row label="Menu on desktop">
                    <Seg value={S.menu?.icon === 'burger' ? 'burger' : 'links'} options={[{ v: 'links', label: 'Words' }, { v: 'burger', label: 'Hamburger' }]} onChange={(v) => setIn('menu', { icon: v })} />
                  </Row>
                  <SizeControl device={device} label="Menu word size" unit="px" min={9} max={22} step={1} value={T.sizes.menu} onChange={(d, v) => setSize('menu', d, v)} />
                  <div className="space-y-2">
                    {MENU_KEYS.map((k) => (
                      <div key={k} className="flex items-center gap-3">
                        <input value={S.menu?.labels?.[k] ?? ''} placeholder={NAV_DEFAULTS[k]}
                          onChange={(e) => upd((s) => { s.menu = { ...(s.menu ?? {}), labels: { ...(s.menu?.labels ?? {}), [k]: e.target.value } } })} className={inputCls} />
                        <Switch on={!menuHidden.includes(k)}
                          onChange={(v) => upd((s) => { const h: string[] = Array.isArray(s.menu?.hidden) ? [...s.menu.hidden] : []; const i = h.indexOf(k); if (v && i >= 0) h.splice(i, 1); if (!v && i < 0) h.push(k); s.menu = { ...(s.menu ?? {}), hidden: h } })} />
                      </div>
                    ))}
                  </div>
                {secStyleBlock('nav')}
</Group>
<Group title="3. Hero" hint="photos and headline" onOpen={() => scrollPreview('top')}>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink">Headline</label>
                    <input value={form.site_headline ?? ''} onChange={(e) => set('site_headline', e.target.value)} placeholder="e.g. Boise Wedding Photographer" className={inputCls} />
                    <div className="mt-3"><SizeControl device={device} label="Headline size" unit="px" min={24} max={140} step={2} value={T.sizes.headline} onChange={(d, v) => setSize('headline', d, v)} /></div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink">Location line</label>
                    <input value={form.site_subhead ?? ''} onChange={(e) => set('site_subhead', e.target.value)} placeholder="e.g. Boise, Idaho" className={inputCls} />
                    <div className="mt-3"><SizeControl device={device} label="Location line size" unit="px" min={9} max={28} step={1} value={T.sizes.subhead} onChange={(d, v) => setSize('subhead', d, v)} /></div>
                  </div>
                  <div>
                    <p className="mb-1 text-sm text-ink">Hero photos</p>
                    <p className="mb-2 text-xs text-ink-soft">Tap photos to choose up to 6. The first one you pick leads. With none picked, your app cover is used.</p>
                    <div className="grid grid-cols-4 gap-2">
                      {cands.map((p) => {
                        const idx = heroSel.indexOf(p)
                        return (
                          <button key={p} type="button" onClick={() => toggleHero(p)} className={`relative aspect-square overflow-hidden rounded-lg ${idx >= 0 ? 'ring-2 ring-twilight' : ''}`}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={BASE + p} alt="" className="h-full w-full object-cover" loading="lazy" />
                            {idx >= 0 && <span className="absolute left-1 top-1 rounded bg-twilight px-1.5 text-[10px] text-white">{idx + 1}</span>}
                          </button>
                        )
                      })}
                      <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-line text-center text-xs text-ink-soft hover:border-twilight">
                        <span className="text-xl text-ink">+</span>Upload
                        <input type="file" accept="image/*,.heic,.heif" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadHero(f); e.target.value = '' }} />
                      </label>
                    </div>
                  </div>
                  <Row label="Slideshow (when 2+ photos)"><Switch on={T.hero.slideshow} onChange={(v) => setHero({ slideshow: v })} /></Row>
                  
                  
                  <SizeControl device={device} label="Hero height" unit="vh" min={40} max={100} step={5} value={T.sizes.heroHeight} onChange={(d, v) => setSize('heroHeight', d, v)} />
                  
                  <Row label="Show button in hero"><Switch on={T.hero.ctaShow} onChange={(v) => setHero({ cta_show: v })} /></Row>
                  
                {secStyleBlock('top')}
</Group>
<Group title="4. Explore" hint="links to your other pages" onOpen={() => scrollPreview('explore')}>
  <Row label="Show this section"><Switch on={S.explore?.show !== false} onChange={(v) => setIn('explore', { show: v })} /></Row>
  <LayoutPicker value={S.explore?.layout ?? 'lines'} onChange={(v) => setIn('explore', { layout: v })}
    options={[
      { v: 'lines', name: 'Lines', thumb: <svg viewBox="0 0 60 40" className="h-full w-full"><g fill="#B9AFA2"><rect x="5" y="14" width="12" height="3" /><rect x="24" y="14" width="12" height="3" /><rect x="43" y="14" width="12" height="3" /></g><g fill="#D8D0C4"><rect x="5" y="21" width="12" height="2" /><rect x="24" y="21" width="12" height="2" /><rect x="43" y="21" width="12" height="2" /></g></svg> },
      { v: 'tiles', name: 'Big tiles', thumb: <svg viewBox="0 0 60 40" className="h-full w-full"><g fill="#D8D0C4"><rect x="4" y="8" width="16" height="24" rx="2" /><rect x="22" y="8" width="16" height="24" rx="2" /><rect x="40" y="8" width="16" height="24" rx="2" /></g><g fill="#B9AFA2"><rect x="7" y="25" width="10" height="3" /><rect x="25" y="25" width="10" height="3" /><rect x="43" y="25" width="10" height="3" /></g></svg> },
      { v: 'list', name: 'Numbered list', thumb: <svg viewBox="0 0 60 40" className="h-full w-full"><g fill="#B9AFA2"><rect x="6" y="9" width="30" height="4" /><rect x="6" y="19" width="30" height="4" /><rect x="6" y="29" width="30" height="4" /></g><g fill="#D8D0C4"><rect x="42" y="10" width="12" height="2" /><rect x="42" y="20" width="12" height="2" /><rect x="42" y="30" width="12" height="2" /></g></svg> },
      { v: 'cards', name: 'Cards', thumb: <svg viewBox="0 0 60 40" className="h-full w-full"><g fill="#D8D0C4"><rect x="4" y="9" width="16" height="22" rx="2" /><rect x="22" y="9" width="16" height="22" rx="2" /><rect x="40" y="9" width="16" height="22" rx="2" /></g><g fill="#9A8A74"><rect x="4" y="9" width="16" height="2" /><rect x="22" y="9" width="16" height="2" /><rect x="40" y="9" width="16" height="2" /></g></svg> },
    ]} />
  <div>
    <label className="mb-1 block text-xs font-medium text-ink">Label above the links (optional)</label>
    <input value={S.explore?.heading ?? ''} onChange={(e) => setIn('explore', { heading: e.target.value })} placeholder="Explore" className={inputCls} />
  </div>
  {([['galleries', 'Galleries', 'See my work'], ['about', 'About', 'Get to know me'], ['book', 'Book', 'Check my dates']] as const).map(([k, tt, ss]) => (
    <div key={k} className="space-y-2 rounded-xl border border-line p-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-ink-soft">{tt} link</p>
      <div>
        <label className="mb-1 block text-xs font-medium text-ink">Title</label>
        <input value={(S.explore as any)?.titles?.[k] ?? ''} onChange={(e) => setIn('explore', { titles: { ...((S.explore as any)?.titles ?? {}), [k]: e.target.value } })} placeholder={tt} className={inputCls} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-ink">Subtitle</label>
        <input value={S.explore?.lines?.[k] ?? ''} onChange={(e) => setIn('explore', { lines: { ...(S.explore?.lines ?? {}), [k]: e.target.value } })} placeholder={ss} className={inputCls} />
      </div>
    </div>
  ))}
  <p className="text-xs text-ink-soft">Leave a title empty to use the name from your Menu step.</p>
{secStyleBlock('explore')}
</Group>
<Group title="5. Gallery covers" hint="covers on your home page" onOpen={() => scrollPreview('portfolio')}>
                  {sectionHead('portfolio')}
                  <div>
                    <p className="mb-2 text-sm text-ink">Layout on your home page</p>
                    <LayoutPicker value={T.portfolio.layout} onChange={(v) => setIn('portfolio', { layout: v })}
                      options={[{ v: 'grid', name: 'Grid', thumb: THUMBS.galGrid }, { v: 'banners', name: 'Banners', thumb: THUMBS.galBanners }, { v: 'feature', name: 'Feature', thumb: THUMBS.galFeature }]} />
                  </div>
<div>
                    
                    <p className="mb-3 mt-1 text-sm text-ink-soft">One gallery per kind of work: Weddings, Seniors, Families. Each gets its own page.</p>
                    <Link href="/website/galleries" className={btn + ' inline-block'}>Manage galleries</Link>
                  </div>

                  

                  <Row label="Gallery card shape">
                    <Seg value={T.gallery.card} options={[{ v: 'portrait', label: 'Portrait' }, { v: 'square', label: 'Square' }, { v: 'landscape', label: 'Landscape' }]} onChange={(v) => setIn('gallery', { card: v })} />
                  </Row>
                  
{secStyleBlock('portfolio')}
</Group>
<Group title="6. Testimonials" hint="kind words with pictures" onOpen={() => scrollPreview('words')}>
                  {sectionHead('testimonials')}
<div>
                    <p className="mb-2 text-sm text-ink">Layout</p>
                    <LayoutPicker value={(S.testimonials?.layout ?? T.testi.layout) as any} onChange={(v) => setIn('testimonials', { layout: v })}
                      options={[{ v: 'grid', name: 'Grid', thumb: THUMBS.teGrid }, { v: 'stacked', name: 'Stacked', thumb: THUMBS.teStacked }, { v: 'cards', name: 'Cards', thumb: THUMBS.teCards }, { v: 'carousel', name: 'Carousel', thumb: <svg viewBox="0 0 60 40" className="h-full w-full"><g stroke="#9A8A74" strokeWidth="1" fill="none"><path d="M6 6h8M6 6l2-2M6 6l2 2" /><path d="M18 6h8M26 6l-2-2M26 6l-2 2" /></g><rect x="12" y="11" width="36" height="18" rx="4" fill="#D8D0C4" /><rect x="40" y="23" width="14" height="5" rx="2.5" fill="#B9AFA2" /><rect x="14" y="33" width="32" height="2" fill="#B9AFA2" /></svg> }]} />
                  </div>
<div>
                    
                    <p className="mb-3 mt-1 text-sm text-ink-soft">Kind words, with a picture if you have one. Shown on your website and your app profile.</p>
                    {tms.length === 0 && <p className="mb-3 text-sm text-ink-soft">No testimonials yet.</p>}
                    {tms.map((t) => (
                      <div key={t.id} className="mb-3 flex gap-3 rounded-lg border border-line bg-white p-3">
                        {t.storage_path ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={BASE + t.storage_path} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                        ) : (
                          <div className="h-16 w-16 shrink-0 rounded-lg bg-line/50" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm text-ink">&ldquo;{t.quote}&rdquo;</p>
                          {t.client_name && <p className="mt-1 text-xs text-ink-soft">{t.client_name}</p>}
                        </div>
                        <button onClick={() => removeTm(t)} className="self-start text-xs text-ink-soft hover:text-ink">Remove</button>
                      </div>
                    ))}
                    <div className="mt-3 space-y-2 border-t border-line pt-3">
                      <input className={inputCls} value={tName} onChange={(e) => setTName(e.target.value)} placeholder="Client name, e.g. Sarah & Tom" />
                      <textarea className={inputCls} rows={3} value={tQuote} onChange={(e) => setTQuote(e.target.value)} placeholder="What they said" />
                      <input type="file" accept="image/*,.heic,.heif" onChange={(e) => setTFile(e.target.files?.[0] ?? null)} className="block w-full text-xs text-ink-soft" />
                      <button className={btn} disabled={!tQuote.trim() || tBusy} onClick={addTm}>{tBusy ? 'Adding…' : 'Add testimonial'}</button>
                    </div>
                  </div>

                  
{secStyleBlock('words')}
</Group>
<Group title="7. Closing section" hint="last thing before the footer" onOpen={() => scrollPreview('contact')}>
                  {sectionHead('contact', false)}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink">Contact message</label>
                    <textarea rows={3} value={S.text?.contact ?? ''} onChange={(e) => setIn('text', { contact: e.target.value })} placeholder="Tell me about your day. Check a date and send me a message." className={inputCls} />
                  </div>
                {secStyleBlock('contact')}
</Group>
<Group title="8. Footer" hint="the line at the bottom" onOpen={() => scrollPreview('footer')}>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink">Footer line</label>
                    <input value={S.text?.footer ?? ''} onChange={(e) => setIn('text', { footer: e.target.value })} placeholder="e.g. Serving Boise, Sun Valley and beyond" className={inputCls} />
                  </div>
                {secStyleBlock('footer')}
</Group>
{customBlock('home')}
</>)}
{tab === 'galleries' && (<><Group title="1. Galleries page" hint="your list of galleries" onOpen={() => { setPreviewPage('galleries'); setTimeout(() => scrollPreview('portfolio'), 700) }}>
                  {!firstGid && <p className="text-sm text-ink-soft">Add a gallery with photos first and it will show in the preview.</p>}
                  <Link href="/website/galleries" className={btn + ' inline-block'}>Manage galleries &amp; photos</Link>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink">Page heading</label>
                    <input value={S.titles?.portfolio ?? ''} onChange={(e) => setIn('titles', { portfolio: e.target.value })} placeholder={DEFAULT_TITLES.portfolio} className={inputCls} />
                  </div>
                  <div>
                    <p className="mb-2 text-sm text-ink">Layout</p>
                    <LayoutPicker value={(S.galindex?.layout ?? T.galindex.layout) as any} onChange={(v) => setIn('galindex', { layout: v })}
                      options={[{ v: 'grid', name: 'Grid', thumb: THUMBS.galGrid }, { v: 'banners', name: 'Banners', thumb: THUMBS.galBanners }, { v: 'feature', name: 'Feature', thumb: THUMBS.galFeature }, { v: 'checker', name: 'Checkerboard', thumb: <svg viewBox="0 0 60 40" className="h-full w-full"><g fill="#D8D0C4"><rect x="6" y="4" width="24" height="10" /><rect x="30" y="14" width="24" height="10" /><rect x="6" y="24" width="24" height="10" /></g><g fill="#B9AFA2"><rect x="34" y="8" width="16" height="2" /><rect x="10" y="18" width="16" height="2" /><rect x="34" y="28" width="16" height="2" /></g></svg> }, { v: 'rows', name: 'Alternating rows', thumb: <svg viewBox="0 0 60 40" className="h-full w-full"><rect x="5" y="5" width="24" height="14" fill="#D8D0C4" /><g fill="#B9AFA2"><rect x="34" y="9" width="20" height="3" /><rect x="34" y="14" width="14" height="2" /></g><g fill="#B9AFA2"><rect x="6" y="26" width="20" height="3" /><rect x="6" y="31" width="14" height="2" /></g><rect x="31" y="22" width="24" height="14" fill="#D8D0C4" /></svg> }, { v: 'custom', name: 'Custom', thumb: <svg viewBox="0 0 60 40" className="h-full w-full"><rect x="6" y="6" width="20" height="14" rx="1" fill="#D8D0C4" /><rect x="30" y="10" width="24" height="12" rx="1" fill="#C9BFB2" /><rect x="12" y="24" width="20" height="11" rx="1" fill="#F2EBDD" stroke="#9A8A74" strokeWidth="0.8" strokeDasharray="2 1.5" /><rect x="29" y="31" width="5" height="5" fill="#B08D57" /></svg> }]} />
                  </div>
                  {(S.galindex?.layout ?? T.galindex.layout) === 'custom' && canvasPanel('galleries')}
                  {(S.galindex?.layout ?? T.galindex.layout) === 'checker' && (
                    <FontPicker label="Gallery name font" value={S.galindex?.font ?? 'barlowcondensed'} cats={['display', 'sans', 'serif']} onChange={(k) => setIn('galindex', { font: k })} />
                  )}
                  {(S.galindex?.layout ?? T.galindex.layout) === 'grid' && (
                    <Row label="Cover shape">
                    <Seg value={T.gallery.card} options={[{ v: 'portrait', label: 'Portrait' }, { v: 'square', label: 'Square' }, { v: 'landscape', label: 'Landscape' }]} onChange={(v) => setIn('gallery', { card: v })} />
                  </Row>
                  )}
                {secStyleBlock('portfolio')}
</Group>
<Group title="2. Inside a gallery" hint="what opens when a cover is clicked" onOpen={() => { setPreviewPage('gallery'); setTimeout(() => scrollPreview('gal-main'), 700) }}>
                  
                  
                  <div>
                    <p className="mb-2 text-sm text-ink">Photo layout</p>
                    <LayoutPicker value={T.galpage.layout} onChange={(v) => setIn('galpage', { layout: v })}
                      options={[{ v: 'masonry', name: 'Masonry', thumb: THUMBS.phMasonry }, { v: 'grid', name: 'Even grid', thumb: THUMBS.phGrid }, { v: 'single', name: 'Single column', thumb: THUMBS.phSingle }]} />
                  </div>
                  <Row label="Show photo count"><Switch on={T.galpage.showCount} onChange={(v) => setIn('galpage', { show_count: v })} /></Row>
                  <Row label="Show other galleries at the bottom"><Switch on={T.galpage.showMore} onChange={(v) => setIn('galpage', { show_more: v })} /></Row>
                  <Row label="Show the book button at the bottom"><Switch on={T.galpage.showButton} onChange={(v) => setIn('galpage', { show_button: v })} /></Row>
                </Group>
<Group title="3. Gallery photo sizes" hint="phone and desktop" onOpen={() => { setPreviewPage('gallery'); setTimeout(() => scrollPreview('gal-main'), 700) }}>
                  <p className="text-xs text-ink-soft">Sizes follow the Phone / Desktop switch above the preview. You can also type an exact number.</p>
                  <SizeControl device={device} label="Heading size" unit="px" min={24} max={120} step={2} value={T.sizes.galHeading} onChange={(d, v) => setSize('galHeading', d, v)} />
                  <SizeControl device={device} label="Space between photos" unit="px" min={0} max={60} step={2} value={T.sizes.galGap} onChange={(d, v) => setSize('galGap', d, v)} />
                </Group>{customBlock('galleries')}
</>)}
{tab === 'about' && (<><Group title="1. About" hint="your story" onOpen={() => scrollPreview('about')}>
                  {sectionHead('about')}
                  <div>
                    <p className="mb-2 text-sm text-ink">Layout</p>
                    <LayoutPicker value={(S.about?.layout ?? T.about.layout) as any} onChange={(v) => setIn('about', { layout: v })}
                      options={[{ v: 'left', name: 'Photo left', thumb: THUMBS.abLeft }, { v: 'right', name: 'Photo right', thumb: THUMBS.abRight }, { v: 'stacked', name: 'Stacked', thumb: THUMBS.abStack }, { v: 'collage', name: 'Collage', thumb: <svg viewBox="0 0 60 40" className="h-full w-full"><rect x="6" y="3" width="26" height="24" rx="2" fill="#D8D0C4" /><rect x="36" y="18" width="18" height="18" rx="3" fill="#C9BFB2" /><rect x="16" y="16" width="32" height="18" rx="3" fill="#F2EBDD" stroke="#B9AFA2" strokeWidth="0.8" /><rect x="20" y="20" width="14" height="2" fill="#9A8A74" /><rect x="20" y="25" width="24" height="1.5" fill="#B9AFA2" /><rect x="20" y="28" width="22" height="1.5" fill="#B9AFA2" /></svg> }, { v: 'canvas', name: 'Free layout', thumb: <svg viewBox="0 0 60 40" className="h-full w-full"><rect x="6" y="5" width="22" height="18" rx="2" fill="#D8D0C4" /><rect x="34" y="10" width="20" height="14" rx="2" fill="#C9BFB2" /><rect x="14" y="20" width="26" height="14" rx="2" fill="#F2EBDD" stroke="#9A8A74" strokeWidth="0.8" strokeDasharray="2 1.5" /><rect x="38" y="30" width="5" height="5" fill="#B08D57" /></svg> }]} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink">About text</label>
                    <textarea rows={4} value={S.text?.about ?? ''} onChange={(e) => setIn('text', { about: e.target.value })} placeholder="Leave empty to use your bio from the app" className={inputCls} />
                  </div>
                  {(S.about?.layout ?? T.about.layout) === 'collage' && (
                    <div className="border-t border-line pt-4">
                      <p className="mb-1 text-sm text-ink">Second photo</p>
                      <p className="mb-3 text-xs text-ink-soft">Sits behind the text card, lower right. Your main About photo comes from your app profile.</p>
                      <div className="flex flex-wrap items-center gap-3">
                        {S.about?.photo2 ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={BASE + S.about.photo2} alt="" className="h-16 w-12 rounded border border-line object-cover" />
                        ) : (
                          <div className="flex h-16 w-12 items-center justify-center rounded border border-dashed border-line text-[10px] text-ink-soft">None</div>
                        )}
                        <label className={btnGhost + ' cursor-pointer'}>
                          {S.about?.photo2 ? 'Replace' : 'Upload photo'}
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAbout2(f); e.target.value = '' }} />
                        </label>
                        {S.about?.photo2 && <button type="button" className="text-xs text-ink-soft hover:text-ink" onClick={() => setIn('about', { photo2: null })}>Remove</button>}
                      </div>
                    </div>
                  )}
                  {(S.about?.layout ?? T.about.layout) === 'canvas' && canvasPanel('about')}
                  <Link href="/portfolio" className={btnGhost + ' inline-block'}>Change your photo or bio in the app profile</Link>
                {secStyleBlock('about')}
</Group>
<Group title="2. Pricing" hint="packages and price list style" onOpen={() => scrollPreview('investment')}>
                  {sectionHead('investment')}
<div>
                    
                    <p className="mb-3 mt-1 text-sm text-ink-soft">Your website&apos;s own price list. It&apos;s separate from the pricing in your app.</p>
                    <div className="mb-4 space-y-3">
                      <div>
                        <p className="mb-2 text-sm text-ink">Price list style</p>
                        <LayoutPicker value={T.pricing.layout} onChange={(v) => setIn('pricing', { layout: v })}
                          options={[{ v: 'cards', name: 'Cards', thumb: THUMBS.prCards }, { v: 'menu', name: 'Menu', thumb: THUMBS.prMenu }, { v: 'columns', name: 'Columns', thumb: THUMBS.prCols }]} />
                      </div>
                      <Row label="Button on each package"><Switch on={T.pricing.button} onChange={(v) => setIn('pricing', { button: v })} /></Row>
                      <input value={S.pricing?.intro ?? ''} onChange={(e) => setIn('pricing', { intro: e.target.value })} placeholder="Line above the prices, e.g. Every collection includes a private gallery" className={inputCls} />
                      <input value={S.pricing?.note ?? ''} onChange={(e) => setIn('pricing', { note: e.target.value })} placeholder="Line below, e.g. Custom collections available. Just ask." className={inputCls} />
                    </div>
                    {pkgs.map((p, i) => (
                      <div key={p.id} className="mb-3 rounded-lg border border-line bg-white p-3">
                        <div className="mb-2 flex gap-2">
                          <input defaultValue={p.title} onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== p.title) updatePkg(p, { title: v }) }} className={inputCls} placeholder="Package name" />
                          <input defaultValue={p.price ?? ''} onBlur={(e) => { const v = e.target.value.trim(); if (v !== (p.price ?? '')) updatePkg(p, { price: v || null }) }} className={inputCls + ' max-w-[110px]'} placeholder="$2,400" />
                        </div>
                        <textarea defaultValue={p.description ?? ''} rows={5} onBlur={(e) => { const v = e.target.value.trim(); if (v !== (p.description ?? '')) updatePkg(p, { description: v || null }) }} className={inputCls} placeholder={"What is included, one per line:\n8 hours of coverage\nOnline gallery\nPrint release"} />
                        <div className="mt-2 flex gap-3 text-xs text-ink-soft">
                          <button type="button" disabled={i === 0} onClick={() => movePkg(p, -1)} className="disabled:opacity-30">↑ Up</button>
                          <button type="button" disabled={i === pkgs.length - 1} onClick={() => movePkg(p, 1)} className="disabled:opacity-30">↓ Down</button>
                          <button type="button" onClick={() => setIn('pricing', { featured: S.pricing?.featured === p.id ? null : p.id })} className={S.pricing?.featured === p.id ? 'font-medium text-twilight' : ''}>★ Most popular</button>
                          <button type="button" onClick={() => removePkg(p)} className="ml-auto hover:text-ink">Remove</button>
                        </div>
                      </div>
                    ))}
                    <div className="flex flex-wrap gap-2">
                      <button className={btn} onClick={addPkg}>Add package</button>
                      
                    </div>
                  </div>

                  
{secStyleBlock('investment')}
</Group>
<Group title="3. FAQ" hint="common questions" onOpen={() => scrollPreview('faq')}>
                  {sectionHead('faq')}
                  <p className="text-sm text-ink-soft">Your questions and answers are shared with your app profile.</p>
                  <Link href="/portfolio" className={btnGhost + ' inline-block'}>Edit your FAQ</Link>
                {secStyleBlock('faq')}
</Group>{customBlock('about')}
</>)}
{tab === 'book' && (<>
                <Group title="1. Layout" hint="photo and form arrangement" onOpen={() => { setShowSent(false); setTimeout(() => scrollPreview('book-main'), 500) }}>
                  <LayoutPicker value={T.availability.layout === 'centered' ? 'centered' : 'side'} onChange={(v) => setIn('availability', { layout: v })}
                    options={[
                      { v: 'side', name: 'Side by side', thumb: <svg viewBox="0 0 60 40" className="h-full w-full"><rect x="6" y="8" width="22" height="24" rx="2" fill="#D8D0C4" /><g fill="#B9AFA2"><rect x="33" y="10" width="21" height="3" /><rect x="33" y="16" width="21" height="3" /><rect x="33" y="22" width="21" height="3" /><rect x="33" y="28" width="21" height="4" rx="1" /></g></svg> },
                      { v: 'centered', name: 'Stacked', thumb: <svg viewBox="0 0 60 40" className="h-full w-full"><rect x="14" y="4" width="32" height="14" rx="2" fill="#D8D0C4" /><g fill="#B9AFA2"><rect x="14" y="22" width="32" height="3" /><rect x="14" y="28" width="32" height="3" /><rect x="14" y="34" width="32" height="3" /></g></svg> },
                    ]} />
                  <Row label="Photo above the page"><Switch on={T.availability.photo} onChange={(v) => setIn('availability', { photo: v })} /></Row>
                  <p className="text-xs text-ink-soft">On a phone the calendar always sits above the form. Turn the calendar off in step 3 to show only the form.</p>
                </Group>

                <Group title="2. Title & fonts" hint="heading and intro" onOpen={() => { setShowSent(false); setTimeout(() => scrollPreview('book-head'), 500) }}>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink">Heading</label>
                    <input value={S.availability?.title ?? ''} onChange={(e) => setIn('availability', { title: e.target.value })} placeholder="Check availability" className={inputCls} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink">Intro</label>
                    <textarea rows={2} value={S.availability?.intro ?? ''} onChange={(e) => setIn('availability', { intro: e.target.value })} placeholder="Pick a date to see if I am free, then tell me a little about your day." className={inputCls} />
                  </div>
                  <FontPicker label="Heading font" value={T.availability.font ?? T.headKey} cats={['serif', 'sans', 'script', 'display']} onChange={(k) => setIn('availability', { font: k })} />
                  {T.availability.font && <button type="button" className="text-xs text-ink-soft hover:text-ink" onClick={() => setIn('availability', { font: null })}>Use my site heading font</button>}
                  <SizeControl device={device} label="Heading size" unit="px" min={24} max={120} step={2} value={T.sizes.bookHeading} onChange={(d, v) => setSize('bookHeading', d, v)} />
                </Group>

                <Group title="3. Calendar" hint="colors and on/off" onOpen={() => { setShowSent(false); setTimeout(() => scrollPreview('book-cal'), 500) }}>
                  <Row label="Show the calendar"><Switch on={T.calendar.show} onChange={(v) => setIn('calendar', { show: v })} /></Row>
                  <p className="text-xs text-ink-soft">Dates and bookings always stay in sync with your app, whether the calendar is shown or not.</p>
                  {T.calendar.show && (
                    <>
                      <Row label="Sync color scheme to my app"><Switch on={T.calendar.sync} onChange={(v) => setIn('calendar', { sync: v })} /></Row>
                      <p className="text-xs text-ink-soft">
                        {T.calendar.sync ? 'The calendar uses the colors from your app calendar. Turn this off to style it separately.' : 'This calendar has its own colors. Turn sync on to match your app.'}
                      </p>
                      {!T.calendar.sync && (
                        <>
                          {calRow('Background', 'bg', T.calendar.bg)}
                          {calRow('Selected date and arrows', 'selected', T.calendar.selected)}
                          {calRow('Date numbers', 'day', T.calendar.day)}
                          {calRow('Month title', 'month', T.calendar.month)}
                          {calRow('Open date message', 'available', T.calendar.available)}
                          {calRow('Not available message', 'unavailable', T.calendar.unavailable)}
                        </>
                      )}
                    </>
                  )}
                </Group>

                <Group title="4. Form" hint="the inquiry form" onOpen={() => { setShowSent(false); setTimeout(() => scrollPreview('book-form'), 500) }}>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink">Send button wording</label>
                    <input value={S.availability?.button ?? ''} onChange={(e) => setIn('availability', { button: e.target.value })} placeholder="Send inquiry" className={inputCls} />
                  </div>
                  <p className="text-xs text-ink-soft">Requests go straight to your Camrhia inbox, with their date and message attached.</p>
                </Group>

                <Group title="5. After they send" hint="the message and the app" onOpen={() => { setShowSent(true); setTimeout(() => scrollPreview('book-sent'), 900) }}>
                  <Row label="Preview">
                    <Seg value={showSent ? 'sent' : 'form'} options={[{ v: 'form', label: 'Form' }, { v: 'sent', label: 'After sending' }]} onChange={(v) => setShowSent(v === 'sent')} />
                  </Row>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink">Thank-you message (shown on your website)</label>
                    <textarea rows={3} value={S.availability?.success ?? ''} onChange={(e) => setIn('availability', { success: e.target.value })} placeholder="Thanks! I will reach out within a day." className={inputCls} />
                  </div>
                  <Row label="Send them to the app automatically"><Switch on={T.availability.redirect} onChange={(v) => setIn('availability', { redirect: v })} /></Row>
                  <p className="text-xs text-ink-soft">After a short countdown, new visitors are taken to the Camrhia app to finish. Their message is already waiting in your inbox.</p>
                </Group>
                </>)}


              </div>

              <div id="site-preview" className="lg:sticky lg:top-6 lg:self-start">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-ink-soft">Previewing: {previewPage === 'home' ? 'Home page' : previewPage === 'galleries' ? 'Galleries page' : previewPage === 'gallery' ? 'Inside a gallery' : previewPage === 'about' ? 'About page' : 'Book page'}</span>
                  <Seg value={device} options={[{ v: 'phone', label: 'Phone' }, { v: 'desktop', label: 'Desktop' }]} onChange={setDevice} />
                </div>
                {token ? (
                  <div ref={setStageEl} className="overflow-hidden rounded-2xl border border-line bg-line/50 p-3">
                    {(() => {
                      const inner = Math.max(0, stageW - 24)
                      const phone = device === 'phone'
                      const scale = phone ? 1 : inner > 0 ? Math.min(1, inner / 1280) : 0.5
                      const w = phone ? 390 : 1280
                      const hCss = 'max(560px, calc(100vh - 14rem))'
                      return (
                        <div style={{ width: Math.min(inner || w, w * scale), height: hCss, margin: '0 auto', overflow: 'hidden', borderRadius: 12, background: '#fff' }}>
                          <iframe
                            id="site-frame"
                            key={`${previewKey}${previewPage}${showSent}`}
                            src={previewSrc()}
                            title="Website preview"
                            style={{ width: w, height: `calc(${hCss} / ${scale})`, border: 0, transform: `scale(${scale})`, transformOrigin: 'top left', background: '#fff' }}
                          />
                        </div>
                      )
                    })()}
                  </div>
                ) : (
                  <p className="rounded-2xl border border-line bg-card p-8 text-center text-sm text-ink-soft">
                    Your website link isn&apos;t set up yet. Finish setting up your portfolio in the app first.
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
