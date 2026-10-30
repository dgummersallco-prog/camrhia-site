import { encode, scaled, type Version } from '@/lib/galleryImages'

export type Enhanced = { full: Blob; web: Version; thumb: Version }

export type LookParams = {
  exposure: number
  contrast: number
  highlights: number
  shadows: number
  temp: number
  tint: number
  saturation: number
  fade: number
  bw: number
  whites: number
  blacks: number
  vibrance: number
  splitShadow: [number, number, number]
  splitHigh: [number, number, number]
}
export type Look = { id: string; label: string; blurb: string; params: LookParams }
export type Adjust = Partial<Pick<LookParams, 'exposure' | 'contrast' | 'highlights' | 'shadows' | 'temp' | 'tint' | 'saturation' | 'fade' | 'whites' | 'blacks' | 'vibrance' | 'bw'>>
export type LookChoice = { id: string; strength: number; adjust?: Adjust; skin?: boolean }

const Z: LookParams = {
  exposure: 0, contrast: 0, highlights: 0, shadows: 0, temp: 0, tint: 0, saturation: 0, fade: 0, bw: 0,
  whites: 0, blacks: 0, vibrance: 0,
  splitShadow: [0, 0, 0], splitHigh: [0, 0, 0],
}
const mk = (p: Partial<LookParams>): LookParams => ({ ...Z, ...p })

export const LOOKS: Look[] = [
  { id: 'natural', label: 'True to Color', blurb: 'Clean and true to life', params: mk({}) },
  { id: 'bright', label: 'Clean & Bright', blurb: 'Fresh, light, lifted', params: mk({ exposure: 0.18, contrast: 0.1, shadows: 0.25, saturation: 0.05 }) },
  { id: 'airy', label: 'Light & Airy', blurb: 'Soft, glowing, sunlit', params: mk({ exposure: 0.25, contrast: -0.05, shadows: 0.3, highlights: -0.1, temp: 0.12, saturation: -0.04, fade: 0.03 }) },
  { id: 'golden', label: 'Golden Hour', blurb: 'Rich, warm light', params: mk({ temp: 0.2, contrast: 0.1, highlights: -0.1, saturation: 0.1, splitHigh: [14, 6, -12] }) },
  { id: 'matte', label: 'Soft Matte', blurb: 'Gentle, faded blacks', params: mk({ fade: 0.07, contrast: -0.1, saturation: -0.08, shadows: 0.1 }) },
  { id: 'film', label: 'Film', blurb: 'Warm tones, teal shadows', params: mk({ fade: 0.05, contrast: 0.1, saturation: -0.06, temp: 0.05, splitShadow: [-8, 5, 10], splitHigh: [10, 5, -8] }) },
  { id: 'moody', label: 'Dark & Moody', blurb: 'Deep and dramatic', params: mk({ exposure: -0.2, contrast: 0.25, saturation: -0.1, shadows: -0.1, splitShadow: [-10, 4, 10] }) },
  { id: 'editorial', label: 'Cool Editorial', blurb: 'Crisp, cool, modern', params: mk({ temp: -0.1, contrast: 0.15, saturation: -0.12, highlights: -0.05 }) },
  { id: 'vivid', label: 'Bold & Vibrant', blurb: 'Bold color and punch', params: mk({ saturation: 0.25, contrast: 0.15, shadows: 0.05 }) },
  { id: 'bw', label: 'Black & White', blurb: 'Timeless monochrome', params: mk({ bw: 1, contrast: 0.2 }) },
]

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

function scaleLook(p: LookParams, s: number): LookParams {
  return {
    exposure: p.exposure * s,
    contrast: p.contrast * s,
    highlights: p.highlights * s,
    shadows: p.shadows * s,
    temp: p.temp * s,
    tint: p.tint * s,
    saturation: p.saturation * s,
    fade: p.fade * s,
    bw: p.bw,
    whites: p.whites * s,
    blacks: p.blacks * s,
    vibrance: p.vibrance * s,
    splitShadow: [p.splitShadow[0] * s, p.splitShadow[1] * s, p.splitShadow[2] * s],
    splitHigh: [p.splitHigh[0] * s, p.splitHigh[1] * s, p.splitHigh[2] * s],
  }
}

// Automatic first-pass edit (levels, exposure, contrast, white balance, color), then an optional look on top.
function buildK(look: LookParams | null, strength: number, adjust?: Adjust, skin?: boolean): LookParams | null {
  const base = look ?? (adjust ? Z : null)
  if (!base) return null
  let k = scaleLook(base, strength)
  if (adjust) {
    k = {
      ...k,
      exposure: k.exposure + (adjust.exposure ?? 0),
      contrast: k.contrast + (adjust.contrast ?? 0),
      highlights: k.highlights + (adjust.highlights ?? 0),
      shadows: k.shadows + (adjust.shadows ?? 0),
      temp: k.temp + (adjust.temp ?? 0),
      saturation: k.saturation + (adjust.saturation ?? 0),
      fade: k.fade + (adjust.fade ?? 0),
      tint: k.tint + (adjust.tint ?? 0),
      whites: k.whites + (adjust.whites ?? 0),
      blacks: k.blacks + (adjust.blacks ?? 0),
      vibrance: k.vibrance + (adjust.vibrance ?? 0),
      bw: clamp(k.bw + (adjust.bw ?? 0), 0, 1),
    }
  }
  if (skin) k = { ...k, temp: clamp(k.temp, -0.08, 0.08), saturation: Math.min(k.saturation, 0.1) }
  return k
}

function process(d: Uint8ClampedArray, w: number, h: number, look: LookParams | null, strength: number, adjust?: Adjust, skin?: boolean) {
  const hist = new Uint32Array(256)
  let n = 0
  let sr = 0
  let sg = 0
  let sb = 0
  let nm = 0
  const step = Math.max(1, Math.floor(Math.sqrt((w * h) / 90000)))
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const i = (y * w + x) * 4
      const r = d[i]
      const g = d[i + 1]
      const b = d[i + 2]
      const l = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
      hist[l]++
      n++
      if (l >= 50 && l <= 205) { sr += r; sg += g; sb += b; nm++ }
    }
  }
  const pct = (p: number) => {
    const t = n * p
    let c = 0
    for (let i = 0; i < 256; i++) {
      c += hist[i]
      if (c >= t) return i
    }
    return 255
  }
  const lo = Math.min(pct(0.005), 24)
  const hi = Math.max(pct(0.995), 215)
  const black = lo * 0.8
  const white = hi + (255 - hi) * 0.2
  const span = Math.max(1, white - black)
  const m = clamp((pct(0.5) - black) / span, 0.05, 0.95)
  const gammaFull = Math.log(0.46) / Math.log(m)
  const gamma = 1 + (clamp(gammaFull, 0.65, 1.35) - 1) * 0.75

  let gainR = 1
  let gainB = 1
  if (nm > 1000) {
    const mr = sr / nm
    const mg = sg / nm
    const mb = sb / nm
    const avg = (mr + mg + mb) / 3
    gainR = 1 + (clamp(avg / mr, 0.92, 1.08) - 1) * 0.6
    gainB = 1 + (clamp(avg / mb, 0.92, 1.08) - 1) * 0.6
  }

  const k = buildK(look, strength, adjust, skin)

  const lut = (gain: number, chan: 0 | 1 | 2) => {
    const t = new Uint8ClampedArray(256)
    for (let x = 0; x < 256; x++) {
      let v = clamp((x * gain - black) / span, 0, 1)
      v = Math.pow(v, gamma)
      const sm = v * v * (3 - 2 * v)
      v = v + (sm - v) * 0.35
      if (k) {
        v = v * Math.pow(2, k.exposure)
        v = v + k.shadows * 0.25 * Math.pow(1 - clamp(v, 0, 1), 2)
        v = v + k.highlights * 0.25 * Math.pow(clamp(v, 0, 1), 2)
        v = v + k.whites * 0.25 * Math.pow(clamp(v, 0, 1), 3)
        v = v + k.blacks * 0.25 * Math.pow(1 - clamp(v, 0, 1), 3)
        v = clamp(v, 0, 1)
        v = v + k.contrast * (v * v * (3 - 2 * v) - v) * 2
        const cg = chan === 0 ? 1 + k.temp * 0.5 : chan === 2 ? 1 - k.temp * 0.5 : 1 - k.tint * 0.3
        v = v * cg
        v = k.fade + clamp(v, 0, 1) * (1 - k.fade)
      }
      t[x] = Math.round(clamp(v, 0, 1) * 255)
    }
    return t
  }
  const lutR = lut(gainR, 0)
  const lutG = lut(1, 1)
  const lutB = lut(gainB, 2)
  const sat = 1.07 + (k ? k.saturation : 0)
  const bwA = k ? k.bw : 0
  const vib = k ? k.vibrance : 0
  const sh = k ? k.splitShadow : null
  const hg = k ? k.splitHigh : null

  for (let i = 0; i < d.length; i += 4) {
    let r = lutR[d[i]]
    let g = lutG[d[i + 1]]
    let b = lutB[d[i + 2]]
    const l = 0.299 * r + 0.587 * g + 0.114 * b
    r = l + (r - l) * sat
    g = l + (g - l) * sat
    b = l + (b - l) * sat
    if (vib !== 0) {
      const mx = Math.max(r, g, b)
      const mn = Math.min(r, g, b)
      const amt = vib * (1 - (mx > 0 ? (mx - mn) / mx : 0))
      r = l + (r - l) * (1 + amt)
      g = l + (g - l) * (1 + amt)
      b = l + (b - l) * (1 + amt)
    }
    if (bwA > 0) {
      r += (l - r) * bwA
      g += (l - g) * bwA
      b += (l - b) * bwA
    }
    if (sh && hg) {
      const t = l / 255
      const ws = (1 - t) * (1 - t)
      const wh = t * t
      r += sh[0] * ws + hg[0] * wh
      g += sh[1] * ws + hg[1] * wh
      b += sh[2] * ws + hg[2] * wh
    }
    d[i] = r
    d[i + 1] = g
    d[i + 2] = b
  }
}

const findLook = (id: string | undefined) => (id ? LOOKS.find((l) => l.id === id)?.params ?? null : null)

export async function enhancePhoto(source: Blob, path: string, look?: LookChoice): Promise<Enhanced> {
  let blob = source
  if (/\.(heic|heif)$/i.test(path)) {
    const mod = await import('heic2any')
    const out = await mod.default({ blob: source, toType: 'image/jpeg', quality: 0.95 })
    blob = Array.isArray(out) ? out[0] : out
  }
  const bmp = await createImageBitmap(blob, { imageOrientation: 'from-image' })
  const canvas = document.createElement('canvas')
  try {
    const w = bmp.width
    const h = bmp.height
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('Your browser cannot process photos.')
    ctx.drawImage(bmp, 0, 0)
    const img = ctx.getImageData(0, 0, w, h)
    process(img.data, w, h, findLook(look?.id), look?.strength ?? 1, look?.adjust, look?.skin)
    ctx.putImageData(img, 0, 0)

    const full = await encode(canvas, 0.92)
    const eb = await createImageBitmap(canvas)
    try {
      const wc = scaled(eb, 2048)
      const tc = scaled(eb, 480)
      const web = { blob: await encode(wc, 0.85), width: wc.width, height: wc.height }
      const thumb = { blob: await encode(tc, 0.8), width: tc.width, height: tc.height }
      return { full, web, thumb }
    } finally {
      eb.close()
    }
  } finally {
    bmp.close()
    canvas.width = 0
    canvas.height = 0
  }
}

// Small, fast preview of a look on one photo. Returns an object URL; the caller should revoke it.
export async function renderPreview(bmp: ImageBitmap, lookId: string, strength: number, maxEdge = 480, adjust?: Adjust, skin?: boolean): Promise<string> {
  const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height))
  const w = Math.max(1, Math.round(bmp.width * scale))
  const h = Math.max(1, Math.round(bmp.height * scale))
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Your browser cannot process photos.')
  ctx.drawImage(bmp, 0, 0, w, h)
  const img = ctx.getImageData(0, 0, w, h)
  process(img.data, w, h, findLook(lookId), strength, adjust, skin)
  ctx.putImageData(img, 0, 0)
  const blob = await encode(c, 0.85)
  return URL.createObjectURL(blob)
}

// The photo as shot, scaled for the screen. Returns an object URL; the caller should revoke it.
export async function originalPreview(bmp: ImageBitmap, maxEdge = 1400): Promise<string> {
  const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(bmp.width * scale))
  c.height = Math.max(1, Math.round(bmp.height * scale))
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('Your browser cannot process photos.')
  ctx.drawImage(bmp, 0, 0, c.width, c.height)
  return URL.createObjectURL(await encode(c, 0.85))
}

// A few simple numbers describing how a photo looks. Saved with each correction so the learning knows what kind of photo it was.
export function photoFeatures(bmp: ImageBitmap): Record<string, number> {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 64
  const ctx = c.getContext('2d', { willReadFrequently: true })
  if (!ctx) return {}
  ctx.drawImage(bmp, 0, 0, 64, 64)
  const d = ctx.getImageData(0, 0, 64, 64).data
  const ls: number[] = []
  let r = 0
  let b = 0
  let sat = 0
  for (let i = 0; i < d.length; i += 4) {
    ls.push((0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255)
    r += d[i]
    b += d[i + 2]
    const mx = Math.max(d[i], d[i + 1], d[i + 2])
    const mn = Math.min(d[i], d[i + 1], d[i + 2])
    sat += mx > 0 ? (mx - mn) / mx : 0
  }
  const n = ls.length
  const mean = ls.reduce((a, v) => a + v, 0) / n
  const sorted = [...ls].sort((x, y) => x - y)
  const std = Math.sqrt(ls.reduce((a, v) => a + (v - mean) * (v - mean), 0) / n)
  const q = (x: number) => Math.round(x * 1000) / 1000
  return {
    luma_mean: q(mean),
    luma_p5: q(sorted[Math.floor(n * 0.05)]),
    luma_p95: q(sorted[Math.floor(n * 0.95)]),
    contrast: q(std),
    warmth: q((r - b) / (n * 255)),
    saturation: q(sat / n),
    aspect: q(bmp.width / bmp.height),
  }
}
