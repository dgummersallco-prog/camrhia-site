'use client'

import React, { useState } from 'react'

export type Crop = { x: number; y: number; z: number }

export function AboutCropper({ src, aspect, crop, onChange }: { src: string; aspect: number; crop: Crop; onChange: (c: Crop) => void }) {
  const [live, setLive] = useState<Crop | null>(null)
  const drag = React.useRef<{ sx: number; sy: number; cx: number; cy: number; w: number; h: number } | null>(null)
  const v = live ?? crop
  const clamp = (n: number) => Math.min(100, Math.max(0, n))
  const commit = () => {
    if (live) { onChange(live); setLive(null) }
  }
  return (
    <div>
      <div
        className="relative w-full select-none overflow-hidden rounded-lg border border-line"
        style={{ aspectRatio: String(aspect), maxWidth: aspect < 1 ? 280 : '100%', touchAction: 'none', cursor: 'grab' }}
        onPointerDown={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          drag.current = { sx: e.clientX, sy: e.clientY, cx: v.x, cy: v.y, w: r.width, h: r.height }
          e.currentTarget.setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          const d = drag.current
          if (!d) return
          setLive({ ...v, x: clamp(d.cx - ((e.clientX - d.sx) / d.w) * 120), y: clamp(d.cy - ((e.clientY - d.sy) / d.h) * 120) })
        }}
        onPointerUp={() => { drag.current = null; commit() }}
        onPointerCancel={() => { drag.current = null; commit() }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          draggable={false}
          className="h-full w-full object-cover"
          style={{ objectPosition: `${v.x}% ${v.y}%`, transformOrigin: `${v.x}% ${v.y}%`, transform: v.z !== 1 ? `scale(${v.z})` : undefined, pointerEvents: 'none' }}
        />
      </div>
      <div className="mt-3 flex items-center gap-3" style={{ maxWidth: aspect < 1 ? 280 : '100%' }}>
        <span className="text-xs text-ink-soft">Zoom</span>
        <input
          type="range" min={1} max={3} step={0.05} value={v.z}
          onChange={(e) => setLive({ ...v, z: Number(e.target.value) })}
          onPointerUp={commit} onTouchEnd={commit} onKeyUp={commit}
          className="flex-1"
        />
      </div>
    </div>
  )
}
