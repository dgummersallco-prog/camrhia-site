'use client'

import { TOOLS } from '@/lib/tools'
import type { Adjust } from '@/lib/enhance'

const chip = (on: boolean) => `rounded-full border px-4 py-1.5 text-xs transition ${on ? 'border-twilight bg-white/10 text-white' : 'border-white/10 text-white/60 hover:border-white/30'}`

export default function Dials({ value, onChange }: { value: Adjust; onChange: (a: Adjust) => void }) {
  const isBw = (value.bw ?? 0) > 0

  function setTool(key: keyof Adjust, ui: number, scale: number) {
    const next: Adjust = { ...value }
    if (ui === 0) delete next[key]
    else next[key] = (ui / 100) * scale
    onChange(next)
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#151518] p-4">
      <div className="space-y-4">
        {TOOLS.map((t) => {
          const ui = Math.round((((value[t.key] ?? 0) as number) / t.scale) * 100)
          return (
            <div key={t.key}>
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/75">{t.label}</span>
                <span className="text-white/45">{ui > 0 ? `+${ui}` : ui}</span>
              </div>
              <input
                type="range"
                min={-100}
                max={100}
                value={ui}
                onChange={(e) => setTool(t.key, Number(e.target.value), t.scale)}
                onDoubleClick={() => setTool(t.key, 0, t.scale)}
                className="mt-1 w-full accent-[var(--color-twilight)]"
              />
            </div>
          )
        })}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button className={chip(isBw)} onClick={() => onChange({ ...value, bw: isBw ? 0 : 1 })}>Black &amp; White</button>
        <button className={chip(false)} onClick={() => onChange({})}>Reset dials</button>
      </div>
    </div>
  )
}
