export function installPreviewGlow(): () => void {
  if (typeof window === 'undefined') return () => {}
  if (new URLSearchParams(window.location.search).get('preview') !== '1') return () => {}

  const css = document.createElement('style')
  css.textContent = `
@property --cr-a { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
@keyframes cr-spin { to { --cr-a: 360deg; } }
.cr-glow {
  position: absolute; pointer-events: none; z-index: 2147483000; box-sizing: border-box; padding: 3px; border-radius: 10px; display: none;
  background: conic-gradient(from var(--cr-a), rgba(176,141,87,0.35) 0deg, rgba(176,141,87,0.35) 230deg, rgba(176,141,87,0.9) 310deg, #fff2cf 350deg, rgba(176,141,87,0.35) 360deg);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude;
  animation: cr-spin 2.6s linear infinite;
  filter: drop-shadow(0 0 6px rgba(176,141,87,0.55));
}`
  document.head.appendChild(css)

  const glow = document.createElement('div')
  glow.className = 'cr-glow'
  document.body.appendChild(glow)

  let target: HTMLElement | null = null
  let raf = 0
  const tick = () => {
    if (target && document.body.contains(target)) {
      const r = target.getBoundingClientRect()
      glow.style.display = 'block'
      glow.style.left = r.left + window.scrollX - 4 + 'px'
      glow.style.top = r.top + window.scrollY - 4 + 'px'
      glow.style.width = r.width + 8 + 'px'
      glow.style.height = r.height + 8 + 'px'
    } else {
      glow.style.display = 'none'
    }
    raf = requestAnimationFrame(tick)
  }

  function onMsg(e: MessageEvent) {
    const d = e.data as { type?: string; id?: string } | null
    if (!d) return
    if (d.type === 'camrhia-outline') target = d.id ? document.getElementById(d.id) : null
    if (d.type === 'camrhia-scroll' && d.id) {
      const el = document.getElementById(d.id)
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 64, behavior: 'smooth' })
    }
  }
  window.addEventListener('message', onMsg)
  raf = requestAnimationFrame(tick)

  return () => {
    cancelAnimationFrame(raf)
    window.removeEventListener('message', onMsg)
    css.remove()
    glow.remove()
  }
}
