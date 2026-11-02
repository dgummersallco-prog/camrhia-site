'use client'

import { useState } from 'react'
import { BANDS, type BandId, type HslKey } from '@/lib/hsl'
import type { Adjust } from '@/lib/enhance'

const ROWS: { k: 'h' | 's' | 'l'; label: string }[] = [
  { k: 'h', label: 'Hue' },
  { k: 's', label: 'Saturation' },
  { k: 'l', label: 'Brightness' },
]

export default function ColorMixer({ value, onChange }: { value: Adjust; onChange: (a: Adjust) => void }) {
  const [band, setBand] = useState<BandId>('red')

  function set(k: HslKey, ui: number) {
    const next: Adjust = { ...value }
    if (ui === 0) delete next[k]
    else next[k] = ui / 100
    onChange(next)
  }

  return (
    <div>
      <p className="mb-3 text-xs uppercase tracking-[0.18em] text-white/40">Color by hue</p>
      <div className="flex flex-wrap gap-2">
        {BANDS.map((b) => {
          const touched = (['h', 's', 'l'] as const).some((k) => value[`${k}_${b.id}` as HslKey])
          return (
            <button
              key={b.id}
              title={b.label}
              aria-label={b.label}
              onClick={() => setBand(b.id)}
              className={`relative h-7 w-7 rounded-full border-2 ${band === b.id ? 'border-white' : 'border-transparent'}`}
              style={{ backgroundColor: b.hex }}
            >
              {touched && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-white ring-1 ring-black/50" />}
            </button>
          )
        })}
      </div>
      <div className="mt-4 space-y-3">
        {ROWS.map((r) => {
          const key = `${r.k}_${band}` as HslKey
          const ui = Math.round((value[key] ?? 0) * 100)
          return (
            <div key={r.k}>
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/75">{r.label}</span>
                <span className="text-white/45">{ui > 0 ? `+${ui}` : ui}</span>
              </div>
              <input
                type="range"
                min={-100}
                max={100}
                value={ui}
                onChange={(e) => set(key, Number(e.target.value))}
                onDoubleClick={() => set(key, 0)}
                className="mt-1 w-full accent-[var(--color-twilight)]"
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
