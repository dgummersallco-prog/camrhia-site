'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
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

export default function ColorInput({ label, value, onChange, swatches = DEFAULT_SWATCHES }: { label: string; value: string; onChange: (v: string) => void; swatches?: string[] }) {
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const valRef = useRef(value)
  valRef.current = value
  const { list, remember } = useRecentColors()
  const shown = (value || '').toUpperCase()
  useEffect(() => {
    if (!open) return
    const down = (e: PointerEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', down)
    return () => document.removeEventListener('pointerdown', down)
  }, [open])

  const pick = (c: string) => { onChange(c); remember(c) }
  // Recent colors first, then the usual swatches, no repeats.
  const circles = Array.from(new Set([...list, ...swatches.map((s) => s.toUpperCase())]))

  return (
    <div ref={boxRef}>
      <span className="text-sm font-medium text-ink">{label}</span>
      <div className="mt-1 flex w-full items-center gap-2 rounded-xl border border-line bg-card px-3 py-2">
        <button type="button" onClick={() => setOpen(!open)} aria-label="Open color picker" className="h-5 w-5 shrink-0 rounded border border-line" style={{ background: value || 'transparent' }} />
        <HexBox value={value} onChange={onChange} onCommit={remember} className="min-w-0 flex-1 bg-transparent font-mono text-xs uppercase text-ink outline-none" />
        <button type="button" onClick={() => setOpen(!open)} aria-label="Toggle color picker" className="px-1 text-ink-soft">{open ? '▴' : '▾'}</button>
      </div>
      {open && (
        <div className="mt-2 rounded-xl border border-line bg-card p-3">
          <div className="mb-3 flex flex-wrap gap-2">
            {circles.map((h) => (
              <button key={h} type="button" title={h} onClick={() => pick(h)} className="h-7 w-7 rounded-full border border-line" style={{ background: h, boxShadow: shown === h ? '0 0 0 2px #fff, 0 0 0 4px #2A1F24' : undefined }} />
            ))}
          </div>
          <div onPointerUp={() => remember(valRef.current)}>
            <HexColorPicker color={value || '#FFFFFF'} onChange={onChange} style={{ width: '100%', height: 160 }} />
          </div>
          <HexBox value={value} onChange={onChange} onCommit={remember} className="mt-3 w-full rounded-lg border border-line bg-paper px-3 py-2 font-mono text-sm uppercase text-ink outline-none focus:border-twilight" />
          <button type="button" onClick={() => { remember(valRef.current); setOpen(false) }} className="mt-2 text-xs font-medium text-twilight">Done</button>
        </div>
      )}
    </div>
  )
}
