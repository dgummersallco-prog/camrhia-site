export function installPreviewGlow(): () => void {
  if (typeof window === 'undefined') return () => {}
  if (new URLSearchParams(window.location.search).get('preview') !== '1') return () => {}

  const css = document.createElement('style')
  css.textContent = `
@property --cr-a { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
@keyframes cr-spin { to { --cr-a: 360deg; } }
.cr-glow {
  position: absolute; pointer-events: none; z-index: 2147483000; box-sizing: border-box; border-radius: 10px; display: none;
  border: 3px dashed #d9a21b;
  filter: drop-shadow(0 0 1px #fff) drop-shadow(0 0 2px rgba(0,0,0,0.55));
}
.cr-glow::after {
  content: ''; position: absolute; inset: -3px; box-sizing: border-box; padding: 4px; border-radius: 12px;
  background: conic-gradient(from var(--cr-a), rgba(255,236,190,0) 0deg, rgba(255,236,190,0) 255deg, rgba(240,200,110,0.85) 318deg, #ffffff 352deg, rgba(255,236,190,0) 360deg);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude;
  animation: cr-spin 5s linear infinite;
  filter: drop-shadow(0 0 7px rgba(240,190,90,0.95));
}`
  document.head.appendChild(css)

  const glow = document.createElement('div')
  glow.className = 'cr-glow'
  document.body.appendChild(glow)

  let targetId: string | null = null
  let target: HTMLElement | null = null
  let raf = 0
  const tick = () => {
    target = targetId ? document.getElementById(targetId) : null
    if (target) {
      const r = target.getBoundingClientRect()
      glow.style.display = 'block'
      const vw = document.documentElement.clientWidth
      const full = target.dataset.glow === 'full'
      const gl = full ? window.scrollX + 6 : Math.max(window.scrollX + 6, r.left + window.scrollX - 4)
      const gr = full ? window.scrollX + vw - 6 : Math.min(window.scrollX + vw - 6, r.right + window.scrollX + 4)
      glow.style.left = gl + 'px'
      let topV = r.top
      if (target.id === 'top') { const nv = document.getElementById('nav'); if (nv) topV = Math.max(topV, nv.getBoundingClientRect().bottom) }
      let dy = 0
      if (target.id === 'nav') { dy = parseFloat(getComputedStyle(target).getPropertyValue('--menuy')) || 0 }
      const gt = Math.max(6, topV + dy + window.scrollY - 4)
      glow.style.top = gt + 'px'
      glow.style.width = Math.max(0, gr - gl) + 'px'
      glow.style.height = Math.max(0, r.bottom + window.scrollY + 4 - gt) + 'px'
    } else {
      glow.style.display = 'none'
    }
    raf = requestAnimationFrame(tick)
  }

  function onMsg(e: MessageEvent) {
    const d = e.data as { type?: string; id?: string } | null
    if (!d) return
    if (d.type === 'camrhia-outline') targetId = d.id || null
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
