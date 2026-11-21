'use client'

import { useState, type CSSProperties } from 'react'
import { BANDS, type BandId, type HslKey } from '@/lib/hsl'
import type { Adjust } from '@/lib/enhance'

const ROWS: { k: 'h' | 's' | 'l'; label: string }[] = [
  { k: 'h', label: 'Hue' },
  { k: 's', label: 'Saturation' },
  { k: 'l', label: 'Brightness' },
]

function trackBg(ui: number): string {
  const track = 'rgba(120,113,108,0.28)'
  const fill = 'var(--color-twilight)'
  const pct = (ui + 100) / 2
  const lo = Math.min(50, pct)
  const hi = Math.max(50, pct)
  return `linear-gradient(to right, ${track} 0%, ${track} ${lo}%, ${fill} ${lo}%, ${fill} ${hi}%, ${track} ${hi}%, ${track} 100%)`
}

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
      <p className="mb-3 text-xs uppercase tracking-[0.18em] text-white/40">Color by hue <span className="normal-case tracking-normal text-white/60">· {BANDS.find((b) => b.id === band)?.label}</span></p>
      <div className="flex flex-wrap items-center gap-3">
        {BANDS.map((b) => {
          const touched = (['h', 's', 'l'] as const).some((k) => value[`${k}_${b.id}` as HslKey])
          return (
            <button
              key={b.id}
              title={b.label}
              aria-label={b.label}
              onClick={() => setBand(b.id)}
              className={`relative h-5 w-5 rounded-full transition ${band === b.id ? 'ring-2 ring-white/80 ring-offset-2 ring-offset-transparent' : 'opacity-80 hover:opacity-100'}`}
              style={{ backgroundColor: b.hex, filter: 'saturate(0.7)' }}
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
                className="dial"
                style={{ ['--dial-bg' as string]: trackBg(ui) } as CSSProperties}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
