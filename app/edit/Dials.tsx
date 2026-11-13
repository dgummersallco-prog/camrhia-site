'use client'

import type { CSSProperties } from 'react'
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
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/40">{g.title}</p>
                {moved && (
                  <button className="text-[11px] text-white/45 transition hover:text-white/80" onClick={() => resetKeys(tools.map((t) => t.key as string))}>
                    Reset
                  </button>
                )}
              </div>
              <div className="space-y-2.5">
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
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <button className={chip(isBw)} onClick={() => onChange({ ...value, bw: isBw ? 0 : 1 })}>Black &amp; White</button>
        <button className={chip(false)} onClick={() => onChange({})}>Reset all</button>
      </div>
      <div className="mt-6 border-t border-white/10 pt-5"><ColorMixer value={value} onChange={onChange} /></div>
    </div>
  )
}
