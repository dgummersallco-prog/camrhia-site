import { rootOf, rootKey, photosIn, photoId } from './photoFx'

export function installPreviewSections(): () => void {
  if (typeof window === 'undefined') return () => {}
  if (new URLSearchParams(window.location.search).get('preview') !== '1') return () => {}

  const css = document.createElement('style')
  css.textContent =
    '[data-sec].cam-hot{outline:2px solid rgba(217,162,27,.75);outline-offset:-2px}' +
    '#cam-sec-bar{position:fixed;z-index:2147483000;display:none;gap:2px;padding:4px;background:#fff;border-radius:10px;box-shadow:0 8px 28px rgba(0,0,0,.25);font:500 12px system-ui,sans-serif}' +
    '#cam-sec-bar button{all:unset;cursor:pointer;padding:6px 10px;border-radius:7px;color:#2a1f24}' +
    '#cam-sec-bar button:hover{background:#f1ece6}' +
    '.cam-h{position:fixed;z-index:2147483000;display:none;width:76px;height:16px;border-radius:8px;background:#8C6B3F;cursor:ns-resize;box-shadow:0 2px 8px rgba(0,0,0,.3)}' +
    '.cam-h:after{content:"";position:absolute;left:26px;right:26px;top:7px;height:2px;border-radius:1px;background:#fff}' +
    '#cam-sec-line{position:fixed;z-index:2147483000;height:3px;background:#d9a21b;border-radius:2px;display:none;left:0;right:0;pointer-events:none}'
  css.textContent += '.cam-psel{outline:2px solid #d9a21b !important;outline-offset:-2px}'
  document.head.appendChild(css)

  const bar = document.createElement('div')
  bar.id = 'cam-sec-bar'
  bar.innerHTML = '<button data-a="drag" style="cursor:grab">Drag</button><button data-a="up">Up</button><button data-a="down">Down</button><button data-a="hide">Hide</button>'
  document.body.appendChild(bar)
  const hT = document.createElement('div'); hT.className = 'cam-h'; hT.dataset.side = 't'; document.body.appendChild(hT)
  const hB = document.createElement('div'); hB.className = 'cam-h'; hB.dataset.side = 'b'; document.body.appendChild(hB)
  const line = document.createElement('div')
  line.id = 'cam-sec-line'
  document.body.appendChild(line)

  const secs = () => Array.from(document.querySelectorAll<HTMLElement>('[data-sec]'))
  const ord = () => secs().map((x) => x.dataset.sec as string)
  const seen = (x: HTMLElement) => x.offsetHeight > 30
  let cur: HTMLElement | null = null
  let dragging = false
  let padDrag: { side: string; y0: number; h0: number; nat: number; el: HTMLElement; inner: HTMLElement } | null = null
  let dragKey = ''
  let before = -1

  const post = (m: Record<string, unknown>) => window.parent?.postMessage({ type: 'camrhia-section', ...m }, '*')

  const show = (el: HTMLElement | null) => {
    if (cur && cur !== el) cur.classList.remove('cam-hot')
    cur = el
    if (!el) { bar.style.display = 'none'; hT.style.display = 'none'; hB.style.display = 'none'; return }
    el.classList.add('cam-hot')
    const r = el.getBoundingClientRect()
    bar.style.display = 'flex'
    bar.style.top = Math.min(Math.max(8, r.top + 8), window.innerHeight - 50) + 'px'
    bar.style.right = '16px'
    const tall = r.height > 140
    hT.style.display = tall ? 'block' : 'none'; hB.style.display = tall ? 'block' : 'none'
    const cx = Math.round(r.left + r.width / 2 - 38)
    hT.style.left = cx + 'px'; hT.style.top = Math.max(0, r.top + 2) + 'px'
    hB.style.left = cx + 'px'; hB.style.top = Math.min(window.innerHeight - 18, r.bottom - 18) + 'px'
  }

  const onMove = (e: MouseEvent) => {
    if (dragging || padDrag) return
    const t = e.target as HTMLElement | null
    if (!t || !t.closest || bar.contains(t) || hT.contains(t) || hB.contains(t)) return
    const el = t.closest('[data-sec]') as HTMLElement | null
    show(el && seen(el) ? el : null)
  }
  const onLeave = () => { if (!dragging && !padDrag) show(null) }
  const onScroll = () => { if (cur && !dragging) show(cur) }

  const onBarClick = (e: MouseEvent) => {
    const b = (e.target as HTMLElement).closest('button') as HTMLElement | null
    if (!b || !cur) return
    const a = b.dataset.a
    if (a === 'drag') return
    const key = cur.dataset.sec as string
    const o = ord()
    const i = o.indexOf(key)
    if (a === 'hide') { post({ action: 'hide', key }); show(null); return }
    const vis = secs().filter(seen).map((x) => o.indexOf(x.dataset.sec as string))
    if (a === 'up') {
      const j = [...vis].reverse().find((v) => v < i)
      if (j !== undefined) post({ action: 'move', key, order: o, to: j })
    }
    if (a === 'down') {
      const j = vis.find((v) => v > i)
      if (j !== undefined) post({ action: 'move', key, order: o, to: j })
    }
  }

  const onDown = (e: PointerEvent) => {
    const b = (e.target as HTMLElement).closest('button') as HTMLElement | null
    if (!b || b.dataset.a !== 'drag' || !cur) return
    e.preventDefault()
    dragging = true
    dragKey = cur.dataset.sec as string
    before = -1
    try { bar.setPointerCapture(e.pointerId) } catch { /* ignore */ }
    document.body.style.userSelect = 'none'
  }
  const onDragMove = (e: PointerEvent) => {
    if (!dragging) return
    const o = ord()
    const list = secs().filter(seen)
    let idx = o.length
    let y = list.length ? list[list.length - 1].getBoundingClientRect().bottom : 0
    for (const s of list) {
      const r = s.getBoundingClientRect()
      if (e.clientY < r.top + r.height / 2) { idx = o.indexOf(s.dataset.sec as string); y = r.top; break }
    }
    before = idx
    line.style.display = 'block'
    line.style.top = Math.max(0, y - 1) + 'px'
    if (e.clientY < 70) window.scrollBy(0, -18)
    else if (e.clientY > window.innerHeight - 70) window.scrollBy(0, 18)
  }
  const onUp = () => {
    if (!dragging) return
    dragging = false
    line.style.display = 'none'
    document.body.style.userSelect = ''
    const o = ord()
    const from = o.indexOf(dragKey)
    if (from < 0 || before < 0) return
    const to = before > from ? before - 1 : before
    if (to !== from) post({ action: 'move', key: dragKey, order: o, to })
  }

  let selPhoto: { key: string; idx: number; el: HTMLElement } | null = null
  let pd: { el: HTMLElement; key: string; idx: number; x0: number; y0: number; px: number; py: number; moved: boolean; nx: number; ny: number } | null = null
  let swallow = false
  const TXT = 'h1, [class^="el-"], [class*=" el-"]'
  const clearSel = () => { if (selPhoto) selPhoto.el.classList.remove('cam-psel'); selPhoto = null }
  const photoAt = (x: number, y: number): { key: string; idx: number; el: HTMLElement } | null => {
    for (const n of document.elementsFromPoint(x, y)) {
      const root = rootOf(n)
      if (!root) continue
      const key = rootKey(root)
      if (!key) continue
      const i = photosIn(root).indexOf(n as HTMLElement)
      if (i >= 0) return { key, idx: key === 'hero' ? 0 : i, el: n as HTMLElement }
    }
    return null
  }
  const onPhotoClick = (e: MouseEvent) => {
    if (swallow) { swallow = false; e.preventDefault(); e.stopPropagation(); return }
    const t = e.target as HTMLElement | null
    if (!t || !t.closest || bar.contains(t)) return
    const root = rootOf(t)
    if (!root) return
    if (t.closest('a')) e.preventDefault()
    if (t.closest(TXT)) { clearSel(); return }
    const key = rootKey(root)
    const hit = photoAt(e.clientX, e.clientY)
    if (!hit || hit.key !== key) { clearSel(); post({ action: 'select', key }); return }
    e.preventDefault(); e.stopPropagation()
    const again = !!selPhoto && selPhoto.key === hit.key && selPhoto.idx === hit.idx
    clearSel()
    selPhoto = hit
    hit.el.classList.add('cam-psel')
    post({ action: 'photo', key: hit.key, idx: hit.idx, again })
  }
  const parsePos = (el: HTMLElement): [number, number] => {
    const m = /(-?[\d.]+)%\s+(-?[\d.]+)%/.exec(el.style.objectPosition || '')
    return m ? [Number(m[1]), Number(m[2])] : [50, 50]
  }
  const dragTargets = (d: { el: HTMLElement; key: string }): HTMLElement[] => {
    const root = rootOf(d.el)
    return d.key === 'hero' && root ? photosIn(root) : [d.el]
  }
  const onPDown = (e: PointerEvent) => {
    if (e.button !== 0 || !selPhoto) return
    const t = e.target as HTMLElement | null
    if (!t || !t.closest || bar.contains(t) || hT.contains(t) || hB.contains(t) || t.closest(TXT)) return
    const hit = photoAt(e.clientX, e.clientY)
    if (!hit || hit.key !== selPhoto.key || hit.idx !== selPhoto.idx) return
    const [px, py] = parsePos(hit.el)
    pd = { el: hit.el, key: hit.key, idx: hit.idx, x0: e.clientX, y0: e.clientY, px, py, moved: false, nx: px, ny: py }
    for (const x of dragTargets(pd)) if (x.dataset.fx === undefined) { x.dataset.fx = '1'; x.dataset.fxop = x.style.objectPosition }
  }
  const onPMove = (e: PointerEvent) => {
    if (!pd) return
    const dx = e.clientX - pd.x0
    const dy = e.clientY - pd.y0
    if (!pd.moved && Math.hypot(dx, dy) < 5) return
    pd.moved = true
    e.preventDefault()
    document.body.style.userSelect = 'none'
    const el = pd.el
    const w = el.offsetWidth
    const h = el.offsetHeight
    const nw = (el as HTMLImageElement).naturalWidth || w
    const nh = (el as HTMLImageElement).naturalHeight || h
    const sc = Math.max(w / nw, h / nh)
    const z = Number((el.style.transform.match(/scale\(([\d.]+)\)/) ?? [])[1]) || 1
    const rx = Math.max(nw * sc - w + w * (z - 1), w * 0.3)
    const ry = Math.max(nh * sc - h + h * (z - 1), h * 0.3)
    pd.nx = Math.min(100, Math.max(0, pd.px - (dx * 100) / rx))
    pd.ny = Math.min(100, Math.max(0, pd.py - (dy * 100) / ry))
    const pos = pd.nx + '% ' + pd.ny + '%'
    for (const x of dragTargets(pd)) { x.style.objectPosition = pos; x.style.transformOrigin = pos }
  }
  const onPUp = () => {
    if (!pd) return
    const d = pd
    pd = null
    document.body.style.userSelect = ''
    if (!d.moved) return
    swallow = true
    setTimeout(() => { swallow = false }, 0)
    post({ action: 'photofx', id: photoId(d.key, d.idx), x: Math.round(d.nx * 10) / 10, y: Math.round(d.ny * 10) / 10 })
  }
  const onNativeDrag = (e: Event) => { if (selPhoto) e.preventDefault() }
  const onHDown = (e: PointerEvent) => {
    const h = (e.target as HTMLElement).closest('.cam-h') as HTMLElement | null
    if (!h || !cur) return
    e.preventDefault()
    const inner = cur.firstElementChild as HTMLElement | null
    if (!inner) return
    const sc0 = Number(cur.dataset.sc || 1) || 1
    const h0 = cur.getBoundingClientRect().height
    padDrag = { side: h.dataset.side as string, y0: e.clientY, h0, nat: h0 / sc0, el: cur, inner }
    document.body.style.userSelect = 'none'
  }
  const onHMove = (e: PointerEvent) => {
    if (!padDrag) return
    const { side, y0, h0, nat, el, inner } = padDrag
    const dy = side === 't' ? e.clientY - y0 : y0 - e.clientY
    const nh = Math.min(nat, Math.max(nat * 0.4, h0 - dy))
    const sc = nh / nat
    inner.style.zoom = sc < 0.995 ? String(sc) : ''
    el.dataset.sc = String(sc)
    show(el)
  }
  const onHUp = () => {
    if (!padDrag) return
    const { el } = padDrag
    padDrag = null
    document.body.style.userSelect = ''
    post({ action: 'scale', key: el.dataset.sec as string, s: Number(el.dataset.sc || 1) })
  }
  document.addEventListener('pointerdown', onHDown)
  document.addEventListener('pointermove', onHMove)
  document.addEventListener('pointerup', onHUp)
  document.addEventListener('click', onPhotoClick, true)
  document.addEventListener('pointerdown', onPDown)
  document.addEventListener('pointermove', onPMove, { passive: false })
  document.addEventListener('pointerup', onPUp)
  document.addEventListener('dragstart', onNativeDrag)
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseleave', onLeave)
  window.addEventListener('scroll', onScroll, true)
  bar.addEventListener('click', onBarClick)
  bar.addEventListener('pointerdown', onDown)
  document.addEventListener('pointermove', onDragMove)
  document.addEventListener('pointerup', onUp)
  return () => {
    document.removeEventListener('click', onPhotoClick, true)
    document.removeEventListener('pointerdown', onPDown)
    document.removeEventListener('pointermove', onPMove)
    document.removeEventListener('pointerup', onPUp)
    document.removeEventListener('dragstart', onNativeDrag)
    document.removeEventListener('pointerdown', onHDown)
    document.removeEventListener('pointermove', onHMove)
    document.removeEventListener('pointerup', onHUp)
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseleave', onLeave)
    window.removeEventListener('scroll', onScroll, true)
    bar.removeEventListener('click', onBarClick)
    bar.removeEventListener('pointerdown', onDown)
    document.removeEventListener('pointermove', onDragMove)
    document.removeEventListener('pointerup', onUp)
    bar.remove(); line.remove(); hT.remove(); hB.remove(); css.remove()
  }
}
