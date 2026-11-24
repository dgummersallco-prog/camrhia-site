import { rootOf, rootKey, photosIn, photoId, visualOf, BTN_SEL, buttonsIn, buttonId, boxesIn, boxId, frameOf, setBox, TXT_SEL } from './photoFx'

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
    const vw = document.documentElement.clientWidth
    const cx = Math.round((Math.max(r.left, 0) + Math.min(r.right, vw)) / 2 - 38)
    const vh = window.innerHeight
    const topIn = r.top >= -2 && r.top <= vh - 4
    const botIn = r.bottom >= 4 && r.bottom <= vh + 2
    hT.style.display = tall && topIn ? 'block' : 'none'
    hB.style.display = tall && botIn ? 'block' : 'none'
    hT.style.left = cx + 'px'; hT.style.top = Math.max(0, Math.round(r.top) - 8) + 'px'
    hB.style.left = cx + 'px'; hB.style.top = Math.min(vh - 16, Math.round(r.bottom) - 8) + 'px'
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
  const TXT = 'h1, [class^="el-"], [class*=" el-"], ' + BTN_SEL
  const txOf = (b: HTMLElement) => b.classList.contains('el-hero_btn') ? 'hero_el' : b.classList.contains('ct-btn') ? 'contactBtn' : (b.classList.contains('ab-btn') || b.getAttribute('data-name') === 'About button') ? 'aboutBtn' : b.classList.contains('gb-btn') ? 'galBtn' : b.id === 'hero-btn' ? 'heroText' : ''
  const clearSel = () => { if (selPhoto) { selPhoto.el.classList.remove('cam-psel'); visualOf(selPhoto.el).classList.remove('cam-psel') } selPhoto = null }
  const photoAt = (x: number, y: number): { key: string; idx: number; el: HTMLElement } | null => {
    for (const n of document.elementsFromPoint(x, y)) {
      const root = rootOf(n)
      if (!root) continue
      const key = rootKey(root)
      if (!key) continue
      let node = n as HTMLElement
      if (node.hasAttribute && node.hasAttribute('data-fxph')) node = node.previousElementSibling as HTMLElement
      const i = photosIn(root).indexOf(node)
      if (i >= 0) return { key, idx: key === 'hero' ? 0 : i, el: node }
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
    const key = rootKey(root)
    const bt = t.closest(BTN_SEL) as HTMLElement | null
    if (bt) {
      const bi = buttonsIn(root).indexOf(bt)
      if (bi >= 0) {
        e.preventDefault(); e.stopPropagation()
        clearSel()
        selectText(root, bt)
        post({ action: 'button', sec: key, id: buttonId(key, bi), tx: txOf(bt), text: (bt.textContent ?? '').trim(), cbg: hexOf(getComputedStyle(bt).backgroundColor), ccolor: hexOf(getComputedStyle(bt).color) })
        return
      }
    }
    if (t.closest(TXT)) { clearSel(); selectText(root, t); return }
    const hit = photoAt(e.clientX, e.clientY)
    if (!hit || hit.key !== key) { clearSel(); setBoxSel(null, '', 'text'); post({ action: 'select', key, bg: effBg(root) }); return }
    e.preventDefault(); e.stopPropagation()
    const again = !!selPhoto && selPhoto.key === hit.key && selPhoto.idx === hit.idx
    clearSel()
    selPhoto = hit
    visualOf(hit.el).classList.add('cam-psel')
    if (hit.key !== 'hero') setBoxSel(frameOf(visualOf(hit.el), root), 'f:' + photoId(hit.key, hit.idx), 'frame')
    else setBoxSel(null, '', 'text')
    post({ action: 'photo', key: hit.key, idx: hit.idx, again, bg: effBg(root) })
  }
  const parsePos = (el: HTMLElement): [number, number] => {
    const m = /(-?[\d.]+)%\s+(-?[\d.]+)%/.exec(el.style.objectPosition || '')
    return m ? [Number(m[1]), Number(m[2])] : [50, 50]
  }
  const dragTargets = (d: { el: HTMLElement; key: string }): HTMLElement[] => {
    const root = rootOf(d.el)
    return (d.key === 'hero' && root ? photosIn(root) : [d.el]).map(visualOf)
  }
  const onPDown = (e: PointerEvent) => {
    if (e.button !== 0 || !selPhoto) return
    const t = e.target as HTMLElement | null
    if (!t || !t.closest || bar.contains(t) || hT.contains(t) || hB.contains(t) || t.closest(TXT)) return
    const hit = photoAt(e.clientX, e.clientY)
    if (!hit || hit.key !== selPhoto.key || hit.idx !== selPhoto.idx) return
    const [px, py] = parsePos(visualOf(hit.el))
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
    const el = visualOf(pd.el)
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
  const onNativeDrag = (e: Event) => { e.preventDefault() }

  const hexOf = (css: string): string => {
    try {
      const cv = document.createElement('canvas')
      cv.width = 1; cv.height = 1
      const cx = cv.getContext('2d', { willReadFrequently: true })
      if (!cx || !css) return ''
      cx.clearRect(0, 0, 1, 1)
      cx.fillStyle = '#000'
      cx.fillStyle = css
      cx.fillRect(0, 0, 1, 1)
      const d = cx.getImageData(0, 0, 1, 1).data
      if (d[3] < 40) return ''
      return '#' + [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()
    } catch { return '' }
  }
  const effBg = (root: HTMLElement | null): string => {
    try {
      const cv = document.createElement('canvas')
      cv.width = 1; cv.height = 1
      const cx = cv.getContext('2d', { willReadFrequently: true })
      let e: HTMLElement | null = root
      while (e && cx) {
        const c = getComputedStyle(e).backgroundColor
        if (c && c !== 'transparent') {
          cx.clearRect(0, 0, 1, 1)
          cx.fillStyle = '#000'
          cx.fillStyle = c
          cx.fillRect(0, 0, 1, 1)
          const d = cx.getImageData(0, 0, 1, 1).data
          if (d[3] > 200) return '#' + [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()
        }
        e = e.parentElement
      }
    } catch { /* ignore */ }
    return '#FFFFFF'
  }

  const gx = document.createElement('div')
  gx.style.cssText = 'position:fixed;z-index:2147481999;display:none;width:1px;background:#ff2d8a;pointer-events:none'
  const gy = document.createElement('div')
  gy.style.cssText = 'position:fixed;z-index:2147481999;display:none;height:1px;background:#ff2d8a;pointer-events:none'
  document.body.appendChild(gx)
  document.body.appendChild(gy)
  const hideGuides = () => { gx.style.display = 'none'; gy.style.display = 'none' }

  type Sel = { el: HTMLElement; id: string; kind: 'text' | 'frame' }
  type Tg = { xs: number[]; ys: number[] }
  const targetsFor = (sel: Sel, root: HTMLElement): Tg => {
    const xs: number[] = []
    const ys: number[] = []
    const add = (r: DOMRect) => { xs.push(r.left, r.left + r.width / 2, r.right); ys.push(r.top, r.top + r.height / 2, r.bottom) }
    add(root.getBoundingClientRect())
    const others: HTMLElement[] = [...boxesIn(root)]
    if (rootKey(root) !== 'hero') photosIn(root).forEach((ph) => others.push(frameOf(visualOf(ph), root)))
    others.forEach((o) => {
      if (o === sel.el || o.contains(sel.el) || sel.el.contains(o)) return
      const r = o.getBoundingClientRect()
      if (r.width > 2 && r.height > 2) add(r)
    })
    return { xs, ys }
  }
  const snapOf = (el: HTMLElement, tg: Tg) => {
    const r = el.getBoundingClientRect()
    const mx = [r.left, r.left + r.width / 2, r.right]
    const my = [r.top, r.top + r.height / 2, r.bottom]
    let dx: number | null = null
    let tx = 0
    let dy: number | null = null
    let ty = 0
    for (const m of mx) for (const t of tg.xs) { const d = t - m; if (Math.abs(d) <= 6 && (dx === null || Math.abs(d) < Math.abs(dx))) { dx = d; tx = t } }
    for (const m of my) for (const t of tg.ys) { const d = t - m; if (Math.abs(d) <= 6 && (dy === null || Math.abs(d) < Math.abs(dy))) { dy = d; ty = t } }
    return { dx, tx, dy, ty }
  }
  const drawGuides = (sn: { dx: number | null; tx: number; dy: number | null; ty: number }, root: HTMLElement) => {
    const rr = root.getBoundingClientRect()
    if (sn.dx !== null) { gx.style.display = 'block'; gx.style.left = sn.tx + 'px'; gx.style.top = Math.max(0, rr.top) + 'px'; gx.style.height = Math.max(0, Math.min(rr.bottom, window.innerHeight) - Math.max(0, rr.top)) + 'px' } else gx.style.display = 'none'
    if (sn.dy !== null) { gy.style.display = 'block'; gy.style.top = sn.ty + 'px'; gy.style.left = Math.max(0, rr.left) + 'px'; gy.style.width = Math.max(0, Math.min(rr.right, window.innerWidth) - Math.max(0, rr.left)) + 'px' } else gy.style.display = 'none'
  }
  let selBox: Sel | null = null
  const bx = document.createElement('div')
  bx.id = 'cam-box'
  bx.style.cssText = 'position:fixed;z-index:2147482000;display:none;border:1.5px solid #d9a21b;pointer-events:none'
  const mkH = (c: string, cur: string, pos: string) => {
    const h = document.createElement('div')
    h.dataset.c = c
    h.style.cssText = 'position:absolute;width:12px;height:12px;background:#fff;border:2px solid #d9a21b;border-radius:3px;pointer-events:auto;cursor:' + cur + ';' + pos
    bx.appendChild(h)
    return h
  }
  mkH('nw', 'nwse-resize', 'left:-8px;top:-8px')
  mkH('ne', 'nesw-resize', 'right:-8px;top:-8px')
  mkH('sw', 'nesw-resize', 'left:-8px;bottom:-8px')
  mkH('se', 'nwse-resize', 'right:-8px;bottom:-8px')
  const mv = document.createElement('div')
  mv.dataset.c = 'move'
  mv.textContent = 'Move'
  mv.style.cssText = 'position:absolute;left:50%;top:-32px;transform:translateX(-50%);background:#8C6B3F;color:#fff;font:600 11px system-ui,sans-serif;padding:5px 11px;border-radius:9px;cursor:move;pointer-events:auto;box-shadow:0 2px 8px rgba(0,0,0,.3)'
  bx.appendChild(mv)
  document.body.appendChild(bx)
  const layoutBox = () => {
    if (!selBox || !document.body.contains(selBox.el)) { bx.style.display = 'none'; return }
    const r = selBox.el.getBoundingClientRect()
    if (r.width < 4 || r.height < 4) { bx.style.display = 'none'; return }
    bx.style.display = 'block'
    bx.style.left = r.left + 'px'; bx.style.top = r.top + 'px'; bx.style.width = r.width + 'px'; bx.style.height = r.height + 'px'
    mv.style.display = selBox.kind === 'frame' ? 'block' : 'none'
    mv.style.top = r.top < 40 ? 'auto' : '-32px'
    mv.style.bottom = r.top < 40 ? '-32px' : 'auto'
  }
  const setBoxSel = (el: HTMLElement | null, id: string, kind: 'text' | 'frame') => {
    selBox = el ? { el, id, kind } : null
    post({ action: 'box', id: el ? id : '' })
    layoutBox()
  }
  const selectText = (root: HTMLElement, t: HTMLElement) => {
    const key = rootKey(root)
    const list = boxesIn(root)
    const i = list.findIndex((x) => x === t || x.contains(t))
    if (i >= 0) setBoxSel(list[i], boxId(key, i), 'text')
    else setBoxSel(null, '', 'text')
  }
  const curFx = (el: HTMLElement) => {
    const m = /(-?[\d.]+)vw\s+(-?[\d.]+)vw/.exec(el.style.getPropertyValue('translate') || '')
    return { x: m ? Number(m[1]) : 0, y: m ? Number(m[2]) : 0, s: Number(el.style.getPropertyValue('scale')) || 1 }
  }
  let g: { mode: 'rs' | 'mv'; sel: Sel; x0: number; y0: number; fx: { x: number; y: number; s: number }; cx: number; cy: number; d0: number; moved: boolean; root: HTMLElement | null; tg: Tg | null } | null = null
  const vwPx = () => Math.max(1, document.documentElement.clientWidth) / 100
  const onGDown = (e: PointerEvent) => {
    if (e.button !== 0) return
    const t = e.target as HTMLElement | null
    if (!t || !t.closest || bar.contains(t) || hT.contains(t) || hB.contains(t)) return
    const hd = t.closest('#cam-box [data-c]') as HTMLElement | null
    if (hd && selBox) {
      e.preventDefault()
      const r = selBox.el.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      g = { mode: hd.dataset.c === 'move' ? 'mv' : 'rs', sel: selBox, x0: e.clientX, y0: e.clientY, fx: curFx(selBox.el), cx, cy, d0: Math.max(8, Math.hypot(e.clientX - cx, e.clientY - cy)), moved: true, root: rootOf(selBox.el), tg: null }
      document.body.style.userSelect = 'none'
      return
    }
    if (bx.contains(t)) return
    const tb = t.closest(TXT_SEL) as HTMLElement | null
    const root = rootOf(t)
    if (!tb || !root) return
    const key = rootKey(root)
    const list = boxesIn(root)
    const i = list.findIndex((x) => x === tb || x.contains(tb))
    if (i < 0) return
    g = { mode: 'mv', sel: { el: list[i], id: boxId(key, i), kind: 'text' }, x0: e.clientX, y0: e.clientY, fx: curFx(list[i]), cx: 0, cy: 0, d0: 1, moved: false, root, tg: null }
  }
  const onGMove = (e: PointerEvent) => {
    if (!g) return
    const dx = e.clientX - g.x0
    const dy = e.clientY - g.y0
    if (!g.moved) { if (Math.hypot(dx, dy) < 5) return; g.moved = true; document.body.style.userSelect = 'none' }
    e.preventDefault()
    if (g.mode === 'mv') {
      let nx = g.fx.x + dx / vwPx()
      let ny = g.fx.y + dy / vwPx()
      setBox(g.sel.el, { x: nx, y: ny, s: g.fx.s })
      if (g.root) {
        if (!g.tg) g.tg = targetsFor(g.sel, g.root)
        const sn = snapOf(g.sel.el, g.tg)
        if (sn.dx !== null || sn.dy !== null) {
          nx += (sn.dx ?? 0) / vwPx()
          ny += (sn.dy ?? 0) / vwPx()
          setBox(g.sel.el, { x: nx, y: ny, s: g.fx.s })
        }
        drawGuides(sn, g.root)
      }
    } else {
      const d = Math.hypot(e.clientX - g.cx, e.clientY - g.cy)
      setBox(g.sel.el, { x: g.fx.x, y: g.fx.y, s: Math.min(6, Math.max(0.2, g.fx.s * (d / g.d0))) })
    }
    layoutBox()
  }
  const onGUp = () => {
    if (!g) return
    const d = g
    g = null
    document.body.style.userSelect = ''
    hideGuides()
    if (!d.moved) return
    const f = curFx(d.sel.el)
    selBox = d.sel
    layoutBox()
    const kill = (ev: Event) => { ev.stopImmediatePropagation(); ev.preventDefault() }
    window.addEventListener('click', kill, true)
    setTimeout(() => window.removeEventListener('click', kill, true), 60)
    post({ action: 'box', id: d.sel.id })
    post({ action: 'boxfx', id: d.sel.id, x: Math.round(f.x * 100) / 100, y: Math.round(f.y * 100) / 100, s: Math.round(f.s * 1000) / 1000 })
  }
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
  let rafId = 0
  const loop = () => { if (cur && !dragging) show(cur); layoutBox(); rafId = requestAnimationFrame(loop) }
  rafId = requestAnimationFrame(loop)
  document.addEventListener('pointerdown', onHDown)
  document.addEventListener('pointermove', onHMove)
  document.addEventListener('pointerup', onHUp)
  document.addEventListener('click', onPhotoClick, true)
  document.addEventListener('pointerdown', onPDown)
  document.addEventListener('pointermove', onPMove, { passive: false })
  document.addEventListener('pointerup', onPUp)
  document.addEventListener('dragstart', onNativeDrag)
  document.addEventListener('pointerdown', onGDown)
  document.addEventListener('pointermove', onGMove, { passive: false })
  document.addEventListener('pointerup', onGUp)
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
    document.removeEventListener('pointerdown', onGDown)
    document.removeEventListener('pointermove', onGMove)
    document.removeEventListener('pointerup', onGUp)
    bx.remove()
    gx.remove()
    gy.remove()
    cancelAnimationFrame(rafId)
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
