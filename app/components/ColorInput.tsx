'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type React from 'react'
import { HexColorPicker } from 'react-colorful'

const KEY = 'camrhia-recent-colors'
const EVT = 'camrhia-recent-colors'
const DEFAULT_SWATCHES = ['#FAF7F2', '#FFFFFF', '#2A1F24', '#111111', '#A9545F', '#B08D57', '#1F3A2E', '#2F6DB5', '#F3E3CF', '#FBEFF1']

export function normalizeHex(raw: string): string | null {
  const h = raw.replace(/[^0-9a-fA-F]/g, '')
  if (h.length === 3) return '#' + h.split('').map((c) => c + c).join('').toUpperCase()
  if (h.length === 6) return '#' + h.toUpperCase()
  return null
}

function readRecent(): string[] {
  try {
    const a = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(a) ? a.filter((x) => typeof x === 'string' && /^#[0-9A-F]{6}$/.test(x)).slice(0, 12) : []
  } catch { return [] }
}

// The last colors you used, shared by every color box on the site (kept in this browser).
export function useRecentColors() {
  const [list, setList] = useState<string[]>([])
  useEffect(() => {
    setList(readRecent())
    const f = () => setList(readRecent())
    window.addEventListener(EVT, f)
    return () => window.removeEventListener(EVT, f)
  }, [])
  const remember = useCallback((hex: string) => {
    const n = normalizeHex(hex)
    if (!n) return
    try {
      localStorage.setItem(KEY, JSON.stringify([n, ...readRecent().filter((x) => x !== n)].slice(0, 12)))
      window.dispatchEvent(new Event(EVT))
    } catch { /* storage blocked: fine */ }
  }, [])
  return { list, remember }
}

// Lets someone grab a color from anywhere on the screen (Chrome / Edge). Hidden where the browser can't do it.
export function EyeDropperButton({ onPick, lux = false }: { onPick: (hex: string) => void; lux?: boolean }) {
  const [ok, setOk] = useState(false)
  useEffect(() => { setOk(typeof window !== 'undefined' && 'EyeDropper' in window) }, [])
  if (!ok) return null
  return (
    <button
      type="button"
      title="Pick a color from the page"
      onClick={async () => {
        try {
          const ED = (window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper
          const r = await new ED().open()
          onPick(r.sRGBHex.toUpperCase())
        } catch { /* cancelled */ }
      }}
      className={'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ' + (lux ? 'border-[#E4D3B6] bg-[#FFFDF9] text-[#8C6B3F] hover:border-[#B08D57]' : 'border-line bg-white text-ink hover:border-twilight')}
    >
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 22 1-1h3l9-9" /><path d="M3 21v-3l9-9" /><path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z" /></svg>
      Pick from page
    </button>
  )
}

// A hex box you can type in. Always keeps the # and applies as soon as it is 6 digits.
function HexBox({ value, onChange, onCommit, className }: { value: string; onChange: (v: string) => void; onCommit: (v: string) => void; className: string }) {
  const shown = (value || '').toUpperCase()
  const [txt, setTxt] = useState(shown || '#')
  useEffect(() => setTxt(shown || '#'), [shown])
  const type = (raw: string) => {
    const digits = raw.replace(/[^0-9a-fA-F]/g, '').slice(0, 6).toUpperCase()
    setTxt('#' + digits)
    if (digits.length === 6) onChange('#' + digits)
  }
  const commit = () => {
    const n = normalizeHex(txt)
    if (n) { setTxt(n); onChange(n); onCommit(n) } else setTxt(shown || '#')
  }
  return (
    <input
      value={txt}
      maxLength={8}
      spellCheck={false}
      onChange={(e) => type(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); (e.target as HTMLInputElement).blur() } }}
      className={className}
    />
  )
}

const LUX_PILL: React.CSSProperties = { background: 'linear-gradient(135deg,#FFFDF9 0%,#F8F0E3 100%)', border: '1px solid #E4D3B6', boxShadow: 'inset 0 0 0 3px #FFFDF9, inset 0 0 0 4px #EBDDC3' }
const LUX_CARD: React.CSSProperties = { background: 'linear-gradient(135deg,#FFFDF9 0%,#F8F0E3 100%)', border: '1px solid #E4D3B6', boxShadow: 'inset 0 0 0 4px #FFFDF9, inset 0 0 0 5px #EBDDC3, 0 18px 50px rgba(60,40,20,0.22)' }

export default function ColorInput({ label, value, onChange, swatches = DEFAULT_SWATCHES, float = false, lux = false }: { lux?: boolean; label: string; value: string; onChange: (v: string) => void; swatches?: string[]; float?: boolean }) {
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const valRef = useRef(value)
  valRef.current = value
  const { list, remember } = useRecentColors()
  const shown = (value || '').toUpperCase()
  useEffect(() => {
    if (!open) return
    const down = (e: PointerEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false) }
    const away = () => setOpen(false)
    document.addEventListener('pointerdown', down)
    window.addEventListener('blur', away)
    return () => { document.removeEventListener('pointerdown', down); window.removeEventListener('blur', away) }
  }, [open])

  const pick = (c: string) => { onChange(c); remember(c) }
  // Recent colors first, then the usual swatches, no repeats.
  const circles = Array.from(new Set([...list, ...swatches.map((s) => s.toUpperCase())]))

  return (
    <div ref={boxRef} className={float ? 'relative' : undefined}>
      <span className={lux ? 'block text-[11px] font-medium uppercase leading-4 tracking-[0.18em] text-[#8C6B3F]' : 'text-sm font-medium text-ink'}>{label}</span>
      <div style={lux ? LUX_PILL : undefined} className={lux ? 'mt-1 flex h-[41px] w-full items-center gap-2 rounded-xl px-3.5' : 'mt-1 flex w-full items-center gap-2 rounded-xl border border-line bg-card px-3 py-2'}>
        <button type="button" onClick={() => setOpen(!open)} aria-label="Open color picker" className={'h-5 w-5 shrink-0 rounded ' + (lux ? 'border border-[#D9C6A3]' : 'border border-line')} style={{ background: value || 'transparent' }} />
        <HexBox value={value} onChange={onChange} onCommit={remember} className={'min-w-0 flex-1 bg-transparent text-sm uppercase tracking-wide outline-none ' + (lux ? '[font-family:ui-sans-serif,system-ui,sans-serif] tabular-nums text-[#3a2d22]' : 'text-ink')} />
        <button type="button" onClick={() => setOpen(!open)} aria-label="Toggle color picker" className={'px-1 ' + (lux ? 'text-[#8C6B3F]' : 'text-ink-soft')}>{open ? '▴' : '▾'}</button>
      </div>
      {open && (
        <div style={lux ? LUX_CARD : undefined} className={'mt-2 p-3 ' + (lux ? 'rounded-2xl' : 'rounded-xl border border-line bg-card') + (float ? (lux ? ' absolute left-0 top-full z-40 w-64' : ' absolute left-0 top-full z-40 w-64 shadow-xl') : '')}>
          <div className="mb-3 flex flex-wrap gap-2">
            {circles.map((h) => (
              <button key={h} type="button" title={h} onClick={() => pick(h)} className={'h-7 w-7 rounded-full border ' + (lux ? 'border-[#D9C6A3]' : 'border-line')} style={{ background: h, boxShadow: shown === h ? (lux ? '0 0 0 2px #FFFDF9, 0 0 0 3.5px #B08D57' : '0 0 0 2px #fff, 0 0 0 4px #2A1F24') : undefined }} />
            ))}
          </div>
          <div onPointerUp={() => remember(valRef.current)}>
            <HexColorPicker color={value || '#FFFFFF'} onChange={onChange} style={{ width: '100%', height: 160 }} />
          </div>
          <HexBox value={value} onChange={onChange} onCommit={remember} className={'mt-3 w-full rounded-lg border px-3 py-2 text-sm uppercase tracking-wide outline-none ' + (lux ? 'border-[#E4D3B6] bg-[#FFFDF9] font-fraunces text-[#3a2d22] focus:border-[#B08D57]' : 'border-line bg-paper text-ink focus:border-twilight')} />
          <div className="mt-3 flex items-center justify-between gap-2">
            <EyeDropperButton onPick={pick} lux={lux} />
            <button type="button" onClick={() => { remember(valRef.current); setOpen(false) }} className={'text-xs font-medium ' + (lux ? 'uppercase tracking-[0.18em] text-[#8C6B3F]' : 'text-twilight')}>Done</button>
          </div>
        </div>
      )}
    </div>
  )
}
