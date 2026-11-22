import { cropRect, type Crop, type CropRect } from '@/lib/crop'
import type { HslKey } from '@/lib/hsl'

export type MaskAdj = Partial<Record<'exposure' | 'contrast' | 'highlights' | 'shadows' | 'whites' | 'blacks' | 'temp' | 'tint' | 'vibrance' | 'saturation' | 'sharpen', number>> & Partial<Record<HslKey, number>>

export type Mask = {
  id: string
  kind: 'radial' | 'linear' | 'brush' | 'ai'
  a: [number, number]
  b: [number, number]
  pts?: [number, number][]
  size?: number
  feather: number
  invert?: boolean
  ai?: { w: number; h: number; d: string }
  label?: string
  adj: MaskAdj
}

export type Heal = { x: number; y: number; r: number; sx: number; sy: number }

export type CurvePt = [number, number]
export type Fill = { ai: { w: number; h: number; d: string }; url: string }
export type LocalEdits = { masks: Mask[]; heals: Heal[]; curve?: CurvePt[]; fills?: Fill[] }
export const curveIsFlat = (c?: CurvePt[] | null) => !c || c.length < 2 || c.every(([x, y]) => Math.abs(x - y) < 0.002)

export const emptyLocal = (): LocalEdits => ({ masks: [], heals: [] })
export const hasLocal = (l?: LocalEdits | null) => !!l && (l.masks.length > 0 || l.heals.length > 0 || (l.fills?.length ?? 0) > 0 || !curveIsFlat(l.curve))
export const cleanLocal = (l?: LocalEdits | null): LocalEdits | null => (hasLocal(l) ? { masks: l!.masks, heals: l!.heals, ...(curveIsFlat(l!.curve) ? {} : { curve: l!.curve }), ...(l!.fills?.length ? { fills: l!.fills } : {}) } : null)

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

export function outToSrc(u: number, v: number, W: number, H: number, crop?: Crop | null): [number, number] {
  if (!crop) return [u, v]
  const r = cropRect(W, H, crop)
  const rad = (crop.angle * Math.PI) / 180
  const ox = u * r.cw - r.cw / 2 + r.dx
  const oy = v * r.ch - r.ch / 2 + r.dy
  const c = Math.cos(rad)
  const s = Math.sin(rad)
  const px = ox * c + oy * s
  const py = -ox * s + oy * c
  return [clamp((px + W / 2) / W, 0, 1), clamp((py + H / 2) / H, 0, 1)]
}

export function srcToOut(x: number, y: number, W: number, H: number, crop?: Crop | null): [number, number] {
  if (!crop) return [x, y]
  const r = cropRect(W, H, crop)
  const rad = (crop.angle * Math.PI) / 180
  const px = x * W - W / 2
  const py = y * H - H / 2
  const c = Math.cos(rad)
  const s = Math.sin(rad)
  const ox = px * c - py * s
  const oy = px * s + py * c
  return [(ox - r.dx + r.cw / 2) / r.cw, (oy - r.dy + r.ch / 2) / r.ch]
}

export function autoHealSource(bmp: ImageBitmap, x: number, y: number, r: number): [number, number] {
  const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height))
  const W = Math.max(1, Math.round(bmp.width * k))
  const H = Math.max(1, Math.round(bmp.height * k))
  const L = Math.max(W, H)
  const rp = Math.max(3, r * L)
  const half = Math.ceil(rp * 7)
  const size = half * 2
  const fallback: [number, number] = [clamp(x + (rp * 3.2) / W, 0.01, 0.99), y]
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const g = c.getContext('2d', { willReadFrequently: true })
  if (!g) return fallback
  const cx = x * W
  const cy = y * H
  g.drawImage(bmp, (cx - half) / k, (cy - half) / k, size / k, size / k, 0, 0, size, size)
  const d = g.getImageData(0, 0, size, size).data
  const px = (qx: number, qy: number): [number, number, number] | null => {
    const ix = Math.round(qx)
    const iy = Math.round(qy)
    if (ix < 0 || iy < 0 || ix >= size || iy >= size) return null
    const i = (iy * size + ix) * 4
    if (d[i + 3] < 128) return null
    return [d[i], d[i + 1], d[i + 2]]
  }
  const ring: [number, number][] = []
  for (const rad of [1.2, 1.6]) {
    for (let a = 0; a < 12; a++) {
      const t = (a / 12) * Math.PI * 2
      ring.push([Math.cos(t) * rp * rad, Math.sin(t) * rp * rad])
    }
  }
  const here = ring.map(([ox, oy]) => px(half + ox, half + oy))
  let best: [number, number] | null = null
  let bestScore = Infinity
  for (const dist of [2.6, 3.6, 4.6]) {
    for (let a = 0; a < 16; a++) {
      const t = (a / 16) * Math.PI * 2
      const qx = half + Math.cos(t) * dist * rp
      const qy = half + Math.sin(t) * dist * rp
      let score = 0
      let cnt = 0
      let ok = true
      for (let i = 0; i < ring.length; i++) {
        const p = px(qx + ring[i][0], qy + ring[i][1])
        if (!p) { ok = false; break }
        const q = here[i]
        if (q) {
          score += (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2
          cnt++
        }
      }
      if (!ok || cnt < 6) continue
      score /= cnt
      let m = 0
      let s2 = 0
      let n = 0
      for (let i = 0; i < 9; i++) {
        const t2 = (i / 9) * Math.PI * 2
        const rr = i === 0 ? 0 : rp * 0.6
        const p = px(qx + Math.cos(t2) * rr, qy + Math.sin(t2) * rr)
        if (!p) continue
        const l = 0.3 * p[0] + 0.59 * p[1] + 0.11 * p[2]
        m += l
        s2 += l * l
        n++
      }
      if (n > 0) score += Math.max(0, s2 / n - (m / n) ** 2) * 1.5
      if (score < bestScore) {
        bestScore = score
        best = [(cx + (qx - half)) / W, (cy + (qy - half)) / H]
      }
    }
  }
  return best ? [clamp(best[0], 0.005, 0.995), clamp(best[1], 0.005, 0.995)] : fallback
}

function healOne(g: CanvasRenderingContext2D, W: number, H: number, dx: number, dy: number, sx: number, sy: number, r: number) {
  const pad = Math.ceil(r * 1.6) + 2
  const x0 = Math.max(0, Math.floor(dx - pad))
  const y0 = Math.max(0, Math.floor(dy - pad))
  const x1 = Math.min(W, Math.ceil(dx + pad))
  const y1 = Math.min(H, Math.ceil(dy + pad))
  const bw = x1 - x0
  const bh = y1 - y0
  if (bw < 2 || bh < 2) return
  const sx0 = clamp(x0 + Math.round(sx - dx), 0, W - bw)
  const sy0 = clamp(y0 + Math.round(sy - dy), 0, H - bh)
  const dst = g.getImageData(x0, y0, bw, bh)
  const src = g.getImageData(sx0, sy0, bw, bh)
  const cx = dx - x0
  const cy = dy - y0
  const dm = [0, 0, 0]
  const sm = [0, 0, 0]
  let n = 0
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const dist = Math.hypot(x + 0.5 - cx, y + 0.5 - cy)
      if (dist > r * 1.1 && dist < r * 1.6) {
        const i = (y * bw + x) * 4
        for (let c = 0; c < 3; c++) { dm[c] += dst.data[i + c]; sm[c] += src.data[i + c] }
        n++
      }
    }
  }
  const off = [0, 0, 0]
  if (n >= 8) for (let c = 0; c < 3; c++) off[c] = (dm[c] - sm[c]) / n
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const t = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r
      if (t >= 1) continue
      let a = 1
      if (t > 0.6) {
        const u = (t - 0.6) / 0.4
        a = 1 - u * u * (3 - 2 * u)
      }
      const i = (y * bw + x) * 4
      for (let c = 0; c < 3; c++) dst.data[i + c] = dst.data[i + c] + (src.data[i + c] + off[c] - dst.data[i + c]) * a
    }
  }
  g.putImageData(dst, x0, y0)
}

export function healSource(bmp: ImageBitmap, scale: number, heals: Heal[]): HTMLCanvasElement {
  const W = Math.max(1, Math.round(bmp.width * scale))
  const H = Math.max(1, Math.round(bmp.height * scale))
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d', { willReadFrequently: true })
  if (!g) return c
  g.drawImage(bmp, 0, 0, W, H)
  const L = Math.max(W, H)
  for (const h of heals) healOne(g, W, H, h.x * W, h.y * H, h.sx * W, h.sy * H, Math.max(2, h.r * L))
  return c
}

const aiCache = new Map<string, HTMLCanvasElement>()
function aiCanvas(ai: { w: number; h: number; d: string }): HTMLCanvasElement | null {
  const hit = aiCache.get(ai.d)
  if (hit) return hit
  const c = document.createElement('canvas')
  c.width = ai.w
  c.height = ai.h
  const g = c.getContext('2d')
  if (!g) return null
  const img = g.createImageData(ai.w, ai.h)
  const bin = atob(ai.d)
  for (let i = 0; i < ai.w * ai.h; i++) {
    if ((bin.charCodeAt(i >> 3) >> (i & 7)) & 1) { const o = i * 4; img.data[o] = 255; img.data[o + 1] = 255; img.data[o + 2] = 255; img.data[o + 3] = 255 }
  }
  g.putImageData(img, 0, 0)
  if (aiCache.size > 12) aiCache.clear()
  aiCache.set(ai.d, c)
  return c
}

function drawMask(g: CanvasRenderingContext2D, m: Mask, mw: number, mh: number) {
  if (m.kind === 'ai') {
    const src = m.ai ? aiCanvas(m.ai) : null
    if (!src) return
    g.save()
    g.imageSmoothingEnabled = true
    g.imageSmoothingQuality = 'high'
    const blur = clamp(m.feather, 0, 1) * Math.max(mw, mh) * 0.012
    if (blur > 0.5) g.filter = 'blur(' + blur.toFixed(1) + 'px)'
    g.drawImage(src, 0, 0, mw, mh)
    g.restore()
    return
  }
  const white = (a: number) => `rgba(255,255,255,${a})`
  const f = clamp(m.feather, 0, 1)
  if (m.kind === 'radial') {
    g.save()
    g.translate(m.a[0] * mw, m.a[1] * mh)
    g.scale(Math.max(1, m.b[0] * mw), Math.max(1, m.b[1] * mh))
    const grad = g.createRadialGradient(0, 0, 0, 0, 0, 1)
    grad.addColorStop(0, white(1))
    grad.addColorStop(Math.min(0.999, 1 - f), white(1))
    grad.addColorStop(1, white(0))
    g.fillStyle = grad
    g.fillRect(-1, -1, 2, 2)
    g.restore()
  } else if (m.kind === 'linear') {
    const grad = g.createLinearGradient(m.a[0] * mw, m.a[1] * mh, m.b[0] * mw, m.b[1] * mh)
    grad.addColorStop(0, white(1))
    grad.addColorStop(Math.min(0.999, (1 - f) * 0.5), white(1))
    grad.addColorStop(1, white(0))
    g.fillStyle = grad
    g.fillRect(0, 0, mw, mh)
  } else {
    const pts = m.pts ?? []
    const rad = Math.max(1, (m.size ?? 0.05) * Math.max(mw, mh))
    const dot = (x: number, y: number) => {
      const grad = g.createRadialGradient(x, y, 0, x, y, rad)
      grad.addColorStop(0, white(1))
      grad.addColorStop(Math.min(0.999, 1 - f), white(1))
      grad.addColorStop(1, white(0))
      g.fillStyle = grad
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2)
    }
    for (let i = 0; i < pts.length; i++) {
      const x = pts[i][0] * mw
      const y = pts[i][1] * mh
      if (i > 0) {
        const px = pts[i - 1][0] * mw
        const py = pts[i - 1][1] * mh
        const n = Math.ceil(Math.hypot(x - px, y - py) / (rad * 0.3))
        for (let j = 1; j < n; j++) dot(px + ((x - px) * j) / n, py + ((y - py) * j) / n)
      }
      dot(x, y)
    }
  }
}

export function maskWeights(m: Mask, w: number, h: number, W: number, H: number, crop: Crop | null, cr: CropRect | null, s: number): Float32Array {
  const ws = Math.min(1, 1600 / Math.max(W, H))
  const mw = Math.max(1, Math.round(W * ws))
  const mh = Math.max(1, Math.round(H * ws))
  const mc = document.createElement('canvas')
  mc.width = mw
  mc.height = mh
  const mg = mc.getContext('2d')
  const out = new Float32Array(w * h)
  if (!mg) return out
  drawMask(mg, m, mw, mh)
  const oc = document.createElement('canvas')
  oc.width = w
  oc.height = h
  const og = oc.getContext('2d', { willReadFrequently: true })
  if (!og) return out
  og.imageSmoothingEnabled = true
  og.imageSmoothingQuality = 'high'
  if (crop && cr) {
    og.translate(w / 2 - cr.dx * s, h / 2 - cr.dy * s)
    og.rotate((crop.angle * Math.PI) / 180)
    og.scale(s / ws, s / ws)
    og.drawImage(mc, -mw / 2, -mh / 2)
  } else {
    og.drawImage(mc, 0, 0, w, h)
  }
  const a = og.getImageData(0, 0, w, h).data
  for (let i = 0; i < w * h; i++) {
    const v = a[i * 4 + 3] / 255
    out[i] = m.invert ? 1 - v : v
  }
  return out
}

export function curveLut(pts: CurvePt[]): Uint8ClampedArray {
  const p = [...pts].sort((a, b) => a[0] - b[0])
  const n = p.length
  const out = new Uint8ClampedArray(256)
  if (n < 2) {
    for (let v = 0; v < 256; v++) out[v] = v
    return out
  }
  const xs = p.map((q) => q[0])
  const ys = p.map((q) => q[1])
  const dx: number[] = []
  const m: number[] = []
  for (let i = 0; i < n - 1; i++) {
    dx[i] = Math.max(1e-6, xs[i + 1] - xs[i])
    m[i] = (ys[i + 1] - ys[i]) / dx[i]
  }
  const t: number[] = new Array(n).fill(0)
  t[0] = m[0]
  t[n - 1] = m[n - 2]
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = 0
      t[i + 1] = 0
    } else {
      const a = t[i] / m[i]
      const b = t[i + 1] / m[i]
      const ss = a * a + b * b
      if (ss > 9) {
        const tau = 3 / Math.sqrt(ss)
        t[i] = tau * a * m[i]
        t[i + 1] = tau * b * m[i]
      }
    }
  }
  for (let v = 0; v < 256; v++) {
    const x = v / 255
    let y: number
    if (x <= xs[0]) y = ys[0]
    else if (x >= xs[n - 1]) y = ys[n - 1]
    else {
      let k = 0
      while (k < n - 2 && x > xs[k + 1]) k++
      const h = dx[k]
      const u = (x - xs[k]) / h
      const u2 = u * u
      const u3 = u2 * u
      y = (2 * u3 - 3 * u2 + 1) * ys[k] + (u3 - 2 * u2 + u) * h * t[k] + (-2 * u3 + 3 * u2) * ys[k + 1] + (u3 - u2) * h * t[k + 1]
    }
    out[v] = Math.round(clamp(y, 0, 1) * 255)
  }
  return out
}

// The area of a mask as packed bits, so it can be saved with the photo's edits.
export function maskBits(m: Mask, W: number, H: number, long = 512): { w: number; h: number; d: string } {
  const k = long / Math.max(W, H)
  const w = Math.max(1, Math.round(W * k))
  const h = Math.max(1, Math.round(H * k))
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d', { willReadFrequently: true })
  const bytes = new Uint8Array(Math.ceil((w * h) / 8))
  if (g) {
    drawMask(g, m, w, h)
    const a = g.getImageData(0, 0, w, h).data
    for (let i = 0; i < w * h; i++) {
      const on = a[i * 4 + 3] > 127
      if (m.invert ? !on : on) bytes[i >> 3] |= 1 << (i & 7)
    }
  }
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return { w, h, d: btoa(bin) }
}

// A slightly grown, softened copy of a packed area, drawn at w by h.
export function grownMask(ai: { w: number; h: number; d: string }, w: number, h: number): HTMLCanvasElement | null {
  const src = aiCanvas(ai)
  if (!src) return null
  const r = Math.max(1, Math.round(Math.max(ai.w, ai.h) * 0.012))
  const d = document.createElement('canvas')
  d.width = ai.w
  d.height = ai.h
  const g = d.getContext('2d')
  if (!g) return null
  for (const dy of [-r, 0, r]) for (const dx of [-r, 0, r]) g.drawImage(src, dx, dy)
  const d2 = document.createElement('canvas')
  d2.width = ai.w
  d2.height = ai.h
  const g2 = d2.getContext('2d')
  if (!g2) return d
  g2.filter = 'blur(1.5px)'
  g2.drawImage(d, 0, 0)
  const out = document.createElement('canvas')
  out.width = w
  out.height = h
  const og = out.getContext('2d')
  if (!og) return null
  og.imageSmoothingEnabled = true
  og.imageSmoothingQuality = 'high'
  og.drawImage(d2, 0, 0, w, h)
  return out
}

const fillCache = new WeakMap<ImageBitmap, { key: string; out: Promise<ImageBitmap> }>()
// The photo with each removed area replaced by the filled-in picture. Only the removed area changes.
export function applyFills(bmp: ImageBitmap, fills: Fill[]): Promise<ImageBitmap> {
  const key = JSON.stringify(fills.map((f) => [f.url, f.ai.d.length, f.ai.d.slice(0, 48)]))
  const hit = fillCache.get(bmp)
  if (hit && hit.key === key) return hit.out
  const out = (async () => {
    try {
      const W = bmp.width
      const H = bmp.height
      const c = document.createElement('canvas')
      c.width = W
      c.height = H
      const g = c.getContext('2d')
      if (!g) return bmp
      g.drawImage(bmp, 0, 0)
      for (const f of fills) {
        const res = await fetch(f.url)
        if (!res.ok) continue
        const patch = await createImageBitmap(await res.blob())
        const gm = grownMask(f.ai, W, H)
        if (!gm) { patch.close(); continue }
        const t = document.createElement('canvas')
        t.width = W
        t.height = H
        const tg = t.getContext('2d')
        if (!tg) { patch.close(); continue }
        tg.drawImage(patch, 0, 0, W, H)
        tg.globalCompositeOperation = 'destination-in'
        tg.drawImage(gm, 0, 0)
        g.drawImage(t, 0, 0)
        patch.close()
      }
      return await createImageBitmap(c)
    } catch {
      return bmp
    }
  })()
  fillCache.set(bmp, { key, out })
  return out
}
