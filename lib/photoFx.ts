export type PhotoFx = { x?: number; y?: number; z?: number; o?: number; bg?: string }

const SEL = '[data-sec], header#top, section[id]'

export function rootKey(el: HTMLElement): string {
  const ds = el.getAttribute('data-sec')
  if (ds) return ds
  if (el.tagName === 'HEADER' && el.id === 'top') return 'hero'
  return el.id
}

export function rootOf(t: Element | null): HTMLElement | null {
  if (!t || !t.closest) return null
  const a = t.closest('[data-sec]') as HTMLElement | null
  if (a) return a
  const b = t.closest('header#top') as HTMLElement | null
  if (b) return b
  return t.closest('section[id]') as HTMLElement | null
}

export function roots(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(SEL)).filter((el) => {
    if (el.hasAttribute('data-sec')) return true
    return !el.parentElement?.closest('[data-sec]')
  })
}

export function photosIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('img, svg[preserveAspectRatio]')).filter((x) => x.offsetWidth > 60 && x.offsetHeight > 60)
}

export const photoId = (key: string, idx: number) => (key === 'hero' ? 'hero' : key + ':' + idx)

const num = (v: unknown, lo: number, hi: number): number | null => {
  const n = Number(v)
  return Number.isFinite(n) && v !== null && v !== '' && v !== undefined ? Math.min(hi, Math.max(lo, n)) : null
}

function setFx(p: HTMLElement, f: PhotoFx | undefined) {
  const st = p.style
  const par = p.parentElement
  if (!f || (f.x === undefined && f.y === undefined && f.z === undefined && f.o === undefined && !f.bg)) {
    if (p.dataset.fx !== undefined) {
      st.transform = ''
      st.filter = ''
      st.transformOrigin = ''
      if (p.dataset.fxop !== undefined) st.objectPosition = p.dataset.fxop
      delete p.dataset.fx
      delete p.dataset.fxop
      if (par && par.dataset.fxbg !== undefined) {
        par.style.background = par.dataset.fxbg === '-' ? '' : par.dataset.fxbg
        delete par.dataset.fxbg
      }
      if (par && par.dataset.fxov !== undefined) {
        par.style.overflow = par.dataset.fxov === '-' ? '' : par.dataset.fxov
        delete par.dataset.fxov
      }
    }
    return
  }
  if (p.dataset.fx === undefined) { p.dataset.fx = '1'; p.dataset.fxop = st.objectPosition }
  const x = num(f.x, 0, 100)
  const y = num(f.y, 0, 100)
  const z = num(f.z, 1, 3) ?? 1
  const o = num(f.o, 0.05, 1) ?? 1
  if (x !== null || y !== null) {
    const pos = (x ?? 50) + '% ' + (y ?? 50) + '%'
    st.objectPosition = pos
    st.transformOrigin = pos
  }
  st.transform = z > 1.001 ? 'scale(' + z + ')' : ''
  st.filter = o < 0.999 ? 'opacity(' + o + ')' : ''
  if (par) {
    if (z > 1.001) { if (par.dataset.fxov === undefined) par.dataset.fxov = par.style.overflow || '-'; par.style.overflow = 'hidden' }
    if (/^#[0-9a-fA-F]{6}$/.test(String(f.bg ?? ''))) {
      if (par.dataset.fxbg === undefined) par.dataset.fxbg = par.style.background || '-'
      par.style.background = f.bg as string
    } else if (par.dataset.fxbg !== undefined) {
      par.style.background = par.dataset.fxbg === '-' ? '' : par.dataset.fxbg
      delete par.dataset.fxbg
    }
  }
}

export function applyPhotoFx(fx: Record<string, PhotoFx> | undefined | null) {
  if (typeof document === 'undefined') return
  const map = fx ?? {}
  for (const el of roots()) {
    const key = rootKey(el)
    if (!key) continue
    const list = photosIn(el)
    list.forEach((p, i) => setFx(p, map[photoId(key, i)]))
  }
}
