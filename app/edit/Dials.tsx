'use client'

import { useState, type CSSProperties } from 'react'
import { TOOLS } from '@/lib/tools'
import ColorMixer from '@/app/edit/ColorMixer'
import type { Adjust } from '@/lib/enhance'

const GROUPS: { title: string; keys: string[] }[] = [
  { title: 'Light', keys: ['exposure', 'contrast', 'highlights', 'shadows', 'whites', 'blacks'] },
  { title: 'Color', keys: ['temp', 'tint', 'vibrance', 'saturation', 'fade'] },
  { title: 'Detail', keys: ['sharpen', 'noise'] },
]

const chip = (on: boolean) => `rounded-full border px-3.5 py-1 text-[11px] transition ${on ? 'border-twilight bg-white/10 text-white' : 'border-white/10 text-white/60 hover:border-white/30'}`

function trackBg(ui: number): string {
  const track = 'rgba(120,113,108,0.28)'
  const fill = 'var(--color-twilight)'
  const pct = (ui + 100) / 2
  const lo = Math.min(50, pct)
  const hi = Math.max(50, pct)
  return `linear-gradient(to right, ${track} 0%, ${track} ${lo}%, ${fill} ${lo}%, ${fill} ${hi}%, ${track} ${hi}%, ${track} 100%)`
}

export default function Dials({ value, onChange }: { value: Adjust; onChange: (a: Adjust) => void }) {
  const isBw = (value.bw ?? 0) > 0
  const [open, setOpen] = useState<Record<string, boolean>>({ Light: true, Color: true })
  const [mixOpen, setMixOpen] = useState(false)
  const [fxOpen, setFxOpen] = useState(false)

  function setTool(key: keyof Adjust, ui: number, scale: number) {
    const next: Adjust = { ...value }
    if (ui === 0) delete next[key]
    else next[key] = (ui / 100) * scale
    onChange(next)
  }

  function resetKeys(keys: string[]) {
    const next: Adjust = { ...value }
    for (const k of keys) delete next[k as keyof Adjust]
    onChange(next)
  }

  const known = new Set(GROUPS.flatMap((g) => g.keys))
  const extra = TOOLS.filter((t) => !known.has(t.key as string)).map((t) => t.key as string)
  const groups = extra.length ? [...GROUPS, { title: 'More', keys: extra }] : GROUPS

  return (
    <div className="rounded-2xl border border-white/10 bg-[#151518] p-5">
      <div className="space-y-6">
        {groups.map((g) => {
          const tools = g.keys.map((k) => TOOLS.find((t) => (t.key as string) === k)).filter((t): t is (typeof TOOLS)[number] => !!t)
          if (!tools.length) return null
          const moved = tools.some((t) => (value[t.key] ?? 0) !== 0)
          return (
            <div key={g.title}>
              <div className="flex items-center justify-between">
                <button className="flex flex-1 items-center gap-2 text-left" onClick={() => setOpen({ ...open, [g.title]: !open[g.title] })}>
                  <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/40">{g.title}</span>
                  {moved && <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-twilight)]" />}
                </button>
                {moved && open[g.title] && (
                  <button className="mr-3 text-[11px] text-white/45 transition hover:text-white/80" onClick={() => resetKeys(tools.map((t) => t.key as string))}>
                    Reset
                  </button>
                )}
                <button className="text-sm text-white/35" onClick={() => setOpen({ ...open, [g.title]: !open[g.title] })}>{open[g.title] ? '–' : '+'}</button>
              </div>
              {open[g.title] && <div className="mt-3 space-y-2.5">
                {tools.map((t) => {
                  const ui = Math.round((((value[t.key] ?? 0) as number) / t.scale) * 100)
                  return (
                    <div key={t.key as string}>
                      <div className="flex items-baseline justify-between text-[12px]">
                        <span className={ui !== 0 ? 'text-white' : 'text-white/60'} onDoubleClick={() => setTool(t.key, 0, t.scale)}>{t.label}</span>
                        <span className={`w-9 text-right tabular-nums ${ui !== 0 ? 'text-white/80' : 'text-white/30'}`}>{ui > 0 ? `+${ui}` : ui}</span>
                      </div>
                      <input
                        type="range"
                        min={-100}
                        max={100}
                        value={ui}
                        onChange={(e) => setTool(t.key, Number(e.target.value), t.scale)}
                        onDoubleClick={() => setTool(t.key, 0, t.scale)}
                        className="dial"
                        style={{ ['--dial-bg' as string]: trackBg(ui) } as CSSProperties}
                        aria-label={t.label}
                      />
                    </div>
                  )
                })}
              </div>}
            </div>
          )
        })}
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <button className={chip(isBw)} onClick={() => onChange({ ...value, bw: isBw ? 0 : 1 })}>Black &amp; White</button>
        <button className={chip(false)} onClick={() => onChange({})}>Reset all</button>
      </div>
      <div className="mt-6 border-t border-white/10 pt-4">
        <div className="flex items-center justify-between">
          <button className="flex flex-1 items-center gap-2 text-left" onClick={() => setFxOpen(!fxOpen)}>
            <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/40">Effects</span>
            {((value.vignette ?? 0) !== 0 || (value.grain ?? 0) !== 0) && <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-twilight)]" />}
          </button>
          <button className="text-sm text-white/35" onClick={() => setFxOpen(!fxOpen)}>{fxOpen ? '–' : '+'}</button>
        </div>
        {fxOpen && (
          <div className="mt-4 space-y-2.5">
            {([
              { key: 'vignette', label: 'Vignette', min: -100 },
              { key: 'grain', label: 'Film grain', min: 0 },
            ] as const).map((f) => {
              const ui = Math.round((value[f.key] ?? 0) * 100)
              return (
                <div key={f.key}>
                  <div className="flex items-baseline justify-between text-[12px]">
                    <span className={ui !== 0 ? 'text-white' : 'text-white/60'} onDoubleClick={() => { const n: Adjust = { ...value }; delete n[f.key]; onChange(n) }}>{f.label}</span>
                    <span className={`w-9 text-right tabular-nums ${ui !== 0 ? 'text-white/80' : 'text-white/30'}`}>{ui > 0 && f.min < 0 ? `+${ui}` : ui}</span>
                  </div>
                  <input
                    type="range"
                    min={f.min}
                    max={100}
                    value={ui}
                    onChange={(e) => { const v = Number(e.target.value); const n: Adjust = { ...value }; if (v === 0) delete n[f.key]; else n[f.key] = v / 100; onChange(n) }}
                    onDoubleClick={() => { const n: Adjust = { ...value }; delete n[f.key]; onChange(n) }}
                    className="dial"
                    style={{ ['--dial-bg' as string]: f.min < 0 ? trackBg(ui) : `linear-gradient(to right, var(--color-twilight) 0%, var(--color-twilight) ${ui}%, rgba(120,113,108,0.28) ${ui}%, rgba(120,113,108,0.28) 100%)` } as CSSProperties}
                    aria-label={f.label}
                  />
                </div>
              )
            })}
            <p className="text-[11px] text-white/35">Vignette: left darkens the corners, right lightens them.</p>
          </div>
        )}
      </div>
      <div className="mt-6 border-t border-white/10 pt-4">
        <div className="flex items-center justify-between">
          <button className="flex-1 text-left text-[10px] font-medium uppercase tracking-[0.22em] text-white/40" onClick={() => setMixOpen(!mixOpen)}>Color mix</button>
          <button className="text-sm text-white/35" onClick={() => setMixOpen(!mixOpen)}>{mixOpen ? '–' : '+'}</button>
        </div>
        {mixOpen && <div className="mt-4"><ColorMixer value={value} onChange={onChange} /></div>}
      </div>
    </div>
  )
}
