import { editing, startEdit } from './previewEdit'
import { textAtPoint, rootOf, rootKey, photosIn, photoId, heroOne, visualOf, BTN_SEL, buttonsIn, buttonId, boxesIn, boxId, rulesIn, ruleId, frameOf, setBox, TXT_SEL, roots, lineDir } from './photoFx'

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
  bar.innerHTML = '<button data-a="up">Up</button><button data-a="down">Down</button><button data-a="hide">Hide</button>'
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
  let padHold = 0
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
    if (cur && performance.now() < padHold) return
    for (const hh of [hT, hB]) {
      if (cur && hh.style.display === 'block') {
        const q = hh.getBoundingClientRect()
        if (Math.abs(e.clientY - (q.top + q.height / 2)) < 36 && e.clientX > q.left - 90 && e.clientX < q.right + 90) return
      }
    }
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
  const txOf = (b: HTMLElement) => b.classList.contains('el-hero_btn') ? 'hero_el' : b.classList.contains('ct-btn') ? 'contactBtn' : (b.classList.contains('ab-btn') || b.getAttribute('data-name') === 'About button') ? 'aboutBtn' : b.classList.contains('gb-btn') ? 'galBtn' : b.id === 'hero-btn' ? 'heroText' : b.id === 'book-btn' ? 'bookBtn' : ''
  const clearSel = () => { if (selPhoto) { selPhoto.el.classList.remove('cam-psel'); visualOf(selPhoto.el).classList.remove('cam-psel') } selPhoto = null }
  const photoAt = (x: number, y: number): { key: string; idx: number; el: HTMLElement } | null => {
    for (const n of document.elementsFromPoint(x, y)) {
      const root = rootOf(n)
      if (!root) continue
      const key = rootKey(root)
      if (!key) continue
      let node = n as HTMLElement
      if (node.hasAttribute && node.hasAttribute('data-fxph')) node = node.previousElementSibling as HTMLElement
      let i = photosIn(root).indexOf(node)
      if (i < 0 && node.closest) { const pf = node.closest('[data-pframe]'); if (pf) { const ph = photosIn(root).find((q) => pf.contains(q)); if (ph) { node = ph; i = photosIn(root).indexOf(ph) } } }
      if (i >= 0) return { key, idx: heroOne(root) ? 0 : i, el: node }
    }
    return null
  }
  const onPhotoClick = (e: MouseEvent) => {
    if (swallow) { swallow = false; e.preventDefault(); e.stopPropagation(); return }
    let t = e.target as HTMLElement | null
    if (!t || !t.closest || bar.contains(t)) return
    if (editing(t)) { e.preventDefault(); return }
    if (!t.closest(TXT_SEL + ', #cam-box, a, button, input, textarea, select')) { const up = document.elementsFromPoint(e.clientX, e.clientY).find((n) => n instanceof HTMLElement && n.matches(TXT_SEL) && !n.closest('#cam-box')) as HTMLElement | undefined; const up2 = up ?? textAtPoint(e.clientX, e.clientY); if (up2) t = up2 }
    const root = rootOf(t)
    if (!root) return
    if (t.closest('a')) e.preventDefault()
    const key = rootKey(root)
    const bt = t.closest(BTN_SEL) as HTMLElement | null
    if (bt) {
      const bi = buttonsIn(root).indexOf(bt)
      if (bi >= 0) {
        e.preventDefault(); e.stopPropagation()
        if (e.shiftKey) { const bl = boxesIn(root); const k = bl.findIndex((x) => x === bt || x.contains(bt)); if (k >= 0) addSel(bl[k], boxId(key, k), 'text'); return }
        clearSel()
        const wasSel = bt.hasAttribute('data-cam-bsel')
        selectText(root, bt)
        { const tx0 = txOf(bt); if (tx0 && wasSel) startEdit(bt, { kind: 'btn', tx: tx0 }, e.clientX, e.clientY) }
        post({ action: 'button', sec: key, id: buttonId(key, bi), tx: txOf(bt), text: (bt.textContent ?? '').trim(), cbg: hexOf(getComputedStyle(bt).backgroundColor), ccolor: hexOf(getComputedStyle(bt).color) })
        return
      }
    }
    if (t.closest(TXT)) {
      if (e.shiftKey) { e.preventDefault(); e.stopPropagation(); const bl = boxesIn(root); const k = bl.findIndex((x) => x === t || x.contains(t)); if (k >= 0) addSel(bl[k], boxId(key, k), 'text'); return }
      clearSel(); selectText(root, t); return
    }
    const au = boxesIn(root).find((x) => (x === t || x.contains(t)) && !x.matches(TXT_SEL))
    if (au) {
      e.preventDefault(); e.stopPropagation()
      if (e.shiftKey) { const bl = boxesIn(root); const k = bl.indexOf(au); if (k >= 0) addSel(au, boxId(key, k), 'text'); return }
      clearSel(); selectText(root, au); return
    }
    const ru = ruleAt(root, e.clientX, e.clientY)
    if (ru) {
      e.preventDefault(); e.stopPropagation()
      clearSel()
      setBoxSel(ru.el, ru.id, 'text')
      post({ action: 'select', key, bg: effBg(root), pt: padPx(root, 'Top'), pb: padPx(root, 'Bottom') })
      return
    }
    const hit = photoAt(e.clientX, e.clientY)
    if (!hit || hit.key !== key) { clearSel(); setBoxSel(null, '', 'text'); post({ action: 'select', key, bg: effBg(root), pt: padPx(root, 'Top'), pb: padPx(root, 'Bottom') }); return }
    e.preventDefault(); e.stopPropagation()
    if (e.shiftKey) { addSel(frameOf(visualOf(hit.el), root), 'f:' + photoId(hit.key, heroOne(root) ? 0 : hit.idx), 'frame'); return }
    const again = !!selPhoto && selPhoto.key === hit.key && selPhoto.idx === hit.idx
    clearSel()
    selPhoto = hit
    visualOf(hit.el).classList.add('cam-psel')
    setBoxSel(frameOf(visualOf(hit.el), root), 'f:' + photoId(hit.key, heroOne(root) ? 0 : hit.idx), 'frame')
    post({ action: 'photo', key: hit.key, idx: hit.idx, again, bg: effBg(root), pt: padPx(root, 'Top'), pb: padPx(root, 'Bottom'), multi: !heroOne(root) })
  }
  const onDbl = (e: MouseEvent) => {
    const t = e.target as HTMLElement | null
    if (!t || !t.closest || bar.contains(t) || t.closest(TXT) || editing(t) || t.closest('#cam-box')) return
    const root = rootOf(t)
    if (!root) return
    const hit = photoAt(e.clientX, e.clientY)
    if (!hit || hit.key !== rootKey(root)) return
    e.preventDefault()
    post({ action: 'photo', key: hit.key, idx: hit.idx, again: true, open: true, bg: effBg(root), pt: padPx(root, 'Top'), pb: padPx(root, 'Bottom'), multi: !heroOne(root) })
  }
  const parsePos = (el: HTMLElement): [number, number] => {
    const m = /(-?[\d.]+)%\s+(-?[\d.]+)%/.exec(el.style.objectPosition || '')
    return m ? [Number(m[1]), Number(m[2])] : [50, 50]
  }
  const dragTargets = (d: { el: HTMLElement; key: string }): HTMLElement[] => {
    const root = rootOf(d.el)
    return (d.key === 'hero' && root && heroOne(root) ? photosIn(root) : [d.el]).map(visualOf)
  }
  const onPDown = (e: PointerEvent) => {
    if (e.button !== 0 || !selPhoto) return
    const t = e.target as HTMLElement | null
    if (!t || !t.closest || bar.contains(t) || hT.contains(t) || hB.contains(t) || t.closest(TXT) || editing(t)) return
    if (t.hasAttribute('data-pframe')) return
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
  const padPx = (root: HTMLElement | null, side: 'Top' | 'Bottom'): number => (root ? Math.round(parseFloat((getComputedStyle(root) as any)['padding' + side]) || 0) : 0)
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
    if (!heroOne(root)) photosIn(root).forEach((ph) => others.push(frameOf(visualOf(ph), root)))
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
  const cornerH = [
    mkH('nw', 'nwse-resize', 'left:-8px;top:-8px'),
    mkH('ne', 'nesw-resize', 'right:-8px;top:-8px'),
    mkH('sw', 'nesw-resize', 'left:-8px;bottom:-8px'),
    mkH('se', 'nwse-resize', 'right:-8px;bottom:-8px'),
  ]
  const sideH = [
    mkH('w', 'ew-resize', 'left:-8px;top:calc(50% - 7px)'),
    mkH('e', 'ew-resize', 'right:-8px;top:calc(50% - 7px)'),
  ]
  const vertH = [
    mkH('n', 'ns-resize', 'top:-8px;left:calc(50% - 7px)'),
    mkH('s', 'ns-resize', 'bottom:-8px;left:calc(50% - 7px)'),
  ]
  const rotH = document.createElement('div')
  rotH.dataset.c = 'rot'
  rotH.title = 'Rotate'
  rotH.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6b4a2b" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/></svg>'
  rotH.style.cssText = 'position:absolute;left:calc(50% - 12px);bottom:-36px;width:24px;height:24px;display:flex;align-items:center;justify-content:center;background:#fff;border:2px solid #d9a21b;border-radius:50%;cursor:grab;pointer-events:auto;box-shadow:0 1px 5px rgba(0,0,0,.25)'
  bx.appendChild(rotH)
  const tb = document.createElement('div')
  tb.style.cssText = 'position:absolute;right:-1.5px;top:-26px;height:26px;display:flex;align-items:stretch;background:#1f1a14;border-radius:7px 7px 0 0;overflow:hidden;pointer-events:auto'
  const tbBtn = (c: string, title: string, d: string) => {
    const b = document.createElement('div')
    b.dataset.c = c
    b.title = title
    b.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none"><path d="' + d + '"/></svg>'
    b.style.cssText = 'width:30px;display:flex;align-items:center;justify-content:center;color:#fff;cursor:' + (c === 'move' ? 'move' : 'pointer')
    tb.appendChild(b)
    return b
  }
  const gb = document.createElement('div')
  gb.dataset.c = 'grp'
  gb.style.cssText = 'display:none;align-items:center;padding:0 11px;color:#fff;font:600 11px system-ui,sans-serif;cursor:pointer;border-right:1px solid rgba(255,255,255,.22);white-space:nowrap'
  tb.appendChild(gb)
  const mv = tbBtn('move', 'Move', 'M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20')
  const xb = tbBtn('del', 'Remove', 'M6 6l12 12M18 6L6 18')
  bx.appendChild(tb)
  document.body.appendChild(bx)
  let extras: Sel[] = []
  const xbs: HTMLElement[] = []
  const allSel = (): Sel[] => (selBox ? [selBox, ...extras] : [])
  const groupsNow = (): string[][] => { try { const v = JSON.parse(document.body.dataset.camGroups || '[]'); return Array.isArray(v) ? v : [] } catch { return [] } }
  const isGroupSel = () => {
    const ids = allSel().map((q) => q.id)
    return groupsNow().some((g) => g.length === ids.length && ids.every((i) => g.includes(i)))
  }
  const byId = (id: string): Sel | null => {
    for (const root of roots()) {
      const key = rootKey(root)
      if (!key) continue
      const bl = boxesIn(root)
      for (let i = 0; i < bl.length; i++) if (boxId(key, i) === id) return { el: bl[i], id, kind: 'text' }
      const rl = rulesIn(root)
      for (let i = 0; i < rl.length; i++) if (ruleId(key, i) === id) return { el: rl[i], id, kind: 'text' }
      { const ps = photosIn(root); for (let i = 0; i < ps.length; i++) if ('f:' + photoId(key, i) === id) return { el: frameOf(visualOf(ps[i]), root), id, kind: 'frame' } }
    }
    return null
  }
  const groupMates = (id: string): Sel[] => {
    const g = groupsNow().find((q) => q.includes(id))
    if (!g) return []
    return g.filter((q) => q !== id).map(byId).filter((q): q is Sel => !!q)
  }
  let lastSelEl: HTMLElement | null = null
  const angOf = (el: HTMLElement): number => {
    let a = 0
    for (let n: HTMLElement | null = el; n && n !== document.body; n = n.parentElement) {
      const cs = getComputedStyle(n)
      if (cs.transform && cs.transform !== 'none') { try { const m = new DOMMatrix(cs.transform); a += Math.atan2(m.b, m.a) } catch { /* ignore */ } }
      const rv = (cs as any).rotate as string | undefined
      if (rv && rv !== 'none') { const q = parseFloat(rv); if (Number.isFinite(q)) a += rv.endsWith('rad') ? q : q * Math.PI / 180 }
    }
    return a * 180 / Math.PI
  }
  const layoutBox = () => {
    const nowEl = selBox && document.body.contains(selBox.el) ? selBox.el : null
    if (nowEl !== lastSelEl) { if (lastSelEl) lastSelEl.removeAttribute('data-cam-bsel'); if (nowEl) nowEl.setAttribute('data-cam-bsel', '1'); lastSelEl = nowEl }
    if (!selBox || !document.body.contains(selBox.el)) { bx.style.display = 'none'; return }
    const r = selBox.el.getBoundingClientRect()
    const isRule = selBox.el.hasAttribute('data-cam-rule')
    if (isRule ? (r.width < 2 && r.height < 2) : (r.width < 4 || r.height < 4)) { bx.style.display = 'none'; return }
    const thin = isRule && (r.width <= 8 || r.height <= 8)
    const ldir = lineDir(selBox.el)
    bx.style.display = 'block'
    const f0 = curFx(selBox.el)
    const ang = angOf(selBox.el)
    if (Math.abs(ang) > 0.05) {
      const bw = selBox.el.offsetWidth * (f0.s || 1)
      const bh = selBox.el.offsetHeight * (f0.s || 1)
      bx.style.left = (r.left + r.width / 2 - bw / 2) + 'px'; bx.style.top = (r.top + r.height / 2 - bh / 2) + 'px'; bx.style.width = bw + 'px'; bx.style.height = bh + 'px'
      bx.style.transform = 'rotate(' + ang + 'deg)'
    } else {
      bx.style.left = r.left + 'px'; bx.style.top = r.top + 'px'; bx.style.width = r.width + 'px'; bx.style.height = r.height + 'px'
      bx.style.transform = ''
    }
    const multi = extras.length > 0
    rotH.style.display = multi ? 'none' : 'flex'
    mv.style.display = selBox.kind === 'frame' ? 'flex' : 'none'
    cornerH.forEach((h) => { h.style.display = !multi && !thin ? 'block' : 'none' })
    sideH.forEach((h) => { h.style.display = !multi && (!thin || ldir === 'h') ? 'block' : 'none' })
    vertH.forEach((h) => { h.style.display = !multi && (thin ? ldir === 'v' : (selBox!.kind === 'frame' || !!selBox!.el.dataset.addp)) ? 'block' : 'none' })
    ;[...cornerH, ...sideH, ...vertH].forEach((h) => { h.style.borderRadius = thin ? '50%' : '3px'; h.style.width = h.style.height = thin ? '16px' : '12px' })
    rotH.style.bottom = thin && ldir === 'v' ? 'auto' : '-36px'
    gb.style.display = multi ? 'flex' : 'none'
    if (multi) gb.textContent = isGroupSel() ? 'Ungroup' : 'Group'
    while (xbs.length < extras.length) { const d = document.createElement('div'); d.style.cssText = 'position:fixed;z-index:2147482000;border:1.5px solid #d9a21b;pointer-events:none'; document.body.appendChild(d); xbs.push(d) }
    xbs.forEach((d, i) => {
      const x = extras[i]
      if (!x || !document.body.contains(x.el)) { d.style.display = 'none'; return }
      const q = x.el.getBoundingClientRect()
      d.style.display = 'block'
      d.style.left = q.left + 'px'; d.style.top = q.top + 'px'; d.style.width = q.width + 'px'; d.style.height = q.height + 'px'
    })
    const lo = r.top < 40
    tb.style.top = lo ? 'auto' : '-26px'
    tb.style.bottom = lo ? '-26px' : 'auto'
    tb.style.borderRadius = lo ? '0 0 7px 7px' : '7px 7px 0 0'
  }
  const hideSelected = () => {
    if (!selBox) return
    const sl = selBox
    if (extras.length > 0) {
      allSel().forEach((q) => { const ad = q.el.dataset.addon; if (ad) post({ action: 'deladdon', id: ad }) })
      const list = allSel().map((q) => { const f0 = curFx(q.el); setBox(q.el, { ...f0, h: 1 }); return { id: q.id, x: f0.x, y: f0.y, s: f0.s, w: f0.w, v: f0.v, r: f0.r, h: 1 } })
      post({ action: 'boxfxs', list })
      selBox = null
      extras = []
      post({ action: 'box', id: '' })
      layoutBox()
      return
    }
    const f = curFx(sl.el)
    if (sl.el.dataset.addon) post({ action: 'deladdon', id: sl.el.dataset.addon })
    setBox(sl.el, { ...f, h: 1 })
    post({ action: 'boxfx', id: sl.id, x: f.x, y: f.y, s: f.s, w: f.w, v: f.v, r: f.r, h: 1 })
    selBox = null
    post({ action: 'box', id: '' })
    layoutBox()
  }
  const setBoxSel = (el: HTMLElement | null, id: string, kind: 'text' | 'frame') => {
    selBox = el ? { el, id, kind } : null
    extras = el ? groupMates(id) : []
    post({ action: 'box', id: el ? id : '', ap: el ? el.dataset.addp ?? '' : '', ln: el ? lineDir(el) : '' })
    layoutBox()
  }
  const addSel = (el: HTMLElement, id: string, kind: 'text' | 'frame') => {
    if (!selBox) { setBoxSel(el, id, kind); return }
    const cur = allSel()
    if (cur.some((q) => q.id === id)) {
      const rest = cur.filter((q) => q.id !== id)
      selBox = rest[0] ?? null
      extras = rest.slice(1)
      post({ action: 'box', id: selBox ? selBox.id : '', ap: selBox ? selBox.el.dataset.addp ?? '' : '', ln: selBox ? lineDir(selBox.el) : '' })
    } else {
      extras = [...extras, { el, id, kind }, ...groupMates(id).filter((m) => !cur.some((q) => q.id === m.id))]
    }
    layoutBox()
  }
  const toggleGroup = () => {
    const ids = allSel().map((q) => q.id)
    let gs = groupsNow()
    const same = gs.findIndex((g) => g.length === ids.length && ids.every((i) => g.includes(i)))
    if (same >= 0) gs = gs.filter((_, i) => i !== same)
    else gs = [...gs.map((g) => g.filter((i) => !ids.includes(i))).filter((g) => g.length > 1), ids]
    document.body.dataset.camGroups = JSON.stringify(gs)
    post({ action: 'groups', list: gs })
    layoutBox()
  }
  const ruleAt = (root: HTMLElement, x: number, y: number): { el: HTMLElement; id: string } | null => {
    const key = rootKey(root)
    const list = rulesIn(root)
    for (let i = 0; i < list.length; i++) {
      const r = list[i].getBoundingClientRect()
      if (r.width < 2 && r.height < 2) continue
      if (x >= r.left - 8 && x <= r.right + 8 && y >= r.top - 8 && y <= r.bottom + 8) return { el: list[i], id: ruleId(key, i) }
    }
    return null
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
    const mw = el.dataset.bxw !== undefined ? /(-?[\d.]+)vw/.exec(el.style.width || '') : null
    const mv = el.dataset.bxv !== undefined ? /(-?[\d.]+)vw/.exec(el.style.height || '') : null
    return { x: m ? Number(m[1]) : 0, y: m ? Number(m[2]) : 0, s: Number(el.style.getPropertyValue('scale')) || 1, w: mw ? Number(mw[1]) : 0, v: mv ? Number(mv[1]) : 0, r: Number((/(-?[\d.]+)deg/.exec(el.style.getPropertyValue('rotate') || '') ?? [])[1]) || 0 }
  }
  type Fx = { x: number; y: number; s: number; w: number; v: number; r: number }
  let g: { mode: 'rs' | 'mv' | 'rw' | 'rh' | 'rot'; h0: number; t0: number; b0: number; sel: Sel; x0: number; y0: number; fx: Fx; cx: number; cy: number; d0: number; moved: boolean; root: HTMLElement | null; tg: Tg | null; others: { sel: Sel; fx: Fx }[]; side: string; l0: number; r0: number; w0: number; a0?: number } | null = null
  const othersFor = (sel: Sel): { sel: Sel; fx: Fx }[] => {
    const cur = allSel()
    const mates = cur.some((q) => q.id === sel.id) ? cur.filter((q) => q.id !== sel.id) : groupMates(sel.id)
    return mates.map((q) => ({ sel: q, fx: curFx(q.el) }))
  }
  const vwPx = () => Math.max(1, document.documentElement.clientWidth) / 100
  const onGDown = (e: PointerEvent) => {
    if (e.button !== 0) return
    const t = e.target as HTMLElement | null
    if (!t || !t.closest || bar.contains(t) || hT.contains(t) || hB.contains(t)) return
    if (editing(t)) return
    const hd = t.closest('#cam-box [data-c]') as HTMLElement | null
    if (hd && hd.dataset.c === 'del') { e.preventDefault(); hideSelected(); return }
    if (hd && hd.dataset.c === 'grp') { e.preventDefault(); toggleGroup(); return }
    if (hd && selBox) {
      e.preventDefault()
      const r = selBox.el.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      const c = hd.dataset.c as string
      g = { mode: c === 'move' ? 'mv' : c === 'rot' ? 'rot' : c === 'w' || c === 'e' ? 'rw' : c === 'n' || c === 's' ? 'rh' : 'rs', a0: Math.atan2(e.clientY - cy, e.clientX - cx), sel: selBox, x0: e.clientX, y0: e.clientY, fx: curFx(selBox.el), cx, cy, d0: Math.max(8, Math.hypot(e.clientX - cx, e.clientY - cy)), moved: true, root: rootOf(selBox.el), tg: null, others: c === 'move' ? othersFor(selBox) : [], side: c, l0: r.left, r0: r.right, w0: selBox.el.offsetWidth / vwPx(), h0: selBox.el.offsetHeight / vwPx(), t0: r.top, b0: r.bottom }
      document.body.style.userSelect = 'none'
      return
    }
    if (bx.contains(t)) return
    let tb = t.closest(TXT_SEL) as HTMLElement | null
    const root = rootOf(t)
    if (!tb && root) tb = boxesIn(root).find((x) => x === t || x.contains(t)) ?? null
    if (root && !tb) {
      const ru = ruleAt(root, e.clientX, e.clientY)
      if (ru) {
        g = { mode: 'mv', sel: { el: ru.el, id: ru.id, kind: 'text' }, x0: e.clientX, y0: e.clientY, fx: curFx(ru.el), cx: 0, cy: 0, d0: 1, moved: false, root, tg: null, others: othersFor({ el: ru.el, id: ru.id, kind: 'text' }), side: '', l0: 0, r0: 0, w0: 0, h0: 0, t0: 0, b0: 0 }
        return
      }
    }
    if (!tb || !root) return
    const key = rootKey(root)
    const list = boxesIn(root)
    const i = list.findIndex((x) => x === tb || x.contains(tb))
    if (i < 0) return
    g = { mode: 'mv', sel: { el: list[i], id: boxId(key, i), kind: 'text' }, x0: e.clientX, y0: e.clientY, fx: curFx(list[i]), cx: 0, cy: 0, d0: 1, moved: false, root, tg: null, others: othersFor({ el: list[i], id: boxId(key, i), kind: 'text' }), side: '', l0: 0, r0: 0, w0: 0, h0: 0, t0: 0, b0: 0 }
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
      setBox(g.sel.el, { x: nx, y: ny, s: g.fx.s, w: g.fx.w, v: g.fx.v, r: g.fx.r })
      if (g.root) {
        if (!g.tg) g.tg = targetsFor(g.sel, g.root)
        const sn = snapOf(g.sel.el, g.tg)
        if (sn.dx !== null || sn.dy !== null) {
          nx += (sn.dx ?? 0) / vwPx()
          ny += (sn.dy ?? 0) / vwPx()
          setBox(g.sel.el, { x: nx, y: ny, s: g.fx.s, w: g.fx.w, v: g.fx.v, r: g.fx.r })
        }
        drawGuides(sn, g.root)
      }
      for (const o of g.others) setBox(o.sel.el, { x: o.fx.x + (nx - g.fx.x), y: o.fx.y + (ny - g.fx.y), s: o.fx.s, w: o.fx.w, v: o.fx.v, r: o.fx.r })
    } else if (g.mode === 'rot') {
      let nr = g.fx.r + (Math.atan2(e.clientY - g.cy, e.clientX - g.cx) - (g.a0 ?? 0)) * 180 / Math.PI
      nr = ((nr + 540) % 360) - 180
      const sn = Math.round(nr / 15) * 15
      if (Math.abs(nr - sn) < 4) nr = sn
      setBox(g.sel.el, { x: g.fx.x, y: g.fx.y, s: g.fx.s, w: g.fx.w, v: g.fx.v, r: nr })
    } else if (g.mode === 'rw' || g.mode === 'rh') {
      const el = g.sel.el
      const pic = g.sel.kind === 'frame' || !!el.dataset.addp
      const sc = g.fx.s || 1
      const th = angOf(el) * Math.PI / 180
      const horiz = g.mode === 'rw'
      const ax = horiz ? Math.cos(th) : -Math.sin(th)
      const ay = horiz ? Math.sin(th) : Math.cos(th)
      const sg = g.side === 'e' || g.side === 's' ? 1 : -1
      const dl = (dx * ax + dy * ay) / sc / vwPx()
      const n0 = horiz ? g.w0 : g.h0
      const nn = Math.max(horiz ? 0.6 : 4, n0 + sg * dl)
      const ww = horiz ? nn : pic ? g.w0 : g.fx.w
      const vv = horiz ? (pic ? g.h0 : g.fx.v) : nn
      setBox(el, { x: g.fx.x, y: g.fx.y, s: g.fx.s, w: ww, v: vv, r: g.fx.r })
      const rr = el.getBoundingClientRect()
      const half0 = n0 * vwPx() * sc / 2
      const half1 = nn * vwPx() * sc / 2
      const tx = g.cx - sg * ax * half0 + sg * ax * half1
      const ty = g.cy - sg * ay * half0 + sg * ay * half1
      setBox(el, { x: g.fx.x + (tx - (rr.left + rr.width / 2)) / vwPx(), y: g.fx.y + (ty - (rr.top + rr.height / 2)) / vwPx(), s: g.fx.s, w: ww, v: vv, r: g.fx.r })
    } else {
      const d = Math.hypot(e.clientX - g.cx, e.clientY - g.cy)
      setBox(g.sel.el, { x: g.fx.x, y: g.fx.y, s: Math.min(6, Math.max(0.2, g.fx.s * (d / g.d0))), w: g.fx.w, v: g.fx.v, r: g.fx.r })
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
    post({ action: 'box', id: d.sel.id, ap: d.sel.el.dataset.addp ?? '', ln: lineDir(d.sel.el) })
    const rec = (id: string, q: { x: number; y: number; s: number; w: number; v: number; r: number }) => ({ id, x: Math.round(q.x * 100) / 100, y: Math.round(q.y * 100) / 100, s: Math.round(q.s * 1000) / 1000, w: Math.round(q.w * 100) / 100, v: Math.round(q.v * 100) / 100, r: Math.round(q.r * 10) / 10 })
    if (d.others.length > 0) post({ action: 'boxfxs', list: [rec(d.sel.id, f), ...d.others.map((o) => rec(o.sel.id, curFx(o.sel.el)))] })
    else post({ action: 'boxfx', ...rec(d.sel.id, f) })
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
    try { h.setPointerCapture(e.pointerId) } catch { /* ignore */ }
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
    padHold = performance.now() + 1200
    show(el)
    const kill = (ev: Event) => { ev.stopImmediatePropagation(); ev.preventDefault() }
    window.addEventListener('click', kill, true)
    setTimeout(() => window.removeEventListener('click', kill, true), 80)
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
  document.addEventListener('dblclick', onDbl, true)
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
  const onCmd = (e: MessageEvent) => {
    const d = e.data
    if (!d || d.type !== 'camrhia-secmove') return
    const key = String(d.key ?? '')
    const o = ord()
    const i = o.indexOf(key)
    if (i < 0) return
    const vis = secs().filter(seen).map((x) => o.indexOf(x.dataset.sec as string))
    const j = d.dir === 'up' ? [...vis].reverse().find((v) => v < i) : vis.find((v) => v > i)
    if (j !== undefined) post({ action: 'move', key, order: o, to: j })
  }
  window.addEventListener('message', onCmd)
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
    window.removeEventListener('message', onCmd)
    bar.removeEventListener('pointerdown', onDown)
    document.removeEventListener('pointermove', onDragMove)
    document.removeEventListener('pointerup', onUp)
    bar.remove(); line.remove(); hT.remove(); hB.remove(); css.remove()
  }
}
