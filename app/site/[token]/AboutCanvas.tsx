"use client"
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as RPE, ReactNode } from 'react'
import { getBoard, hasBoard } from '@/lib/aboutCanvas'
import type { Board, CItem, CType, Dev } from '@/lib/aboutCanvas'

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
  boardId?: string
  galleries?: { id: string; title: string; coverUrl?: string | null }[]
  galleryHref?: (id: string) => string
  fallback?: (dev: Dev) => Board
  renderSpecial?: (type: CType, it: CItem, dev: Dev) => ReactNode
  renderButton: (label: string) => ReactNode
}

type Drag = { id: string; mode: 'move' | 'size'; sx: number; sy: number; ix: number; iy: number; iw: number; ih: number; cw: number; moved: boolean }

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi))

function BoardView({ dev, className, p, sel, setSel }: { dev: Dev; className: string; p: Props; sel: string | null; setSel: (id: string | null) => void }) {
  const board = p.fallback && !hasBoard(p.canvas, dev) ? p.fallback(dev) : getBoard(p.canvas, dev, p.photo2, (p.boardId ?? 'about') !== 'about')
  const [local, setLocal] = useState<Board | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef<Drag | null>(null)
  const latest = useRef<Board | null>(null)
  const [guides, setGuides] = useState<{ x: number | null; y: number | null }>({ x: null, y: null })
  const sig = JSON.stringify(p.canvas ?? null)

  useEffect(() => {
    if (!drag.current) { setLocal(null); latest.current = null }
  }, [sig])

  const shown = local ?? board

  useEffect(() => {
    if (!p.editing || !sel) return
    const onKey = (e: KeyboardEvent) => {
      const tg = e.target as HTMLElement | null
      if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.isContentEditable)) return
      if (!ref.current || ref.current.offsetParent === null) return
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); removeItem(sel) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

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

  function snapTo(vals: number[], targets: number[]) {
    let best = 1.2
    let delta = 0
    let hit: number | null = null
    for (const v of vals) for (const t of targets) {
      const df = t - v
      if (Math.abs(df) <= best) { best = Math.abs(df); delta = df; hit = t }
    }
    return { delta, hit }
  }

  function move(e: RPE) {
    const d = drag.current
    if (!d) return
    const dx = ((e.clientX - d.sx) / d.cw) * 100
    const dy = ((e.clientY - d.sy) / d.cw) * 100
    if (Math.abs(dx) + Math.abs(dy) > 0.2) d.moved = true
    const base = latest.current ?? board
    let gx: number | null = null
    let gy: number | null = null
    const others = base.items.filter((o) => o.id !== d.id)
    const tx = [0, 50, 100, ...others.flatMap((o) => [o.x, o.x + o.w / 2, o.x + o.w])]
    const ty = [0, base.h / 2, base.h, ...others.flatMap((o) => [o.y, o.y + o.h / 2, o.y + o.h])]
    const nb: Board = {
      ...base,
      items: base.items.map((it) => {
        if (it.id !== d.id) return it
        if (d.mode === 'move') {
          const nx = clamp(d.ix + dx, 0, 100 - it.w)
          const ny = clamp(d.iy + dy, 0, base.h - it.h)
          const sx = snapTo([nx, nx + it.w / 2, nx + it.w], tx)
          const sy = snapTo([ny, ny + it.h / 2, ny + it.h], ty)
          gx = sx.hit
          gy = sy.hit
          return { ...it, x: clamp(nx + sx.delta, 0, 100 - it.w), y: clamp(ny + sy.delta, 0, base.h - it.h) }
        }
        const nw = clamp(d.iw + dx, 4, 100 - it.x)
        const nh = clamp(d.ih + dy, 2, base.h - it.y)
        const sx = snapTo([it.x + nw], tx)
        const sy = snapTo([it.y + nh], ty)
        gx = sx.hit
        gy = sy.hit
        return { ...it, w: clamp(nw + sx.delta, 4, 100 - it.x), h: clamp(nh + sy.delta, 2, base.h - it.y) }
      }),
    }
    latest.current = nb
    setLocal(nb)
    setGuides({ x: gx, y: gy })
  }

  function end() {
    setGuides({ x: null, y: null })
    const d = drag.current
    drag.current = null
    if (!d || !d.moved || !latest.current) return
    window.parent?.postMessage({ type: 'camrhia-canvas', dev, board: latest.current, boardId: p.boardId ?? 'about' }, '*')
  }

  function removeItem(id: string) {
    const nb: Board = { ...shown, items: shown.items.filter((x) => x.id !== id) }
    setLocal(nb)
    setSel(null)
    window.parent?.postMessage({ type: 'camrhia-canvas', dev, board: nb, boardId: p.boardId ?? 'about' }, '*')
  }

  function inner(it: CItem): ReactNode {
    const ff = it.font === 'body' ? p.bodyFont : it.font === 'head' ? (p.headStyle as CSSProperties).fontFamily : undefined
    if (it.type === 'menu' || it.type === 'logo' || it.type === 'title' || it.type === 'subtitle') {
      const al = it.align ?? (it.type === 'menu' ? 'right' : 'left')
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: al === 'center' ? 'center' : al === 'right' ? 'flex-end' : 'flex-start', textAlign: al, color: it.color ?? (it.light ? '#fff' : undefined), fontFamily: ff, zoom: it.fs ?? undefined, pointerEvents: p.editing ? 'none' : undefined }}>
          {p.renderSpecial ? p.renderSpecial(it.type, it, dev) : null}
        </div>
      )
    }
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
            <div style={{ ...p.headStyle, fontWeight: p.headWeight ?? 200, fontSize: `${fs * 3.4}cqw`, lineHeight: 1.05, marginBottom: `${fs * 1.2}cqw`, color: it.color ?? p.ink, ...(ff ? { fontFamily: ff } : {}) }}>{title}</div>
          )}
          <div style={{ fontFamily: ff ?? p.bodyFont, fontWeight: 300, fontSize: `${fs}cqw`, lineHeight: 1.85, textAlign: 'justify', whiteSpace: 'pre-line', color: it.color ?? p.soft }}>{text}</div>
        </div>
      )
    }
    if (it.type === 'gallery') {
      const g = p.galleries?.find((x) => x.id === it.galleryId)
      if (!g) {
        return p.editing ? (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4cqw', color: p.soft, background: p.tint }}>Pick a gallery</div>
        ) : null
      }
      const mode = it.titleMode ?? 'overlay'
      const fs = it.fs ?? 1.8
      return (
        <a href={p.galleryHref ? p.galleryHref(g.id) : '#'} draggable={false} onClick={(e) => { if (p.editing) e.preventDefault() }}
          style={{ display: 'block', position: 'relative', width: '100%', height: '100%' }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: mode === 'below' ? `${fs * 2.6}cqw` : 0, overflow: 'hidden', borderRadius: `${it.radius ?? 0}cqw`, background: p.tint }}>
            {g.coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={g.coverUrl} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} />
            )}
            {mode === 'overlay' && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 55%, rgba(0,0,0,0.6))' }} />}
          </div>
          {mode === 'overlay' && (
            <div style={{ ...p.headStyle, position: 'absolute', left: '1.6cqw', right: '1.6cqw', bottom: '1.4cqw', color: '#fff', fontSize: `${fs}cqw`, lineHeight: 1.1 }}>{g.title}</div>
          )}
          {mode === 'below' && (
            <div style={{ ...p.headStyle, position: 'absolute', left: 0, right: 0, bottom: 0, color: p.ink, fontSize: `${fs}cqw`, lineHeight: 1.1 }}>{g.title}</div>
          )}
        </a>
      )
    }
    if (it.type === 'heading') {
      return (
        <div style={{ ...p.headStyle, fontWeight: p.headWeight ?? 200, fontSize: `${it.fs ?? 4.6}cqw`, lineHeight: 1.05, whiteSpace: 'pre-line', color: it.color ?? p.ink, ...(ff ? { fontFamily: ff } : {}) }}>{it.text}</div>
      )
    }
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', zoom: it.fs ?? undefined, pointerEvents: p.editing ? 'none' : undefined }}>
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
        {p.editing && guides.x !== null && <div style={{ position: 'absolute', left: `${guides.x}%`, top: 0, bottom: 0, width: 0, borderLeft: '1px solid #B08D57', zIndex: 999, pointerEvents: 'none' }} />}
        {p.editing && guides.y !== null && <div style={{ position: 'absolute', top: `${(guides.y / shown.h) * 100}%`, left: 0, right: 0, height: 0, borderTop: '1px solid #B08D57', zIndex: 999, pointerEvents: 'none' }} />}
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
                  title="Remove"
                  onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); removeItem(it.id) }}
                  style={{ position: 'absolute', right: -11, top: -11, width: 22, height: 22, borderRadius: '50%', background: '#2A1F24', color: '#fff', fontSize: 15, lineHeight: '21px', textAlign: 'center', cursor: 'pointer', touchAction: 'none', zIndex: 5 }}
                >×</div>
              )}
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
      const d = e.data as { type?: string; id?: string | null; boardId?: string } | null
      if (d && d.type === 'camrhia-canvas-pick' && (d.boardId ?? 'about') === (props.boardId ?? 'about')) setSel(d.id ?? null)
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [props.editing])

  useEffect(() => {
    if (!props.editing) return
    window.parent?.postMessage({ type: 'camrhia-canvas-select', id: sel, boardId: props.boardId ?? 'about' }, '*')
    if (sel) window.dispatchEvent(new CustomEvent('cr-canvas-active', { detail: props.boardId ?? 'about' }))
  }, [sel, props.editing])

  useEffect(() => {
    function onActive(e: Event) {
      const id = (e as CustomEvent).detail
      if (id !== (props.boardId ?? 'about')) setSel(null)
    }
    window.addEventListener('cr-canvas-active', onActive)
    return () => window.removeEventListener('cr-canvas-active', onActive)
  }, [props.boardId])

  useEffect(() => {
    if (props.editing && props.boardId === 'galleries' && props.galleries) {
      window.parent?.postMessage({ type: 'camrhia-galleries', list: props.galleries.map((g) => ({ id: g.id, title: g.title })) }, '*')
    }
  }, [props.editing, props.boardId, props.galleries?.length])

  return (
    <>
      <BoardView dev="desktop" className="hidden md:block" p={props} sel={sel} setSel={setSel} />
      <BoardView dev="phone" className="md:hidden" p={props} sel={sel} setSel={setSel} />
    </>
  )
}
