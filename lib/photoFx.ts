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
  const hero = rootKey(root) === 'hero'
  return Array.from(root.querySelectorAll<HTMLElement>('img, svg[preserveAspectRatio]')).filter((x) => {
    if (x.hasAttribute('data-fxph')) return false
    const isImg = x.tagName.toLowerCase() === 'img'
    const min = hero ? 150 : isImg ? 40 : 60
    if (x.closest('[data-bxh]')) return true
    const w = x.offsetWidth || x.clientWidth || 0
    const h = x.offsetHeight || x.clientHeight || 0
    return w >= min && h >= min
  })
}

export function visualOf(el: HTMLElement): HTMLElement {
  const n = el.nextElementSibling as HTMLElement | null
  return n && n.hasAttribute && n.hasAttribute('data-fxph') ? n : el
}

export const photoId = (key: string, idx: number) => (key === 'hero' ? (idx === 0 ? 'hero' : 'hero:' + idx) : key + ':' + idx)

// A hero that is one picture (or a stacked slideshow) vs. a hero made of several separate pictures (Ivy, etc.).
export function heroOne(root: HTMLElement): boolean {
  if (rootKey(root) !== 'hero') return false
  const l = Array.from(root.querySelectorAll<HTMLElement>('img, svg[preserveAspectRatio]')).filter((x) => !x.hasAttribute('data-fxph') && (x.offsetWidth || x.clientWidth || 0) >= 150 && (x.offsetHeight || x.clientHeight || 0) >= 150)
  if (l.length < 2) return true
  const a = l[0].getBoundingClientRect()
  return l.every((x) => { const b = x.getBoundingClientRect(); return Math.abs(b.left - a.left) < 8 && Math.abs(b.top - a.top) < 8 })
}

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

function setSrc(p: HTMLElement, url: string | null) {
  if (url) {
    if (p.getAttribute('data-fxsrc') === url) return
    if (p.getAttribute('data-fxsrc0') === null) p.setAttribute('data-fxsrc0', p.getAttribute('src') ?? '')
    p.setAttribute('src', url)
    p.removeAttribute('srcset')
    p.setAttribute('data-fxsrc', url)
  } else if (p.getAttribute('data-fxsrc') !== null) {
    p.setAttribute('src', p.getAttribute('data-fxsrc0') ?? '')
    p.removeAttribute('data-fxsrc')
    p.removeAttribute('data-fxsrc0')
  }
}

function setPlaceholder(p: HTMLElement, url: string | null): HTMLElement {
  let ph = p.nextElementSibling as HTMLImageElement | null
  if (ph && !ph.hasAttribute('data-fxph')) ph = null
  if (!url) {
    if (ph) ph.remove()
    p.style.visibility = ''
    return p
  }
  if (!ph) {
    ph = document.createElement('img')
    ph.setAttribute('data-fxph', '1')
    ph.alt = ''
    ph.draggable = false
    ph.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover'
    p.insertAdjacentElement('afterend', ph)
  }
  if (ph.getAttribute('src') !== url) ph.setAttribute('src', url)
  p.style.visibility = 'hidden'
  const par = p.parentElement
  if (par && getComputedStyle(par).position === 'static') par.style.position = 'relative'
  return ph
}

export function applyPhotoFx(fx: Record<string, PhotoFx> | undefined | null, slotPics?: Record<string, string> | null, resolve?: (path: string) => string | null) {
  if (typeof document === 'undefined') return
  const map = fx ?? {}
  document.querySelectorAll('[data-fxph]').forEach((x) => {
    const pv = x.previousElementSibling
    if (!pv || pv.tagName.toLowerCase() !== 'svg') x.remove()
  })
  for (const el of roots()) {
    const key = rootKey(el)
    if (!key) continue
    const list = photosIn(el)
    const one = heroOne(el)
    list.forEach((p, i) => {
      const id = photoId(key, one ? 0 : i)
      const sp = !one && slotPics ? slotPics[key + ':' + i] : undefined
      const url = sp && resolve ? resolve(sp) : null
      let target: HTMLElement = p
      if (p.tagName.toLowerCase() === 'img') setSrc(p, url)
      else target = setPlaceholder(p, url)
      setFx(target, map[id])
    })
  }
}

export type BtnFx = { bg?: string; color?: string; shape?: 'square' | 'rounded' | 'pill'; size?: number; op?: number; ls?: number }

export const BTN_SEL = 'a.cr-btn, button.cr-btn, #hero-btn, .el-hero_btn, [data-name="Button"], [data-name="About button"], [data-name="View button"]'

export function buttonsIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(BTN_SEL)).filter((x) => {
    const r = x.getBoundingClientRect()
    return r.width > 20 && r.height > 14
  })
}

export const buttonId = (key: string, idx: number) => key + ':b' + idx

const BPROPS = ['background-color', 'background-image', 'color', 'border-color', 'border-radius', 'font-size', 'padding', 'opacity', 'border-width', 'box-shadow', 'text-decoration', 'text-underline-offset']

function setBtn(el: HTMLElement, f: BtnFx | undefined) {
  const st = el.style
  if (el.dataset.bfx0 === undefined) {
    if (!f) return
    const o: Record<string, [string, string]> = {}
    BPROPS.forEach((q) => { o[q] = [st.getPropertyValue(q), st.getPropertyPriority(q)] })
    el.dataset.bfx0 = JSON.stringify(o)
  }
  const orig = JSON.parse(el.dataset.bfx0 as string) as Record<string, [string, string]>
  BPROPS.forEach((q) => { const [v, pr] = orig[q] ?? ['', '']; if (v) st.setProperty(q, v, pr); else st.removeProperty(q) })
  if (!f) { delete el.dataset.bfx0; return }
  const hx = (v: unknown) => (/^#[0-9a-fA-F]{6}$/.test(String(v ?? '')) ? String(v) : null)
  const bg = hx(f.bg)
  const fg = hx(f.color)
  if (bg) { st.setProperty('background-color', bg, 'important'); st.setProperty('background-image', 'none', 'important') }
  if (fg) {
    st.setProperty('color', fg, 'important')
    if (!bg && parseFloat(getComputedStyle(el).borderTopWidth) > 0) st.setProperty('border-color', fg, 'important')
  }
  const rad = f.shape === 'pill' ? 999 : f.shape === 'rounded' ? 10 : f.shape === 'square' ? 0 : null
  if (rad !== null) st.setProperty('border-radius', rad + 'px', 'important')
  const n = Number(f.size)
  if (n >= 8 && n <= 300) {
    const k = 'max(9px, min(' + n + 'px, ' + Math.max(3.6, n / 6) + 'vw))'
    st.setProperty('font-size', k, 'important')
    st.setProperty('padding', 'calc(' + k + ' * 1.15) calc(' + k + ' * 2.7)', 'important')
  }
  const o2 = Number(f.op)
  if (o2 >= 0.05 && o2 < 1) st.setProperty('opacity', String(o2), 'important')
  if (f.ls) {
    st.setProperty('background-color', 'transparent', 'important'); st.setProperty('background-image', 'none', 'important')
    st.setProperty('border-width', '0', 'important'); st.setProperty('box-shadow', 'none', 'important'); st.setProperty('border-radius', '0', 'important')
    st.setProperty('text-decoration', 'underline', 'important'); st.setProperty('text-underline-offset', '0.2em', 'important')
  }
}

export function applyBtnFx(map: Record<string, BtnFx> | undefined | null) {
  if (typeof document === 'undefined') return
  const m = map ?? {}
  for (const el of roots()) {
    const key = rootKey(el)
    if (!key) continue
    buttonsIn(el).forEach((b, i) => setBtn(b, m[buttonId(key, i)]))
  }
}

export type BoxFx = { x?: number; y?: number; s?: number; h?: number; w?: number; r?: number; v?: number; c?: string; th?: number }

export const TXT_SEL = 'h1, [class^="el-"], [class*=" el-"], ' + BTN_SEL

const AUTO_TAGS = 'p,h1,h2,h3,h4,h5,h6,span,a,li,blockquote,figcaption,small,strong,em,time,div,dt,dd'
function autoText(root: HTMLElement): HTMLElement[] {
  const out: HTMLElement[] = []
  root.querySelectorAll<HTMLElement>(AUTO_TAGS).forEach((x) => {
    if (x.matches(TXT_SEL)) return
    if (x.closest('#cam-box, [data-cam-ed], form, svg, select, textarea, [aria-hidden="true"], [data-addon], [data-fxph]')) return
    let own = ''
    x.childNodes.forEach((n) => { if (n.nodeType === 3) own += n.nodeValue ?? '' })
    own = own.trim()
    if (own.length < 3 || /^[\d\s.,:/-]+$/.test(own)) return
    const par = x.parentElement
    if (par && par.children.length >= 6 && Array.from(par.children).filter((c) => c.tagName === x.tagName).length >= 6) return
    if (x.dataset.bxh === undefined && !(x.offsetWidth > 20 && x.offsetHeight > 14)) return
    out.push(x)
  })
  return out
}

export function textAtPoint(x: number, y: number): HTMLElement | null {
  let best: HTMLElement | null = null
  let ba = Infinity
  document.querySelectorAll<HTMLElement>(TXT_SEL).forEach((el) => {
    if (el.closest('#cam-box, #cam-sec-bar, [data-cam-ed]')) return
    const r = el.getBoundingClientRect()
    if (r.width < 8 || r.height < 8 || x < r.left || x > r.right || y < r.top || y > r.bottom) return
    const a = r.width * r.height
    if (a < ba) { ba = a; best = el }
  })
  return best
}

export function boxesIn(root: HTMLElement): HTMLElement[] {
  const all = Array.from(root.querySelectorAll<HTMLElement>(TXT_SEL)).filter((x) => x.dataset.bxh !== undefined || (x.offsetWidth > 20 && x.offsetHeight > 14))
  const set = new Set(all)
  const base = all.filter((x) => {
    let p = x.parentElement
    while (p && p !== root) { if (set.has(p)) return false; p = p.parentElement }
    return true
  })
  const au = autoText(root).filter((x) => !base.some((b) => b.contains(x) || x.contains(b)))
  const aset = new Set(au)
  const au2 = au.filter((x) => {
    let p = x.parentElement
    while (p && p !== root) { if (aset.has(p)) return false; p = p.parentElement }
    return true
  })
  return [...base, ...au2]
}

export const boxId = (key: string, idx: number) => 't:' + key + ':' + idx

// Thin decorative lines (rules) are selectable too.
export const ruleId = (key: string, idx: number) => 'r:' + key + ':' + idx
export function rulesIn(root: HTMLElement): HTMLElement[] {
  root.querySelectorAll<HTMLElement>('span, div, hr, i').forEach((x) => {
    if (x.hasAttribute('data-cam-rule') || x.children.length > 0 || (x.textContent ?? '').trim() || x.id === 'cam-box' || x.closest('#cam-box') || x.closest(BTN_SEL) || x.hasAttribute('data-fxph')) return
    const r = x.getBoundingClientRect()
    const horiz = r.width >= 24 && r.height <= 6
    const vert = r.height >= 24 && r.width <= 6
    if (!horiz && !vert) return
    const cs = getComputedStyle(x)
    const paint = (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent') || parseFloat(cs.borderTopWidth) > 0 || parseFloat(cs.borderBottomWidth) > 0 || parseFloat(cs.borderLeftWidth) > 0
    if (!paint) return
    x.setAttribute('data-cam-rule', '1')
  })
  root.querySelectorAll('svg').forEach((sv) => {
    const x = sv as unknown as HTMLElement
    if (x.hasAttribute('data-cam-rule') || x.closest('#cam-box') || x.closest(BTN_SEL) || x.closest('[data-cam-ed]') || (sv.textContent ?? '').trim() || sv.querySelector('text, image, foreignObject')) return
    const r = sv.getBoundingClientRect()
    if (r.width < 24 || r.height < 2 || r.height > 60 || r.width / Math.max(r.height, 1) < 2.2) return
    x.setAttribute('data-cam-rule', '1')
  })
  return Array.from(root.querySelectorAll<HTMLElement>('[data-cam-rule]'))
}

const lay = (x: HTMLElement) => ({ w: x.offsetWidth || x.clientWidth || 0, h: x.offsetHeight || x.clientHeight || 0 })

export function frameOf(el: HTMLElement, root: HTMLElement): HTMLElement {
  const pf = el.closest('[data-pframe]') as HTMLElement | null
  if (pf && root.contains(pf)) return pf
  const vs = photosIn(root).map((q) => visualOf(q))
  if (vs.length > 1) {
    let a: HTMLElement | null = el
    while (a && a !== root) {
      const cur: HTMLElement = a
      const par: HTMLElement | null = cur.parentElement
      const cnt = vs.filter((v) => cur.contains(v)).length
      const pc = par ? vs.filter((v) => par.contains(v)).length : 0
      if (cnt === 1 && pc >= 2) return cur
      a = par
    }
  }
  let f = el
  while (f.parentElement && f.parentElement !== root) {
    const a = lay(f)
    const b = lay(f.parentElement)
    if (Math.abs(a.w - b.w) > 3 || Math.abs(a.h - b.h) > 3) break
    f = f.parentElement
  }
  return f
}

const ROOT_SEL = '[data-sec], header#top, section[id]'

function ovOpen(el: HTMLElement) {
  let a = el.parentElement
  while (a && a !== document.body && !a.matches(ROOT_SEL)) {
    if (a.dataset.bxo === undefined) {
      const cs = getComputedStyle(a)
      if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') { a.dataset.bxo = a.style.overflow; a.style.overflow = 'visible' }
    }
    a = a.parentElement
  }
}

function ovClose(el: HTMLElement) {
  let a = el.parentElement
  while (a && a !== document.body) {
    if (a.dataset.bxo !== undefined && !a.querySelector('[data-bxfx]')) { a.style.overflow = a.dataset.bxo; delete a.dataset.bxo }
    a = a.parentElement
  }
}

function fitInner(el: HTMLElement, on: boolean) {
  if (!on) {
    el.querySelectorAll<HTMLElement>('[data-bxfit]').forEach((n) => {
      let a: string[] = []
      try { a = JSON.parse(n.dataset.bxfit || '[]') } catch { a = [] }
      n.style.height = a[0] ?? ''; n.style.width = a[1] ?? ''; n.style.aspectRatio = a[2] ?? ''; n.style.objectFit = a[3] ?? ''; n.style.maxHeight = a[4] ?? ''
      delete n.dataset.bxfit
    })
    return
  }
  if (el.hasAttribute('data-pframe')) return
  const seen = new Set<HTMLElement>()
  el.querySelectorAll<HTMLElement>('img').forEach((img) => {
    let n: HTMLElement | null = img
    while (n && n !== el) {
      if (!seen.has(n)) {
        seen.add(n)
        if (n.dataset.bxfit === undefined) {
          n.dataset.bxfit = JSON.stringify([n.style.height, n.style.width, n.style.aspectRatio, n.style.objectFit, n.style.maxHeight])
          n.style.height = '100%'; n.style.width = '100%'; n.style.aspectRatio = 'auto'; n.style.maxHeight = 'none'
          if (n === img) n.style.objectFit = 'cover'
        }
      }
      n = n.parentElement
    }
  })
}

const LN_P = ['background-color', 'border-color', 'height', 'width', 'border-top-width', 'border-bottom-width', 'border-left-width', 'border-right-width', 'color', 'stroke', 'stroke-width']
export function lineDir(el: HTMLElement): string {
  if (!el.hasAttribute('data-cam-rule')) return ''
  const v = el.dataset.lnv !== undefined ? el.dataset.lnv === '1' : el.offsetHeight > el.offsetWidth
  return v ? 'v' : 'h'
}
function lineFx(el: HTMLElement, f: BoxFx | undefined) {
  const st = el.style
  if (f && f.c === undefined && f.th === undefined && el.dataset.lnx !== undefined) return
  const c = f && typeof f.c === 'string' && /^#[0-9a-fA-F]{6}$/.test(f.c) ? f.c : ''
  const th = f && Number(f.th) > 0 ? Math.min(60, Number(f.th)) : 0
  const restore = () => {
    let a: string[] = []
    try { a = JSON.parse(el.dataset.lnx || '[]') } catch { a = [] }
    LN_P.forEach((p, i) => { if (a[i]) st.setProperty(p, a[i]); else st.removeProperty(p) })
  }
  if (!c && !th) {
    if (el.dataset.lnx !== undefined) {
      restore()
      delete el.dataset.lnx; delete el.dataset.lnv; delete el.dataset.lnb; delete el.dataset.lnw; delete el.dataset.lnt
    }
    return
  }
  if (el.dataset.lnx === undefined) {
    const cs = getComputedStyle(el)
    el.dataset.lnx = JSON.stringify(LN_P.map((p) => st.getPropertyValue(p)))
    el.dataset.lnv = el.offsetHeight > el.offsetWidth ? '1' : '0'
    el.dataset.lnb = cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent' ? '1' : ''
    el.dataset.lnt = (el.textContent ?? '').trim() ? '1' : ''
    el.dataset.lnw = JSON.stringify([cs.borderTopWidth, cs.borderBottomWidth, cs.borderLeftWidth, cs.borderRightWidth].map((q) => parseFloat(q) || 0))
  } else restore()
  const hasBg = el.dataset.lnb === '1'
  const isSvg = el.tagName.toLowerCase() === 'svg'
  if (c) {
    if (isSvg) st.setProperty('stroke', c, 'important')
    if (hasBg) st.setProperty('background-color', c, 'important')
    if (el.dataset.lnt === '1') st.setProperty('color', c, 'important')
    st.setProperty('border-color', c, 'important')
  }
  if (th) {
    if (isSvg) {
      const vb = (el as unknown as SVGSVGElement).viewBox?.baseVal?.width || 140
      const sc = (el.getBoundingClientRect().width || 1) / vb
      st.setProperty('stroke-width', String(Math.round((th / sc) * 100) / 100), 'important')
    }
    if (hasBg) st.setProperty(el.dataset.lnv === '1' ? 'width' : 'height', th + 'px', 'important')
    let bw: number[] = []
    try { bw = JSON.parse(el.dataset.lnw || '[]') } catch { bw = [] }
    ;['border-top-width', 'border-bottom-width', 'border-left-width', 'border-right-width'].forEach((p, i) => { if (bw[i] > 0) st.setProperty(p, th + 'px', 'important') })
  }
}

export function setBox(el: HTMLElement, f: BoxFx | undefined) {
  const st = el.style
  if (f && f.h) {
    if (el.dataset.bxh === undefined) el.dataset.bxh = st.display
    st.display = 'none'
    return
  }
  if (el.hasAttribute('data-cam-rule')) lineFx(el, f)
  if (el.dataset.bxh !== undefined) { st.display = el.dataset.bxh; delete el.dataset.bxh }
  const hasW = !!f && Number(f.w) > 0.5
  if (!hasW && el.dataset.bxw !== undefined) { st.width = el.dataset.bxw; st.maxWidth = el.dataset.bxmw ?? ''; st.overflowWrap = ''; delete el.dataset.bxw; delete el.dataset.bxmw }
  if (hasW) {
    if (el.dataset.bxw === undefined) { el.dataset.bxw = st.width; el.dataset.bxmw = st.maxWidth }
    st.width = Number(f!.w) + 'vw'
    st.maxWidth = 'none'
    st.overflowWrap = 'anywhere'
  }
  const hasV = !!f && Number(f.v) > 0.5
  if (!hasV && el.dataset.bxv !== undefined) {
    let a: string[] = []
    try { a = JSON.parse(el.dataset.bxv) } catch { a = [] }
    st.height = a[0] ?? ''; st.maxHeight = a[1] ?? ''; st.minHeight = a[2] ?? ''; st.aspectRatio = a[3] ?? ''; st.objectFit = a[4] ?? ''
    delete el.dataset.bxv
  }
  if (hasV) {
    if (el.dataset.bxv === undefined) el.dataset.bxv = JSON.stringify([st.height, st.maxHeight, st.minHeight, st.aspectRatio, st.objectFit])
    st.height = Number(f!.v) + 'vw'
    st.maxHeight = 'none'
    st.minHeight = '0'
    st.aspectRatio = 'auto'
    if (el.tagName === 'IMG') st.objectFit = 'cover'
  }
  fitInner(el, hasV)
  const hasR = !!f && Math.abs(Number(f.r) || 0) > 0.05
  const has = hasW || hasV || hasR || !!f && (Math.abs(Number(f.x) || 0) > 0.001 || Math.abs(Number(f.y) || 0) > 0.001 || Math.abs((Number(f.s) || 1) - 1) > 0.001)
  if (!has) {
    if (el.dataset.bxfx !== undefined) {
      st.removeProperty('translate')
      st.removeProperty('scale')
      st.removeProperty('rotate')
      st.zIndex = el.dataset.bxz ?? ''
      if (el.dataset.bxpos) st.position = ''
      delete el.dataset.bxfx
      delete el.dataset.bxz
      delete el.dataset.bxpos
      ovClose(el)
    }
    return
  }
  if (el.dataset.bxfx === undefined) {
    el.dataset.bxfx = '1'
    el.dataset.bxz = st.zIndex
    if (getComputedStyle(el).position === 'static') { st.position = 'relative'; el.dataset.bxpos = '1' }
  }
  st.setProperty('translate', (Number(f!.x) || 0) + 'vw ' + (Number(f!.y) || 0) + 'vw')
  st.setProperty('scale', String(Number(f!.s) || 1))
  if (hasR) st.setProperty('rotate', Number(f!.r) + 'deg'); else st.removeProperty('rotate')
  st.zIndex = '20'
  ovOpen(el)
}

export function applyBoxFx(map: Record<string, BoxFx> | undefined | null) {
  if (typeof document === 'undefined') return
  const m = map ?? {}
  for (const root of roots()) {
    const key = rootKey(root)
    if (!key) continue
    boxesIn(root).forEach((b, i) => setBox(b, m[boxId(key, i)]))
    rulesIn(root).forEach((b, i) => setBox(b, m[ruleId(key, i)]))
    const one = heroOne(root)
    photosIn(root).forEach((p, i) => {
      const fr = frameOf(visualOf(p), root)
      setBox(fr, m['f:' + photoId(key, one ? 0 : i)])
      if (one && fr.dataset.bxfx !== undefined) fr.style.zIndex = fr.dataset.bxz ?? ''
    })
  }
}

const AXP: [string, string][] = [['backgroundColor', 'background-color'], ['color', 'color'], ['borderTopColor', 'border-top-color'], ['borderRightColor', 'border-right-color'], ['borderBottomColor', 'border-bottom-color'], ['borderLeftColor', 'border-left-color'], ['fill', 'fill'], ['stroke', 'stroke']]

const rgbStr = (hex: string) => {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex)
  if (!m) return ''
  const n = parseInt(m[1], 16)
  return 'rgb(' + (n >> 16) + ', ' + ((n >> 8) & 255) + ', ' + (n & 255) + ')'
}

export function applySecAccent(map: Record<string, { accent?: string }> | undefined | null, siteAccent: string | undefined | null) {
  if (typeof document === 'undefined') return
  const m: Record<string, any> = map ?? {}
  const has = Object.values(m).some((v: any) => /^#[0-9a-fA-F]{6}$/.test(String(v?.accent ?? '')))
  if (!has && document.querySelectorAll('[data-axp]').length === 0) return
  const base = rgbStr(String(siteAccent ?? ''))
  for (const root of roots()) {
    const k0 = rootKey(root)
    if (!k0) continue
    const nc = String(m[k0 === 'hero' ? 'top' : k0]?.accent ?? '')
    const c = /^#[0-9a-fA-F]{6}$/.test(nc) ? nc : ''
    root.querySelectorAll<HTMLElement>('*').forEach((el) => {
      const st = el.style
      if (!st) return
      const raw = el.dataset ? el.dataset.axp : undefined
      if (raw) {
        let rec: Record<string, string> = {}
        try { rec = JSON.parse(raw) } catch { rec = {} }
        for (const [css, orig] of Object.entries(rec)) {
          if (c) st.setProperty(css, c, 'important')
          else if (orig) st.setProperty(css, orig)
          else st.removeProperty(css)
        }
        if (!c) delete el.dataset.axp
        return
      }
      if (!c || !base) return
      const cs = getComputedStyle(el) as any
      const rec: Record<string, string> = {}
      for (const [jp, css] of AXP) {
        if (cs[jp] !== base) continue
        if (jp.startsWith('border') && !(parseFloat(cs[jp.replace('Color', 'Width')]) > 0)) continue
        rec[css] = st.getPropertyValue(css)
      }
      const keys = Object.keys(rec)
      if (!keys.length) return
      el.dataset.axp = JSON.stringify(rec)
      keys.forEach((css) => st.setProperty(css, c, 'important'))
    })
  }
}
