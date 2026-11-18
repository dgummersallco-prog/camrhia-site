'use client'

import { useRef } from 'react'
import { FONT_OPTIONS } from '@/lib/siteTheme'
import { ICONS } from '@/lib/specialIcons'
import Editable from '@/app/components/Editable'

export type FreeBox = {
  kind: 'text' | 'icon' | 'image'
  icon: string
  src: string
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
  onText?: (key: string, v: string) => void
}

const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n))

// A free-form area: elements sit at a percent position, so they land in the same
// spot on every screen. Sizes scale with the width of the area.
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
          const text = b.kind === 'text'
          if (!edit && ((text && !b.text.trim()) || (b.kind === 'image' && !b.src))) return null
          const live = !!edit?.onText
          return (
            <div
              key={i}
              {...(edit ? { 'data-edit': 'free-' + i } : {})}
              onPointerDownCapture={edit && text ? () => edit.onSelect(i) : undefined}
              onPointerDown={edit && !text ? (e) => down(e, i, 'move') : undefined}
              onPointerMove={edit && !text ? move : undefined}
              onPointerUp={edit && !text ? up : undefined}
              onPointerCancel={edit && !text ? up : undefined}
              onClickCapture={edit && !text ? (e) => { if (drag.current?.moved) { e.stopPropagation(); e.preventDefault() } } : undefined}
              style={{
                position: 'absolute',
                left: b.x + '%',
                top: b.y + 'cqw',
                width: b.kind === 'icon' ? b.size / 3.9 + 'cqw' : b.w + '%',
                transform: `rotate(${b.rot}deg)`,
                fontFamily: FONT_OPTIONS[b.font]?.family ?? 'sans-serif',
                color: b.color,
                fontSize: b.size / 3.9 + 'cqw',
                textAlign: b.align,
                letterSpacing: b.spacing ? b.spacing / 100 + 'em' : undefined,
                textTransform: b.upper ? 'uppercase' : undefined,
                whiteSpace: 'pre-wrap',
                lineHeight: 1.2,
                touchAction: edit && !text ? 'none' : undefined,
                pointerEvents: edit ? 'auto' : 'none',
                cursor: edit ? (text ? 'text' : 'move') : undefined,
                outline: sel ? '1px dashed #A9545F' : undefined,
                outlineOffset: 3,
                userSelect: edit && !text ? 'none' : undefined,
              }}
            >
              {text ? (
                live ? (
                  <Editable tag="div" value={b.text} placeholder="New text" onChange={(v) => edit!.onText!('free-' + i, v)} style={{ outline: 'none', minHeight: '1em' }} />
                ) : (
                  b.text
                )
              ) : b.kind === 'icon' ? (
                <svg viewBox="0 0 24 24" width="100%" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                  <path d={(ICONS[b.icon] ?? ICONS.heart).d} />
                </svg>
              ) : b.src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.src} alt="" draggable={false} style={{ width: '100%', display: 'block' }} />
              ) : (
                <div style={{ aspectRatio: '4 / 3', border: '1px dashed currentColor', opacity: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>Add a picture</div>
              )}
              {edit && sel ? (
                <>
                  <span
                    title="Drag to move"
                    onPointerDown={(e) => down(e, i, 'move')}
                    onPointerMove={move}
                    onPointerUp={up}
                    style={{ position: 'absolute', left: '50%', top: -26, marginLeft: -11, width: 22, height: 22, borderRadius: 11, background: '#A9545F', color: '#fff', fontSize: 13, lineHeight: '22px', textAlign: 'center', cursor: 'move', touchAction: 'none', userSelect: 'none', fontFamily: 'sans-serif' }}
                  >✥</span>
                  {b.kind !== 'icon' ? (
                    <span
                      onPointerDown={(e) => down(e, i, 'size')}
                      onPointerMove={move}
                      onPointerUp={up}
                      style={{ position: 'absolute', right: -6, bottom: -6, width: 12, height: 12, borderRadius: 3, background: '#A9545F', cursor: 'ew-resize', touchAction: 'none' }}
                    />
                  ) : null}
                </>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
