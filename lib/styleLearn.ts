import { LOOKS, type Adjust } from '@/lib/enhance'

// Camri learns a look from finished photos. Everything runs in the browser; only the numbers are saved, never the photos.
export type Fingerprint = {
  n: number
  L: number // average brightness
  S: number // contrast
  p1: number // how dark the blacks are
  p10: number // how open the shadows are
  p95: number // how bright the highlights are
  sat: number // color strength
  warm: number // warm or cool
  tint: number // green or magenta
  bw: number // share of the frame with no color
}

export type Derived = { look: string; tweak: Adjust; about: string }

const KEYS: (keyof Omit<Fingerprint, 'n'>)[] = ['L', 'S', 'p1', 'p10', 'p95', 'sat', 'warm', 'tint', 'bw']
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const r3 = (v: number) => Math.round(v * 1000) / 1000

function statsOf(data: Uint8ClampedArray): Omit<Fingerprint, 'n'> {
  const px = data.length / 4
  const luma = new Float32Array(px)
  let sr = 0, sg = 0, sb = 0, satSum = 0, satN = 0, grey = 0, lsum = 0
  for (let i = 0; i < px; i++) {
    const r = data[i * 4] / 255, g = data[i * 4 + 1] / 255, b = data[i * 4 + 2] / 255
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b
    luma[i] = y
    lsum += y
    sr += r; sg += g; sb += b
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b)
    if (mx - mn < 0.03) grey++
    if (mx > 0.1) { satSum += (mx - mn) / mx; satN++ }
  }
  const L = lsum / px
  let v = 0
  for (let i = 0; i < px; i++) v += (luma[i] - L) * (luma[i] - L)
  const sorted = Float32Array.from(luma).sort()
  const at = (p: number) => sorted[Math.min(px - 1, Math.floor(p * px))]
  const mr = sr / px + 1e-4, mg = sg / px + 1e-4, mb = sb / px + 1e-4
  return {
    L,
    S: Math.sqrt(v / px),
    p1: at(0.01),
    p10: at(0.1),
    p95: at(0.95),
    sat: satN ? satSum / satN : 0,
    warm: Math.log(mr / mb),
    tint: -Math.log(mg / ((mr + mb) / 2)),
    bw: grey / px,
  }
}

const median = (a: number[]) => {
  const s = [...a].sort((x, y) => x - y)
  return s.length ? s[Math.floor(s.length / 2)] : 0
}

export async function analyzeFiles(
  files: File[],
  onProgress: (done: number, total: number, failed: number) => void,
): Promise<{ fp: Fingerprint | null; failed: number }> {
  const MAX = 300
  const pool = files.filter((f) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name))
  const step = pool.length > MAX ? pool.length / MAX : 1
  const picked: File[] = []
  for (let i = 0; i < pool.length && picked.length < MAX; i += step) picked.push(pool[Math.floor(i)])
  const all: Omit<Fingerprint, 'n'>[] = []
  let failed = 0
  for (let i = 0; i < picked.length; i++) {
    try {
      const bmp = await createImageBitmap(picked[i], { imageOrientation: 'from-image' })
      const sc = Math.min(1, 96 / Math.max(bmp.width, bmp.height))
      const c = document.createElement('canvas')
      c.width = Math.max(1, Math.round(bmp.width * sc))
      c.height = Math.max(1, Math.round(bmp.height * sc))
      const ctx = c.getContext('2d', { willReadFrequently: true })
      if (!ctx) throw new Error('canvas')
      ctx.drawImage(bmp, 0, 0, c.width, c.height)
      bmp.close()
      all.push(statsOf(ctx.getImageData(0, 0, c.width, c.height).data))
    } catch {
      failed++
    }
    onProgress(i + 1, picked.length, failed)
    if (i % 4 === 3) await new Promise((r) => setTimeout(r, 0))
  }
  if (all.length === 0) return { fp: null, failed }
  const fp = { n: all.length } as Fingerprint
  for (const k of KEYS) fp[k] = r3(median(all.map((a) => a[k])))
  return { fp, failed }
}

export function mergeFingerprints(a: Fingerprint, b: Fingerprint): Fingerprint {
  const n = a.n + b.n
  const out = { n } as Fingerprint
  for (const k of KEYS) out[k] = r3((a[k] * a.n + b[k] * b.n) / n)
  return out
}

export function deriveStyle(fp: Fingerprint, lookId?: string): Derived {
  const base = lookId ? LOOKS.find((l) => l.id === lookId) : undefined
  const bw = fp.bw > 0.8 || lookId === 'bw'
  const t: Adjust = {
    exposure: clamp((fp.L - 0.42) * 1.6, -0.35, 0.35),
    contrast: clamp((fp.S - (bw ? 0.26 : 0.21)) * 2, -0.3, 0.3),
    shadows: clamp((fp.p10 - 0.1) * 2, -0.3, 0.3),
    highlights: clamp((fp.p95 - 0.92) * 1.5, -0.2, 0.1),
    fade: clamp((fp.p1 - 0.04) * 0.9, 0, 0.1),
  }
  if (!bw) {
    t.saturation = clamp((fp.sat - 0.3) * 1.3, -0.3, 0.3)
    t.temp = clamp(fp.warm - 0.06, -0.22, 0.22)
    t.tint = clamp(fp.tint, -0.1, 0.1)
  }
  // The chosen style already brings its own look, so the photos only fine-tune what is left over.
  if (base && lookId !== 'bw') {
    for (const k of ['exposure', 'contrast', 'highlights', 'shadows', 'temp', 'tint', 'saturation', 'fade'] as const) {
      t[k] = (t[k] ?? 0) - 0.8 * base.params[k]
    }
  }
  const tweak: Adjust = {}
  for (const k of Object.keys(t) as (keyof Adjust)[]) {
    const v = t[k] as number
    if (Math.abs(v) >= 0.015) (tweak as Record<string, number>)[k] = r3(v)
  }
  const bits: string[] = []
  if (bw) bits.push('Black and white')
  bits.push(fp.L > 0.56 ? 'Bright and airy' : fp.L < 0.34 ? 'Dark and moody' : 'Balanced light')
  bits.push(fp.S > 0.27 ? 'punchy contrast' : fp.S < 0.17 ? 'soft, gentle contrast' : 'natural contrast')
  if (fp.p1 > 0.09) bits.push('matte, lifted blacks')
  if (!bw) {
    bits.push(fp.sat < 0.2 ? 'muted color' : fp.sat > 0.4 ? 'rich, saturated color' : 'true-to-life color')
    if (fp.warm > 0.12) bits.push('warm tones')
    else if (fp.warm < -0.01) bits.push('cool tones')
  }
  return { look: bw ? 'bw' : base ? base.id : 'natural', tweak, about: bits.join(' · ') }
}
