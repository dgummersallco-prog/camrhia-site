'use client'

import { useRef, useState } from 'react'
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
  const els = useRef<(HTMLDivElement | null)[]>([])
  const [guides, setGuides] = useState<{ v: number[]; h: number[] }>({ v: [], h: [] })
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
    if (d.mode === 'size') { edit.onWidth(d.i, clamp(d.ow + dx, 5, 100)); return }
    let nx = clamp(d.ox + dx, -20, 100)
    let ny = clamp(d.oy + dy, -20, 900)
    const g: { v: number[]; h: number[] } = { v: [], h: [] }
    const me = els.current[d.i]
    if (me && !e.altKey) {
      // Lines show (and the element snaps) when it lines up with the page center or another element.
      const pct = (r0: DOMRect) => ({ l: ((r0.left - r.left) / r.width) * 100, t: ((r0.top - r.top) / r.width) * 100, w: (r0.width / r.width) * 100, h: (r0.height / r.width) * 100 })
      const m = pct(me.getBoundingClientRect())
      const offX = m.l - boxes[d.i].x
      const offY = m.t - boxes[d.i].y
      const tx: number[] = [50]
      const ty: number[] = []
      els.current.forEach((el, j) => {
        if (!el || j === d.i) return
        const o = pct(el.getBoundingClientRect())
        tx.push(o.l, o.l + o.w / 2, o.l + o.w)
        ty.push(o.t, o.t + o.h / 2, o.t + o.h)
      })
      const near = (feats: number[], targets: number[]) => {
        let best: { diff: number; at: number } | null = null
        for (const f of feats) for (const t of targets) {
          const diff = t - f
          if (Math.abs(diff) <= 1.2 && (!best || Math.abs(diff) < Math.abs(best.diff))) best = { diff, at: t }
        }
        return best
      }
      const bx = near([nx + offX, nx + offX + m.w / 2, nx + offX + m.w], tx)
      if (bx) { nx += bx.diff; g.v.push(bx.at) }
      const by = near([ny + offY, ny + offY + m.h / 2, ny + offY + m.h], ty)
      if (by) { ny += by.diff; g.h.push(by.at) }
    }
    setGuides(g)
    edit.onMove(d.i, nx, ny)
  }
  const up = () => { setGuides({ v: [], h: [] }); setTimeout(() => { drag.current = null }, 0) }

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
              ref={(el) => { els.current[i] = el }}
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
        {guides.v.map((x) => (
          <div key={'v' + x} style={{ position: 'absolute', left: x + '%', top: 0, bottom: 0, width: 1, background: '#E0457B', opacity: 0.8, pointerEvents: 'none' }} />
        ))}
        {guides.h.map((y) => (
          <div key={'h' + y} style={{ position: 'absolute', top: y + 'cqw', left: 0, right: 0, height: 1, background: '#E0457B', opacity: 0.8, pointerEvents: 'none' }} />
        ))}
      </div>
    </div>
  )
}
