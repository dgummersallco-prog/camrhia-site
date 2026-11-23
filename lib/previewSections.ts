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
  let padDrag: { side: string; y0: number; t0: number; b0: number; el: HTMLElement; inner: HTMLElement } | null = null
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

  const photoEls = (sec: HTMLElement) => Array.from(sec.querySelectorAll<HTMLElement>('img, svg[preserveAspectRatio]')).filter((x) => x.offsetWidth > 60 && x.offsetHeight > 60)
  const onPhotoClick = (e: MouseEvent) => {
    const t = e.target as HTMLElement | null
    if (!t || !t.closest || bar.contains(t)) return
    const sec = t.closest('[data-sec]') as HTMLElement | null
    const isText = !!t.closest('[class^="el-"], [class*=" el-"]')
    if (!sec) {
      const hero = t.closest('#top')
      if (!hero) return
      if (t.closest('a')) e.preventDefault()
      if (isText) return
      e.preventDefault(); e.stopPropagation()
      post({ action: 'photo', key: 'hero', idx: 0 })
      return
    }
    if (t.closest('a')) e.preventDefault()
    if (isText) return
    const list = photoEls(sec)
    const hit = document.elementsFromPoint(e.clientX, e.clientY).find((x) => list.includes(x as HTMLElement))
    if (!hit) { post({ action: 'select', key: sec.dataset.sec as string }); return }
    e.preventDefault(); e.stopPropagation()
    post({ action: 'photo', key: sec.dataset.sec as string, idx: list.indexOf(hit as HTMLElement) })
  }
  const onHDown = (e: PointerEvent) => {
    const h = (e.target as HTMLElement).closest('.cam-h') as HTMLElement | null
    if (!h || !cur) return
    e.preventDefault()
    const inner = cur.firstElementChild as HTMLElement | null
    if (!inner) return
    padDrag = { side: h.dataset.side as string, y0: e.clientY, t0: Number(cur.dataset.pt || 0), b0: Number(cur.dataset.pb || 0), el: cur, inner }
    document.body.style.userSelect = 'none'
  }
  const onHMove = (e: PointerEvent) => {
    if (!padDrag) return
    const { side, y0, t0, b0, el, inner } = padDrag
    const dy = e.clientY - y0
    const h = inner.offsetHeight
    let t = t0, b = b0
    if (side === 't') t = Math.min(0, Math.max(90 - h - b0, t0 - dy))
    else b = Math.min(0, Math.max(90 - h - t0, b0 + dy))
    el.style.overflow = 'hidden'
    inner.style.marginTop = t ? t + 'px' : ''
    inner.style.marginBottom = b ? b + 'px' : ''
    el.dataset.pt = String(Math.round(t)); el.dataset.pb = String(Math.round(b))
    show(el)
  }
  const onHUp = () => {
    if (!padDrag) return
    const { el } = padDrag
    padDrag = null
    document.body.style.userSelect = ''
    post({ action: 'pad', key: el.dataset.sec as string, t: Number(el.dataset.pt || 0), b: Number(el.dataset.pb || 0) })
  }
  document.addEventListener('pointerdown', onHDown)
  document.addEventListener('pointermove', onHMove)
  document.addEventListener('pointerup', onHUp)
  document.addEventListener('click', onPhotoClick, true)
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseleave', onLeave)
  window.addEventListener('scroll', onScroll, true)
  bar.addEventListener('click', onBarClick)
  bar.addEventListener('pointerdown', onDown)
  document.addEventListener('pointermove', onDragMove)
  document.addEventListener('pointerup', onUp)
  return () => {
    document.removeEventListener('click', onPhotoClick, true)
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
