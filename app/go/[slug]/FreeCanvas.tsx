'use client'

import { useRef } from 'react'
import { FONT_OPTIONS } from '@/lib/siteTheme'

export type FreeBox = {
  text: string
  font: string
  color: string
  size: number
  align: 'left' | 'center' | 'right'
  spacing: number
  upper: boolean
  x: number
  y: number
  w: number
  rot: number
}

export type FreeEdit = {
  selected: number | null
  onSelect: (i: number) => void
  onMove: (i: number, x: number, y: number) => void
  onWidth: (i: number, w: number) => void
}

const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n))

// A free-form area: text boxes sit at a percent position, so they land in the same
// spot on every screen. Font sizes scale with the width of the area.
export default function FreeCanvas({ boxes, edit }: { boxes: FreeBox[]; edit?: FreeEdit }) {
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef<{ i: number; sx: number; sy: number; ox: number; oy: number; ow: number; mode: 'move' | 'size'; moved: boolean } | null>(null)

  const down = (e: React.PointerEvent<HTMLElement>, i: number, mode: 'move' | 'size') => {
    if (!edit) return
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    const b = boxes[i]
    drag.current = { i, sx: e.clientX, sy: e.clientY, ox: b.x, oy: b.y, ow: b.w, mode, moved: false }
    edit.onSelect(i)
  }
  const move = (e: React.PointerEvent<HTMLElement>) => {
    const d = drag.current
    if (!d || !edit || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    const dx = ((e.clientX - d.sx) / r.width) * 100
    const dy = ((e.clientY - d.sy) / r.width) * 100
    if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 3) d.moved = true
    if (!d.moved) return
    if (d.mode === 'move') edit.onMove(d.i, clamp(d.ox + dx, -20, 100), clamp(d.oy + dy, -20, 900))
    else edit.onWidth(d.i, clamp(d.ow + dx, 5, 100))
  }
  const up = () => { setTimeout(() => { drag.current = null }, 0) }

  return (
    <div ref={ref} className="pointer-events-none absolute inset-0 z-20" style={{ containerType: 'inline-size' }}>
      <div className="relative h-full w-full">
        {boxes.map((b, i) => {
          const sel = edit?.selected === i
          if (!b.text.trim() && !edit) return null
          return (
            <div
              key={i}
              {...(edit ? { 'data-edit': 'free-' + i } : {})}
              onPointerDown={edit ? (e) => down(e, i, 'move') : undefined}
              onPointerMove={edit ? move : undefined}
              onPointerUp={edit ? up : undefined}
              onPointerCancel={edit ? up : undefined}
              onClickCapture={edit ? (e) => { if (drag.current?.moved) { e.stopPropagation(); e.preventDefault() } } : undefined}
              style={{
                position: 'absolute',
                left: b.x + '%',
                top: b.y + 'cqw',
                width: b.w + '%',
                transform: `rotate(${b.rot}deg)`,
                fontFamily: FONT_OPTIONS[b.font]?.family ?? 'sans-serif',
                color: b.color,
                fontSize: b.size / 3.9 + 'cqw',
                textAlign: b.align,
                letterSpacing: b.spacing ? b.spacing / 100 + 'em' : undefined,
                textTransform: b.upper ? 'uppercase' : undefined,
                whiteSpace: 'pre-line',
                lineHeight: 1.2,
                touchAction: edit ? 'none' : undefined,
                pointerEvents: edit ? 'auto' : 'none',
                cursor: edit ? 'move' : undefined,
                outline: sel ? '1px dashed #A9545F' : undefined,
                outlineOffset: 3,
                userSelect: 'none',
              }}
            >
              {b.text.trim() ? b.text : <span style={{ opacity: 0.4 }}>New text</span>}
              {edit && sel ? (
                <span
                  onPointerDown={(e) => down(e, i, 'size')}
                  onPointerMove={move}
                  onPointerUp={up}
                  style={{ position: 'absolute', right: -6, bottom: -6, width: 12, height: 12, borderRadius: 3, background: '#A9545F', cursor: 'ew-resize', touchAction: 'none' }}
                />
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
