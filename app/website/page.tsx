'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { makeVersions } from '@/lib/galleryImages'
import { DashboardHeader } from '@/app/components/DashboardHeader'
import { FONT_OPTIONS, PAIR_PRESETS, NAV_DEFAULTS, DEFAULT_TITLES, resolveTheme } from '@/lib/siteTheme'

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
const MENU_KEYS = ['home', 'about', 'portfolio', 'investment', 'contact']

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
`

function Group({ title, hint, open, onOpen, children }: { title: string; hint?: string; open?: boolean; onOpen?: () => void; children: React.ReactNode }) {
  return (
    <details open={open} onToggle={(e) => { if ((e.currentTarget as HTMLDetailsElement).open) onOpen?.() }} className="rounded-2xl border border-line bg-card p-5">
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
      <span className="text-sm text-ink">{label}</span>
      {children}
    </div>
  )
}
function Seg<V extends string>({ value, options, onChange }: { value: V; options: { v: V; label: string }[]; onChange: (v: V) => void }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-full border border-line bg-paper p-1">
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
  return (
    <span className="inline-flex shrink-0 items-center gap-1">
      <input type="number" value={txt} min={min} max={max} step={step}
        onFocus={() => setFocus(true)}
        onChange={(e) => {
          setTxt(e.target.value)
          const n = Number(e.target.value)
          if (e.target.value !== '' && Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)))
        }}
        onBlur={() => { setFocus(false); const n = Number(txt); if (txt === '' || !Number.isFinite(n)) setTxt(String(value)) }}
        className="w-16 rounded-lg border border-line bg-white px-2 py-1 text-right text-sm text-ink" />
      <span className="w-5 text-xs text-ink-soft">{unit}</span>
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
  const [txt, setTxt] = useState(value)
  useEffect(() => { setTxt(value) }, [value])
  const ok = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v)
  return (
    <div className="relative">
      <Row label={label}>
        <button type="button" onClick={() => setOpen(!open)} className="flex items-center gap-2 rounded-lg border border-line bg-white px-2 py-1.5">
          <span className="h-5 w-5 rounded border border-line" style={{ background: value }} />
          <span className="font-mono text-xs uppercase text-ink">{value}</span>
        </button>
      </Row>
      {open && (
        <>
          <button type="button" aria-label="Close" className="fixed inset-0 z-30 cursor-default" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-2 w-72 rounded-2xl border border-line bg-card p-4 shadow-lg">
            <p className="mb-2 text-[11px] uppercase tracking-widest text-ink-soft">Your colors</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {swatches.map((sw) => (
                <button key={sw.name + sw.hex} type="button" title={sw.name} onClick={() => onChange(sw.hex)} className="h-8 w-8 rounded-full border border-line"
                  style={{ background: sw.hex, boxShadow: value.toLowerCase() === sw.hex.toLowerCase() ? '0 0 0 2px #fff, 0 0 0 4px #2A1F24' : undefined }} />
              ))}
            </div>
            <p className="mb-2 text-[11px] uppercase tracking-widest text-ink-soft">Pick any color</p>
            <div className="flex items-center gap-2">
              <input type="color" value={ok(value) ? value : '#FFFFFF'} onChange={(e) => onChange(e.target.value)} className="h-10 w-12 cursor-pointer rounded border border-line bg-transparent" />
              <input value={txt} maxLength={7} placeholder="#A9545F" className={inputCls + ' font-mono uppercase'}
                onChange={(e) => { let v = e.target.value.trim(); setTxt(v); if (v && !v.startsWith('#')) v = '#' + v; if (ok(v)) onChange(v) }} />
            </div>
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
  const [cat, setCat] = useState('all')
  const list = Object.entries(FONT_OPTIONS).filter(([, f]) => cats.includes(f.cat) && (cat === 'all' || f.cat === cat))
  const cur = FONT_OPTIONS[value]
  return (
    <div className="relative">
      <Row label={label}>
        <button type="button" onClick={() => setOpen(!open)} className="rounded-lg border border-line bg-white px-3 py-1.5 text-base text-ink" style={{ fontFamily: cur?.family }}>
          {cur?.label ?? 'Choose'} ▾
        </button>
      </Row>
      {open && (
        <>
          <button type="button" aria-label="Close" className="fixed inset-0 z-30 cursor-default" onClick={() => setOpen(false)} />
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
  const [previewPage, setPreviewPage] = useState<'home' | 'gallery' | 'availability'>('home')
  const [tab, setTab] = useState<'home' | 'galleries' | 'book'>('home')
  const [firstGid, setFirstGid] = useState<string | null>(null)
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

  function moveSection(k: string, dir: -1 | 1) {
    if (!T) return
    const order = [...T.order]
    const i = order.indexOf(k)
    const j = i + dir
    if (i < 0 || j < 0 || j >= order.length) return
    const tmp = order[i]; order[i] = order[j]; order[j] = tmp
    upd((s) => { s.order = order })
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
    if (form?.site_accent && /^#[0-9a-fA-F]{6}$/.test(form.site_accent)) out.push({ name: 'Site accent', hex: form.site_accent })
    for (const c of SWATCHES) out.push({ name: 'Suggested', hex: c })
    out.push({ name: 'White', hex: '#FFFFFF' }, { name: 'Cream', hex: '#FAF7F2' }, { name: 'Warm paper', hex: '#F0EAE1' }, { name: 'Ink', hex: '#2A1F24' }, { name: 'Black', hex: '#000000' })
    return out
  }
  function pickTab(t: 'home' | 'galleries' | 'book') {
    setTab(t)
    setPreviewPage(t === 'galleries' ? 'gallery' : t === 'book' ? 'availability' : 'home')
  }
  function scrollPreview(id: string) {
    const send = () => (document.getElementById('site-frame') as HTMLIFrameElement | null)?.contentWindow?.postMessage({ type: 'camrhia-scroll', id }, '*')
    if (previewPage !== 'home') { setPreviewPage('home'); setTimeout(send, 900) } else send()
  }
  function sectionHead(k: string, toggle = true) {
    const idx = T ? T.order.indexOf(k) : -1
    const total = T ? T.order.length : 6
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
          <label className="mb-1 block text-xs font-medium text-ink">Section heading</label>
          <input value={S.titles?.[k] ?? ''} onChange={(e) => setIn('titles', { [k]: e.target.value })} placeholder={DEFAULT_TITLES[k]} className={inputCls} />
        </div>
      </>
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
  const path = form?.slug ? `/${form.slug}/site` : token ? `/site/${token}` : null
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

            <div className="grid gap-8 lg:grid-cols-[minmax(0,480px)_1fr]">
              <div className="space-y-4">
                <div>
                  <div className="flex flex-wrap gap-x-7 border-b border-line">
                    {([{ v: 'home', label: 'Home page' }, { v: 'galleries', label: 'Galleries page' }, { v: 'book', label: 'Book info page' }] as const).map((o) => (
                      <button key={o.v} type="button" onClick={() => pickTab(o.v)}
                        className={`-mb-px border-b-2 pb-3 font-fraunces text-lg transition ${tab === o.v ? 'border-ink text-ink' : 'border-transparent text-ink-soft hover:text-ink'}`}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-ink-soft">
                    {tab === 'home' ? 'Everything on your main page, top to bottom.' : tab === 'galleries' ? 'The page visitors see after clicking a gallery cover.' : 'Where every button leads: the date check and inquiry form.'}
                  </p>
                </div>
                {tab === 'home' && (<><Group title="1. Template" hint="pick a look" open>
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
<Group title="2. Menu" hint="last, trim it down">
                  <Row label="Menu bar">
                    <Seg value={T.menu.solid ? 'solid' : 'auto'} options={[{ v: 'auto', label: 'Match template' }, { v: 'solid', label: 'Solid bar' }]} onChange={(v) => setIn('menu', { style: v })} />
                  </Row>
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
                </Group>
<Group title="3. Color & fonts" hint="used on every page">
                  
                  {colorRow('Background', 'bg', T.bg)}
                  {colorRow('Text', 'text', T.ink)}
                  {colorRow('Alternating section tint', 'tint', T.tint)}
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
                  <FontPicker label="Body font" value={T.bodyKey} cats={['serif', 'sans']} onChange={(k) => setIn('fonts', { body: k })} />
                </Group>
<Group title="4. Buttons" hint="wording, color, size, shape">
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
<Group title="5. Hero" hint="photos, logo and headline">
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
                  <Row label="Show button in hero"><Switch on={T.hero.ctaShow} onChange={(v) => setHero({ cta_show: v })} /></Row>
                  
                </Group>
<Group title="6. Galleries" hint="cover photos and titles" onOpen={() => scrollPreview('portfolio')}>
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
                  
</Group>
<Group title="7. Pricing" hint="packages and price list style" onOpen={() => scrollPreview('investment')}>
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

                  
</Group>
<Group title="8. Testimonials" hint="kind words with pictures" onOpen={() => scrollPreview('words')}>
                  {sectionHead('testimonials')}
<div>
                    <p className="mb-2 text-sm text-ink">Layout</p>
                    <LayoutPicker value={T.testi.layout} onChange={(v) => setIn('testimonials', { layout: v })}
                      options={[{ v: 'grid', name: 'Grid', thumb: THUMBS.teGrid }, { v: 'stacked', name: 'Stacked', thumb: THUMBS.teStacked }, { v: 'cards', name: 'Cards', thumb: THUMBS.teCards }]} />
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

                  
</Group>
<Group title="9. About" hint="your story" onOpen={() => scrollPreview('about')}>
                  {sectionHead('about')}
                  <div>
                    <p className="mb-2 text-sm text-ink">Layout</p>
                    <LayoutPicker value={T.about.layout} onChange={(v) => setIn('about', { layout: v })}
                      options={[{ v: 'left', name: 'Photo left', thumb: THUMBS.abLeft }, { v: 'right', name: 'Photo right', thumb: THUMBS.abRight }, { v: 'stacked', name: 'Stacked', thumb: THUMBS.abStack }]} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink">About text</label>
                    <textarea rows={4} value={S.text?.about ?? ''} onChange={(e) => setIn('text', { about: e.target.value })} placeholder="Leave empty to use your bio from the app" className={inputCls} />
                  </div>
                  <Link href="/portfolio" className={btnGhost + ' inline-block'}>Change your photo or bio in the app profile</Link>
                </Group>
<Group title="10. FAQ" hint="common questions" onOpen={() => scrollPreview('faq')}>
                  {sectionHead('faq')}
                  <p className="text-sm text-ink-soft">Your questions and answers are shared with your app profile.</p>
                  <Link href="/portfolio" className={btnGhost + ' inline-block'}>Edit your FAQ</Link>
                </Group>
<Group title="11. Contact" hint="the message above your button" onOpen={() => scrollPreview('contact')}>
                  {sectionHead('contact', false)}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink">Contact message</label>
                    <textarea rows={3} value={S.text?.contact ?? ''} onChange={(e) => setIn('text', { contact: e.target.value })} placeholder="Tell me about your day. Check a date and send me a message." className={inputCls} />
                  </div>
                </Group>
<Group title="12. Footer" hint="the line at the bottom">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink">Footer line</label>
                    <input value={S.text?.footer ?? ''} onChange={(e) => setIn('text', { footer: e.target.value })} placeholder="e.g. Serving Boise, Sun Valley and beyond" className={inputCls} />
                  </div>
                </Group>
<Group title="13. Layout & sizes" hint="phone and desktop">
                  
                  
                  <p className="text-xs text-ink-soft">Sizes follow the Phone / Desktop switch above the preview. You can also type an exact number.</p>
                  <SizeControl device={device} label="Text size" unit="%" min={80} max={130} step={5} value={T.sizes.text} onChange={(d, v) => setSize('text', d, v)} />
                  
                  
                  <SizeControl device={device} label="Space between sections" unit="px" min={16} max={220} step={4} value={T.sizes.sectionSpace} onChange={(d, v) => setSize('sectionSpace', d, v)} />
                  <SizeControl device={device} label="Space between gallery covers" unit="px" min={0} max={60} step={2} value={T.sizes.photoGap} onChange={(d, v) => setSize('photoGap', d, v)} />
                </Group></>)}
{tab === 'galleries' && (<><Group open title="1. Gallery page" hint="what visitors see after clicking a cover">
                  {!firstGid && <p className="text-sm text-ink-soft">Add a gallery with photos first and it will show in the preview.</p>}
                  <Link href="/website/galleries" className={btn + ' inline-block'}>Manage galleries &amp; photos</Link>
                  <div>
                    <p className="mb-2 text-sm text-ink">Photo layout</p>
                    <LayoutPicker value={T.galpage.layout} onChange={(v) => setIn('galpage', { layout: v })}
                      options={[{ v: 'masonry', name: 'Masonry', thumb: THUMBS.phMasonry }, { v: 'grid', name: 'Even grid', thumb: THUMBS.phGrid }, { v: 'single', name: 'Single column', thumb: THUMBS.phSingle }]} />
                  </div>
                  <Row label="Show photo count"><Switch on={T.galpage.showCount} onChange={(v) => setIn('galpage', { show_count: v })} /></Row>
                  <Row label="Show other galleries at the bottom"><Switch on={T.galpage.showMore} onChange={(v) => setIn('galpage', { show_more: v })} /></Row>
                  <Row label="Show the book button at the bottom"><Switch on={T.galpage.showButton} onChange={(v) => setIn('galpage', { show_button: v })} /></Row>
                </Group>
                <Group title="2. Gallery page sizes" hint="phone and desktop">
                  <p className="text-xs text-ink-soft">Sizes follow the Phone / Desktop switch above the preview. You can also type an exact number.</p>
                  <SizeControl device={device} label="Heading size" unit="px" min={24} max={120} step={2} value={T.sizes.galHeading} onChange={(d, v) => setSize('galHeading', d, v)} />
                  <SizeControl device={device} label="Space between photos" unit="px" min={0} max={60} step={2} value={T.sizes.galGap} onChange={(d, v) => setSize('galGap', d, v)} />
                </Group></>)}
{tab === 'book' && (<><Group open title="1. Check availability screen" hint="where every button leads">
                  <div>
                    <p className="mb-2 text-sm text-ink">Layout</p>
                    <LayoutPicker value={T.availability.layout} onChange={(v) => setIn('availability', { layout: v })}
                      options={[{ v: 'centered', name: 'Centered', thumb: THUMBS.bkCentered }, { v: 'side', name: 'Photo beside', thumb: THUMBS.bkSide }, { v: 'banner', name: 'Photo banner', thumb: THUMBS.bkBanner }]} />
                  </div>
                  <SizeControl device={device} label="Heading size" unit="px" min={24} max={120} step={2} value={T.sizes.bookHeading} onChange={(d, v) => setSize('bookHeading', d, v)} />
                  <p className="text-sm text-ink-soft">Every button on your website opens this screen: a date check, then a short form. Requests land in your Camrhia inbox.</p>
                  
                  
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink">Heading</label>
                    <input value={S.availability?.title ?? ''} onChange={(e) => setIn('availability', { title: e.target.value })} placeholder="Check availability" className={inputCls} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink">Intro</label>
                    <textarea rows={2} value={S.availability?.intro ?? ''} onChange={(e) => setIn('availability', { intro: e.target.value })} placeholder="Pick a date to see if I am free, then tell me a little about your day." className={inputCls} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink">Send button wording</label>
                    <input value={S.availability?.button ?? ''} onChange={(e) => setIn('availability', { button: e.target.value })} placeholder="Send inquiry" className={inputCls} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink">Thank-you message</label>
                    <textarea rows={2} value={S.availability?.success ?? ''} onChange={(e) => setIn('availability', { success: e.target.value })} placeholder="Thanks! I will reach out within a day." className={inputCls} />
                  </div>
                  
                </Group></>)}


                {fullUrl && (
                  <section className={card}>
                    <h2 className="mb-1 font-fraunces text-lg font-semibold text-ink">Your link</h2>
                    <p className="mb-3 break-all text-sm text-ink-soft">{fullUrl.replace('https://', '')}</p>
                    <button className={btnGhost} onClick={() => { navigator.clipboard?.writeText(fullUrl); flash('Link copied') }}>Copy link</button>
                  </section>
                )}
              </div>

              <div id="site-preview" className="lg:sticky lg:top-6 lg:self-start">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-ink-soft">Previewing: {previewPage === 'home' ? 'Home page' : previewPage === 'gallery' ? 'Galleries page' : 'Book info page'}</span>
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
                            key={previewKey + previewPage}
                            src={previewPage === 'availability' ? `/site/${token}/availability?preview=1` : previewPage === 'gallery' && firstGid ? `/site/${token}/g/${firstGid}?preview=1` : `/site/${token}?preview=1`}
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
