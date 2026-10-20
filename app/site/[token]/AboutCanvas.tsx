"use client"
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as RPE, ReactNode } from 'react'
import { getBoard } from '@/lib/aboutCanvas'
import type { Board, CItem, Dev } from '@/lib/aboutCanvas'

type Props = {
  canvas: any
  photo2?: string | null
  aboutPhoto?: string | null
  toUrl: (p: string | null | undefined) => string | null | undefined
  editing: boolean
  title: string | null
  bio: string
  headStyle: CSSProperties
  ink: string
  soft: string
  tint: string
  bodyFont: string
  headWeight: number | null
  defaultButton: string
  renderButton: (label: string) => ReactNode
}

type Drag = { id: string; mode: 'move' | 'size'; sx: number; sy: number; ix: number; iy: number; iw: number; ih: number; cw: number; moved: boolean }

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi))

function BoardView({ dev, className, p, sel, setSel }: { dev: Dev; className: string; p: Props; sel: string | null; setSel: (id: string | null) => void }) {
  const board = getBoard(p.canvas, dev, p.photo2)
  const [local, setLocal] = useState<Board | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef<Drag | null>(null)
  const latest = useRef<Board | null>(null)
  const sig = JSON.stringify(p.canvas ?? null)

  useEffect(() => {
    if (!drag.current) { setLocal(null); latest.current = null }
  }, [sig])

  const shown = local ?? board

  function start(e: RPE, it: CItem, mode: 'move' | 'size') {
    if (!p.editing || !ref.current) return
    e.preventDefault()
    e.stopPropagation()
    setSel(it.id)
    const box = ref.current.getBoundingClientRect()
    drag.current = { id: it.id, mode, sx: e.clientX, sy: e.clientY, ix: it.x, iy: it.y, iw: it.w, ih: it.h, cw: box.width, moved: false }
    latest.current = board
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  function move(e: RPE) {
    const d = drag.current
    if (!d) return
    const dx = ((e.clientX - d.sx) / d.cw) * 100
    const dy = ((e.clientY - d.sy) / d.cw) * 100
    if (Math.abs(dx) + Math.abs(dy) > 0.2) d.moved = true
    const base = latest.current ?? board
    const nb: Board = {
      ...base,
      items: base.items.map((it) => {
        if (it.id !== d.id) return it
        if (d.mode === 'move') return { ...it, x: clamp(d.ix + dx, 0, 100 - it.w), y: clamp(d.iy + dy, 0, base.h - it.h) }
        return { ...it, w: clamp(d.iw + dx, 4, 100 - it.x), h: clamp(d.ih + dy, 2, base.h - it.y) }
      }),
    }
    latest.current = nb
    setLocal(nb)
  }

  function end() {
    const d = drag.current
    drag.current = null
    if (!d || !d.moved || !latest.current) return
    window.parent?.postMessage({ type: 'camrhia-canvas', dev, board: latest.current }, '*')
  }

  function inner(it: CItem): ReactNode {
    if (it.type === 'photo') {
      const url = it.src === 'about' ? p.aboutPhoto : it.src ? p.toUrl(it.src) : null
      return (
        <div style={{ width: '100%', height: '100%', overflow: 'hidden', borderRadius: `${it.radius ?? 0}cqw`, background: p.tint }}>
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} />
          ) : p.editing ? (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4cqw', color: p.soft }}>Photo</div>
          ) : null}
        </div>
      )
    }
    if (it.type === 'card') {
      const fs = it.fs ?? 1.45
      const title = it.title && it.title.trim() ? it.title : p.title
      const text = it.text && it.text.trim() ? it.text : p.bio
      const solid = it.bg !== false
      return (
        <div style={{ width: '100%', height: '100%', overflow: 'hidden', boxSizing: 'border-box', background: solid ? p.tint : 'transparent', borderRadius: '2.2cqw', padding: '3cqw', boxShadow: solid ? '0 2cqw 5cqw rgba(0,0,0,0.07)' : undefined }}>
          {title && (
            <div style={{ ...p.headStyle, fontWeight: p.headWeight ?? 200, fontSize: `${fs * 3.4}cqw`, lineHeight: 1.05, marginBottom: `${fs * 1.2}cqw`, color: p.ink }}>{title}</div>
          )}
          <div style={{ fontFamily: p.bodyFont, fontWeight: 300, fontSize: `${fs}cqw`, lineHeight: 1.85, textAlign: 'justify', whiteSpace: 'pre-line', color: p.soft }}>{text}</div>
        </div>
      )
    }
    if (it.type === 'heading') {
      return (
        <div style={{ ...p.headStyle, fontWeight: p.headWeight ?? 200, fontSize: `${it.fs ?? 4.6}cqw`, lineHeight: 1.05, whiteSpace: 'pre-line', color: p.ink }}>{it.text}</div>
      )
    }
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', pointerEvents: p.editing ? 'none' : undefined }}>
        {p.renderButton(it.text && it.text.trim() ? it.text : p.defaultButton)}
      </div>
    )
  }

  return (
    <div className={className}>
      <div
        ref={ref}
        onPointerDown={(e) => { if (p.editing && e.target === e.currentTarget) setSel(null) }}
        style={{ position: 'relative', width: '100%', paddingTop: `${shown.h}%`, containerType: 'inline-size' } as CSSProperties}
      >
        {[...shown.items].sort((a, b) => a.z - b.z).map((it) => {
          const isSel = p.editing && sel === it.id
          return (
            <div
              key={it.id}
              onPointerDown={(e) => start(e, it, 'move')}
              onPointerMove={move}
              onPointerUp={end}
              onPointerCancel={end}
              style={{
                position: 'absolute', left: `${it.x}%`, top: `${(it.y / shown.h) * 100}%`, width: `${it.w}%`, height: `${(it.h / shown.h) * 100}%`,
                zIndex: it.z + 1, cursor: p.editing ? 'grab' : undefined, touchAction: p.editing ? 'none' : undefined,
                outline: isSel ? '2px solid #B08D57' : undefined, outlineOffset: 2,
              }}
            >
              {inner(it)}
              {isSel && (
                <div
                  onPointerDown={(e) => start(e, it, 'size')}
                  style={{ position: 'absolute', right: -8, bottom: -8, width: 16, height: 16, background: '#B08D57', borderRadius: 4, cursor: 'nwse-resize', touchAction: 'none' }}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function AboutCanvas(props: Props) {
  const [sel, setSel] = useState<string | null>(null)

  useEffect(() => {
    if (!props.editing) return
    function onMsg(e: MessageEvent) {
      const d = e.data as { type?: string; id?: string | null } | null
      if (d && d.type === 'camrhia-canvas-pick') setSel(d.id ?? null)
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [props.editing])

  useEffect(() => {
    if (props.editing) window.parent?.postMessage({ type: 'camrhia-canvas-select', id: sel }, '*')
  }, [sel, props.editing])

  return (
    <>
      <BoardView dev="desktop" className="hidden md:block" p={props} sel={sel} setSel={setSel} />
      <BoardView dev="phone" className="md:hidden" p={props} sel={sel} setSel={setSel} />
    </>
  )
}
