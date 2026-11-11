export function installPreviewSections(): () => void {
  if (typeof window === 'undefined') return () => {}
  if (new URLSearchParams(window.location.search).get('preview') !== '1') return () => {}

  const css = document.createElement('style')
  css.textContent =
    '[data-sec].cam-hot{outline:2px solid rgba(217,162,27,.75);outline-offset:-2px}' +
    '#cam-sec-bar{position:fixed;z-index:2147483000;display:none;gap:2px;padding:4px;background:#fff;border-radius:10px;box-shadow:0 8px 28px rgba(0,0,0,.25);font:500 12px system-ui,sans-serif}' +
    '#cam-sec-bar button{all:unset;cursor:pointer;padding:6px 10px;border-radius:7px;color:#2a1f24}' +
    '#cam-sec-bar button:hover{background:#f1ece6}' +
    '#cam-sec-line{position:fixed;z-index:2147483000;height:3px;background:#d9a21b;border-radius:2px;display:none;left:0;right:0;pointer-events:none}'
  document.head.appendChild(css)

  const bar = document.createElement('div')
  bar.id = 'cam-sec-bar'
  bar.innerHTML = '<button data-a="drag" style="cursor:grab">Drag</button><button data-a="up">Up</button><button data-a="down">Down</button><button data-a="hide">Hide</button>'
  document.body.appendChild(bar)
  const line = document.createElement('div')
  line.id = 'cam-sec-line'
  document.body.appendChild(line)

  const secs = () => Array.from(document.querySelectorAll<HTMLElement>('[data-sec]'))
  const ord = () => secs().map((x) => x.dataset.sec as string)
  const seen = (x: HTMLElement) => x.offsetHeight > 30
  let cur: HTMLElement | null = null
  let dragging = false
  let dragKey = ''
  let before = -1

  const post = (m: Record<string, unknown>) => window.parent?.postMessage({ type: 'camrhia-section', ...m }, '*')

  const show = (el: HTMLElement | null) => {
    if (cur && cur !== el) cur.classList.remove('cam-hot')
    cur = el
    if (!el) { bar.style.display = 'none'; return }
    el.classList.add('cam-hot')
    const r = el.getBoundingClientRect()
    bar.style.display = 'flex'
    bar.style.top = Math.min(Math.max(8, r.top + 8), window.innerHeight - 50) + 'px'
    bar.style.right = '16px'
  }

  const onMove = (e: MouseEvent) => {
    if (dragging) return
    const t = e.target as HTMLElement | null
    if (!t || !t.closest || bar.contains(t)) return
    const el = t.closest('[data-sec]') as HTMLElement | null
    show(el && seen(el) ? el : null)
  }
  const onLeave = () => { if (!dragging) show(null) }
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

  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseleave', onLeave)
  window.addEventListener('scroll', onScroll, true)
  bar.addEventListener('click', onBarClick)
  bar.addEventListener('pointerdown', onDown)
  document.addEventListener('pointermove', onDragMove)
  document.addEventListener('pointerup', onUp)
  return () => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseleave', onLeave)
    window.removeEventListener('scroll', onScroll, true)
    bar.removeEventListener('click', onBarClick)
    bar.removeEventListener('pointerdown', onDown)
    document.removeEventListener('pointermove', onDragMove)
    document.removeEventListener('pointerup', onUp)
    bar.remove(); line.remove(); css.remove()
  }
}
