import { safeJs } from './safeJs'

// Runs Camri's code on a photographer's site. The code gets a "camri" helper:
//   camri.layer()        a fixed, full-screen, click-through box for canvases and decorations
//   camri.onCleanup(fn)  called when the code is replaced or the page closes
//   camri.reduceMotion   true when the visitor asked for less motion
export function runSiteJs(code: string): () => void {
  const clean = safeJs(code)
  if (!clean) return () => {}
  const cleanups: (() => void)[] = []
  const layers: HTMLElement[] = []
  const camri = {
    layer(): HTMLElement {
      const d = document.createElement('div')
      d.setAttribute('data-camri-layer', '')
      d.style.cssText = 'position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:40'
      document.body.appendChild(d)
      layers.push(d)
      return d
    },
    onCleanup(fn: () => void) { if (typeof fn === 'function') cleanups.push(fn) },
    reduceMotion: typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  }
  ;(window as any).__camri = camri
  const el = document.createElement('script')
  el.textContent = '(function(camri){try{' + clean + '\n}catch(e){}})(window.__camri)'
  document.body.appendChild(el)
  el.remove()
  delete (window as any).__camri
  return () => {
    cleanups.forEach((f) => { try { f() } catch { /* ignore */ } })
    layers.forEach((l) => l.remove())
  }
}
